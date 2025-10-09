import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
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
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ["user", "superadmin"],
    default: "user"
  },
  otp: {
    type: String,
    default: null
  }
});

const userModel = mongoose.model("user", UserSchema);

export default userModel;