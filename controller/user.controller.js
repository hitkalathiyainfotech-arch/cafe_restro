import userModel from "../model/user.model.js";
import log from "../utils/logger.js"
import { sendBadRequest, sendError, sendSuccess } from "../utils/responseUtils.js";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";

export const newUserController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return sendBadRequest(res, "name, email, password are required");
    }

    // Check if user exists
    const isExists = await userModel.findOne({ email });

    if (isExists) {
      const passwordCmp = await bcrypt.compare(password, isExists.password);
      if (passwordCmp) {
        log.success(`${isExists.name} Login Successful`);

        // Generate JWT
        const payload = {
          _id: isExists._id,
          name: isExists.name,
          email: isExists.email,
          role: isExists.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECET, { expiresIn: "30d" });

        return sendSuccess(res, { user: isExists, token }, "Login Successful");
      } else {
        return sendBadRequest(res, "Incorrect password");
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate UI avatar URL
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    // Create new user
    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
      avatar
    });
    await newUser.save();
    //new user token generate
    const payload = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECET, { expiresIn: "30d" });

    return sendSuccess(res, {
      user: newUser,
      token
    }, "User created successfully");
  } catch (error) {
    log.error(`Error During Create A New User: ${error.message}`);
    return sendError(res, error, `Error During Create A New User: ${error.message}`);
  }
}

export const userLoginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return sendBadRequest(res, "Email and password are required");
    }

    // Check if user exists
    const user = await userModel.findOne({ email });
    if (!user) {
      return sendBadRequest(res, "User not found, please register");
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendBadRequest(res, "Incorrect password");
    }

    // Generate JWT token
    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECET, { expiresIn: "30d" });

    log.success(`${user.name} Login Successful`);

    return sendSuccess(res, { user, token }, "Login Successful");
  } catch (error) {
    log.error(`Error During Login: ${error.message}`);
    return sendError(res, error, `Error During Login: ${error.message}`);
  }

}


//profile section controller

export const getUserProfile = async (req, res) => {
  try {
    const { _id } = req?.user;

    if (!_id) {
      return sendBadRequest(res, "User not authenticated");
    }

    // Fetch user data
    const user = await userModel.findById(_id).select("-password"); // exclude password

    if (!user) {
      return sendBadRequest(res, "User not found");
    }

    return sendSuccess(res, { user }, "User profile fetched successfully");
  } catch (error) {
    log.error(`Error fetching user profile: ${error.message}`);
    return sendError(res, error, `Error fetching user profile: ${error.message}`);
  }
};
