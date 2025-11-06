import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    default: null
  },
  email: {
    type: String,
    default: null,
    unique: true
  },
  password: {
    type: String,
    default: null
  },
  hotels: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Hotel",
      default: null
    }
  ],
  cafes: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Cafe",
      default: null
    }
  ],
  restro: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Restro",
      default: null
    }
  ],
  halls: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Hall",
      default: null
    }
  ],
  tours: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Tour",
      default: null
    }
  ],
  stays: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Stay",
      default: null
    }
  ],
  events: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Event",
      default: null
    }
  ]
})


const adminModel = mongoose.model("Admin", AdminSchema);

export default adminModel;


