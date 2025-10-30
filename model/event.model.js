import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  eventImage: {
    type: String,
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  adminId: {
    type: mongoose.Types.ObjectId,
    ref: "Admin"
  },
  addresss: {
    type: String,
    required: true
  },
  typesOfEvent: {
    type: [String], // Array of strings
    default: [] // Default empty array instead of null
  },
  contactNo: {
    type: String
  },
  whatsappNo: {
    type: String
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index for better search performance
eventSchema.index({ eventName: "text", addresss: "text" });
eventSchema.index({ typesOfEvent: 1 });
eventSchema.index({ createdAt: 1 });

const eventModel = mongoose.model("Event", eventSchema);

export default eventModel;