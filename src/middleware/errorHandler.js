/**
 * Middleware for centralized error handling
 */
const logger = require('../utils/logger');
const config = require('../config/env');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 errors for routes that don't exist
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Default status code and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log the error
  if (statusCode >= 500) {
    logger.error(`Server error: ${message}`, err, req.requestId);
  } else {
    logger.warn(`Client error: ${message}`, { 
      statusCode,
      path: req.originalUrl,
      method: req.method,
      ...(err.details && { details: err.details })
    }, req.requestId);
  }
  
  // Send response to client
  res.status(statusCode).json({
    error: {
      message,
      ...(config.isDevelopment() && err.stack && { stack: err.stack.split('\n') }),
      ...(err.details && { details: err.details })
    }
  });
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler
}; 