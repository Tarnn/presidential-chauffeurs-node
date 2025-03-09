/**
 * Environment variables configuration with validation
 */
require('dotenv').config();

// Required environment variables
const requiredEnvVars = [
  'EMAIL_USER',
  'EMAIL_PASS',
  'RECAPTCHA_SECRET'
];

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  
  // Email configuration
  EMAIL: {
    USER: process.env.EMAIL_USER,
    PASS: process.env.EMAIL_PASS,
    TO: process.env.EMAIL_TO || process.env.EMAIL_USER, // Default to sending to self
  },
  
  // reCAPTCHA configuration
  RECAPTCHA: {
    SECRET: process.env.RECAPTCHA_SECRET,
    SCORE_THRESHOLD: parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.5'),
  },
  
  // CORS configuration
  CORS: {
    ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  // Rate limiting configuration
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || (60 * 60 * 1000).toString(), 10), // 1 hour default
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX || '10', 10), // 10 requests per window default
  },
  
  // Determine if we're in development mode
  isDevelopment: () => process.env.NODE_ENV === 'development',
  
  // Determine if we're in production mode
  isProduction: () => process.env.NODE_ENV === 'production',
}; 