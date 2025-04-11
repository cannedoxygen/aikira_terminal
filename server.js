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

// Middleware to ensure API keys are configured
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

// Serve generated audio files
app.use('/downloads', express.static(downloadsDir));

// Apply the API key middleware to relevant routes
app.use('/api/openai', requireApiKeys);
app.use('/api/speech', requireApiKeys);
app.use('/api/proposal', require('./backend/controllers/proposal-controller'));

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
        model: 'gpt-4', // Using GPT-4 for best responses, or gpt-3.5-turbo for cheaper option
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

// Helper function to get a valid voice ID from Eleven Labs
async function getValidVoiceId(apiKey, requestedVoiceId) {
  try {
    // Get available voices
    const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    if (voicesResponse.data.voices && voicesResponse.data.voices.length > 0) {
      // If a specific voice ID was requested, check if it exists
      if (requestedVoiceId && requestedVoiceId !== 'default') {
        const voiceExists = voicesResponse.data.voices.some(voice => voice.voice_id === requestedVoiceId);
        if (voiceExists) {
          console.log(`Using requested voice ID: ${requestedVoiceId}`);
          return requestedVoiceId;
        }
        console.log(`Requested voice ID ${requestedVoiceId} not found, using first available voice`);
      }
      
      // Otherwise, use the first available voice
      const firstVoiceId = voicesResponse.data.voices[0].voice_id;
      console.log(`Using first available voice: ${firstVoiceId} (${voicesResponse.data.voices[0].name})`);
      return firstVoiceId;
    } else {
      throw new Error('No voices found in your Eleven Labs account');
    }
  } catch (error) {
    console.error('Error getting valid voice ID:', error.message);
    throw new Error('Could not get a valid voice ID from Eleven Labs');
  }
}

// Enhanced text-to-speech endpoint with Eleven Labs API
app.post('/api/speech/generate', async (req, res) => {
  try {
    const { text, voice_id, model_id, voice_settings } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }
    
    // Get Eleven Labs API key
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      throw new Error('Eleven Labs API key not configured. Please add to .env file.');
    }
    
    console.log(`Using Eleven Labs API key: ${apiKey.substring(0, 5)}...`);
    
    // Get a valid voice ID
    const requestedVoiceId = voice_id || process.env.DEFAULT_VOICE_ID;
    const useVoiceId = await getValidVoiceId(apiKey, requestedVoiceId);
    
    // Use default model if not provided
    const useModelId = model_id || 'eleven_multilingual_v2';
    
    // Set default voice settings if not provided
    const settings = voice_settings || {
      stability: parseFloat(process.env.VOICE_STABILITY) || 0.75,
      similarity_boost: parseFloat(process.env.VOICE_SIMILARITY_BOOST) || 0.75,
      style: parseFloat(process.env.VOICE_STYLE) || 0.5,
      use_speaker_boost: process.env.VOICE_USE_SPEAKER_BOOST === 'true' || true
    };
    
    console.log(`Generating speech with Eleven Labs for text: ${text.substring(0, 50)}...`);
    console.log(`Using voice ID: ${useVoiceId}`);
    console.log(`Using model ID: ${useModelId}`);
    
    // Make API request to Eleven Labs
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
      responseType: 'arraybuffer'
    });
    
    console.log("Eleven Labs API response received, size:", response.data.length);
    
    // Ensure the downloads directory exists
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
      console.log(`Created downloads directory: ${downloadsDir}`);
    }
    
    // Create a unique filename
    const filename = `aikira_response_${Date.now()}.mp3`;
    const filePath = path.join(downloadsDir, filename);
    
    // Save the audio file
    try {
      fs.writeFileSync(filePath, Buffer.from(response.data));
      console.log(`Speech file saved to: ${filePath}`);
    } catch (fsError) {
      console.error('Error saving audio file:', fsError);
      throw new Error('Could not save audio file');
    }
    
    // Get the relative URL path
    const fileUrl = `/downloads/${filename}`;
    
    console.log(`Speech generated successfully: ${fileUrl}`);
    
    // Return success with file URL
    res.status(200).json({
      success: true,
      audio_url: fileUrl, 
      voice_id: useVoiceId,
      model_id: useModelId
    });
    
  } catch (error) {
    console.error('Eleven Labs API error:', error.message);
    
    // Log more detailed error information
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error details:', {
        status: error.response.status, 
        statusText: error.response.statusText,
        data: typeof error.response.data === 'object' ? 
          JSON.stringify(error.response.data) : 
          error.response.data?.toString('utf8', 0, 200) // Show first 200 chars if it's a buffer
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error generating speech. Please try again.',
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
    
    // Make a simple request to the API to check if the key is valid
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
    console.log('✗ Eleven Labs API key not found - voice synthesis unavailable');
  }
  
  if (process.env.OPENAI_API_KEY) {
    console.log('✓ OpenAI API key detected');
  } else {
    console.log('✗ OpenAI API key not found - AI responses unavailable');
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