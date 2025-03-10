/**
 * Presidential Chauffeurs API
 * Main server file for handling inquiries and health checks
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { sendEmail } = require('./utils/email');
const fs = require('fs');
const path = require('path');
const compression = require('compression');

// Cache variables
const CACHE_TTL = 3600000; // 1 hour in milliseconds
let vehiclesCache = {
  data: [],
  lastUpdated: 0
};

// reCAPTCHA token cache
const recaptchaCache = new Map();
const RECAPTCHA_CACHE_TTL = 300000; // 5 minutes in milliseconds

// Load vehicle data with error handling and caching
const loadVehiclesData = () => {
  // Check if cache is still valid
  const now = Date.now();
  if (vehiclesCache.data.length > 0 && (now - vehiclesCache.lastUpdated) < CACHE_TTL) {
    console.log('Using cached vehicles data');
    return vehiclesCache.data;
  }

  try {
    const vehiclesFilePath = path.join(__dirname, 'data', 'vehicles.json');
    if (fs.existsSync(vehiclesFilePath)) {
      const data = JSON.parse(fs.readFileSync(vehiclesFilePath, 'utf8'));
      console.log(`Loaded ${data.length} vehicles from data file`);
      
      // Update cache
      vehiclesCache = {
        data,
        lastUpdated: now
      };
      
      return data;
    } else {
      console.error('Error loading vehicle data: vehicles.json file not found');
      return [];
    }
  } catch (error) {
    console.error('Error loading vehicle data:', error.message);
    return [];
  }
};

// Initial load
let vehiclesData = loadVehiclesData();

// Create Express app
const app = express();

// Middleware
app.use(compression()); // Add compression middleware
app.use(express.json());
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Allow specific origins
    const allowedOrigins = [
      'https://www.presidentialchauffeurs.com',
      'https://presidentialchauffeurs.com',
      'https://presidential-chauffeurs.vercel.app',
      'https://presidential-chauffeurs-node-nqnv.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // If CORS_ORIGIN is set in env, add it to allowed origins
    if (process.env.CORS_ORIGIN) {
      if (Array.isArray(process.env.CORS_ORIGIN)) {
        process.env.CORS_ORIGIN.forEach(origin => allowedOrigins.push(origin));
      } else {
        allowedOrigins.push(process.env.CORS_ORIGIN);
      }
    }
    
    // Check if the origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS`);
      callback(null, true); // Temporarily allow all origins while debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

/**
 * Verify reCAPTCHA token
 * @param {string} token - The reCAPTCHA token to verify
 * @returns {Promise<boolean>} - Whether the token is valid
 */
