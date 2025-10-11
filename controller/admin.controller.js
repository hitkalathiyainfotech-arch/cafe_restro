import log from '../utils/logger.js'
import { sendBadRequest, sendError } from "../utils/responseUtils.js";
import adminModel from "../model/admin.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const newAdminRegister = async (req, res) => {
  try {
    const { name, email, password } = req?.body;

    if (!name || !email || !password) {
      return sendBadRequest(res, "name, email & password are required to register admin");
    }

    const isAdminExist = await adminModel.findOne({ email });

    if (isAdminExist) {
      const passwordCheck = bcrypt.compare(password, isAdminExist.password);
      if (passwordCheck) {
        const payload = {
          _id: isAdminExist._id,
          name: isAdminExist.name,
          email: isAdminExist.email
        }
        const token = jwt.sign(payload, process.env.JWT_SECET, { expiresIn: "30d" })
      }
    }



  } catch (error) {
    log.error(`Errror while New Admin Register : ${error.message}`);
    return sendError(res, `Error During New Admin Register`, error);
  }
}