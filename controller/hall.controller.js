import mongoose from "mongoose";
import { resizeImage, uploadToS3 } from "../middleware/uploadS3.js";
import hallModel from "../model/hall.model.js";
import userModel from "../model/user.model.js";
import { sendBadRequest, sendError, sendNotFound, sendSuccess } from "../utils/responseUtils.js";


// In your controller - CHANGE THIS:
export const createHall = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      location,
      address,
      type,
      category,
      capacity,
      amenities,
      isAvailable = true
    } = req.body;

    const adminId = req.admin._id;

    const isUser = await userModel.findOne({ _id: adminId });
    if (isUser) {
      return sendBadRequest(res, "You'r user OOPS!")
    }

    // Validation
    if (!name?.trim()) return sendBadRequest(res, "Hall name is required");
    if (!price || price <= 0) return sendBadRequest(res, "Valid price is required");

    // ---- File uploads - USE EXACT SAME FIELD NAMES ----
    const featuredFile = req.files?.featured?.[0];
    const galleryFiles = Array.isArray(req.files?.gallery) ? req.files.gallery : [];

    const featuredUrl = featuredFile
      ? await uploadToS3(
        await resizeImage(featuredFile.buffer, { width: 1280, height: 720 }),
        featuredFile.originalname,
        featuredFile.mimetype,
        "halls"
      )
      : null;

    const galleryUrls = await Promise.all(
      galleryFiles.map(async (file) => {
        const buffer = await resizeImage(file.buffer, { width: 1024, height: 768 });
        return await uploadToS3(buffer, file.originalname, file.mimetype, "halls/gallery");
      })
    );

    // ---- Parse JSON fields ----
    const parsed = (v, fallback = []) => (typeof v === "string" ? JSON.parse(v) : v || fallback);

    // ---- Create hall ----
    const hall = new hallModel({
      adminId: adminId,
      name: name.trim(),
      description: description?.trim() || "",
      price: Number(price),
      location: location?.trim() || "",
      address: address?.trim() || "",
      type: type?.trim() || "Banquet Hall",
      category: category?.trim() || "Standard",
      capacity: Number(capacity) || 100,
      amenities: parsed(amenities),
      images: {
        featuredImage: featuredUrl,
        galleryImages: galleryUrls
      },
      isAvailable: isAvailable === "true" || isAvailable === true,
      createdBy: req.admin._id
    });

    await hall.save();

    console.log(`Hall created: ${hall.name}`);
    return sendSuccess(res, "Hall created successfully", hall);
  } catch (error) {
    console.error(`createHall Error: ${error.message}`);
    return sendError(res, 500, "Failed to create hall", error.message);
  }
};

// @desc    Get all halls with filtering and pagination
// @route   GET /api/halls
// @access  Public
export const getAllHalls = async (req, res) => {
  try {
    const {
      location,
      type,
      category,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter
    let filter = { isAvailable: true };

    if (location) filter.location = { $regex: location, $options: 'i' };
    if (type) filter.type = type;
    if (category) filter.category = category;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    const halls = await hallModel.find(filter)
      .populate('adminId', 'name email')
      .limit(limit * 1)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await hallModel.countDocuments(filter);

    res.json({
      success: true,
      count: halls.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: halls
    });

  } catch (error) {
    console.error("Get halls error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch halls",
      error: error.message
    });
  }
};

// @desc    Get single hall by ID
// @route   GET /api/halls/:id
// @access  Public
export const getHallById = async (req, res) => {
  try {
    const hall = await hallModel.findById(req.params.id)
      .populate('adminId');

    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found"
      });
    }

    res.json({
      success: true,
      data: hall
    });

  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: "Hall not found"
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

export const getPopularHalls = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const popularHalls = await hallModel
      .find({
        isAvailable: true,
        rating: { $gte: 4 } // Only halls with rating 4+ 
      })
      .select('name price location type category capacity amenities images rating reviewCount')
      .sort({
        rating: -1,
        reviewCount: -1,
        createdAt: -1
      })
      .limit(parseInt(limit))
      .populate('adminId', 'name email'); // Populate admin info if needed

    // If no high-rated halls, get recently added available halls
    if (popularHalls.length === 0) {
      const recentHalls = await hallModel
        .find({ isAvailable: true })
        .select('name price location type category capacity amenities images rating reviewCount')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('adminId', 'name email');

      return res.status(200).json({
        success: true,
        message: "Recent halls fetched successfully",
        count: recentHalls.length,
        data: recentHalls
      });
    }

    res.status(200).json({
      success: true,
      message: "Popular halls fetched successfully",
      count: popularHalls.length,
      data: popularHalls
    });

  } catch (error) {
    console.error("Get popular halls error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch popular halls",
      error: error.message
    });
  }
};

