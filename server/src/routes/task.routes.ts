import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createTaskSchema,
  updateTaskSchema,
  developerUpdateTaskSchema,
  taskListQuerySchema,
  idParamSchema,
} from "../validators/task.validator";
import * as taskController from "../controllers/task.controller";
import { ApiError } from "../utils/apiError";
import { Request, Response, NextFunction } from "express";

const router = Router();

router.use(requireAuth);

router.get("/", validate({ query: taskListQuerySchema }), taskController.list);
router.get("/:id", validate({ params: idParamSchema }), taskController.getOne);
router.post("/", requireRole(Role.ADMIN, Role.PROJECT_MANAGER), validate({ body: createTaskSchema }), taskController.create);

// Update body shape depends on the caller's role: developers are restricted
// to { status } only (enforced by the .strict() schema, which rejects any
// other field), PM/Admin get the full field set.
function validateUpdateByRole(req: Request, res: Response, next: NextFunction) {
  const schema = req.user!.role === Role.DEVELOPER ? developerUpdateTaskSchema : updateTaskSchema;
  const result = schema.safeParse(req.body);
  if (!result.success) return next(ApiError.validation("Invalid task update.", result.error.flatten()));
  req.body = result.data;
  next();
}

router.patch("/:id", validate({ params: idParamSchema }), validateUpdateByRole, taskController.update);
router.delete("/:id", requireRole(Role.ADMIN, Role.PROJECT_MANAGER), validate({ params: idParamSchema }), taskController.remove);

export default router;
