import mongoose from "mongoose";
import { deleteFromS3, uploadToS3 } from "../middleware/uploadS3.js";
import eventModel from "../model/event.model.js";
import adminModel from "../model/admin.model.js";
import log from "../utils/logger.js";
import { sendError, sendSuccess } from "../utils/responseUtils.js";

// Create a new event
export const addNewEvent = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const {
      eventName,
      addresss,
      typesOfEvent,
      contactNo,
      whatsappNo
    } = req.body;

    // Validate required fields
    if (!eventName || !addresss) {
      return sendError(res, "eventName and addresss are required fields", 400);
    }

    // Check if file exists
    if (!req.files || !req.files.eventImage || req.files.eventImage.length === 0) {
      return sendError(res, "eventImage file is required", 400);
    }

    const eventImageFile = req.files.eventImage[0];

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(eventImageFile.mimetype)) {
      return sendError(res, "Invalid file type. Only JPEG, JPG, PNG, GIF, and WebP images are allowed", 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (eventImageFile.size > maxSize) {
      return sendError(res, "File size too large. Maximum size is 5MB", 400);
    }

    let eventImageUrl;
    try {
      // Upload to S3
      eventImageUrl = await uploadToS3(
        eventImageFile.buffer,
        eventImageFile.originalname,
        eventImageFile.mimetype,
        "events"
      );
      log.info(`Event image uploaded to S3: ${eventImageUrl}`);
    } catch (uploadError) {
      log.error(`S3 Upload failed: ${uploadError.message}`);
      return sendError(res, "Failed to upload event image", uploadError);
    }

    // Process typesOfEvent - convert string to array if needed
    let eventTypesArray = [];
    if (typesOfEvent) {
      if (typeof typesOfEvent === 'string') {
        // If it's a comma-separated string, split it
        eventTypesArray = typesOfEvent.split(',').map(type => type.trim());
      } else if (Array.isArray(typesOfEvent)) {
        eventTypesArray = typesOfEvent;
      }
    }

    // Create new event
    const newEvent = new eventModel({
      eventImage: eventImageUrl,
      eventName,
      adminId: adminId,
      addresss,
      typesOfEvent: eventTypesArray, // Now using array
      contactNo,
      whatsappNo
    });

    const savedEvent = await newEvent.save();

    // ✅ Append event ID to admin model
    if (savedEvent.adminId && savedEvent._id) {
      await adminModel.findByIdAndUpdate(
        savedEvent.adminId,
        { $addToSet: { events: savedEvent._id } },
        { new: true }
      ).catch(err => log.warn("Failed to update admin events:", err.message));
    }

    log.info(`Event created successfully: ${savedEvent._id} by admin: ${adminId}`);
    return sendSuccess(res, "Event created successfully", savedEvent, 201);
  } catch (error) {
    log.error(`Error While Creating a new Event: ${error.message}`);
    return sendError(res, "Error While Creating a new Event", error);
  }
};


// Get all events with advanced filtering
export const getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      typesOfEvent,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};

    // Search filter (case-insensitive search on eventName and addresss)
    if (search) {
      filter.$or = [
        { eventName: { $regex: search, $options: "i" } },
        { addresss: { $regex: search, $options: "i" } }
      ];
    }

    // Type filter
    if (typesOfEvent) {
      filter.typesOfEvent = typesOfEvent;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      collation: { locale: "en", strength: 2 } // Case-insensitive sorting
    };

    // Execute query with pagination
    const events = await eventModel.find(filter)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .exec();

    // Get total count for pagination info
    const totalCount = await eventModel.countDocuments(filter);

    const response = {
      events,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(totalCount / options.limit),
        totalEvents: totalCount,
        hasNext: options.page < Math.ceil(totalCount / options.limit),
        hasPrev: options.page > 1
      }
    };

    log.info(`Retrieved ${events.length} events`);
    return sendSuccess(res, "Events retrieved successfully", response);
  } catch (error) {
    log.error(`Error While Getting Events: ${error.message}`);
    return sendError(res, "Error While Getting Events", error);
  }
};

// Get single event by ID
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid event ID", 400);
    }

    const event = await eventModel.findById(id);

    if (!event) {
      return sendError(res, "Event not found", 404);
    }

    log.info(`Event retrieved: ${id}`);
    return sendSuccess(res, "Event retrieved successfully", event);
  } catch (error) {
    log.error(`Error While Getting Event: ${error.message}`);
    return sendError(res, "Error While Getting Event", error);
  }
};

