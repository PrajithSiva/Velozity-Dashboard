import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, noContent } from "../utils/apiResponse";
import * as projectService from "../services/project.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await projectService.listProjects(req.user!));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await projectService.getProjectForActor(req.params.id, req.user!));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await projectService.createProject(req.user!, req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await projectService.updateProject(req.params.id, req.user!, req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await projectService.deleteProject(req.params.id, req.user!);
  return noContent(res);
});
