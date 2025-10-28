import mongoose from "mongoose";
import reviewModel from "../model/review.model.js";
import hotelModel from "../model/hotel.model.js";
import cafeModel from "../model/cafe.model.js";
import restroModel from "../model/restro.model.js";
import { sendError, sendSuccess } from "../utils/responseUtils.js";

/** ✅ Normalize business type */
const normalizeType = (type) => {
  if (!type) return null;
  const map = {
    hotel: "Hotel",
    cafes: "Cafes",
    cafe: "Cafes",
    restro: "Restro",
    restaurant: "Restro",
  };
  return map[type.toLowerCase()] || null;
};

/** ✅ Select business model dynamically */
const getBusinessModel = (type) => {
  if (type === "Hotel") return hotelModel;
  if (type === "Cafes") return cafeModel;
  if (type === "Restro") return restroModel;
  return null;
};

//
// ------------------------------
// CREATE REVIEW
// ------------------------------
export const addReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { businessId } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(businessId))
      return sendError(res, "Invalid business ID.");

    if (!rating || !comment)
      return sendError(res, "Rating and comment are required.");

    if (rating < 1 || rating > 5)
      return sendError(res, "Rating must be between 1 and 5.");

    const models = [
      { type: "Hotel", model: hotelModel },
      { type: "Cafes", model: cafeModel },
      { type: "Restro", model: restroModel },
    ];

    let businessModel = null;
    let businessType = null;

    for (const { type, model } of models) {
      const found = await model.findById(businessId);
      if (found) {
        businessModel = model;
        businessType = type;
        break;
      }
    }

    if (!businessModel)
      return sendError(res, "No matching business found for given ID.");

    const existing = await reviewModel.findOne({
      userId,
      businessId,
      businessType,
    });
    if (existing)
      return sendError(res, "You already reviewed this business.");

    const review = await reviewModel.create({
      userId,
      businessId,
      businessType,
      rating,
      comment,
    });

    const updated = await businessModel.findByIdAndUpdate(
      businessId,
      {
        $push: {
          reviews: {
            user: userId,
            rating,
            comment,
          },
        },
      },
      { new: true }
    );

    const allRatings = updated.reviews.map((r) => r.rating);
    const average =
      allRatings.reduce((sum, val) => sum + val, 0) / allRatings.length;

    updated.averageRating = Number(average.toFixed(1));
    await updated.save();

    return sendSuccess(res, "Review added successfully", {
      review,
      averageRating: updated.averageRating,
    });
  } catch (error) {
    console.error("Error while adding review:", error);
    return sendError(res, "Error while adding review", [
      { error: error.message },
    ]);
  }
};


//
// ------------------------------
// GET ALL REVIEWS OF CURRENT USER
// ------------------------------
export const getMyAllReviews = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    console.log(userId)
    const reviews = await reviewModel
      .find({ userId })
      .populate("businessId")
      .sort({ createdAt: -1 });

    return sendSuccess(res, "My reviews fetched successfully", reviews);
  } catch (error) {
    console.error("❌ Error while fetching my reviews:", error);
    return sendError(res, "Error while fetching my reviews", [{ error: error.message }]);
  }
};

//
// ------------------------------
// UPDATE REVIEW
// ------------------------------
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const { _id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(reviewId))
      return sendError(res, "Invalid review ID.");

    const review = await reviewModel.findById(reviewId);
    if (!review) return sendError(res, "Review not found.");
    if (review.userId.toString() !== userId.toString())
      return sendError(res, "Unauthorized.");

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    await review.save();

    // Update embedded review inside business model
    const businessModel = getBusinessModel(review.businessType);
    if (businessModel) {
      await businessModel.updateOne(
        { _id: review.businessId, "reviews.user": userId },
        {
          $set: {
            "reviews.$.rating": rating,
            "reviews.$.comment": comment,
          },
        }
      );
    }

    return sendSuccess(res, "Review updated successfully", review);
  } catch (error) {
    console.error("❌ Error while updating review:", error);
    return sendError(res, "Error while updating review", [{ error: error.message }]);
  }
};

//
// ------------------------------
// DELETE REVIEW
// ------------------------------
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { _id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(reviewId))
      return sendError(res, "Invalid review ID.");

    const review = await reviewModel.findById(reviewId);
    if (!review) return sendError(res, "Review not found.");
    if (review.userId.toString() !== userId.toString())
      return sendError(res, "Unauthorized.");

    await reviewModel.findByIdAndDelete(reviewId);

    // Remove embedded review from business
    const businessModel = getBusinessModel(review.businessType);
    if (businessModel) {
      await businessModel.findByIdAndUpdate(review.businessId, {
        $pull: { reviews: { user: userId } },
      });
    }

    return sendSuccess(res, "Review deleted successfully", reviewId);
  } catch (error) {
    console.error("❌ Error while deleting review:", error);
    return sendError(res, "Error while deleting review", [{ error: error.message }]);
  }
};

//
// ------------------------------
// GET ALL REVIEWS FOR SPECIFIC BUSINESS
// ------------------------------
export const getBusinessReviews = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return sendError(res, "Invalid business ID.");
    }

  
    const models = [
      { type: "Hotel", model: hotelModel },
      { type: "Cafes", model: cafeModel },
      { type: "Restro", model: restroModel },
    ];

    let businessType = null;

    for (const { type, model } of models) {
      const found = await model.exists({ _id: businessId });
      if (found) {
        businessType = type;
        break;
      }
    }

    if (!businessType)
      return sendError(res, "No business found with given ID.");

  
    const reviews = await reviewModel
      .find({ businessId, businessType })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return sendSuccess(res, "Business reviews fetched successfully", {
      businessType,
      totalReviews: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("❌ Error while fetching business reviews:", error);
    return sendError(res, "Error while fetching business reviews", [
      { error: error.message },
    ]);
  }
};