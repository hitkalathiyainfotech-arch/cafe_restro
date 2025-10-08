import mongoose from "mongoose";
import log from "../utils/logger.js";


const connectDB = async (DB_URL) => {
  try {
    const conn = await mongoose.connect(DB_URL);
    log.success(`Database Connected Successfully On : ${conn.connection.host}`);
  } catch (error) {
    log.error(`Error While Connect Database : ${error.message}`);
  }
}

export default connectDB;
