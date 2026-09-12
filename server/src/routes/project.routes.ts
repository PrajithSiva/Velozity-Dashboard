import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import { createProjectSchema, updateProjectSchema, idParamSchema } from "../validators/project.validator";
import * as projectController from "../controllers/project.controller";

const router = Router();

router.use(requireAuth);
// Listing/reading is allowed for all roles; the SERVICE scopes the actual
// rows returned by role (see project.service.ts scopeFor). Developers land
// here too since a dev may need to view a project their task belongs to.
router.get("/", projectController.list);
router.get("/:id", validate({ params: idParamSchema }), projectController.getOne);
router.post("/", requireRole(Role.ADMIN, Role.PROJECT_MANAGER), validate({ body: createProjectSchema }), projectController.create);
router.patch(
  "/:id",
  requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validate({ params: idParamSchema, body: updateProjectSchema }),
  projectController.update
);
router.delete("/:id", requireRole(Role.ADMIN, Role.PROJECT_MANAGER), validate({ params: idParamSchema }), projectController.remove);

export default router;
