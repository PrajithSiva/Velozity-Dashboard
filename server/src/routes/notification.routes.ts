import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators/notification.validator";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.use(requireAuth);
router.get("/", notificationController.list);
router.get("/unread-count", notificationController.unreadCount);
router.patch("/read-all", notificationController.markAllRead);
router.patch("/:id/read", validate({ params: idParamSchema }), notificationController.markRead);

export default router;
