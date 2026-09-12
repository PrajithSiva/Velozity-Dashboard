import { apiClient } from "./client";
import { Notification } from "../types";

export async function listNotifications() {
  const res = await apiClient.get("/notifications");
  return res.data.data as Notification[];
}

export async function unreadCount() {
  const res = await apiClient.get("/notifications/unread-count");
  return res.data.data as { count: number };
}

export async function markRead(id: string) {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllRead() {
  await apiClient.patch("/notifications/read-all");
}
