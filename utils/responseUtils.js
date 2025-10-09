// Base response function
const sendResponse = (res, isSuccess, message, data = null, statusCode = 200) => {
  if (isSuccess) {
    const response = {
      res: true,
      message,
      records: data ?? [],
    };
    if (Array.isArray(data)) response.length = data.length;
    return res.status(statusCode).json(response);
  } else {
    return res.status(statusCode).json({
      res: false,
      message,
      error: data?.message || data || "Something went wrong",
    });
  }
};

// Success - 200
export const sendSuccess = (res, data = [], message = "Success") => {
  return sendResponse(res, true, message, data, 200);
};

// Validation Error - 422
export const sendValidationError = (res, errors, message = "Validation Error") => {
  return sendResponse(res, false, message, errors, 422);
};

// Not Found - 404
export const sendNotFound = (res, message = "Resource not found") => {
  return sendResponse(res, false, message, null, 404);
};

// Bad Request - 400
export const sendBadRequest = (res, message = "Bad Request") => {
  return sendResponse(res, false, message, null, 400);
};

// Unauthorized - 401
export const sendUnauthorized = (res, message = "Unauthorized") => {
  return sendResponse(res, false, message, null, 401);
};

// Forbidden - 403
export const sendForbidden = (res, message = "Forbidden") => {
  return sendResponse(res, false, message, null, 403);
};

// Server Error - 500
export const sendError = (res, error = null, message = "Internal Server Error") => {
  return sendResponse(res, false, message, error, 500);
};

// Custom Response - allows custom status code
export const sendCustom = (res, data, message = "Success", statusCode = 200) => {
  return sendResponse(res, true, message, data, statusCode);
};
