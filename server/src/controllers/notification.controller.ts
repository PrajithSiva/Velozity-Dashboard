import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import * as notificationService from "../services/notification.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await notificationService.listNotifications(req.user!.id));
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await notificationService.unreadCount(req.user!.id));
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await notificationService.markRead(req.user!.id, req.params.id));
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await notificationService.markAllRead(req.user!.id));
});
