import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import * as activityService from "../services/activity.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await activityService.listActivity(req.user!));
});

// GET /api/activity/missed?after=<activityLogId>
// Used by the client on socket reconnect (see client/src/hooks/useSocket.ts)
// as a REST fallback/complement to the socket-driven recovery.
export const missed = asyncHandler(async (req: Request, res: Response) => {
  const after = req.query.after as string | undefined;
  return ok(res, await activityService.getMissedActivity(req.user!, after));
});
