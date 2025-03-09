// Enhanced server with basic API functionality
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Apply middleware
app.use(express.json());
app.use(cors());

// Load vehicles data
const vehicles = [
  {
    "id": 1,
    "name": "Rolls-Royce Phantom",
    "description": "The epitome of luxury and refinement, perfect for executive travel.",
    "rate": 1500
  },
  {
    "id": 2,
    "name": "Bentley Mulsanne",
    "description": "A masterpiece of British craftsmanship, ideal for sophisticated journeys.",
    "rate": 1200
  },
  {
    "id": 3,
    "name": "Mercedes-Maybach S-Class",
    "description": "Unmatched elegance and comfort for the discerning traveler.",
    "rate": 1300
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Get all vehicles
app.get('/api/vehicles', (req, res) => {
  res.json(vehicles);
});

// Simple inquiry endpoint (without email sending)
app.post('/api/inquiry', (req, res) => {
  const { vehicleId, purpose, date, email, captchaToken } = req.body;
  
  // Basic validation
  if (!vehicleId || !purpose || !date || !email) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }
  
  // Find vehicle
  const vehicle = vehicles.find(v => v.id === parseInt(vehicleId));
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found'
    });
  }
  
  // Log the inquiry (instead of sending email)
  console.log('Received inquiry:', {
    vehicle: vehicle.name,
    purpose,
    date,
    email
  });
  
  // Return success response
  res.status(200).json({
    success: true,
    message: 'Inquiry received successfully',
    data: {
      vehicle: vehicle.name,
      inquiryDate: new Date().toISOString()
    }
  });
});

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: err.message 
  });
});

// Export for serverless
module.exports = app;
