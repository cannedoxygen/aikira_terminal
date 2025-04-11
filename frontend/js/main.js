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
    
    // Audio context
    let audioContext = null;
    // Current audio URL for speech
    let currentAudioUrl = null;
    
    // Initialize app
    initializeApp();
    
    function initializeApp() {
        console.log('Initializing Aikira Terminal');
        
        // Create audio initialization overlay
        createAudioInitOverlay();
        
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
    
    // Create audio initialization overlay
    function createAudioInitOverlay() {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'audio-init-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(18, 21, 26, 0.85)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.backdropFilter = 'blur(5px)';
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.padding = '30px';
        buttonContainer.style.backgroundColor = 'var(--medium-bg)';
        buttonContainer.style.borderRadius = '15px';
        buttonContainer.style.border = '1px solid var(--trans-light)';
        buttonContainer.style.boxShadow = '0 0 30px rgba(216, 181, 255, 0.3)';
        buttonContainer.style.animation = 'fadeIn 0.5s ease-out forwards';
        
        // Create header
        const header = document.createElement('h2');
        header.textContent = 'Welcome to Aikira Terminal';
        header.style.color = 'var(--soft-pink)';
        header.style.marginBottom = '20px';
        header.style.fontFamily = 'var(--display-font)';
        
        // Create message
        const message = document.createElement('p');
        message.textContent = 'Browser security requires user interaction before playing audio.';
        message.style.color = 'var(--soft-white)';
        message.style.marginBottom = '25px';
        
        // Create enable button
        const enableButton = document.createElement('button');
        enableButton.id = 'enable-audio-btn';
        enableButton.textContent = 'Enable Audio';
        enableButton.className = 'button primary';
        enableButton.style.padding = '12px 25px';
        enableButton.style.fontSize = '16px';
        enableButton.style.marginBottom = '15px';
        enableButton.style.background = 'linear-gradient(135deg, var(--accent-purple), var(--accent-turquoise))';
        enableButton.style.border = 'none';
        enableButton.style.borderRadius = '10px';
        enableButton.style.color = 'var(--soft-white)';
        enableButton.style.cursor = 'pointer';
        
        // Create secondary info
        const secondaryInfo = document.createElement('p');
        secondaryInfo.textContent = 'Click to initialize Aikira\'s voice capabilities';
        secondaryInfo.style.color = 'var(--lavender-purple)';
        secondaryInfo.style.fontSize = '14px';
        secondaryInfo.style.opacity = '0.8';
        
        // When clicked, initialize audio and remove overlay
        enableButton.addEventListener('click', function() {
            // Initialize audio context
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('Audio context resumed');
                });
            }
            
            // Play a silent sound to initialize audio
            const audio = new Audio();
            audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
            audio.play().then(() => {
                console.log('Audio initialized');
                
                // Play startup sound
                playAudio('assets/audio/startup.wav');
            }).catch(err => {
                console.log(`Audio init error: ${err.message}`);
            });
            
            // Remove overlay with animation
            overlay.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                overlay.remove();
            }, 500);
        });
        
        // Assemble the container
        buttonContainer.appendChild(header);
        buttonContainer.appendChild(message);
        buttonContainer.appendChild(enableButton);
        buttonContainer.appendChild(secondaryInfo);
        overlay.appendChild(buttonContainer);
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Add keyframe animations to document if needed
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize audio context
    function initializeAudio() {
        try {
            // Create audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            
            // Resume context on user interaction
            document.addEventListener('click', function() {
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('Audio context resumed on user interaction');
                    });
                }
            }, { once: true });
            
            console.log('Audio context created: ' + audioContext.state);
        } catch (error) {
            console.log('Error creating audio context: ' + error.message);
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Submit proposal button
        if (submitButton && proposalText) {
            submitButton.addEventListener('click', function() {
                if (proposalText.value.trim()) {
                    // Send proposal to API
                    processProposal(proposalText.value);
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
    }
    
    // Play audio with robust error handling
    function playAudio(src) {
        console.log(`Playing audio: ${src}`);
        
        try {
            // First check if file exists
            fetch(src, { method: 'HEAD' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Audio file not found: ${response.status}`);
                    }
                    
                    // Create audio element
                    const audio = new Audio(src);
                    
                    // Set volume (0.8 default)
                    audio.volume = 0.8;
                    
                    // Add event handlers
                    audio.onplay = () => console.log(`Audio playing: ${src}`);
                    audio.onerror = (e) => console.log(`Audio error: ${e.type}`);
                    
                    // Play with error handling
                    audio.play()
                        .then(() => console.log(`Audio playing: ${src}`))
                        .catch(err => {
                            console.log(`Error playing audio: ${err.message}`);
                            
                            // Check if this is due to autoplay restrictions
                            if (err.name === 'NotAllowedError') {
                                console.log('Autoplay restricted - need user interaction first');
                                
                                // Try to resume audio context
                                if (audioContext && audioContext.state === 'suspended') {
                                    audioContext.resume()
                                        .then(() => {
                                            console.log('Audio context resumed, trying playback again');
                                            return audio.play();
                                        })
                                        .catch(resumeErr => {
                                            console.log(`Error after resume: ${resumeErr.message}`);
                                        });
                                }
                            }
                        });
                })
                .catch(error => {
                    console.log(`Audio file check error: ${error.message}`);
                });
        } catch (err) {
            console.log(`Audio playback exception: ${err.message}`);
        }
    }
    
    // Create floating particles effect
    function createParticles() {
        console.log('Creating background particles');
        
        const container = document.querySelector('.digital-world-bg');
        if (!container) return;
        
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
    
    // Process proposal submission using OpenAI API
    async function processProposal(proposalText) {
        console.log(`Processing proposal: ${proposalText.substring(0, 50)}${proposalText.length > 50 ? '...' : ''}`);
        
        // Update status
        inputStatus.textContent = 'Processing proposal...';
        
        // Clear the input
        document.getElementById('proposal-text').value = '';
        
        try {
            // Call proposal evaluation API
            const response = await fetch('/api/proposal/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ proposal: proposalText })
            });
            
            // Log response status
            console.log(`Proposal API response status: ${response.status}`);
            
            if (!response.ok) {
                // Try to extract error details
                const errorText = await response.text();
                console.log(`Proposal API error: ${errorText}`);
                throw new Error(`Proposal API error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Proposal API response received');
            
            // Validate response
            if (!data.success) {
                throw new Error(data.error || 'API returned failure status');
            }
            
            // Check if we have a valid response
            if (data.result && data.result.response) {
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
                
                // ONLY focus on speech generation here
                try {
                    // Set status text
                    inputStatus.textContent = 'Generating speech...';
                    
                    // Use direct approach to speech generation
                    const speechResponse = await fetch('/api/speech/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            text: data.result.response,
                            voice_id: "default",
                            model_id: "eleven_multilingual_v2"
                        })
                    });
                    
                    console.log(`Speech API response status: ${speechResponse.status}`);
                    
                    if (!speechResponse.ok) {
                        const speechErrorText = await speechResponse.text().catch(e => 'Could not read error response');
                        console.log(`Speech API error response: ${speechErrorText}`);
                        throw new Error(`Speech API error: ${speechResponse.status}`);
                    }
                    
                    const speechData = await speechResponse.json();
                    console.log(`Speech response received: ${JSON.stringify(speechData)}`);
                    
                    if (speechData.success && speechData.audio_url) {
                        console.log(`Playing speech from URL: ${speechData.audio_url}`);
                        
                        // Verify file exists
                        const fileCheckResponse = await fetch(speechData.audio_url, { method: 'HEAD' });
                        if (!fileCheckResponse.ok) {
                            console.log(`Speech file not found: ${fileCheckResponse.status}`);
                            throw new Error(`Speech file not found: ${fileCheckResponse.status}`);
                        }
                        
                        // Play the speech
                        const audio = new Audio(speechData.audio_url);
                        
                        // Set volume
                        const volumeSlider = document.getElementById('volume-slider');
                        if (volumeSlider) {
                            audio.volume = volumeSlider.value / 100;
                        } else {
                            audio.volume = 0.8; // Default volume
                        }
                        
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
                            console.log(`Speech audio error: ${e.type}`);
                            console.error('Audio error details:', audio.error);
                            inputStatus.textContent = 'Speech playback error';
                        };
                        
                        // Try to play the speech
                        try {
                            await audio.play();
                            console.log('Speech playback started successfully');
                        } catch (playError) {
                            console.log(`Speech play error: ${playError.message}`);
                            
                            // If autoplay is blocked, try to resume audio context
                            if (playError.name === 'NotAllowedError') {
                                console.log('Autoplay blocked - need user interaction');
                                
                                if (audioContext && audioContext.state === 'suspended') {
                                    try {
                                        await audioContext.resume();
                                        console.log('Audio context resumed, trying again');
                                        await audio.play();
                                        console.log('Speech playback started after context resume');
                                    } catch (resumeError) {
                                        console.log(`Error after resume: ${resumeError.message}`);
                                        throw resumeError;
                                    }
                                } else {
                                    throw playError;
                                }
                            } else {
                                throw playError;
                            }
                        }
                    } else {
                        throw new Error('Invalid speech response: ' + JSON.stringify(speechData));
                    }
                } catch (speechError) {
                    console.log(`Speech error: ${speechError.message}`);
                    inputStatus.textContent = 'Speech generation failed';
                }
                
            } else {
                throw new Error('Response missing expected structure');
            }
            
        } catch (error) {
            console.log(`Proposal processing error: ${error.message}`);
            inputStatus.textContent = `Error: ${error.message}`;
            
            // Show error in response area
            responseText.textContent = `I encountered an error processing your proposal. Please try again later. Error details: ${error.message}`;
            
            // Only play error sound here
            playAudio('assets/audio/governance-alert.wav');
        }
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
                    
                    // Play error sound
                    playAudio('assets/audio/governance-alert.wav');
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
                processProposal(data.text);
            } else {
                throw new Error(data.error || 'Transcription failed - no text received');
            }
        } catch (error) {
            console.log(`Transcription error: ${error.message}`);
            inputStatus.textContent = `Error: ${error.message}`;
            
            // Show error message
            responseText.textContent = 
                `I encountered an error processing your voice input. Please try again or type your proposal instead. Error details: ${error.message}`;
                
            // Play error sound
            playAudio('assets/audio/governance-alert.wav');
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
});