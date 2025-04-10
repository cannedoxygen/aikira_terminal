/**
 * Aikira Terminal - Simple Terminal Implementation
 * A basic terminal interface for Aikira
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    
    // Focus input field
    if (terminalInput) {
        terminalInput.focus();
        
        // Handle Enter key in input field
        terminalInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const input = terminalInput.value.trim();
                
                if (input) {
                    // Add user input to terminal
                    addTerminalLine('> ' + input, 'user-input');
                    
                    // Process the input
                    processInput(input);
                    
                    // Clear input field
                    terminalInput.value = '';
                }
            }
        });
    }
    
    // Process user input
    function processInput(input) {
        if (!terminalOutput) return;
        
        // Show typing indicator
        const typingLine = addTerminalLine('Aikira is processing...', 'typing');
        
        // Simulate processing delay
        setTimeout(() => {
            // Remove typing indicator if it exists
            if (typingLine && typingLine.parentNode === terminalOutput) {
                terminalOutput.removeChild(typingLine);
            }
            
            // Generate a response based on input keywords
            let response;
            
            if (input.toLowerCase().includes('help')) {
                response = 'Available commands:\n' +
                           '- help: Show this help message\n' +
                           '- proposal [text]: Submit a governance proposal\n' +
                           '- clear: Clear the terminal\n' +
                           '- status: Show system status';
            }
            else if (input.toLowerCase().includes('status')) {
                response = 'System Status:\n' +
                           '- Constitutional Core: Online\n' +
                           '- Consensus Index: 94.7%\n' +
                           '- Proposals Processed: 12';
            }
            else if (input.toLowerCase().includes('clear')) {
                // Clear the terminal
                if (terminalOutput) {
                    terminalOutput.innerHTML = '';
                }
                response = 'Terminal cleared.';
            }
            else {
                // Treat as a proposal
                response = evaluateProposal(input);
            }
            
            // Display response with typing effect
            typeResponse(response);
        }, 1000);
    }
    
    // Evaluate a proposal
    function evaluateProposal(proposal) {
        // Simple keyword-based evaluation
        let valueScore = 0.7 + (Math.random() * 0.2);
        let fairnessScore = 0.6 + (Math.random() * 0.3);
        let protectionScore = 0.7 + (Math.random() * 0.25);
        
        // Adjust scores based on keywords
        const lowerProposal = proposal.toLowerCase();
        
        if (lowerProposal.includes('value') || lowerProposal.includes('benefit')) {
            valueScore += 0.1;
        }
        
        if (lowerProposal.includes('fair') || lowerProposal.includes('equal')) {
            fairnessScore += 0.15;
        }
        
        if (lowerProposal.includes('protect') || lowerProposal.includes('secure')) {
            protectionScore += 0.12;
        }
        
        // Cap scores at 1.0
        valueScore = Math.min(valueScore, 1.0);
        fairnessScore = Math.min(fairnessScore, 1.0);
        protectionScore = Math.min(protectionScore, 1.0);
        
        // Calculate average score
        const avgScore = (valueScore + fairnessScore + protectionScore) / 3;
        const approved = avgScore >= 0.75;
        
        // Format response
        let response = 'Proposal evaluation complete.\n\n';
        response += `Value Score: ${Math.round(valueScore * 100)}%\n`;
        response += `Fairness Score: ${Math.round(fairnessScore * 100)}%\n`;
        response += `Protection Score: ${Math.round(protectionScore * 100)}%\n\n`;
        
        if (approved) {
            response += 'Your proposal has been approved. ';
            
            if (valueScore > fairnessScore && valueScore > protectionScore) {
                response += 'The proposal demonstrates strong value generation principles. ';
            } else if (fairnessScore > valueScore && fairnessScore > protectionScore) {
                response += 'The fairness distribution mechanisms are particularly well-designed. ';
            } else if (protectionScore > valueScore && protectionScore > fairnessScore) {
                response += 'The protective safeguards are robust and comprehensive. ';
            }
            
            // Add recommendations
            if (valueScore < 0.8) {
                response += 'Consider enhancing value generation mechanisms. ';
            }
            
            if (fairnessScore < 0.8) {
                response += 'The fairness distribution framework could be strengthened. ';
            }
            
            if (protectionScore < 0.8) {
                response += 'The protection protocols may benefit from additional safeguards. ';
            }
        } else {
            response += 'Your proposal requires refinement before approval. ';
            
            if (valueScore < 0.7) {
                response += 'The value generation mechanisms need significant enhancement. ';
            }
            
            if (fairnessScore < 0.7) {
                response += 'The fairness distribution framework is inadequate. ';
            }
            
            if (protectionScore < 0.7) {
                response += 'The protection mechanisms are insufficient. ';
            }
        }
        
        return response;
    }
    
    // Add a line to the terminal
    function addTerminalLine(text, className = '') {
        if (!terminalOutput) return null;
        
        const line = document.createElement('div');
        line.className = 'terminal-line ' + className;
        line.textContent = text;
        terminalOutput.appendChild(line);
        
        // Scroll output box to bottom
        const outputBox = document.querySelector('.output-box');
        if (outputBox) {
            outputBox.scrollTop = outputBox.scrollHeight;
        }
        
        return line;
    }
    
    // Type out a response character by character
    function typeResponse(text) {
        if (!terminalOutput) return;
        
        const lines = text.split('\n');
        let lineIndex = 0;
        let charIndex = 0;
        
        // Create initial line
        const line = addTerminalLine('', 'response');
        
        const typeChar = () => {
            // Check if we've reached the end of all lines
            if (lineIndex >= lines.length) {
                return;
            }
            
            // Check if we've reached the end of current line
            if (charIndex >= lines[lineIndex].length) {
                charIndex = 0;
                lineIndex++;
                
                // Check if we've reached the end of all lines
                if (lineIndex >= lines.length) {
                    return;
                }
                
                // Create a new line
                const newLine = addTerminalLine('', 'response');
                setTimeout(typeChar, 50); // Delay between lines
                return;
            }
            
            // Add next character
            if (line && line.parentNode === terminalOutput) {
                line.textContent += lines[lineIndex].charAt(charIndex);
            }
            charIndex++;
            
            // Schedule next character
            setTimeout(typeChar, 10);
        };
        
        // Start typing
        typeChar();
    }
});

// Simple class to maintain compatibility with the rest of the code
class AikiraTerminal {
    constructor() {
        // Empty constructor
    }
}