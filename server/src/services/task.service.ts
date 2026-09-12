import { Prisma, Role, TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { Actor, canActorAccessProject } from "./project.service";
import { emitActivity, emitNotificationCount } from "../sockets/activity.emitter";

interface TaskFilters {
  status?: TaskStatus;
  priority?: string;
  dueFrom?: Date;
  dueTo?: Date;
  projectId?: string;
  page: number;
  pageSize: number;
}

// Role-scoped WHERE clause for tasks — mirrors project.service's scopeFor.
// Developers ONLY ever see tasks assigned to them; PMs only tasks within
// projects they created; Admin sees all. This is applied at the DB layer,
// never "fetch all then filter in the controller/React".
function scopeFor(actor: Actor): Prisma.TaskWhereInput {
  if (actor.role === Role.ADMIN) return {};
  if (actor.role === Role.PROJECT_MANAGER) return { project: { createdById: actor.id } };
  return { assignedDeveloperId: actor.id };
}

export async function listTasks(actor: Actor, filters: TaskFilters) {
  const where: Prisma.TaskWhereInput = {
    ...scopeFor(actor),
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority as any }),
    ...(filters.projectId && { projectId: filters.projectId }),
  };
  if (filters.dueFrom || filters.dueTo) {
    where.dueDate = {
      ...(filters.dueFrom && { gte: filters.dueFrom }),
      ...(filters.dueTo && { lte: filters.dueTo }),
    };
  }

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { project: { select: { id: true, name: true } }, assignedDeveloper: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

// IDOR-safe: id + scope in one query, exactly like getProjectForActor.
export async function getTaskForActor(id: string, actor: Actor) {
  const task = await prisma.task.findFirst({
    where: { id, ...scopeFor(actor) },
    include: { project: true, assignedDeveloper: true, activityLogs: { orderBy: { createdAt: "desc" } } },
  });
  if (!task) throw ApiError.notFound("Task not found.");
  return task;
}

export async function createTask(
  actor: Actor,
  data: {
    projectId: string;
    title: string;
    description?: string;
    assignedDeveloperId?: string;
    priority?: any;
    dueDate?: Date;
  }
) {
  // A PM may only create tasks in a project THEY created; Admin may create
  // in any project. This check is a real query, not a body flag.
  const projectVisible = await canActorAccessProject(data.projectId, actor);
  if (!projectVisible) throw ApiError.forbidden("You cannot add tasks to this project.");
  if (actor.role === Role.PROJECT_MANAGER) {
    const owns = await prisma.project.findFirst({ where: { id: data.projectId, createdById: actor.id } });
    if (!owns) throw ApiError.forbidden("You can only add tasks to projects you created.");
  }

  const task = await prisma.task.create({ data });

  if (data.assignedDeveloperId) {
    const notif = await prisma.notification.create({
      data: {
        recipientId: data.assignedDeveloperId,
        type: "TASK_ASSIGNED",
        taskId: task.id,
        projectId: task.projectId,
        message: `You were assigned a new task: "${task.title}".`,
      },
    });
    emitNotificationCount(data.assignedDeveloperId);
    void notif;
  }

  return task;
}

// PM/Admin update path — full field set.
export async function updateTaskFull(
  id: string,
  actor: Actor,
  data: Partial<{
    title: string;
    description: string;
    assignedDeveloperId: string | null;
    priority: any;
    status: TaskStatus;
    dueDate: Date | null;
  }>
) {
  const existing = await getTaskForActor(id, actor);
  if (actor.role === Role.PROJECT_MANAGER && existing.project.createdById !== actor.id) {
    throw ApiError.forbidden();
  }

  if (data.status && data.status !== existing.status) {
    return transitionStatus(existing, actor, data.status, data);
  }

  const updated = await prisma.task.update({ where: { id }, data });

  if (data.assignedDeveloperId && data.assignedDeveloperId !== existing.assignedDeveloperId) {
    await prisma.notification.create({
      data: {
        recipientId: data.assignedDeveloperId,
        type: "TASK_ASSIGNED",
        taskId: id,
        projectId: existing.projectId,
        message: `You were assigned to task "${updated.title}".`,
      },
    });
    emitNotificationCount(data.assignedDeveloperId);
  }

  return updated;
}

// Developer path — STATUS ONLY, and only on a task assigned to them
// (guaranteed by getTaskForActor's scope, which for developers filters on
// assignedDeveloperId = actor.id).
export async function updateTaskStatusAsDeveloper(id: string, actor: Actor, status: TaskStatus) {
  const existing = await getTaskForActor(id, actor);
  return transitionStatus(existing, actor, status, {});
}

// The core write path required by the assessment: verify -> read current
// status -> update -> activity log -> notification -> commit -> THEN
// broadcast. Nothing is emitted over the socket until the transaction has
// actually committed.
async function transitionStatus(
  existing: { id: string; projectId: string; status: TaskStatus; title: string },
  actor: Actor,
  newStatus: TaskStatus,
  otherFields: Record<string, unknown>
) {
  const previousStatus = existing.status;

  const { task, activity } = await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id: existing.id },
      data: { ...otherFields, status: newStatus },
    });

    const activity = await tx.activityLog.create({
      data: {
        projectId: existing.projectId,
        taskId: existing.id,
        actorId: actor.id,
        action: "TASK_STATUS_CHANGED",
        previousStatus,
        newStatus,
      },
    });

    if (newStatus === "IN_REVIEW") {
      const project = await tx.project.findUnique({ where: { id: existing.projectId } });
      if (project) {
        await tx.notification.create({
          data: {
            recipientId: project.createdById,
            type: "TASK_IN_REVIEW",
            taskId: existing.id,
            projectId: existing.projectId,
            message: `Task "${existing.title}" was moved to IN_REVIEW.`,
          },
        });
      }
    }

    return { task, activity };
  });

  // Broadcast only after successful commit, and only to authorized sockets
  // (role-filtering happens inside emitActivity, not in the client).
  await emitActivity(activity, task);
  if (newStatus === "IN_REVIEW") {
    const project = await prisma.project.findUnique({ where: { id: existing.projectId } });
    if (project) emitNotificationCount(project.createdById);
  }

  return task;
}

export async function deleteTask(id: string, actor: Actor) {
  const existing = await getTaskForActor(id, actor);
  if (actor.role === Role.PROJECT_MANAGER && existing.project.createdById !== actor.id) {
    throw ApiError.forbidden();
  }
  if (actor.role === Role.DEVELOPER) throw ApiError.forbidden();
  await prisma.task.delete({ where: { id } });
}
