import express from 'express';
import { ForgotOtpSend, ResetPassword, VerifyOtp, changeUserPassword, deleteUser, getAllUsers, getUserById, getUserProfile, googleLogin, newUserRegister, updateUser, userLogin, userLogout } from '../controller/user.controller.js';
import { UserAuth } from '../middleware/UserAuth.js';
import { adminLogin, adminUpdate, deleteAdmin, getAdminById, getAllAdmins, newAdminRegister } from '../controller/admin.controller.js';
import { AdminAuth } from '../middleware/AdminAuth.js';
import { createNewHotel, deleteHotels, getAllHotels, getHotelById } from '../controller/hotel.controller.js';
import { handleMulterErrors, processAndUploadImages, uploadFiles } from '../middleware/multer.middleware.js';
import { createBooking, getMyHotelBookings, hotelAdminBookings, previewHotelBooking, updateHotelBookingStatus, } from '../controller/hotel.booking.controller.js';
import { deleteFromS3, listAllS3Images, upload } from '../middleware/uploadS3.js';
import log from '../utils/logger.js'
import { addToWatchlist, getMyWatchlist, removeWatchlistItem } from '../controller/watchlist.controller.js';
import { addCafeImages, cafeThemes, createNewCafe, deleteCafe, getAllCafes, getCafeById, getCafesByLocation, getCafesByTheme, getPopularCafes, removeCafeImage, searchCafes, updateCafe } from '../controller/cafe.controller.js';
import { cancelBooking, createCafeBooking, getAvailableTimeSlots, getBookingById, getCafeBookings, getUserBookings, previewCafeBooking, updateBookingStatus, updatePaymentStatus } from '../controller/cafe.booking.controller.js';
import { createNewRestaurant, deleteRestaurant, filterRestaurants, getAllRestos, getAvailableRestoTimeSlots, getAvailableTables, getSingleRestro, resetAllTables, restroChangeStatus, searchRestaurants, updateRestaurant } from '../controller/restro.controller.js';
import { sendBadRequest, sendError, sendSuccess } from '../utils/responseUtils.js';
import { bestPlaceByCity, bestPlaceByCityBasic, getAllCountries, getCityByCountry, getHotelByCity, getPlaceDeatil } from '../controller/activity.controller.js';
import { addReview, deleteReview, getAllReviews, getBusinessReviews, getUserReviews, updateReview } from '../controller/review.controller.js';
import { cancelMyRestroBooking, checkInGuest, checkOutGuest, createRestaurantBooking, getBookingStatistics, getRestaurantBookingById, getRestaurantBookings, getUserRestaurantBookings, updateRestaurantBookingStatus, updateRestaurantPaymentStatus } from '../controller/restro.booking.controller.js';
import { createHall, deleteGalleryImage, deleteHall, getAllHalls, getHallById, getPopularHalls, getPreviewBillingOfHall, updateHall } from '../controller/hall.controller.js';
import { cancelHallBooking, createHallBooking, getHallBookingById, getUserHallBookings } from '../controller/hall.booking.controller.js';
import { addNewEvent, bulkDeleteEvents, deleteEvent, getAllEvents, getEventById, getEventStats, updateEvent } from '../controller/event.controller.js';
import { createTour, deleteTour, getAllTours, getBestOfferTours, getTourById, updateTour, updateTourImage, uploadTourImage } from '../controller/tour.controller.js';
import { createCoupan, deleteCoupan, getAllCoupans, getCoupanById, toggleCoupanStatus, updateCoupan } from '../controller/coupan.controller.js';
import { getMyAllBookings, getMyRefundBooking } from '../controller/payments.controller.js';
import { downloadBookingInvoice } from '../controller/invoice.controller.js';
// import { addReview, getMyAllReviews } from '../controller/review.controller.js';

const indexRouter = express.Router();

