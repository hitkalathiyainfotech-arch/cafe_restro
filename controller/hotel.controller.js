import hotelModel from "../model/hotel.model.js";
import log from "../utils/logger.js"
import { sendError, sendSuccess } from "../utils/responseUtils.js";
import sharp from "sharp";

export const createNewHotel = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      location,
      amenities,
      priceRange,
      Rent,
      rooms,
    } = req.body;

    if (!name) return sendBadRequest(res, "Hotel name is required");

    const hotelImages = req.files?.hotelImages || [];
    const roomImages = req.files?.roomImages || [];

    // Process hotel images as Data URLs
    const processedHotelImages = await Promise.all(
      hotelImages.map(async (file) => {
        const buffer = await sharp(file.buffer)
          .resize(1024, 768)
          .jpeg({ quality: 80 })
          .toBuffer();
        return `data:${file.mimetype};base64,${buffer.toString("base64")}`;
      })
    );

    // Parse rooms if sent as JSON string
    let parsedRooms = [];
    if (rooms) {
      parsedRooms = typeof rooms === "string" ? JSON.parse(rooms) : rooms;

      // Attach corresponding room images as Data URLs
      parsedRooms = await Promise.all(
        parsedRooms.map(async (room, idx) => {
          const roomFile = roomImages[idx];
          if (roomFile) {
            const buffer = await sharp(roomFile.buffer)
              .resize(800, 600)
              .jpeg({ quality: 80 })
              .toBuffer();
            room.images = [`data:${roomFile.mimetype};base64,${buffer.toString("base64")}`];
          } else {
            room.images = [];
          }
          return room;
        })
      );
    }

    const hotel = new hotelModel({
      name,
      description,
      admin: req.admin?._id,
      address: address ? JSON.parse(address) : {},
      location: location ? JSON.parse(location) : {},
      amenities: amenities ? JSON.parse(amenities) : [],
      priceRange: priceRange ? JSON.parse(priceRange) : {},
      Rent: Rent || null,
      images: processedHotelImages,
      rooms: parsedRooms,
    });

    await hotel.save();

    return sendSuccess(res, "Hotel created successfully", hotel);
  } catch (error) {
    log.error(error);
    return sendError(res, 500, "Failed to create hotel", error);
  }
};



