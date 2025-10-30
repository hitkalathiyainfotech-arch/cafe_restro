import mongoose from "mongoose";
import { deleteFromS3, resizeImage, uploadToS3 } from "../middleware/uploadS3.js";
import restroModel from "../model/restro.model.js";
import log from "../utils/logger.js";
import { sendBadRequest, sendError, sendSuccess } from "../utils/responseUtils.js";

export const createNewRestaurant = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      contact,
      cuisineTypes,
      averageCostForTwo,
      currency,
      operatingHours,
      amenities,
      services,
      paymentMethods,
      socialMedia,
      isPopular,
      isVerified,
      tableGroups,
    } = req.body;

    // Basic validation
    if (!name?.trim()) return sendBadRequest(res, "Restaurant name is required");
    if (!averageCostForTwo) return sendBadRequest(res, "Average cost for two is required");
    if (!address) return sendBadRequest(res, "Address is required");

    // ---- File uploads ----
    const featuredFile = req.files?.featured?.[0];
    const galleryFiles = Array.isArray(req.files?.gallery) ? req.files.gallery : [];
    const menuFiles = Array.isArray(req.files?.menu) ? req.files.menu : [];

    const featuredUrl = featuredFile
      ? await uploadToS3(
        await resizeImage(featuredFile.buffer, { width: 1280, height: 720 }),
        featuredFile.originalname,
        featuredFile.mimetype,
        "restro"
      )
      : null;

    const galleryUrls = await Promise.all(
      galleryFiles.map(async (file) => {
        const buffer = await resizeImage(file.buffer, { width: 1024, height: 768 });
        return await uploadToS3(buffer, file.originalname, file.mimetype, "restaurants/gallery");
      })
    );

    const menuUrls = await Promise.all(
      menuFiles.map(async (file) => {
        const buffer = await resizeImage(file.buffer, { width: 1024, height: 768 });
        return await uploadToS3(buffer, file.originalname, file.mimetype, "restaurants/menu");
      })
    );

    // ---- Parse JSON-like fields ----
    const parsed = (v, fallback = []) => (typeof v === "string" ? JSON.parse(v) : v || fallback);
    const parsedAddress = typeof address === "string" ? JSON.parse(address) : address;
    const parsedContact = typeof contact === "string" ? JSON.parse(contact) : contact;
    const parsedOperatingHours = typeof operatingHours === "string" ? JSON.parse(operatingHours) : operatingHours;
    const parsedTableGroups = parsed(tableGroups).map((group) => ({
      ...group,
      tables: Array.from({ length: group.totalTables }).map((_, i) => ({
        tableNumber: `${group.capacity}P-${i + 1}`,
        isBooked: false,
      })),
    }));

    // ---- Create restaurant ----
    const restaurant = new restroModel({
      ownerId: req.admin._id,
      name,
      description,
      address: parsedAddress,
      contact: parsedContact,
      cuisineTypes: parsed(cuisineTypes),
      averageCostForTwo,
      currency: currency || "INR",
      operatingHours: parsedOperatingHours,
      amenities: parsed(amenities),
      services: parsed(services),
      paymentMethods: parsed(paymentMethods),
      socialMedia: parsed(socialMedia, {}),
      isPopular: !!isPopular,
      isVerified: !!isVerified,
      images: { featured: featuredUrl, gallery: galleryUrls, menu: menuUrls },
      tableGroups: parsedTableGroups,
    });

    await restaurant.save();

    log.success(`Restaurant created: ${restaurant.name}`);
    return sendSuccess(res, "Restaurant created successfully", restaurant);
  } catch (error) {
    log.error(`createNewRestaurant Error: ${error.message}`);
    return sendError(res, 500, "Failed to create restaurant", error.message);
  }
};

