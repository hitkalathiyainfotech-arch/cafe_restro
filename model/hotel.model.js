import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., Deluxe, Suite, Standard
  pricePerNight: { type: Number, required: true },
  maxGuests: { type: Number, required: true },
  amenities: [{ type: String }], // e.g., ["Wi-Fi", "AC", "TV"]
  images: [{ type: String }],
});

const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    admin: {
      type: mongoose.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    location: {
      lat: Number,
      lng: Number,
    },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    images: [{ type: String }],
    rooms: [roomSchema],
    amenities: [{ type: String }],
    priceRange: {
      min: Number,
      max: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Hotel", hotelSchema);