export const updateHall = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      location,
      address,
      type,
      category,
      capacity,
      amenities,
      isAvailable
    } = req.body;

    const hall = await hallModel.findById(req.params.id);
    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found"
      });
    }

    // Check if admin owns this hall
    if (hall.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this hall"
      });
    }

    // File uploads
    const featuredFile = req.files?.featuredImage?.[0];
    const galleryFiles = req.files?.galleryImages || [];

    // Update featured image if provided
    if (featuredFile) {
      // Delete old featured image
      if (hall.images.featuredImage) {
        await deleteFromS3(hall.images.featuredImage);
      }

      hall.images.featuredImage = await uploadToS3(
        await resizeImage(featuredFile.buffer, { width: 1280, height: 720 }),
        featuredFile.originalname,
        featuredFile.mimetype,
        "halls/featured"
      );
    }

    // Add new gallery images if provided
    if (galleryFiles.length > 0) {
      const newGalleryUrls = await Promise.all(
        galleryFiles.map(async (file) => {
          const buffer = await resizeImage(file.buffer, { width: 1024, height: 768 });
          return await uploadToS3(
            buffer,
            file.originalname,
            file.mimetype,
            "halls/gallery"
          );
        })
      );
      hall.images.galleryImages.push(...newGalleryUrls);
    }

    // Parse JSON fields
    const parseArray = (value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return undefined;
        }
      }
      return value;
    };

    // Update fields
    if (name !== undefined) hall.name = name.trim();
    if (description !== undefined) hall.description = description.trim();
    if (price !== undefined) hall.price = Number(price);
    if (location !== undefined) hall.location = location.trim();
    if (address !== undefined) hall.address = address.trim();
    if (type !== undefined) hall.type = type;
    if (category !== undefined) hall.category = category;
    if (capacity !== undefined) hall.capacity = Number(capacity);
    if (amenities !== undefined) hall.amenities = parseArray(amenities) || hall.amenities;
    if (isAvailable !== undefined) hall.isAvailable = isAvailable === 'true' || isAvailable === true;

    await hall.save();

    res.json({
      success: true,
      message: "Hall updated successfully",
      data: hall
    });

  } catch (error) {
    console.error("Update hall error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update hall",
      error: error.message
    });
  }
};

export const deleteHall = async (req, res) => {
  try {
    const hall = await hallModel.findById(req.params.id);
    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found"
      });
    }

    // Check if admin owns this hall
    if (hall.adminId.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this hall"
      });
    }

    // Delete images from S3
    if (hall.images.featuredImage) {
      await deleteFromS3(hall.images.featuredImage);
    }

    if (hall.images.galleryImages.length > 0) {
      await Promise.all(
        hall.images.galleryImages.map(url => deleteFromS3(url))
      );
    }

    await hallModel.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Hall deleted successfully"
    });

  } catch (error) {
    console.error("Delete hall error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete hall",
      error: error.message
    });
  }
};

export const deleteGalleryImage = async (req, res) => {
  try {
    const { id, imageIndex } = req.params;

    const hall = await hallModel.findById(id);
    if (!hall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found"
      });
    }

    // Check if admin owns this hall
    if (hall.adminId.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this hall"
      });
    }

    const index = parseInt(imageIndex);
    if (index < 0 || index >= hall.images.galleryImages.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid image index"
      });
    }

    // Delete image from S3
    const imageUrl = hall.images.galleryImages[index];
    await deleteFromS3(imageUrl);

    // Remove from array
    hall.images.galleryImages.splice(index, 1);
    await hall.save();

    res.json({
      success: true,
      message: "Gallery image deleted successfully",
      data: hall
    });

  } catch (error) {
    console.error("Delete gallery image error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete gallery image",
      error: error.message
    });
  }
};

export const getPreviewBillingOfHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { numberOfday } = req.query;

    if (!hallId || !mongoose.Types.ObjectId.isValid(hallId)) {
      return sendBadRequest(res, "Something went wrong with hallId");
    }
    
    // Convert numberOfday to number and validate
    const numberOfDays = parseInt(numberOfday);
    if (isNaN(numberOfDays) || numberOfDays <= 0) {
      return sendBadRequest(res, "Query parameter (numberOfday must be a positive number)");
    }

    const hall = await hallModel.findOne({ _id: hallId });

    if (!hall) {
      return sendNotFound(res, "Hall Not Found");
    }

    let perDayHallPrice = hall.price;
    let subTotal = perDayHallPrice * numberOfDays;
    let taxPercentage = 12;
    let serviceFee = 100;
    
    // Calculate tax amount
    let taxAmount = (subTotal * taxPercentage) / 100;
    
    // Calculate total amount
    let totalAmount = subTotal + taxAmount + serviceFee;

    const formattedResponse = {
      hallDetails: {
        hallId: hall._id,
        hallName: hall.name,
        pricePerDay: perDayHallPrice
      },
      billingSummary: {
        numberOfDays: numberOfDays,
        subTotal: subTotal,
        tax: {
          percentage: taxPercentage,
          amount: taxAmount
        },
        serviceFee: serviceFee,
        totalAmount: totalAmount
      },
      breakdown: {
        basePrice: subTotal,
        additionalCharges: [
          {
            name: "Service Fee",
            amount: serviceFee
          },
          {
            name: `Tax (${taxPercentage}%)`,
            amount: taxAmount
          }
        ]
      }
    };

    return res.status(200).json({
      success: true,
      message: "Billing preview generated successfully",
      data: formattedResponse
    });

  } catch (error) {
    console.log("Error While Preview hall Billing", error.message);
    return sendError(res, "Error While Preview hall Billing", error);
  }
};