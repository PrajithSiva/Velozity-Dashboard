import { apiClient } from "./client";
import { Project } from "../types";

export async function listProjects() {
  const res = await apiClient.get("/projects");
  return res.data.data as Project[];
}

export async function getProject(id: string) {
  const res = await apiClient.get(`/projects/${id}`);
  return res.data.data as Project & { tasks: any[] };
}

export async function createProject(data: { name: string; description?: string; clientId: string }) {
  const res = await apiClient.post("/projects", data);
  return res.data.data as Project;
}
