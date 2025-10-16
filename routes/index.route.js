import express from 'express';
import { ForgotOtpSend, ResetPassword, VerifyOtp, getUserProfile, googleLogin, newUserRegister, userLogin } from '../controller/user.controller.js';
import { UserAuth } from '../middleware/UserAuth.js';
import { adminLogin, adminUpdate, deleteAdmin, getAdminById, getAllAdmins, newAdminRegister } from '../controller/admin.controller.js';
import { AdminAuth } from '../middleware/AdminAuth.js';
import { createNewHotel, deleteHotels, getAllHotels, getHotelById } from '../controller/hotel.controller.js';
import { handleMulterErrors, processAndUploadImages, uploadFiles } from '../middleware/multer.middleware.js';
import { createBooking, getMyHotelBookings, hotelAdminBookings, previewBooking, updateHotelBookingStatus, } from '../controller/hotel.booking.controller.js';
import { deleteFromS3, listAllS3Images, upload } from '../middleware/uploadS3.js';
import log from '../utils/logger.js'
import { addToWatchlist, getMyWatchlist, removeWatchlistItem } from '../controller/watchlist.controller.js';
import { addCafeImages, cafeThemes, createNewCafe, deleteCafe, getAllCafes, getCafeById, getCafesByLocation, getCafesByTheme, getPopularCafes, removeCafeImage, searchCafes, updateCafe } from '../controller/cafe.controller.js';
import { cancelBooking, createCafeBooking, getAvailableTimeSlots, getBookingById, getCafeBookings, getUserBookings, previewCafeBooking, updateBookingStatus, updatePaymentStatus } from '../controller/cafe.booking.controller.js';

const indexRouter = express.Router();

//auth section
indexRouter.post("/userRegister", newUserRegister);
indexRouter.post("/userLogin", userLogin);
indexRouter.post("/googleLogin", googleLogin);
indexRouter.post("/forgotOtp", ForgotOtpSend);
indexRouter.post("/verifyOtp", VerifyOtp);
indexRouter.post("/resetPassword", ResetPassword);

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
indexRouter.post("/hotel/previewBooking/:hotelId", UserAuth, previewBooking);
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
indexRouter.put("/:id/status", AdminAuth, updateBookingStatus);
indexRouter.put("/:id/payment", AdminAuth, updatePaymentStatus);



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

export default indexRouter;

