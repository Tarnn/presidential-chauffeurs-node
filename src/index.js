/**
 * Main server file for Presidential Chauffeurs API
 */
const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const logger = require('./utils/logger');
const emailService = require('./utils/emailService');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes/api');

// Create Express app
const app = express();

// Apply middleware
app.use(express.json());
app.use(cors({ origin: config.CORS.ORIGIN }));
app.use(requestLogger);

// Apply API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: config.NODE_ENV });
});

// Handle 404 errors
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start the server
const startServer = async () => {
  try {
    // Verify email configuration
    await emailService.verifyEmailConfig();
    
    // Start listening
    const port = config.PORT;
    app.listen(port, () => {
      logger.info(`Server running on port ${port} in ${config.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

// Export for testing
module.exports = app; 