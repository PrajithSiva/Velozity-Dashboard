import { describe, it, expect } from "vitest";
import { prisma } from "../src/config/prisma";
import { runOverdueSweep } from "../src/jobs/overdue.job";
import { createUser, createClientRecord, createProject, createTask } from "./factories";
import "./setup";

describe("Overdue background job", () => {
  it("marks incomplete tasks past their due date as overdue", async () => {
    const { user: pm } = await createUser("PROJECT_MANAGER", "pmO@test.dev");
    const { user: dev } = await createUser("DEVELOPER", "devO@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    const overdueTask = await createTask(project.id, dev.id, { status: "IN_PROGRESS", dueDate: new Date(Date.now() - 86400000) });

    await runOverdueSweep();

    const refreshed = await prisma.task.findUnique({ where: { id: overdueTask.id } });
    expect(refreshed!.isOverdue).toBe(true);
  });

  it("does not mark completed tasks as overdue even if the due date has passed", async () => {
    const { user: pm } = await createUser("PROJECT_MANAGER", "pmO2@test.dev");
    const { user: dev } = await createUser("DEVELOPER", "devO2@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    const doneTask = await createTask(project.id, dev.id, { status: "DONE", dueDate: new Date(Date.now() - 86400000) });

    await runOverdueSweep();

    const refreshed = await prisma.task.findUnique({ where: { id: doneTask.id } });
    expect(refreshed!.isOverdue).toBe(false);
  });

  it("is safe to run repeatedly (idempotent) with no further changes", async () => {
    const { user: pm } = await createUser("PROJECT_MANAGER", "pmO3@test.dev");
    const { user: dev } = await createUser("DEVELOPER", "devO3@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    await createTask(project.id, dev.id, { status: "TODO", dueDate: new Date(Date.now() - 86400000) });

    const first = await runOverdueSweep();
    expect(first.markedOverdue).toBe(1);
    const second = await runOverdueSweep();
    expect(second.markedOverdue).toBe(0); // already marked, nothing left to do
  });
});
