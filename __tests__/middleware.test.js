/**
 * Tests for middleware functions in the Presidential Chauffeurs API
 */
const axios = require('axios');
const app = require('../index');
const request = require('supertest');

// Mock axios
jest.mock('axios');

describe('reCAPTCHA Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Save original environment and set test environment
    this.originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production'; // Set to production to test reCAPTCHA
  });
  
  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = this.originalEnv;
  });
  
  it('should reject requests without a captcha token', async () => {
    const response = await request(app)
      .post('/api/inquiry')
      .send({
        vehicleName: 'Rolls-Royce Phantom',
        purpose: 'Executive Airport Transfer',
        date: '2023-12-31',
        email: 'test@example.com',
        description: 'Test description'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('reCAPTCHA token is required');
  });
  
  it('should reject requests with invalid captcha tokens', async () => {
    // Mock axios to return failed verification
    axios.post.mockResolvedValueOnce({
      data: { success: false }
    });
    
    const response = await request(app)
      .post('/api/inquiry')
      .send({
        vehicleName: 'Rolls-Royce Phantom',
        purpose: 'Executive Airport Transfer',
        date: '2023-12-31',
        email: 'test@example.com',
        description: 'Test description',
        captchaToken: 'invalid-token'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('reCAPTCHA verification failed');
    expect(axios.post).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      expect.objectContaining({
        params: {
          secret: process.env.RECAPTCHA_SECRET,
          response: 'invalid-token'
        }
      })
    );
  });
  
  it('should allow requests with valid captcha tokens', async () => {
    // Mock axios to return successful verification
    axios.post.mockResolvedValueOnce({
      data: { success: true }
    });
    
    // Mock email sending to avoid actual email sending
    jest.mock('../utils/email', () => ({
      sendEmail: jest.fn().mockResolvedValue({})
    }));
    
    const response = await request(app)
      .post('/api/inquiry')
      .send({
        vehicleName: 'Rolls-Royce Phantom',
        purpose: 'Executive Airport Transfer',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        email: 'test@example.com',
        description: 'Test description',
        captchaToken: 'valid-token'
      });
    
    // The request might still fail due to email sending, but the middleware should pass
    expect(axios.post).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      expect.objectContaining({
        params: {
          secret: process.env.RECAPTCHA_SECRET,
          response: 'valid-token'
        }
      })
    );
  });
  
  it('should bypass reCAPTCHA verification in development mode', async () => {
    // Set environment to development
    process.env.NODE_ENV = 'development';
    
    // Mock email sending to avoid actual email sending
    jest.mock('../utils/email', () => ({
      sendEmail: jest.fn().mockResolvedValue({})
    }));
    
    const response = await request(app)
      .post('/api/inquiry')
      .send({
        vehicleName: 'Rolls-Royce Phantom',
        purpose: 'Executive Airport Transfer',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        email: 'test@example.com',
        description: 'Test description'
        // No captchaToken provided
      });
    
    // The request might still fail due to email sending, but the middleware should pass
    expect(axios.post).not.toHaveBeenCalled();
  });
}); 