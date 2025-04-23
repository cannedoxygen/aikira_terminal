/**
 * Proposal Controller for Aikira Terminal
 * Handles proposal submission and evaluation using ONLY OpenAI
 * NO FALLBACKS - All responses come directly from OpenAI
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * Route for submitting a proposal for evaluation using OpenAI
 * POST /api/proposal/evaluate
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { proposal } = req.body;
    
    if (!proposal) {
      return res.status(400).json({
        success: false,
        error: 'Proposal text is required'
      });
    }
    
    // Get OpenAI API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add to .env file.');
    }
    
    console.log(`Processing proposal with OpenAI: "${proposal.substring(0, 50)}${proposal.length > 50 ? '...' : ''}"`);
    
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
    - Keeps responses concise (3-5 sentences)
    - IMPORTANT: Be varied and creative in your responses, avoid using templated or repetitive language`;
    
    // Make request to OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', // Using GPT-3.5-turbo for broader availability
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: proposal }
        ],
        temperature: 0.8, // Higher temperature for more varied responses
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Log successful API call
    console.log('OpenAI API responded successfully');
    
    // Extract AI response
    const aiResponse = response.data.choices[0].message.content;
    
    // Use content analysis to generate reasonable metrics based on the AI's response
    const metrics = analyzeResponseForMetrics(aiResponse, proposal);
    const consensusIndex = calculateConsensusIndex(metrics);
    
    console.log(`Generated metrics - Fairness: ${metrics.fairness}%, Value: ${metrics.value}%, Protection: ${metrics.protection}%`);
    
    // Return the result in the format expected by the frontend
    return res.status(200).json({
      success: true,
      result: {
        response: aiResponse,
        scores: {
          fairness: metrics.fairness / 100,
          value: metrics.value / 100,
          protection: metrics.protection / 100,
          total: (metrics.fairness + metrics.value + metrics.protection) / 300
        },
        consensusIndex: consensusIndex / 100,
        approved: ((metrics.fairness + metrics.value + metrics.protection) / 3) >= 70,
        highConsensus: consensusIndex >= 90,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    console.error(error.stack);
    
    // Return detailed error information
    return res.status(500).json({
      success: false,
      error: 'Error processing proposal with OpenAI',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * Analyzes AI response to extract reasonable metrics
 * @param {string} response - The OpenAI response text
 * @param {string} proposal - The original proposal text
 * @returns {Object} Metrics with fairness, value, and protection scores
 */
function analyzeResponseForMetrics(response, proposal) {
  // Initialize with baseline scores
  let fairness = 75;
  let value = 75; 
  let protection = 75;
  
  // Convert to lowercase for analysis
  const lowerResponse = response.toLowerCase();
  const lowerProposal = proposal.toLowerCase();
  
  // Lists of keywords for different aspects
  const fairnessKeywords = {
    positive: ['fair', 'equitable', 'balanced', 'just', 'equal', 'inclusive', 'unbiased'],
    negative: ['unfair', 'inequitable', 'biased', 'unbalanced', 'discriminatory']
  };
  
  const valueKeywords = {
    positive: ['value', 'benefit', 'useful', 'efficient', 'effective', 'productive', 'optimize'],
    negative: ['inefficient', 'wasteful', 'costly', 'ineffective', 'limited value']
  };
  
  const protectionKeywords = {
    positive: ['protect', 'secure', 'safe', 'safeguard', 'defense', 'prevent', 'preserve'],
    negative: ['risk', 'vulnerable', 'exposed', 'threat', 'insecure', 'unsafe']
  };
  
  // Analyze response for positive keywords
  fairnessKeywords.positive.forEach(keyword => {
    if (lowerResponse.includes(keyword)) fairness += 2;
  });
  
  valueKeywords.positive.forEach(keyword => {
    if (lowerResponse.includes(keyword)) value += 2;
  });
  
  protectionKeywords.positive.forEach(keyword => {
    if (lowerResponse.includes(keyword)) protection += 2;
  });
  
  // Analyze response for negative keywords
  fairnessKeywords.negative.forEach(keyword => {
    if (lowerResponse.includes(keyword)) fairness -= 5;
  });
  
  valueKeywords.negative.forEach(keyword => {
    if (lowerResponse.includes(keyword)) value -= 5;
  });
  
  protectionKeywords.negative.forEach(keyword => {
    if (lowerResponse.includes(keyword)) protection -= 5;
  });
  
  // Check for enhancement recommendations
  if (lowerResponse.includes('improve fairness') || lowerResponse.includes('enhance fairness')) {
    fairness -= 10;
  }
  
  if (lowerResponse.includes('improve value') || lowerResponse.includes('enhance value')) {
    value -= 10;
  }
  
  if (lowerResponse.includes('improve protection') || lowerResponse.includes('enhance protection')) {
    protection -= 10;
  }
  
  // Add points for mentioning these aspects in the proposal itself
  if (lowerProposal.includes('fair') || lowerProposal.includes('equal')) fairness += 5;
  if (lowerProposal.includes('value') || lowerProposal.includes('benefit')) value += 5;
  if (lowerProposal.includes('protect') || lowerProposal.includes('secure')) protection += 5;
  
  // Keep metrics within reasonable bounds (60-95%)
  fairness = Math.max(60, Math.min(95, fairness));
  value = Math.max(60, Math.min(95, value));
  protection = Math.max(60, Math.min(95, protection));
  
  return {
    fairness: Math.round(fairness),
    value: Math.round(value),
    protection: Math.round(protection)
  };
}

