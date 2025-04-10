/**
 * Whisper Service for Aikira Terminal
 * Handles API calls to OpenAI Whisper for speech-to-text conversion
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Base URL for OpenAI API
const OPENAI_API_URL = 'https://api.openai.com/v1';

/**
 * Gets the API key from environment variables
 * @returns {string} API key
 */
function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please set OPENAI_API_KEY environment variable.');
  }
  return apiKey;
}

/**
 * Transcribes audio file using OpenAI Whisper API
 * @param {string} filePath - Path to the audio file
 * @param {string} language - Language code (optional)
 * @param {string} prompt - Transcription prompt (optional)
 * @returns {Object} Transcription result
 */
async function transcribeAudio(filePath, language = null, prompt = null) {
  try {
    const apiKey = getApiKey();
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    
    // Add optional parameters if provided
    if (language) {
      formData.append('language', language);
    }
    
    if (prompt) {
      formData.append('prompt', prompt);
    }
    
    // Make API request
    const response = await axios.post(
      `${OPENAI_API_URL}/audio/transcriptions`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Whisper API error:', error.response?.data || error.message);
    throw new Error(`Failed to transcribe audio: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Translates audio to English using Whisper API
 * @param {string} filePath - Path to the audio file
 * @param {string} prompt - Translation prompt (optional)
 * @returns {Object} Translation result
 */
async function translateAudio(filePath, prompt = null) {
  try {
    const apiKey = getApiKey();
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    
    // Add prompt if provided
    if (prompt) {
      formData.append('prompt', prompt);
    }
    
    // Make API request
    const response = await axios.post(
      `${OPENAI_API_URL}/audio/translations`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Whisper API error:', error.response?.data || error.message);
    throw new Error(`Failed to translate audio: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Checks if an audio file is compatible with Whisper API
 * @param {string} filePath - Path to the audio file
 * @returns {boolean} Whether the file is compatible
 */
function isCompatibleAudioFile(filePath) {
  const allowedExtensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
  const extension = path.extname(filePath).toLowerCase();
  
  return allowedExtensions.includes(extension);
}

/**
 * Gets the maximum file size allowed by Whisper API (in bytes)
 * @returns {number} Maximum file size in bytes
 */
function getMaxFileSize() {
  // Whisper API has a 25MB file size limit
  return 25 * 1024 * 1024;
}

/**
 * Gets the file size of an audio file
 * @param {string} filePath - Path to the audio file
 * @returns {number} File size in bytes
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

// Export functions
module.exports = {
  transcribeAudio,
  translateAudio,
  isCompatibleAudioFile,
  getMaxFileSize,
  getFileSize
};