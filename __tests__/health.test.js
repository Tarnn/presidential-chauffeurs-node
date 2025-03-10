/**
 * Tests for the health endpoint of the Presidential Chauffeurs API
 */
const request = require('supertest');
const app = require('../index');

describe('Health Endpoint', () => {
  it('should return 200 status code', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });
  
  it('should return JSON response with status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('status', 'ok');
  });
  
  it('should include timestamp in response', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('timestamp');
    
    // Verify timestamp is a valid ISO date string
    const timestamp = new Date(response.body.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.toISOString()).toBe(response.body.timestamp);
  });
  
  it('should include vehiclesLoaded status in response', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('vehiclesLoaded');
    expect(typeof response.body.vehiclesLoaded).toBe('boolean');
  });
  
  it('should have correct content-type header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });
}); 