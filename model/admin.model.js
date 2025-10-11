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
  ]
})


const adminModel = mongoose.model("Admin", AdminSchema);

export default adminModel;


