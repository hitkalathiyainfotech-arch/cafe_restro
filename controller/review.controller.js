import mongoose from "mongoose";
import reviewModel, { BUSINESS_TYPES } from "../model/review.model.js";
import { sendSuccess, sendError } from "../utils/responseUtils.js";

// Helper function to update business reviews and calculate average
const updateBusinessReviews = async (businessType, businessId, userId, rating, comment) => {
  const businessConfig = Object.values(BUSINESS_TYPES).find(config => config.type === businessType);

  if (!businessConfig) {
    throw new Error(`Invalid business type: ${businessType}`);
  }

  // First, get the current business to check if reviews array exists
  const currentBusiness = await businessConfig.model.findById(businessId);

  // Create review object
  const newReview = {
    user: userId,
    rating,
    comment,
    createdAt: new Date(),
  };

  // Initialize reviews array if it doesn't exist
  const updateData = {
    $push: { reviews: newReview }
  };

  // If reviews array doesn't exist, set it instead of pushing
  if (!currentBusiness.reviews) {
    updateData.$set = { reviews: [newReview] };
    delete updateData.$push;
  }

  // Update business with review
  const updatedBusiness = await businessConfig.model.findByIdAndUpdate(
    businessId,
    updateData,
    { new: true }
  );

  // Calculate and update average rating - safely handle undefined reviews
  const reviewsArray = updatedBusiness.reviews || [];
  const allRatings = reviewsArray.map(r => r.rating);

  let averageRating = 0;
  if (allRatings.length > 0) {
    averageRating = allRatings.reduce((sum, val) => sum + val, 0) / allRatings.length;
  }

  updatedBusiness.averageRating = Number(averageRating.toFixed(1));
  await updatedBusiness.save();

  return updatedBusiness;
};

// Helper to update business average rating after review modification
const updateBusinessAverageRating = async (businessType, businessId) => {
  const businessConfig = Object.values(BUSINESS_TYPES).find(config => config.type === businessType);

  const activeReviews = await reviewModel.find({
    businessId,
    businessType,
    isActive: true
  });

  const business = await businessConfig.model.findById(businessId);

  if (activeReviews.length === 0) {
    business.averageRating = 0;
    business.reviews = [];
  } else {
    const averageRating = activeReviews.reduce((sum, review) => sum + review.rating, 0) / activeReviews.length;
    business.averageRating = Number(averageRating.toFixed(1));

    // Update reviews array in business document
    business.reviews = activeReviews.map(review => ({
      user: review.userId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt
    }));
  }

  await business.save();
  return business;
};

export const addReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { businessId } = req.params;
    const { rating, comment, businessType: requestedType } = req.body; // client can send expected type (e.g. "hotel", "cafe")

    // Basic validations
    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return sendError(res, "Invalid business ID.");
    }

    if (!rating || !comment) {
      return sendError(res, "Rating and comment are required.");
    }

    if (rating < 1 || rating > 5) {
      return sendError(res, "Rating must be between 1 and 5.");
    }

    if (!requestedType) {
      return sendError(res, "Business type is required.");
    }

    const validType = BUSINESS_TYPES[requestedType];
    if (!validType) {
      return sendError(res, "Invalid business type provided.");
    }

    // Find business dynamically (and validate type)
    const foundBusiness = await validType.model.findById(businessId);

    if (!foundBusiness) {
      // Business not found in given type — check if exists in another type to catch mismatch
      for (const [key, config] of Object.entries(BUSINESS_TYPES)) {
        if (key !== requestedType) {
          const existsElsewhere = await config.model.findById(businessId);
          if (existsElsewhere) {
            return sendError(
              res,
              `Provided ID belongs to a different business type (${config.type}), not ${requestedType}.`
            );
          }
        }
      }
      return sendError(res, "No matching business found for given ID.");
    }

    // Check duplicate review
    const existingReview = await reviewModel.findOne({
      userId,
      businessId,
      businessType: requestedType,
      isActive: true
    });

    if (existingReview) {
      return sendError(res, "You have already reviewed this business.");
    }

    // Create review
    const review = await reviewModel.create({
      userId,
      businessId,
      businessType: requestedType,
      rating,
      comment,
    });

    // Update business review stats
    const updatedBusiness = await updateBusinessReviews(
      requestedType,
      businessId,
      userId,
      rating,
      comment
    );

    return sendSuccess(res, "Review added successfully", {
      review,
      averageRating: updatedBusiness.averageRating,
      totalReviews: (updatedBusiness.reviews || []).length,
    });
  } catch (error) {
    console.error("Error while adding review:", error);

    if (error.code === 11000) {
      return sendError(res, "You have already reviewed this business.");
    }

    return sendError(res, "Error while adding review");
  }
};


// Get reviews for a business
export const getBusinessReviews = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return sendError(res, "Invalid business ID.");
    }

    const reviews = await reviewModel
      .find({ businessId, isActive: true })
      .populate('user', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await reviewModel.countDocuments({ businessId, isActive: true });

    return sendSuccess(res, "Reviews fetched successfully", {
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalReviews: total,
    });
  } catch (error) {
    console.error("Error while fetching reviews:", error);
    return sendError(res, "Error while fetching reviews");
  }
};

// Update review
export const updateReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return sendError(res, "Rating must be between 1 and 5.");
    }

    const review = await reviewModel.findOne({ _id: reviewId, userId, isActive: true });

    if (!review) {
      return sendError(res, "Review not found or unauthorized.");
    }

    // Update review
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;
    await review.save();

    // Update business average rating
    await updateBusinessAverageRating(review.businessType, review.businessId);

    return sendSuccess(res, "Review updated successfully", { review });
  } catch (error) {
    console.error("Error while updating review:", error);
    return sendError(res, "Error while updating review");
  }
};

// Delete review (soft delete)
export const deleteReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { reviewId } = req.params;

    const review = await reviewModel.findOne({ _id: reviewId, userId, isActive: true });

    if (!review) {
      return sendError(res, "Review not found or unauthorized.");
    }

    // Soft delete
    review.isActive = false;
    await review.save();

    // Update business average rating
    await updateBusinessAverageRating(review.businessType, review.businessId);

    return sendSuccess(res, "Review deleted successfully");
  } catch (error) {
    console.error("Error while deleting review:", error);
    return sendError(res, "Error while deleting review");
  }
};

// Get user's reviews
export const getUserReviews = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await reviewModel
      .find({ userId, isActive: true })
      .populate('businessId', 'name images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await reviewModel.countDocuments({ userId, isActive: true });

    return sendSuccess(res, "User reviews fetched successfully", {
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalReviews: total,
    });
  } catch (error) {
    console.error("Error while fetching user reviews:", error);
    return sendError(res, "Error while fetching user reviews");
  }
};
export const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, businessType, rating } = req.query;

    // Build filter object
    const filter = { isActive: true };

    if (businessType) {
      filter.businessType = businessType;
    }

    if (rating) {
      filter.rating = parseInt(rating);
    }

    // Get reviews with pagination and populate user & business details
    const reviews = await reviewModel
      .find(filter)
      .populate('user', 'name email profilePicture')
      .populate('businessId', 'name images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await reviewModel.countDocuments(filter);

    return sendSuccess(res, "All reviews fetched successfully", {
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalReviews: total,
      filters: {
        businessType: businessType || 'all',
        rating: rating || 'all'
      }
    });

  } catch (error) {
    console.error("Error while fetching all reviews:", error);
    return sendError(res, "Error while fetching all reviews");
  }
};