import express from 'express';
import { ForgotOtpSend, ResetPassword, VerifyOtp, getUserProfile, googleLogin, newUserRegister, userLogin } from '../controller/user.controller.js';
import { UserAuth } from '../middleware/UserAuth.js';
import { adminLogin, adminUpdate, deleteAdmin, getAdminById, getAllAdmins, newAdminRegister } from '../controller/admin.controller.js';
import { AdminAuth } from '../middleware/AdminAuth.js';
import { createNewHotel } from '../controller/hotel.controller.js';
import { handleMulterErrors, normalizeRoomImages, uploadFiles } from '../middleware/multer.middleware.js';
import { createBooking, previewBooking } from '../controller/hotel.booking.controller.js';

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
indexRouter.post("/createNewHotel", AdminAuth, uploadFiles, normalizeRoomImages, handleMulterErrors, createNewHotel);
// indexRouter.get("/getAllHotels", AdminAuth, getAllHotels);
// indexRouter.get("/getHotelById", getHotelById);
// indexRouter.patch("/updateHotel", updateHotel);
// indexRouter.delete("/deleteHotel", deleteHotels);

//hotel. booking section
indexRouter.post("/hotel/createBooking/:hotelId", UserAuth, createBooking);
indexRouter.post("/hotel/previewBooking/:hotelId", UserAuth, previewBooking);


export default indexRouter;