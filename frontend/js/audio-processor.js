/**
 * Aikira Terminal - Audio Processor
 * Handles audio processing, voice recognition, speech synthesis, and audio effects
 * 
 * This is a complete implementation that combines all audio functionality
 */

class AudioProcessor {
    constructor() {
        // Audio context and nodes
        this.audioContext = null;
        this.analyser = null;
        this.gainNode = null;
        this.sourceNode = null;
        
        // Audio buffers and data
        this.frequencyData = null;
        this.timeData = null;
        this.audioChunks = [];
        
        // Media recorder 
        this.mediaRecorder = null;
        this.mediaStream = null;
        
        // State tracking
        this.isRecording = false;
        this.isPlaying = false;
        this.isInitialized = false;
        this.isMuted = false;
        
        // Default volume (0-1)
        this.volume = 0.8;
        
        // Default voice settings for Eleven Labs
        this.voiceSettings = {
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
        };
        
        // Status callback
        this.statusCallback = null;
        
        // Initialize on creation
        this.initAudio();
        
        // Store globally for access from other scripts
        window.audioProcessor = this;
    }
    
    /**
     * Initializes audio context and nodes
     */
    initAudio() {
        try {
            // Create audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Store globally
            window.audioContext = this.audioContext;
            
            // Create nodes
            this.analyser = this.audioContext.createAnalyser();
            this.gainNode = this.audioContext.createGain();
            
            // Configure analyser
            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            this.frequencyData = new Uint8Array(bufferLength);
            this.timeData = new Uint8Array(bufferLength);
            
            // Connect nodes
            this.analyser.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            
            // Set volume
            this.gainNode.gain.value = this.volume;
            
            // Resume context on user interaction
            document.addEventListener('click', () => {
                if (this.audioContext && this.audioContext.state === 'suspended') {
                    this.audioContext.resume().then(() => {
                        console.log('Audio context resumed successfully');
                        this.isInitialized = true;
                    });
                }
            });
            
            console.log('Audio processor initialized: ' + this.audioContext.state);
            this.isInitialized = this.audioContext.state === 'running';
            
            return true;
        } catch (error) {
            console.error('Error initializing audio processor:', error);
            return false;
        }
    }
    
    /**
     * Sets the status callback function
     * @param {Function} callback - Function to call with status updates
     */
    setStatusCallback(callback) {
        if (typeof callback === 'function') {
            this.statusCallback = callback;
        }
    }
    
    /**
     * Updates status via callback if available
     * @param {string} message - Status message
     */
    updateStatus(message) {
        console.log(`Audio processor status: ${message}`);
        if (this.statusCallback) {
            this.statusCallback(message);
        }
    }
    
