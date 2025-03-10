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
          color: #fff;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          border: 1px solid #ddd;
          border-top: none;
        }
        .footer {
          background-color: #f4f4f4;
          padding: 10px 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        h1 {
          color: #gold;
          margin: 0;
        }
        h2 {
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
        }
        .detail {
          margin-bottom: 15px;
        }
        .label {
          font-weight: bold;
          display: inline-block;
          width: 120px;
        }
        .value {
          display: inline-block;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Presidential Chauffeurs</h1>
        <p>Luxury Transportation Service</p>
      </div>
      <div class="content">
        <h2>New Chauffeur Service Inquiry</h2>
        <div class="detail">
          <span class="label">Vehicle:</span>
          <span class="value">${vehicleName}</span>
        </div>
        <div class="detail">
          <span class="label">Purpose:</span>
          <span class="value">${purpose}</span>
        </div>
        <div class="detail">
          <span class="label">Date:</span>
          <span class="value">${date}</span>
        </div>
        <div class="detail">
          <span class="label">Contact Email:</span>
          <span class="value">${email}</span>
        </div>
        <div class="detail">
          <span class="label">Description:</span>
          <span class="value">${description}</span>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated message from the Presidential Chauffeurs website.</p>
        <p>&copy; ${new Date().getFullYear()} Presidential Chauffeurs. All rights reserved.</p>
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
    html
  };

  // Send email
  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmail,
  generateEmailTemplate
}; 