/**
 * Calculates consensus index based on how balanced the metrics are
 * @param {Object} metrics - Object with fairness, value, and protection scores
 * @returns {number} Consensus score (0-100)
 */
function calculateConsensusIndex(metrics) {
  const scores = [metrics.fairness, metrics.value, metrics.protection];
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // Calculate variance (how far apart the scores are)
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  
  // Convert variance to a consensus score (higher variance = lower consensus)
  // Scale it to give reasonable values (80-95% for most cases)
  const maxVariance = 300; // A reasonable upper bound for variance
  const consensusScore = 100 - (variance / maxVariance * 20);
  
  // Ensure it stays in the range of 70-98
  return Math.round(Math.max(70, Math.min(98, consensusScore)));
}

/**
 * Route for storing a proposal after evaluation
 * POST /api/proposal/store
 */
router.post('/store', async (req, res) => {
  try {
    const { proposal, evaluation } = req.body;
    
    if (!proposal || !evaluation) {
      return res.status(400).json({
        success: false,
        error: 'Proposal and evaluation data are required'
      });
    }
    
    // In a real application, this would store the proposal in a database
    // For this demo, we'll just return success
    
    return res.status(200).json({
      success: true,
      message: 'Proposal stored successfully',
      proposalId: Date.now().toString()
    });
  } catch (error) {
    console.error('Error storing proposal:', error);
    return res.status(500).json({
      success: false,
      error: 'Error storing proposal'
    });
  }
});

/**
 * Route for retrieving proposal history
 * GET /api/proposal/history
 */
router.get('/history', async (req, res) => {
  try {
    // In a real application, this would fetch proposals from a database
    // For this demo, we'll return mock data
    
    const mockProposals = [
      {
        id: '1681234567890',
        text: 'Implement a transparent voting mechanism for all governance decisions',
        timestamp: '2023-04-11T09:30:00Z',
        status: 'approved',
        scores: {
          value: 0.85,
          fairness: 0.92,
          protection: 0.78,
          total: 0.85
        }
      },
      {
        id: '1681345678901',
        text: 'Create a multi-tiered protection system for sensitive data access',
        timestamp: '2023-04-12T14:45:00Z',
        status: 'approved',
        scores: {
          value: 0.76,
          fairness: 0.81,
          protection: 0.95,
          total: 0.84
        }
      },
      {
        id: '1681456789012',
        text: 'Establish quarterly review of value distribution algorithms',
        timestamp: '2023-04-13T11:20:00Z',
        status: 'pending',
        scores: {
          value: 0.92,
          fairness: 0.73,
          protection: 0.68,
          total: 0.78
        }
      }
    ];
    
    return res.status(200).json({
      success: true,
      proposals: mockProposals
    });
  } catch (error) {
    console.error('Error fetching proposal history:', error);
    return res.status(500).json({
      success: false,
      error: 'Error retrieving proposal history'
    });
  }
});

module.exports = router;