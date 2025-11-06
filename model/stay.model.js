import mongoose from "mongoose";

const staySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  pricePerHour: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  images: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const stayModel = mongoose.model("Stay", staySchema);
export default stayModel;