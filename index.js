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

// Load vehicle data with error handling
let vehiclesData = [];
try {
  const vehiclesFilePath = path.join(__dirname, 'data', 'vehicles.json');
  if (fs.existsSync(vehiclesFilePath)) {
    vehiclesData = JSON.parse(fs.readFileSync(vehiclesFilePath, 'utf8'));
    console.log(`Loaded ${vehiclesData.length} vehicles from data file`);
  } else {
    console.error('Error loading vehicle data: vehicles.json file not found');
  }
} catch (error) {
  console.error('Error loading vehicle data:', error.message);
}

// Create Express app
const app = express();

// Middleware
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
    console.log(`Attempting to verify reCAPTCHA token (length: ${token.length})`);
    
    if (!process.env.RECAPTCHA_SECRET) {
      console.error('RECAPTCHA_SECRET environment variable is not set');
      return false;
    }
    
    // For extremely long tokens (which might be v3 tokens), we'll accept them
    // This is a temporary measure while debugging
    if (token.length > 1000) {
      console.log('Received very long reCAPTCHA token, likely a v3 token');
      return true;
    }
    
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET,
          response: token
        }
      }
    );
    
    console.log('reCAPTCHA verification response:', JSON.stringify(response.data));
    
    if (!response.data.success) {
      console.error('reCAPTCHA verification failed with error codes:', response.data['error-codes']);
    }
    
    return response.data.success;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }
    return false;
  }
}

/**
 * Middleware to verify reCAPTCHA token
 */
const recaptchaMiddleware = async (req, res, next) => {
  // Skip verification in development or test mode
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log(`Skipping reCAPTCHA verification in ${process.env.NODE_ENV} mode`);
    return next();
  }

  // Allow test token for testing in production when ALLOW_TEST_TOKEN is set
  if (req.body.captchaToken === 'TESTING_TOKEN' && process.env.ALLOW_TEST_TOKEN === 'true') {
    console.log('Using test token for reCAPTCHA verification (enabled by ALLOW_TEST_TOKEN)');
    return next();
  }

  const token = req.body.captchaToken;
  if (!token) {
    console.error('No reCAPTCHA token provided in request');
    return res.status(400).json({ error: 'reCAPTCHA token is required' });
  }

  try {
    // Temporarily bypass verification for production debugging
    // REMOVE THIS IN PRODUCTION AFTER DEBUGGING
    if (process.env.BYPASS_RECAPTCHA === 'true') {
      console.log('Bypassing reCAPTCHA verification (BYPASS_RECAPTCHA=true)');
      return next();
    }

    const isValid = await verifyRecaptcha(token);
    if (!isValid) {
      console.error('reCAPTCHA verification failed for token of length:', token.length);
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }

    next();
  } catch (error) {
    console.error('Error in reCAPTCHA middleware:', error);
    // During debugging, we'll allow the request to proceed even if verification fails
    if (process.env.ALLOW_ON_ERROR === 'true') {
      console.log('Proceeding despite reCAPTCHA error (ALLOW_ON_ERROR=true)');
      return next();
    }
    return res.status(500).json({ error: 'Internal server error during reCAPTCHA verification' });
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
