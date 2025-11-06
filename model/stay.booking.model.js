import mongoose from "mongoose";

const stayBookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stayId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stay',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  guestCount: {
    type: Number,
    required: true
  }
}, { timestamps: true });

const bookingModel = mongoose.model("StayBooking", stayBookingSchema);
export default bookingModel;