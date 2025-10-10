import express from 'express';
import { ForgotOtpSend, getUserProfile, googleLogin, newUserRegister, userLogin } from '../controller/user.controller.js';
import { UserAuth } from '../middleware/UserAuth.js';

const indexRouter = express.Router();

//auth section
indexRouter.post("userRegister", newUserRegister);
indexRouter.post("userLogin", userLogin);
indexRouter.post("googleLogin", googleLogin);
indexRouter.post("forgotOtp", ForgotOtpSend)

//profile section
indexRouter.get("userProfile", UserAuth, getUserProfile)

export default indexRouter;