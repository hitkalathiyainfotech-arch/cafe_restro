import tourModel from "../model/tour.model.js";
import adminModel from "../model/admin.model.js";
import { upload, uploadToS3, resizeImage, deleteFromS3 } from "../middleware/uploadS3.js";
import mongoose from "mongoose";
import { sendBadRequest } from "../utils/responseUtils.js";
import log from "../utils/logger.js";

// Middleware for handling file upload
export const uploadTourImage = upload.single('tourImage');

// Create a new tour with image upload
export const createTour = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const {
      tourName,
      dayNight,
      tourViews,
      ourServiceForTour,
      emiOption,
      pricePerPerson,
      contactNo,
      whatsAppNo,
      bestOffer
    } = req.body;

    // Validation
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
    }

    if (!tourName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tour name is required"
      });
    }

    // Check for duplicate tour BEFORE uploading images
    const existingTour = await tourModel.findOne({ tourName: tourName.trim() });
    if (existingTour) {
      return res.status(400).json({
        success: false,
        message: "A tour with this name already exists"
      });
    }

    let tourImageUrl = null;

    // Handle image upload if file exists
    if (req.file) {
      try {
        // Resize image before uploading to S3
        const resizedImageBuffer = await resizeImage(req.file.buffer, {
          width: 1200,
          height: 800,
          quality: 85
        });

        // Upload to S3
        tourImageUrl = await uploadToS3(
          resizedImageBuffer,
          req.file.originalname,
          req.file.mimetype,
          "tours"
        );
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Error uploading tour image",
          error: uploadError.message
        });
      }
    }

    // Parse array fields if they are strings
    const parsedTourViews = Array.isArray(tourViews)
      ? tourViews
      : (tourViews ? JSON.parse(tourViews) : []);

    const parsedServices = Array.isArray(ourServiceForTour)
      ? ourServiceForTour
      : (ourServiceForTour ? JSON.parse(ourServiceForTour) : []);

    const newTour = new tourModel({
      adminId,
      tourImage: tourImageUrl,
      tourName,
      dayNight,
      tourViews: parsedTourViews,
      ourServiceForTour: parsedServices,
      emiOption,
      pricePerPerson,
      contactNo,
      whatsAppNo,
      bestOffer: bestOffer === 'true' || bestOffer === true
    });

    const savedTour = await newTour.save();

    // ✅ Append tour ID to admin model
    if (savedTour.adminId && savedTour._id) {
      await adminModel.findByIdAndUpdate(
        savedTour.adminId,
        { $addToSet: { tours: savedTour._id } },
        { new: true }
      ).catch(err => log.warn("Failed to update admin tours:", err.message));
    }

    res.status(201).json({
      success: true,
      message: "Tour created successfully",
      data: savedTour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating tour",
      error: error.message
    });
  }
};

// Get all tours with filters
export const getAllTours = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const {
      tourName,
      minPrice,
      maxPrice,
      bestOffer,
      isActive,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build filter object
    const filter = {};

    if (adminId) filter.adminId = adminId;
    if (tourName) {
      filter.tourName = { $regex: tourName, $options: 'i' };
    }
    if (minPrice || maxPrice) {
      filter.pricePerPerson = {};
      if (minPrice) filter.pricePerPerson.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerPerson.$lte = Number(maxPrice);
    }
    if (bestOffer !== undefined) {
      filter.bestOffer = bestOffer === 'true';
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tours = await tourModel
      .find(filter)
      .populate('adminId', 'name email') // Populate admin details if needed
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit));

    const totalTours = await tourModel.countDocuments(filter);
    const totalPages = Math.ceil(totalTours / limit);

    res.status(200).json({
      success: true,
      message: "Tours fetched successfully",
      data: {
        tours,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalTours,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tours",
      error: error.message
    });
  }
};

