import { PrismaClient, Role, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Password123!";

async function upsertUser(name: string, email: string, role: Role) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role },
  });
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding database...");

  // ---- Users -------------------------------------------------------------
  const admin = await upsertUser("Ava Thornton", "admin@velozity.dev", Role.ADMIN);
  const pmA = await upsertUser("Priya Menon", "priya.pm@velozity.dev", Role.PROJECT_MANAGER);
  const pmB = await upsertUser("Marcus Diaz", "marcus.pm@velozity.dev", Role.PROJECT_MANAGER);
  const devA = await upsertUser("Ravi Shankar", "ravi.dev@velozity.dev", Role.DEVELOPER);
  const devB = await upsertUser("Lena Voss", "lena.dev@velozity.dev", Role.DEVELOPER);
  const devC = await upsertUser("Tom Okafor", "tom.dev@velozity.dev", Role.DEVELOPER);
  const devD = await upsertUser("Sara Kim", "sara.dev@velozity.dev", Role.DEVELOPER);

  // ---- Clients -------------------------------------------------------------
  const clientAcme = await prisma.client.upsert({
    where: { id: "seed-client-acme" },
    update: {},
    create: { id: "seed-client-acme", name: "Acme Retail Co.", email: "contact@acmeretail.example", company: "Acme Retail Co." },
  });
  const clientNova = await prisma.client.upsert({
    where: { id: "seed-client-nova" },
    update: {},
    create: { id: "seed-client-nova", name: "Nova Health Systems", email: "ops@novahealth.example", company: "Nova Health Systems" },
  });
  const clientPeak = await prisma.client.upsert({
    where: { id: "seed-client-peak" },
    update: {},
    create: { id: "seed-client-peak", name: "Peak Logistics", email: "hello@peaklogistics.example", company: "Peak Logistics" },
  });

  // ---- Projects (2 owned by PM-A, 1 by PM-B, to exercise isolation) -------
  const projectAlpha = await prisma.project.upsert({
    where: { id: "seed-project-alpha" },
    update: {},
    create: {
      id: "seed-project-alpha",
      name: "Storefront Revamp",
      description: "Rebuild the Acme e-commerce storefront on a modern stack.",
      clientId: clientAcme.id,
      createdById: pmA.id,
    },
  });
  const projectBeta = await prisma.project.upsert({
    where: { id: "seed-project-beta" },
    update: {},
    create: {
      id: "seed-project-beta",
      name: "Patient Portal MVP",
      description: "Initial release of the Nova patient self-service portal.",
      clientId: clientNova.id,
      createdById: pmA.id,
    },
  });
  const projectGamma = await prisma.project.upsert({
    where: { id: "seed-project-gamma" },
    update: {},
    create: {
      id: "seed-project-gamma",
      name: "Fleet Tracking Dashboard",
      description: "Real-time fleet tracking dashboard for Peak Logistics.",
      clientId: clientPeak.id,
      createdById: pmB.id,
    },
  });

  const projects = [projectAlpha, projectBeta, projectGamma];
  const devs = [devA, devB, devC, devD];
  const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
  const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  let overdueCreated = 0;
  let taskCounter = 0;

  for (const project of projects) {
    const taskTitles = [
      "Set up CI pipeline",
      "Design database schema",
      "Implement authentication",
      "Build project listing page",
      "Add role-based access control",
      "Write integration tests",
      "Polish mobile responsive layout",
    ];

    for (let i = 0; i < taskTitles.length; i++) {
      taskCounter++;
      const status = statuses[i % statuses.length];
      const priority = priorities[i % priorities.length];
      const assignedDeveloper = devs[i % devs.length];

      // Force at least 2 overdue tasks total: not DONE + due date in the past.
      const forceOverdue = overdueCreated < 2 && status !== "DONE" && i % 3 === 0;
      const dueDate = forceOverdue ? daysFromNow(-3 - i) : daysFromNow(5 + i);
      if (forceOverdue) overdueCreated++;

      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: `${taskTitles[i]} — ${project.name}`,
          description: `Work item ${i + 1} for ${project.name}.`,
          assignedDeveloperId: assignedDeveloper.id,
          status,
          priority,
          dueDate,
          isOverdue: forceOverdue,
        },
      });

      // Pre-existing activity history so the feed isn't empty on first login.
      await prisma.activityLog.create({
        data: {
          projectId: project.id,
          taskId: task.id,
          actorId: project.createdById,
          action: "TASK_CREATED",
          newStatus: status,
          createdAt: daysFromNow(-10 + (taskCounter % 5)),
        },
      });

      if (status !== "TODO") {
        await prisma.activityLog.create({
          data: {
            projectId: project.id,
            taskId: task.id,
            actorId: assignedDeveloper.id,
            action: "TASK_STATUS_CHANGED",
            previousStatus: "TODO",
            newStatus: status,
            createdAt: daysFromNow(-5 + (taskCounter % 4)),
          },
        });
      }

      if (status === "IN_REVIEW") {
        await prisma.notification.create({
          data: {
            recipientId: project.createdById,
            type: "TASK_IN_REVIEW",
            taskId: task.id,
            projectId: project.id,
            message: `Task "${task.title}" was moved to IN_REVIEW.`,
          },
        });
      }
      await prisma.notification.create({
        data: {
          recipientId: assignedDeveloper.id,
          type: "TASK_ASSIGNED",
          taskId: task.id,
          projectId: project.id,
          message: `You were assigned "${task.title}".`,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo login credentials (password for all): ", DEMO_PASSWORD);
  console.log("  Admin:            admin@velozity.dev");
  console.log("  PM (owns Alpha+Beta): priya.pm@velozity.dev");
  console.log("  PM (owns Gamma):  marcus.pm@velozity.dev");
  console.log("  Developer:        ravi.dev@velozity.dev / lena.dev@velozity.dev / tom.dev@velozity.dev / sara.dev@velozity.dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
