/**
 * Eleven Labs Service for Aikira Terminal
 * Handles API calls to Eleven Labs for text-to-speech conversion
 */

const axios = require('axios');
const FormData = require('form-data');

// Base URL for Eleven Labs API
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Gets the API key from environment variables
 * @returns {string} API key
 */
function getApiKey() {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    throw new Error('Eleven Labs API key not found. Please set ELEVEN_LABS_API_KEY environment variable.');
  }
  return apiKey;
}

/**
 * Generates speech from text using Eleven Labs API
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - ID of the voice to use
 * @param {string} modelId - ID of the model to use
 * @param {Object} voiceSettings - Voice settings for generation
 * @returns {Buffer} Audio data as buffer
 */
async function generateSpeech(text, voiceId = 'default', modelId = 'eleven_multilingual_v2', voiceSettings = null) {
  try {
    const apiKey = getApiKey();
    
    // Set default voice settings if not provided
    const settings = voiceSettings || {
      stability: 0.75,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true
    };
    
    // Request payload
    const payload = {
      text,
      model_id: modelId,
      voice_settings: settings
    };
    
    // Make API request
    const response = await axios({
      method: 'post',
      url: `${ELEVEN_LABS_API_URL}/text-to-speech/${voiceId}`,
      data: payload,
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    // Return audio data
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    throw new Error(`Failed to generate speech: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Gets available voices from Eleven Labs
 * @returns {Array} List of available voices
 */
async function getVoices() {
  try {
    const apiKey = getApiKey();
    
    const response = await axios({
      method: 'get',
      url: `${ELEVEN_LABS_API_URL}/voices`,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.voices;
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    throw new Error(`Failed to get voices: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Gets available models from Eleven Labs
 * @returns {Array} List of available models
 */
async function getModels() {
  try {
    const apiKey = getApiKey();
    
    const response = await axios({
      method: 'get',
      url: `${ELEVEN_LABS_API_URL}/models`,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.models;
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    throw new Error(`Failed to get models: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Creates a custom voice on Eleven Labs
 * @param {string} name - Name for the custom voice
 * @param {Array} samples - Array of audio file paths for voice samples
 * @param {string} description - Optional description for the voice
 * @returns {Object} Voice creation response
 */
async function createVoice(name, samples, description = '') {
  try {
    const apiKey = getApiKey();
    
    // Create form data
    const formData = new FormData();
    formData.append('name', name);
    
    if (description) {
      formData.append('description', description);
    }
    
    // Add each sample
    for (const sample of samples) {
      formData.append('files', sample);
    }
    
    // Make API request
    const response = await axios({
      method: 'post',
      url: `${ELEVEN_LABS_API_URL}/voices/add`,
      data: formData,
      headers: {
        'xi-api-key': apiKey,
        ...formData.getHeaders()
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    throw new Error(`Failed to create voice: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Edits an existing voice on Eleven Labs
 * @param {string} voiceId - ID of the voice to edit
 * @param {string} name - New name for the voice
 * @param {Array} samples - New audio samples (optional)
 * @param {string} description - New description (optional)
 * @returns {Object} Voice edit response
 */
async function editVoice(voiceId, name, samples = [], description = null) {
  try {
    const apiKey = getApiKey();
    
    // Create form data
    const formData = new FormData();
    formData.append('name', name);
    
    if (description !== null) {
      formData.append('description', description);
    }
    
    // Add each sample if provided
    for (const sample of samples) {
      formData.append('files', sample);
    }
    
    // Make API request
    const response = await axios({
      method: 'post',
      url: `${ELEVEN_LABS_API_URL}/voices/${voiceId}/edit`,
      data: formData,
      headers: {
        'xi-api-key': apiKey,
        ...formData.getHeaders()
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    throw new Error(`Failed to edit voice: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Deletes a voice from Eleven Labs
 * @param {string} voiceId - ID of the voice to delete
 * @returns {Object} Deletion response
 */
async function deleteVoice(voiceId) {
  try {
    const apiKey = getApiKey();
    
    const response = await axios({
      method: 'delete',
      url: `${ELEVEN_LABS_API_URL}/voices/${voiceId}`,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    throw new Error(`Failed to delete voice: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Gets the voice settings for a specific voice
 * @param {string} voiceId - ID of the voice
 * @returns {Object} Voice settings
 */
async function getVoiceSettings(voiceId) {
  try {
    const apiKey = getApiKey();
    
    const response = await axios({
      method: 'get',
      url: `${ELEVEN_LABS_API_URL}/voices/${voiceId}/settings`,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    throw new Error(`Failed to get voice settings: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

/**
 * Gets the remaining character quota for the API key
 * @returns {Object} Quota information
 */
async function getUserSubscription() {
  try {
    const apiKey = getApiKey();
    
    const response = await axios({
      method: 'get',
      url: `${ELEVEN_LABS_API_URL}/user/subscription`,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Eleven Labs API error:', error.response?.data || error.message);
    throw new Error(`Failed to get user subscription: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
  }
}

// Export functions
module.exports = {
  generateSpeech,
  getVoices,
  getModels,
  createVoice,
  editVoice,
  deleteVoice,
  getVoiceSettings,
  getUserSubscription
};