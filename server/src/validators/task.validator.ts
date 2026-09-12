import { z } from "zod";
import { TaskStatus, TaskPriority } from "@prisma/client";

export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  assignedDeveloperId: z.string().min(1).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.coerce.date().optional(),
});

// PM/Admin update: any field except who created it / which project it
// belongs to (project reassignment is a delete+recreate in this design).
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).optional(),
  assignedDeveloperId: z.string().min(1).nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

// Developer update: status ONLY. Enforced by schema shape, not just docs —
// any other field in the body is stripped by .strict() failing validation.
export const developerUpdateTaskSchema = z
  .object({
    status: z.nativeEnum(TaskStatus),
  })
  .strict();

export const taskListQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  projectId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});
