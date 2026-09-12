import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { Actor } from "./project.service";
import { getOnlineUserCount } from "./presence.service";

export async function getDashboard(actor: Actor) {
  if (actor.role === Role.ADMIN) return getAdminDashboard();
  if (actor.role === Role.PROJECT_MANAGER) return getPmDashboard(actor.id);
  return getDeveloperDashboard(actor.id);
}

async function getAdminDashboard() {
  const [totalProjects, totalTasks, byStatus, overdueCount, recentActivity] = await Promise.all([
    prisma.project.count(),
    prisma.task.count(),
    prisma.task.groupBy({ by: ["status"], _count: true }),
    prisma.task.count({ where: { isOverdue: true, status: { not: "DONE" } } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } }, task: { select: { title: true } } },
    }),
  ]);

  return {
    role: "ADMIN",
    totalProjects,
    totalTasks,
    tasksByStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    overdueCount,
    onlineUsers: getOnlineUserCount(),
    recentActivity,
  };
}

async function getPmDashboard(pmId: string) {
  const projects = await prisma.project.findMany({
    where: { createdById: pmId },
    include: { _count: { select: { tasks: true } } },
  });
  const projectIds = projects.map((p) => p.id);

  const [byPriority, upcoming, recentActivity] = await Promise.all([
    prisma.task.groupBy({ by: ["priority"], where: { projectId: { in: projectIds } }, _count: true }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
        status: { not: "DONE" },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.activityLog.findMany({
      where: { project: { createdById: pmId } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } }, task: { select: { title: true } } },
    }),
  ]);

  return {
    role: "PROJECT_MANAGER",
    projects,
    tasksByPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count })),
    upcomingDueThisWeek: upcoming,
    recentActivity,
  };
}

async function getDeveloperDashboard(devId: string) {
  const tasks = await prisma.task.findMany({
    where: { assignedDeveloperId: devId },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    include: { project: { select: { id: true, name: true } } },
  });
  return { role: "DEVELOPER", tasks };
}
