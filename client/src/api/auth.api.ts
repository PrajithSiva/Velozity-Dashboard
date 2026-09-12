import { apiClient } from "./client";
import { User } from "../types";

export async function login(email: string, password: string) {
  const res = await apiClient.post("/auth/login", { email, password });
  return res.data.data as { user: User; accessToken: string };
}

export async function refresh() {
  const res = await apiClient.post("/auth/refresh");
  return res.data.data as { user: User; accessToken: string };
}

export async function logout() {
  await apiClient.post("/auth/logout");
}

export async function me() {
  const res = await apiClient.get("/auth/me");
  return res.data.data as User;
}
