/**
 * Aikira Terminal - Main JavaScript
 * Handles UI interactions, animations, API communication and speech processing
 * Using OpenAI integration for proposal evaluation with fixed voice transcription
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
    
    // Terminal Input - For new interface
    const terminalInput = document.getElementById('terminal-input');
    const sendButton = document.getElementById('send-btn');
    
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
        
        // Clear conversation feed to start empty
        clearConversationFeed();
        
        // Add initial system message
        addSystemMessage("System initialized: " + new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }));
        
        console.log('Aikira Terminal initialized');
        // Expose the terminal interface globally for processProposal to use
        if (typeof TerminalInterface === 'function') {
            window.terminalInterface = new TerminalInterface();
        }
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
    
    // Set up event listeners
    function setupEventListeners() {
        console.log('Setting up event listeners');
        
        
        // Terminal input & send button: replace old button to clear inline handlers
        if (terminalInput) {
            let localSend = document.getElementById('send-btn');
            if (localSend) {
                // Clone to strip away legacy event listeners
                const freshSend = localSend.cloneNode(true);
                localSend.parentNode.replaceChild(freshSend, localSend);
                localSend = freshSend;
                console.log('Binding fresh send-btn to processProposal');
                localSend.addEventListener('click', function(e) {
                    e.preventDefault();
                    const text = terminalInput.value.trim();
                    if (!text) return;
                    terminalInput.value = '';
                    if (typeof window.processProposal === 'function') {
                        window.processProposal(text);
                    }
                });
                // Allow Enter key to trigger click
                terminalInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        localSend.click();
                    }
                });
            }
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
                volumeSliderContainer.style.display = 
                    volumeSliderContainer.style.display === 'none' ? 'block' : 'none';
                
                // Auto-hide after 5 seconds if visible
                if (volumeSliderContainer.style.display !== 'none') {
                    setTimeout(() => {
                        volumeSliderContainer.style.display = 'none';
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
        
        // Clear terminal button
        const clearButton = document.getElementById('clear-terminal');
        if (clearButton) {
            clearButton.addEventListener('click', function() {
                const conversationFeed = document.getElementById('conversation-feed');
                if (conversationFeed) {
                    // Clear all messages
                    conversationFeed.innerHTML = '';
                    
                    // Add system message back
                    addSystemMessage("System initialized: " + new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }));
                    
                    // Add fresh welcome message
                    addAikiraMessageToConversation("Chat cleared. How may I assist you today?");
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
                
                // Add welcome message after audio is enabled
                setTimeout(() => {
                    addAikiraMessageToConversation("Aikira Constitutional AI Core initialized. How may I assist you today?");
                }, 1000);
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
        inputStatus.classList.add('active');
        
        // Add user message to conversation feed if it exists
        addUserMessageToConversation(proposalText);
        
        // Clear the input
        document.getElementById('proposal-text').value = '';
        if (terminalInput) {
            terminalInput.value = '';
        }
        
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
            console.log('Proposal API response received:', data);
            
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
            inputStatus.classList.remove('active');
            
            // Show error in response area
            responseText.textContent = `I encountered an error processing your proposal. Please try again. Error: ${error.message}`;
            
            // Add error to conversation feed if it exists
            addAikiraMessageToConversation(`I encountered an error processing your request. Please try again. Error: ${error.message}`);
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
                            inputStatus.classList.remove('active');
                            animateActiveWaveform(false);
                        };
                        
                        audio.onerror = (e) => {
                            console.error('Speech audio error:', e);
                            inputStatus.textContent = 'Speech playback error';
                            inputStatus.classList.remove('active');
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
                        inputStatus.classList.remove('active');
                    });
            } else {
                throw new Error('Invalid speech response');
            }
        })
        .catch(error => {
            console.error('Speech generation error:', error);
            inputStatus.textContent = `Speech error: ${error.message}`;
            inputStatus.classList.remove('active');
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
    
    // IMPROVED: Start voice recording
    function startVoiceRecording() {
        console.log('Starting voice recording with improved handling');
        
        // Check for microphone and MediaRecorder support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('Microphone access not supported in this browser');
            inputStatus.textContent = 'Microphone access not supported';
            setTimeout(() => {
                inputStatus.textContent = 'Ready for input';
                inputStatus.classList.remove('active');
            }, 2000);
            return;
        }
        if (typeof MediaRecorder === 'undefined') {
            console.error('MediaRecorder API not supported');
            inputStatus.textContent = 'Voice recording not supported';
            setTimeout(() => {
                inputStatus.textContent = 'Ready for input';
                inputStatus.classList.remove('active');
            }, 2000);
            return;
        }
        
        // Update status
        inputStatus.textContent = 'Listening...';
        inputStatus.classList.add('active');
        
        // Animate the voice visualization
        animateActiveWaveform(true);
        
        // Request microphone access
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                console.log('Microphone access granted');
                    
                    // Create media recorder with specific MIME type for better compatibility
                    let options = {};
                    
                    // Try different MIME types based on browser support
                    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                        options = { mimeType: 'audio/webm;codecs=opus' };
                        console.log('Using audio/webm;codecs=opus');
                    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                        options = { mimeType: 'audio/webm' };
                        console.log('Using audio/webm');
                    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                        options = { mimeType: 'audio/mp4' };
                        console.log('Using audio/mp4');
                    }
                    
                    // Create MediaRecorder with robust fallback
                    let recorder = null;
                    try {
                        recorder = new MediaRecorder(stream, options);
                        console.log('Created MediaRecorder with options', recorder);
                    } catch (e1) {
                        console.warn('MediaRecorder with options failed:', e1);
                        try {
                            recorder = new MediaRecorder(stream);
                            console.log('Created MediaRecorder without options', recorder);
                        } catch (e2) {
                            console.error('MediaRecorder not supported (error):', e2);
                            inputStatus.textContent = 'Voice recording not supported';
                            setTimeout(() => {
                                inputStatus.textContent = 'Ready for input';
                                inputStatus.classList.remove('active');
                            }, 2000);
                            return;
                        }
                    }
                    window.mediaRecorder = recorder;
                    
                    window.audioChunks = [];
                    
                    // Add data handler
                    window.mediaRecorder.ondataavailable = (event) => {
                        console.log('Data chunk received, size:', event.data.size);
                        if (event.data.size > 0) {
                            window.audioChunks.push(event.data);
                        }
                    };
                    
                    // Add stop handler
                    window.mediaRecorder.onstop = () => {
                        console.log('Recording stopped, processing audio...');
                        inputStatus.textContent = 'Processing voice...';
                        
                        // Make sure we have audio data
                        if (!window.audioChunks || window.audioChunks.length === 0) {
                            console.error('No audio chunks captured');
                            inputStatus.textContent = 'No audio captured. Please try again.';
                            setTimeout(() => {
                                inputStatus.textContent = 'Ready for input';
                                inputStatus.classList.remove('active');
                            }, 2000);
                            return;
                        }
                        
                        console.log('Audio chunks:', window.audioChunks.length);
                        console.log('First chunk type:', window.audioChunks[0].type);
                        
                        // Determine the MIME type
                        let mimeType = window.mediaRecorder.mimeType;
                        if (!mimeType || mimeType === '') {
                            // Default to webm if we couldn't determine type
                            mimeType = 'audio/webm';
                        }
                        
                        // Create blob from chunks
                        const audioBlob = new Blob(window.audioChunks, { type: mimeType });
                        console.log('Audio blob created, size:', audioBlob.size, 'type:', audioBlob.type);
                        
                        // Make sure blob has data
                        if (audioBlob.size <= 0) {
                            console.error('Empty audio blob created');
                            inputStatus.textContent = 'Empty audio recording. Please try again.';
                            setTimeout(() => {
                                inputStatus.textContent = 'Ready for input';
                                inputStatus.classList.remove('active');
                            }, 2000);
                            return;
                        }
                        
                        // Send to server for transcription
                        transcribeAudio(audioBlob);
                        
                        // Stop tracks
                        stream.getTracks().forEach(track => track.stop());
                    };
                    
                    // Add error handler
                    window.mediaRecorder.onerror = (event) => {
                        console.error('MediaRecorder error:', event.error);
                        inputStatus.textContent = `Recording error: ${event.error.message || 'Unknown error'}`;
                        setTimeout(() => {
                            inputStatus.textContent = 'Ready for input';
                            inputStatus.classList.remove('active');
                        }, 2000);
                    };
                    
                    // Start recording with timeslice to get data more frequently
                    window.mediaRecorder.start(1000); // Get data every second
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
                    console.error(`Microphone access denied: ${error.message}`);
                    inputStatus.textContent = 'Microphone access denied';
                    inputStatus.classList.remove('active');
                    document.getElementById('voice-input-btn').classList.remove('active');
                    animateActiveWaveform(false);
                });
    }
    
    // IMPROVED: Stop voice recording and process the audio
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
            inputStatus.classList.remove('active');
            
            // Make sure button is not active
            const voiceBtn = document.getElementById('voice-input-btn');
            if (voiceBtn && voiceBtn.classList.contains('active')) {
                voiceBtn.classList.remove('active');
            }
        }
    }
    
    // IMPROVED: Transcribe audio using server API
    async function transcribeAudio(audioBlob) {
        console.log('Transcribing audio, blob size:', audioBlob.size);
        console.log('Audio blob type:', audioBlob.type);
        
        try {
            // First check if the blob has enough data to be meaningful
            if (audioBlob.size < 1000) {
                console.error('Audio blob too small, likely no speech captured');
                throw new Error('Audio recording too short or no speech detected');
            }
            
            // Create a better blob with explicit MIME type
            let blobToSend = audioBlob;
            
            // If the original blob doesn't have a proper MIME type, create a new one
            if (!audioBlob.type || audioBlob.type === 'audio/wav') {
                try {
                    blobToSend = new Blob([audioBlob], { 
                        type: 'audio/webm;codecs=opus' 
                    });
                    console.log('Created new blob with explicit MIME type, size:', blobToSend.size);
                } catch (e) {
                    console.log('Failed to create new blob, using original:', e);
                    blobToSend = audioBlob;
                }
            }
            
            // Create form data for upload
            const formData = new FormData();
            formData.append('audio', blobToSend, 'recording.webm');
            
            // Debug log
            console.log('FormData created with blob size:', blobToSend.size, 'type:', blobToSend.type);
            
            // Create a longer timeout for large audio files
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
            
            // Send to server
            console.log('Sending audio to transcription API...');
            const response = await fetch('/api/speech/transcribe', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('Transcription API response status:', response.status);
            
            if (!response.ok) {
                let errorText;
                try {
                    const errorData = await response.json();
                    errorText = errorData.error || errorData.message || `Server error: ${response.status}`;
                } catch (e) {
                    errorText = await response.text();
                }
                
                console.error('Transcription API error response:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Transcription API response data:', JSON.stringify(data));
            
            if (data.success && data.text) {
                // Check for empty or "you" only transcriptions
                if (!data.text.trim() || data.text.trim().toLowerCase() === "you") {
                    console.error('Invalid transcription received: "' + data.text + '"');
                    throw new Error('Could not transcribe speech clearly. Please try speaking louder or reducing background noise.');
                }
                
                console.log(`Transcription successful: ${data.text}`);
                
                // Add transcribed text to input if it exists
                if (terminalInput) {
                    terminalInput.value = data.text;
                }
                
                // Add user message to conversation feed
                addUserMessageToConversation(data.text);
                
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
            inputStatus.classList.remove('active');
            
            // Ensure voice button is reset
            const voiceBtn = document.getElementById('voice-input-btn');
            if (voiceBtn) {
                voiceBtn.classList.remove('active');
            }
            
            // Stop the waveform animation
            animateActiveWaveform(false);
            
            // Show error message
            if (responseText) {
                responseText.textContent = 
                    `I encountered an error processing your voice input. Please try again or type your message. Error details: ${error.message}`;
            }
            
            // Add error to conversation feed
            addAikiraMessageToConversation(`I encountered an error processing your voice input. Please try again or type your message. Error: ${error.message}`);
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
        
        // Also add message to conversation interface if it exists
        addAikiraMessageToConversation(text);
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
        
        // Add full message to feed and scroll into view
        conversationFeed.appendChild(message);
        bubble.textContent = text;
        message.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
        
        // Scroll new message into view
        setTimeout(() => {
            message.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 0);
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
    window.typeText = typeText;
    window.startVoiceRecording = startVoiceRecording;
    window.stopVoiceRecording = stopVoiceRecording;
    window.transcribeAudio = transcribeAudio;
    window.addAikiraMessageToConversation = addAikiraMessageToConversation;
    window.addUserMessageToConversation = addUserMessageToConversation;
});