import watchListModel from "../model/watchlist.model.js";
import log from "../utils/logger.js"
import { sendError, sendSuccess } from "../utils/responseUtils.js";

export const addToWatchlist = async (req, res) => {
  try {
    const { hotel, cafe, restro, hall, event } = req.query;
    const userId = req.user?._id;

    if (!hotel && !cafe && !restro && !hall && !event) {
      return res.status(400).json({
        success: false,
        message: "At least one item (hotel, cafe, restro, hall, event) is required",
      });
    }

    const addToSet = {};
    if (hotel) addToSet.hotels = hotel;
    if (cafe) addToSet.cafe = cafe;
    if (restro) addToSet.restro = restro;
    if (hall) addToSet.hall = hall;
    if (event) addToSet.event = event;

    const watchlist = await watchListModel.findOneAndUpdate(
      { userId },
      { $addToSet: addToSet },
      { new: true, upsert: true }
    ).populate("hotels cafe restro hall event");

    return sendSuccess(res, "Watchlist updated successfully", watchlist);
  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to add to watchlist", error);
  }
};

export const getMyWatchlist = async (req, res) => {
  try {
    const userId = req.user?._id;
    const watchlist = await watchListModel.findOne({ userId })
      .populate("userId")
      .populate("hotels")
      .populate("cafe")
      .populate("restro")
      .populate("hall")
      .populate("event");

    if (!watchlist) {
      return sendSuccess(res, "No watchlist found", { 
        hotels: [], 
        cafe: [], 
        restro: [], 
        hall: [], 
        event: [] 
      });
    }
    return sendSuccess(res, "Watchlist fetched successfully", watchlist);
  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to fetch watchlist", error);
  }
}

export const removeWatchlistItem = async (req, res) => {
  try {
    const { hotel, cafe, restro, hall, event } = req.query;
    const userId = req.user?._id;

    if (!hotel && !cafe && !restro && !hall && !event) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one item (hotel, cafe, restro, hall, event) is required to remove" 
      });
    }

    // Build the pull object dynamically
    const update = { $pull: {} };
    
    if (hotel) update.$pull.hotels = hotel;
    if (cafe) update.$pull.cafe = cafe;
    if (restro) update.$pull.restro = restro;
    if (hall) update.$pull.hall = hall;
    if (event) update.$pull.event = event;

    // Update the user's watchlist
    const watchlist = await watchListModel.findOneAndUpdate(
      { userId },
      update,
      { new: true }
    ).populate("hotels cafe restro hall event");

    if (!watchlist) {
      return res.status(404).json({ 
        success: false, 
        message: "Watchlist not found for this user" 
      });
    }

    return sendSuccess(res, "Item(s) removed from watchlist successfully", watchlist);
  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to remove item from watchlist", error);
  }
};

export const getWatchlistByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user?._id;

    const validCategories = ['hotels', 'cafe', 'restro', 'hall', 'event'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Must be one of: hotels, cafe, restro, hall, event"
      });
    }

    const watchlist = await watchListModel.findOne({ userId })
      .select(`${category} userId`)
      .populate(category);

    if (!watchlist) {
      return sendSuccess(res, `No ${category} found in watchlist`, []);
    }

    return sendSuccess(res, `${category} fetched successfully`, watchlist[category]);
  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, `Failed to fetch ${category} from watchlist`, error);
  }
};

export const clearWatchlist = async (req, res) => {
  try {
    const userId = req.user?._id;

    const watchlist = await watchListModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          hotels: [],
          cafe: [],
          restro: [],
          hall: [],
          event: []
        }
      },
      { new: true }
    );

    if (!watchlist) {
      return res.status(404).json({
        success: false,
        message: "Watchlist not found for this user"
      });
    }

    return sendSuccess(res, "Watchlist cleared successfully", watchlist);
  } catch (error) {
    log.error(error.message);
    return sendError(res, 500, "Failed to clear watchlist", error);
  }
};