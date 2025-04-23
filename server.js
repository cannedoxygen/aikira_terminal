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
const multer = require('multer');
const FormData = require('form-data');


// Load environment variables
require('dotenv').config();
dotenv.config();

// Create Express app
const app = express();

// Define constants
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to ensure both OpenAI and Eleven Labs API keys are configured.
// Used for speech-related endpoints that require both services.
function requireApiKeys(req, res, next) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const elevenLabsKey = process.env.ELEVEN_LABS_API_KEY;

  if (!openaiKey || !elevenLabsKey) {
    return res.status(500).json({
      success: false,
      error: 'API keys not configured',
      message: 'Please configure OPENAI_API_KEY and ELEVEN_LABS_API_KEY in your .env file.'
    });
  }
  next();
}

// Middleware to ensure only OpenAI API key is configured.
// Used for endpoints that require only OpenAI (e.g., generate-response).
function requireOpenAiKey(req, res, next) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({
      success: false,
      error: 'OpenAI API key not configured',
      message: 'Please configure OPENAI_API_KEY in your .env file.'
    });
  }
  next();
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only audio files
    const allowedMimeTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm', 'audio/ogg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  }
});

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const downloadsDir = path.join(__dirname, 'downloads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Explicitly serve generated audio files from downloads directory
app.use('/downloads', express.static(downloadsDir));

// Protect OpenAI endpoints (only require OpenAI key) and Eleven Labs speech endpoints (require both keys)
app.use('/api/openai', requireOpenAiKey);
app.use('/api/speech', requireApiKeys);
// Mount Eleven Labs speech controller routes
const speechController = require('./backend/controllers/speech-controller');
app.use('/api/speech', speechController);

// Import proposal controller
const proposalController = require('./backend/controllers/proposal-controller');
app.use('/api/proposal', proposalController);

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
      throw new Error('OpenAI API key not configured. Please add to .env file.');
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
        model: 'gpt-3.5-turbo', // Using GPT-3.5-turbo for broader availability
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
    
    // Use content analysis to generate metrics rather than random values
    const metrics = analyzeResponseForMetrics(aiResponse, proposal);
    
    return res.status(200).json({
      success: true,
      response: aiResponse,
      metrics: metrics,
      consensus: Math.floor((metrics.fairness + metrics.value + metrics.protection) / 3)
    });
    
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    console.error(error.stack);
    
    return res.status(500).json({
      success: false, 
      error: 'Error processing proposal. Please try again later.',
      message: error.message
    });
  }
});

// Helper function to analyze content for metrics
function analyzeResponseForMetrics(response, proposal) {
  // Initialize with baseline scores
  let fairness = 75;
  let value = 75; 
  let protection = 75;
  
  // Analyze for positive and negative indicators
  const positiveFairnessTerms = ['fair', 'equitable', 'equal', 'balanced', 'impartial', 'just'];
  const positiveValueTerms = ['value', 'benefit', 'utility', 'efficiency', 'effective', 'optimize'];
  const positiveProtectionTerms = ['protect', 'secure', 'safety', 'safeguard', 'preserve', 'prevent'];
  
  const negativeFairnessTerms = ['unfair', 'inequitable', 'unbalanced', 'biased', 'partial'];
  const negativeValueTerms = ['inefficient', 'wasteful', 'ineffective', 'costly'];
  const negativeProtectionTerms = ['vulnerable', 'exposed', 'insecure', 'risk', 'threat'];
  
  // Check for terms in the response and proposal
  const lowerResponse = response.toLowerCase();
  const lowerProposal = proposal.toLowerCase();
  
  // Adjust fairness score
  positiveFairnessTerms.forEach(term => {
    if (lowerResponse.includes(term)) fairness += 2;
    if (lowerProposal.includes(term)) fairness += 1;
  });
  
  negativeFairnessTerms.forEach(term => {
    if (lowerResponse.includes(term)) fairness -= 3;
  });
  
  // Adjust value score
  positiveValueTerms.forEach(term => {
    if (lowerResponse.includes(term)) value += 2;
    if (lowerProposal.includes(term)) value += 1;
  });
  
  negativeValueTerms.forEach(term => {
    if (lowerResponse.includes(term)) value -= 3;
  });
  
  // Adjust protection score
  positiveProtectionTerms.forEach(term => {
    if (lowerResponse.includes(term)) protection += 2;
    if (lowerProposal.includes(term)) protection += 1;
  });
  
  negativeProtectionTerms.forEach(term => {
    if (lowerResponse.includes(term)) protection -= 3;
  });
  
  // Apply some sentiment-based adjustments
  if (lowerResponse.includes('recommend') || lowerResponse.includes('suggest')) {
    // Neutral recommendation usually indicates room for improvement
    fairness = Math.min(fairness, 85);
    value = Math.min(value, 85);
    protection = Math.min(protection, 85);
  }
  
  if (lowerResponse.includes('excellent') || lowerResponse.includes('exceptional')) {
    // Very positive assessment
    fairness = Math.max(fairness, 85);
    value = Math.max(value, 85);
    protection = Math.max(protection, 85);
  }
  
  if (lowerResponse.includes('concern') || lowerResponse.includes('issue') || lowerResponse.includes('problem')) {
    // Expressing concerns usually indicates lower scores
    fairness = Math.min(fairness, 75);
    value = Math.min(value, 75);
    protection = Math.min(protection, 75);
  }
  
  // Ensure scores stay in reasonable range (65-95)
  fairness = Math.max(65, Math.min(95, fairness));
  value = Math.max(65, Math.min(95, value));
  protection = Math.max(65, Math.min(95, protection));
  
  return {
    fairness: Math.round(fairness),
    value: Math.round(value),
    protection: Math.round(protection)
  };
}

