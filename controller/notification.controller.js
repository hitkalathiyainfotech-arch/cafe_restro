import notificationModel from "../model/notification.model.js";
import log from "../utils/logger.js";


export const createNotification = async (req, res) => {
  try {
    const { userId, title, description, image, type } = req.body;
    const adminId = req.admin?._id;

    if (!adminId || !title) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const newNotification = await notificationModel.create({
      adminId,
      userId: userId || null,
      title,
      description,
      image,
      type: userId ? "single" : "broadcast",
    });

    res.status(201).json({ success: true, message: "Notification created", data: newNotification });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await notificationModel.find()
      .populate("userId", "name email")
      .populate("adminId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, total: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationModel.findById(id)
      .populate("userId", "name email")
      .populate("adminId", "name email");

    if (!notification)
      return res.status(404).json({ success: false, message: "Notification not found" });

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId)
      return res.status(400).json({ success: false, message: "User not authenticated" });

    const notifications = await notificationModel.find({
      $or: [{ userId }, { type: "broadcast" }],
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, total: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await notificationModel.findByIdAndUpdate(id, updates, { new: true });

    if (!updated)
      return res.status(404).json({ success: false, message: "Notification not found" });

    res.status(200).json({ success: true, message: "Notification updated", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await notificationModel.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ success: false, message: "Notification not found" });

    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
