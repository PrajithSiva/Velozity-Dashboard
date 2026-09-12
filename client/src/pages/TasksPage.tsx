import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as tasksApi from "../api/tasks.api";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { useAuth } from "../context/AuthContext";
import { TaskStatus, TaskPriority } from "../types";


export function TasksPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();

  const status = (params.get("status") as TaskStatus) || undefined;
  const priority = (params.get("priority") as TaskPriority) || undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", { status, priority }],
    queryFn: () => tasksApi.listTasks({ status, priority, pageSize: 50 }),
  });

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    await tasksApi.updateTaskStatus(taskId, newStatus);
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  return (
    <div>
      <h1>Tasks</h1>
      <div className="filters-bar">
        <select value={status ?? ""} onChange={(e) => updateFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>
        <select value={priority ?? ""} onChange={(e) => updateFilter("priority", e.target.value)}>
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {isLoading && <div className="page-loading">Loading tasks…</div>}
      {!isLoading && (data?.items.length ?? 0) === 0 && <div className="empty-state">No tasks match these filters.</div>}

      <table className="data-table">
        <thead><tr><th>Title</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th></tr></thead>
        <tbody>
          {(data?.items ?? []).map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>{t.project?.name}</td>
              <td>
                {user?.role === "DEVELOPER" ? (
                  <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                ) : (
                  <StatusBadge status={t.status} />
                )}
              </td>
              <td><PriorityBadge priority={t.priority} /></td>
              <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"} {t.isOverdue && <span className="overdue-tag">Overdue</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
