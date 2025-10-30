import jwt from "jsonwebtoken";
import { sendBadRequest, sendError } from "../utils/responseUtils.js";
import log from "../utils/logger.js";
import { config } from 'dotenv';
config();

const JWT_SECRET = process.env.JWT_SECET;

export const AdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendBadRequest(res, "Authorization token missing or invalid format");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return sendBadRequest(res, "Token not provided");
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // if (decoded.role !== "admin") {
    //   return sendBadRequest(res, "Access denied: User is not an admin");
    // }

    // Attach decoded admin data to req for downstream usage
    req.admin = decoded;

    next(); // continue to the next middleware/controller
  } catch (error) {
    log.error(`Admin token verification failed: ${error.message}`);

    if (error.name === "TokenExpiredError") {
      return sendError(res, "Token expired. Please log in again.");
    }

    if (error.name === "JsonWebTokenError") {
      return sendError(res, "Invalid token");
    }

    return sendError(res, "Token verification failed", error);
  }

};
