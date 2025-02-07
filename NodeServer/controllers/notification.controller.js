
import {io} from "../index.js"
import { Notification } from "../models/notification.model.js";

// Save Notification & Push to Online Users
import { UserStatus } from "../models/userStatus.model.js";

export const sendNotification = async (userId, senderId, type, title, description, userAvatar, commentId = null, postUID=null,forceOpen=false,AdminAnnouncement,replyId=null) => {
  try {
    forceOpen = typeof forceOpen === 'boolean' ? forceOpen : false;
    const newNotification = new Notification({
      userId,
      senderId,
      type,
      title,
      description,
      userAvatar,
      commentId,
      postUID,
      forceOpen,
      AdminAnnouncement,
      replyId,
    });

    await newNotification.save();

    // ✅ Check if user is online
    const userStatus = await UserStatus.findOne({ userId });

    if (userStatus && userStatus.status !== "offline") {
      io.to(userStatus.socketId).emit("newNotification", newNotification);
    } else {
      console.log(`📩 User ${userId} is offline. Notification stored in DB.`);
    }

    return newNotification;
  } catch (error) {
    console.error("❌ Error saving notification:", error);
  }
};

  
// Get Notifications for a User (Filtered)
export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // Optional filter

    let filter = { userId, forceOpen: { $ne: true } }; // Exclude forceOpen notifications
    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Error fetching notifications" });
  }
};

export const getForceOpenNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // Optional filter

    let filter = { userId, forceOpen: true }; // Fetch only forceOpen notifications
    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    console.error("❌ Error fetching forceOpen notifications:", error);
    res.status(500).json({ error: "Error fetching forceOpen notifications" });
  }
};

// Mark a Notification as Read
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await Notification.findByIdAndUpdate(notificationId, { read: true });

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Error marking notification as read" });
  }
};

// Mark All Notifications as Read
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    await Notification.updateMany({ userId }, { read: true });

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: "Error marking notifications as read" });
  }
};


export const markForceNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    await Notification.findByIdAndUpdate(notificationId, { forceOpen: false });

    res.status(200).json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ success: false, message: "Failed to mark notification as read" });
  }
};
