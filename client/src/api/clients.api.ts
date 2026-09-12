import { apiClient } from "./client";
import { Client } from "../types";

export async function listClients() {
  const res = await apiClient.get("/clients");
  return res.data.data as Client[];
}

export async function createClient(data: { name: string; email?: string; company?: string }) {
  const res = await apiClient.post("/clients", data);
  return res.data.data as Client;
}
