import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../src/app";
import { initSocketServer } from "../src/sockets/socket.server";
import { createUser, createClientRecord, createProject, createTask } from "./factories";
import "./setup";

let httpServer: http.Server;
let port: number;

beforeAll(async () => {
  const app = createApp();
  httpServer = http.createServer(app);
  initSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as any).port;
});

afterAll(() => httpServer.close());

function connect(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, { auth: { token }, transports: ["websocket"] });
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
  });
}

function connectAnonymous(): Promise<{ error: Error }> {
  return new Promise((resolve) => {
    const socket = ioClient(`http://localhost:${port}`, { transports: ["websocket"] });
    socket.on("connect_error", (err) => resolve({ error: err }));
  });
}

describe("Socket.io security", () => {
  it("rejects a connection with no auth token", async () => {
    const result = await connectAnonymous();
    expect(result.error).toBeTruthy();
  });

  it("allows join_project only for a project the user is authorized to see", async () => {
    const { user: pmA, accessToken: tokenA } = await createUser("PROJECT_MANAGER", "sockPmA@test.dev");
    const { accessToken: tokenB } = await createUser("PROJECT_MANAGER", "sockPmB@test.dev");
    const client = await createClientRecord();
    const projectA = await createProject(pmA.id, client.id);

    const socketA = await connect(tokenA);
    const socketB = await connect(tokenB);

    const joinAOwn = await new Promise((resolve) => socketA.emit("join_project", projectA.id, resolve));
    expect((joinAOwn as any).ok).toBe(true);

    const joinBOther = await new Promise((resolve) => socketB.emit("join_project", projectA.id, resolve));
    expect((joinBOther as any).ok).toBe(false);

    socketA.disconnect();
    socketB.disconnect();
  });

  it("broadcasts activity only to sockets authorized for that project (role-filtered feed)", async () => {
    const { user: pm, accessToken: pmToken } = await createUser("PROJECT_MANAGER", "sockPm2@test.dev");
    const { user: devA, accessToken: devAToken } = await createUser("DEVELOPER", "sockDevA@test.dev");
    const { accessToken: devBToken } = await createUser("DEVELOPER", "sockDevB@test.dev"); // unauthorized for this project
    const client = await createClientRecord();
    const project = await createProject(pm.id, client.id);
    const task = await createTask(project.id, devA.id);

    const socketPm = await connect(pmToken);
    const socketDevA = await connect(devAToken);
    const socketDevB = await connect(devBToken);

    await new Promise((resolve) => socketPm.emit("join_project", project.id, resolve));

    const devBReceived: unknown[] = [];
    socketDevB.on("activity:new", (payload) => devBReceived.push(payload));

    const devAEventPromise = new Promise((resolve) => socketDevA.on("activity:new", resolve));
    const pmEventPromise = new Promise((resolve) => socketPm.on("activity:new", resolve));

    // Trigger a status transition via the service directly (equivalent to
    // the REST path) to fire emitActivity.
    const { updateTaskStatusAsDeveloper } = await import("../src/services/task.service");
    await updateTaskStatusAsDeveloper(task.id, { id: devA.id, role: "DEVELOPER" as any }, "IN_PROGRESS" as any);

    const [devAEvent, pmEvent] = await Promise.all([devAEventPromise, pmEventPromise]);
    expect(devAEvent).toBeTruthy();
    expect(pmEvent).toBeTruthy();

    await new Promise((r) => setTimeout(r, 200));
    expect(devBReceived.length).toBe(0); // unauthorized developer received nothing

    socketPm.disconnect();
    socketDevA.disconnect();
    socketDevB.disconnect();
  });
});
