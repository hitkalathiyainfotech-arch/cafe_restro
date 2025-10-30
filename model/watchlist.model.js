import mongoose from "mongoose";

const watchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  hotels: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null
    },
  ],
  cafe: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafes",
      default: null
    },
  ],
  restro: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restro",
      default: null
    },
  ],
  hall: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hall",
      default: null
    },
  ],
  event: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null
    },
  ]
}, { timestamps: true });

const watchListModel = mongoose.model("Watchlist", watchlistSchema);

export default watchListModel;