import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";

export interface Actor {
  id: string;
  role: Role;
}

// Builds the WHERE clause that scopes project visibility by role. This is
// the single source of truth for project isolation — every list/read/write
// path below goes through it instead of "fetch then check".
function scopeFor(actor: Actor) {
  if (actor.role === Role.ADMIN) return {};
  if (actor.role === Role.PROJECT_MANAGER) return { createdById: actor.id };
  // Developers don't get a project-level scope; they only ever see projects
  // through their assigned tasks (handled in task.service.ts / dashboard).
  return { tasks: { some: { assignedDeveloperId: actor.id } } };
}

export async function listProjects(actor: Actor) {
  return prisma.project.findMany({
    where: scopeFor(actor),
    include: { client: true, _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// IDOR-safe fetch: the id AND the ownership scope are part of ONE query.
// A PM who tampers with the :id in the URL for another PM's project simply
// gets zero rows back, not "found, then rejected".
export async function getProjectForActor(id: string, actor: Actor) {
  const project = await prisma.project.findFirst({
    where: { id, ...scopeFor(actor) },
    include: { client: true, tasks: true },
  });
  if (!project) throw ApiError.notFound("Project not found.");
  return project;
}

// Used internally (e.g. by socket room-join authorization) where a 404 vs
// 403 distinction doesn't matter — just "can this actor see this project".
export async function canActorAccessProject(projectId: string, actor: Actor): Promise<boolean> {
  const count = await prisma.project.count({ where: { id: projectId, ...scopeFor(actor) } });
  return count > 0;
}

export async function createProject(
  actor: Actor,
  data: { name: string; description?: string; clientId: string }
) {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) throw ApiError.validation("clientId does not reference an existing client.");

  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      createdById: actor.id, // never taken from the request body
    },
  });
}

export async function updateProject(
  id: string,
  actor: Actor,
  data: Partial<{ name: string; description: string }>
) {
  await getProjectForActor(id, actor); // throws 404 if not visible/owned
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string, actor: Actor) {
  await getProjectForActor(id, actor);
  await prisma.project.delete({ where: { id } });
}
