import mongoose from "mongoose";
import hotelModel from "./hotel.model.js";
import cafeModel from "./cafe.model.js";
import restroModel from "./restro.model.js";
import eventModel from "./event.model.js";
import hallModel from "./hall.model.js";

// Business types configuration
const BUSINESS_TYPES = {
  HOTEL: { type: "Hotel", model: hotelModel },
  CAFE: { type: "Cafes", model: cafeModel },
  RESTRO: { type: "Restro", model: restroModel },
  EVENT: { type: "Event", model: eventModel },
  HALL: { type: "Hall", model: hallModel },
};

const reviewSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "businessType",
    },
    businessType: {
      type: String,
      required: true,
      enum: Object.values(BUSINESS_TYPES).map(config => config.type),
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for user details
reviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Index for better query performance
reviewSchema.index({ businessId: 1, businessType: 1 });
reviewSchema.index({ userId: 1, businessId: 1, businessType: 1 }, { unique: true });

const reviewModel = mongoose.model("Review", reviewSchema);

export { BUSINESS_TYPES };
export default reviewModel;