export const getAllRestos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      cuisine,
      minRating,
      maxCost,
      hasTableCapacity,
      services,
      isPopular,
      isVerified,
      status,
      sortBy = "rating.average",
      sortOrder = "desc"
    } = req.query;

    const filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } }
      ];
    }

    // Location filter
    if (city) {
      filter["address.city"] = { $regex: city, $options: "i" };
    }

    // Cuisine filter
    if (cuisine) {
      filter.cuisineTypes = { $in: [new RegExp(cuisine, 'i')] };
    }

    // Rating filter
    if (minRating) {
      filter["rating.average"] = { $gte: parseFloat(minRating) };
    }

    // Cost filter
    if (maxCost) {
      filter.averageCostForTwo = { $lte: parseFloat(maxCost) };
    }

    // Table capacity filter
    if (hasTableCapacity) {
      filter["tableGroups.capacity"] = { $gte: parseInt(hasTableCapacity) };
    }

    // Services filter
    if (services) {
      const servicesArray = Array.isArray(services) ? services : [services];
      filter.services = { $in: servicesArray };
    }

    // Boolean filters
    if (isPopular !== undefined) filter.isPopular = isPopular === "true";
    if (isVerified !== undefined) filter.isVerified = isVerified === "true";
    if (status) filter.status = status;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const restaurants = await restroModel
      .find(filter)
      .populate("ownerId", "name email")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-tableGroups.tables.currentBooking"); // Exclude sensitive booking info

    const total = await restroModel.countDocuments(filter);

    return sendSuccess(res, "Restaurants fetched successfully", {
      restaurants,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRestaurants: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    log.error(`getAllRestaurants Error: ${error.message}`);
    return sendError(res, 500, "Failed to fetch restaurants", error.message);
  }
};

export const getSingleRestro = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await restroModel.findById(id).populate("ownerId", "name email");
    if (!restaurant) return sendBadRequest(res, "Restaurant not found");

    return sendSuccess(res, "Restaurant fetched successfully", restaurant);
  } catch (error) {
    log.error(`getSingleRestro Error: ${error.message}`);
    return sendError(res, 500, "Failed to fetch restaurant", error.message);
  }
};

export const filterRestaurants = async (req, res) => {
  try {
    const { cuisine, minCost, maxCost, city, rating, service, isPopular, isVerified } = req.query;
    const filter = { status: "active" };

    if (city) filter["address.city"] = new RegExp(city, "i");
    if (cuisine) filter.cuisineTypes = { $in: [new RegExp(cuisine, "i")] };
    if (service) filter.services = { $in: [service] };
    if (rating) filter["rating.average"] = { $gte: parseFloat(rating) };
    if (minCost || maxCost) {
      filter.averageCostForTwo = {
        ...(minCost && { $gte: parseFloat(minCost) }),
        ...(maxCost && { $lte: parseFloat(maxCost) }),
      };
    }
    if (isPopular !== undefined) filter.isPopular = isPopular === "true";
    if (isVerified !== undefined) filter.isVerified = isVerified === "true";

    const restaurants = await restroModel.find(filter).sort({ "rating.average": -1 });
    return sendSuccess(res, "Filtered restaurants fetched", restaurants);
  } catch (error) {
    log.error(`filterRestaurants Error: ${error.message}`);
    return sendError(res, 500, "Failed to filter restaurants", error.message);
  }
};

const parseDate = (dateStr) => {
  // Expecting "DD-MM-YYYY"
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};


export const getAvailableTables = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, partySize } = req.query;

    if (!date || !partySize) return sendBadRequest(res, "date and partySize are required");

    const requestedDate = parseDate(date); // parse DD-MM-YYYY
    if (isNaN(requestedDate.getTime())) return sendBadRequest(res, "Invalid date format. Use DD-MM-YYYY");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) return sendBadRequest(res, "Date cannot be in the past");

    const restaurant = await restroModel.findById(id);
    if (!restaurant) return sendBadRequest(res, "Restaurant not found");

    const availableTables = restaurant.findAvailableTables(parseInt(partySize), requestedDate);
    return sendSuccess(res, "Available tables fetched", availableTables);
  } catch (error) {
    log.error(`getAvailableTables Error: ${error.message}`);
    return sendError(res, 500, "Failed to get available tables", error.message);
  }
};

