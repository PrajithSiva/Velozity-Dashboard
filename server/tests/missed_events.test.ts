import { describe, it, expect } from "vitest";
import { prisma } from "../src/config/prisma";
import { getMissedActivity } from "../src/services/activity.service";
import { createUser, createClientRecord, createProject, createTask } from "./factories";
import "./setup";

describe("Missed-event recovery", () => {
  it("returns only events after the given cursor, scoped by role, capped at 20", async () => {
    const { user: pm } = await createUser("PROJECT_MANAGER", "missedPm@test.dev");
    const { user: dev } = await createUser("DEVELOPER", "missedDev@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    const task = await createTask(project.id, dev.id);

    const first = await prisma.activityLog.create({
      data: { projectId: project.id, taskId: task.id, actorId: dev.id, action: "TASK_STATUS_CHANGED", newStatus: "IN_PROGRESS" },
    });

    // 25 more events after `first`, to test the 20-item cap.
    for (let i = 0; i < 25; i++) {
      await prisma.activityLog.create({
        data: { projectId: project.id, taskId: task.id, actorId: dev.id, action: "TASK_STATUS_CHANGED", newStatus: "IN_REVIEW" },
      });
    }

    const missed = await getMissedActivity({ id: dev.id, role: "DEVELOPER" as any }, first.id, 20);
    expect(missed.length).toBe(20);
    expect(missed.every((e) => e.id !== first.id)).toBe(true); // strictly after the cursor
  });

  it("excludes activity the reconnecting user is not authorized to see", async () => {
    const { user: pmA } = await createUser("PROJECT_MANAGER", "missedPmA@test.dev");
    const { user: pmB } = await createUser("PROJECT_MANAGER", "missedPmB@test.dev");
    const client = await createClientRecord();
    const projectA = await createProject(pmA.id, client.id, "A");
    const projectB = await createProject(pmB.id, client.id, "B");
    const taskA = await createTask(projectA.id, null);
    const taskB = await createTask(projectB.id, null);

    await prisma.activityLog.create({
      data: { projectId: projectA.id, taskId: taskA.id, actorId: pmA.id, action: "TASK_CREATED" },
    });
    await prisma.activityLog.create({
      data: { projectId: projectB.id, taskId: taskB.id, actorId: pmB.id, action: "TASK_CREATED" },
    });

    const missedForPmA = await getMissedActivity({ id: pmA.id, role: "PROJECT_MANAGER" as any }, undefined, 20);
    expect(missedForPmA.every((e) => e.projectId === projectA.id)).toBe(true);
  });
});
