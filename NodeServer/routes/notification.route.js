import express from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller.js";

const router = express.Router();

// ✅ Route to get notifications for a user (with optional type filter)
router.get("/:userId", getNotifications);

// ✅ Route to mark a single notification as read
router.put("/:notificationId/markAsRead", markAsRead);

// ✅ Route to mark all notifications as read for a user
router.put("/:userId/markAllAsRead", markAllAsRead);

export default router;
