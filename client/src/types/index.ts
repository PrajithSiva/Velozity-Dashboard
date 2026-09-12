export type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  createdById: string;
  client?: Client;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  assignedDeveloperId?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  isOverdue: boolean;
  project?: { id: string; name: string };
  assignedDeveloper?: { id: string; name: string } | null;
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  taskId?: string | null;
  actorId: string;
  action: string;
  previousStatus?: TaskStatus | null;
  newStatus?: TaskStatus | null;
  createdAt: string;
  taskTitle?: string;
  actor?: { name: string };
  task?: { title: string };
}

export interface Notification {
  id: string;
  type: "TASK_ASSIGNED" | "TASK_IN_REVIEW" | "TASK_OVERDUE";
  message: string;
  readAt?: string | null;
  createdAt: string;
}