    /**
     * Ensures audio context is initialized and resumed
     * @returns {Promise} Resolves when audio context is ready
     */
    async ensureAudioContext() {
        if (!this.audioContext) {
            this.initAudio();
        }
        
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Audio context resumed');
                this.isInitialized = true;
            } catch (error) {
                console.error('Failed to resume audio context:', error);
                throw new Error('Audio context initialization failed. Please try again or enable audio in your browser settings.');
            }
        }
        
        return this.audioContext;
    }
    
    /**
     * Sets volume level
     * @param {number} level - Volume level (0-1)
     */
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        
        if (this.gainNode) {
            this.gainNode.gain.linearRampToValueAtTime(
                this.volume, 
                this.audioContext.currentTime + 0.05
            );
        }
        
        console.log(`Volume set to: ${this.volume}`);
        
        // Update mute state
        this.isMuted = this.volume === 0;
        
        return this.volume;
    }
    
    /**
     * Toggles mute state
     * @returns {boolean} New mute state
     */
    toggleMute() {
        if (this.isMuted) {
            // Unmute - restore previous volume
            this.setVolume(this.lastVolume || 0.8);
            this.isMuted = false;
        } else {
            // Mute - store current volume
            this.lastVolume = this.volume;
            this.setVolume(0);
            this.isMuted = true;
        }
        
        console.log(`Mute toggled: ${this.isMuted}`);
        return this.isMuted;
    }
    
    /**
     * Starts recording from the microphone
     * @returns {Promise} Resolves when recording starts
     */
    async startRecording() {
        // First ensure audio context is initialized
        await this.ensureAudioContext();
        
        // Stop any existing recording
        if (this.isRecording) {
            await this.stopRecording();
        }
        
        this.updateStatus('Starting voice recording...');
        
        try {
            // Request microphone access with constraints
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.mediaStream = stream;
            
            // Determine recorder options based on browser support
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
            
            // Create recorder
            try {
                this.mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
                console.warn('MediaRecorder creation with options failed:', e);
                this.mediaRecorder = new MediaRecorder(stream);
            }
            
            // Reset audio chunks
            this.audioChunks = [];
            
            // Set up data handling
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    console.log(`Recorded chunk: ${event.data.size} bytes`);
                }
            };
            
            // Connect to audio nodes for visualization
            const micSource = this.audioContext.createMediaStreamSource(stream);
            micSource.connect(this.analyser);
            this.sourceNode = micSource;
            
            // Start recording with timeslice for frequent data
            this.mediaRecorder.start(1000);
            this.isRecording = true;
            
            this.updateStatus('Recording active');
            console.log('Recording started successfully');
            
            // Safety timeout - stop after 15 seconds max
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    console.log('Auto-stopping recording after timeout');
                    this.stopRecording();
                }
            }, 15000);
            
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateStatus(`Recording error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Stops the current recording
     * @returns {Promise<Blob>} Promise resolving to the recorded audio blob
     */
    async stopRecording() {
        // Clear safety timeout
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }
        
        if (!this.isRecording || !this.mediaRecorder) {
            console.log('No active recording to stop');
            return null;
        }
        
        this.updateStatus('Processing recording...');
        
        return new Promise((resolve, reject) => {
            // On recording stop
            this.mediaRecorder.onstop = () => {
                console.log('Recording stopped');
                
                // Stop visualization
                this.stopVisualization();
                
                // Stop all tracks
                if (this.mediaStream) {
                    this.mediaStream.getTracks().forEach(track => track.stop());
                }
                
                // Disconnect source
                if (this.sourceNode) {
                    this.sourceNode.disconnect();
                    this.sourceNode = null;
                }
                
                // Create audio blob
                const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                
                console.log(`Recording complete: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
                
                this.isRecording = false;
                this.mediaRecorder = null;
                this.mediaStream = null;
                
                if (audioBlob.size > 1000) {
                    resolve(audioBlob);
                } else {
                    reject(new Error('Recording too short or empty'));
                }
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                reject(event.error);
            };
            
            // Stop the recorder if it's active
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            } else {
                reject(new Error('MediaRecorder is not active'));
            }
        });
    }
    
    /**
     * Transcribes audio using the server's transcription API
     * @param {Blob} audioBlob - Audio blob to transcribe
     * @returns {Promise<string>} Promise resolving to transcribed text
     */
    async transcribeAudio(audioBlob) {
        if (!audioBlob || audioBlob.size < 1000) {
            throw new Error('Audio is too short or empty');
        }
        
        this.updateStatus('Transcribing audio...');
        console.log(`Transcribing audio: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        
        try {
            // Create FormData with the appropriate filename extension
            const formData = new FormData();
            
            // Determine filename based on MIME type
            let fileName;
            if (audioBlob.type.includes('webm')) {
                fileName = 'recording.webm';
            } else if (audioBlob.type.includes('mp4')) {
                fileName = 'recording.mp4';
            } else if (audioBlob.type.includes('mp3')) {
                fileName = 'recording.mp3';
            } else {
                fileName = 'recording.wav';
            }
            
            formData.append('audio', audioBlob, fileName);
            
            // Set up request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            // Send to server API
            console.log(`Sending ${fileName} to transcription API...`);
            const response = await fetch('/api/speech/transcribe', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                let errorText;
                try {
                    const errorData = await response.json();
                    errorText = errorData.error || errorData.message || `Server error: ${response.status}`;
                } catch (e) {
                    errorText = `Server error: ${response.status}`;
                }
                
                console.error('Transcription API error:', errorText);
                throw new Error(errorText);
            }
            
            const data = await response.json();
            
            if (data.success && data.text) {
                console.log(`Transcription result: "${data.text}"`);
                this.updateStatus('Transcription complete');
                return data.text;
            } else {
                throw new Error(data.error || 'Transcription failed - no text received');
            }
        } catch (error) {
            console.error('Transcription error:', error);
            this.updateStatus(`Transcription error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Generates speech from text using the server's TTS API
     * @param {string} text - Text to convert to speech
     * @param {Object} options - TTS options (voice_id, etc.)
     * @returns {Promise<string>} Promise resolving to audio URL
     */
    async generateSpeech(text, options = {}) {
        if (!text || !text.trim()) {
            throw new Error('Text is required for speech generation');
        }
        
        this.updateStatus('Generating speech...');
        
        try {
            // Set up default parameters
            const speechParams = {
                text: text,
                voice_id: options.voice_id || "default",
                model_id: options.model_id || "eleven_multilingual_v2",
                voice_settings: options.voice_settings || this.voiceSettings
            };
            
            console.log(`Generating speech for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            
            // Make API request
            const response = await fetch('/api/speech/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(speechParams)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Speech generation failed: ${errorData.error || response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.audio_url) {
                console.log(`Speech generated. URL: ${data.audio_url}`);
                this.updateStatus('Speech generated successfully');
                return data.audio_url;
            } else {
                throw new Error(data.error || 'Failed to generate speech');
            }
        } catch (error) {
            console.error('Speech generation error:', error);
            this.updateStatus(`Speech error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Plays audio from a URL
     * @param {string} audioUrl - URL of audio to play
     * @returns {Promise} Resolves when playback is complete
     */
    async playAudio(audioUrl) {
        // First ensure audio context is initialized
        await this.ensureAudioContext();
        
        this.updateStatus('Playing audio...');
        
        // Stop any current playback
        if (this.isPlaying) {
            this.stopPlayback();
        }
        
        return new Promise((resolve, reject) => {
            try {
                // Create audio element
                const audio = new Audio(audioUrl);
                
                // Set volume
                audio.volume = this.volume;
                
                // Set up event handlers
                audio.onplay = () => {
                    console.log('Audio playback started');
                    this.isPlaying = true;
                    this.startVisualization();
                };
                
                audio.onended = () => {
                    console.log('Audio playback completed');
                    this.isPlaying = false;
                    this.stopVisualization();
                    this.updateStatus('Playback complete');
                    resolve();
                };
                
                audio.onerror = (e) => {
                    console.error('Audio playback error:', e);
                    this.isPlaying = false;
                    this.stopVisualization();
                    this.updateStatus('Playback error');
                    reject(new Error(`Audio playback error: ${audio.error?.message || 'unknown error'}`));
                };
                
                // Store reference for potential stopping
                this.currentAudio = audio;
                
                // Play the audio with error handling
                audio.play()
                    .catch(error => {
                        console.error('Audio play error:', error);
                        
                        // If autoplay is blocked, try to resume audio context
                        if (error.name === 'NotAllowedError') {
                            this.updateStatus('Autoplay blocked. Click to enable audio.');
                            
                            // Set up one-time click handler to retry
                            const clickHandler = async () => {
                                try {
                                    await this.audioContext.resume();
                                    await audio.play();
                                    document.removeEventListener('click', clickHandler);
                                } catch (err) {
                                    console.error('Play after click failed:', err);
                                    reject(err);
                                }
                            };
                            
                            document.addEventListener('click', clickHandler, { once: true });
                        } else {
                            reject(error);
                        }
                    });
            } catch (error) {
                console.error('Error playing audio:', error);
                this.updateStatus(`Playback error: ${error.message}`);
                reject(error);
            }
        });
    }
    
    /**
     * Stops current audio playback
     */
    stopPlayback() {
        if (this.currentAudio && this.isPlaying) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            this.isPlaying = false;
            this.stopVisualization();
            console.log('Playback stopped');
        }
    }
    
    /**
     * Start visualization of audio data
     */
    startVisualization() {
        if (!this.analyser) return;
        
        // Set up visualization loop
        const updateVisualization = () => {
            if (!this.isRecording && !this.isPlaying) {
                console.log('Stopping visualization - no active audio');
                return;
            }
            
            // Get visualization data
            this.analyser.getByteFrequencyData(this.frequencyData);
            this.analyser.getByteTimeDomainData(this.timeData);
            
            // Call external waveform function if available
            if (typeof window.animateActiveWaveform === 'function') {
                window.animateActiveWaveform(true);
            }
            
            // Continue the loop
            requestAnimationFrame(updateVisualization);
        };
        
        // Start the visualization
        updateVisualization();
    }
    
    /**
     * Stop visualization
     */
    stopVisualization() {
        // The visualization loop will stop on its own
        // when isRecording and isPlaying are both false
        
        // Call external waveform function if available
        if (typeof window.animateActiveWaveform === 'function') {
            window.animateActiveWaveform(false);
        }
    }
    
    /**
     * Gets current visualization data
     * @returns {Object} Frequency and time domain data
     */
    getVisualizationData() {
        if (!this.analyser) return { frequencyData: [], timeData: [] };
        
        // Make sure data arrays are updated
        this.analyser.getByteFrequencyData(this.frequencyData);
        this.analyser.getByteTimeDomainData(this.timeData);
        
        return {
            frequencyData: Array.from(this.frequencyData),
            timeData: Array.from(this.timeData)
        };
    }
    
    /**
     * Complete voice input flow - record, transcribe, and process
     * @param {Function} processCallback - Function to call with transcribed text
     * @returns {Promise} Resolves when process is complete
     */
    async processVoiceInput(processCallback) {
        try {
            // Start recording
            this.updateStatus('Listening...');
            await this.startRecording();
            
            // Show recording for 5 seconds, then auto-stop
            setTimeout(async () => {
                try {
                    // Stop recording
                    const audioBlob = await this.stopRecording();
                    
                    if (!audioBlob) {
                        throw new Error('No audio recorded');
                    }
                    
                    // Transcribe the audio
                    const transcribedText = await this.transcribeAudio(audioBlob);
                    
                    if (!transcribedText || transcribedText.trim() === '') {
                        throw new Error('Transcription empty');
                    }
                    
                    console.log(`Transcribed: "${transcribedText}"`);
                    this.updateStatus('Processing input...');
                    
                    // Send text to processing callback
                    if (typeof processCallback === 'function') {
                        processCallback(transcribedText);
                    } else {
                        console.warn('No process callback provided');
                        this.updateStatus('Ready for input');
                    }
                } catch (error) {
                    console.error('Voice processing error:', error);
                    this.updateStatus(`Error: ${error.message}`);
                    
                    // Throw to outer catch
                    throw error;
                }
            }, 5000);
            
            return true;
        } catch (error) {
            console.error('Voice input error:', error);
            this.updateStatus(`Error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Process a written or spoken proposal and generate spoken response
     * @param {string} proposalText - Text to process
     * @returns {Promise} Resolves when process is complete
     */
    async processProposal(proposalText) {
        if (!proposalText || !proposalText.trim()) {
            throw new Error('Proposal text is required');
        }
        
        this.updateStatus('Processing proposal...');
        console.log(`Processing proposal: "${proposalText.substring(0, 50)}${proposalText.length > 50 ? '...' : ''}"`);
        
        try {
            // Make API request to process proposal
            const response = await fetch('/api/proposal/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ proposal: proposalText })
            });
            
            if (!response.ok) {
                throw new Error(`Proposal API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.result && data.result.response) {
                // Get AI response text
                const aiResponse = data.result.response;
                console.log(`AI response: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"`);
                
                // Update UI text if text typing function exists
                if (typeof window.typeText === 'function') {
                    const responseText = document.getElementById('response-text');
                    if (responseText) {
                        window.typeText(responseText, aiResponse);
                    }
                }
                
                // Update conversation if function exists
                if (typeof window.addAikiraMessageToConversation === 'function') {
                    window.addAikiraMessageToConversation(aiResponse);
                }
                
                // Update metrics if available
                if (data.result.scores && typeof window.updateMetrics === 'function') {
                    window.updateMetrics(
                        Math.round(data.result.scores.fairness * 100),
                        Math.round(data.result.scores.value * 100),
                        Math.round(data.result.scores.protection * 100),
                        Math.round(data.result.consensusIndex * 100)
                    );
                }
                
                // Generate and play speech
                const audioUrl = await this.generateSpeech(aiResponse);
                await this.playAudio(audioUrl);
                
                this.updateStatus('Ready for input');
                return aiResponse;
            } else {
                throw new Error(data.error || 'Invalid API response');
            }
        } catch (error) {
            console.error('Proposal processing error:', error);
            this.updateStatus(`Error: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Plays a sound effect from a file
     * @param {string} soundPath - Path to sound file
     * @param {number} volume - Volume level (0-1), defaults to main volume
     */
    playSoundEffect(soundPath, volume = null) {
        try {
            const audio = new Audio(soundPath);
            audio.volume = volume !== null ? volume : this.volume;
            
            audio.play().catch(error => {
                console.error(`Error playing sound effect: ${error.message}`);
            });
        } catch (error) {
            console.error(`Error loading sound effect: ${error.message}`);
        }
    }
    
    /**
     * Clean up and dispose resources
     */
    dispose() {
        // Stop any active processes
        this.stopPlayback();
        if (this.isRecording) {
            this.stopRecording().catch(() => {});
        }
        
        // Disconnect audio nodes
        if (this.sourceNode) {
            this.sourceNode.disconnect();
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
        }
        
        if (this.gainNode) {
            this.gainNode.disconnect();
        }
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        console.log('Audio processor disposed');
    }
}

// Create global instance on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Create audio processor instance
    const audioProcessor = new AudioProcessor();
    
    // Set status callback to update UI
    audioProcessor.setStatusCallback((message) => {
        const statusElement = document.getElementById('input-status');
        if (statusElement) {
            statusElement.textContent = message;
            
            // Add active class while processing
            if (message.includes('Processing') || 
                message.includes('Listening') || 
                message.includes('Recording') ||
                message.includes('Transcribing') ||
                message.includes('Generating') ||
                message.includes('Playing')) {
                statusElement.classList.add('active');
            } else {
                statusElement.classList.remove('active');
            }
        }
    });
    
    // Set up global functions
    window.initAudio = () => audioProcessor.ensureAudioContext();
    window.setVolume = (level) => audioProcessor.setVolume(level);
    window.playAudio = (url) => audioProcessor.playAudio(url);
    
    // Voice processing functions
    window.startVoiceRecording = () => audioProcessor.startRecording();
    window.stopVoiceRecording = () => audioProcessor.stopRecording();
    window.transcribeAudio = (blob) => audioProcessor.transcribeAudio(blob);
    window.generateSpeech = (text, options) => audioProcessor.generateSpeech(text, options);
    window.processProposal = (text) => audioProcessor.processProposal(text);
    
    // Set up voice button functionality
    const voiceButton = document.getElementById('voice-input-btn');
    if (voiceButton) {
        voiceButton.addEventListener('click', async function() {
            try {
                const isActive = voiceButton.classList.contains('active');
                
                if (isActive) {
                    // Already recording, stop it
                    voiceButton.classList.remove('active');
                    const audioBlob = await audioProcessor.stopRecording();
                    
                    if (audioBlob) {
                        try {
                            // Transcribe the audio
                            const transcribedText = await audioProcessor.transcribeAudio(audioBlob);
                            
                            // Process the transcribed text
                            if (transcribedText && transcribedText.trim() !== '') {
                                // Update terminal input if it exists
                                const terminalInput = document.getElementById('terminal-input');
                                if (terminalInput) {
                                    terminalInput.value = transcribedText;
                                }
                                
                                // Add user message to conversation
                                if (typeof window.addUserMessageToConversation === 'function') {
                                    window.addUserMessageToConversation(transcribedText);
                                }
                                
                                // Process the proposal
                                await audioProcessor.processProposal(transcribedText);
                            }
                        } catch (error) {
                            console.error('Voice processing error:', error);
                            audioProcessor.updateStatus(`Error: ${error.message}`);
                        }
                    }
                } else {
                    // Start recording
                    voiceButton.classList.add('active');
                    await audioProcessor.startRecording();
                    
                    // Auto-stop after 5 seconds
                    setTimeout(async () => {
                        if (voiceButton.classList.contains('active')) {
                            voiceButton.click(); // Trigger the stop logic
                        }
                    }, 5000);
                }
            } catch (error) {
                console.error('Voice button error:', error);
                voiceButton.classList.remove('active');
                audioProcessor.updateStatus(`Error: ${error.message}`);
            }
        });
    }
    
    // Handle proposal submission
    const submitButton = document.getElementById('submit-proposal') || document.getElementById('send-btn');
    const proposalText = document.getElementById('proposal-text') || document.getElementById('terminal-input');
    
    if (submitButton && proposalText) {
        submitButton.addEventListener('click', async function() {
            if (proposalText.value.trim()) {
                const text = proposalText.value.trim();
                proposalText.value = '';
                
                try {
                    // Add user message to conversation
                    if (typeof window.addUserMessageToConversation === 'function') {
                        window.addUserMessageToConversation(text);
                    }
                    
                    // Process the proposal
                    await audioProcessor.processProposal(text);
                } catch (error) {
                    console.error('Proposal submission error:', error);
                    audioProcessor.updateStatus(`Error: ${error.message}`);
                }
            }
        });
    }
    
    // Play startup sound
    if (document.getElementById('audio-init-overlay')) {
        // Only play when audio is explicitly enabled
        const enableAudioBtn = document.getElementById('enable-audio-btn');
        if (enableAudioBtn) {
            enableAudioBtn.addEventListener('click', function() {
                audioProcessor.playSoundEffect('assets/audio/startup.wav');
            });
        }
    } else {
        // Auto-play on sites without overlay
        setTimeout(() => {
            audioProcessor.playSoundEffect('assets/audio/startup.wav', 0.5);
        }, 1000);
    }
    
    // Set up volume slider
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function() {
            const volume = this.value / 100;
            audioProcessor.setVolume(volume);
            
            if (volumeValue) {
                volumeValue.textContent = `Volume: ${Math.round(volume * 100)}%`;
            }
        });
        
        // Set initial value
        volumeSlider.value = audioProcessor.volume * 100;
        if (volumeValue) {
            volumeValue.textContent = `Volume: ${Math.round(audioProcessor.volume * 100)}%`;
        }
    }
    
    console.log('Aikira Audio Processor initialized and ready');
});