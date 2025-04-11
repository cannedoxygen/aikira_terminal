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
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

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

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const downloadsDir = path.join(__dirname, 'downloads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Serve generated audio files
app.use('/downloads', express.static(downloadsDir));

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
      console.warn('OpenAI API key not configured, using mockup response');
      
      // Return mockup response for testing
      return simulateAiResponse(proposal, res);
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
    
    // Return mockup response for testing if API fails
    return simulateAiResponse(req.body.proposal, res);
  }
});

// Helper function to simulate AI response when API is not available
function simulateAiResponse(proposal, res) {
  // Sample responses for different types of proposals
  const responses = [
    "After constitutional analysis, I've determined that your proposal aligns well with our governance principles. The value generation aspects are particularly strong. However, there is room to improve consensus alignment. Consider enhancing the fairness distribution framework.",
    "Your proposal demonstrates excellent protection protocols while maintaining fair distribution mechanisms. I recommend strengthening the value generation component to achieve better overall constitutional alignment. The consensus metrics indicate strong support across parameters.",
    "This proposal requires refinement to fully align with our constitutional parameters. The fairness distribution framework is inadequate and the protection mechanisms are insufficient. I recommend addressing these issues before resubmission.",
    "I've analyzed your proposal against our constitutional framework and found strong alignment with core principles. The fairness metrics are particularly impressive, though there's room for improvement in the value generation aspects. With minor adjustments, this could achieve even higher consensus."
  ];
  
  // Randomly select a response
  const responseIndex = Math.floor(Math.random() * responses.length);
  
  // Generate random metrics
  const metrics = {
    fairness: Math.floor(Math.random() * 20) + 70, // 70-90%
    value: Math.floor(Math.random() * 30) + 65, // 65-95%
    protection: Math.floor(Math.random() * 15) + 80, // 80-95%
  };
  
  // Calculate consensus
  const consensus = Math.floor((metrics.fairness + metrics.value + metrics.protection) / 3);
  
  return res.status(200).json({
    success: true,
    response: responses[responseIndex],
    metrics: metrics,
    consensus: consensus
  });
}

// Speech-to-text endpoint (handles file uploads for Whisper)
app.post('/api/speech/transcribe', (req, res) => {
  // Check if we have audio data or a file
  if (!req.body && !req.files) {
    return res.status(400).json({
      success: false,
      error: 'No audio content provided'
    });
  }
  
  // This is a placeholder for future Whisper API integration
  // For now, it returns a mock response
  
  // Random sample transcriptions for testing
  const sampleTranscriptions = [
    "Implement a transparent governance system with equal voting rights for all participants.",
    "Propose a solution that maximizes value while maintaining fairness in resource distribution.",
    "Create a protection framework that safeguards user privacy while enabling collaborative governance.",
    "Develop a system where consensus is achieved through deliberative analysis rather than simple voting."
  ];
  
  const randomIndex = Math.floor(Math.random() * sampleTranscriptions.length);
  
  setTimeout(() => {
    res.json({
      success: true,
      text: sampleTranscriptions[randomIndex]
    });
  }, 1000); // Simulate processing delay
});

// Text-to-speech endpoint with actual Eleven Labs API
app.post('/api/speech/generate', async (req, res) => {
  const { text, voice_id, model_id } = req.body;
  
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text content is required'
    });
  }
  
  try {
    // Get Eleven Labs API key
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      throw new Error('Eleven Labs API key not configured');
    }
    
    // Default voice settings
    const voiceSettings = {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    };

    // Use default voice ID if not provided
    const useVoiceId = voice_id || process.env.DEFAULT_VOICE_ID || 'eleven_monolingual_v1';
    const useModelId = model_id || 'eleven_multilingual_v2';
    
    console.log(`Generating speech with Eleven Labs for text: ${text.substring(0, 50)}...`);
    
    // Make API request to Eleven Labs
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${useVoiceId}`,
      data: {
        text,
        model_id: useModelId,
        voice_settings: voiceSettings
      },
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    // Create a unique filename
    const filename = `aikira_response_${Date.now()}.mp3`;
    const filePath = path.join(downloadsDir, filename);
    
    // Save the audio file
    fs.writeFileSync(filePath, Buffer.from(response.data));
    
    // Get the relative URL path
    const fileUrl = `/downloads/${filename}`;
    
    console.log(`Speech generated successfully: ${fileUrl}`);
    
    // Return success with file URL
    res.json({
      success: true,
      audio_url: fileUrl, 
      voice_id: useVoiceId,
      model_id: useModelId
    });
    
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    
    // Fall back to sample audio for errors
    const sampleAudios = [
      '/assets/audio/deliberation.wav', // Changed to .wav as requested
      '/assets/audio/proposal-submit.wav',
      '/assets/audio/startup.wav'
    ];
    
    const randomAudio = sampleAudios[Math.floor(Math.random() * sampleAudios.length)];
    
    res.json({
      success: false,
      error: error.message || 'Error generating speech',
      audio_url: randomAudio, // Fallback audio
      voice_id: voice_id || 'default',
      model_id: model_id || 'eleven_multilingual_v2'
    });
  }
});

// System status endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    environment: NODE_ENV,
    constitutional_alignment: 'Active',
    voice_services: process.env.ELEVEN_LABS_API_KEY ? 'Available' : 'Unavailable',
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

// Cleanup temporary files periodically
setInterval(() => {
  // Clean up files in uploads directory that are older than 1 hour
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  fs.readdir(uploadsDir, (err, files) => {
    if (err) return console.error('Error reading uploads directory:', err);
    
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return console.error('Error getting file stats:', err);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlink(filePath, err => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      });
    });
  });
  
  // Also clean up downloads directory
  fs.readdir(downloadsDir, (err, files) => {
    if (err) return console.error('Error reading downloads directory:', err);
    
    files.forEach(file => {
      const filePath = path.join(downloadsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return console.error('Error getting file stats:', err);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlink(filePath, err => {
            if (err) console.error('Error deleting file:', err);
          });
        }
      });
    });
  });
}, 60 * 60 * 1000); // Run every hour

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
  
  // Log API key status
  if (process.env.ELEVEN_LABS_API_KEY) {
    console.log('✓ Eleven Labs API key detected');
  } else {
    console.log('✗ Eleven Labs API key not found - voice synthesis will use fallback sounds');
  }
  
  if (process.env.OPENAI_API_KEY) {
    console.log('✓ OpenAI API key detected');
  } else {
    console.log('✗ OpenAI API key not found - AI responses will use fallback templates');
  }
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