// Speech-to-text endpoint
app.post('/api/speech/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }
    
    // Get file path from multer
    const filePath = req.file.path;
    
    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add to .env file.');
    }
    
    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    
    // Optional parameters
    const language = req.body.language || null;
    const prompt = req.body.prompt || null;
    
    if (language) {
      formData.append('language', language);
    }
    
    if (prompt) {
      formData.append('prompt', prompt);
    }
    
    // Call the OpenAI Whisper API
    console.log('Calling Whisper API for transcription...');
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    // Clean up the file after processing
    fs.unlinkSync(filePath);
    
    // Return the transcription
    return res.json({
      success: true,
      text: response.data.text,
      language: response.data.language || language
    });
    
  } catch (error) {
    console.error('Transcription error:', error.response?.data || error.message);
    
    // Clean up file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error removing file:', unlinkError);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error transcribing audio. Please try again.',
      message: error.message
    });
  }
});

// This fixed endpoint should replace the existing speech generation endpoint in server.js

// Text-to-speech endpoint with Eleven Labs API
app.post('/api/speech/generate', async (req, res) => {
  try {
    const { text, voice_id, model_id, voice_settings } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }
    
    // Get Eleven Labs API key directly from environment
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      throw new Error('Eleven Labs API key not configured. Please add to .env file.');
    }
    
    console.log(`Generating speech with Eleven Labs for text: "${text.substring(0, 30)}..."`);
    
    // First, get available voices to ensure we use a valid voice ID
    console.log('Fetching available voices...');
    let validVoiceId;
    
    try {
      const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey
        }
      });
      
      // Use the requested voice ID if it exists, otherwise use the first available voice
      if (voice_id && voicesResponse.data.voices.some(v => v.voice_id === voice_id)) {
        validVoiceId = voice_id;
      } else {
        // Default to first voice if available, otherwise use a standard voice ID
        validVoiceId = voicesResponse.data.voices.length > 0 
          ? voicesResponse.data.voices[0].voice_id 
          : "OYTbf65OHHFELVut7v1H"; // Fallback to a standard voice ID
      }
      
      console.log(`Using voice ID: ${validVoiceId}`);
    } catch (error) {
      console.error('Error fetching voices:', error);
      // Fallback to standard voice ID
      validVoiceId = "OYTbf65OHHFELVut7v1H";
      console.log(`Falling back to standard voice ID: ${validVoiceId}`);
    }
    
    // Use the validated voice ID
    const useVoiceId = validVoiceId;
    
    // Use default model if not provided
    const useModelId = model_id || 'eleven_monolingual_v1';
    
    // Set default voice settings if not provided
    const settings = voice_settings || {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    };
    
    // Make the API request to Eleven Labs
    console.log(`Making API request to Eleven Labs with voice ID: ${useVoiceId}`);
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${useVoiceId}`,
      data: {
        text,
        model_id: useModelId,
        voice_settings: settings
      },
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });
    
    console.log(`Response received from Eleven Labs, size: ${response.data.length} bytes`);
    
    // Create directories if they don't exist
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
      console.log(`Created downloads directory: ${downloadsDir}`);
    }
    
    // Create a unique filename
    const filename = `aikira_response_${Date.now()}.mp3`;
    const filePath = path.join(downloadsDir, filename);
    
    // Save the audio file
    fs.writeFileSync(filePath, Buffer.from(response.data));
    console.log(`Speech file saved to: ${filePath}`);
    
    // Get the relative URL path
    const fileUrl = `/downloads/${filename}`;
    console.log(`File URL: ${fileUrl}`);
    
    // Return success response
    return res.status(200).json({
      success: true,
      audio_url: fileUrl,
      voice_id: useVoiceId,
      model_id: useModelId
    });
    
  } catch (error) {
    console.error('Eleven Labs API error:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error headers:', error.response.headers);
      
      // For error details, handle possible binary response
      if (error.response.data) {
        if (error.response.data instanceof Buffer) {
          console.error('Error data (Buffer):', error.response.data.toString('utf8').substring(0, 200));
        } else {
          console.error('Error data:', error.response.data);
        }
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error generating speech',
      message: error.message || 'Unknown error'
    });
  }
});

// Debug endpoint for Eleven Labs API
app.get('/api/debug/eleven-labs', async (req, res) => {
  try {
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Eleven Labs API key not configured'
      });
    }
    
    console.log(`Testing Eleven Labs API with key: ${apiKey.substring(0, 5)}...`);
    
    // Simple test API call to get voices
    const voicesResponse = await axios.get(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: {
          'xi-api-key': apiKey
        }
      }
    );
    
    // Use first available voice ID for testing
    const voiceId = voicesResponse.data.voices.length > 0 ? 
      voicesResponse.data.voices[0].voice_id : 
      "eleven_monolingual_v1";
    
    // Test by generating a short audio clip
    const testText = "This is a test of the Aikira speech system.";
    
    // Generate test speech
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      data: {
        text: testText,
        model_id: 'eleven_multilingual_v1'
      },
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    // Save the test audio
    const filename = `test_speech_${Date.now()}.mp3`;
    const filePath = path.join(downloadsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(response.data));
    
    return res.json({
      success: true,
      message: 'Eleven Labs API test successful',
      test_audio_url: `/downloads/${filename}`,
      voices_count: voicesResponse.data.voices.length
    });
  } catch (error) {
    console.error('Eleven Labs debug test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Eleven Labs API test failed',
      message: error.message
    });
  }
});

// Simple test endpoint for Eleven Labs API
app.get('/api/speech/test', async (req, res) => {
  try {
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Eleven Labs API key not configured'
      });
    }
    
    console.log(`Testing Eleven Labs API with key: ${apiKey.substring(0, 5)}...`);
    
    // Make a simple request to test the API
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    console.log(`Eleven Labs API test successful. Found ${response.data.voices.length} voices.`);
    
    return res.json({
      success: true,
      voices_count: response.data.voices.length,
      message: 'Eleven Labs API key is valid',
      voices: response.data.voices.map(voice => ({
        name: voice.name,
        id: voice.voice_id
      }))
    });
  } catch (error) {
    console.error('Eleven Labs API test error:', error.message);
    
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to connect to Eleven Labs API',
      message: error.message
    });
  }
});

// System status endpoint
app.get('/api/system/status', (req, res) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  const elevenLabsKey = process.env.ELEVEN_LABS_API_KEY;
  
  res.json({
    status: 'online',
    version: '1.0.0',
    environment: NODE_ENV,
    constitutional_alignment: 'Active',
    voice_services: elevenLabsKey ? 'Available' : 'Unavailable',
    transcription_services: openaiKey ? 'Available' : 'Unavailable',
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

// Start the server when run directly (e.g., local development)
if (require.main === module) {
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
    console.log(process.env.ELEVEN_LABS_API_KEY
      ? '✓ Eleven Labs API key detected'  
      : '✗ Eleven Labs API key not found - voice synthesis unavailable'
    );
    console.log(process.env.OPENAI_API_KEY
      ? '✓ OpenAI API key detected'   
      : '✗ OpenAI API key not found - AI responses unavailable'
    );
  });
}

// Export the Express app for serverless environments (e.g., Vercel Functions)
module.exports = app;

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