import hotelModel from "../model/hotel.model.js";
import { resizeImage, uploadToS3 } from "../middleware/uploadS3.js";
import sharp from "sharp";
import { sendBadRequest, sendSuccess, sendError } from "../utils/responseUtils.js";
import log from "../utils/logger.js";

export const createNewHotel = async (req, res) => {
  try {
    const { name, description, address, location, amenities, priceRange, Rent, rooms } = req.body;

    if (!name) return sendBadRequest(res, "Hotel name is required");

    // 1️⃣ Separate hotel and room images safely
    const hotelImagesFiles = Array.isArray(req.files?.hotelImages) ? req.files.hotelImages : [];
    const roomImagesFiles = Array.isArray(req.files?.roomImages) ? req.files.roomImages : [];

    // 2️⃣ Upload hotel images once
    const hotelImages = [];
    for (const file of hotelImagesFiles) {
      if (file && file.buffer) {
        const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, "hotels");
        hotelImages.push(url);
      }
    }

    // 3️⃣ Parse rooms JSON safely
    let parsedRooms = [];
    if (rooms) {
      parsedRooms = typeof rooms === "string" ? JSON.parse(rooms) : rooms;

      parsedRooms = await Promise.all(
        parsedRooms.map(async (room, idx) => {
          const roomFile = roomImagesFiles[idx]; // map 1:1 room image
          if (roomFile && roomFile.buffer) {
            room.images = [await uploadToS3(roomFile.buffer, roomFile.originalname, roomFile.mimetype, "rooms")];
          } else {
            room.images = [];
          }
          return room;
        })
      );
    }

    // 4️⃣ Create hotel document in MongoDB
    const hotel = new hotelModel({
      name,
      description,
      adminId: req.admin._id,
      address: address ? JSON.parse(address) : {},
      location: location ? JSON.parse(location) : {},
      amenities: amenities ? JSON.parse(amenities) : [],
      priceRange: priceRange ? JSON.parse(priceRange) : {},
      Rent: Rent || null,
      images: hotelImages,
      rooms: parsedRooms,
    });

    await hotel.save();

    return sendSuccess(res, "Hotel created successfully", hotel);
  } catch (error) {
    log.error("createNewHotel Error:", error);
    return sendError(res, 500, "Failed to create hotel", error);
  }
};

export const getAllHotels = async (req, res) => {
  try {
    const hotels = await hotelModel.find({}).sort({ createdAt: -1 });

    return sendSuccess(res, "Hotels fetched successfully", hotels);

  } catch (error) {
    log.error(error);
    return sendError(res, 500, "Failed to fetch hotels", error);
  }
}

export const getHotelById = async (req, res) => {
  try {
    const { hotelId } = req.params;
    if (!hotelId) return sendError(res, 400, "Hotel ID is required");

    const hotel = await hotelModel.findById(hotelId).populate('admin');
    if (!hotel) return sendError(res, 404, "Hotel not found");

    return sendSuccess(res, "Hotel fetched successfully", hotel);

  } catch (error) {
    log.error(error);
    return sendError(res, 500, "Failed to fetch hotel", error);
  }
}

export const deleteHotels = async (req, res) => {
  try {
    const { hotelId } = req.params;
    if (!hotelId) return sendError(res, 400, "Hotel ID is required");
    const hotel = await hotelModel.findByIdAndDelete(hotelId);
    if (!hotel) return sendError(res, 404, "Hotel not found or already deleted");
    return sendSuccess(res, "Hotel deleted successfully", hotel);
  } catch (error) {
    log.error(error);
    return sendError(res, 500, "Failed to delete hotel", error);
  }
}