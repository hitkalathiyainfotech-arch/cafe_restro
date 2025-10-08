import express from 'express';
import { newUserController } from '../controller/user.controller.js';

const indexRouter = express.Router();

//auth controller
indexRouter.get("/new/user",newUserController)



export default indexRouter;