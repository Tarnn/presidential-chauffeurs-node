/**
 * Tests for data loading functionality in the Presidential Chauffeurs API
 */
const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}));

describe('Vehicle Data Loading', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Reset module cache to ensure fresh imports
    jest.resetModules();
  });
  
  it('should load vehicle data from JSON file', () => {
    // Mock data
    const mockVehicles = [
      {
        id: 1,
        name: 'Rolls-Royce Phantom',
        description: 'The epitome of luxury and refinement, perfect for executive travel.',
        rate: 1500
      },
      {
        id: 2,
        name: 'Bentley Mulsanne',
        description: 'A masterpiece of British craftsmanship, ideal for sophisticated journeys.',
        rate: 1200
      }
    ];
    
    // Setup mock for fs.readFileSync
    fs.readFileSync.mockReturnValue(JSON.stringify(mockVehicles));
    fs.existsSync.mockReturnValue(true);
    
    // Import the module that loads vehicle data
    const app = require('../index');
    
    // Check if readFileSync was called with correct path
    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining(path.join('data', 'vehicles.json')),
      'utf8'
    );
  });
  
  it('should handle errors when loading vehicle data', () => {
    // Setup mock to throw an error
    const errorMessage = 'File not found';
    fs.readFileSync.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    fs.existsSync.mockReturnValue(false);
    
    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    try {
      // Import the module that loads vehicle data
      require('../index');
    } catch (error) {
      // Check if error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Error loading vehicle data');
    }
    
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
}); 