/**
 * Aikira Terminal - Main JavaScript
 * Handles UI interactions, animations, and API communication
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const responseText = document.getElementById('response-text');
    const proposalText = document.getElementById('proposal-text');
    const submitButton = document.getElementById('submit-proposal');
    const voiceButton = document.getElementById('voice-input-btn');
    const inputStatus = document.getElementById('input-status');
    const metricsElements = document.querySelectorAll('.metric-value');
    const consensusValue = document.querySelector('.consensus-value');
    const consensusStatusValue = document.querySelector('#consensus-index .status-value');
    
    // Audio context and elements
    let audioContext;
    let audioPlayer;
    
    // Initialize app
    initializeApp();
    
    function initializeApp() {
        // Initialize Audio Context
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            
            // Create audio player element
            audioPlayer = new Audio();
            document.body.appendChild(audioPlayer);
            
            // Preload startup sound
            const startupSound = new Audio('assets/audio/startup.mp3');
            startupSound.volume = 0.5;
            startupSound.play().catch(e => console.log('Audio autoplay prevented: User interaction needed.'));
        } catch (e) {
            console.error('Web Audio API not supported:', e);
        }
        
        // Initialize metrics animation
        initializeMetrics();
        
        // Create floating particles
        createParticles();
        
        // Set up waveform visualization
        initializeWaveform();
        
        // Add event listeners
        setupEventListeners();
        
        // Check system status
        checkSystemStatus();
        
        // Display welcome message with typing effect
        const welcomeMessage = "Aikira Constitutional AI Core initialized. How may I assist you today?";
        typeText(responseText, welcomeMessage);
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Submit proposal button
        if (submitButton && proposalText) {
            submitButton.addEventListener('click', function() {
                if (proposalText.value.trim()) {
                    // Send proposal to API
                    processProposal(proposalText.value);
                    
                    // Play deliberation sound
                    playAudio('assets/audio/deliberation.mp3');
                }
            });
            
            // Submit on Enter key (with Shift+Enter for new line)
            proposalText.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitButton.click();
                }
            });
        }
        
        // Voice input button
        if (voiceButton) {
            voiceButton.addEventListener('click', function() {
                // Toggle active state
                voiceButton.classList.toggle('active');
                
                if (voiceButton.classList.contains('active')) {
                    // Start voice recording
                    startVoiceRecording();
                } else {
                    // Stop voice recording
                    stopVoiceRecording();
                    
                    // Play proposal submit sound
                    playAudio('assets/audio/proposal-submit.mp3');
                }
            });
        }
        
        // Initialize audio on first user interaction (needed for browsers)
        document.addEventListener('click', initAudio, { once: true });
    }
    
    // Initialize audio context (needs user interaction first)
    function initAudio() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
    
    // Play audio file
    function playAudio(src) {
        if (!audioPlayer) return;
        
        // Check if we're already playing something
        const isPlaying = !audioPlayer.paused;
        
        // Set up new audio
        audioPlayer.src = src;
        audioPlayer.volume = 0.8;
        
        // If we were playing something, we need to stop it first
        if (isPlaying) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        
        // Play the new audio
        audioPlayer.play().catch(e => {
            console.error('Audio playback error:', e);
        });
    }
    
    // Initialize metrics animation
    function initializeMetrics() {
        // Animate metrics after a short delay
        setTimeout(() => {
            metricsElements.forEach(metric => {
                // Get the current width from the style
                const width = metric.style.width;
                // Reset to 0 and then animate to the target width
                metric.style.width = '0%';
                setTimeout(() => {
                    metric.style.width = width;
                }, 300);
            });
        }, 800);
    }
    
    // Create floating particles effect
    function createParticles() {
        const container = document.querySelector('.digital-world-bg');
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
    
    // Initialize waveform visualization
    function initializeWaveform() {
        const canvas = document.getElementById('voice-waveform');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Draw a subtle idle waveform
        const drawIdleWave = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(28, 32, 41, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const centerY = canvas.height / 2;
            
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            
            // Draw a gentle sine wave
            for (let x = 0; x < canvas.width; x++) {
                const amplitude = 5 + Math.sin(Date.now() * 0.001) * 2;
                const y = centerY + Math.sin(x * 0.05 + Date.now() * 0.001) * amplitude;
                ctx.lineTo(x, y);
            }
            
            ctx.strokeStyle = 'rgba(169, 238, 230, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            requestAnimationFrame(drawIdleWave);
        };
        
        drawIdleWave();
    }
    
    // Process proposal submission
    function processProposal(proposalText) {
        // Update status
        inputStatus.textContent = 'Processing proposal...';
        
        // Clear the input
        document.getElementById('proposal-text').value = '';
        
        // Play deliberation sound again
        playAudio('assets/audio/deliberation.mp3');
        
        // Call API to process proposal
        fetch('/api/openai/generate-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ proposal: proposalText })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Type out the AI response
                typeText(responseText, data.response);
                
                // Update metrics with returned values
                updateMetrics(data.metrics.fairness, data.metrics.value, data.metrics.protection, data.consensus);
                
                // Reset status
                inputStatus.textContent = 'Ready for input';
                
                // Generate and play speech using test audio for now
                generateSpeech(data.response);
            } else {
                // Handle error
                responseText.textContent = "I apologize, but I'm unable to process your proposal at this time. Please try again later.";
                inputStatus.textContent = 'Error occurred';
                
                // Play error sound
                playAudio('assets/audio/governance-alert.mp3');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            responseText.textContent = "A communication error occurred. Please check your connection and try again.";
            inputStatus.textContent = 'Connection error';
            
            // Play error sound
            playAudio('assets/audio/governance-alert.mp3');
        });
    }
    
    // Generate speech from text
    async function generateSpeech(text) {
        // In the interim, play sample audio
        playAudio('assets/audio/deliberation.mp3');
        
        try {
            // Call the speech generation API
            const response = await fetch('/api/speech/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text: text,
                    voice_id: 'default',
                    model_id: 'eleven_multilingual_v2'
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.audio_url) {
                // Play the generated speech audio
                playAudio(data.audio_url);
            }
        } catch (error) {
            console.error('Speech generation error:', error);
            // Fall back to playing sample audio
        }
    }
    
    // Start voice recording
    function startVoiceRecording() {
        inputStatus.textContent = 'Listening...';
        
        // Animate the voice visualization
        animateVoiceVisualization(true);
        
        // In a real implementation, you would use the Web Audio API and MediaRecorder API here
        // For now, we'll simulate recording
        setTimeout(stopVoiceRecording, 5000); // Automatically stop after 5 seconds for demo
    }
    
    // Stop voice recording and transcribe
    function stopVoiceRecording() {
        // Stop the voice button animation
        voiceButton.classList.remove('active');
        
        // Update status
        inputStatus.textContent = 'Processing voice input...';
        
        // Stop visualization animation
        animateVoiceVisualization(false);
        
        // In a real implementation, you would send the recording to your backend
        // For now, we'll simulate a transcription and response
        
        // Simulate API call to transcribe audio
        setTimeout(() => {
            // Sample transcription result
            const transcribedText = "Implement a transparent governance system with equal voting rights and strong privacy protections.";
            
            // Process the transcribed text as a proposal
            processProposal(transcribedText);
        }, 1500);
    }
    
    // Animate voice visualization during recording
    function animateVoiceVisualization(isActive) {
        const canvas = document.getElementById('voice-waveform');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (isActive) {
            // Active visualization function
            const drawActiveWave = () => {
                // Only continue if we're still supposed to be animating
                if (!voiceButton.classList.contains('active')) return;
                
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
                
                requestAnimationFrame(drawActiveWave);
            };
            
            drawActiveWave();
        } else {
            // Reset to idle animation will happen automatically by the idle animation loop
        }
    }
    
    // Check system status from API
    function checkSystemStatus() {
        fetch('/api/system/status')
            .then(response => response.json())
            .then(data => {
                // Update status indicators
                document.querySelector('#constitutional-alignment .status-value').textContent = data.constitutional_alignment;
                
                // Other status updates could be added here
            })
            .catch(error => {
                console.error('Error checking system status:', error);
            });
    }
    
    // Text typing effect
    function typeText(element, text, speed = 30) {
        element.textContent = '';
        let i = 0;
        
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        
        type();
    }
    
    // Update metrics with received values
    function updateMetrics(fairness, value, protection, consensus) {
        // Update consensus value
        consensusValue.textContent = `${consensus}%`;
        
        // Update metrics bars with animation
        metricsElements[0].style.width = `${fairness}%`;
        metricsElements[1].style.width = `${value}%`;
        metricsElements[2].style.width = `${protection}%`;
        
        // Update status bar value
        consensusStatusValue.textContent = `${consensus}%`;
        
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
        const height = triangleElement.offsetHeight;
        const width = triangleElement.offsetWidth;
        
        // Calculate position (higher consensus = higher position in triangle)
        const yPos = height - (consensusValue * height * 0.8); // Leave some space at top/bottom
        const xPos = width / 2; // Center horizontally
        
        // Update position
        indicator.style.top = `${yPos}px`;
        indicator.style.left = `${xPos}px`;
    }
    
    // Add a function to create governance notifications (could be used for future features)
    function createGovernanceNotice(message, type = 'info') {
        // Get current notices count
        let noticesCount = parseInt(document.querySelector('#governance-notices .status-value').textContent) || 0;
        noticesCount++;
        
        // Update the count
        document.querySelector('#governance-notices .status-value').textContent = noticesCount;
        
        // Play notification sound
        playAudio('assets/audio/governance-alert.mp3');
        
        // In a full implementation, you would create and display notification elements here
        console.log(`[${type.toUpperCase()}] Governance Notice: ${message}`);
    }
});