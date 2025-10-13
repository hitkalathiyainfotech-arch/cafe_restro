import watchListModel from "../model/watchlist.model.js";
import log from "../utils/logger.js"
import { sendError, sendSuccess } from "../utils/responseUtils.js";

export const addToWatchlist = async (req, res) => {
  try {
    const { hotel, cafe, restro } = req.query;
    const userId = req.user?._id; // from auth middleware

    if (!hotel && !cafe && !restro) {
      return res.status(400).json({ success: false, message: "At least one item (hotel, cafe, restro) is required" });
    }

    // Build update object dynamically
    const update = {};
    if (hotel) update.$addToSet = { hotels: hotel };
    if (cafe) {
      update.$addToSet = update.$addToSet || {};
      update.$addToSet.cafes = cafe;
    }
    if (restro) {
      update.$addToSet = update.$addToSet || {};
      update.$addToSet.restros = restro;
    }

    // Find existing watchlist or create new one
    const watchlist = await watchListModel.findOneAndUpdate(
      { userId },
      update,
      { new: true, upsert: true } // upsert: create if not exists, new: return updated doc
    );

    return sendSuccess(res, "Watchlist updated successfully", watchlist);
  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to add to watchlist", error);
  }
};

export const getMyWatchlist = async (req, res) => {
  try {
    const userId = req.user?._id;
    const watchlist = await watchListModel.findOne({ userId }).populate("userId hotels"); // in fututre add cafe restro for popluate - hit

    if (!watchlist) {
      return sendSuccess(res, "No watchlist found", { hotels: [], cafes: [], restros: [] });
    }
    return sendSuccess(res, "Watchlist fetched successfully", watchlist);
  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to fetch watchlist", error);
  }
}

export const removeWatchlistItem = async (req, res) => {
  try {
    const { hotel, cafe, restro } = req.query;
    const userId = req.user?._id; // from auth middleware

    if (!hotel && !cafe && !restro) {
      return res.status(400).json({ success: false, message: "At least one item (hotel, cafe, restro) is required to remove" });
    }

    // Build the pull object dynamically
    const update = {};
    if (hotel) update.$pull = { hotels: hotel };
    if (cafe) {
      update.$pull = update.$pull || {};
      update.$pull.cafes = cafe;
    }
    if (restro) {
      update.$pull = update.$pull || {};
      update.$pull.restros = restro;
    }

    // Update the user's watchlist
    const watchlist = await watchListModel.findOneAndUpdate(
      { userId },
      update,
      { new: true } // return updated doc
    );

    if (!watchlist) {
      return res.status(404).json({ success: false, message: "Watchlist not found for this user" });
    }

    return sendSuccess(res, "Item(s) removed from watchlist successfully", watchlist);
  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to remove item from watchlist", error);
  }
};
