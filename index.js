// Enhanced server with email functionality and robust error handling
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Create Express app
const app = express();

// Apply middleware
app.use(express.json());
app.use(cors());

// Initialize email transporter with error handling
let transporter = null;
try {
  // Only initialize if email credentials are available
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    console.log('Email transporter initialized');
  } else {
    console.log('Email credentials not found, email functionality disabled');
  }
} catch (error) {
  console.error('Failed to initialize email transporter:', error.message);
}

// Load vehicles data
const vehicles = [
  {
    "id": 1,
    "name": "Rolls-Royce Phantom",
    "description": "The epitome of luxury and refinement, perfect for executive travel.",
    "rate": 1500
  },
  {
    "id": 2,
    "name": "Bentley Mulsanne",
    "description": "A masterpiece of British craftsmanship, ideal for sophisticated journeys.",
    "rate": 1200
  },
  {
    "id": 3,
    "name": "Mercedes-Maybach S-Class",
    "description": "Unmatched elegance and comfort for the discerning traveler.",
    "rate": 1300
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    emailEnabled: !!transporter
  });
});

// Get all vehicles
app.get('/api/vehicles', (req, res) => {
  res.json(vehicles);
});

// Helper function to send email
async function sendEmail(data, vehicle) {
  if (!transporter) {
    throw new Error('Email transporter not initialized');
  }
  
  const { purpose, date, email, description } = data;
  
  // Format the date for better readability
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Create email content
  const mailOptions = {
    from: `"Presidential Chauffeurs" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject: `New Inquiry: ${vehicle.name} - ${purpose}`,
    html: `
      <h2>New Chauffeur Service Inquiry</h2>
      <p><strong>Vehicle:</strong> ${vehicle.name}</p>
      <p><strong>Purpose:</strong> ${purpose}</p>
      <p><strong>Requested Date:</strong> ${formattedDate}</p>
      <p><strong>Customer Email:</strong> <a href="mailto:${email}">${email}</a></p>
      ${description ? `<p><strong>Additional Details:</strong> ${description}</p>` : ''}
      <hr>
      <p>This inquiry was submitted through the Presidential Chauffeurs website.</p>
    `,
    text: `
New Chauffeur Service Inquiry

Vehicle: ${vehicle.name}
Purpose: ${purpose}
Requested Date: ${formattedDate}
Customer Email: ${email}
${description ? `Additional Details: ${description}` : ''}

This inquiry was submitted through the Presidential Chauffeurs website.
    `,
    replyTo: email
  };
  
  return transporter.sendMail(mailOptions);
}

// Inquiry endpoint with email sending
app.post('/api/inquiry', async (req, res) => {
  try {
    const { vehicleId, purpose, date, email, description, captchaToken } = req.body;
    
    // Basic validation
    if (!vehicleId || !purpose || !date || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Find vehicle
    const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    // Verify reCAPTCHA if token provided and not in development mode
    if (captchaToken && process.env.RECAPTCHA_SECRET && process.env.NODE_ENV === 'production') {
      try {
        // Skip for testing token
        if (captchaToken !== 'TESTING_TOKEN') {
          const recaptchaResponse = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${captchaToken}`
          );
          
          if (!recaptchaResponse.data.success) {
            return res.status(400).json({
              success: false,
              message: 'CAPTCHA verification failed'
            });
          }
        }
      } catch (error) {
        console.error('reCAPTCHA verification error:', error.message);
        // Continue without failing the request
      }
    }
    
    // Try to send email if transporter is available
    let emailSent = false;
    if (transporter) {
      try {
        await sendEmail({ purpose, date, email, description }, vehicle);
        emailSent = true;
        console.log('Email sent successfully');
      } catch (error) {
        console.error('Failed to send email:', error.message);
        // Continue without failing the request
      }
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Inquiry received successfully',
      emailSent,
      data: {
        vehicle: vehicle.name,
        inquiryDate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing inquiry'
    });
  }
});

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: err.message 
  });
});

// Export for serverless
module.exports = app;
