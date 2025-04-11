const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.ELEVEN_LABS_API_KEY;
console.log('Eleven Labs API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

async function testElevenLabs() {
  try {
    console.log('Testing Eleven Labs API connection...');
    
    const response = await axios.get(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: {
          'xi-api-key': apiKey
        }
      }
    );
    
    console.log('SUCCESS! API responded with:');
    console.log(`Found ${response.data.voices.length} voices.`);
    // List the first voice
    if (response.data.voices.length > 0) {
      console.log('First voice details:');
      console.log(`Name: ${response.data.voices[0].name}`);
      console.log(`ID: ${response.data.voices[0].voice_id}`);
    }
    return true;
  } catch (error) {
    console.error('ERROR with Eleven Labs API:');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Run the test
testElevenLabs();