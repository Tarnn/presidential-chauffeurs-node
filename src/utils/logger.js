/**
 * Logger utility for consistent logging throughout the application
 */
const config = require('../config/env');

// Define log levels
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

// Only log debug messages in development
const shouldLogDebug = config.isDevelopment();

/**
 * Format a log message with timestamp, level, and optional request ID
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} [data] - Optional data to include in the log
 * @param {string} [requestId] - Optional request ID for tracing
 * @returns {string} Formatted log message
 */
const formatLogMessage = (level, message, data = null, requestId = null) => {
  const timestamp = new Date().toISOString();
  const logObject = {
    timestamp,
    level,
    message,
    ...(requestId && { requestId }),
    ...(data && { data }),
  };
  
  // In production, we might want to mask sensitive data
  if (config.isProduction() && data) {
    // Mask sensitive fields if they exist in the data
    const sensitiveFields = ['password', 'token', 'secret', 'email', 'captchaToken'];
    const maskedData = { ...data };
    
    sensitiveFields.forEach(field => {
      if (typeof maskedData === 'object' && maskedData !== null) {
        Object.keys(maskedData).forEach(key => {
          if (key.toLowerCase().includes(field.toLowerCase()) && maskedData[key]) {
            maskedData[key] = typeof maskedData[key] === 'string' 
              ? `${maskedData[key].substring(0, 3)}***` 
              : '[REDACTED]';
          }
        });
      }
    });
    
    logObject.data = maskedData;
  }
  
  return JSON.stringify(logObject);
};

/**
 * Log an error message
 * @param {string} message - Error message
 * @param {Error|object} [error] - Error object or data
 * @param {string} [requestId] - Optional request ID for tracing
 */
const error = (message, error = null, requestId = null) => {
  let errorData = null;
  
  if (error instanceof Error) {
    errorData = {
      name: error.name,
      message: error.message,
      stack: config.isDevelopment() ? error.stack : undefined,
    };
  } else if (error) {
    errorData = error;
  }
  
  console.error(formatLogMessage(LOG_LEVELS.ERROR, message, errorData, requestId));
};

/**
 * Log a warning message
 * @param {string} message - Warning message
 * @param {object} [data] - Optional data
 * @param {string} [requestId] - Optional request ID for tracing
 */
const warn = (message, data = null, requestId = null) => {
  console.warn(formatLogMessage(LOG_LEVELS.WARN, message, data, requestId));
};

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {object} [data] - Optional data
 * @param {string} [requestId] - Optional request ID for tracing
 */
const info = (message, data = null, requestId = null) => {
  console.info(formatLogMessage(LOG_LEVELS.INFO, message, data, requestId));
};

/**
 * Log a debug message (only in development)
 * @param {string} message - Debug message
 * @param {object} [data] - Optional data
 * @param {string} [requestId] - Optional request ID for tracing
 */
const debug = (message, data = null, requestId = null) => {
  if (shouldLogDebug) {
    console.debug(formatLogMessage(LOG_LEVELS.DEBUG, message, data, requestId));
  }
};

module.exports = {
  error,
  warn,
  info,
  debug,
  LOG_LEVELS,
}; 