import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { createUser, createClientRecord, createProject, createTask } from "./factories";
import "./setup";

const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Task status transitions + activity log", () => {
  it("creates a persistent ActivityLog with correct actor/old/new status on status change", async () => {
    const { user: pm } = await createUser("PROJECT_MANAGER", "pm@test.dev");
    const { user: dev, accessToken: devToken } = await createUser("DEVELOPER", "dev@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    const task = await createTask(project.id, dev.id, { status: "TODO" });

    const res = await request(app).patch(`/api/tasks/${task.id}`).set(auth(devToken)).send({ status: "IN_PROGRESS" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("IN_PROGRESS");

    const logs = await prisma.activityLog.findMany({ where: { taskId: task.id } });
    const transition = logs.find((l) => l.action === "TASK_STATUS_CHANGED");
    expect(transition).toBeTruthy();
    expect(transition!.actorId).toBe(dev.id);
    expect(transition!.previousStatus).toBe("TODO");
    expect(transition!.newStatus).toBe("IN_PROGRESS");
  });

  it("moving a task to IN_REVIEW notifies the owning PM", async () => {
    const { user: pm } = await createUser("PROJECT_MANAGER", "pm2@test.dev");
    const { user: dev, accessToken: devToken } = await createUser("DEVELOPER", "dev2@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    const task = await createTask(project.id, dev.id, { status: "IN_PROGRESS" });

    await request(app).patch(`/api/tasks/${task.id}`).set(auth(devToken)).send({ status: "IN_REVIEW" });

    const notif = await prisma.notification.findFirst({ where: { recipientId: pm.id, taskId: task.id, type: "TASK_IN_REVIEW" } });
    expect(notif).toBeTruthy();
  });

  it("assigning a task creates a persistent notification for the developer", async () => {
    const { user: pm, accessToken: pmToken } = await createUser("PROJECT_MANAGER", "pm3@test.dev");
    const { user: dev } = await createUser("DEVELOPER", "dev3@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);

    const res = await request(app)
      .post("/api/tasks")
      .set(auth(pmToken))
      .send({ projectId: project.id, title: "New Task", assignedDeveloperId: dev.id });

    expect(res.status).toBe(201);
    const notif = await prisma.notification.findFirst({ where: { recipientId: dev.id, type: "TASK_ASSIGNED" } });
    expect(notif).toBeTruthy();
  });

  it("task filters (status/priority/due-date) are applied server-side via query params", async () => {
    const { user: pm, accessToken: pmToken } = await createUser("PROJECT_MANAGER", "pm4@test.dev");
    const { user: dev } = await createUser("DEVELOPER", "dev4@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    await createTask(project.id, dev.id, { status: "TODO", priority: "LOW" });
    await createTask(project.id, dev.id, { status: "IN_PROGRESS", priority: "HIGH" });

    const res = await request(app)
      .get(`/api/tasks?status=IN_PROGRESS&priority=HIGH&projectId=${project.id}`)
      .set(auth(pmToken));

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].status).toBe("IN_PROGRESS");
  });
});
