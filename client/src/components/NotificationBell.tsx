import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as notificationsApi from "../api/notifications.api";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: false,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: notificationsApi.listNotifications,
    enabled: open,
  });

  async function handleMarkAllRead() {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const unread = countData?.count ?? 0;

  return (
    <div className="notification-bell">
      <button className="bell-button" onClick={() => setOpen((o) => !o)}>
        🔔 {unread > 0 && <span className="bell-count">{unread}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <strong>Notifications</strong>
            <button className="link-button" onClick={handleMarkAllRead}>Mark all read</button>
          </div>
          {(notifications ?? []).length === 0 && <div className="empty-state">No notifications yet.</div>}
          {(notifications ?? []).map((n) => (
            <div key={n.id} className={`notification-item ${n.readAt ? "" : "unread"}`} onClick={() => handleMarkRead(n.id)}>
              <div>{n.message}</div>
              <div className="notification-time">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
