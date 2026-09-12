import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as notificationsApi from "../api/notifications.api";

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications", "list"], queryFn: notificationsApi.listNotifications });

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  if (isLoading) return <div className="page-loading">Loading notifications…</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <button onClick={async () => { await notificationsApi.markAllRead(); queryClient.invalidateQueries({ queryKey: ["notifications"] }); }}>
          Mark all read
        </button>
      </div>
      {(data ?? []).length === 0 && <div className="empty-state">You're all caught up.</div>}
      <ul className="notification-list">
        {(data ?? []).map((n) => (
          <li key={n.id} className={n.readAt ? "" : "unread"} onClick={() => handleMarkRead(n.id)}>
            <div>{n.message}</div>
            <div className="notification-time">{new Date(n.createdAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
