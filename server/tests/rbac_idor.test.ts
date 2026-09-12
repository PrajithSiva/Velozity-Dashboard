import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createUser, createClientRecord, createProject, createTask } from "./factories";
import "./setup";

const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("RBAC + IDOR isolation", () => {
  it("PM-A cannot access PM-B's project by guessing its ID", async () => {
    const { user: pmA, accessToken: tokenA } = await createUser("PROJECT_MANAGER", "pmA@test.dev");
    const { user: pmB, accessToken: tokenB } = await createUser("PROJECT_MANAGER", "pmB@test.dev");
    const client = await createClientRecord();
    const projectB = await createProject(pmB.id, client.id, "PM-B Project");

    const res = await request(app).get(`/api/projects/${projectB.id}`).set(auth(tokenA));
    expect(res.status).toBe(404); // not "found then forbidden" — genuinely invisible

    const okForOwner = await request(app).get(`/api/projects/${projectB.id}`).set(auth(tokenB));
    expect(okForOwner.status).toBe(200);
  });

  it("PM-A cannot edit PM-B's project", async () => {
    const { accessToken: tokenA } = await createUser("PROJECT_MANAGER", "pmA2@test.dev");
    const { user: pmB } = await createUser("PROJECT_MANAGER", "pmB2@test.dev");
    const client = await createClientRecord();
    const projectB = await createProject(pmB.id, client.id);

    const res = await request(app).patch(`/api/projects/${projectB.id}`).set(auth(tokenA)).send({ name: "hacked" });
    expect([403, 404]).toContain(res.status);
  });

  it("Admin can access every project regardless of owner", async () => {
    const { accessToken: adminToken } = await createUser("ADMIN", "admin@test.dev");
    const { user: pmB } = await createUser("PROJECT_MANAGER", "pmB3@test.dev");
    const client = await createClientRecord();
    const projectB = await createProject(pmB.id, client.id);

    const res = await request(app).get(`/api/projects/${projectB.id}`).set(auth(adminToken));
    expect(res.status).toBe(200);
  });

  it("Developer-A cannot access or modify Developer-B's task by ID", async () => {
    const { user: pm } = await createUser("PROJECT_MANAGER", "pmX@test.dev");
    const { accessToken: devAToken } = await createUser("DEVELOPER", "devA@test.dev");
    const { user: devB } = await createUser("DEVELOPER", "devB@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    const taskB = await createTask(project.id, devB.id);

    const readRes = await request(app).get(`/api/tasks/${taskB.id}`).set(auth(devAToken));
    expect(readRes.status).toBe(404);

    const writeRes = await request(app).patch(`/api/tasks/${taskB.id}`).set(auth(devAToken)).send({ status: "DONE" });
    expect([403, 404]).toContain(writeRes.status);
  });

  it("Developer cannot access PM/Admin-only endpoints (client management)", async () => {
    const { accessToken: devToken } = await createUser("DEVELOPER", "dev2@test.dev");
    const res = await request(app).post("/api/clients").set(auth(devToken)).send({ name: "New Client" });
    expect(res.status).toBe(403);
  });

  it("submitting role=ADMIN in the request body does not grant admin access", async () => {
    const { accessToken: devToken } = await createUser("DEVELOPER", "dev3@test.dev");
    const res = await request(app)
      .post("/api/clients")
      .set(auth(devToken))
      .send({ name: "Sneaky Client", role: "ADMIN" });
    expect(res.status).toBe(403); // role is read from the verified JWT, never the body
  });

  it("developer update schema rejects fields outside status (no reassignment/ownership changes)", async () => {
    const { user: pm } = await createUser("PROJECT_MANAGER", "pmY@test.dev");
    const { user: devA, accessToken: devAToken } = await createUser("DEVELOPER", "devA2@test.dev");
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    const task = await createTask(project.id, devA.id);

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(auth(devAToken))
      .send({ status: "IN_PROGRESS", assignedDeveloperId: "someone-else", priority: "CRITICAL" });

    expect(res.status).toBe(400); // .strict() schema rejects unexpected fields
  });
});