//auth section
indexRouter.post("/userRegister", newUserRegister);
indexRouter.post("/userLogin", userLogin);
indexRouter.post("/googleLogin", googleLogin);
indexRouter.post("/forgotOtp", ForgotOtpSend);
indexRouter.post("/verifyOtp", VerifyOtp);
indexRouter.post("/resetPassword", ResetPassword);
// --------------------------------------------------------
indexRouter.get("/getAllUsers", getAllUsers);
indexRouter.get("/getUserById/:id", getUserById);
indexRouter.put("/updateUser/:id", updateUser);
indexRouter.delete("/deleteUser/:id", deleteUser);

indexRouter.post("/changeUserPassword", UserAuth, changeUserPassword)
indexRouter.post("/logout", UserAuth, userLogout)
//profile section
indexRouter.get("/userProfile", UserAuth, getUserProfile)

//admin routes section
indexRouter.post("/newAdminRegister", newAdminRegister);
indexRouter.post("/adminLogin", adminLogin);
indexRouter.get("/allAdmin", AdminAuth, getAllAdmins);
indexRouter.get("/getAdminById/:adminId", getAdminById);
indexRouter.patch("/adminUpdate/:adminId", adminUpdate);
indexRouter.delete("/deleteAdmin/:adminId", deleteAdmin);

//hotel section
indexRouter.post("/createNewHotel", AdminAuth, uploadFiles, processAndUploadImages, handleMulterErrors, createNewHotel);
indexRouter.get("/getAllHotels", AdminAuth, getAllHotels);
indexRouter.get("/getHotelById/:hotelId", getHotelById);
// indexRouter.patch("/updateHotel",AdminAuth, updateHotel);
indexRouter.delete("/deleteHotel/:hotelId", AdminAuth, deleteHotels);

//hotel. booking section
indexRouter.post("/hotel/createBooking/:hotelId", UserAuth, createBooking);
indexRouter.post("/hotel/previewBooking/:hotelId", UserAuth, previewHotelBooking);
indexRouter.get("/hotel/MyBookings", UserAuth, getMyHotelBookings);
indexRouter.get("/HotelAdminBookings", AdminAuth, hotelAdminBookings);
indexRouter.patch("/hotel/statusUpdate/:bookingId", AdminAuth, updateHotelBookingStatus);

//watchlist
indexRouter.post("/addToWatchlist", UserAuth, addToWatchlist);
indexRouter.get("/getWatchlist", UserAuth, getMyWatchlist);
indexRouter.delete("/removeFromWatchlist", UserAuth, removeWatchlistItem);

//cafe theme & Category;
indexRouter.get("/cafeThemes", cafeThemes);
indexRouter.get("/getCafesByTheme", getCafesByTheme);

//cafe booking & list section
indexRouter.get("/getAllCafes", getAllCafes);
indexRouter.get("/search", searchCafes);
indexRouter.get("/location", getCafesByLocation);
indexRouter.get("/popular", getPopularCafes);
indexRouter.get("/getCafeById/:id", getCafeById);

// Protected routes (require authentication)
indexRouter.post("/createCafe", AdminAuth, upload.any(), createNewCafe);
indexRouter.put("/updateCafe/:id", AdminAuth, upload.any(), updateCafe);
indexRouter.delete("/deleteCafe/:id", AdminAuth, deleteCafe);
indexRouter.post("/addCafeImage/:id/images", AdminAuth, upload.array('images', 10), addCafeImages);
indexRouter.delete("/removeCafeImage/:id/images/:imageUrl", AdminAuth, removeCafeImage);


indexRouter.get("/available-slots", getAvailableTimeSlots);

// User routes (require authentication)
indexRouter.post("/createCafeBooking/:cafeId", UserAuth, createCafeBooking);
indexRouter.get("/my-cafe-bookings", UserAuth, getUserBookings);
indexRouter.get("/getBookingById/:id", UserAuth, getBookingById);
indexRouter.put("/:id/cancel", UserAuth, cancelBooking);
// In your routes file
indexRouter.post("/:cafeId/preview-booking", previewCafeBooking);
// Admin routes
indexRouter.get("/cafe/:cafeId", AdminAuth, getCafeBookings);
indexRouter.put("/cafe/:id/status", AdminAuth, updateBookingStatus);
indexRouter.put("/cafe/:id/payment", AdminAuth, updatePaymentStatus);


