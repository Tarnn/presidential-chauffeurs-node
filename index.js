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
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    return response.data.success;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
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

  // Allow test token for testing in production
  if (req.body.captchaToken === 'TESTING_TOKEN') {
    console.log('Using test token for reCAPTCHA verification');
    return next();
  }

  const token = req.body.captchaToken;
  if (!token) {
    return res.status(400).json({ error: 'reCAPTCHA token is required' });
  }

  const isValid = await verifyRecaptcha(token);
  if (!isValid) {
    return res.status(400).json({ error: 'reCAPTCHA verification failed' });
  }

  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    vehiclesLoaded: vehiclesData.length > 0
  });
});

// Inquiry endpoint
app.post('/api/inquiry', recaptchaMiddleware, async (req, res) => {
  try {
    const { vehicleId, vehicleName, purpose, date, email, description } = req.body;

    // Validate required fields
    if (!vehicleName || !purpose || !date || !email || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate date (must be in the future)
    const inquiryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (inquiryDate < today) {
      return res.status(400).json({ error: 'Date must be in the future' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Send email
    await sendEmail({
      vehicleName,
      purpose,
      date,
      email,
      description
    });

    // Log successful inquiry
    console.log(`Inquiry received for ${vehicleName} on ${date} from ${email}`);

    res.status(200).json({ message: 'Inquiry sent successfully' });
  } catch (error) {
    console.error('Error processing inquiry:', error);
    res.status(500).json({ error: 'Failed to process inquiry' });
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
