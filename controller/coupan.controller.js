import coupanModel from "../model/coupan.model.js";
import { sendBadRequest } from "../utils/responseUtils.js";

export const createCoupan = async (req, res) => {
  try {
    const { coupanCode, coupanPerc, coupanExpire } = req.body;
    console.log(req.body)
    if (!req.body) {
      return sendBadRequest(res, "req.body Not found")
    }
    const existing = await coupanModel.findOne({ coupanCode: coupanCode.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Coupan code already exists" });
    }

    const newCoupan = await coupanModel.create({ couponCode: coupanCode, couponPerc: coupanPerc, couponExpire: coupanExpire });
    await newCoupan.save()
    res.status(201).json({ success: true, message: "Coupan created successfully", data: newCoupan });
  } catch (error) {
    console.log("error" + error.message)
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCoupans = async (req, res) => {
  try {
    const coupans = await coupanModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: coupans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCoupanById = async (req, res) => {
  try {
    const coupan = await coupanModel.findById(req.params.id);
    if (!coupan) return res.status(404).json({ success: false, message: "Coupan not found" });

    res.status(200).json({ success: true, data: coupan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCoupan = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await coupanModel.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ success: false, message: "Coupan not found" });
    res.status(200).json({ success: true, message: "Coupan updated", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCoupan = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await coupanModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Coupan not found" });

    res.status(200).json({ success: true, message: "Coupan deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const toggleCoupanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const coupan = await coupanModel.findById(id);
    if (!coupan) return res.status(404).json({ success: false, message: "Coupan not found" });

    coupan.isActive = !coupan.isActive;
    await coupan.save();

    res.status(200).json({
      success: true,
      message: `Coupan is now ${coupan.isActive ? "Active" : "Inactive"}`,
      data: coupan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
