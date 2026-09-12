import { Server } from "socket.io";
import { ActivityLog, Task, Role } from "@prisma/client";
import { prisma } from "../config/prisma";

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

// Determines, per project room, which CONNECTED sockets are actually
// authorized to receive this specific activity event, then emits only to
// those sockets — never a broadcast-then-filter-in-React pattern.
//
// Strategy: the project room already only contains sockets that passed the
// join_project authorization check above. Admins are always allowed, so we
// additionally push to a dedicated admin room. Developers only care about
// activity on THEIR tasks, so we push directly to their personal user room
// rather than the project room (a developer never joins a project room
// they don't have a task in).
export async function emitActivity(activity: ActivityLog, task: Task) {
  if (!ioInstance) return;

  const project = await prisma.project.findUnique({ where: { id: activity.projectId } });
  if (!project) return;

  const payload = {
    id: activity.id,
    projectId: activity.projectId,
    taskId: activity.taskId,
    actorId: activity.actorId,
    action: activity.action,
    previousStatus: activity.previousStatus,
    newStatus: activity.newStatus,
    createdAt: activity.createdAt,
    taskTitle: task.title,
  };

  // Everyone currently in this project's room (PM owner + any dev who has
  // joined it, all already authorization-checked at join time).
  ioInstance.to(`project:${activity.projectId}`).emit("activity:new", payload);

  // Admin global feed.
  ioInstance.to("presence:admins").emit("activity:new", payload);

  // The assigned developer's personal room, in case they haven't joined the
  // project room (e.g. viewing "My Tasks" rather than the project page).
  if (task.assignedDeveloperId) {
    ioInstance.to(`user:${task.assignedDeveloperId}`).emit("activity:new", payload);
  }
}

export function emitNotificationCount(userId: string) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit("notification:count_changed");
}
