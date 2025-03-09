// Simple Express server for debugging Vercel deployment issues
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Log environment variables (without showing their values)
console.log('Available environment variables:', Object.keys(process.env).filter(key => 
  !key.startsWith('VERCEL_') && !key.startsWith('AWS_') && !key.startsWith('NODE_')
));

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Echo endpoint to test basic functionality
app.get('/echo/:message', (req, res) => {
  res.status(200).json({ 
    message: req.params.message,
    timestamp: new Date().toISOString()
  });
});

// Simple API endpoint
app.get('/api/vehicles', (req, res) => {
  res.status(200).json([
    { id: 1, name: "Test Vehicle" }
  ]);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: err.message 
  });
});

// Handle all other routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server if running directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export for serverless
module.exports = app; 