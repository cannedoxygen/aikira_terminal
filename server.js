/**
 * Aikira Terminal - Server
 * Main server file for the Aikira Terminal application with OpenAI integration
 */

// Import dependencies
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const axios = require('axios');

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

// OpenAI integration endpoint
app.post('/api/openai/generate-response', async (req, res) => {
  try {
    const { proposal } = req.body;
    
    if (!proposal) {
      return res.status(400).json({
        success: false,
        error: 'Proposal text is required'
      });
    }
    
    // Your OpenAI API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }
    
    // Create a system prompt that guides the AI to respond like Aikira
    const systemPrompt = `You are Aikira, a Constitutional AI governance system that evaluates proposals based on three core principles: 
    1. Primary Directive: "Maximize value with fairness and protection"
    2. Governance Approach: "Deliberative analysis of community proposals" 
    3. Execution Protocol: "Automated on-chain implementation"
    
    Evaluate the user's governance proposal and provide a thoughtful response that:
    - Assesses the fairness, value alignment, and protection aspects
    - Uses metrics (as percentages) to quantify the alignment with constitutional values
    - Provides constructive feedback and suggestions for improvement
    - Maintains a formal yet approachable tone using elegant language
    - Keeps responses concise (3-5 sentences)`;
    
    // Make request to OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', // or 'gpt-4' if you have access
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: proposal }
        ],
        temperature: 0.7,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Extract AI response
    const aiResponse = response.data.choices[0].message.content;
    
    // Generate metrics based on content analysis
    // This is a simple implementation - in a more advanced version,
    // you could extract these values from the AI response using NLP
    const metrics = {
      fairness: Math.floor(Math.random() * 20) + 70, // 70-90%
      value: Math.floor(Math.random() * 30) + 65, // 65-95%
      protection: Math.floor(Math.random() * 15) + 80, // 80-95%
    };
    
    // Calculate consensus
    const consensus = Math.floor((metrics.fairness + metrics.value + metrics.protection) / 3);
    
    return res.status(200).json({
      success: true,
      response: aiResponse,
      metrics: metrics,
      consensus: consensus
    });
    
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: 'Error generating AI response'
    });
  }
});

// Speech-to-text endpoint (for future implementation with Whisper)
app.post('/api/speech/transcribe', (req, res) => {
  // This is a placeholder for future Whisper API integration
  // For now, it returns a mock response
  res.json({
    success: true,
    text: "Sample transcription of voice input for governance proposal evaluation."
  });
});

// Text-to-speech endpoint (for future implementation with Eleven Labs)
app.post('/api/speech/generate', (req, res) => {
  // This is a placeholder for future Eleven Labs API integration
  // For now, it returns a mock response
  res.json({
    success: true,
    audio_url: "/assets/audio/sample-response.mp3"
  });
});

// System status endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    environment: NODE_ENV,
    constitutional_alignment: 'Active',
    voice_services: process.env.OPENAI_API_KEY ? 'Available' : 'Unavailable',
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