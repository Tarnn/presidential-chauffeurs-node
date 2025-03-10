/**
 * Tests for the email functionality of the Presidential Chauffeurs API
 */
const nodemailer = require('nodemailer');

// Mock nodemailer
jest.mock('nodemailer');

describe('Email Functionality', () => {
  let sendMailMock;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup mock for nodemailer
    sendMailMock = jest.fn().mockResolvedValue({
      accepted: ['recipient@example.com'],
      rejected: [],
      response: '250 Message accepted'
    });
    
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock
    });
    
    // Set environment variables for testing
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'password123';
    process.env.EMAIL_TO = 'recipient@example.com';
  });
  
  afterEach(() => {
    // Clean up environment variables
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.EMAIL_TO;
  });
  
  it('should create a transport with correct credentials', () => {
    // Import the module that uses nodemailer
    const { sendEmail } = require('../utils/email');
    
    // Check if createTransport was called with correct options
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        user: 'test@example.com',
        pass: 'password123'
      }
    });
  });
  
  it('should send an email with correct data', async () => {
    // Import the module that uses nodemailer
    const { sendEmail } = require('../utils/email');
    
    // Test data
    const emailData = {
      vehicleName: 'Rolls-Royce Phantom',
      purpose: 'Executive Airport Transfer',
      date: '2023-12-31',
      email: 'customer@example.com',
      description: 'Need pickup from JFK Airport'
    };
    
    // Call the function
    await sendEmail(emailData);
    
    // Check if sendMail was called with correct options
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      from: 'test@example.com',
      to: 'recipient@example.com',
      subject: expect.stringContaining('Inquiry for Rolls-Royce Phantom'),
      html: expect.stringContaining('Executive Airport Transfer')
    }));
    
    // Check if email contains all the required information
    const emailContent = sendMailMock.mock.calls[0][0].html;
    expect(emailContent).toContain('Rolls-Royce Phantom');
    expect(emailContent).toContain('Executive Airport Transfer');
    expect(emailContent).toContain('2023-12-31');
    expect(emailContent).toContain('customer@example.com');
    expect(emailContent).toContain('Need pickup from JFK Airport');
  });
  
  it('should handle errors when sending email fails', async () => {
    // Setup mock to reject
    sendMailMock.mockRejectedValueOnce(new Error('Failed to send email'));
    
    // Import the module that uses nodemailer
    const { sendEmail } = require('../utils/email');
    
    // Test data
    const emailData = {
      vehicleName: 'Rolls-Royce Phantom',
      purpose: 'Executive Airport Transfer',
      date: '2023-12-31',
      email: 'customer@example.com',
      description: 'Need pickup from JFK Airport'
    };
    
    // Call the function and expect it to throw
    await expect(sendEmail(emailData)).rejects.toThrow('Failed to send email');
  });
}); 