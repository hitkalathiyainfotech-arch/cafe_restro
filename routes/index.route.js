import express from 'express';
import { getUserProfile, googleLogin, newUserController, userLoginController } from '../controller/user.controller.js';
import { UserAuth } from '../middleware/UserAuth.js';

const indexRouter = express.Router();

//auth section
indexRouter.post("/new/user", newUserController)
indexRouter.post("/user/login", userLoginController)
indexRouter.post("/googleLogin",googleLogin)

//profile section
indexRouter.get("/user/profile", UserAuth, getUserProfile)

export default indexRouter;