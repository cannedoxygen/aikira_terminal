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
        
        // Add event listeners for terminal commands (if needed)
        this.addEventListeners();
    }
    
    setupTerminalStyling() {
        // Apply terminal-specific styling
        if (this.terminalElement) {
            this.terminalElement.classList.add('terminal-text');
        }
    }
    
    addEventListeners() {
        // Could add keyboard event listeners for command history navigation
        // document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    /**
     * Displays text in the terminal with a typewriter effect
     * @param {string} text - Text to display
     * @param {number} speed - Typing speed in ms (optional)
     * @param {boolean} addPrompt - Whether to add prompt before text
     * @param {boolean} addNewLine - Whether to add a new line after text
     * @returns {Promise} Resolves when typing is complete
     */
    async typeText(text, speed = this.typeSpeed, addPrompt = false, addNewLine = true) {
        if (!this.terminalElement) return Promise.resolve();
        
        // Cancel any current typing
        this.cancelTyping();
        
        // Make sure terminal is visible
        this.terminalElement.style.display = 'block';
        
        this.isTyping = true;
        
        // Add a new line if content exists
        if (this.terminalElement.textContent && addNewLine) {
            this.terminalElement.innerHTML += '<br>';
        }
        
        // Add prompt if requested
        if (addPrompt) {
            this.terminalElement.innerHTML += `<span style="color:${this.prompt.color}">${this.prompt.current}</span>`;
        }
        
        // Create a span for the new text
        const textSpan = document.createElement('span');
        textSpan.classList.add('terminal-content');
        this.terminalElement.appendChild(textSpan);
        
        // Type text character by character
        let i = 0;
        return new Promise((resolve) => {
            const typeNextChar = () => {
                if (i < text.length) {
                    // Process special characters
                    if (text[i] === '\n') {
                        textSpan.innerHTML += '<br>';
                        if (addPrompt) {
                            textSpan.innerHTML += `<span style="color:${this.prompt.color}">${this.prompt.secondary}</span>`;
                        }
                    } else {
                        textSpan.textContent += text[i];
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
     * Immediately displays text without typing effect
     * @param {string} text - Text to display
     * @param {boolean} addPrompt - Whether to add prompt before text
     * @param {boolean} addNewLine - Whether to add a new line after text
     */
    displayText(text, addPrompt = false, addNewLine = true) {
        if (!this.terminalElement) return;
        
        // Cancel any current typing
        this.cancelTyping();
        
        // Make sure terminal is visible
        this.terminalElement.style.display = 'block';
        
        // Add a new line if content exists
        if (this.terminalElement.textContent && addNewLine) {
            this.terminalElement.innerHTML += '<br>';
        }
        
        // Add prompt if requested
        if (addPrompt) {
            this.terminalElement.innerHTML += `<span style="color:${this.prompt.color}">${this.prompt.current}</span>`;
        }
        
        // Add text (handling newlines)
        const formattedText = text.replace(/\n/g, () => {
            if (addPrompt) {
                return `<br><span style="color:${this.prompt.color}">${this.prompt.secondary}</span>`;
            }
            return '<br>';
        });
        
        this.terminalElement.innerHTML += `<span class="terminal-content">${formattedText}</span>`;
        this.scrollToBottom();
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
     * Adds a command to the history
     * @param {string} command - Command to add
     */
    addToHistory(command) {
        if (command.trim()) {
            this.commandHistory.unshift(command);
            
            // Limit history size
            if (this.commandHistory.length > this.maxHistorySize) {
                this.commandHistory.pop();
            }
            
            this.historyIndex = -1;
        }
    }
    
    /**
     * Displays an error message
     * @param {string} message - Error message
     */
    displayError(message) {
        if (!this.terminalElement) return;
        
        const errorSpan = document.createElement('span');
        errorSpan.classList.add('terminal-error');
        errorSpan.style.color = '#FF6B6B';
        errorSpan.textContent = message;
        
        this.terminalElement.appendChild(document.createElement('br'));
        this.terminalElement.appendChild(errorSpan);
        this.scrollToBottom();
    }
    
    /**
     * Displays a success message
     * @param {string} message - Success message
     */
    displaySuccess(message) {
        if (!this.terminalElement) return;
        
        const successSpan = document.createElement('span');
        successSpan.classList.add('terminal-success');
        successSpan.style.color = 'var(--accent-turquoise)';
        successSpan.textContent = message;
        
        this.terminalElement.appendChild(document.createElement('br'));
        this.terminalElement.appendChild(successSpan);
        this.scrollToBottom();
    }
    
    /**
     * Displays a warning message
     * @param {string} message - Warning message
     */
    displayWarning(message) {
        if (!this.terminalElement) return;
        
        const warningSpan = document.createElement('span');
        warningSpan.classList.add('terminal-warning');
        warningSpan.style.color = '#FFD166';
        warningSpan.textContent = message;
        
        this.terminalElement.appendChild(document.createElement('br'));
        this.terminalElement.appendChild(warningSpan);
        this.scrollToBottom();
    }
    
    /**
     * Displays code in a code block
     * @param {string} code - Code to display
     * @param {string} language - Programming language (optional)
     */
    displayCode(code, language = '') {
        if (!this.terminalElement) return;
        
        const codeBlock = document.createElement('div');
        codeBlock.classList.add('code-block');
        
        if (language) {
            const languageTag = document.createElement('div');
            languageTag.classList.add('code-language');
            languageTag.textContent = language;
            codeBlock.appendChild(languageTag);
        }
        
        const codeContent = document.createElement('pre');
        codeContent.textContent = code;
        codeBlock.appendChild(codeContent);
        
        this.terminalElement.appendChild(document.createElement('br'));
        this.terminalElement.appendChild(codeBlock);
        this.scrollToBottom();
    }
    
    /**
     * Displays a status message with processing animation
     * @param {string} message - Status message
     * @returns {Object} Methods to update or complete the status
     */
    displayStatus(message) {
        if (!this.terminalElement) return { update: () => {}, complete: () => {} };
        
        const statusLine = document.createElement('div');
        statusLine.classList.add('terminal-status');
        
        const statusText = document.createElement('span');
        statusText.textContent = message;
        statusLine.appendChild(statusText);
        
        const processingIndicator = document.createElement('span');
        processingIndicator.classList.add('data-processing');
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            processingIndicator.appendChild(dot);
        }
        
        statusLine.appendChild(processingIndicator);
        this.terminalElement.appendChild(statusLine);
        this.scrollToBottom();
        
        return {
            update: (newMessage) => {
                statusText.textContent = newMessage;
                this.scrollToBottom();
            },
            complete: (finalMessage, isSuccess = true) => {
                processingIndicator.remove();
                statusText.textContent = finalMessage;
                statusText.style.color = isSuccess ? 'var(--accent-turquoise)' : '#FF6B6B';
                this.scrollToBottom();
            }
        };
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
    
    /**
     * Displays a data analysis visualization
     * @param {Array} data - Data to visualize
     * @param {string} type - Visualization type ('bar', 'line', etc.)
     */
    displayVisualization(data, type = 'bar') {
        if (!this.terminalElement) return;
        
        const visualContainer = document.createElement('div');
        visualContainer.classList.add('terminal-visualization');
        visualContainer.style.height = '100px';
        visualContainer.style.margin = '10px 0';
        visualContainer.style.display = 'flex';
        visualContainer.style.alignItems = 'flex-end';
        visualContainer.style.gap = '2px';
        
        // For bar chart visualization
        if (type === 'bar') {
            const maxValue = Math.max(...data);
            
            data.forEach(value => {
                const bar = document.createElement('div');
                bar.style.flex = '1';
                bar.style.height = `${(value / maxValue) * 100}%`;
                bar.style.background = 'linear-gradient(to top, var(--accent-pink), var(--accent-purple))';
                bar.style.borderRadius = '2px';
                bar.style.transition = 'height 0.5s ease';
                
                visualContainer.appendChild(bar);
            });
        }
        
        this.terminalElement.appendChild(visualContainer);
        this.scrollToBottom();
    }
    
    /**
     * Creates a spinning loader effect
     * @param {string} message - Loading message
     * @returns {Object} Control object with stop method
     */
    createLoader(message = 'Processing') {
        if (!this.terminalElement) return { stop: () => {} };
        
        const loaderContainer = document.createElement('div');
        loaderContainer.classList.add('terminal-loader');
        loaderContainer.style.display = 'flex';
        loaderContainer.style.alignItems = 'center';
        loaderContainer.style.gap = '10px';
        loaderContainer.style.margin = '5px 0';
        
        // Create spinner
        const spinner = document.createElement('div');
        spinner.classList.add('loader-spinner');
        spinner.style.width = '15px';
        spinner.style.height = '15px';
        spinner.style.border = '2px solid var(--trans-light)';
        spinner.style.borderTop = '2px solid var(--accent-purple)';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'rotate 1s linear infinite';
        
        // Create message
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        
        loaderContainer.appendChild(spinner);
        loaderContainer.appendChild(messageSpan);
        
        this.terminalElement.appendChild(loaderContainer);
        this.scrollToBottom();
        
        return {
            stop: (completionMessage = '') => {
                spinner.style.animation = 'none';
                spinner.style.border = '2px solid var(--accent-turquoise)';
                if (completionMessage) {
                    messageSpan.textContent = completionMessage;
                }
            },
            update: (newMessage) => {
                messageSpan.textContent = newMessage;
                this.scrollToBottom();
            }
        };
    }
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.terminalInterface = new TerminalInterface();
});