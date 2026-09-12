import { apiClient } from "./client";
import { Task, TaskStatus, TaskPriority } from "../types";

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueFrom?: string;
  dueTo?: string;
  projectId?: string;
  page?: number;
  pageSize?: number;
}

export async function listTasks(filters: TaskFilters) {
  const res = await apiClient.get("/tasks", { params: filters });
  return res.data.data as { items: Task[]; total: number; page: number; pageSize: number };
}

export async function getTask(id: string) {
  const res = await apiClient.get(`/tasks/${id}`);
  return res.data.data as Task;
}

export async function createTask(data: Partial<Task> & { projectId: string; title: string }) {
  const res = await apiClient.post("/tasks", data);
  return res.data.data as Task;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const res = await apiClient.patch(`/tasks/${id}`, { status });
  return res.data.data as Task;
}

export async function updateTaskFull(id: string, data: Partial<Task>) {
  const res = await apiClient.patch(`/tasks/${id}`, data);
  return res.data.data as Task;
}
