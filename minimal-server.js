// Minimal Express server with no dependencies
const express = require('express');
const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    message: 'Server is running'
  });
});

// Handle all other routes
app.use('*', (req, res) => {
  res.status(200).json({ 
    message: 'Minimal server is running',
    path: req.originalUrl
  });
});

// Export for serverless
module.exports = app; 