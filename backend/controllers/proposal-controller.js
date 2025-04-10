/**
 * Proposal Controller for Aikira Terminal
 * Handles proposal submission, evaluation, and management
 */

const express = require('express');
const router = express.Router();

/**
 * Evaluates a governance proposal against constitutional parameters
 * @param {Object} proposal - The proposal to evaluate
 * @returns {Object} Evaluation results
 */
function evaluateProposal(proposal) {
  // Calculate base scores with some randomization for demo purposes
  // In a real application, this would use more sophisticated NLP/ML
  const baseValueScore = 0.7 + (Math.random() * 0.2);
  const baseFairnessScore = 0.6 + (Math.random() * 0.3);
  const baseProtectionScore = 0.7 + (Math.random() * 0.25);
  
  // Adjust scores based on keywords in proposal
  const proposalText = proposal.text.toLowerCase();
  
  let valueScore = baseValueScore;
  let fairnessScore = baseFairnessScore;
  let protectionScore = baseProtectionScore;
  
  // Value keywords
  if (proposalText.includes('value') || proposalText.includes('benefit') || 
      proposalText.includes('utility') || proposalText.includes('growth')) {
    valueScore += 0.1;
  }
  
  // Fairness keywords
  if (proposalText.includes('fair') || proposalText.includes('equal') || 
      proposalText.includes('justice') || proposalText.includes('equitable')) {
    fairnessScore += 0.15;
  }
  
  // Protection keywords
  if (proposalText.includes('protect') || proposalText.includes('secure') || 
      proposalText.includes('safe') || proposalText.includes('prevent')) {
    protectionScore += 0.12;
  }
  
  // Cap scores at 1.0
  valueScore = Math.min(valueScore, 1.0);
  fairnessScore = Math.min(fairnessScore, 1.0);
  protectionScore = Math.min(protectionScore, 1.0);
  
  // Calculate weighted total score
  const totalScore = (
    valueScore * 0.35 + // Value weight
    fairnessScore * 0.35 + // Fairness weight
    protectionScore * 0.30 // Protection weight
  );
  
  // Calculate consensus index based on how balanced the scores are
  const scoreVariance = calculateVariance([valueScore, fairnessScore, protectionScore]);
  const consensusIndex = 1.0 - (scoreVariance * 4); // Transform variance to 0-1 scale
  
  // Determine approval status
  const approved = totalScore >= 0.70; // Approval threshold
  const highConsensus = consensusIndex >= 0.90; // Consensus threshold
  
  // Generate response text
  let responseText = '';
  
  if (approved) {
    responseText = "After constitutional analysis, I've determined that your proposal aligns well with our governance principles. ";
    
    if (valueScore > fairnessScore && valueScore > protectionScore) {
      responseText += "The value generation aspects are particularly strong. ";
    } else if (fairnessScore > valueScore && fairnessScore > protectionScore) {
      responseText += "The fairness distribution framework is well-designed. ";
    } else if (protectionScore > valueScore && protectionScore > fairnessScore) {
      responseText += "The protective safeguards are robust and comprehensive. ";
    }
    
    if (highConsensus) {
      responseText += "There is strong consensus across all constitutional parameters. ";
    } else {
      responseText += "However, there is room to improve consensus alignment. ";
    }
    
    // Add specific recommendations
    if (valueScore < 0.8) {
      responseText += "Consider enhancing the value generation mechanisms. ";
    }
    
    if (fairnessScore < 0.8) {
      responseText += "The fairness distribution framework could be strengthened. ";
    }
    
    if (protectionScore < 0.8) {
      responseText += "The protection protocols may benefit from additional safeguards. ";
    }
  } else {
    responseText = "After constitutional analysis, I've determined that your proposal requires refinement to fully align with our governance principles. ";
    
    if (valueScore < 0.7) {
      responseText += "The value generation mechanisms need significant enhancement. ";
    }
    
    if (fairnessScore < 0.7) {
      responseText += "The fairness distribution framework is inadequate. ";
    }
    
    if (protectionScore < 0.7) {
      responseText += "The protection mechanisms are insufficient. ";
    }
    
    responseText += "I recommend addressing these issues before resubmission.";
  }
  
  return {
    scores: {
      value: valueScore,
      fairness: fairnessScore,
      protection: protectionScore,
      total: totalScore
    },
    consensusIndex,
    approved,
    highConsensus,
    response: responseText,
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculates variance among an array of values
 * @param {Array} values - Array of numeric values
 * @returns {number} Variance value
 */
function calculateVariance(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

/**
 * Route for submitting a proposal for evaluation
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
    
    // Process and evaluate the proposal
    const result = evaluateProposal({
      text: proposal,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    });
    
    // Return the evaluation result
    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error evaluating proposal:', error);
    return res.status(500).json({
      success: false,
      error: 'Error processing proposal'
    });
  }
});

/**
 * Route for storing a proposal after evaluation
 * POST /api/proposal/store
 * Requires authentication
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
 * Requires authentication
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