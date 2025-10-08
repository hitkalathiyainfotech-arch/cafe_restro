const sendResponse = (res, status, message, result = null, statusCode = 200, extra = {}) => {
  const response = {
    status,
    message,
    length: Array.isArray(result) ? result.length : undefined,
    result: result ?? undefined,
    ...extra,
  };
  return res.status(statusCode).json(response);
};

export const sendSuccess = (res, result = {}, message = "Success", extra = {}) => {
  return sendResponse(res, true, message, result, 200, extra);
};

export const sendError = (res, message = "Something went wrong", statusCode = 400, errors = null, extra = {}) => {
  return sendResponse(res, false, message, errors, statusCode, extra);
};

export const sendValidationError = (res, errors, message = "Validation Error") => {
  return sendError(res, message, 422, errors);
};

export const sendNotFound = (res, message = "Resource not found") => {
  return sendError(res, message, 404);
};

export const sendBadRequest = (res, message = "Bad Request") => {
  return sendError(res, message, 400);
};

export const sendUnauthorized = (res, message = "Unauthorized") => {
  return sendError(res, message, 401);
};


export const sendForbidden = (res, message = "Forbidden") => {
  return sendError(res, message, 403);
};

export const sendCustom = (res, result, message = "Success", statusCode = 200, extra = {}) => {
  return sendResponse(res, true, message, result, statusCode, extra);
};
