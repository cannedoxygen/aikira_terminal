const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;
console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API connection...');
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', // Using a cheaper model for testing
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello!' }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('SUCCESS! API responded with:');
    console.log(response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('ERROR with OpenAI API:');
    console.error(error.response?.data || error.message);
    return false;
  }
}

// Run the test
testOpenAI();