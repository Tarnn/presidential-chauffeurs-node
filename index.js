// Root index.js file
console.log('Starting server from root index.js');

// Import the minimal server
const app = require('./minimal-server.js');

// Export for serverless
module.exports = app;