async function verifyRecaptcha(token) {
  try {
    console.log(`Verifying reCAPTCHA token (first 10 chars): ${token.substring(0, 10)}...`);
    
    if (!process.env.RECAPTCHA_SECRET) {
      console.error('RECAPTCHA_SECRET environment variable is not set');
      return false;
    }
    
    // Check cache first
    if (recaptchaCache.has(token)) {
      const cachedResult = recaptchaCache.get(token);
      if (Date.now() - cachedResult.timestamp < RECAPTCHA_CACHE_TTL) {
        console.log('Using cached reCAPTCHA verification result');
        return cachedResult.valid;
      } else {
        // Remove expired cache entry
        recaptchaCache.delete(token);
      }
    }
    
    // Direct API call to Google's reCAPTCHA verification endpoint
    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const formData = new URLSearchParams();
    formData.append('secret', process.env.RECAPTCHA_SECRET);
    formData.append('response', token);
    
    console.log('Sending verification request to Google reCAPTCHA API');
    
    const response = await axios({
      method: 'post',
      url: verifyUrl,
      data: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('reCAPTCHA API response:', JSON.stringify(response.data));
    
    const isValid = !!response.data.success;
    
    // Cache the result
    recaptchaCache.set(token, {
      valid: isValid,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries periodically
    if (recaptchaCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of recaptchaCache.entries()) {
        if (now - value.timestamp > RECAPTCHA_CACHE_TTL) {
          recaptchaCache.delete(key);
        }
      }
    }
    
    if (!isValid) {
      const errorCodes = response.data['error-codes'] || [];
      console.error('reCAPTCHA verification failed with error codes:', errorCodes);
      
      // Log specific error messages based on error codes
      errorCodes.forEach(code => {
        switch(code) {
          case 'missing-input-secret':
            console.error('The secret parameter is missing');
            break;
          case 'invalid-input-secret':
            console.error('The secret parameter is invalid or malformed');
            break;
          case 'missing-input-response':
            console.error('The response parameter is missing');
            break;
          case 'invalid-input-response':
            console.error('The response parameter is invalid or malformed');
            break;
          case 'bad-request':
            console.error('The request is invalid or malformed');
            break;
          case 'timeout-or-duplicate':
            console.error('The response is no longer valid: either is too old or has been used previously');
            break;
          default:
            console.error(`Unknown error code: ${code}`);
        }
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    return false;
  }
}

/**
 * Middleware to verify reCAPTCHA token
 */
const recaptchaMiddleware = async (req, res, next) => {
  console.log('reCAPTCHA middleware called with NODE_ENV:', process.env.NODE_ENV);
  
  // Skip verification in development or test mode
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log(`Skipping reCAPTCHA verification in ${process.env.NODE_ENV} mode`);
    return next();
  }

  // Temporarily bypass verification for production debugging
  // REMOVE THIS IN PRODUCTION AFTER DEBUGGING
  if (process.env.BYPASS_RECAPTCHA === 'true') {
    console.log('Bypassing reCAPTCHA verification (BYPASS_RECAPTCHA=true)');
    return next();
  }

  // Allow test token for testing in production when ALLOW_TEST_TOKEN is set
  if (req.body.captchaToken === 'TESTING_TOKEN' && process.env.ALLOW_TEST_TOKEN === 'true') {
    console.log('Using test token for reCAPTCHA verification (enabled by ALLOW_TEST_TOKEN)');
    return next();
  }

  // Check if token exists
  const token = req.body.captchaToken;
  if (!token) {
    console.error('No reCAPTCHA token provided in request');
    return res.status(400).json({ 
      error: 'reCAPTCHA token is required',
      details: 'The captchaToken field is missing in the request body'
    });
  }

  try {
    // Verify the token
    console.log(`Verifying token with length ${token.length}`);
    const isValid = await verifyRecaptcha(token);
    
    if (!isValid) {
      console.error('reCAPTCHA verification failed');
      
      // During debugging, we'll allow the request to proceed even if verification fails
      if (process.env.ALLOW_ON_ERROR === 'true') {
        console.log('Proceeding despite reCAPTCHA failure (ALLOW_ON_ERROR=true)');
        return next();
      }
      
      return res.status(400).json({ 
        error: 'reCAPTCHA verification failed',
        details: 'The provided token was rejected by the reCAPTCHA verification service'
      });
    }

    console.log('reCAPTCHA verification successful');
    next();
  } catch (error) {
    console.error('Error in reCAPTCHA middleware:', error);
    
    // During debugging, we'll allow the request to proceed even if verification fails
    if (process.env.ALLOW_ON_ERROR === 'true') {
      console.log('Proceeding despite reCAPTCHA error (ALLOW_ON_ERROR=true)');
      return next();
    }
    
    return res.status(500).json({ 
      error: 'Internal server error during reCAPTCHA verification',
      details: error.message
    });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    vehiclesLoaded: vehiclesData.length > 0
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CORS is working correctly',
    origin: req.headers.origin || 'No origin header',
    timestamp: new Date().toISOString()
  });
});

// Inquiry endpoint
app.post('/api/inquiry', recaptchaMiddleware, async (req, res) => {
  try {
    const { vehicleId, vehicleName, purpose, date, email, description } = req.body;

    // Log request for debugging
    console.log('Received inquiry request:', {
      vehicleName,
      purpose,
      date,
      email: email ? email.substring(0, 3) + '***' : undefined, // Log partial email for privacy
      hasDescription: !!description
    });

    // Validate required fields
    if (!vehicleName || !purpose || !date || !email || !description) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'All fields are required',
        missingFields: {
          vehicleName: !vehicleName,
          purpose: !purpose,
          date: !date,
          email: !email,
          description: !description
        }
      });
    }

    // Validate date (must be in the future)
    const inquiryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (inquiryDate < today) {
      console.log('Validation failed: Date must be in the future');
      return res.status(400).json({ 
        error: 'Date must be in the future',
        providedDate: date,
        currentDate: today.toISOString()
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Validation failed: Invalid email format');
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Send email
    try {
      await sendEmail({
        vehicleName,
        purpose,
        date,
        email,
        description
      });
      
      // Log successful inquiry
      console.log(`Inquiry sent successfully for ${vehicleName} on ${date} from ${email.substring(0, 3)}***`);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send email',
        details: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }

    res.status(200).json({ 
      message: 'Inquiry sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing inquiry:', error);
    res.status(500).json({ 
      error: 'Failed to process inquiry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export for testing
module.exports = app;
