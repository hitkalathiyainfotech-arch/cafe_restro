// scripts/fixReviewTypes.js
import mongoose from "mongoose";
import reviewModel from "./model/review.model.js";

const DB_URL = "mongodb+srv://akshayvaghasiya814:aksh2002@cluster0.se95gol.mongodb.net/cafe_restro"; // change this

const run = async () => {
  try {
    await mongoose.connect(DB_URL);
    console.log("Connected to DB");

    const updates = [
      { from: "hotel", to: "Hotel" },
      { from: "cafe", to: "Cafes" },
      { from: "cafes", to: "Cafes" },
      { from: "restro", to: "Restro" },
      { from: "restaurant", to: "Restro" },
    ];

    for (const { from, to } of updates) {
      const result = await reviewModel.updateMany(
        { businessType: from },
        { $set: { businessType: to } }
      );
      if (result.modifiedCount > 0)
        console.log(`✅ Updated ${result.modifiedCount} → ${to}`);
    }

    console.log("🎉 Done!");
    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

run();
