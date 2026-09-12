import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { Actor } from "./project.service";

// Same role-scoping principle as tasks/projects, applied to the activity
// feed: Admin = everything, PM = their projects, Developer = their tasks.
function scopeFor(actor: Actor) {
  if (actor.role === Role.ADMIN) return {};
  if (actor.role === Role.PROJECT_MANAGER) return { project: { createdById: actor.id } };
  return { task: { assignedDeveloperId: actor.id } };
}

export async function listActivity(actor: Actor, limit = 50) {
  return prisma.activityLog.findMany({
    where: scopeFor(actor),
    include: {
      actor: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Missed-event recovery: cursor is the timestamp/id of the last event the
// client actually received. We query PostgreSQL directly (never an
// in-memory cache) for everything AFTER that cursor that this actor is
// authorized to see, and cap it at 20 as required.
export async function getMissedActivity(actor: Actor, afterId: string | undefined, limit = 20) {
  const where = scopeFor(actor);

  let cursorCreatedAt: Date | undefined;
  if (afterId) {
    const cursorRow = await prisma.activityLog.findUnique({ where: { id: afterId } });
    cursorCreatedAt = cursorRow?.createdAt;
  }

  return prisma.activityLog.findMany({
    where: {
      ...where,
      ...(cursorCreatedAt && { createdAt: { gt: cursorCreatedAt } }),
    },
    include: {
      actor: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Used by the socket layer to decide, per-connected-user, whether a given
// freshly-created ActivityLog row should be pushed to them.
export async function isActivityVisibleToActor(activityId: string, actor: Actor): Promise<boolean> {
  const count = await prisma.activityLog.count({ where: { id: activityId, ...scopeFor(actor) } });
  return count > 0;
}
