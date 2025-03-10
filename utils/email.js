/**
 * Email utility functions for the Presidential Chauffeurs API
 */
const nodemailer = require('nodemailer');

/**
 * Generates an HTML email template for chauffeur service inquiries
 * @param {Object} data - The inquiry data
 * @returns {string} - HTML email content
 */
const generateEmailTemplate = (data) => {
  const { vehicleName, purpose, date, email, description } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Presidential Chauffeurs Inquiry</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #1a1a1a;
          color: #D4AF37;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          border: 1px solid #ddd;
          border-top: none;
        }
        .vehicle-card {
          background-color: #faf9f2;
          border-left: 4px solid #D4AF37;
          padding: 15px;
          margin-bottom: 20px;
        }
        .vehicle-name {
          color: #D4AF37;
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 5px 0;
        }
        .vehicle-description {
          margin: 0;
          font-size: 14px;
        }
        .detail-row {
          display: table;
          width: 100%;
          margin-bottom: 10px;
        }
        .detail-label {
          display: table-cell;
          font-weight: bold;
          width: 150px;
        }
        .detail-value {
          display: table-cell;
        }
        .additional-details {
          margin-top: 20px;
        }
        .footer {
          background-color: #f4f4f4;
          padding: 10px 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .button {
          display: inline-block;
          background-color: #D4AF37;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PRESIDENTIAL CHAUFFEURS</h1>
      </div>
      <div class="content">
        <h2>New Service Inquiry</h2>
        
        <div class="vehicle-card">
          <h3 class="vehicle-name">${vehicleName}</h3>
          <p class="vehicle-description">The epitome of luxury and refinement, perfect for executive travel.</p>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Purpose:</div>
          <div class="detail-value">${purpose}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Requested Date:</div>
          <div class="detail-value">${date}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Customer Email:</div>
          <div class="detail-value">${email}</div>
        </div>
        
        <div class="additional-details">
          <div class="detail-label">Additional Details:</div>
          <div class="detail-value">${description}</div>
        </div>
        
        <p>This inquiry was submitted through the Presidential Chauffeurs website.</p>
        
        <a href="#" class="button">Reply to Customer</a>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Presidential Chauffeurs Inc. All rights reserved.</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Sends an email with the inquiry details
 * @param {Object} data - The inquiry data
 * @returns {Promise} - Resolves when email is sent
 */
const sendEmail = async (data) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // Generate email content
  const html = generateEmailTemplate(data);

  // Setup email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: `Inquiry for ${data.vehicleName} - Presidential Chauffeurs`,
    html,
    replyTo: data.email // Set reply-to as the customer's email
  };

  // Send email
  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmail,
  generateEmailTemplate
}; 