/**
 * Universal Notification Sender Utility
 * -------------------------------------
 * Can be used in *any* controller to send notifications.
 *
 * Usage:
 *   await sendNotification({
 *     adminId,
 *     userId,        // optional: if null => broadcast to all users
 *     title,
 *     description,
 *     image,         // optional
 *     type           // optional: 'single' | 'broadcast'
 *   });
 */

import notificationModel from "../model/notification.model.js";
import userModel from '../model/user.model.js'

export const sendNotification = async ({
  adminId,
  userId = null,
  title,
  description = null,
  image = null,
  type = "single",
}) => {
  try {
    if (!adminId || !title) {
      throw new Error("adminId and title are required fields.");
    }

    if (type === "single" && userId) {
      const notification = await notificationModel.create({
        adminId,
        userId,
        title,
        description,
        image,
        type,
      });
      return { success: true, message: "Notification sent to user", notification };
    }

    if (type === "broadcast" || !userId) {
      const allUsers = await userModel.find({}, "_id");

      if (!allUsers.length) {
        return { success: false, message: "No users found to broadcast." };
      }


      const notifications = allUsers.map((user) => ({
        adminId,
        userId: user._id,
        title,
        description,
        image,
        type: "broadcast",
      }));

      await notificationModel.insertMany(notifications);
      return { success: true, message: `Broadcast sent to ${allUsers.length} users.` };
    }

    return { success: false, message: "Invalid notification type or userId." };
  } catch (error) {
    console.error("Error sending notification:", error.message);
    return { success: false, message: error.message };
  }
};
