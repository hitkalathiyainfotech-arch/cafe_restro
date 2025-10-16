import mongoose from "mongoose";
import { deleteFromS3, resizeImage, uploadToS3 } from "../middleware/uploadS3.js";
import cafeModel from "../model/cafe.model.js";


export const createNewCafe = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      lat,
      lng,
      themeCategoryName,
      amenities,
      services,
      averagePrice,
      currency,
      popular,
      operatingHours,
      contact,
    } = req.body;

    if (!name?.trim() || !address?.trim() || !city?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, address, and city are required",
      });
    }

    if (!themeCategoryName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Theme category name is required",
      });
    }


    const parsedAmenities =
      typeof amenities === "string" ? JSON.parse(amenities) : amenities || [];

    const parsedServices =
      typeof services === "string" ? JSON.parse(services) : services || [];

    const parsedOperatingHours =
      typeof operatingHours === "string"
        ? JSON.parse(operatingHours)
        : operatingHours || {};

    const parsedContact =
      typeof contact === "string" ? JSON.parse(contact) : contact || {};

    let latNum, lngNum;
    if (lat && lng) {
      latNum = parseFloat(lat);
      lngNum = parseFloat(lng);
      if (
        isNaN(latNum) ||
        isNaN(lngNum) ||
        latNum < -90 ||
        latNum > 90 ||
        lngNum < -180 ||
        lngNum > 180
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid coordinates provided",
        });
      }
    }

    let themeCategoryImageUrl = null;
    let imageUrls = [];

    if (req.files && req.files.length > 0) {
      // Separate theme category and main cafe images
      const themeImageFiles = req.files.filter(
        (file) => file.fieldname === "themeCategoryImage"
      );
      const cafeImageFiles = req.files.filter(
        (file) => file.fieldname === "images"
      );

      if (themeImageFiles.length > 0) {
        const themeImageFile = themeImageFiles[0];
        const allowedMimeTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];

        if (!allowedMimeTypes.includes(themeImageFile.mimetype)) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid theme category image type. Only JPEG, PNG, and WebP allowed.",
          });
        }

        try {
          const resizedBuffer = await resizeImage(themeImageFile.buffer, {
            width: 800,
            height: 600,
            quality: 80,
          });

          themeCategoryImageUrl = await uploadToS3(
            resizedBuffer,
            themeImageFile.originalname,
            themeImageFile.mimetype,
            "cafes/themes"
          );
        } catch (err) {
          console.error("Theme category image processing error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to process theme category image",
          });
        }
      }

      if (cafeImageFiles.length > 0) {
        if (cafeImageFiles.length > 10) {
          return res.status(400).json({
            success: false,
            message: "Maximum 10 images allowed for a cafe",
          });
        }

        for (const file of cafeImageFiles) {
          const allowedMimeTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
          ];

          if (!allowedMimeTypes.includes(file.mimetype)) {
            return res.status(400).json({
              success: false,
              message: `Invalid file type for ${file.originalname}.`,
            });
          }

          try {
            const resizedBuffer = await resizeImage(file.buffer, {
              width: 1024,
              height: 768,
              quality: 80,
            });

            const imageUrl = await uploadToS3(
              resizedBuffer,
              file.originalname,
              file.mimetype,
              "cafes"
            );
            imageUrls.push(imageUrl);
          } catch (err) {
            console.error("Cafe image processing error:", err);
            return res.status(500).json({
              success: false,
              message: `Failed to process image: ${file.originalname}`,
            });
          }
        }
      }
    }

    const themeCategory = {
      name: themeCategoryName.trim(),
      image: themeCategoryImageUrl,
    };


    const newCafe = new cafeModel({
      name: name.trim(),
      description: description?.trim() || "",
      location: {
        address: address.trim(),
        city: city.trim(),
        state: state?.trim() || "",
        country: country?.trim() || "India",
        coordinates: {
          lat: latNum || undefined,
          lng: lngNum || undefined,
        },
      },
      themeCategory,
      images: imageUrls,
      amenities: parsedAmenities,
      services: parsedServices,
      operatingHours: parsedOperatingHours,
      contact: {
        phone: parsedContact?.phone || "",
        email: parsedContact?.email || "",
        website: parsedContact?.website || "",
        instagram: parsedContact?.instagram || "",
        facebook: parsedContact?.facebook || "",
        whatsapp: parsedContact?.whatsapp || "",
        mapLink: parsedContact?.mapLink || "",
      },
      pricing: {
        averagePrice: averagePrice ? parseFloat(averagePrice) : 0,
        currency: currency || "INR",
      },
      popular: popular === "true" || popular === true,
      createdBy: req.admin?._id,
    });

    await newCafe.save();

    return res.status(201).json({
      success: true,
      message: "Cafe created successfully",
      data: newCafe,
    });
  } catch (error) {
    console.error("Create Cafe Error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A cafe with this name or address already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


export const getAllCafes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      city,
      country,
      popular,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    const filter = { status: "active" };

    if (city) filter["location.city"] = new RegExp(city, "i");
    if (country) filter["location.country"] = new RegExp(country, "i");
    if (popular === "true") filter.popular = true;
    if (search) filter.$text = { $search: search };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const cafes = await cafeModel
      .find(filter)
      .sort(sortOptions)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .select("-__v")
      .populate("createdBy", "name email");

    const total = await cafeModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: cafes,
      pagination: {
        current: pageNumber,
        totalPages: Math.ceil(total / pageSize),
        totalCafes: total,
        hasNext: pageNumber * pageSize < total,
        hasPrev: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Get Cafes Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// Get cafe by ID
export const getCafeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cafe ID"
      });
    }

    const cafe = await cafeModel
      .findById(id)
      .select('-__v')
      .populate('createdBy', 'name email');

    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found"
      });
    }

    // Check if cafe is open now
    const isOpen = cafe.isOpenNow();

    return res.status(200).json({
      success: true,
      data: {
        ...cafe.toObject(),
        isOpen
      }
    });

  } catch (error) {
    console.error("Get Cafe Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Update cafe
export const updateCafe = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cafe ID"
      });
    }

    const existingCafe = await cafeModel.findOne({ _id: id });

    console.log(JSON.stringify(existingCafe, null, 2));
    if (!existingCafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found"
      });
    }

    // Process theme category image if provided
    if (req.files && req.files.themeCategoryImage) {
      const themeImageFile = req.files.themeCategoryImage[0];
      try {
        const resizedBuffer = await resizeImage(themeImageFile.buffer, {
          width: 800,
          height: 600,
          quality: 80
        });
        const themeCategoryImageUrl = await uploadToS3(
          resizedBuffer,
          `cafes/${Date.now()}-${themeImageFile.originalname}`,
          themeImageFile.mimetype,
          "cafes"
        );

        // Update theme category
        updateData.themeCategory = {
          name: updateData.themeCategoryName || existingCafe.themeCategory.name,
          image: themeCategoryImageUrl
        };
      } catch (error) {
        console.error("Theme category image processing error:", error.message);
        return res.status(500).json({
          success: false,
          message: "Failed to process theme category image",
          error: error.message
        });
      }
    }

    // Process new cafe images if any
    if (req.files && req.files.images) {
      const newImageUrls = [];
      for (const file of req.files.images) {
        const resizedBuffer = await resizeImage(file.buffer, {
          width: 1024,
          height: 768,
          quality: 80
        });
        const url = await uploadToS3(
          resizedBuffer,
          `cafes/${Date.now()}-${file.originalname}`,
          file.mimetype,
          "cafes"
        );
        newImageUrls.push(url);
      }

      // Combine existing images with new ones
      updateData.images = [...existingCafe.images, ...newImageUrls];
    }

    // Parse JSON fields if they are strings
    if (updateData.amenities && typeof updateData.amenities === 'string') {
      updateData.amenities = JSON.parse(updateData.amenities);
    }
    if (updateData.services && typeof updateData.services === 'string') {
      updateData.services = JSON.parse(updateData.services);
    }
    if (updateData.operatingHours && typeof updateData.operatingHours === 'string') {
      updateData.operatingHours = JSON.parse(updateData.operatingHours);
    }
    if (updateData.contact && typeof updateData.contact === 'string') {
      updateData.contact = JSON.parse(updateData.contact);
    }

    const updatedCafe = await cafeModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-__v');

    return res.status(200).json({
      success: true,
      message: "Cafe updated successfully",
      data: updatedCafe
    });

  } catch (error) {
    console.error("Update Cafe Error:", error.message);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Delete cafe
export const deleteCafe = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cafe ID",
      });
    }

    const cafe = await cafeModel.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }

    const imagesToDelete = [];

    if (cafe.themeCategory?.image) {
      const key = cafe.themeCategory.image.split(".amazonaws.com/")[1];
      if (key) imagesToDelete.push(key);
    }

    if (Array.isArray(cafe.images) && cafe.images.length > 0) {
      cafe.images.forEach((imgUrl) => {
        const key = imgUrl.split(".amazonaws.com/")[1];
        if (key) imagesToDelete.push(key);
      });
    }

    if (imagesToDelete.length > 0) {
      await Promise.allSettled(imagesToDelete.map((key) => deleteFromS3(key)));
    }

    await cafeModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Cafe deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// Get cafes by location
