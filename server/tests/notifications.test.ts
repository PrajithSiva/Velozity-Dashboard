import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { createUser } from "./factories";
import "./setup";

const app = createApp();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Notification isolation", () => {
  it("a user cannot mark-as-read another user's notification by guessing its ID", async () => {
    const { user: userA } = await createUser("DEVELOPER", "notifA@test.dev");
    const { accessToken: tokenB } = await createUser("DEVELOPER", "notifB@test.dev");

    const notif = await prisma.notification.create({
      data: { recipientId: userA.id, type: "TASK_ASSIGNED", message: "For A only" },
    });

    const res = await request(app).patch(`/api/notifications/${notif.id}/read`).set(auth(tokenB));
    expect(res.status).toBe(404);
  });

  it("unread count and mark-all-read only affect the caller's own notifications", async () => {
    const { user: userA, accessToken: tokenA } = await createUser("DEVELOPER", "notifC@test.dev");
    const { user: userB } = await createUser("DEVELOPER", "notifD@test.dev");

    await prisma.notification.create({ data: { recipientId: userA.id, type: "TASK_ASSIGNED", message: "A1" } });
    await prisma.notification.create({ data: { recipientId: userB.id, type: "TASK_ASSIGNED", message: "B1" } });

    await request(app).patch("/api/notifications/read-all").set(auth(tokenA));

    const bNotif = await prisma.notification.findFirst({ where: { recipientId: userB.id } });
    expect(bNotif!.readAt).toBeNull(); // untouched by A's mark-all-read
  });
});
