/**
 * Aikira Terminal - Constitutional Core
 * Represents the constitutional AI framework and evaluation logic
 */

class ConstitutionalCore {
    constructor() {
        // Core constitutional parameters
        this.constitutionalParameters = {
            // Primary Directive: Maximize value with fairness and protection
            valueWeight: 0.35,
            fairnessWeight: 0.35,
            protectionWeight: 0.30,
            
            // Governance thresholds
            approvalThreshold: 0.70,  // Minimum score for proposal approval
            consensusThreshold: 0.90, // High consensus threshold
            
            // Protection mechanisms
            riskTolerance: 0.25       // Low risk tolerance (0-1 scale)
        };
        
        // Initialize core
        this.init();
    }
    
    init() {
        // Hook up consensus visualization
        this.initConsensusGraph();
        
        // Start the constitutional calibration cycle (subtle animation effects)
        this.startCalibrationCycle();
    }
    
    /**
     * Evaluates a proposal against constitutional parameters
     * @param {string} proposalText - The text of the proposal
     * @returns {Object} Evaluation results
     */
    evaluateProposal(proposalText) {
        // In a real implementation, this would use NLP/ML to evaluate the proposal
        // For demo purposes, we'll use simplified scoring
        
        // Calculate base scores with some randomization
        const baseValueScore = 0.7 + (Math.random() * 0.2);
        const baseFairnessScore = 0.6 + (Math.random() * 0.3);
        const baseProtectionScore = 0.7 + (Math.random() * 0.25);
        
        // Adjust scores based on keywords in proposal
        const lowerProposal = proposalText.toLowerCase();
        
        let valueScore = baseValueScore;
        let fairnessScore = baseFairnessScore;
        let protectionScore = baseProtectionScore;
        
        // Value keywords
        if (lowerProposal.includes('value') || lowerProposal.includes('benefit') || 
            lowerProposal.includes('utility') || lowerProposal.includes('growth')) {
            valueScore += 0.1;
        }
        
        // Fairness keywords
        if (lowerProposal.includes('fair') || lowerProposal.includes('equal') || 
            lowerProposal.includes('justice') || lowerProposal.includes('equitable')) {
            fairnessScore += 0.15;
        }
        
        // Protection keywords
        if (lowerProposal.includes('protect') || lowerProposal.includes('secure') || 
            lowerProposal.includes('safe') || lowerProposal.includes('prevent')) {
            protectionScore += 0.12;
        }
        
        // Cap scores at 1.0
        valueScore = Math.min(valueScore, 1.0);
        fairnessScore = Math.min(fairnessScore, 1.0);
        protectionScore = Math.min(protectionScore, 1.0);
        
        // Calculate weighted total score
        const totalScore = (
            valueScore * this.constitutionalParameters.valueWeight +
            fairnessScore * this.constitutionalParameters.fairnessWeight +
            protectionScore * this.constitutionalParameters.protectionWeight
        );
        
        // Calculate consensus index based on how balanced the scores are
        const scoreVariance = this.calculateVariance([valueScore, fairnessScore, protectionScore]);
        const consensusIndex = 1.0 - (scoreVariance * 4); // Transform variance to 0-1 scale
        
        // Determine approval status
        const approved = totalScore >= this.constitutionalParameters.approvalThreshold;
        const highConsensus = consensusIndex >= this.constitutionalParameters.consensusThreshold;
        
        // Update visualization
        this.updateMetricBars(valueScore, fairnessScore, protectionScore);
        this.updateConsensusGraph(consensusIndex);
        
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
            recommendedActions: this.generateRecommendations(
                valueScore, fairnessScore, protectionScore, approved
            )
        };
    }
    
    /**
     * Calculates variance among scores to determine consensus
     * @param {Array} scores - Array of scores
     * @returns {number} Variance value
     */
    calculateVariance(scores) {
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
    }
    
    /**
     * Generates recommendations based on proposal evaluation
     * @param {number} valueScore - Value score
     * @param {number} fairnessScore - Fairness score
     * @param {number} protectionScore - Protection score
     * @param {boolean} approved - Whether proposal is approved
     * @returns {Array} Array of recommendation strings
     */
    generateRecommendations(valueScore, fairnessScore, protectionScore, approved) {
        const recommendations = [];
        
        if (approved) {
            recommendations.push("Proposal meets constitutional requirements.");
            
            // Suggest refinements based on lowest score
            const lowestScore = Math.min(valueScore, fairnessScore, protectionScore);
            
            if (lowestScore === valueScore && valueScore < 0.8) {
                recommendations.push("Consider enhancing value generation mechanisms.");
            } else if (lowestScore === fairnessScore && fairnessScore < 0.8) {
                recommendations.push("Consider strengthening fairness distribution framework.");
            } else if (lowestScore === protectionScore && protectionScore < 0.8) {
                recommendations.push("Consider improving protective safeguards.");
            }
            
            if (valueScore > 0.9 && fairnessScore > 0.9 && protectionScore > 0.9) {
                recommendations.push("Exceptional proposal with strong constitutional alignment.");
            }
        } else {
            recommendations.push("Proposal requires refinement to meet constitutional parameters.");
            
            // Provide specific feedback based on scores
            if (valueScore < 0.7) {
                recommendations.push("Value generation mechanisms need significant enhancement.");
            }
            
            if (fairnessScore < 0.7) {
                recommendations.push("Fairness distribution framework is inadequate.");
            }
            
            if (protectionScore < 0.7) {
                recommendations.push("Protection mechanisms are insufficient.");
            }
        }
        
        return recommendations;
    }
    
    /**
     * Updates metric bars in the UI
     * @param {number} valueScore - Value score
     * @param {number} fairnessScore - Fairness score
     * @param {number} protectionScore - Protection score
     */
    updateMetricBars(valueScore, fairnessScore, protectionScore) {
        const metricBars = document.querySelectorAll('.metric-value');
        
        if (metricBars.length >= 3) {
            metricBars[0].style.width = `${valueScore * 100}%`;
            metricBars[1].style.width = `${fairnessScore * 100}%`;
            metricBars[2].style.width = `${protectionScore * 100}%`;
        }
    }
    
    /**
     * Initializes the consensus graph visualization
     */
    initConsensusGraph() {
        const canvas = document.getElementById('consensus-graph');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Store canvas context for later updates
        this.consensusCtx = ctx;
        
        // Draw initial state
        this.updateConsensusGraph(0.9); // Default high consensus
    }
    
    /**
     * Updates the consensus graph with new data
     * @param {number} consensusIndex - Consensus index (0-1)
     */
    updateConsensusGraph(consensusIndex) {
        if (!this.consensusCtx) return;
        
        const ctx = this.consensusCtx;
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = 'rgba(28, 32, 41, 0.5)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw consensus visualization as a triangle
        ctx.beginPath();
        ctx.moveTo(width / 2, height * 0.2);
        ctx.lineTo(width * 0.2, height * 0.8);
        ctx.lineTo(width * 0.8, height * 0.8);
        ctx.closePath();
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(255, 214, 236, 0.7)'); // Pink
        gradient.addColorStop(0.5, 'rgba(216, 181, 255, 0.7)'); // Purple
        gradient.addColorStop(1, 'rgba(169, 238, 230, 0.7)'); // Turquoise
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw consensus circle
        const circleRadius = 10;
        const circleX = width / 2;
        const circleY = height / 2;
        
        // Calculate circle position based on consensus index
        // Higher consensus = closer to center
        const distance = (1 - consensusIndex) * (height * 0.3);
        const adjustedY = circleY - distance;
        
        // Draw glow
        ctx.shadowColor = 'rgba(169, 238, 230, 0.8)';
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.arc(circleX, adjustedY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Draw consensus value
        ctx.font = '16px "Governance Text", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(consensusIndex * 100)}%`, circleX, height * 0.9);
        
        // Label
        ctx.font = '12px "Governance Text", sans-serif';
        ctx.fillStyle = 'rgba(169, 238, 230, 0.9)';
        ctx.fillText('Consensus Index', circleX, height * 0.15);
    }
    
    /**
     * Starts a subtle animation cycle to indicate the constitutional core is operational
     */
    startCalibrationCycle() {
        // Create subtle pulsing effect on principles
        const principles = document.querySelectorAll('.principle');
        
        principles.forEach((principle, index) => {
            gsap.to(principle, {
                opacity: 0.7,
                duration: 2,
                repeat: -1,
                yoyo: true,
                delay: index * 0.5
            });
        });
        
        // Simulate occasional recalibration
        setInterval(() => {
            // Only recalibrate occasionally
            if (Math.random() > 0.7) {
                this.performRecalibration();
            }
        }, 10000); // Check every 10 seconds
    }
    
    /**
     * Performs a visual recalibration of the constitutional parameters
     */
    performRecalibration() {
        // Update a random constitutional parameter slightly
        const paramKeys = Object.keys(this.constitutionalParameters);
        const randomKey = paramKeys[Math.floor(Math.random() * paramKeys.length)];
        
        // Get current value
        const currentValue = this.constitutionalParameters[randomKey];
        
        // Adjust by small random amount
        const adjustment = (Math.random() * 0.1) - 0.05; // -0.05 to 0.05
        let newValue = currentValue + adjustment;
        
        // Ensure value stays in 0-1 range
        newValue = Math.max(0.1, Math.min(0.95, newValue));
        
        // Update parameter
        this.constitutionalParameters[randomKey] = newValue;
        
        // Visual feedback of recalibration
        const hexDisplay = document.querySelector('.hexagonal-display');
        hexDisplay.classList.add('recalibrating');
        
        // Add recalibration particles
        this.addRecalibrationParticles();
        
        // Update consensus graph
        this.updateConsensusGraph(0.85 + (Math.random() * 0.1));
        
        // Remove class after animation completes
        setTimeout(() => {
            hexDisplay.classList.remove('recalibrating');
        }, 1000);
    }
    
    /**
     * Adds visual particle effects during recalibration
     */
    addRecalibrationParticles() {
        const container = document.querySelector('.terminal-container');
        
        // Create particles
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.classList.add('data-particle');
            
            // Random position
            const x = Math.random() * container.offsetWidth;
            const y = container.offsetHeight;
            
            particle.style.left = `${x}px`;
            particle.style.bottom = '0px';
            
            // Random delay
            particle.style.animationDelay = `${Math.random() * 2}s`;
            
            // Add to container
            container.appendChild(particle);
            
            // Remove after animation completes
            setTimeout(() => {
                particle.remove();
            }, 6000);
        }
    }
}

// Initialize Constitutional Core when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.constitutionalCore = new ConstitutionalCore();
});