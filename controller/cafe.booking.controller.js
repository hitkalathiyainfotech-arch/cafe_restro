import cafeBookingModel from "../model/cafe.booking.model.js";
import cafeModel from "../model/cafe.model.js";
import mongoose from "mongoose";
import { sendBadRequest } from "../utils/responseUtils.js";
import { v4 as uuidv4 } from "uuid";
import log from "../utils/logger.js";

// Create new cafe booking
export const createCafeBooking = async (req, res) => {
  try {
    const { cafeId } = req.params;
    const {
      bookingDate,
      timeSlot,
      numberOfGuests,
      specialRequests,
      perGuestRate,
      guestDetails,
      paymentMethod,
      transactionId,
      paymentStatus,
      paymentDate,
      currency,
    } = req.body;



    const userId = req.user?._id;

    if (!cafeId || !bookingDate || !timeSlot || !numberOfGuests) {
      return res.status(400).json({
        success: false,
        message:
          "Cafe ID, booking date, time slot, and number of guests are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(cafeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cafe ID",
      });
    }

    const cafe = await cafeModel.findOne({ _id: cafeId });
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found",
      });
    }
    const bookingDateTime = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDateTime < today) {
      return res.status(400).json({
        success: false,
        message: "Booking date cannot be in the past",
      });
    }

    const existingBooking = await cafeBookingModel.findOne({
      cafeId,
      bookingDate: bookingDateTime,
      timeSlot,
      bookingStatus: { $in: ["Upcoming", "pending", "confirmed"] },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "This time slot is already booked. Please choose another time.",
      });
    }

    const guestRate = perGuestRate || cafe.pricing?.averagePrice || 200;
    const totalGuestRate = guestRate * numberOfGuests;
    const taxPercentage = 12;
    const taxAmount = (totalGuestRate * taxPercentage) / 100;
    const serviceFee = 50;
    const totalAmount = totalGuestRate + taxAmount + serviceFee;
  
    const guest = {
      isMySelf: guestDetails?.isMySelf ?? true,
      name: guestDetails?.name || "",
      email: guestDetails?.email || "",
      phone: guestDetails?.phone || "",
      address: guestDetails?.address || "",
      state: guestDetails?.state || "",
      country: guestDetails?.country || "",
    };
  
    const payment = {
      transactionId: transactionId || "",
      paymentStatus: paymentStatus || "pending",
      paymentMethod: paymentMethod || "",
      paymentDate: paymentDate ? new Date(paymentDate) : null,
    };

    const newBooking = new cafeBookingModel({
      bookingId: uuidv4(),
      userId,
      adminId: cafe.createdBy,
      cafeId,
      bookingDate: bookingDateTime,
      timeSlot,
      numberOfGuests,
      guest,
      guestInfo: {
        specialRequests: specialRequests || "",
      },
      pricing: {
        perGuestRate: guestRate,
        totalGuestRate,
        taxPercentage,
        taxAmount,
        serviceFee,
        totalAmount,
        currency: currency || cafe.pricing?.currency || "INR",
      },
      payment,
      bookingStatus: "Upcoming",
    });

    await newBooking.save();
    await newBooking.populate("cafeId", "name location images");

    return res.status(201).json({
      success: true,
      message: "Cafe booking created successfully",
      data: newBooking,
    });
  } catch (error) {
    console.error("Create Cafe Booking Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};


// Get all bookings for a user
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { page = 1, limit = 10, status } = req.query;

    // Build filter
    const filter = { userId };
    if (status && ["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      filter.bookingStatus = status;
    }

    const bookings = await cafeBookingModel
      .find(filter)
      .populate('cafeId', 'name location images pricing')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await cafeBookingModel.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        current: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBookings: total
      }
    });

  } catch (error) {
    console.error("Get User Bookings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Get all bookings for a cafe (for cafe owners/admins)
export const getCafeBookings = async (req, res) => {
  try {
    const { cafeId } = req.params;
    const { page = 1, limit = 10, status, date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(cafeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cafe ID"
      });
    }

    // Check if cafe exists
    const cafe = await cafeModel.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found"
      });
    }

    // Build filter
    const filter = { cafeId };
    if (status && ["pending", "confirmed", "cancelled", "completed"].includes(status)) {
      filter.bookingStatus = status;
    }
    if (date) {
      filter.bookingDate = new Date(date);
    }

    const bookings = await cafeBookingModel
      .find(filter)
      .populate('userId', 'name email phone')
      .sort({ bookingDate: 1, timeSlot: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await cafeBookingModel.countDocuments(filter);

    return res.status(200).json({
      success: false,
      data: bookings,
      pagination: {
        current: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBookings: total
      }
    });

  } catch (error) {
    console.error("Get Cafe Bookings Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Get booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID"
      });
    }

    const booking = await cafeBookingModel
      .findById(id)
      .populate('userId', 'name email phone')
      .populate('cafeId', 'name location images contact pricing operatingHours');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error("Get Booking Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

export const previewCafeBooking = async (req, res) => {
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

// Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingStatus } = req.body;
    const { adminId } = req.admin?._id; // From AdminAuth middleware
    // Validate input
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID"
      });
    }

    if (!bookingStatus || !["pending", "confirmed", "cancelled", "completed"].includes(bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: "Valid booking status is required"
      });
    }

    // Find booking
    const booking = await cafeBookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Since we're using AdminAuth middleware, any authenticated admin can update
    // No need to check adminId against booking.adminId unless you want to restrict

    // Update booking
    const previousStatus = booking.bookingStatus;
    booking.bookingStatus = bookingStatus;

    // Handle payment status updates
    if (bookingStatus === 'cancelled') {
      booking.payment.paymentStatus = 'cancelled';
    } else if (bookingStatus === 'confirmed' && previousStatus === 'pending') {
      booking.payment.paymentStatus = 'confirmed';
      booking.payment.paymentDate = new Date();
    }

    await booking.save();

    // Populate for response
    await booking.populate('cafeId', 'name location images themeCategory');
    await booking.populate('userId', 'name email phone');

    return res.status(200).json({
      success: true,
      message: `Booking ${bookingStatus} successfully`,
      data: booking
    });

  } catch (error) {
    console.error("Update Booking Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};


// Update payment status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentStatus,
      transactionId,
      paymentMethod,
      paymentDate
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID"
      });
    }

    if (!paymentStatus || !["pending", "confirmed", "failed", "cancelled"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment status is required"
      });
    }

    const booking = await cafeBookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Update payment details
    booking.payment.paymentStatus = paymentStatus;
    if (transactionId) booking.payment.transactionId = transactionId;
    if (paymentMethod) booking.payment.paymentMethod = paymentMethod;
    if (paymentDate) {
      booking.payment.paymentDate = new Date(paymentDate);
    } else if (paymentStatus === 'confirmed') {
      booking.payment.paymentDate = new Date();
    }

    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      data: booking
    });

  } catch (error) {
    console.error("Update Payment Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID"
      });
    }

    const booking = await cafeBookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Check if user is authorized to cancel this booking
    const userId = req.user?._id;
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin && booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking"
      });
    }

    // Check if booking can be cancelled
    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled"
      });
    }

    if (booking.bookingStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: "Completed bookings cannot be cancelled"
      });
    }

    booking.bookingStatus = 'cancelled';
    booking.payment.paymentStatus = 'cancelled';
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking
    });

  } catch (error) {
    console.error("Cancel Booking Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};

// Get available time slots for a cafe
export const getAvailableTimeSlots = async (req, res) => {
  try {
    const { cafeId, date } = req.query;

    if (!cafeId || !date) {
      return res.status(400).json({
        success: false,
        message: "Cafe ID and date are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(cafeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cafe ID"
      });
    }

    // Validate and parse date - FIXED
    let bookingDate;
    try {
      // Try parsing as ISO string (YYYY-MM-DD)
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        bookingDate = new Date(date);
      }
      // Try parsing as timestamp
      else if (date.match(/^\d+$/)) {
        bookingDate = new Date(parseInt(date));
      }
      // Try parsing as any other date string
      else {
        bookingDate = new Date(date);
      }

      // Check if date is valid
      if (isNaN(bookingDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD format"
        });
      }
    } catch (dateError) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD format"
      });
    }

    // Normalize date to start of day for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedBookingDate = new Date(bookingDate);
    normalizedBookingDate.setHours(0, 0, 0, 0);

    if (normalizedBookingDate < today) {
      return res.status(400).json({
        success: false,
        message: "Date cannot be in the past"
      });
    }

    // Get cafe operating hours
    const cafe = await cafeModel.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Cafe not found"
      });
    }

    // Define available time slots (you can customize this)
    const timeSlots = [
      "09:00-10:00", "10:00-11:00", "11:00-12:00",
      "12:00-13:00", "13:00-14:00", "14:00-15:00",
      "15:00-16:00", "16:00-17:00", "17:00-18:00",
      "18:00-19:00", "19:00-20:00", "20:00-21:00"
    ];

    // Get booked time slots for the date - FIXED date comparison
    const bookedSlots = await cafeBookingModel.find({
      cafeId,
      bookingDate: {
        $gte: normalizedBookingDate,
        $lt: new Date(normalizedBookingDate.getTime() + 24 * 60 * 60 * 1000) // Next day
      },
      bookingStatus: { $in: ["pending", "confirmed"] }
    }).select('timeSlot');

    const bookedTimeSlots = bookedSlots.map(booking => booking.timeSlot);

    // Filter available time slots
    const availableSlots = timeSlots.filter(slot => !bookedTimeSlots.includes(slot));

    return res.status(200).json({
      success: true,
      data: {
        cafe: cafe.name,
        date: normalizedBookingDate.toISOString().split('T')[0],
        availableSlots,
        bookedSlots: bookedTimeSlots,
        totalAvailable: availableSlots.length,
        totalBooked: bookedTimeSlots.length
      }
    });

  } catch (error) {
    console.error("Get Available Time Slots Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message
    });
  }
};