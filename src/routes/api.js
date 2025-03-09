/**
 * API routes for the application
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const inquiryController = require('../controllers/inquiryController');
const recaptchaMiddleware = require('../middleware/recaptchaVerifier');

const router = express.Router();

// Rate limiting for inquiry submissions
const inquiryLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  message: {
    error: {
      message: 'Too many requests, please try again later',
      details: {
        retryAfter: Math.ceil(config.RATE_LIMIT.WINDOW_MS / 1000 / 60) + ' minutes'
      }
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Get all vehicles
router.get('/vehicles', inquiryController.getVehicles);

// Submit an inquiry
router.post(
  '/inquiry', 
  inquiryLimiter, 
  recaptchaMiddleware('vehicleInquiry'), 
  inquiryController.submitInquiry
);

module.exports = router; 