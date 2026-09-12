import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { created } from "../utils/apiResponse";
import * as authService from "../services/auth.service";

// Admin-only (enforced in routes) creation of PM/Developer/Admin accounts.
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const user = await authService.createUser(name, email, password, role);
  return created(res, user);
});
