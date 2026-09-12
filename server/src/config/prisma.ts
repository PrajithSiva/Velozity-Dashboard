import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance. All DB access in this codebase goes through
// services calling this client (or the transaction handle passed to them) —
// no raw SQL, no per-controller clients.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
