/**
 * Middleware for reCAPTCHA verification
 */
const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');
const { ApiError } = require('./errorHandler');

/**
 * Verify reCAPTCHA token
 * @param {string} token - reCAPTCHA token
 * @param {string} action - Expected action
 * @returns {Promise<object>} - Verification result
 */
const verifyRecaptcha = async (token, action = null) => {
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${config.RECAPTCHA.SECRET}&response=${token}`
    );
    
    return response.data;
  } catch (error) {
    logger.error('reCAPTCHA verification request failed', error);
    throw new ApiError(500, 'Failed to verify reCAPTCHA', { 
      cause: error.message 
    });
  }
};

/**
 * Middleware to verify reCAPTCHA token
 * @param {string} [expectedAction=null] - Expected action
 * @returns {function} - Express middleware
 */
const recaptchaMiddleware = (expectedAction = null) => {
  return async (req, res, next) => {
    // Skip verification in development mode if configured to do so
    if (config.isDevelopment() && req.body.captchaToken === 'TESTING_TOKEN') {
      logger.debug('reCAPTCHA verification bypassed for testing');
      return next();
    }
    
    const { captchaToken } = req.body;
    
    if (!captchaToken) {
      return next(new ApiError(400, 'reCAPTCHA token is required'));
    }
    
    try {
      const result = await verifyRecaptcha(captchaToken);
      
      if (!result.success) {
        logger.warn('reCAPTCHA verification failed', { 
          errors: result['error-codes'] 
        }, req.requestId);
        
        return next(new ApiError(400, 'reCAPTCHA verification failed', { 
          errors: result['error-codes'] 
        }));
      }
      
      // Check score for v3
      if (result.score !== undefined && result.score < config.RECAPTCHA.SCORE_THRESHOLD) {
        logger.warn('reCAPTCHA score too low', { 
          score: result.score, 
          threshold: config.RECAPTCHA.SCORE_THRESHOLD 
        }, req.requestId);
        
        return next(new ApiError(400, 'reCAPTCHA score too low, possible bot activity', { 
          score: result.score, 
          threshold: config.RECAPTCHA.SCORE_THRESHOLD 
        }));
      }
      
      // Check action if specified
      if (expectedAction && result.action && result.action !== expectedAction) {
        logger.warn('reCAPTCHA action mismatch', { 
          expected: expectedAction, 
          received: result.action 
        }, req.requestId);
        
        return next(new ApiError(400, 'reCAPTCHA action mismatch', { 
          expected: expectedAction, 
          received: result.action 
        }));
      }
      
      // Store verification result in request for later use
      req.recaptchaResult = result;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = recaptchaMiddleware; 