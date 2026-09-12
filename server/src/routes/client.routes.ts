import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import { createClientSchema, updateClientSchema, idParamSchema } from "../validators/client.validator";
import * as clientController from "../controllers/client.controller";

const router = Router();

router.use(requireAuth);
// Client management is Admin-only per the assessment brief.
router.get("/", requireRole(Role.ADMIN, Role.PROJECT_MANAGER), clientController.list);
router.get("/:id", requireRole(Role.ADMIN, Role.PROJECT_MANAGER), validate({ params: idParamSchema }), clientController.getOne);
router.post("/", requireRole(Role.ADMIN), validate({ body: createClientSchema }), clientController.create);
router.patch("/:id", requireRole(Role.ADMIN), validate({ params: idParamSchema, body: updateClientSchema }), clientController.update);
router.delete("/:id", requireRole(Role.ADMIN), validate({ params: idParamSchema }), clientController.remove);

export default router;
