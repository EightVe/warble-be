import express from "express";
import { getNotifications, markAsRead, markAllAsRead,getForceOpenNotifications,markForceNotificationAsRead } from "../controllers/notification.controller.js";

const router = express.Router();

// ✅ Route to get notifications for a user (with optional type filter)
router.get("/:userId", getNotifications);
router.get("/force-open/:userId", getForceOpenNotifications);
// ✅ Route to mark a single notification as read
router.put("/:notificationId/markAsRead", markAsRead);
router.put("/:notificationId/markForceAsRead", markForceNotificationAsRead);
// ✅ Route to mark all notifications as read for a user
router.put("/:userId/markAllAsRead", markAllAsRead);

export default router;
