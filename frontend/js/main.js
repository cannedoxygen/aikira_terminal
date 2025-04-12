/**
 * Aikira Terminal - Main JavaScript
 * Handles UI interactions and animations
 * Audio processing has been moved to audio-processor.js
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements - only retain references to UI elements, not functionality elements
    const consensusValue = document.querySelector('.consensus-value');
    const consensusStatusValue = document.querySelector('#consensus-index .status-value');
    
    // Debug mode - set to true for more logging
    const debugMode = true;
    
    // Initialize app
    initializeApp();
    
    function initializeApp() {
        console.log('Initializing Aikira Terminal');
        
        // Create floating particles
        createParticles();
        
        // Add initial system message
        addSystemMessage("System initialized: " + new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));
        
        console.log('Aikira Terminal initialized');
    }
    
    // Clear conversation feed at startup
    function clearConversationFeed() {
        const conversationFeed = document.getElementById('conversation-feed');
        if (conversationFeed) {
            conversationFeed.innerHTML = '';
        }
    }
    
    // Add system message
    function addSystemMessage(text) {
        const conversationFeed = document.getElementById('conversation-feed');
        if (conversationFeed) {
            const systemMsg = document.createElement('div');
            systemMsg.className = 'system-message';
            systemMsg.textContent = text;
            conversationFeed.appendChild(systemMsg);
        }
    }
    
    // Create floating particles effect
    function createParticles() {
        console.log('Creating background particles');
        
        const container = document.querySelector('.digital-world-bg');
        if (!container) return;
        
        // Add CSS for particles if not already in stylesheet
        const style = document.createElement('style');
        style.textContent = `
            .particle {
                position: absolute;
                border-radius: 50%;
                opacity: 0.5;
                pointer-events: none;
                animation: float 8s ease-in-out infinite;
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0) translateX(0); }
                25% { transform: translateY(-20px) translateX(10px); }
                50% { transform: translateY(10px) translateX(-15px); }
                75% { transform: translateY(15px) translateX(5px); }
            }
        `;
        document.head.appendChild(style);
        
        const colors = ['var(--soft-pink)', 'var(--lavender-purple)', 'var(--pastel-turquoise)'];
        
        // Create 20 particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random position
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            particle.style.left = `${x}%`;
            particle.style.top = `${y}%`;
            
            // Random color
            const color = colors[Math.floor(Math.random() * colors.length)];
            particle.style.backgroundColor = color;
            
            // Random size
            const size = Math.random() * 3 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random animation delay
            const delay = Math.random() * 8;
            particle.style.animationDelay = `${delay}s`;
            
            // Add to container
            container.appendChild(particle);
        }
    }
    
    // Animate active waveform
    function animateActiveWaveform(isActive) {
        const canvas = document.getElementById('voice-waveform');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (isActive) {
            // Cancel any existing animation
            if (window.activeWaveformAnimationId) {
                cancelAnimationFrame(window.activeWaveformAnimationId);
            }
            
            // Active visualization function
            const drawActiveWave = () => {
                // Check if we should continue animating
                if (!isActive && !document.querySelector('.voice-input-btn.active') && 
                    document.getElementById('input-status')?.textContent !== 'Speaking...') {
                    cancelAnimationFrame(window.activeWaveformAnimationId);
                    return;
                }
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(28, 32, 41, 0.8)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const centerY = canvas.height / 2;
                
                // Draw a more active waveform
                ctx.beginPath();
                ctx.moveTo(0, centerY);
                
                for (let x = 0; x < canvas.width; x++) {
                    // More dynamic wave with multiple frequencies
                    const y = centerY + 
                        Math.sin(x * 0.05 + Date.now() * 0.002) * 10 + 
                        Math.sin(x * 0.02 + Date.now() * 0.001) * 5;
                    ctx.lineTo(x, y);
                }
                
                // Gradient stroke
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                gradient.addColorStop(0, 'rgba(255, 214, 236, 0.8)');
                gradient.addColorStop(0.5, 'rgba(216, 181, 255, 0.8)');
                gradient.addColorStop(1, 'rgba(169, 238, 230, 0.8)');
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Continue animation
                window.activeWaveformAnimationId = requestAnimationFrame(drawActiveWave);
            };
            
            // Start active animation
            window.activeWaveformAnimationId = requestAnimationFrame(drawActiveWave);
        } else {
            // Cancel active animation if it exists
            if (window.activeWaveformAnimationId) {
                cancelAnimationFrame(window.activeWaveformAnimationId);
                window.activeWaveformAnimationId = null;
            }
        }
    }
    
    // Add Aikira message to conversation feed
    function addAikiraMessageToConversation(text) {
        const conversationFeed = document.getElementById('conversation-feed');
        if (!conversationFeed) return;
        
        // Create message element
        const message = document.createElement('div');
        message.className = 'message message-aikira';
        
        // Get current time
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        
        // Create message header
        const header = document.createElement('div');
        header.className = 'message-header';
        header.innerHTML = `
            <span class="message-sender sender-aikira">Aikira</span>
            <span class="message-time">${timeStr}</span>
        `;
        
        // Create message bubble
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Add typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingIndicator.appendChild(dot);
        }
        bubble.appendChild(typingIndicator);
        
        // Add to message
        message.appendChild(header);
        message.appendChild(bubble);
        
        // Add to feed
        conversationFeed.appendChild(message);
        
        // Scroll to bottom
        const terminalBody = document.getElementById('terminal-body');
        if (terminalBody) {
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
        
        // Type text with animation
        setTimeout(() => {
            // Remove typing indicator
            bubble.removeChild(typingIndicator);
            
            // Type text letter by letter
            let i = 0;
            function typeCharacter() {
                if (i < text.length) {
                    bubble.textContent += text.charAt(i);
                    i++;
                    
                    // Scroll to bottom as typing occurs
                    if (terminalBody) {
                        terminalBody.scrollTop = terminalBody.scrollHeight;
                    }
                    
                    setTimeout(typeCharacter, 30);
                }
            }
            
            typeCharacter();
        }, 500);
    }
    
    // Add user message to conversation feed
    function addUserMessageToConversation(text) {
        const conversationFeed = document.getElementById('conversation-feed');
        if (!conversationFeed) return;
        
        // Create message element
        const message = document.createElement('div');
        message.className = 'message message-user';
        
        // Get current time
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        
        // Create random user ID if not already created
        if (!window.currentUserId) {
            window.currentUserId = "User" + Math.floor(Math.random() * 10000);
        }
        
        // Add message content
        message.innerHTML = `
            <div class="message-header">
                <span class="message-sender sender-user">${window.currentUserId}</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-bubble">${text}</div>
        `;
        
        // Add to feed
        conversationFeed.appendChild(message);
        
        // Scroll to bottom
        const terminalBody = document.getElementById('terminal-body');
        if (terminalBody) {
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
    }
    
    // Update metrics with received values
    function updateMetrics(fairness, value, protection, consensus) {
        console.log(`Updating metrics - F:${fairness}, V:${value}, P:${protection}, C:${consensus}`);
        
        // Update consensus value
        if (consensusValue) {
            consensusValue.textContent = `${consensus}%`;
        }
        
        // Update metrics bars with animation
        const metricBars = document.querySelectorAll('.metric-value');
        if (metricBars.length >= 3) {
            // Reset bars first for better animation
            metricBars.forEach(bar => {
                bar.style.width = '0%';
            });
            
            // Animate after a short delay
            setTimeout(() => {
                metricBars[0].style.width = `${fairness}%`;
                metricBars[1].style.width = `${value}%`;
                metricBars[2].style.width = `${protection}%`;
            }, 300);
        }
        
        // Update status bar value
        if (consensusStatusValue) {
            consensusStatusValue.textContent = `${consensus}%`;
        }
        
        // Update triangle indicator position
        updateConsensusTriangle(consensus / 100);
    }
    
    // Update consensus triangle visualization
    function updateConsensusTriangle(consensusValue) {
        // Get the indicator
        const indicator = document.querySelector('.consensus-indicator');
        if (!indicator) return;
        
        // Triangle coordinates
        const triangleElement = document.querySelector('.consensus-triangle');
        if (!triangleElement) return;
        
        const height = triangleElement.offsetHeight;
        const width = triangleElement.offsetWidth;
        
        // Calculate position (higher consensus = higher position in triangle)
        const yPos = height - (consensusValue * height * 0.8); // Leave some space at top/bottom
        const xPos = width / 2; // Center horizontally
        
        // Update position
        indicator.style.top = `${yPos}px`;
        indicator.style.left = `${xPos}px`;
    }
    
    // Make functions available globally
    window.animateActiveWaveform = animateActiveWaveform;
    window.updateMetrics = updateMetrics;
    window.updateConsensusTriangle = updateConsensusTriangle;
    window.addAikiraMessageToConversation = addAikiraMessageToConversation;
    window.addUserMessageToConversation = addUserMessageToConversation;
});