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
    const { cafeId } = req.params;
    const {
      bookingDate,
      startTime,     // e.g. "10:00"
      endTime,       // e.g. "14:00"
      numberOfTables = 1,
      numberOfGuests = 1,
      specialRequests = ""
    } = req.body;

    if (!bookingDate || !startTime || !endTime)
      return res.status(400).json({
        success: false,
        message: "Booking date, startTime and endTime are required"
      });

    const cafe = await cafeModel.findById(cafeId);
    if (!cafe)
      return res.status(404).json({ success: false, message: "Cafe not found" });

    // -----------------------------
    // 🕓 Duration Calculation
    // -----------------------------
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const durationHours = (endHour + endMin / 60) - (startHour + startMin / 60);
    if (durationHours <= 0)
      return res.status(400).json({ success: false, message: "Invalid time range" });

    // -----------------------------
    // 💰 Base Pricing
    // -----------------------------
    const baseRatePerHour = cafe.pricing?.averagePrice || 100; // fallback ₹100/hr per table
    const baseSubtotal = baseRatePerHour * durationHours * numberOfTables;

    // -----------------------------
    // 🔥 Dynamic Discounts
    // -----------------------------
    let discountPercentage = 0;

    // 1. More than 3 hours → 10% discount
    if (durationHours >= 3) discountPercentage += 10;

    // 2. More than 2 tables → 5% discount
    if (numberOfTables > 2) discountPercentage += 5;

    // 3. Weekend discount logic (or could be surcharge)
    const dayOfWeek = new Date(bookingDate).getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 4. Evening surcharge
    const isEvening = endHour >= 18;
    const peakHourMultiplier = isEvening ? 1.2 : 1;

    const subtotalBeforeDiscount = baseSubtotal * peakHourMultiplier;
    const discountAmount = (subtotalBeforeDiscount * discountPercentage) / 100;
    const discountedSubtotal = subtotalBeforeDiscount - discountAmount;

    // -----------------------------
    // 🧾 Taxes & Fees
    // -----------------------------
    const serviceChargePercentage = 5;
    const serviceCharge = (discountedSubtotal * serviceChargePercentage) / 100;

    const taxPercentage = 12;
    const taxAmount = (discountedSubtotal * taxPercentage) / 100;

    const reservationFee = 50; // flat booking charge
    const totalAmount = discountedSubtotal + serviceCharge + taxAmount + reservationFee;

    // -----------------------------
    // ✅ Response (matches your UI)
    // -----------------------------
    return res.status(200).json({
      success: true,
      data: {
        cafeDetails: {
          _id: cafe._id,
          name: cafe.name,
          themeCategory: cafe.themeCategory?.name || null,
          address: cafe.location?.address || null,
          image: cafe.images?.[0] || null
        },
        bookingDetails: {
          bookingDate,
          startTime,
          endTime,
          durationHours,
          numberOfTables,
          numberOfGuests,
          specialRequests,
          isWeekend,
          isPeakHour: isEvening
        },
        paymentSummary: {
          title: "Payment Information",
          items: [
            {
              label: `${numberOfTables} Table × ${durationHours} Hours`,
              value: baseSubtotal.toFixed(2),
              prefix: "₹"
            },
            {
              label: "Discount",
              value: discountPercentage > 0 ? `${discountPercentage}%` : "0%",
              type: "discount"
            },
            {
              label: "With Discount",
              value: discountedSubtotal.toFixed(2),
              prefix: "₹"
            },
            {
              label: "Taxes & Services",
              value: (serviceCharge + taxAmount).toFixed(2),
              prefix: "₹"
            },
            {
              label: "Reservation Fee",
              value: reservationFee.toFixed(2),
              prefix: "₹"
            },
            {
              label: "Total Amount to Pay",
              value: totalAmount.toFixed(2),
              prefix: "₹",
              bold: true
            }
          ],
          totalAmount: totalAmount.toFixed(2),
          currency: cafe.pricing?.currency || "INR",
          proceedAction: "Process To Pay"
        }
      }
    });
  } catch (err) {
    console.error("Preview Cafe Booking Error:", err);
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