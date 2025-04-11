/**
 * Aikira Terminal - Main JavaScript (Production Version)
 * Handles UI interactions, animations, and API communication without fallbacks
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
    
    // Debug mode - set to false in production
    const debugMode = false;
    
    // Initialize app
    initializeApp();
    
    function initializeApp() {
        log('Initializing Aikira Terminal');
        
        // Wait for AudioController to be initialized
        waitForAudioController().then(() => {
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
            
            log('Aikira Terminal initialized');
        });
    }
    
    // Helper function to log messages to console and debug panel
    function log(message) {
        if (!debugMode) return;
        
        console.log(`[Aikira] ${message}`);
        
        // Log to debug panel if it exists
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            const entry = document.createElement('div');
            entry.textContent = `[Aikira] ${message}`;
            debugPanel.appendChild(entry);
            debugPanel.scrollTop = debugPanel.scrollHeight;
            
            // Limit entries
            if (debugPanel.children.length > 20) {
                debugPanel.removeChild(debugPanel.firstChild);
            }
        }
    }
    
    // Wait for AudioController to be initialized
    function waitForAudioController() {
        return new Promise((resolve) => {
            // Check for audio controller
            if (window.audioController && window.audioController.initialized) {
                log('AudioController already initialized');
                resolve();
                return;
            }
            
            // Check every 100ms for audio controller
            const checkInterval = setInterval(() => {
                if (window.audioController && window.audioController.initialized) {
                    clearInterval(checkInterval);
                    log('AudioController detected');
                    resolve();
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                log('AudioController not detected, continuing anyway');
                resolve();
            }, 5000);
        });
    }
    
    // Set up event listeners
    function setupEventListeners() {
        log('Setting up event listeners');
        
        // Submit proposal button
        if (submitButton && proposalText) {
            submitButton.addEventListener('click', function() {
                if (proposalText.value.trim()) {
                    // Send proposal to API
                    processProposal(proposalText.value);
                    
                    // Play deliberation sound
                    playAudio('assets/audio/deliberation.wav');
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
                    playAudio('assets/audio/proposal-submit.wav');
                }
            });
        }
    }
    
    // Play audio with robust error handling
    function playAudio(src) {
        log(`Playing audio: ${src}`);
        
        // Use AudioController if available
        if (window.audioController) {
            window.audioController.playAudio(src);
            return;
        }
        
        // Use AudioProcessor if available
        if (window.audioProcessor && window.audioProcessor.playAudio) {
            window.audioProcessor.playAudio(src)
                .then(() => log(`Audio playing via AudioProcessor: ${src}`))
                .catch(err => log(`Error playing via AudioProcessor: ${err.message}`));
            return;
        }
        
        // Fallback to basic Audio API
        try {
            const audio = new Audio(src);
            
            // Set volume if available
            if (window.audioController) {
                audio.volume = window.audioController.volume;
            } else {
                audio.volume = 0.8; // Default
            }
            
            // Play with error handling
            audio.play()
                .then(() => log(`Audio playing via basic API: ${src}`))
                .catch(err => {
                    log(`Error playing audio via basic API: ${err.message}`);
                    
                    // Show initialization overlay if needed
                    if (err.name === 'NotAllowedError' && window.audioController) {
                        window.audioController.showInitOverlay();
                    }
                });
        } catch (err) {
            log(`Audio playback exception: ${err.message}`);
        }
    }
    
    // Initialize metrics animation
    function initializeMetrics() {
        log('Initializing metrics');
        
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
        log('Creating background particles');
        
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
        log('Initializing waveform visualization');
        
        const canvas = document.getElementById('voice-waveform');
        if (!canvas) {
            log('Waveform canvas not found');
            return;
        }
        
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
        
        // Handle window resize
        window.addEventListener('resize', () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        });
    }
    
    // Process proposal submission
    function processProposal(proposalText) {
        log(`Processing proposal: ${proposalText.substring(0, 50)}${proposalText.length > 50 ? '...' : ''}`);
        
        // Update status
        inputStatus.textContent = 'Processing proposal...';
        
        // Clear the input
        document.getElementById('proposal-text').value = '';
        
        // Play deliberation sound
        playAudio('assets/audio/deliberation.wav');
        
        // Call API to process proposal
        fetch('/api/openai/generate-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ proposal: proposalText })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                log('Proposal processing successful');
                
                // Type out the AI response
                typeText(responseText, data.response);
                
                // Update metrics with returned values
                updateMetrics(data.metrics.fairness, data.metrics.value, data.metrics.protection, data.consensus);
                
                // Reset status
                inputStatus.textContent = 'Ready for input';
                
                // Generate and play speech
                generateSpeech(data.response);
            } else {
                // Handle error
                throw new Error(data.error || 'Invalid response format');
            }
        })
        .catch(error => {
            log(`Proposal processing error: ${error.message}`);
            inputStatus.textContent = `Error: ${error.message}`;
            
            // Show error in response area
            responseText.textContent = `I encountered an error processing your proposal. Please try again later or contact support if the issue persists. Error: ${error.message}`;
            
            // Play error sound
            playAudio('assets/audio/governance-alert.wav');
        });
    }
    
    // Generate speech from text
    async function generateSpeech(text) {
        log('Generating speech for response');
        
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
                log(`Speech generated successfully: ${data.audio_url}`);
                
                // Play the generated speech audio
                playAudio(data.audio_url);
            } else {
                throw new Error(data.error || 'Speech generation failed');
            }
        } catch (error) {
            log(`Speech generation error: ${error.message}`);
            inputStatus.textContent = `Speech error: ${error.message}`;
        }
    }
    
    // Start voice recording
    function startVoiceRecording() {
        log('Starting voice recording');
        
        inputStatus.textContent = 'Listening...';
        
        // Animate the voice visualization
        animateVoiceVisualization(true);
        
        try {
            // Request microphone access
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    log('Microphone access granted');
                    
                    // Create media recorder
                    window.mediaRecorder = new MediaRecorder(stream);
                    window.audioChunks = [];
                    
                    // Add data handler
                    window.mediaRecorder.addEventListener('dataavailable', event => {
                        window.audioChunks.push(event.data);
                    });
                    
                    // Add stop handler
                    window.mediaRecorder.addEventListener('stop', () => {
                        log('Recording stopped');
                        
                        // Create blob from chunks
                        const audioBlob = new Blob(window.audioChunks, { type: 'audio/wav' });
                        
                        // Send to server for transcription
                        transcribeAudio(audioBlob);
                    });
                    
                    // Start recording
                    window.mediaRecorder.start();
                    log('Recording started');
                    
                    // Automatically stop after 10 seconds as safety
                    setTimeout(() => {
                        if (window.mediaRecorder && window.mediaRecorder.state === 'recording') {
                            stopVoiceRecording();
                        }
                    }, 10000);
                })
                .catch(error => {
                    log(`Microphone access denied: ${error.message}`);
                    inputStatus.textContent = 'Microphone access denied';
                    document.getElementById('voice-input-btn').classList.remove('active');
                    animateVoiceVisualization(false);
                    
                    // Play error sound
                    playAudio('assets/audio/governance-alert.wav');
                });
        } catch (error) {
            log(`Voice recording error: ${error.message}`);
            inputStatus.textContent = `Recording error: ${error.message}`;
            document.getElementById('voice-input-btn').classList.remove('active');
            animateVoiceVisualization(false);
        }
    }
    
    // Stop voice recording
    function stopVoiceRecording() {
        log('Stopping voice recording');
        
        // Update status
        inputStatus.textContent = 'Processing voice input...';
        
        // Stop visualization animation
        animateVoiceVisualization(false);
        
        // Stop the recorder if it's active
        if (window.mediaRecorder && window.mediaRecorder.state === 'recording') {
            window.mediaRecorder.stop();
            
            // Stop microphone access
            window.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        } else {
            log('No active recorder to stop');
            inputStatus.textContent = 'Ready for input';
        }
    }
    
    // Transcribe audio using server API
    function transcribeAudio(audioBlob) {
        log('Transcribing audio');
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        
        // Send to server
        fetch('/api/speech/transcribe', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.text) {
                log(`Transcription successful: ${data.text}`);
                
                // Process the transcribed text
                processProposal(data.text);
            } else {
                throw new Error(data.error || 'Transcription failed');
            }
        })
        .catch(error => {
            log(`Transcription error: ${error.message}`);
            inputStatus.textContent = `Transcription error: ${error.message}`;
            
            // Display error message in response area
            responseText.textContent = `I encountered an error processing your voice input. Please try again or type your proposal instead. Error: ${error.message}`;
            
            // Play error sound
            playAudio('assets/audio/governance-alert.wav');
        });
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
                if (!document.querySelector('.voice-input-btn.active')) return;
                
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
    
    // Check system status from API
    function checkSystemStatus() {
        log('Checking system status');
        
        fetch('/api/system/status')
            .then(response => response.json())
            .then(data => {
                log('System status received');
                
                // Update status indicators
                document.querySelector('#constitutional-alignment .status-value').textContent = data.constitutional_alignment;
                
                // Log API availability
                if (data.voice_services === 'Available') {
                    log('Voice services are available');
                } else {
                    log('Voice services are unavailable');
                    inputStatus.textContent = 'Warning: Voice services unavailable';
                }
            })
            .catch(error => {
                log(`System status error: ${error.message}`);
                inputStatus.textContent = 'Error contacting server';
                
                // Create a system notice
                createGovernanceNotice('System connectivity issue detected. Some features may be unavailable.', 'warning');
            });
    }
    
    // Text typing effect
    function typeText(element, text, speed = 30) {
        if (!element) return;
        
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
        log(`Updating metrics - F:${fairness}, V:${value}, P:${protection}, C:${consensus}`);
        
        // Update consensus value
        if (consensusValue) {
            consensusValue.textContent = `${consensus}%`;
        }
        
        // Update metrics bars with animation
        const metricBars = document.querySelectorAll('.metric-value');
        if (metricBars.length >= 3) {
            metricBars[0].style.width = `${fairness}%`;
            metricBars[1].style.width = `${value}%`;
            metricBars[2].style.width = `${protection}%`;
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
    
    // Create governance notification
    function createGovernanceNotice(message, type = 'info', duration = 30000) {
        log(`Creating governance notice: ${message} (${type})`);
        
        // Get current notices count
        let noticesCount = parseInt(document.querySelector('#governance-notices .status-value').textContent) || 0;
        noticesCount++;
        
        // Update the count
        document.querySelector('#governance-notices .status-value').textContent = noticesCount;
        
        // Play notification sound
        playAudio('assets/audio/governance-alert.wav');
        
        // Get or create notification container
        let notificationContainer = document.querySelector('.governance-notifications');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.classList.add('governance-notifications');
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.top = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '1000';
            notificationContainer.style.display = 'flex';
            notificationContainer.style.flexDirection = 'column';
            notificationContainer.style.gap = '10px';
            notificationContainer.style.maxWidth = '300px';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notificationElement = document.createElement('div');
        notificationElement.classList.add('governance-notification', type);
        notificationElement.style.backgroundColor = 'var(--light-bg)';
        notificationElement.style.borderRadius = '10px';
        notificationElement.style.padding = '15px';
        notificationElement.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        notificationElement.style.position = 'relative';
        
        // Set border color based on type
        if (type === 'critical') {
            notificationElement.style.borderLeft = '3px solid #FF6B6B';
        } else if (type === 'warning') {
            notificationElement.style.borderLeft = '3px solid #FFD166';
        } else {
            notificationElement.style.borderLeft = '3px solid var(--accent-turquoise)';
        }
        
        // Add animation
        notificationElement.style.animation = 'slideInFromRight 0.3s ease-out forwards';
        
        // Add content
        const notificationHeader = document.createElement('div');
        notificationHeader.style.display = 'flex';
        notificationHeader.style.justifyContent = 'space-between';
        notificationHeader.style.alignItems = 'center';
        notificationHeader.style.marginBottom = '5px';
        
        const notificationTitle = document.createElement('div');
        notificationTitle.style.fontWeight = 'bold';
        notificationTitle.style.color = 'var(--soft-white)';
        notificationTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        
        const notificationTimestamp = document.createElement('div');
        notificationTimestamp.style.fontSize = '12px';
        notificationTimestamp.style.opacity = '0.7';
        notificationTimestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        notificationHeader.appendChild(notificationTitle);
        notificationHeader.appendChild(notificationTimestamp);
        
        const notificationMessage = document.createElement('div');
        notificationMessage.style.fontSize = '14px';
        notificationMessage.style.color = 'var(--soft-white)';
        notificationMessage.style.opacity = '0.9';
        notificationMessage.textContent = message;
        
        const notificationClose = document.createElement('div');
        notificationClose.textContent = '×';
        notificationClose.style.position = 'absolute';
        notificationClose.style.top = '10px';
        notificationClose.style.right = '10px';
        notificationClose.style.cursor = 'pointer';
        notificationClose.style.opacity = '0.5';
        notificationClose.style.fontSize = '16px';
        
        notificationClose.addEventListener('mouseenter', () => {
            notificationClose.style.opacity = '1';
        });
        
        notificationClose.addEventListener('mouseleave', () => {
            notificationClose.style.opacity = '0.5';
        });
        
        notificationClose.addEventListener('click', () => {
            notificationElement.style.animation = 'slideOutToRight 0.3s ease-in forwards';
            setTimeout(() => {
                notificationElement.remove();
                
                // Update counter
                noticesCount--;
                document.querySelector('#governance-notices .status-value').textContent = noticesCount;
            }, 300);
        });
        
        notificationElement.appendChild(notificationHeader);
        notificationElement.appendChild(notificationMessage);
        notificationElement.appendChild(notificationClose);
        
        // Add to container
        notificationContainer.appendChild(notificationElement);
        
        // Add auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notificationElement.isConnected) {
                    notificationElement.style.animation = 'slideOutToRight 0.3s ease-in forwards';
                    setTimeout(() => {
                        notificationElement.remove();
                        
                        // Update counter
                        noticesCount--;
                        document.querySelector('#governance-notices .status-value').textContent = noticesCount;
                    }, 300);
                }
            }, duration);
        }
        
        // Return the notification element
        return notificationElement;
    }
});