export const getAvailableRestoTimeSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, partySize } = req.query;

    if (!date || !partySize) return sendBadRequest(res, "date and partySize are required");

    const requestedDate = parseDate(date); // parse DD-MM-YYYY
    if (isNaN(requestedDate.getTime())) return sendBadRequest(res, "Invalid date format. Use DD-MM-YYYY");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestedDate < today) return sendBadRequest(res, "Date cannot be in the past");

    const restaurant = await restroModel.findById(id);
    if (!restaurant) return sendBadRequest(res, "Restaurant not found");

    const slots = restaurant.getAvailableTimeSlots(requestedDate, parseInt(partySize));
    return sendSuccess(res, "Available time slots fetched", slots);
  } catch (error) {
    log.error(`getAvailableTimeSlots Error: ${error.message}`);
    return sendError(res, 500, "Failed to get time slots", error.message);
  }
};

export const searchRestaurants = async (req, res) => {
  try {
    const { name, city, cuisine, minCost, maxCost, rating, service, isPopular, isVerified } = req.query;

    const filter = { status: "active" };

    if (name) {
      filter.name = { $regex: name, $options: "i" }; // Case-insensitive search
    }
    if (city) filter["address.city"] = { $regex: city, $options: "i" };
    if (cuisine) filter.cuisineTypes = { $in: [new RegExp(cuisine, "i")] };
    if (service) filter.services = { $in: [service] };
    if (rating) filter["rating.average"] = { $gte: parseFloat(rating) };
    if (minCost || maxCost) {
      filter.averageCostForTwo = {
        ...(minCost && { $gte: parseFloat(minCost) }),
        ...(maxCost && { $lte: parseFloat(maxCost) }),
      };
    }
    if (isPopular !== undefined) filter.isPopular = isPopular === "true";
    if (isVerified !== undefined) filter.isVerified = isVerified === "true";

    const restaurants = await restroModel.find(filter).sort({ "rating.average": -1 });

    return sendSuccess(res, "Restaurants fetched successfully", restaurants);
  } catch (error) {
    log.error(`searchRestaurants Error: ${error.message}`);
    return sendError(res, 500, "Failed to search restaurants", error.message);
  }
};

export const updateRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await restroModel.findById(id);
    if (!existing) return sendBadRequest(res, "Restaurant not found");

    // Handle file updates
    const featuredFile = req.files?.featured?.[0];
    const galleryFiles = Array.isArray(req.files?.gallery) ? req.files.gallery : [];
    const menuFiles = Array.isArray(req.files?.menu) ? req.files.menu : [];

    let featuredUrl = existing.images.featured;
    let galleryUrls = existing.images.gallery || [];
    let menuUrls = existing.images.menu || [];

    // Replace featured image
    if (featuredFile) {
      if (featuredUrl) await deleteFromS3(featuredUrl); // delete old featured
      featuredUrl = await uploadToS3(
        await resizeImage(featuredFile.buffer, { width: 1280, height: 720 }),
        featuredFile.originalname,
        featuredFile.mimetype,
        "restaurants/featured"
      );
    }

    // Replace gallery images
    if (galleryFiles.length > 0) {
      for (const url of galleryUrls) {
        await deleteFromS3(url); // delete old gallery images
      }
      const uploads = await Promise.all(
        galleryFiles.map(async (file) => {
          const buffer = await resizeImage(file.buffer, { width: 1024, height: 768 });
          return await uploadToS3(buffer, file.originalname, file.mimetype, "restaurants/gallery");
        })
      );
      galleryUrls = uploads;
    }

    // Replace menu images
    if (menuFiles.length > 0) {
      for (const url of menuUrls) {
        await deleteFromS3(url); // delete old menu images
      }
      const uploads = await Promise.all(
        menuFiles.map(async (file) => {
          const buffer = await resizeImage(file.buffer, { width: 1024, height: 768 });
          return await uploadToS3(buffer, file.originalname, file.mimetype, "restaurants/menu");
        })
      );
      menuUrls = uploads;
    }

    // Parse JSON-like fields
    const parsed = (v, fallback = []) => (typeof v === "string" ? JSON.parse(v) : v || fallback);

    const updateData = {
      ...req.body,
      cuisineTypes: parsed(req.body.cuisineTypes),
      amenities: parsed(req.body.amenities),
      services: parsed(req.body.services),
      paymentMethods: parsed(req.body.paymentMethods),
      socialMedia: parsed(req.body.socialMedia, {}),
      images: { featured: featuredUrl, gallery: galleryUrls, menu: menuUrls },
    };

    const updated = await restroModel.findByIdAndUpdate(id, updateData, { new: true });
    return sendSuccess(res, "Restaurant updated successfully", updated);
  } catch (error) {
    log.error(`updateRestaurant Error: ${error.message}`);
    return sendError(res, 500, "Failed to update restaurant", error.message);
  }
};

