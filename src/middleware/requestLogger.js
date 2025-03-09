/**
 * Middleware for logging HTTP requests
 */
// const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Generate a simple UUID
 * This is a fallback implementation if the uuid package is not available
 * @returns {string} A unique ID
 */
const generateRequestId = () => {
  // Simple UUID generator (not as robust as the uuid package but works for our purposes)
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

/**
 * Middleware to log incoming requests
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const requestLogger = (req, res, next) => {
  // Generate a unique ID for this request
  const requestId = generateRequestId();
  req.requestId = requestId;
  
  // Get request details
  const { method, originalUrl, ip } = req;
  const userAgent = req.get('user-agent') || 'unknown';
  
  // Log the request
  logger.info(`${method} ${originalUrl}`, { 
    ip, 
    userAgent,
    // Don't log body for POST/PUT requests to avoid logging sensitive data
    ...(method === 'GET' && { query: req.query })
  }, requestId);
  
  // Record the start time
  const startTime = Date.now();
  
  // Log the response when it's sent
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const { statusCode } = res;
    
    // Determine log level based on status code
    if (statusCode >= 500) {
      logger.error(`${method} ${originalUrl} ${statusCode}`, { responseTime }, requestId);
    } else if (statusCode >= 400) {
      logger.warn(`${method} ${originalUrl} ${statusCode}`, { responseTime }, requestId);
    } else {
      logger.info(`${method} ${originalUrl} ${statusCode}`, { responseTime }, requestId);
    }
  });
  
  next();
};

module.exports = requestLogger; 