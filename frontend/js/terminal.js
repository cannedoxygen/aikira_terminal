/**
 * Aikira Terminal - Terminal Interface
 * Handles the terminal-style interaction and text display
 */

class TerminalInterface {
    constructor() {
        // Terminal elements
        this.terminalElement = document.querySelector('.response-text');
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isTyping = false;
        this.typeSpeed = 30; // ms per character
        this.currentTypingTimeout = null;
        
        // Terminal prompt configuration
        this.prompt = {
            primary: 'aikira> ',
            secondary: '...... ',
            current: 'aikira> ',
            color: 'var(--soft-pink)'
        };
        
        // History size limit
        this.maxHistorySize = 50;
        
        // Initialize the terminal
        this.init();
    }
    
    init() {
        // Setup terminal styling
        this.setupTerminalStyling();
    }
    
    setupTerminalStyling() {
        // Apply terminal-specific styling
        if (this.terminalElement) {
            this.terminalElement.classList.add('terminal-text');
        }
    }
    
    /**
     * Displays text in the terminal with a typewriter effect
     * @param {HTMLElement} element - Element to type text into
     * @param {string} text - Text to display
     * @param {number} speed - Typing speed in ms (optional)
     * @returns {Promise} Resolves when typing is complete
     */
    typeText(element, text, speed = this.typeSpeed) {
        if (!element) return Promise.resolve();
        
        // Cancel any current typing
        this.cancelTyping();
        
        // Make sure terminal is visible
        element.style.display = 'block';
        
        this.isTyping = true;
        
        // Clear existing content
        element.textContent = '';
        
        // Type text character by character
        let i = 0;
        return new Promise((resolve) => {
            const typeNextChar = () => {
                if (i < text.length) {
                    // Process special characters
                    if (text[i] === '\n') {
                        element.innerHTML += '<br>';
                    } else {
                        element.textContent += text[i];
                    }
                    
                    i++;
                    this.scrollToBottom();
                    this.currentTypingTimeout = setTimeout(typeNextChar, speed);
                } else {
                    this.isTyping = false;
                    resolve();
                }
            };
            
            typeNextChar();
        });
    }
    
    /**
     * Cancels current typing animation
     */
    cancelTyping() {
        if (this.currentTypingTimeout) {
            clearTimeout(this.currentTypingTimeout);
            this.currentTypingTimeout = null;
        }
        this.isTyping = false;
    }
    
    /**
     * Scrolls the terminal to the bottom
     */
    scrollToBottom() {
        if (this.terminalElement) {
            this.terminalElement.scrollTop = this.terminalElement.scrollHeight;
        }
    }
    
    /**
     * Clears the terminal content
     */
    clearTerminal() {
        if (this.terminalElement) {
            this.terminalElement.innerHTML = '';
        }
    }
    
    /**
     * Creates a simulated terminal glitch effect
     * @param {number} duration - Effect duration in ms
     */
    createGlitchEffect(duration = 1000) {
        if (!this.terminalElement) return;
        
        // Create glitch overlay
        const glitchOverlay = document.createElement('div');
        glitchOverlay.classList.add('terminal-glitch-overlay');
        glitchOverlay.style.position = 'absolute';
        glitchOverlay.style.top = '0';
        glitchOverlay.style.left = '0';
        glitchOverlay.style.width = '100%';
        glitchOverlay.style.height = '100%';
        glitchOverlay.style.background = 'transparent';
        glitchOverlay.style.pointerEvents = 'none';
        glitchOverlay.style.zIndex = '10';
        
        // Add to terminal
        if (this.terminalElement.parentElement) {
            this.terminalElement.parentElement.style.position = 'relative';
            this.terminalElement.parentElement.appendChild(glitchOverlay);
            
            // Create glitch effect
            let glitchCount = 0;
            
            const createGlitch = () => {
                // Random glitch line
                const glitchLine = document.createElement('div');
                glitchLine.style.position = 'absolute';
                glitchLine.style.height = `${Math.random() * 2 + 1}px`;
                glitchLine.style.width = `${Math.random() * 50 + 50}%`;
                glitchLine.style.background = `rgba(216, 181, 255, ${Math.random() * 0.5 + 0.2})`;
                glitchLine.style.top = `${Math.random() * 100}%`;
                glitchLine.style.left = `${Math.random() * 50}%`;
                glitchLine.style.filter = 'blur(1px)';
                
                glitchOverlay.appendChild(glitchLine);
                
                // Remove after short duration
                setTimeout(() => {
                    glitchLine.remove();
                }, Math.random() * 200 + 50);
                
                // Continue effect if duration not exceeded
                glitchCount++;
                if (glitchCount < duration / 100) {
                    setTimeout(createGlitch, Math.random() * 100 + 50);
                } else {
                    // Remove overlay when done
                    setTimeout(() => {
                        glitchOverlay.remove();
                    }, 100);
                }
            };
            
            createGlitch();
        }
    }
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.terminalInterface = new TerminalInterface();
});