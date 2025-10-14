import mongoose from "mongoose";

const CafeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  location: {
    address: { type: String, required: true },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  themeCategory: {
    image: { type: String, default: null },
    name: { type: String, default: null }
  }
  ,
  images: [{ type: String }],
  rating: { type: Number, default: 0 },
  popular: { type: Boolean, default: false },
  amenities: [{ type: String }],
  services: [{ type: String }],
  pricing: {
    averagePrice: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  createdAt: { type: Date, default: Date.now }
});

const cafeModel = mongoose.model("Cafe", CafeSchema);
export default cafeModel;