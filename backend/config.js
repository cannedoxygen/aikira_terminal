/**
 * Configuration File for Aikira Terminal
 * Centralizes configuration settings for the application
 */

// Load environment variables
require('dotenv').config();

// Server configuration
const SERVER_CONFIG = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'aikira-terminal-secret',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000']
};

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window default
  voiceRequests: 30, // Voice requests have a lower limit
  authAttempts: 10 // Authentication attempts have a very low limit
};

// Eleven Labs configuration
const ELEVEN_LABS_CONFIG = {
  apiKey: process.env.ELEVEN_LABS_API_KEY,
  apiUrl: 'https://api.elevenlabs.io/v1',
  defaultVoiceId: process.env.DEFAULT_VOICE_ID || 'default',
  defaultModelId: 'eleven_multilingual_v1',
  voiceSettings: {
    stability: parseFloat(process.env.VOICE_STABILITY) || 0.75,
    similarityBoost: parseFloat(process.env.VOICE_SIMILARITY_BOOST) || 0.75,
    style: parseFloat(process.env.VOICE_STYLE) || 0.5,
    useSpeakerBoost: process.env.VOICE_USE_SPEAKER_BOOST === 'true'
  }
};

// OpenAI Whisper configuration
const WHISPER_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY,
  apiUrl: 'https://api.openai.com/v1',
  model: 'whisper-1',
  maxFileSize: 25 * 1024 * 1024, // 25MB limit
  allowedFormats: ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm']
};

// Feature flags
const FEATURE_FLAGS = {
  enableVoiceFeatures: process.env.ENABLE_VOICE_FEATURES === 'true',
  enableGovernanceFeatures: process.env.ENABLE_GOVERNANCE_FEATURES === 'true'
};

// Logging configuration
const LOGGING_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'dev'
};

// File storage configuration
const FILE_STORAGE_CONFIG = {
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  downloadDir: process.env.DOWNLOAD_DIR || 'downloads',
  maxFileSize: 10 * 1024 * 1024, // 10MB general file size limit
  tempDir: 'temp',
  cleanupInterval: 3600000 // Clean up temporary files every hour
};

// Validate essential configuration
function validateConfiguration() {
  const missingKeys = [];
  
  if (!SERVER_CONFIG.jwtSecret || SERVER_CONFIG.jwtSecret === 'aikira-terminal-secret') {
    missingKeys.push('JWT_SECRET');
  }
  
  if (FEATURE_FLAGS.enableVoiceFeatures) {
    if (!ELEVEN_LABS_CONFIG.apiKey) {
      missingKeys.push('ELEVEN_LABS_API_KEY');
    }
    
    if (!WHISPER_CONFIG.apiKey) {
      missingKeys.push('OPENAI_API_KEY');
    }
  }
  
  if (missingKeys.length > 0) {
    console.warn(`Warning: Missing configuration keys: ${missingKeys.join(', ')}`);
    
    if (SERVER_CONFIG.environment === 'production') {
      throw new Error(`Critical configuration missing in production: ${missingKeys.join(', ')}`);
    }
  }
}

// Run validation on startup
validateConfiguration();

// Export configuration
module.exports = {
  server: SERVER_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  elevenLabs: ELEVEN_LABS_CONFIG,
  whisper: WHISPER_CONFIG,
  features: FEATURE_FLAGS,
  logging: LOGGING_CONFIG,
  fileStorage: FILE_STORAGE_CONFIG,
  
  // Helper method to get the current environment
  isDevelopment: () => SERVER_CONFIG.environment === 'development',
  isProduction: () => SERVER_CONFIG.environment === 'production',
  isTest: () => SERVER_CONFIG.environment === 'test'
};