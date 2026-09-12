import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import * as activityController from "../controllers/activity.controller";

const router = Router();

router.use(requireAuth);
router.get("/", activityController.list);
router.get("/missed", activityController.missed);

export default router;
