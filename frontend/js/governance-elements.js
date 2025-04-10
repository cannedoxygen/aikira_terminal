/**
 * Aikira Terminal - Governance Elements
 * Handles governance-specific features and visualizations
 */

class GovernanceSystem {
    constructor() {
        // Governance state
        this.governanceState = {
            consensusLevel: 0.92,         // Current consensus level (0-1)
            proposalsEvaluated: 0,        // Number of evaluated proposals
            constitutionalStrength: 0.95, // Strength of constitutional parameters
            activeNotices: [],            // Active governance notices
            valueDistribution: [0.8, 0.75, 0.9, 0.85, 0.7], // Last 5 value scores
            fairnessDistribution: [0.85, 0.8, 0.75, 0.9, 0.8], // Last 5 fairness scores
            protectionDistribution: [0.9, 0.85, 0.8, 0.95, 0.9] // Last 5 protection scores
        };
        
        // Governance thresholds
        this.thresholds = {
            consensusWarning: 0.7,  // Threshold for consensus warning
            consensusCritical: 0.5  // Threshold for critical consensus
        };
        
        // DOM elements
        this.consensusPanel = document.getElementById('consensus-panel');
        this.evaluationPanel = document.getElementById('evaluation-panel');
        this.governanceNotices = document.querySelector('#governance-notices .status-value');
        
        // Initialize
        this.init();
    }
    
    init() {
        // Initialize governance panels
        this.initConsensusVisualization();
        
        // Set up any event listeners
        this.setupEventListeners();
        
        // Start background governance processes
        this.startGovernanceMonitoring();
    }
    
    setupEventListeners() {
        // Add any governance-specific event listeners here
    }
    
    /**
     * Initialize the consensus visualization panel
     */
    initConsensusVisualization() {
        if (!this.consensusPanel) return;
        
        // Initial value update
        this.updateConsensusDisplay(this.governanceState.consensusLevel);
    }
    
    /**
     * Updates the consensus visualization
     * @param {number} consensusLevel - Current consensus level (0-1)
     */
    updateConsensusDisplay(consensusLevel) {
        if (!this.consensusPanel) return;
        
        // Update consensus index in header
        const consensusIndexElement = document.querySelector('#consensus-index .status-value');
        if (consensusIndexElement) {
            consensusIndexElement.textContent = `${Math.round(consensusLevel * 100)}%`;
            
            // Set color based on threshold
            if (consensusLevel < this.thresholds.consensusCritical) {
                consensusIndexElement.style.borderBottomColor = '#FF6B6B'; // Red for critical
            } else if (consensusLevel < this.thresholds.consensusWarning) {
                consensusIndexElement.style.borderBottomColor = '#FFD166'; // Yellow for warning
            } else {
                consensusIndexElement.style.borderBottomColor = '#A9EEE6'; // Turquoise for good
            }
        }
        
        // Constitutional Core handles the actual visualization in the panel
        // This just updates the value
        if (window.constitutionalCore) {
            window.constitutionalCore.updateConsensusGraph(consensusLevel);
        }
    }
    
    /**
     * Processes a governance proposal
     * @param {string} proposalText - The proposal text
     * @returns {Object} Evaluation results
     */
    processProposal(proposalText) {
        // Increment proposal count
        this.governanceState.proposalsEvaluated++;
        
        // Evaluate proposal using constitutional core
        let evaluationResults;
        
        if (window.constitutionalCore) {
            evaluationResults = window.constitutionalCore.evaluateProposal(proposalText);
            
            // Update governance state
            this.updateGovernanceState(evaluationResults);
        } else {
            // Fallback if constitutional core not available
            evaluationResults = this.generateFallbackEvaluation(proposalText);
        }
        
        return evaluationResults;
    }
    
