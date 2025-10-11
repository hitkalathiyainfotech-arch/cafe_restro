import express from 'express';
import { ForgotOtpSend, ResetPassword, VerifyOtp, getUserProfile, googleLogin, newUserRegister, userLogin } from '../controller/user.controller.js';
import { UserAuth } from '../middleware/UserAuth.js';
import { newAdminRegister } from '../controller/admin.controller.js';

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
// indexRouter.post("/adminLogin", adminLogin);
// indexRouter.get("/allAdmins", getAllAdmins);
// indexRouter.get("/getAdminById/:adminId", getAdminById);
// indexRouter.patch("/adminUpdate", adminUpdate);
// indexRouter.delete("/deleteAdmin", deleteAdmin);


//hotel section
// indexRouter.post("/createNewHotel", UserAuth, createNewHotel )



export default indexRouter;