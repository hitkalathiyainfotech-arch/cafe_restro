import userModel from "../model/user.model.js";
import log from "../utils/logger.js"
import { sendBadRequest, sendError, sendNotFound, sendSuccess } from "../utils/responseUtils.js";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";
import transporter from "../utils/Email.config.js";

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

export const googleLogin = async (req, res) => {
  try {
    const { email, name, avatar } = req.body;

    if (!email || !name) {
      return sendBadRequest(res, "Name and email are required");
    }

    // Check if user exists
    let user = await userModel.findOne({ email });
    let isNew = false;

    if (user) {
      log.success(`${user.name} login successful`);
    } else {
      // Create new user
      user = await userModel.create({
        name,
        email,
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        password: "SOCIAL_LOGIN", // placeholder password
      });
      await user.save();
      log.success(`${user.name} account created`);
      isNew = true; // mark as new user
    }

    // Generate JWT token
    const payload = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    const token = jwt.sign(payload, process.env.JWT_SECET, { expiresIn: "30d" });

    return sendSuccess(
      res,
      { user, token },
      isNew
        ? "New User Registered Successfully With Google Login"
        : "Google Registered User Login Successful"
    );

  } catch (error) {
    log.error(`Login/Register error: ${error.message}`);
    return sendError(res, error, `Login/Register error: ${error.message}`);
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
    const user = await userModel.findById(_id).select("-password");

    if (!user) {
      return sendBadRequest(res, "User not found");
    }

    return sendSuccess(res, { user }, "User profile fetched successfully");
  } catch (error) {
    log.error(`Error fetching user profile: ${error.message}`);
    return sendError(res, error, `Error fetching user profile: ${error.message}`);
  }
};

export const ForgotOtpSendController = async (req, res) => {
  try {
    const { email } = req?.body;
    if (!email) {
      return sendBadRequest(res, "email is required");
    }

    const user = await userModel.findOne({ email: email });
    if (user) {
      return sendNotFound(res, `${user.name} Not Found`);
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to: String(email).toLowerCase().trim(),
        subject: "Cafe & Restro App Forget Password"
      })
    } catch (error) {
      log.error(`Transporter email send error`);
      return sendError(res, "Transporter Email Send");
    }

  } catch (error) {
    log.error(`Error While Send Forget OTP : ${error.message}`)
    return sendError(res, `Error While Send Forget OTP : ${error.message}`, error);
  }
}