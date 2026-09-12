import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { validate } from "../middleware/validate.middleware";
import { createUserSchema } from "../validators/user.validator";
import * as userController from "../controllers/user.controller";

const router = Router();

router.use(requireAuth);
router.post("/", requireRole(Role.ADMIN), validate({ body: createUserSchema }), userController.createUser);

export default router;
