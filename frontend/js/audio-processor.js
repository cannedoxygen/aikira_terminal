/**
 * Aikira Terminal - Audio Processor
 * Unified audio handling functionality for voice interactions
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
     */
    setStatusCallback(callback) {
        if (typeof callback === 'function') {
            this.statusCallback = callback;
        }
    }
    
    /**
     * Updates status via callback if available
     */
    updateStatus(message) {
        console.log(`Audio processor status: ${message}`);
        if (this.statusCallback) {
            this.statusCallback(message);
        }
    }
    
    /**
     * Ensures audio context is initialized and resumed
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
     * Starts recording from the microphone
     */
    async startRecording() {
        await this.ensureAudioContext();
        
        if (this.isRecording) {
            await this.stopRecording();
        }
        
        this.updateStatus('Listening to your voice...');
        
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.mediaStream = stream;
            
            // Set up MediaRecorder with appropriate options
            let options = {};
            
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
            
            try {
                console.log('Creating MediaRecorder with options:', options);
                this.mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
                console.warn('MediaRecorder creation with options failed:', e);
                console.log('Creating MediaRecorder without specific options');
                this.mediaRecorder = new MediaRecorder(stream);
            }
            
            console.log('MediaRecorder created:', this.mediaRecorder.state);
            
            // Reset audio chunks
            this.audioChunks = [];
            
            // Set up data handler
            this.mediaRecorder.ondataavailable = (event) => {
                console.log('Got data chunk, size:', event.data.size);
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // Set up error handler
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                this.updateStatus(`Recording error: ${event.error.message}`);
            };
            
            // Connect to analyser node for visualization
            const micSource = this.audioContext.createMediaStreamSource(stream);
            micSource.connect(this.analyser);
            this.sourceNode = micSource;
            
            // Start recording - request data every second
            console.log('Starting MediaRecorder...');
            this.mediaRecorder.start(1000);
            console.log('MediaRecorder started:', this.mediaRecorder.state);
            
            this.isRecording = true;
            this.updateStatus('Listening to your voice...');
            
            // Start timer for animation
            if (typeof window.animateActiveWaveform === 'function') {
                window.animateActiveWaveform(true);
            }
            
            // Set a safety timeout to automatically stop recording after 15 seconds
            // This is a backup in case the regular stop mechanism fails
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    console.log('Safety timeout: auto-stopping recording after 15s');
                    this.stopRecording();
                }
            }, 15000);
            
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            this.updateStatus(`Recording error: ${error.message}`);
            
            // Ensure the button is reset
            const voiceBtn = document.getElementById('voice-input-btn');
            if (voiceBtn) {
                voiceBtn.classList.remove('active');
            }
            
            throw error;
        }
    }
    
    /**
     * Stops the current recording
     */
    async stopRecording() {
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
            this.mediaRecorder.onstop = () => {
                console.log('Recording stopped');
                
                if (this.mediaStream) {
                    this.mediaStream.getTracks().forEach(track => track.stop());
                }
                
                if (this.sourceNode) {
                    this.sourceNode.disconnect();
                    this.sourceNode = null;
                }
                
                const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                
                console.log(`Recording complete: ${audioBlob.size} bytes`);
                
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
            
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            } else {
                reject(new Error('MediaRecorder is not active'));
            }
        });
    }
    
    /**
     * Transcribes audio using the server's transcription API
     */
    async transcribeAudio(audioBlob) {
        if (!audioBlob || audioBlob.size < 1000) {
            throw new Error('Audio is too short or empty');
        }
        
        this.updateStatus('Transcribing audio...');
        
        try {
            const formData = new FormData();
            let fileName = 'recording.webm';
            
            if (audioBlob.type.includes('mp4')) {
                fileName = 'recording.mp4';
            } else if (audioBlob.type.includes('mp3')) {
                fileName = 'recording.mp3';
            }
            
            formData.append('audio', audioBlob, fileName);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
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
                    errorText = errorData.error || `Server error: ${response.status}`;
                } catch (e) {
                    errorText = `Server error: ${response.status}`;
                }
                throw new Error(errorText);
            }
            
            const data = await response.json();
            
            if (data.success && data.text) {
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
     */
    async generateSpeech(text, options = {}) {
        if (!text || !text.trim()) {
            throw new Error('Text is required for speech generation');
        }
        
        this.updateStatus('Generating speech...');
        
        try {
            const speechParams = {
                text: text,
                voice_id: options.voice_id || "default",
                model_id: options.model_id || "eleven_multilingual_v2",
                voice_settings: options.voice_settings || this.voiceSettings
            };
            
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
     */
    async playAudio(audioUrl) {
        await this.ensureAudioContext();
        
        this.updateStatus('Playing audio...');
        
        if (this.isPlaying) {
            this.stopPlayback();
        }
        
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio(audioUrl);
                audio.volume = this.volume;
                
                audio.onplay = () => {
                    console.log('Audio playback started');
                    this.isPlaying = true;
                    if (typeof window.animateActiveWaveform === 'function') {
                        window.animateActiveWaveform(true);
                    }
                };
                
                audio.onended = () => {
                    console.log('Audio playback completed');
                    this.isPlaying = false;
                    if (typeof window.animateActiveWaveform === 'function') {
                        window.animateActiveWaveform(false);
                    }
                    this.updateStatus('Playback complete');
                    resolve();
                };
                
                audio.onerror = (e) => {
                    console.error('Audio playback error:', e);
                    this.isPlaying = false;
                    if (typeof window.animateActiveWaveform === 'function') {
                        window.animateActiveWaveform(false);
                    }
                    this.updateStatus('Playback error');
                    reject(new Error(`Audio playback error: ${audio.error?.message || 'unknown error'}`));
                };
                
                this.currentAudio = audio;
                
                audio.play()
                    .catch(error => {
                        console.error('Audio play error:', error);
                        
                        if (error.name === 'NotAllowedError' && audioContext) {
                            this.updateStatus('Autoplay blocked. Click to enable audio.');
                            
                            const clickHandler = async () => {
                                try {
                                    await this.audioContext.resume();
                                    await audio.play();
                                    document.removeEventListener('click', clickHandler);
                                } catch (err) {
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
            if (typeof window.animateActiveWaveform === 'function') {
                window.animateActiveWaveform(false);
            }
        }
    }
    
    /**
     * Process a written or spoken proposal and generate spoken response
     */
    async processProposal(proposalText) {
        if (!proposalText || !proposalText.trim()) {
            throw new Error('Proposal text is required');
        }
        
        this.updateStatus('Processing proposal...');
        
        try {
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
                const aiResponse = data.result.response;
                
                if (typeof window.typeText === 'function') {
                    const responseText = document.getElementById('response-text');
                    if (responseText) {
                        window.typeText(responseText, aiResponse);
                    }
                }
                
                if (typeof window.addAikiraMessageToConversation === 'function') {
                    window.addAikiraMessageToConversation(aiResponse);
                }
                
                if (data.result.scores && typeof window.updateMetrics === 'function') {
                    window.updateMetrics(
                        Math.round(data.result.scores.fairness * 100),
                        Math.round(data.result.scores.value * 100),
                        Math.round(data.result.scores.protection * 100),
                        Math.round(data.result.consensusIndex * 100)
                    );
                }
                
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
}

// Create global instance on DOM load
document.addEventListener('DOMContentLoaded', () => {
    const audioProcessor = new AudioProcessor();
    
    audioProcessor.setStatusCallback((message) => {
        const statusElement = document.getElementById('input-status');
        if (statusElement) {
            statusElement.textContent = message;
            
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
    window.startVoiceRecording = () => audioProcessor.startRecording();
    window.stopVoiceRecording = () => audioProcessor.stopRecording();
    window.transcribeAudio = (blob) => audioProcessor.transcribeAudio(blob);
    window.generateSpeech = (text, options) => audioProcessor.generateSpeech(text, options);
    window.processProposal = (text) => audioProcessor.processProposal(text);
    
    // Set up voice button functionality - UPDATED FOR BETTER RECORDING
    const voiceButton = document.getElementById('voice-input-btn');
    if (voiceButton) {
        voiceButton.addEventListener('click', async function() {
            try {
                const isActive = voiceButton.classList.contains('active');
                
                if (isActive) {
                    // User clicked to stop recording
                    console.log('Stopping voice recording...');
                    voiceButton.classList.remove('active');
                    const audioBlob = await audioProcessor.stopRecording();
                    
                    if (audioBlob) {
                        try {
                            const transcribedText = await audioProcessor.transcribeAudio(audioBlob);
                            
                            if (transcribedText && transcribedText.trim() !== '') {
                                const terminalInput = document.getElementById('terminal-input');
                                if (terminalInput) {
                                    terminalInput.value = transcribedText;
                                }
                                
                                if (typeof window.addUserMessageToConversation === 'function') {
                                    window.addUserMessageToConversation(transcribedText);
                                }
                                
                                await audioProcessor.processProposal(transcribedText);
                            }
                        } catch (error) {
                            console.error('Voice processing error:', error);
                            audioProcessor.updateStatus(`Error: ${error.message}`);
                        }
                    }
                } else {
                    // User clicked to start recording
                    console.log('Starting voice recording...');
                    voiceButton.classList.add('active');
                    
                    // Update status immediately
                    audioProcessor.updateStatus('Listening...');
                    
                    // Start recording with a slight delay to ensure UI updates
                    setTimeout(async () => {
                        try {
                            await audioProcessor.startRecording();
                            
                            // Set a timer to automatically stop recording after 5 seconds
                            setTimeout(() => {
                                if (voiceButton.classList.contains('active')) {
                                    console.log('Auto-stopping recording after timeout');
                                    voiceButton.click(); // Trigger the stop recording action
                                }
                            }, 5000);
                        } catch (err) {
                            console.error('Error starting recording:', err);
                            voiceButton.classList.remove('active');
                            audioProcessor.updateStatus(`Error: ${err.message}`);
                        }
                    }, 100);
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
                    if (typeof window.addUserMessageToConversation === 'function') {
                        window.addUserMessageToConversation(text);
                    }
                    
                    await audioProcessor.processProposal(text);
                } catch (error) {
                    console.error('Proposal submission error:', error);
                    audioProcessor.updateStatus(`Error: ${error.message}`);
                }
            }
        });
    }
    
    // Play startup sound when audio is enabled
    const enableAudioBtn = document.getElementById('enable-audio-btn');
    if (enableAudioBtn) {
        enableAudioBtn.addEventListener('click', function() {
            audioProcessor.playSoundEffect('assets/audio/startup.wav');
        });
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
        
        volumeSlider.value = audioProcessor.volume * 100;
        if (volumeValue) {
            volumeValue.textContent = `Volume: ${Math.round(audioProcessor.volume * 100)}%`;
        }
    }
});