    /**
     * Fallback evaluation if constitutional core is not available
     * @param {string} proposalText - The proposal text
     * @returns {Object} Basic evaluation results
     */
    generateFallbackEvaluation(proposalText) {
        // Simple fallback scoring
        const valueScore = 0.7 + (Math.random() * 0.2);
        const fairnessScore = 0.6 + (Math.random() * 0.3);
        const protectionScore = 0.7 + (Math.random() * 0.25);
        
        const totalScore = (valueScore + fairnessScore + protectionScore) / 3;
        const approved = totalScore >= 0.7;
        
        return {
            scores: {
                value: valueScore,
                fairness: fairnessScore,
                protection: protectionScore,
                total: totalScore
            },
            consensusIndex: 0.8 + (Math.random() * 0.15),
            approved,
            highConsensus: true,
            recommendedActions: [
                approved ? 
                    "Proposal meets basic governance requirements." : 
                    "Proposal requires refinement to meet governance standards."
            ]
        };
    }
    
    /**
     * Updates governance state based on evaluation results
     * @param {Object} evaluationResults - Results from proposal evaluation
     */
    updateGovernanceState(evaluationResults) {
        // Update distribution histories
        this.governanceState.valueDistribution.push(evaluationResults.scores.value);
        this.governanceState.valueDistribution.shift();
        
        this.governanceState.fairnessDistribution.push(evaluationResults.scores.fairness);
        this.governanceState.fairnessDistribution.shift();
        
        this.governanceState.protectionDistribution.push(evaluationResults.scores.protection);
        this.governanceState.protectionDistribution.shift();
        
        // Update consensus level (weighted average of current and new)
        this.governanceState.consensusLevel = 
            (this.governanceState.consensusLevel * 0.7) + 
            (evaluationResults.consensusIndex * 0.3);
        
        // Update UI
        this.updateConsensusDisplay(this.governanceState.consensusLevel);
    }
    
    /**
     * Adds a governance notice
     * @param {string} message - Notice message
     * @param {string} level - Notice level ('info', 'warning', 'critical')
     * @param {number} duration - Duration in ms (0 for permanent)
     */
    addGovernanceNotice(message, level = 'info', duration = 30000) {
        // Create notice object
        const notice = {
            id: Date.now(),
            message,
            level,
            timestamp: new Date().toISOString()
        };
        
        // Add to active notices
        this.governanceState.activeNotices.push(notice);
        
        // Update notice count in UI
        this.updateNoticeCount();
        
        // Play notification sound if appropriate
        if (level === 'warning' || level === 'critical') {
            const alertSound = document.getElementById('governance-alert-sound');
            if (alertSound) {
                alertSound.play();
            }
        }
        
        // Create notification element
        this.displayNotification(notice);
        
        // Auto-expire if duration provided
        if (duration > 0) {
            setTimeout(() => {
                this.removeGovernanceNotice(notice.id);
            }, duration);
        }
        
        return notice.id;
    }
    
    /**
     * Removes a governance notice
     * @param {number} noticeId - ID of the notice to remove
     */
    removeGovernanceNotice(noticeId) {
        const index = this.governanceState.activeNotices.findIndex(
            notice => notice.id === noticeId
        );
        
        if (index !== -1) {
            this.governanceState.activeNotices.splice(index, 1);
            this.updateNoticeCount();
            
            // Remove notification element if it exists
            const notificationElement = document.querySelector(`.governance-notification[data-id="${noticeId}"]`);
            if (notificationElement) {
                notificationElement.classList.add('notification-exit');
                setTimeout(() => {
                    notificationElement.remove();
                }, 300);
            }
        }
    }
    
    /**
     * Updates the notice count in the UI
     */
    updateNoticeCount() {
        if (this.governanceNotices) {
            const count = this.governanceState.activeNotices.length;
            this.governanceNotices.textContent = count;
            
            // Highlight if notices exist
            if (count > 0) {
                this.governanceNotices.style.borderBottomColor = count > 2 ? 
                    '#FF6B6B' : // Red for multiple notices
                    '#FFD166'; // Yellow for few notices
            } else {
                this.governanceNotices.style.borderBottomColor = '#A9EEE6'; // Default
            }
        }
    }
    
