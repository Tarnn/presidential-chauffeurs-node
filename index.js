require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const cors = require("cors");
const vehicles = require("./vehicles.json");

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" })); // Enable CORS for frontend

// Rate limiting: 10 requests per hour per IP
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
});
app.use("/api/inquiry", limiter);

// Email setup using environment variables
// Note: If Gmail authentication continues to be an issue, consider using a transactional email service
// like SendGrid, Mailgun, or Amazon SES instead, which are more reliable for production use.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Routes
app.get("/api/vehicles", (req, res) => {
  res.json(vehicles);
});

app.post("/api/inquiry", async (req, res) => {
  console.log("Received inquiry request:", req.body);
  const { vehicleId, vehicleName, purpose, date, description, email, captchaToken } = req.body;
  
  // Convert vehicleId to number if it's a string
  const vehicleIdNum = typeof vehicleId === 'string' ? parseInt(vehicleId) : vehicleId;
  const vehicle = vehicles.find((v) => v.id === vehicleIdNum);

  console.log("Extracted data:", { vehicleId, vehicleIdNum, vehicleName, purpose, date, email });
  console.log("Found vehicle:", vehicle);

  if (!vehicle || !purpose || !date || !email) {
    console.log("Missing fields:", {
      vehicleFound: !!vehicle,
      purposeProvided: !!purpose,
      dateProvided: !!date,
      emailProvided: !!email
    });
    return res.status(400).send("Missing required fields");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send("Invalid email format");
  }

  // Skip reCAPTCHA verification if in development mode or if token is 'TESTING_TOKEN'
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isTestingToken = captchaToken === 'TESTING_TOKEN';
  
  if (!isDevelopment && !isTestingToken && captchaToken) {
    // Verify reCAPTCHA using environment variable
    const secretKey = process.env.RECAPTCHA_SECRET;
    try {
      const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`
      );
      
      // For reCAPTCHA v3, we need to check the score
      if (!response.data.success) {
        return res.status(400).send("CAPTCHA verification failed");
      }
      
      // Check the score for reCAPTCHA v3 (0.0 to 1.0, where 1.0 is very likely a good interaction)
      // You can adjust the threshold based on your security requirements
      if (response.data.score < 0.5) {
        return res.status(400).send("CAPTCHA score too low, possible bot activity");
      }
      
      // Check if the action matches what we expect
      if (response.data.action && response.data.action !== 'vehicleInquiry') {
        return res.status(400).send("CAPTCHA action mismatch");
      }
    } catch (error) {
      console.error("reCAPTCHA verification error:", error);
      return res.status(500).send("Error verifying CAPTCHA");
    }
  } else {
    console.log("reCAPTCHA verification bypassed for testing");
  }

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
    to: "presidentialchauffeursinc@gmail.com", // Send to the same email address
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
          }
          .content {
            background-color: #ffffff;
            padding: 30px;
            border-left: 1px solid #dddddd;
            border-right: 1px solid #dddddd;
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
          }
          .detail-label {
            font-weight: bold;
            color: #555555;
          }
          .detail-value {
            color: #333333;
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
              
              <div class="detail-row">
                <span class="detail-label">Vehicle:</span>
                <span class="detail-value">${vehicle.name}</span>
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
                <span class="detail-value"><a href="mailto:${email}">${email}</a></span>
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
            <p>You can reply directly to the customer by clicking the button below or replying to this email.</p>
            
            <div style="text-align: center;">
              <a href="mailto:${email}?subject=Re: Inquiry about ${vehicle.name} Chauffeur Service&body=Thank you for your inquiry about our ${vehicle.name} service. We're pleased to provide you with more information." class="gold-button">Reply to Customer</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Presidential Chauffeurs Inc. All rights reserved.</p>
            <p>This is an automated message, please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    // Also include plain text version for email clients that don't support HTML
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
    replyTo: email // Set the reply-to field to the customer's email
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    res.status(200).send("Inquiry sent successfully");
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).send("Error sending inquiry email");
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
});
