/**
 * Email service for sending emails with nodemailer
 */
const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('./logger');

// Create a transporter with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.EMAIL.USER,
    pass: config.EMAIL.PASS,
  },
});

/**
 * Send an email with the inquiry details
 * @param {object} inquiryData - The inquiry data
 * @param {object} vehicle - The vehicle data
 * @returns {Promise<object>} - The result of sending the email
 */
const sendInquiryEmail = async (inquiryData, vehicle) => {
  const { purpose, date, description, email } = inquiryData;
  
  // Format the date for better readability
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Create email content with professional HTML template
  const mailOptions = {
    from: `"Presidential Chauffeurs" <${config.EMAIL.USER}>`,
    to: config.EMAIL.TO,
    subject: `New Inquiry: ${vehicle.name} - ${purpose}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Service Inquiry</title>
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
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
          }
          .header {
            background-color: #1a1a1a;
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            color: #D0A42B;
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .content {
            padding: 20px 30px;
          }
          .inquiry-title {
            font-size: 18px;
            font-weight: bold;
            margin-top: 0;
            margin-bottom: 20px;
            color: #333333;
            border-bottom: 1px solid #eeeeee;
            padding-bottom: 10px;
          }
          .vehicle-info {
            background-color: #f9f9f7;
            border-left: 4px solid #D0A42B;
            padding: 15px;
            margin-bottom: 20px;
          }
          .vehicle-name {
            font-size: 18px;
            font-weight: bold;
            color: #D0A42B;
            margin: 0 0 5px 0;
          }
          .vehicle-description {
            color: #666666;
            margin: 0;
            font-size: 14px;
          }
          .detail-row {
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eeeeee;
          }
          .detail-label {
            font-weight: bold;
            color: #555555;
            display: inline-block;
            width: 140px;
            vertical-align: top;
          }
          .detail-value {
            color: #333333;
            display: inline-block;
          }
          .detail-value a {
            color: #D0A42B;
            text-decoration: none;
          }
          .detail-value a:hover {
            text-decoration: underline;
          }
          .note {
            margin: 20px 0;
            font-size: 14px;
          }
          .button-container {
            text-align: center;
            margin: 25px 0;
          }
          .gold-button {
            display: inline-block;
            background-color: #D0A42B;
            color: #ffffff;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #777777;
            border-top: 1px solid #e0e0e0;
          }
          .copyright {
            margin: 0 0 5px 0;
          }
          .automated-message {
            margin: 0;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Presidential Chauffeurs</h1>
          </div>
          <div class="content">
            <h2 class="inquiry-title">New Service Inquiry</h2>
            
            <div class="vehicle-info">
              <h3 class="vehicle-name">${vehicle.name}</h3>
              <p class="vehicle-description">The epitome of luxury and refinement, perfect for executive travel.</p>
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
            <div class="detail-row">
              <span class="detail-label">Additional Details:</span>
              <span class="detail-value">${description}</span>
            </div>
            ` : ''}
            
            <p class="note">This inquiry was submitted through the Presidential Chauffeurs website.</p>
            
            <div class="button-container">
              <a href="mailto:${email}?subject=Re: Inquiry about ${vehicle.name} Chauffeur Service&body=Thank you for your inquiry about our ${vehicle.name} service. We're pleased to provide you with more information." class="gold-button">Reply to Customer</a>
            </div>
          </div>
          <div class="footer">
            <p class="copyright">&copy; ${new Date().getFullYear()} Presidential Chauffeurs Inc. All rights reserved.</p>
            <p class="automated-message">This is an automated message. Please do not reply directly to this email.</p>
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
    const info = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Failed to send email', error);
    throw error;
  }
};

// Verify the email configuration on startup
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    logger.info('Email service is ready to send messages');
    return true;
  } catch (error) {
    logger.error('Email service configuration error', error);
    // Don't throw here, just log the error
    return false;
  }
};

module.exports = {
  sendInquiryEmail,
  verifyEmailConfig,
}; 