import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import clientRoutes from "./client.routes";
import projectRoutes from "./project.routes";
import taskRoutes from "./task.routes";
import notificationRoutes from "./notification.routes";
import dashboardRoutes from "./dashboard.routes";
import activityRoutes from "./activity.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/notifications", notificationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/activity", activityRoutes);

export default router;
