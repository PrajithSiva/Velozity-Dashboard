import { beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "../src/config/prisma";

// These tests run against a REAL PostgreSQL instance (point DATABASE_URL at
// a disposable test database, e.g. via docker-compose, before running
// `npm test`). They are NOT mocked — Prisma talks to real Postgres so
// transaction/index/constraint behavior is genuinely exercised.
beforeAll(async () => {
  await prisma.$connect();
});

afterEach(async () => {
  // Clean slate between tests, respecting FK order.
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