export const restroChangeStatus = async (req, res) => {
  try {
    const { id } = req?.params;
    const { status } = req?.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, "Invalid restaurant ID");
    }

    let validStatuses = ["active", "inactive", "suspended", "pending"];

    if (!validStatuses.includes(status)) {
      return sendBadRequest(res, "Invalid status value");
    }
    const restaurant = await restroModel.findById(id);
    if (!restaurant) {
      return sendBadRequest(res, "Restaurant not found");
    }

    restaurant.status = status;
    await restaurant.save();

    return sendSuccess(res, "Restaurant status updated successfully", restaurant);

  } catch (error) {
    log.error(`Error while Change Restro Status : ${error.message}`)
    return sendError(res, 500, "Failed to Change Restro Status", error.message);
  }
}

export const deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await restroModel.findById(id);
    if (!restaurant) return sendBadRequest(res, "Restaurant not found");

    const imagesToDelete = [];

    // Featured image
    if (restaurant.images.featured) {
      const key = restaurant.images.featured.split(".amazonaws.com/")[1];
      if (key) imagesToDelete.push(key);
    }

    // Gallery images
    if (Array.isArray(restaurant.images.gallery) && restaurant.images.gallery.length > 0) {
      restaurant.images.gallery.forEach((url) => {
        const key = url.split(".amazonaws.com/")[1];
        if (key) imagesToDelete.push(key);
      });
    }

    // Menu images
    if (Array.isArray(restaurant.images.menu) && restaurant.images.menu.length > 0) {
      restaurant.images.menu.forEach((url) => {
        const key = url.split(".amazonaws.com/")[1];
        if (key) imagesToDelete.push(key);
      });
    }

    // Delete all images from S3
    if (imagesToDelete.length > 0) {
      await Promise.allSettled(imagesToDelete.map((key) => deleteFromS3(key)));
    }

    // Delete restaurant from DB
    await restaurant.deleteOne();

    log.info(`Deleted restaurant: ${id}`);
    return sendSuccess(res, "Restaurant deleted successfully");
  } catch (error) {
    log.error(`deleteRestaurant Error: ${error.message}`);
    return sendError(res, 500, "Failed to delete restaurant", error.message);
  }
};

export const resetAllTables = async (req, res) => {
  try {
    const { restroId } = req.params;

    const restro = await restroModel.findById(restroId);
    if (!restro) return sendNotFound(res, "Restaurant not found");

    restro.tableGroups.forEach(group => {
      group.tables.forEach(table => {
        table.isBooked = false;
        table.currentBooking = null;
      });
    });

    await restro.save();

    return sendSuccess(res, null, "All tables have been reset to available");
  } catch (error) {
    log.error(`Error resetting tables: ${error.message}`);
    return sendError(res, error, `Error resetting tables: ${error.message}`);
  }
};
