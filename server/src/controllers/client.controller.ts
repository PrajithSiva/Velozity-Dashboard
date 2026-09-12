import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, noContent } from "../utils/apiResponse";
import * as clientService from "../services/client.service";

export const list = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await clientService.listClients());
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await clientService.getClient(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  return created(res, await clientService.createClient(req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  return ok(res, await clientService.updateClient(req.params.id, req.body));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await clientService.deleteClient(req.params.id);
  return noContent(res);
});
