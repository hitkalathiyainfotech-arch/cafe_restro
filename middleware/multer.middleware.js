import multer from "multer";
import { sendBadRequest } from "../utils/responseUtils.js";
import { uploadToS3, resizeImage } from "./uploadS3.js"; // your S3 helper
import sharp from "sharp";

// 1️⃣ Multer memory storage
const storage = multer.memoryStorage();

// 2️⃣ Multer setup
export const uploadFiles = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
}).any(); // allow dynamic field names like roomImages[0], roomImages[1], hotelImages

// 3️⃣ Middleware to normalize & upload images to S3
export const processAndUploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return next();

    const hotelImagesFiles = [];
    const roomImagesFiles = [];

    // Separate hotelImages vs roomImages
    req.files.forEach((file) => {
      if (file.fieldname.startsWith("roomImages")) {
        roomImagesFiles.push(file);
      } else if (file.fieldname === "hotelImages") {
        hotelImagesFiles.push(file);
      }
    });

    // 1️⃣ Upload hotel images to S3
    req.files.hotelImages = await Promise.all(
      hotelImagesFiles.map(async (file) => {
        const buffer = await resizeImage(file.buffer, { width: 1024, height: 768, quality: 80 });
        return await uploadToS3(buffer, file.originalname, file.mimetype, "hotels");
      })
    );

    // 2️⃣ Upload room images to S3
    req.files.roomImages = await Promise.all(
      roomImagesFiles.map(async (file) => {
        const buffer = await resizeImage(file.buffer, { width: 800, height: 600, quality: 80 });
        return await uploadToS3(buffer, file.originalname, file.mimetype, "rooms");
      })
    );

    next();
  } catch (error) {
    console.error("S3 Upload Error:", error);
    return sendBadRequest(res, "Error uploading images to S3");
  }
};

// 4️⃣ Handle multer errors
export const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return sendBadRequest(res, "File size too large. Max 20MB per file");
    if (err.code === "LIMIT_UNEXPECTED_FILE") return sendBadRequest(res, "Too many files uploaded");
    return sendBadRequest(res, err.message);
  } else if (err) {
    return sendBadRequest(res, err.message);
  }
  next();
};
