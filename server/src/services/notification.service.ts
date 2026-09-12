import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";

// Every query here is scoped to recipientId = actor.id — a user can never
// even attempt to read/mutate another user's notifications by guessing IDs.
export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { recipientId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function unreadCount(userId: string) {
  const count = await prisma.notification.count({ where: { recipientId: userId, readAt: null } });
  return { count };
}

export async function markRead(userId: string, id: string) {
  const notif = await prisma.notification.findFirst({ where: { id, recipientId: userId } });
  if (!notif) throw ApiError.notFound("Notification not found.");
  return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { recipientId: userId, readAt: null },
    data: { readAt: new Date() },
  });
  return unreadCount(userId);
}
