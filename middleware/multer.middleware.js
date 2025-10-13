import multer from "multer";
import { sendBadRequest } from "../utils/responseUtils.js";

// Memory storage for multer
const storage = multer.memoryStorage();

// Multer upload setup
export const uploadFiles = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 5MB max per file
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
}).any(); // Use .any() to allow dynamic field names like roomImages[0], roomImages[1]

// Middleware to normalize roomImages fields
export const normalizeRoomImages = (req, res, next) => {
  try {
    if (!req.files) return next();

    const hotelImages = [];
    const roomImages = [];

    req.files.forEach((file) => {
      if (file.fieldname.startsWith("roomImages")) {
        roomImages.push(file);
      } else if (file.fieldname === "hotelImages") {
        hotelImages.push(file);
      }
    });

    req.files.hotelImages = hotelImages;
    req.files.roomImages = roomImages;

    next();
  } catch (error) {
    return sendBadRequest(res, "Error processing uploaded images");
  }
};

// Handle multer errors
export const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendBadRequest(res, "File size too large. Max 5MB per file");
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return sendBadRequest(res, "Too many files uploaded");
    }
    return sendBadRequest(res, err.message);
  } else if (err) {
    return sendBadRequest(res, err.message);
  }
  next();
};
