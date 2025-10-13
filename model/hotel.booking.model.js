import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const hotelBookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      default: () => uuidv4(),
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "failed"],
      default: "pending",
    },

    guestId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    hotelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Hotel.rooms", required: true },

    bookingDates: {
      checkInDate: { type: Date, required: true },
      checkOutDate: { type: Date, required: true },
      numberOfNights: { type: Number, default: 1 },
    },

    guestInfo: {
      adults: { type: Number, required: true, min: 1 },
      children: { type: Number, default: 0, min: 0 },
      infants: { type: Number, default: 0, min: 0 },
      specialRequests: { type: String, maxlength: 300, default: "" },
    },

    pricing: {
      roomRatePerNight: { type: Number, required: true, min: 0 },
      totalRoomRate: { type: Number, default: 0 },
      discountPercentage: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      taxPercentage: { type: Number, default: 12 },
      taxAmount: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 100 },
      platformFee: { type: Number, default: 50 },
      totalAmount: { type: Number, default: 0 },
      currency: { type: String, default: "INR" },
    },

    payment: {
      paymentId: { type: String, default: "" }, // Razorpay payment id
      orderId: { type: String, default: "" }, // Razorpay order id
      signature: { type: String, default: "" },
      paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded"],
        default: "pending",
      },
      paymentMethod: { type: String, default: "" },
      paymentDate: { type: Date },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Virtual for duration
hotelBookingSchema.virtual("duration").get(function () {
  const checkIn = new Date(this.bookingDates.checkInDate);
  const checkOut = new Date(this.bookingDates.checkOutDate);
  return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
});

// Pre-validation auto-calculation
// hotelBookingSchema.pre("validate", function (next) {
//   if (this.bookingDates.checkOutDate <= this.bookingDates.checkInDate) {
//     return next(new Error("Check-out date must be after check-in date"));
//   }

//   const nights = Math.ceil(
//     (new Date(this.bookingDates.checkOutDate) - new Date(this.bookingDates.checkInDate)) /
//     (1000 * 60 * 60 * 24)
//   );
//   this.bookingDates.numberOfNights = nights;

//   // Calculate pricing
//   this.pricing.totalRoomRate = this.pricing.roomRatePerNight * nights;
//   this.pricing.discountAmount =
//     (this.pricing.totalRoomRate * this.pricing.discountPercentage) / 100;
//   const subtotal = this.pricing.totalRoomRate - this.pricing.discountAmount;

//   this.pricing.taxAmount = (subtotal * this.pricing.taxPercentage) / 100;
//   this.pricing.totalAmount =
//     subtotal + this.pricing.taxAmount + this.pricing.serviceFee + this.pricing.platformFee;

//   next();
// });

const hotelBookingModel = mongoose.model("HotelBooking", hotelBookingSchema);
export default hotelBookingModel;
