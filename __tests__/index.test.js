/**
 * Tests for the Presidential Chauffeurs API
 */
const request = require('supertest');
const app = require('../index');

// Mock nodemailer
jest.mock('nodemailer');
const nodemailer = require('nodemailer');

// Mock transporter
const mockTransporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  verify: jest.fn().mockResolvedValue(true)
};

// Mock axios for reCAPTCHA verification
jest.mock('axios');
const axios = require('axios');

describe('Presidential Chauffeurs API', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup nodemailer mock
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    
    // Setup axios mock for reCAPTCHA verification
    axios.post.mockResolvedValue({
      data: {
        success: true,
        score: 0.9
      }
    });
  });

  describe('GET /health', () => {
    it('should return 200 OK with status information', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('emailEnabled');
    });
  });

  describe('POST /api/inquiry', () => {
    const validInquiry = {
      vehicleId: 1,
      vehicleName: 'Rolls-Royce Phantom',
      purpose: 'Executive Airport Transfer',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      email: 'test@example.com',
      description: 'Test description',
      captchaToken: 'TESTING_TOKEN'
    };

    it('should return 200 OK with success message when all fields are valid', async () => {
      const response = await request(app)
        .post('/api/inquiry')
        .send(validInquiry);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Inquiry received successfully');
      expect(response.body).toHaveProperty('emailSent');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('vehicle', 'Rolls-Royce Phantom');
    });

    it('should return 400 Bad Request when required fields are missing', async () => {
      const invalidInquiry = { ...validInquiry };
      delete invalidInquiry.purpose;
      
      const response = await request(app)
        .post('/api/inquiry')
        .send(invalidInquiry);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Missing required fields');
    });

    it('should return 400 Bad Request when email format is invalid', async () => {
      const invalidInquiry = { 
        ...validInquiry,
        email: 'invalid-email'
      };
      
      const response = await request(app)
        .post('/api/inquiry')
        .send(invalidInquiry);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Invalid email format');
    });

    it('should return 404 Not Found when vehicle ID is invalid', async () => {
      const invalidInquiry = { 
        ...validInquiry,
        vehicleId: 999 // Non-existent vehicle ID
      };
      
      const response = await request(app)
        .post('/api/inquiry')
        .send(invalidInquiry);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Vehicle not found');
    });

    it('should still succeed even if email sending fails', async () => {
      // Mock email sending failure
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('Email sending failed'));
      
      const response = await request(app)
        .post('/api/inquiry')
        .send(validInquiry);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('emailSent', false);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body).toHaveProperty('path', '/non-existent-route');
    });
  });
}); 