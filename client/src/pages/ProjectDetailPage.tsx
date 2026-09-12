import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as projectsApi from "../api/projects.api";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { useSocket } from "../hooks/useSocket";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsApi.getProject(id!),
    enabled: !!id,
  });
  const { joinProject, leaveProject, activity } = useSocket(true);

 
  useEffect(() => {
    if (!id) return;
    joinProject(id);
    return () => leaveProject(id);
  }, [id]);

  if (isLoading) return <div className="page-loading">Loading project…</div>;
  if (error || !project) return <div className="error-banner">Project not found or you don't have access.</div>;

  const projectActivity = activity.filter((a) => a.projectId === id);

  return (
    <div>
      <h1>{project.name}</h1>
      <p className="project-description">{project.description}</p>

      <h2>Tasks</h2>
      <table className="data-table">
        <thead><tr><th>Title</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
        <tbody>
          {(project.tasks ?? []).map((t: any) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>{t.assignedDeveloper?.name ?? "Unassigned"}</td>
              <td><StatusBadge status={t.status} /></td>
              <td><PriorityBadge priority={t.priority} /></td>
              <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Live Activity</h2>
      <ul className="activity-feed">
        {projectActivity.length === 0 && <li className="empty-state">No live activity yet — updates appear here instantly.</li>}
        {projectActivity.map((a) => (
          <li key={a.id}>
            Task <strong>{a.taskTitle}</strong> moved {a.previousStatus} → {a.newStatus}
            <span className="activity-time"> · {new Date(a.createdAt).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
