/**
 * Aikira Terminal - Server
 * Main server file for the Aikira Terminal application
 */

// Import dependencies
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

// Import controllers
const proposalController = require('./backend/controllers/proposal-controller');
const speechController = require('./backend/controllers/speech-controller');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Define constants
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// API routes
app.use('/api/proposal', proposalController);

// System status endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Serve the main HTML file for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Server Error',
    message: err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║      AIKIRA TERMINAL SERVER               ║
  ║                                           ║
  ║      Running on port: ${PORT.toString().padEnd(18)}║
  ║      Environment: ${NODE_ENV.padEnd(20)}║
  ║      Status: Active                       ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);

  console.log(`Visit: http://localhost:${PORT}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In a production environment, you might want to notify administrators
  // and gracefully shut down the server
  if (NODE_ENV === 'production') {
    console.log('Shutting down due to uncaught exception');
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // In a production environment, you might want to notify administrators
  // but keep the server running
});