// Get tour by ID
export const getTourById = async (req, res) => {
  try {
    const { id } = req.params;

    const tour = await tourModel.findById(id).populate('adminId', 'name email');

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Tour fetched successfully",
      data: tour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tour",
      error: error.message
    });
  }
};

// Update tour with optional image update
export const updateTour = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Find existing tour
    const existingTour = await tourModel.findById(id);
    if (!existingTour) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    // Handle image upload if new file is provided
    if (req.file) {
      try {
        // Delete old image from S3 if exists
        if (existingTour.tourImage) {
          const oldImageKey = existingTour.tourImage.split('.amazonaws.com/')[1];
          await deleteFromS3(oldImageKey);
        }

        // Resize and upload new image
        const resizedImageBuffer = await resizeImage(req.file.buffer, {
          width: 1200,
          height: 800,
          quality: 85
        });

        const newImageUrl = await uploadToS3(
          resizedImageBuffer,
          req.file.originalname,
          req.file.mimetype,
          "tours"
        );

        updateData.tourImage = newImageUrl;
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          message: "Error updating tour image",
          error: uploadError.message
        });
      }
    }

    // Parse array fields if they are strings
    if (updateData.tourViews && typeof updateData.tourViews === 'string') {
      updateData.tourViews = JSON.parse(updateData.tourViews);
    }
    if (updateData.ourServiceForTour && typeof updateData.ourServiceForTour === 'string') {
      updateData.ourServiceForTour = JSON.parse(updateData.ourServiceForTour);
    }

    // Convert string boolean to actual boolean
    if (updateData.bestOffer !== undefined) {
      updateData.bestOffer = updateData.bestOffer === 'true' || updateData.bestOffer === true;
    }

    const updatedTour = await tourModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('adminId', 'name email');

    res.status(200).json({
      success: true,
      message: "Tour updated successfully",
      data: updatedTour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating tour",
      error: error.message
    });
  }
};

// Delete tour
export const deleteTour = async (req, res) => {
  try {
    const { id } = req.params;

    const tour = await tourModel.findById(id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    // ✅ Remove tour ID from admin model before deleting
    if (tour.adminId) {
      await adminModel.findByIdAndUpdate(
        tour.adminId,
        { $pull: { tours: id } },
        { new: true }
      ).catch(err => log.warn("Failed to remove tour from admin:", err.message));
    }

    // Delete image from S3 if exists
    if (tour.tourImage) {
      const imageKey = tour.tourImage.split('.amazonaws.com/')[1];
      await deleteFromS3(imageKey);
    }

    await tourModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Tour deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting tour",
      error: error.message
    });
  }
};

// Get best offer tours
export const getBestOfferTours = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const bestOfferTours = await tourModel
      .find({ bestOffer: true, isActive: true })
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Best offer tours fetched successfully",
      data: bestOfferTours
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching best offer tours",
      error: error.message
    });
  }
};

// Update tour image only
export const updateTourImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, "someing went wrong in params Id")
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required"
      });
    }

    const tour = await tourModel.findById(id);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: "Tour not found"
      });
    }

    // Delete old image from S3 if exists
    if (tour.tourImage) {
      const oldImageKey = tour.tourImage.split('.amazonaws.com/')[1];
      await deleteFromS3(oldImageKey);
    }

    // Resize and upload new image
    const resizedImageBuffer = await resizeImage(req.file.buffer, {
      width: 1200,
      height: 800,
      quality: 85
    });

    const newImageUrl = await uploadToS3(
      resizedImageBuffer,
      req.file.originalname,
      req.file.mimetype,
      "tours"
    );

    // Update tour with new image
    const updatedTour = await tourModel.findByIdAndUpdate(
      id,
      { tourImage: newImageUrl },
      { new: true }
    ).populate('adminId', 'name email');

    res.status(200).json({
      success: true,
      message: "Tour image updated successfully",
      data: updatedTour
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating tour image",
      error: error.message
    });
  }
};