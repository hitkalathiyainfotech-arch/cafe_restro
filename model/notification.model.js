import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminId: {
      type: mongoose.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ["single", "broadcast"],
      default: "single",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


notificationSchema.index({ userId: 1, isRead: 1 });

const notificationModel = mongoose.model("Notification", notificationSchema);

export default notificationModel;
