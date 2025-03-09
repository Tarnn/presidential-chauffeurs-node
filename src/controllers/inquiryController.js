/**
 * Controller for handling inquiry submissions
 */
const vehicles = require('../../vehicles.json');
const logger = require('../utils/logger');
const emailService = require('../utils/emailService');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Validate inquiry data
 * @param {object} data - Inquiry data to validate
 * @returns {object} - Validated data or throws error
 */
const validateInquiryData = (data) => {
  const { vehicleId, purpose, date, email } = data;
  
  // Check required fields
  if (!vehicleId) {
    throw new ApiError(400, 'Vehicle ID is required');
  }
  
  if (!purpose || !purpose.trim()) {
    throw new ApiError(400, 'Purpose is required');
  }
  
  if (!date) {
    throw new ApiError(400, 'Date is required');
  }
  
  if (!email || !email.trim()) {
    throw new ApiError(400, 'Email is required');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Invalid email format');
  }
  
  // Validate date is in the future
  const selectedDate = new Date(date);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Reset time part for proper comparison
  
  if (isNaN(selectedDate.getTime())) {
    throw new ApiError(400, 'Invalid date format');
  }
  
  // In development mode, we'll be more lenient with dates for testing
  const config = require('../config/env');
  if (selectedDate < currentDate && !config.isDevelopment()) {
    throw new ApiError(400, 'Date must be in the future');
  } else if (selectedDate < currentDate) {
    logger.warn('Accepting past date in development mode', { date, selectedDate }, null);
  }
  
  return data;
};

/**
 * Find vehicle by ID
 * @param {number|string} vehicleId - Vehicle ID to find
 * @returns {object} - Vehicle object or throws error
 */
const findVehicle = (vehicleId) => {
  // Convert vehicleId to number if it's a string
  const vehicleIdNum = typeof vehicleId === 'string' ? parseInt(vehicleId, 10) : vehicleId;
  
  // Find the vehicle
  const vehicle = vehicles.find((v) => v.id === vehicleIdNum);
  
  if (!vehicle) {
    throw new ApiError(404, `Vehicle with ID ${vehicleId} not found`);
  }
  
  return vehicle;
};

/**
 * Handle inquiry submission
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const submitInquiry = async (req, res, next) => {
  try {
    const inquiryData = req.body;
    logger.debug('Processing inquiry submission', { inquiryData }, req.requestId);
    
    // Validate inquiry data
    const validatedData = validateInquiryData(inquiryData);
    
    // Find the vehicle
    const vehicle = findVehicle(validatedData.vehicleId);
    
    // Send email
    await emailService.sendInquiryEmail(validatedData, vehicle);
    
    logger.info('Inquiry submitted successfully', { 
      vehicleId: vehicle.id, 
      vehicleName: vehicle.name 
    }, req.requestId);
    
    res.status(200).json({
      success: true,
      message: 'Inquiry sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all vehicles
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const getVehicles = (req, res, next) => {
  try {
    res.json(vehicles);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitInquiry,
  getVehicles
}; 