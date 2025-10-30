import hotelBookingModel from "../model/hotel.booking.model.js";
import log from "../utils/logger.js";
import { sendError, sendSuccess } from "../utils/responseUtils.js";
import mongoose from "mongoose";

export const getMyAllBookings = async (req, res) => {
  try {
    const { _id: userId } = req.user;

    const bookings = await hotelBookingModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          bookingType: { $literal: "Hotel" },
          bookingId: "$_id",
          createdAt: 1
        }
      },
      {
        $unionWith: {
          coll: "restaurantbookings",
          pipeline: [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
              $project: {
                bookingType: { $literal: "Restaurant" },
                bookingId: "$_id",
                createdAt: 1
              }
            }
          ]
        }
      },
      {
        $unionWith: {
          coll: "cafebookings",
          pipeline: [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
              $project: {
                bookingType: { $literal: "Cafe" },
                bookingId: "$_id",
                createdAt: 1
              }
            }
          ]
        }
      },
      {
        $unionWith: {
          coll: "hallbookings",
          pipeline: [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
              $project: {
                bookingType: { $literal: "Hall" },
                bookingId: "$_id",
                createdAt: 1
              }
            }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          hotel: [
            { $match: { bookingType: "Hotel" } },
            {
              $lookup: {
                from: "hotelbookings",
                localField: "bookingId",
                foreignField: "_id",
                as: "bookingDetails"
              }
            }
          ],
          restaurant: [
            { $match: { bookingType: "Restaurant" } },
            {
              $lookup: {
                from: "restaurantbookings",
                localField: "bookingId",
                foreignField: "_id",
                as: "bookingDetails"
              }
            }
          ],
          cafe: [
            { $match: { bookingType: "Cafe" } },
            {
              $lookup: {
                from: "cafebookings",
                localField: "bookingId",
                foreignField: "_id",
                as: "bookingDetails"
              }
            }
          ],
          hall: [
            { $match: { bookingType: "Hall" } },
            {
              $lookup: {
                from: "hallbookings",
                localField: "bookingId",
                foreignField: "_id",
                as: "bookingDetails"
              }
            }
          ]
        }
      },
      {
        $project: {
          all: { $concatArrays: ["$hotel", "$restaurant", "$cafe", "$hall"] }
        }
      },
      { $unwind: "$all" },
      { $replaceRoot: { newRoot: "$all" } }
    ]);

    return sendSuccess(res, bookings, "All bookings fetched successfully with details");
  } catch (error) {
    log.error(`Error fetching bookings: ${error.message}`);
    return sendError(res, error, `Error fetching bookings: ${error.message}`);
  }
};

export const getMyRefundBooking = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const refundedRegex = { $regex: /^refunded$/i }; // ✅ case-insensitive

    const bookings = await hotelBookingModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          paymentStatus: refundedRegex
        }
      },
      {
        $project: {
          bookingType: { $literal: "Hotel" },
          bookingId: "$_id",
          createdAt: 1,
          paymentStatus: 1,
          amount: 1
        }
      },
      {
        $unionWith: {
          coll: "restaurantbookings",
          pipeline: [
            {
              $match: {
                userId: userObjectId,
                paymentStatus: refundedRegex
              }
            },
            {
              $project: {
                bookingType: { $literal: "Restaurant" },
                bookingId: "$_id",
                createdAt: 1,
                paymentStatus: 1,
                amount: 1
              }
            }
          ]
        }
      },
      {
        $unionWith: {
          coll: "cafebookings",
          pipeline: [
            {
              $match: {
                userId: userObjectId,
                paymentStatus: refundedRegex
              }
            },
            {
              $project: {
                bookingType: { $literal: "Cafe" },
                bookingId: "$_id",
                createdAt: 1,
                paymentStatus: 1,
                amount: 1
              }
            }
          ]
        }
      },
      {
        $unionWith: {
          coll: "hallbookings",
          pipeline: [
            {
              $match: {
                userId: userObjectId,
                paymentStatus: refundedRegex
              }
            },
            {
              $project: {
                bookingType: { $literal: "Hall" },
                bookingId: "$_id",
                createdAt: 1,
                paymentStatus: 1,
                amount: 1
              }
            }
          ]
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return sendSuccess(res, bookings, "Refund bookings fetched successfully");
  } catch (error) {
    log.error(`Error fetching refund bookings: ${error.message}`);
    return sendError(res, error, "Error fetching refund bookings");
  }

}