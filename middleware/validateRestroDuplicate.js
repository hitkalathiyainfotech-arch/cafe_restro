import restroModel from "../model/restro.model.js";
import { sendBadRequest } from "../utils/responseUtils.js";
import log from "../utils/logger.js";

/**
 * Middleware to validate restaurant doesn't already exist BEFORE image upload
 * This prevents orphaned images in S3 when duplicate restaurant creation is attempted
 * NOTE: This runs AFTER multer processes the request, so req.body is available
 */
export const validateRestroDuplicate = async (req, res, next) => {
    try {
        // Get name and address from body (multer should have parsed it by now)
        let name = req.body?.name;
        let address = req.body?.address;

        // Handle both string and object formats for name
        if (typeof name === 'string' && name.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(name);
                name = parsed.name || name;
            } catch (e) {
                // Not JSON, use as is
            }
        }

        if (!name) {
            log.warn("Restaurant name missing in request body:", req.body);
            return sendBadRequest(res, "Restaurant name is required");
        }

        const nameStr = typeof name === 'string' ? name.trim() : String(name).trim();

        if (!nameStr) {
            return sendBadRequest(res, "Restaurant name is required");
        }

        // Parse address if it's a string
        let parsedAddress = address;
        if (typeof address === 'string') {
            try {
                parsedAddress = JSON.parse(address);
            } catch (e) {
                // If parsing fails, address might be invalid JSON
                log.warn("Failed to parse address:", address);
            }
        }

        // Check for duplicate restaurant by name and street address
        const query = { name: nameStr };
        if (parsedAddress && parsedAddress.street) {
            query["address.street"] = parsedAddress.street.trim();
        }

        const existingRestaurant = await restroModel.findOne(query);
        if (existingRestaurant) {
            return sendBadRequest(res, "A restaurant with this name and address already exists");
        }

        next();
    } catch (error) {
        log.error("Validate Restro Duplicate Error:", error);
        log.error("Request body:", req.body);
        log.error("Error stack:", error.stack);
        return sendBadRequest(res, `Error validating restaurant: ${error.message || 'Unknown error'}`);
    }
};

