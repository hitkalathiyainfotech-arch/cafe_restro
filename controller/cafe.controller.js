import { resizeImage, uploadToS3 } from "../middleware/uploadS3.js";
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
      themeCategory, // now a single object
      amenities,
      services,
      averagePrice,
      currency,
      popular
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({ success: false, message: "Name and address are required" });
    }

    // Parse themeCategory if sent as JSON string
    let parsedThemeCategory = null;
    if (themeCategory) {
      try {
        parsedThemeCategory = typeof themeCategory === "string" ? JSON.parse(themeCategory) : themeCategory;
      } catch {
        return res.status(400).json({ success: false, message: "Invalid themeCategory format" });
      }
    }

    // Parse amenities and services if sent as JSON strings
    const parsedAmenities = amenities ? JSON.parse(amenities) : [];
    const parsedServices = services ? JSON.parse(services) : [];

    // Process uploaded images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const resizedBuffer = await resizeImage(file.buffer, { width: 1024, height: 768, quality: 80 });
        const url = await uploadToS3(resizedBuffer, file.originalname, file.mimetype, "cafes");
        imageUrls.push(url);
      }
    }

    // Create cafe document
    const newCafe = new cafeModel({
      name,
      description,
      location: {
        address,
        city,
        state,
        country,
        coordinates: {
          lat: lat ? parseFloat(lat) : undefined,
          lng: lng ? parseFloat(lng) : undefined
        }
      },
      themeCategory: parsedThemeCategory, // single theme object
      images: imageUrls,
      amenities: parsedAmenities,
      services: parsedServices,
      pricing: {
        averagePrice: averagePrice ? parseFloat(averagePrice) : undefined,
        currency: currency || "USD"
      },
      popular: popular === "true" || popular === true
    });

    await newCafe.save();

    return res.status(201).json({ success: true, data: newCafe });
  } catch (error) {
    console.error("Create Cafe Error:", error);
    return res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

