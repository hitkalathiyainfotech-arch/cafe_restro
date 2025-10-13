import hotelBookingModel from "../model/hotel.booking.model.js";
import hotelModel from "../model/hotel.model.js";

export const createBooking = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const {
      roomId,
      checkInDate,
      checkOutDate,
      adults,
      children = 0,
      infants = 0,
      numberOfRooms = 1,
      specialRequests = "",
      transationId = "",
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
      guestId,
      hotelId,
      roomId,
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
        paymentStatus: "pending",
        paymentMethod: "Razorpay",
        paymentDate: new Date(),
      },
      createdBy: guestId,
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
