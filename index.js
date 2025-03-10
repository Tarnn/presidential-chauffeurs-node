/**
 * Presidential Chauffeurs API
 * 
 * This is the main server file for the Presidential Chauffeurs API.
 * It handles vehicle inquiries and sends email notifications.
 */
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

// Load vehicles data (used internally for inquiry processing)
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

/**
 * Health check endpoint
 * Used to verify the server is running and check its status
 */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    emailEnabled: !!transporter
  });
});

/**
 * Send email function
 * Handles formatting and sending emails for inquiries
 * 
 * @param {Object} data - The inquiry data
 * @param {Object} vehicle - The vehicle data
 * @returns {Promise} - The result of sending the email
 */
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
  
  // Create email content with professional HTML template
  const mailOptions = {
    from: `"Presidential Chauffeurs" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject: `New Inquiry: ${vehicle.name} - ${purpose}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Chauffeur Service Inquiry</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #1a1a1a;
            padding: 20px;
            text-align: center;
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
          }
          .header h1 {
            color: #D0A42B;
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .content {
            background-color: #ffffff;
            padding: 30px;
            border-left: 1px solid #dddddd;
            border-right: 1px solid #dddddd;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .inquiry-details {
            margin-bottom: 25px;
          }
          .inquiry-details h2 {
            color: #1a1a1a;
            font-size: 18px;
            margin-top: 0;
            margin-bottom: 15px;
            border-bottom: 1px solid #eeeeee;
            padding-bottom: 10px;
          }
          .detail-row {
            margin-bottom: 12px;
            display: flex;
            flex-wrap: wrap;
          }
          .detail-label {
            font-weight: bold;
            color: #555555;
            width: 140px;
            padding-right: 10px;
          }
          .detail-value {
            color: #333333;
            flex: 1;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #777777;
            border-bottom-left-radius: 5px;
            border-bottom-right-radius: 5px;
            border: 1px solid #dddddd;
          }
          .gold-button {
            display: inline-block;
            background-color: #D0A42B;
            color: #1a1a1a;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: bold;
            margin-top: 15px;
          }
          .divider {
            height: 1px;
            background-color: #eeeeee;
            margin: 20px 0;
          }
          .logo {
            margin-bottom: 10px;
          }
          .highlight {
            background-color: #f9f7f0;
            border-left: 3px solid #D0A42B;
            padding: 15px;
            margin: 15px 0;
          }
          .vehicle-name {
            color: #D0A42B;
            font-weight: bold;
            font-size: 18px;
          }
          .cta-container {
            text-align: center;
            margin: 25px 0 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PRESIDENTIAL CHAUFFEURS</h1>
          </div>
          <div class="content">
            <div class="inquiry-details">
              <h2>New Service Inquiry</h2>
              
              <div class="highlight">
                <div class="vehicle-name">${vehicle.name}</div>
                <div>${vehicle.description}</div>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Purpose:</span>
                <span class="detail-value">${purpose}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Requested Date:</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Customer Email:</span>
                <span class="detail-value"><a href="mailto:${email}" style="color: #D0A42B; text-decoration: none;">${email}</a></span>
              </div>
              
              ${description ? `
              <div class="divider"></div>
              <div class="detail-row">
                <span class="detail-label">Additional Details:</span>
                <span class="detail-value">${description}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="divider"></div>
            
            <p>This inquiry was submitted through the Presidential Chauffeurs website.</p>
            
            <div class="cta-container">
              <a href="mailto:${email}?subject=Re: Inquiry about ${vehicle.name} Chauffeur Service&body=Thank you for your inquiry about our ${vehicle.name} service. We're pleased to provide you with more information." class="gold-button">Reply to Customer</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Presidential Chauffeurs Inc. All rights reserved.</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
NEW CHAUFFEUR SERVICE INQUIRY

Vehicle: ${vehicle.name}
Purpose: ${purpose}
Requested Date: ${formattedDate}
Customer Email: ${email}
${description ? `Additional Details: ${description}` : ''}

This inquiry was submitted through the Presidential Chauffeurs website.
You can reply directly to the customer by replying to this email.

© ${new Date().getFullYear()} Presidential Chauffeurs Inc.
    `,
    replyTo: email
  };
  
  return transporter.sendMail(mailOptions);
}

/**
 * Inquiry submission endpoint
 * Handles vehicle inquiry submissions and sends email notifications
 */
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

/**
 * 404 handler for routes that don't exist
 */
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: err.message 
  });
});

// Start server if running directly (not in serverless environment)
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

// Export for serverless
module.exports = app;
