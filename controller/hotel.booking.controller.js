import log from "../utils/logger.js";
import hotelBookingModel from "../model/hotel.booking.model.js";
import hotelModel from "../model/hotel.model.js";
import { sendError, sendSuccess } from "../utils/responseUtils.js";

export const createBooking = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      roomId,
      checkInDate,
      checkOutDate,
      adults,
      isMySelf,
      name,
      email,
      phone,
      address,
      state,
      country,
      children = 0,
      infants = 0,
      numberOfRooms = 1,
      specialRequests = "",
      transationId = "",
      paymentStatus
    } = req.body;

    const guestId = req.user?._id; // from auth middleware

    // Validate hotel
    const hotel = await hotelModel.findById(hotelId);
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });

    // Validate room
    const room = hotel.rooms.id(roomId);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    // Calculate number of nights
    const numberOfNights =
      Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)) || 1;

    // Pricing calculation
    const roomRatePerNight = room.pricePerNight;
    const totalRoomRate = roomRatePerNight * numberOfNights * numberOfRooms;
    const discountPercentage = 0; // optional, can be added
    const discountAmount = (totalRoomRate * discountPercentage) / 100;
    const subtotal = totalRoomRate - discountAmount;
    const taxPercentage = 12;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const serviceFee = 100;
    const platformFee = 50;
    const totalAmount = subtotal + taxAmount + serviceFee + platformFee;

    // Create booking document
    const booking = new hotelBookingModel({
      guest: {
        isMySelf,
        name: isMySelf ? req.user?.name : name,
        email: isMySelf ? req.user?.email : email,
        phone: isMySelf ? req.user?.phone : phone,
        address: isMySelf ? req.user?.address : address,
        state: isMySelf ? req.user?.state : state,
        country: isMySelf ? req.user?.country : country,
      },
      hotelId,
      roomId,
      adminId: hotel.adminId,
      bookingDates: {
        checkInDate,
        checkOutDate,
        numberOfNights,
      },
      guestInfo: {
        adults,
        children,
        infants,
        specialRequests,
      },
      pricing: {
        roomRatePerNight,
        totalRoomRate,
        discountPercentage,
        discountAmount,
        taxPercentage,
        taxAmount,
        serviceFee,
        platformFee,
        totalAmount,
        currency: "INR",
      },
      numberOfRooms,
      payment: {
        transactionId: transationId,
        paymentStatus: paymentStatus || "Upcoming",
        paymentMethod: "Razorpay",
        paymentDate: new Date(),
      },
      userId: guestId,
    });

    await booking.save();

    return res.status(201).json({
      success: true,
      booking,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const previewBooking = async (req, res) => {
  try {
    const { hotelId } = req.params; // from URL
    const { roomId, checkInDate, checkOutDate, numberOfRooms = 1 } = req.body;

    // Validate hotel
    const hotel = await hotelModel.findById(hotelId);
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });

    // Validate room
    const room = hotel.rooms.id(roomId);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    // Calculate number of nights
    const numberOfNights =
      Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)) || 1;

    // Pricing calculation
    const roomRatePerNight = room.pricePerNight;
    const totalRoomRate = roomRatePerNight * numberOfNights * numberOfRooms;
    const discountPercentage = 0; // can be dynamic
    const discountAmount = (totalRoomRate * discountPercentage) / 100;
    const subtotal = totalRoomRate - discountAmount;
    const taxPercentage = 12;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const serviceFee = 100;
    const platformFee = 50;
    const totalAmount = subtotal + taxAmount + serviceFee + platformFee;

    return res.status(200).json({
      success: true,
      result: {
        numberOfRooms,
        numberOfNights,
        roomRatePerNight,
        totalRoomRate,
        discountPercentage,
        discountAmount,
        taxPercentage,
        taxAmount,
        serviceFee,
        platformFee,
        totalAmount,
        currency: "INR",
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyHotelBookings = async (req, res) => {
  try {
    const guestId = req.user?._id;

    const bookings = await hotelBookingModel
      .find({ guestId })
      .populate("hotelId", "name address location")
      .populate("roomId")
      .populate("guestId")
      .sort({ createdAt: -1 });

    return sendSuccess(res, `Booking fetching successfull`, bookings);

  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to fetch bookings", error);
  }
}

export const hotelAdminBookings = async (req, res) => {
  try {
    const adminId = req.admin?._id;

    


  } catch (error) {
    log.error(error.message);
    return sendSuccess(res, 500, "Failed to fetch bookings", error);
  }
}

export const updateHotelBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { bookingId } = req.params;

    const validStatuses = ["Upcoming", "Completed", "Cancelled", "refunded"];

    if (!validStatuses.includes(status)) {
      return sendError(res, 400, "Invalid status value");
    }


    const booking = await hotelBookingModel.findOneAndUpdate(
      { _id: bookingId },
      { "payment.paymentStatus": status },
      { new: true }
    );
    if (!booking) {
      return sendError(res, 404, "Booking not found");
    }
    return sendSuccess(res, "Booking status updated successfully", booking);

  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to update booking status", error);
  }
}