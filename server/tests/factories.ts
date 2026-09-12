import { Role } from "@prisma/client";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import { signAccessToken } from "../src/utils/jwt";

export async function createUser(role: Role, email: string) {
  const user = await prisma.user.create({
    data: { name: email.split("@")[0], email, passwordHash: await hashPassword("Password123!"), role },
  });
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  return { user, accessToken };
}

export async function createClientRecord(name = "Test Client") {
  return prisma.client.create({ data: { name } });
}

export async function createProject(createdById: string, clientId: string, name = "Test Project") {
  return prisma.project.create({ data: { name, clientId, createdById } });
}

export async function createTask(
  projectId: string,
  assignedDeveloperId: string | null,
  overrides: Partial<{ status: any; priority: any; dueDate: Date }> = {}
) {
  return prisma.task.create({
    data: {
      projectId,
      title: "Test Task",
      assignedDeveloperId,
      status: overrides.status ?? "TODO",
      priority: overrides.priority ?? "MEDIUM",
      dueDate: overrides.dueDate,
    },
  });
}
