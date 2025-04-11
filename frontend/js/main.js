/**
 * Aikira Terminal - Main JavaScript
 * Handles UI interactions, animations, API communication and speech processing
 * Using OpenAI integration for proposal evaluation
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
    
    // Debug mode - set to true for more logging
    const debugMode = true;
    
    // Audio context
    let audioContext = null;
    // Current audio URL for speech
    let currentAudioUrl = null;
    
    // Initialize app
    initializeApp();
    
    function initializeApp() {
        console.log('Initializing Aikira Terminal');
        
        // Create floating particles
        createParticles();
        
        // Set up waveform visualization
        initializeWaveform();
        
        // Add event listeners
        setupEventListeners();
        
        // Initialize audio context 
        initializeAudio();
        
        // Display welcome message with typing effect
        const welcomeMessage = "Aikira Constitutional AI Core initialized. How may I assist you today?";
        typeText(responseText, welcomeMessage);
        
        console.log('Aikira Terminal initialized');
    }
    
    // Set up event listeners
    function setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Submit proposal button
        if (submitButton && proposalText) {
            submitButton.addEventListener('click', function() {
                if (proposalText.value.trim()) {
                    // Send proposal to API (using function from audio-controls.js)
                    if (typeof window.processProposal === 'function') {
                        window.processProposal(proposalText.value);
                    } else {
                        processProposalFallback(proposalText.value);
                    }
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
                }
            });
        }
        
        // Volume button
        const volumeBtn = document.getElementById('volume-btn');
        const volumeSliderContainer = document.getElementById('volume-slider-container');
        
        if (volumeBtn && volumeSliderContainer) {
            volumeBtn.addEventListener('click', function() {
                // Toggle volume slider visibility
                volumeSliderContainer.classList.toggle('visible');
                
                // Auto-hide after 5 seconds if visible
                if (volumeSliderContainer.classList.contains('visible')) {
                    setTimeout(() => {
                        volumeSliderContainer.classList.remove('visible');
                    }, 5000);
                }
            });
        }
        
        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        
        if (volumeSlider && volumeValue) {
            volumeSlider.addEventListener('input', function() {
                const volume = this.value / 100;
                volumeValue.textContent = `Volume: ${this.value}%`;
                
                // Update volume using the setVolume function from audio-controls.js
                if (typeof window.setVolume === 'function') {
                    window.setVolume(volume);
                }
            });
        }
        
        // Enable audio button (if it exists for initialization)
        const enableAudioBtn = document.getElementById('enable-audio-btn');
        const audioOverlay = document.getElementById('audio-init-overlay');
        
        if (enableAudioBtn && audioOverlay) {
            enableAudioBtn.addEventListener('click', function() {
                // Initialize audio
                if (typeof window.initAudio === 'function') {
                    window.initAudio();
                } else {
                    initializeAudio();
                }
                
                // Play startup sound
                if (typeof window.playAudio === 'function') {
                    window.playAudio('assets/audio/startup.wav');
                }
                
                // Hide overlay
                audioOverlay.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    audioOverlay.style.display = 'none';
                }, 500);
            });
        }
    }
    
    // Initialize audio context
    function initializeAudio() {
        try {
            // Create audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            
            // Store globally
            window.audioContext = audioContext;
            
            // Resume context on user interaction
            document.addEventListener('click', function resumeAudio() {
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('Audio context resumed on user interaction');
                        // Remove this listener after resuming
                        document.removeEventListener('click', resumeAudio);
                    });
                }
            }, { once: true });
            
            console.log('Audio context created: ' + audioContext.state);
        } catch (error) {
            console.error('Error creating audio context: ' + error.message);
        }
    }
    
    // Fallback method for processing proposals
    function processProposalFallback(proposalText) {
        console.log(`Processing proposal: ${proposalText.substring(0, 50)}${proposalText.length > 50 ? '...' : ''}`);
        
        // Update status
        inputStatus.textContent = 'Processing proposal...';
        
        // Clear the input
        document.getElementById('proposal-text').value = '';
        
        fetch('/api/proposal/evaluate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ proposal: proposalText })
        })
        .then(response => {
            console.log(`Proposal API response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`Proposal API error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Proposal API response received');
            
            if (data.success && data.result && data.result.response) {
                // Type out the AI response
                typeText(responseText, data.result.response);
                
                // Update metrics with returned values
                if (data.result.scores) {
                    updateMetrics(
                        Math.round(data.result.scores.fairness * 100),
                        Math.round(data.result.scores.value * 100),
                        Math.round(data.result.scores.protection * 100),
                        Math.round(data.result.consensusIndex * 100)
                    );
                }
                
                // Generate speech
                generateSpeechFallback(data.result.response);
            } else {
                throw new Error('Invalid API response');
            }
        })
        .catch(error => {
            console.error('Proposal processing error:', error);
            inputStatus.textContent = `Error: ${error.message}`;
            
            // Show error in response area
            responseText.textContent = `I encountered an error processing your proposal. Please try again. Error: ${error.message}`;
        });
    }
    
    // Fallback method for generating speech
    function generateSpeechFallback(text) {
        console.log('Generating speech for text');
        inputStatus.textContent = 'Generating speech...';
        
        fetch('/api/speech/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: text,
                voice_id: "default",
                model_id: "eleven_multilingual_v2"
            })
        })
        .then(response => {
            console.log(`Speech API response status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`Speech API error: ${response.status}`);
            }
            
            return response.json();
        })
        .then(data => {
            console.log('Speech response received:', data);
            
            if (data.success && data.audio_url) {
                console.log(`Playing speech from URL: ${data.audio_url}`);
                
                // Verify file exists
                fetch(data.audio_url, { method: 'HEAD' })
                    .then(fileCheck => {
                        if (!fileCheck.ok) {
                            throw new Error(`Speech file not found: ${fileCheck.status}`);
                        }
                        
                        // Play the audio
                        const audio = new Audio(data.audio_url);
                        
                        // Add event handlers
                        audio.onplay = () => {
                            console.log('Speech audio playing');
                            inputStatus.textContent = 'Speaking...';
                            animateActiveWaveform(true);
                        };
                        
                        audio.onended = () => {
                            console.log('Speech audio completed');
                            inputStatus.textContent = 'Ready for input';
                            animateActiveWaveform(false);
                        };
                        
                        audio.onerror = (e) => {
                            console.error('Speech audio error:', e);
                            inputStatus.textContent = 'Speech playback error';
                            animateActiveWaveform(false);
                        };
                        
                        // Play with error handling
                        audio.play()
                            .then(() => console.log('Speech playback started'))
                            .catch(playError => {
                                console.error('Speech play error:', playError);
                                
                                // If autoplay is blocked, try to resume audio context
                                if (playError.name === 'NotAllowedError' && audioContext) {
                                    audioContext.resume()
                                        .then(() => {
                                            console.log('Audio context resumed, trying again');
                                            return audio.play();
                                        })
                                        .catch(e => console.error('Still failed after resume:', e));
                                }
                            });
                    })
                    .catch(err => {
                        console.error('Speech file check error:', err);
                        inputStatus.textContent = 'Error: Speech file not found';
                    });
            } else {
                throw new Error('Invalid speech response');
            }
        })
        .catch(error => {
            console.error('Speech generation error:', error);
            inputStatus.textContent = `Speech error: ${error.message}`;
        });
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
    
    // Initialize waveform visualization
    function initializeWaveform() {
        console.log('Initializing waveform visualization');
        
        const canvas = document.getElementById('voice-waveform');
        if (!canvas) {
            console.log('Waveform canvas not found');
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
    
    // Start voice recording
    function startVoiceRecording() {
        console.log('Starting voice recording');
        
        inputStatus.textContent = 'Listening...';
        
        // Animate the voice visualization
        animateActiveWaveform(true);
        
        try {
            // Request microphone access
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    console.log('Microphone access granted');
                    
                    // Create media recorder
                    window.mediaRecorder = new MediaRecorder(stream);
                    window.audioChunks = [];
                    
                    // Add data handler
                    window.mediaRecorder.addEventListener('dataavailable', event => {
                        window.audioChunks.push(event.data);
                    });
                    
                    // Add stop handler
                    window.mediaRecorder.addEventListener('stop', () => {
                        console.log('Recording stopped, processing audio...');
                        
                        // Create blob from chunks
                        const audioBlob = new Blob(window.audioChunks, { type: 'audio/wav' });
                        console.log('Audio blob created, size:', audioBlob.size);
                        
                        // Send to server for transcription
                        transcribeAudio(audioBlob);
                        
                        // Stop tracks
                        stream.getTracks().forEach(track => track.stop());
                    });
                    
                    // Start recording
                    window.mediaRecorder.start();
                    console.log('Recording started');
                    
                    // Automatically stop after 10 seconds as safety
                    setTimeout(() => {
                        if (window.mediaRecorder && window.mediaRecorder.state === 'recording') {
                            console.log('Auto-stopping recording after timeout');
                            stopVoiceRecording();
                        }
                    }, 10000);
                })
                .catch(error => {
                    console.log(`Microphone access denied: ${error.message}`);
                    inputStatus.textContent = 'Microphone access denied';
                    document.getElementById('voice-input-btn').classList.remove('active');
                    animateActiveWaveform(false);
                });
        } catch (error) {
            console.log(`Voice recording error: ${error.message}`);
            inputStatus.textContent = `Recording error: ${error.message}`;
            document.getElementById('voice-input-btn').classList.remove('active');
            animateActiveWaveform(false);
        }
    }
    
    // Stop voice recording and process the audio
    function stopVoiceRecording() {
        console.log('Stopping voice recording');
        
        // Update status
        inputStatus.textContent = 'Processing voice input...';
        
        // Stop visualization animation
        animateActiveWaveform(false);
        
        // Stop the recorder if it's active
        if (window.mediaRecorder && window.mediaRecorder.state === 'recording') {
            console.log('Stopping active media recorder');
            window.mediaRecorder.stop();
        } else {
            console.log('No active recorder to stop');
            inputStatus.textContent = 'Ready for input';
        }
    }
    
    // Transcribe audio using server API
    async function transcribeAudio(audioBlob) {
        console.log('Transcribing audio, blob size:', audioBlob.size);
        
        try {
            // Create form data for upload
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
            // Send to server
            console.log('Sending audio to transcription API...');
            const response = await fetch('/api/speech/transcribe', {
                method: 'POST',
                body: formData
            });
            
            console.log('Transcription API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('Transcription API error response:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Transcription API response data:', JSON.stringify(data));
            
            if (data.success && data.text) {
                console.log(`Transcription successful: ${data.text}`);
                
                // Process the transcribed text as a proposal
                if (typeof window.processProposal === 'function') {
                    window.processProposal(data.text);
                } else {
                    processProposalFallback(data.text);
                }
            } else {
                throw new Error(data.error || 'Transcription failed - no text received');
            }
        } catch (error) {
            console.error(`Transcription error: ${error.message}`);
            inputStatus.textContent = `Error: ${error.message}`;
            
            // Show error message
            responseText.textContent = 
                `I encountered an error processing your voice input. Please try again or type your proposal instead. Error details: ${error.message}`;
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
                if (!isActive && !document.querySelector('.voice-input-btn.active') && inputStatus.textContent !== 'Speaking...') {
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
    
    // Debug test button for direct speech testing
    if (debugMode) {
        // Create test button
        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test Speech';
        testBtn.style.position = 'fixed';
        testBtn.style.bottom = '10px';
        testBtn.style.left = '10px';
        testBtn.style.zIndex = '1000';
        testBtn.style.padding = '5px 10px';
        testBtn.style.fontSize = '12px';
        testBtn.style.opacity = '0.7';
        
        testBtn.addEventListener('click', () => {
            fetch('/api/debug/eleven-labs')
                .then(res => res.json())
                .then(data => {
                    console.log('Debug test response:', data);
                    
                    if (data.success && data.test_audio_url) {
                        const audio = new Audio(data.test_audio_url);
                        audio.play()
                            .then(() => console.log('Debug audio playing'))
                            .catch(err => console.error('Debug audio error:', err));
                    }
                })
                .catch(err => console.error('Debug test error:', err));
        });
        
        document.body.appendChild(testBtn);
    }
    
    // Make functions available globally
    window.animateActiveWaveform = animateActiveWaveform;
    window.updateMetrics = updateMetrics;
    window.updateConsensusTriangle = updateConsensusTriangle;
    window.typeText = typeText;
});