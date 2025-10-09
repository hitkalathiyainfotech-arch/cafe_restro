// Base response
const sendResponse = (res, statusCode, success, message, result = []) => {
  return res.status(statusCode).json({
    success,
    message,
    result: Array.isArray(result) ? result : [result],
    length: Array.isArray(result) ? result.length : 1
  });
};

// Success - 200
export const sendSuccess = (res, message = "Success", result = []) => {
  return sendResponse(res, 200, true, message, result);
};

// Created - 201
export const sendCreated = (res, message = "Created successfully", result = []) => {
  return sendResponse(res, 201, true, message, result);
};

// Bad Request - 400
export const sendBadRequest = (res, message = "Bad Request") => {
  return sendResponse(res, 400, false, message, []);
};

// Unauthorized - 401
export const sendUnauthorized = (res, message = "Unauthorized") => {
  return sendResponse(res, 401, false, message, []);
};

// Forbidden - 403
export const sendForbidden = (res, message = "Forbidden") => {
  return sendResponse(res, 403, false, message, []);
};

// Not Found - 404
export const sendNotFound = (res, message = "Resource not found") => {
  return sendResponse(res, 404, false, message, []);
};

// Server Error - 500
export const sendError = (res, message = "Server Error", error = null) => {
  const result = error ? { error: error.message || error } : [];
  return sendResponse(res, 500, false, message, result);
};