// Update event by ID
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin._id;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid event ID", 400);
    }

    // Check if event exists and belongs to the admin
    const existingEvent = await eventModel.findOne({ _id: id, adminId });
    if (!existingEvent) {
      return sendError(res, "Event not found or access denied", 404);
    }

    // Process typesOfEvent - convert string to array if needed
    if (updateData.typesOfEvent) {
      if (typeof updateData.typesOfEvent === 'string') {
        updateData.typesOfEvent = updateData.typesOfEvent.split(',').map(type => type.trim());
      } else if (!Array.isArray(updateData.typesOfEvent)) {
        return sendError(res, "typesOfEvent must be a string or array", 400);
      }
    }

    // Handle image upload if new file is provided
    if (req.files && req.files.eventImage && req.files.eventImage.length > 0) {
      const eventImageFile = req.files.eventImage[0];

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(eventImageFile.mimetype)) {
        return sendError(res, "Invalid file type. Only JPEG, JPG, PNG, GIF, and WebP images are allowed", 400);
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (eventImageFile.size > maxSize) {
        return sendError(res, "File size too large. Maximum size is 5MB", 400);
      }

      // Delete old image from S3 first
      if (existingEvent.eventImage) {
        try {
          const imageUrl = existingEvent.eventImage;
          const key = imageUrl.split(".amazonaws.com/")[1];
          await deleteFromS3(key);
          log.info(`Old event image deleted from S3: ${existingEvent.eventImage}`);
        } catch (deleteError) {
          log.warn(`Failed to delete old event image: ${deleteError.message}`);
        }
      }

      try {
        const newEventImageUrl = await uploadToS3(
          eventImageFile.buffer,
          eventImageFile.originalname,
          eventImageFile.mimetype,
          "events"
        );
        updateData.eventImage = newEventImageUrl;
        log.info(`New event image uploaded to S3: ${newEventImageUrl}`);
      } catch (uploadError) {
        log.error(`S3 Upload failed: ${uploadError.message}`);
        return sendError(res, "Failed to upload new event image", uploadError);
      }
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const updatedEvent = await eventModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      return sendError(res, "Event not found after update", 404);
    }

    log.info(`Event updated: ${id} by admin: ${adminId}`);
    return sendSuccess(res, "Event updated successfully", updatedEvent);
  } catch (error) {
    log.error(`Error While Updating Event: ${error.message}`);
    return sendError(res, "Error While Updating Event", error);
  }
};

// Delete event by ID
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, "Invalid event ID");
    }

    // Find the event first to get S3 file URL
    const event = await eventModel.findById(id);

    if (!event) {
      return sendError(res, "Event not found");
    }

    // ✅ Remove event ID from admin model before deleting
    if (event.adminId) {
      await adminModel.findByIdAndUpdate(
        event.adminId,
        { $pull: { events: id } },
        { new: true }
      ).catch(err => log.warn("Failed to remove event from admin:", err.message));
    }

    if (event.eventImage) {
      try {
        const key = event.eventImage.split(".amazonaws.com/")[1];
        await deleteFromS3(key);
        log.info(`Event image deleted from S3: ${event.eventImage}`);
      } catch (deleteError) {
        log.warn(`Failed to delete event image from S3: ${deleteError.message}`);
      }
    }


    const deletedEvent = await eventModel.findByIdAndDelete(id);

    log.info(`Event deleted: ${id}`);
    return sendSuccess(res, "Event deleted successfully", deletedEvent);
  } catch (error) {
    log.error(`Error While Deleting Event: ${error.message}`);
    return sendError(res, "Error While Deleting Event", error);
  }
};

// Bulk delete events
export const bulkDeleteEvents = async (req, res) => {
  try {
    const { eventIds } = req.body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return sendError(res, "eventIds array is required", 400);
    }

    // Validate all IDs
    const invalidIds = eventIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return sendError(res, `Invalid event IDs: ${invalidIds.join(", ")}`, 400);
    }

    const result = await eventModel.deleteMany({ _id: { $in: eventIds } });

    if (result.deletedCount === 0) {
      return sendError(res, "No events found to delete", 404);
    }

    log.info(`Bulk deleted ${result.deletedCount} events`);
    return sendSuccess(res, `${result.deletedCount} events deleted successfully`, {
      deletedCount: result.deletedCount
    });
  } catch (error) {
    log.error(`Error While Bulk Deleting Events: ${error.message}`);
    return sendError(res, "Error While Bulk Deleting Events", error);
  }
};

// Get events statistics
export const getEventStats = async (req, res) => {
  try {
    const stats = await eventModel.aggregate([
      {
        $group: {
          _id: "$typesOfEvent",
          count: { $sum: 1 },
          latestEvent: { $max: "$createdAt" }
        }
      },
      {
        $project: {
          eventType: "$_id",
          count: 1,
          latestEvent: 1,
          _id: 0
        }
      }
    ]);

    const totalEvents = await eventModel.countDocuments();
    const eventsWithContact = await eventModel.countDocuments({
      $or: [{ contactNo: { $exists: true, $ne: "" } }, { whatsappNo: { $exists: true, $ne: "" } }]
    });

    const response = {
      totalEvents,
      eventsWithContact,
      eventsByType: stats
    };

    return sendSuccess(res, "Event statistics retrieved successfully", response);
  } catch (error) {
    log.error(`Error While Getting Event Statistics: ${error.message}`);
    return sendError(res, "Error While Getting Event Statistics", error);
  }
};