    /**
     * Creates and displays a notification element
     * @param {Object} notice - Notice object
     */
    displayNotification(notice) {
        // Create container if it doesn't exist
        let notificationContainer = document.querySelector('.governance-notifications');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.classList.add('governance-notifications');
            notificationContainer.style.position = 'absolute';
            notificationContainer.style.top = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.maxWidth = '300px';
            notificationContainer.style.zIndex = '1000';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('governance-notification', 'notification-enter');
        notificationElement.setAttribute('data-id', notice.id);
        
        // Set styles based on level
        let bgColor, borderColor;
        
        switch (notice.level) {
            case 'critical':
                bgColor = 'rgba(255, 107, 107, 0.2)';
                borderColor = '#FF6B6B';
                break;
            case 'warning':
                bgColor = 'rgba(255, 209, 102, 0.2)';
                borderColor = '#FFD166';
                break;
            default: // info
                bgColor = 'rgba(169, 238, 230, 0.2)';
                borderColor = '#A9EEE6';
        }
        
        // Style notification
        notificationElement.style.padding = '12px 15px';
        notificationElement.style.marginBottom = '10px';
        notificationElement.style.backgroundColor = bgColor;
        notificationElement.style.borderLeft = `3px solid ${borderColor}`;
        notificationElement.style.borderRadius = '4px';
        notificationElement.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        notificationElement.style.fontFamily = 'var(--text-font)';
        notificationElement.style.fontSize = '14px';
        notificationElement.style.color = 'var(--soft-white)';
        notificationElement.style.animation = 'fadeIn 0.3s ease-out forwards';
        
        // Create header with timestamp
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.marginBottom = '5px';
        
        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.style.color = borderColor;
        title.textContent = notice.level.charAt(0).toUpperCase() + notice.level.slice(1);
        
        const timestamp = document.createElement('div');
        timestamp.style.fontSize = '12px';
        timestamp.style.opacity = '0.7';
        const time = new Date(notice.timestamp);
        timestamp.textContent = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        header.appendChild(title);
        header.appendChild(timestamp);
        
        // Message
        const message = document.createElement('div');
        message.textContent = notice.message;
        
        // Close button
        const closeButton = document.createElement('div');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '8px';
        closeButton.style.right = '8px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.opacity = '0.7';
        closeButton.style.transition = 'opacity 0.2s';
        
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.opacity = '1';
        });
        
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.opacity = '0.7';
        });
        
        closeButton.addEventListener('click', () => {
            this.removeGovernanceNotice(notice.id);
        });
        
        // Assemble notification
        notificationElement.appendChild(header);
        notificationElement.appendChild(message);
        notificationElement.appendChild(closeButton);
        
        // Add to container
        notificationContainer.prepend(notificationElement);
        
        // Add CSS for animations if not already present
        if (!document.querySelector('#governance-notification-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'governance-notification-styles';
            styleElement.textContent = `
                @keyframes notification-enter {
                    from { opacity: 0; transform: translateX(50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                
                @keyframes notification-exit {
                    from { opacity: 1; transform: translateX(0); }
                    to { opacity: 0; transform: translateX(50px); }
                }
                
                .notification-enter {
                    animation: notification-enter 0.3s ease-out forwards;
                }
                
                .notification-exit {
                    animation: notification-exit 0.3s ease-in forwards;
                }
            `;
            document.head.appendChild(styleElement);
        }
    }
    
    /**
     * Starts background governance monitoring tasks
     */
    startGovernanceMonitoring() {
        // Simulate periodic governance activities
        setInterval(() => {
            this.simulateBackgroundGovernance();
        }, 20000); // Every 20 seconds
    }
    
    /**
     * Simulates background governance activities
     */
    simulateBackgroundGovernance() {
        // Only occasionally trigger an event (1 in 3 chance)
        if (Math.random() > 0.3) return;
        
        // Different possible governance events
        const possibleEvents = [
            {
                type: 'info',
                messages: [
                    'Constitutional parameter optimization complete.',
                    'Fairness distribution model updated successfully.',
                    'Value alignment checks passed all validation tests.',
                    'Protection framework integrity verified.',
                    'Inter-system consensus synchronization complete.'
                ]
            },
            {
                type: 'warning',
                messages: [
                    'Minor variance detected in fairness distribution algorithm.',
                    'Value optimization routine encountered soft constraints.',
                    'Protection parameter drift requires recalibration.',
                    'Consensus index shows declining trend in sector B-7.',
                    'Constitutional boundary condition approaching threshold limit.'
                ]
            },
            {
                type: 'critical',
                frequency: 0.1, // Rare, only 10% of governance events should be critical
                messages: [
                    'Critical protection vulnerability detected in proposal evaluation pathway.',
                    'Fairness distribution matrix instability detected - manual review required.',
                    'Constitutional parameter integrity error in value assessment module.',
                    'Severe consensus divergence detected in core governance functions.',
                    'Emergency fairness recalibration initiated due to systemic anomaly.'
                ]
            }
        ];
        
        // Randomly select event type with appropriate weighting
        let eventType;
        const rand = Math.random();
        
        if (rand < 0.1) { // 10% chance of critical
            eventType = possibleEvents.find(event => event.type === 'critical');
        } else if (rand < 0.3) { // 20% chance of warning
            eventType = possibleEvents.find(event => event.type === 'warning');
        } else { // 70% chance of info
            eventType = possibleEvents.find(event => event.type === 'info');
        }
        
        // Select random message from the chosen event type
        const message = eventType.messages[Math.floor(Math.random() * eventType.messages.length)];
        
        // Add governance notice
        this.addGovernanceNotice(message, eventType.type);
    }
    
    /**
     * Generates a governance report based on current state
     * @returns {string} Formatted governance report
     */
    generateGovernanceReport() {
        // Calculate summary statistics
        const avgValueScore = this.calculateAverage(this.governanceState.valueDistribution);
        const avgFairnessScore = this.calculateAverage(this.governanceState.fairnessDistribution);
        const avgProtectionScore = this.calculateAverage(this.governanceState.protectionDistribution);
        
        const totalAverage = (avgValueScore + avgFairnessScore + avgProtectionScore) / 3;
        
        // Format report
        let report = '========== AIKIRA GOVERNANCE REPORT ==========\n\n';
        
        report += `CONSTITUTIONAL ALIGNMENT: ${Math.round(this.governanceState.constitutionalStrength * 100)}%\n`;
        report += `CONSENSUS INDEX: ${Math.round(this.governanceState.consensusLevel * 100)}%\n`;
        report += `PROPOSALS EVALUATED: ${this.governanceState.proposalsEvaluated}\n\n`;
        
        report += '--- Constitutional Parameter Performance ---\n';
        report += `VALUE MAXIMIZATION: ${Math.round(avgValueScore * 100)}%\n`;
        report += `FAIRNESS DISTRIBUTION: ${Math.round(avgFairnessScore * 100)}%\n`;
        report += `PROTECTION FRAMEWORK: ${Math.round(avgProtectionScore * 100)}%\n`;
        report += `OVERALL PERFORMANCE: ${Math.round(totalAverage * 100)}%\n\n`;
        
        // Add active notices
        if (this.governanceState.activeNotices.length > 0) {
            report += '--- Active Governance Notices ---\n';
            
            this.governanceState.activeNotices.forEach(notice => {
                const time = new Date(notice.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                report += `[${notice.level.toUpperCase()}] ${time}: ${notice.message}\n`;
            });
            
            report += '\n';
        }
        
        // Add recommendations
        report += '--- Governance Recommendations ---\n';
        
        if (avgValueScore < 0.7) {
            report += '• Value maximization processes require optimization.\n';
        }
        
        if (avgFairnessScore < 0.7) {
            report += '• Fairness distribution algorithms need recalibration.\n';
        }
        
        if (avgProtectionScore < 0.7) {
            report += '• Protection framework requires reinforcement.\n';
        }
        
        if (this.governanceState.consensusLevel < this.thresholds.consensusWarning) {
            report += '• Consensus-building processes need urgent attention.\n';
        }
        
        if (avgValueScore >= 0.9 && avgFairnessScore >= 0.9 && avgProtectionScore >= 0.9) {
            report += '• All constitutional parameters operating at optimal levels.\n';
        }
        
        report += '\n========== END OF REPORT ==========';
        
        return report;
    }
    
    /**
     * Calculates average of array values
     * @param {Array} array - Array of numbers
     * @returns {number} Average value
     */
    calculateAverage(array) {
        return array.reduce((sum, value) => sum + value, 0) / array.length;
    }
}

// Initialize governance system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.governanceSystem = new GovernanceSystem();
});