//restro section
indexRouter.post("/createNewRestro", AdminAuth, upload.fields([
  { name: "featured", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
  { name: "menu", maxCount: 10 },
]), createNewRestaurant);
indexRouter.get("/getAllRestros", AdminAuth, getAllRestos);
indexRouter.get("/getRestroById/:id", getSingleRestro);

// UPDATE restaurant
indexRouter.put("/updateRestro/:id", AdminAuth, upload.fields([
  { name: "featured", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
  { name: "menu", maxCount: 5 },
]), updateRestaurant);
indexRouter.delete("/deleteRestro/:id", AdminAuth, deleteRestaurant);
indexRouter.get("/resto/filter/advanced", filterRestaurants);
indexRouter.get("/restro/:id/tables", getAvailableTables);
indexRouter.get("/restro/:id/time-slots", getAvailableRestoTimeSlots);
//search restro
indexRouter.get("/restro/search", searchRestaurants);
indexRouter.get("/restro/changeStatus/:id", AdminAuth, restroChangeStatus);
indexRouter.post("/resetAllTables/:restroId", resetAllTables)
// restro booking
// user side
indexRouter.post("/createRestroBooking/:restaurantId", UserAuth, createRestaurantBooking);
indexRouter.get("/restro/my-bookings", UserAuth, getUserRestaurantBookings);
indexRouter.patch("/updateRestroPaymentStatus/:bookingId/payment", UserAuth, updateRestaurantPaymentStatus);
indexRouter.post("/restro/cancelMyBooking/:bookingId", UserAuth, cancelMyRestroBooking);
// // Admin routes (restro Booking)
indexRouter.get("/restro/:restaurantId", AdminAuth, getRestaurantBookings);
indexRouter.get("/getRestroBookingById/:bookingId", AdminAuth, getRestaurantBookingById); // *
indexRouter.patch("/restro/:bookingId/status", AdminAuth, updateRestaurantBookingStatus);
indexRouter.patch("/restro/:bookingId/checkin", AdminAuth, checkInGuest);
indexRouter.patch("/restro/:bookingId/checkout", AdminAuth, checkOutGuest);
indexRouter.get("/restro/stats/:restaurantId", AdminAuth, getBookingStatistics);


//hall section / find & booking
indexRouter.get('/getAllHalls', getAllHalls);
indexRouter.get('/getPopularHalls', getPopularHalls);
indexRouter.get('/getHallById/:id', getHallById);
indexRouter.get("/preview/billing/:hallId", UserAuth, getPreviewBillingOfHall)



// hall CRUD (admin Side)
// Route with proper middleware chain
indexRouter.post("/createHall", AdminAuth, upload.fields([
  { name: "featured", maxCount: 1 },
  { name: "gallery", maxCount: 10 }
]), createHall);

indexRouter.put('/updateHall/:id', AdminAuth, upload.any(), updateHall);
indexRouter.delete('/deleteHall/:id', AdminAuth, deleteHall);
indexRouter.delete('/deleteImage/:id/gallery/:imageIndex', AdminAuth, deleteGalleryImage);
//booking of all
indexRouter.post('/createHallBooking/:hallId', UserAuth, createHallBooking);
indexRouter.get('/myHallbookings', UserAuth, getUserHallBookings);
indexRouter.get('/getHallBookingById/:id', AdminAuth, getHallBookingById);
indexRouter.put('/cancelHallBooking/:id', UserAuth, cancelHallBooking);

//activitys section
// 1. get all vistion places
indexRouter.get("/allCountries", getAllCountries)
indexRouter.get("/getCityByCountry/:country", getCityByCountry);
indexRouter.get("/bestPlaceByCity/:cityName", bestPlaceByCity);
indexRouter.get("/bestPlaceByCityBasic/:cityName", bestPlaceByCityBasic);
indexRouter.get("/getPlaceDeatil/:placeName", getPlaceDeatil)
indexRouter.get("/getHotelByCity/:city", getHotelByCity)


// event routes
//admin side
indexRouter.get("/getAllEvents", getAllEvents);
indexRouter.get("/getEventStats", getEventStats);
indexRouter.get("/getEventById/:id", getEventById);

// Protected routes (require authentication)
indexRouter.post("/addNewEvent", AdminAuth, upload.fields([{ name: 'eventImage', maxCount: 1 }]), addNewEvent);
indexRouter.put("/updateEvent/:id", AdminAuth, upload.fields([{ name: 'eventImage', maxCount: 1 }]), updateEvent);
indexRouter.delete("/deleteEvent/:id", AdminAuth, deleteEvent);
indexRouter.post("/bulk-delete", UserAuth, bulkDeleteEvents);


//package tour section
indexRouter.post("/createNewTour", uploadTourImage, AdminAuth, createTour);
indexRouter.get("/getAllTours", AdminAuth, getAllTours);
indexRouter.get("/tour/best-offers", getBestOfferTours);
indexRouter.get("/getTourById/:id", getTourById);
indexRouter.put("/updateTour/:id", uploadTourImage, AdminAuth, updateTour);
indexRouter.patch("/updateTourImage/:id", uploadTourImage, updateTourImage);
indexRouter.delete("/deleteTour/:id", deleteTour);

//payemnt and all booking in single api not model created!!
indexRouter.get("/allBookings", UserAuth, getMyAllBookings)
indexRouter.get("/downloadInvoice/:id", UserAuth, downloadBookingInvoice);
indexRouter.get("/getMyRefundedBooking", UserAuth, getMyRefundBooking)

// review
indexRouter.post("/addReview/:businessId", UserAuth, addReview);
indexRouter.get("/myReview", UserAuth, getUserReviews);
indexRouter.put("/review/update/:reviewId", UserAuth, updateReview);
indexRouter.delete("/review/delete/:reviewId", UserAuth, deleteReview);
indexRouter.get("/review/business/:businessId", getBusinessReviews);
indexRouter.get("/getAllReviews", AdminAuth, getAllReviews);

indexRouter.post("/createCoupan", createCoupan);
indexRouter.get("/getAllCoupans", getAllCoupans);
indexRouter.get("/getCoupanById/:id", getCoupanById);
indexRouter.put("/updateCoupan/:id", updateCoupan);
indexRouter.delete("/deleteCoupan/:id", deleteCoupan);
indexRouter.patch("/toggleCoupanStatus/:id", toggleCoupanStatus);

//all list out of S3 images
indexRouter.get("/s3/list", async (req, res) => {
  try {
    const allUrls = await listAllS3Images();
    return res.status(200).json({ message: "S3 images listed successfully", total: allUrls.length, images: allUrls });
  } catch (error) {
    log.error("List S3 Images Error:" + error.message);
    return res.status(500).json({ message: "Failed to list S3 images", error });
  }
});

//delete image from S3
indexRouter.delete("/s3/delete", async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ message: "Image URL is required" });
  }
  try {
    const key = imageUrl.split(".amazonaws.com/")[1];
    await deleteFromS3(key);
    return res.status(200).json({ message: "Image deleted successfully from S3", imageUrl });
  }
  catch (error) {
    log.error("Delete S3 Image Error:" + error.message);
    return res.status(500).json({ message: "Failed to delete image from S3", error });
  }
});

indexRouter.delete("/s3/delete-multiple", async (req, res) => {
  try {
    const { images } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return sendBadRequest(res, "Images array is required");
    }

    const keys = images
      .map(url => {
        const key = url.split(".amazonaws.com/")[1];
        return key || null;
      })
      .filter(Boolean); // Remove nulls

    if (keys.length === 0) {
      return sendBadRequest(res, "No valid S3 keys found in images array");
    }

    // Delete all keys
    const results = await Promise.allSettled(keys.map((key) => deleteFromS3(key)));

    const success = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        success.push(keys[index]);
      } else {
        failed.push({ key: keys[index], reason: result.reason.message });
      }
    });

    return sendSuccess(res, "S3 images deletion completed", { success, failed });
  } catch (error) {
    log.error("deleteMultipleImages Error:", error);
    return sendError(res, 500, "Failed to delete images", error.message);
  }
});

export default indexRouter;