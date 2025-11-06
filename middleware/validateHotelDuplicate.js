import hotelModel from "../model/hotel.model.js";
import { sendBadRequest } from "../utils/responseUtils.js";
import log from "../utils/logger.js";

/**
 * Middleware to validate hotel doesn't already exist BEFORE image upload
 * This prevents orphaned images in S3 when duplicate hotel creation is attempted
 * NOTE: This runs AFTER multer processes the request, so req.body is available
 */
export const validateHotelDuplicate = async (req, res, next) => {
    try {
        // Get name from body (multer should have parsed it by now)
        // Handle both string and object formats
        let name = req.body?.name;

        // If name is a string that might be JSON, try to parse it
        if (typeof name === 'string' && name.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(name);
                name = parsed.name || name;
            } catch (e) {
                // Not JSON, use as is
            }
        }

        if (!name) {
            log.warn("Hotel name missing in request body:", req.body);
            return sendBadRequest(res, "Hotel name is required");
        }

        const nameStr = typeof name === 'string' ? name.trim() : String(name).trim();

        if (!nameStr) {
            return sendBadRequest(res, "Hotel name is required");
        }

        // Check for duplicate hotel
        const existingHotel = await hotelModel.findOne({ name: nameStr });
        if (existingHotel) {
            return sendBadRequest(res, "Hotel already exists");
        }

        next();
    } catch (error) {
        log.error("Validate Hotel Duplicate Error:", error);
        log.error("Request body:", req.body);
        log.error("Error stack:", error.stack);
        return sendBadRequest(res, `Error validating hotel: ${error.message || 'Unknown error'}`);
    }
};

