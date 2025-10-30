import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    couponPerc: {
      type: Number,
      required: [true, "Coupon percentage is required"],
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    couponExpire: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
  },
  { timestamps: true }
);


couponSchema.pre("save", function (next) {
  if (this.couponExpire && this.couponExpire < new Date()) {
    this.isActive = false;
  }
  next();
});

couponSchema.statics.validateCoupon = async function (code) {
  const coupon = await this.findOne({
    couponCode: code.toUpperCase(),
    isActive: true,
    couponExpire: { $gte: new Date() },
  });

  if (!coupon) return null;
  return coupon;
};

const coupanModel = mongoose.model("Coupon", couponSchema);

export default coupanModel;
