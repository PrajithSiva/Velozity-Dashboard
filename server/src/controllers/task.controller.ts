import { Request, Response } from "express";
import { Role } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, noContent } from "../utils/apiResponse";
import * as taskService from "../services/task.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as any;
  return ok(
    res,
    await taskService.listTasks(req.user!, {
      status: q.status,
      priority: q.priority,
      dueFrom: q.dueFrom,
      dueTo: q.dueTo,
      projectId: q.projectId,
      page: q.page,
      pageSize: q.pageSize,
    })
  );
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await taskService.getTaskForActor(req.params.id, req.user!));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await taskService.createTask(req.user!, req.body));
});

// Branches by role: developers get the restricted status-only path;
// PM/Admin get the full update path. Both ultimately call the same
// transactional transitionStatus() when status changes.
export const update = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role === Role.DEVELOPER) {
    const updated = await taskService.updateTaskStatusAsDeveloper(
      req.params.id,
      req.user!,
      req.body.status
    );
    return ok(res, updated);
  }
  return ok(res, await taskService.updateTaskFull(req.params.id, req.user!, req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await taskService.deleteTask(req.params.id, req.user!);
  return noContent(res);
});
