import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";

// Client management is Admin-only at the route level (see routes/client.routes.ts),
// so no per-record ownership filtering is needed here — but we still never
// trust an id blindly without checking existence.
export async function listClients() {
  return prisma.client.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw ApiError.notFound("Client not found.");
  return client;
}

export async function createClient(data: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
}) {
  return prisma.client.create({ data });
}

export async function updateClient(
  id: string,
  data: Partial<{ name: string; email: string; phone: string; company: string }>
) {
  await getClient(id);
  return prisma.client.update({ where: { id }, data });
}

export async function deleteClient(id: string) {
  await getClient(id);
  const projectCount = await prisma.project.count({ where: { clientId: id } });
  if (projectCount > 0) {
    throw ApiError.conflict("Cannot delete a client that still has projects.");
  }
  await prisma.client.delete({ where: { id } });
}
