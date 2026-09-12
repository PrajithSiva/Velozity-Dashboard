import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import * as dashboardController from "../controllers/dashboard.controller";

const router = Router();

router.use(requireAuth);
router.get("/", dashboardController.getDashboard);

export default router;
