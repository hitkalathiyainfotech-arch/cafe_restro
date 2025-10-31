import hotelBookingModel from "../model/hotel.booking.model.js";
import cafeBookingModel from "../model/cafe.booking.model.js";
import log from "../utils/logger.js";
import { sendBadRequest, sendError, sendNotFound, sendSuccess } from "../utils/responseUtils.js";
import mongoose from "mongoose";
import restaurantBookingModel from "../model/restro.booking.model.js";

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
    const { _id } = req.user;
    const { businessType } = req.query;
    log.info(_id)
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return sendBadRequest(res, "Invalid user ID in request");
    }

    const normalizedType = businessType?.toLowerCase();
    if (!["hotel", "cafe", "restro"].includes(normalizedType)) {
      return sendBadRequest(res, "Invalid or missing businessType (hotel, cafe, restro required)");
    }

    let model;
    if (normalizedType === "hotel") model = hotelBookingModel;
    if (normalizedType === "cafe") model = cafeBookingModel;
    if (normalizedType === "restro") model = restaurantBookingModel;

    const bookings = await model.find({
      userId: _id,
      "payment.paymentStatus": "refunded"
    });

    if (!bookings || bookings.length === 0) {
      return sendNotFound(
        res,
        `No refunded bookings found for ${normalizedType.toUpperCase()}`
      );
    }

    return sendSuccess(
      res,
      `My ${normalizedType.toUpperCase()} refunded bookings fetched successfully`,
      bookings
    );

  } catch (error) {
    console.error("Error while getting refunded bookings:", error);
    return sendError(res, "Error while getting refunded bookings", error);
  }
};
