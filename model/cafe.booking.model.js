import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const cafeBookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
      default: () => uuidv4(),
      trim: true,
    },

    bookingStatus: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled", "Refunded"],
      default: "Upcoming",
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafes",
      required: true,
    },

    bookingDate: {
      type: Date,
      required: true,
    },

    timeSlot: {
      type: String,
      required: true,
      trim: true,
    },

    numberOfGuests: {
      type: Number,
      required: true,
      min: 1,
    },

    guest: {
      isMySelf: { type: Boolean, default: true },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "" },
    },

    guestInfo: {
      specialRequests: { type: String, maxlength: 300, default: "" },
    },
    
    pricing: {
      perGuestRate: { type: Number, required: true, min: 0 },
      totalGuestRate: { type: Number, default: 0 },
      taxPercentage: { type: Number, default: 12 },
      taxAmount: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 50 },
      totalAmount: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
    },

    payment: {
      transactionId: { type: String, default: "" },
      paymentStatus: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "completed", "failed"],
        default: "pending",
      },
      paymentMethod: { type: String, default: "" },
      paymentDate: { type: Date },
    },
  },
  { timestamps: true }
);


cafeBookingSchema.pre("validate", function (next) {
  const totalGuestRate = this.pricing.perGuestRate * this.numberOfGuests;
  this.pricing.totalGuestRate = totalGuestRate;

  const tax = (totalGuestRate * this.pricing.taxPercentage) / 100;
  this.pricing.taxAmount = tax;

  this.pricing.totalAmount =
  totalGuestRate + tax + this.pricing.serviceFee;

  next();
});

const cafeBookingModel = mongoose.model("CafeBooking", cafeBookingSchema);
export default cafeBookingModel;