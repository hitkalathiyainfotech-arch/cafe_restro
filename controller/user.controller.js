import log from "../utils/logger.js"
import { sendError, sendSuccess } from "../utils/responseUtils.js";

export const newUserController = async (req, res) => {
  try {
    const data = [
      {
        "name": "hit"
      },
      {
        "name": "hit2"
      },
      {
        "name": "hit3"
      },
      {
        "name": "hit4"
      },
    ]
    return sendSuccess(res, data, `User get Success`);
  } catch (error) {
    log.error(`Error While Create New User : ${error.message}`);
    return sendError(res, "Error While Create New user", 500, error);
  }
}
