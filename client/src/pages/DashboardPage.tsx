import { useQuery } from "@tanstack/react-query";
import * as dashboardApi from "../api/dashboard.api";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.getDashboard });

  if (isLoading) return <div className="page-loading">Loading dashboard…</div>;
  if (error) return <div className="error-banner">Could not load dashboard.</div>;

  if (user?.role === "ADMIN") {
    return (
      <div>
        <h1>Admin Dashboard</h1>
        <div className="card-grid">
          <StatCard label="Total Projects" value={data.totalProjects} />
          <StatCard label="Total Tasks" value={data.totalTasks} />
          <StatCard label="Overdue Tasks" value={data.overdueCount} />
          <StatCard label="Online Now" value={data.onlineUsers} />
        </div>
        <h2>Tasks by Status</h2>
        <div className="chip-row">
          {data.tasksByStatus.map((s: any) => (
            <span key={s.status} className="chip"><StatusBadge status={s.status} /> {s.count}</span>
          ))}
        </div>
        <ActivityFeed activity={data.recentActivity} />
      </div>
    );
  }

  if (user?.role === "PROJECT_MANAGER") {
    return (
      <div>
        <h1>My Dashboard</h1>
        <div className="card-grid">
          <StatCard label="My Projects" value={data.projects.length} />
          <StatCard label="Due This Week" value={data.upcomingDueThisWeek.length} />
        </div>
        <h2>Tasks by Priority</h2>
        <div className="chip-row">
          {data.tasksByPriority.map((p: any) => (
            <span key={p.priority} className="chip"><PriorityBadge priority={p.priority} /> {p.count}</span>
          ))}
        </div>
        <ActivityFeed activity={data.recentActivity} />
      </div>
    );
  }

  return (
    <div>
      <h1>My Tasks</h1>
      {data.tasks.length === 0 && <div className="empty-state">No tasks assigned yet.</div>}
      <table className="data-table">
        <thead><tr><th>Title</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
        <tbody>
          {data.tasks.map((t: any) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>{t.project?.name}</td>
              <td><StatusBadge status={t.status} /></td>
              <td><PriorityBadge priority={t.priority} /></td>
              <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"} {t.isOverdue && <span className="overdue-tag">Overdue</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ActivityFeed({ activity }: { activity: any[] }) {
  return (
    <>
      <h2>Recent Activity</h2>
      <ul className="activity-feed">
        {(activity ?? []).length === 0 && <li className="empty-state">No activity yet.</li>}
        {(activity ?? []).map((a: any) => (
          <li key={a.id}>
            <strong>{a.actor?.name ?? "Someone"}</strong> moved <strong>{a.task?.title ?? "a task"}</strong>
            {a.previousStatus && a.newStatus && <> from {a.previousStatus} → {a.newStatus}</>}
            <span className="activity-time"> · {new Date(a.createdAt).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