export const getCafesByLocation = async (req, res) => {
  try {
    const { city, country } = req.query;

    if (!city || !country) {
      return res.status(400).json({
        success: false,
        message: "City and country are required"
      });
    }

    const cafes = await cafeModel.findByLocation(city, country);

    return res.status(200).json({
      success: true,
      data: cafes,
      count: cafes.length
    });

  } catch (error) {
    console.error("Get Cafes by Location Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Get popular cafes
export const getPopularCafes = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const cafes = await cafeModel.findPopular(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: cafes,
      count: cafes.length
    });

  } catch (error) {
    console.error("Get Popular Cafes Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Search cafes
export const searchCafes = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const cafes = await cafeModel
      .find(
        {
          $text: { $search: q },
          status: 'active'
        },
        { score: { $meta: "textScore" } }
      )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await cafeModel.countDocuments({
      $text: { $search: q },
      status: 'active'
    });

    return res.status(200).json({
      success: true,
      data: cafes,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalCafes: total
      }
    });

  } catch (error) {
    console.error("Search Cafes Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

export const cafeThemes = async (req, res) => {
  try {
    const themes = await cafeModel.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$themeCategory.name",
          image: { $first: "$themeCategory.image" },
        },
      },
      { $project: { _id: 0, name: "$_id", image: 1 } },
      { $sort: { name: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: themes,
    });
  } catch (error) {
    console.error("Cafe Themes Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export const getCafesByTheme = async (req, res) => {
  try {
    const { theme } = req.query;

    if (!theme) {
      return res.status(400).json({
        success: false,
        message: "Theme name is required",
      });
    }

    const cafes = await cafeModel.find({
      "themeCategory.name": theme,
      status: "active",
    })
      .select("-__v")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      data: cafes,
      total: cafes.length,
    });
  } catch (error) {
    console.error("Get Cafes By Theme Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};




// Add cafe images
export const addCafeImages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images provided"
      });
    }

    const cafe = await cafeModel.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found"
      });
    }

    // Check total images limit
    if (cafe.images.length + req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 images allowed per cafe"
      });
    }

    const newImageUrls = [];
    for (const file of req.files) {
      const resizedBuffer = await resizeImage(file.buffer, {
        width: 1024,
        height: 768,
        quality: 80
      });
      const url = await uploadToS3(
        resizedBuffer,
        `cafes/${Date.now()}-${file.originalname}`,
        file.mimetype,
        "cafes"
      );
      newImageUrls.push(url);
    }

    // Add new images to cafe
    cafe.images.push(...newImageUrls);
    await cafe.save();

    return res.status(200).json({
      success: true,
      message: "Images added successfully",
      data: {
        newImages: newImageUrls,
        totalImages: cafe.images.length
      }
    });

  } catch (error) {
    console.error("Add Cafe Images Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Remove cafe image
export const removeCafeImage = async (req, res) => {
  try {
    const { id, imageUrl } = req.params;

    const cafe = await cafeModel.findById(id);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found"
      });
    }

    // Remove image from array
    cafe.images = cafe.images.filter(img => img !== imageUrl);
    await cafe.save();
    // Optionally, delete image from S3
    const key = imageUrl.split(".amazonaws.com/")[1];
    await deleteFromS3(key);

    return res.status(200).json({
      success: true,
      message: "Image removed successfully",
      data: {
        remainingImages: cafe.images.length
      }
    });

  } catch (error) {
    console.error("Remove Cafe Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};