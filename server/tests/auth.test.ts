import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { hashPassword } from "../src/utils/password";
import "./setup";

const app = createApp();

describe("Auth", () => {
  it("logs in with valid credentials and sets an HttpOnly refresh cookie", async () => {
    await prisma.user.create({
      data: { name: "Admin", email: "admin@test.dev", passwordHash: await hashPassword("Password123!"), role: "ADMIN" },
    });

    const res = await request(app).post("/api/auth/login").send({ email: "admin@test.dev", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const cookie = res.headers["set-cookie"][0];
    expect(cookie).toMatch(/refreshToken=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("rejects an invalid password", async () => {
    await prisma.user.create({
      data: { name: "Admin", email: "admin2@test.dev", passwordHash: await hashPassword("Password123!"), role: "ADMIN" },
    });
    const res = await request(app).post("/api/auth/login").send({ email: "admin2@test.dev", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rotates the refresh token and rejects reuse of the old one", async () => {
    await prisma.user.create({
      data: { name: "Admin", email: "admin3@test.dev", passwordHash: await hashPassword("Password123!"), role: "ADMIN" },
    });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin3@test.dev", password: "Password123!" });
    const cookie = loginRes.headers["set-cookie"][0];

    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshRes.status).toBe(200);
    const newCookie = refreshRes.headers["set-cookie"][0];
    expect(newCookie).not.toBe(cookie);

    // Reusing the ORIGINAL (now-rotated/revoked) refresh token must fail.
    const reuseRes = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(reuseRes.status).toBe(401);
  });

  it("logout revokes the refresh token so it can no longer be used", async () => {
    await prisma.user.create({
      data: { name: "Admin", email: "admin4@test.dev", passwordHash: await hashPassword("Password123!"), role: "ADMIN" },
    });
    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin4@test.dev", password: "Password123!" });
    const cookie = loginRes.headers["set-cookie"][0];

    await request(app).post("/api/auth/logout").set("Cookie", cookie);
    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshRes.status).toBe(401);
  });

  it("GET /api/auth/me requires a valid access token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
