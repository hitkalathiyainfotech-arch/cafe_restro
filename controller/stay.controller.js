import mongoose from "mongoose";
import { deleteFromS3, uploadToS3 } from "../middleware/uploadS3.js";
import stayModel from "../model/stay.model.js";
import adminModel from "../model/admin.model.js";
import log from "../utils/logger.js";
import { sendError, sendNotFound, sendSuccess } from "../utils/responseUtils.js";

// ==================== ADMIN CONTROLLERS ==================== //

export const createStay = async (req, res) => {
  try {
    const { name, address, city, capacity, pricePerHour, type } = req.body;
    const { _id: adminId } = req.admin;

    if (!name || !address || !city || !capacity || !pricePerHour || !type) {
      return sendError(res, 400, "All required fields must be provided");
    }

    // Check for duplicate stay BEFORE uploading images
    const existingStay = await stayModel.findOne({
      name: name.trim(),
      address: address.trim(),
      city: city.trim()
    });
    if (existingStay) {
      return sendError(res, 400, "A stay with this name, address, and city already exists");
    }

    let imageUrls = [];
    const stayImage = req.files?.["stayImage"]?.[0];

    if (stayImage) {
      const imageUrl = await uploadToS3(
        stayImage.buffer,
        stayImage.originalname,
        stayImage.mimetype,
        "stayImages"
      );
      imageUrls.push(imageUrl);
    }

    const newStay = await stayModel.create({
      name,
      address,
      city,
      capacity,
      pricePerHour,
      type,
      images: imageUrls,
      adminId,
    });

    // ✅ Append stay ID to admin model
    if (newStay.adminId && newStay._id) {
      await adminModel.findByIdAndUpdate(
        newStay.adminId,
        { $addToSet: { stays: newStay._id } },
        { new: true }
      ).catch(err => log.warn("Failed to update admin stays:", err.message));
    }

    return sendSuccess(res, 201, "Stay created successfully", newStay);
  } catch (error) {
    log.error(`Errror on Create : ${error.message}`)
    return sendError(res, 500, "Failed to create stay", error);
  }
};


export const updateStay = async (req, res) => {
  try {
    const { id } = req.params;
    const { _id: adminId } = req.admin;

    const stay = await stayModel.findOne({
      _id: id,
      adminId: new mongoose.Types.ObjectId(adminId),
    });

    if (!stay) {
      return sendNotFound(res, "Stay not found or not authorized");
    }

    const updates = { ...req.body };

    const stayImage = req.files?.["stayImage"]?.[0];
    if (stayImage) {
      // Delete old image from S3 (if exists)
      if (stay.images && stay.images.length > 0) {
        const oldImageUrl = stay.images[0];
        const key = oldImageUrl.split(".amazonaws.com/")[1];
        if (key) await deleteFromS3(key);
      }

      const newImageUrl = await uploadToS3(
        stayImage.buffer,
        stayImage.originalname,
        stayImage.mimetype,
        "stayImages"
      );

      updates.images = [newImageUrl];
    }

    const updatedStay = await stayModel.findByIdAndUpdate(id, updates, {
      new: true,
    });

    return sendSuccess(res, "Stay updated successfully", updatedStay);
  } catch (error) {
    console.error("Update Stay Error:", error.message);
    return sendError(res, "Failed to update stay", error.message);
  }
};



export const deleteStay = async (req, res) => {
  try {
    const { id } = req.params;
    const { _id: adminId } = req.admin;

    const stay = await stayModel.findOne({
      _id: id,
      adminId: new mongoose.Types.ObjectId(adminId),
    });

    if (!stay) {
      return sendNotFound(res, "Stay not found or not authorized");
    }

    // ✅ Remove stay ID from admin model before deleting
    if (stay.adminId) {
      await adminModel.findByIdAndUpdate(
        stay.adminId,
        { $pull: { stays: id } },
        { new: true }
      ).catch(err => log.warn("Failed to remove stay from admin:", err.message));
    }

    // Delete image(s) from S3 if present
    if (stay.images && stay.images.length > 0) {
      for (const imageUrl of stay.images) {
        const key = imageUrl.split(".amazonaws.com/")[1];
        if (key) {
          await deleteFromS3(key);
        }
      }
    }

    await stayModel.findByIdAndDelete(id);
    return sendSuccess(res, 200, "Stay deleted successfully");
  } catch (err) {
    return sendError(res, 500, "Failed to delete stay", err.message);
  }
};

// export const getAdminStays = async (req, res) => {
//   try {
//     const { _id: adminId } = req?.admin;
//     console.log(adminId)
//     const stays = await stayModel.find({ adminId: adminId }).sort({ createdAt: -1 });
//     console.log(stays)
//     return sendSuccess(res, "Stays fetched successfully", stays);
//   } catch (err) {
//     console.error("Get Admin Stays Error:", err);
//     return sendError(res, 500, "Failed to fetch stays");
//   }
// };

// ==================== USER CONTROLLERS ==================== //

export const getAllStays = async (req, res) => {
  try {
    const { city, type } = req.query;
    const filter = { isActive: true };

    if (city) filter.city = { $regex: city, $options: "i" };
    if (type) filter.type = { $regex: type, $options: "i" };

    const stays = await stayModel.find(filter).sort({ createdAt: -1 });

    return sendSuccess(res, "Stays fetched successfully", stays);
  } catch (err) {
    console.error("Get All Stays Error:", err);
    return sendError(res, 500, "Failed to fetch stays");
  }
};

export const getStayById = async (req, res) => {
  try {
    const { id } = req.params;

    const stay = await stayModel.findOne({ _id: id, isActive: true });
    if (!stay) return sendError(res, 404, "Stay not found");

    return sendSuccess(res, "Stay fetched successfully", stay);
  } catch (err) {
    console.error("Get Stay By ID Error:", err);
    return sendError(res, 500, "Failed to fetch stay");
  }
};