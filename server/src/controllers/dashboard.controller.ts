import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/apiResponse";
import * as dashboardService from "../services/dashboard.service";

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await dashboardService.getDashboard(req.user!));
});
