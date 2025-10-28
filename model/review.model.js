import mongoose from "mongoose";

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
      enum: ["Hotel", "Cafes", "Restro"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const reviewModel = mongoose.model("Review", reviewSchema);

export default reviewModel
