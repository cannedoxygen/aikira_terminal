/**
 * Speech Controller for Aikira Terminal
 * Handles speech-to-text and text-to-speech conversions using OpenAI Whisper and Eleven Labs
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const whisperService = require('../services/whisper-service');
const elevenLabsService = require('../services/eleven-labs-service');
const audioProcessor = require('../utils/audio-processor');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create the uploads directory if it doesn't exist
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

/**
 * Route for transcribing audio using OpenAI Whisper API
 * POST /api/speech/transcribe
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }
    
    // Get file path from multer
    const filePath = req.file.path;
    
    // Optional parameters
    const language = req.body.language || null; // Language code, e.g., 'en'
    const prompt = req.body.prompt || null; // Optional prompt to guide transcription
    
    // Process audio file for optimal results
    const processedFilePath = await audioProcessor.processForWhisper(filePath);
    
    // Call Whisper API
    const transcription = await whisperService.transcribeAudio(processedFilePath, language, prompt);
    
    // Clean up processed file if different from original
    if (processedFilePath !== filePath) {
      fs.unlinkSync(processedFilePath);
    }
    
    // Clean up original file
    fs.unlinkSync(filePath);
    
    return res.status(200).json({
      success: true,
      text: transcription.text,
      language: transcription.language || language
    });
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up the uploaded file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Error transcribing audio'
    });
  }
});

/**
 * Route for generating speech using Eleven Labs API
 * POST /api/speech/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { text, voice_id, model_id, voice_settings } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }
    
    // Set default voice settings if not provided
    const settings = voice_settings || {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    };
    
    // Use default voice and model if not specified
    const voiceId = voice_id || process.env.DEFAULT_VOICE_ID || 'default';
    const modelId = model_id || 'eleven_multilingual_v2';
    
    // Generate speech
    const audioData = await elevenLabsService.generateSpeech(text, voiceId, modelId, settings);
    
    // Create unique filename
    const filename = `${uuidv4()}.mp3`;
    const downloadDir = path.join(__dirname, '../../downloads');
    const filePath = path.join(downloadDir, filename);
    
    // Create the downloads directory if it doesn't exist
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    // Save the audio file
    fs.writeFileSync(filePath, audioData);
    
    // Set response headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    // Stream the file to the client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up the file after sending
    fileStream.on('end', () => {
      fs.unlinkSync(filePath);
    });
    
  } catch (error) {
    console.error('Speech generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error generating speech'
    });
  }
});

/**
 * Route for retrieving available voices from Eleven Labs
 * GET /api/speech/voices
 */
router.get('/voices', async (req, res) => {
  try {
    const voices = await elevenLabsService.getVoices();
    
    return res.status(200).json({
      success: true,
      voices
    });
  } catch (error) {
    console.error('Error retrieving voices:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error retrieving voices'
    });
  }
});

/**
 * Route for retrieving available models from Eleven Labs
 * GET /api/speech/models
 */
router.get('/models', async (req, res) => {
  try {
    const models = await elevenLabsService.getModels();
    
    return res.status(200).json({
      success: true,
      models
    });
  } catch (error) {
    console.error('Error retrieving models:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error retrieving models'
    });
  }
});

module.exports = router;