/**
 * Aikira Terminal - Audio Processor
 * Handles audio processing, voice visualization, and audio effects
 */

class AudioProcessor {
    constructor(audioContext = null) {
        // Create audio context if not provided
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        
        // Audio nodes
        this.sourceNode = null;
        this.analyser = null;
        this.gainNode = null;
        this.effectNodes = {};
        
        // Recording state
        this.isRecording = false;
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.audioChunks = [];
        
        // Playback state
        this.isPlaying = false;
        
        // Visualization data
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyserBufferLength = this.analyser.frequencyBinCount;
        this.frequencyData = new Uint8Array(this.analyserBufferLength);
        this.timeData = new Uint8Array(this.analyserBufferLength);
        
        // Initialize
        this.setupAudioNodes();
    }
    
    /**
     * Sets up initial audio processing nodes
     */
    setupAudioNodes() {
        // Create gain node for volume control
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0.8; // Default volume at 80%
        
        // Connect nodes
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        // Create standard effect nodes
        this.createEffectNodes();
    }
    
    /**
     * Creates audio effect nodes
     */
    createEffectNodes() {
        // Reverb
        const convolver = this.audioContext.createConvolver();
        this.effectNodes.reverb = {
            node: convolver,
            active: false,
            type: 'convolver'
        };
        
        // Filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        this.effectNodes.filter = {
            node: filter,
            active: false,
            type: 'filter'
        };
        
        // Delay
        const delay = this.audioContext.createDelay(1.0);
        delay.delayTime.value = 0.3;
        const delayFeedback = this.audioContext.createGain();
        delayFeedback.gain.value = 0.4;
        
        delay.connect(delayFeedback);
        delayFeedback.connect(delay);
        
        this.effectNodes.delay = {
            node: delay,
            feedback: delayFeedback,
            active: false,
            type: 'delay'
        };
        
        // Will generate impulse response for reverb later when needed
    }
    
    /**
     * Generates impulse response for reverb
     * @param {number} duration - Duration in seconds
     * @param {number} decay - Decay rate
     * @returns {AudioBuffer} Impulse response buffer
     */
    generateImpulseResponse(duration = 2, decay = 2) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulseResponse = this.audioContext.createBuffer(2, length, sampleRate);
        
        const leftChannel = impulseResponse.getChannelData(0);
        const rightChannel = impulseResponse.getChannelData(1);
        
        for (let i = 0; i < length; i++) {
            const n = i / length;
            // Exponential decay
            const amplitude = Math.pow(1 - n, decay) * (Math.random() * 2 - 1) * 0.5;
            
            leftChannel[i] = amplitude;
            rightChannel[i] = amplitude;
        }
        
        return impulseResponse;
    }
    
    /**
     * Applies reverb effect with custom impulse response
     * @param {boolean} enable - Whether to enable reverb
     */
    applyReverb(enable = true) {
        const reverb = this.effectNodes.reverb;
        
        if (enable && !reverb.active) {
            // Generate impulse response if not already set
            if (!reverb.node.buffer) {
                reverb.node.buffer = this.generateImpulseResponse();
            }
            
            // Disconnect current chain
            if (this.sourceNode) {
                this.sourceNode.disconnect();
                
                // Reconnect with reverb
                this.sourceNode.connect(reverb.node);
                reverb.node.connect(this.analyser);
            }
            
            reverb.active = true;
        } else if (!enable && reverb.active) {
            // Disconnect current chain
            if (this.sourceNode) {
                this.sourceNode.disconnect();
                
                // Reconnect without reverb
                this.sourceNode.connect(this.analyser);
            }
            
            reverb.active = false;
        }
    }
    
    /**
     * Applies filter effect
     * @param {boolean} enable - Whether to enable filter
     * @param {string} type - Filter type (lowpass, highpass, bandpass)
     * @param {number} frequency - Filter frequency
     */
    applyFilter(enable = true, type = 'lowpass', frequency = 1000) {
        const filter = this.effectNodes.filter;
        
        // Set filter parameters
        filter.node.type = type;
        filter.node.frequency.value = frequency;
        
        if (enable && !filter.active) {
            // Disconnect current chain
            if (this.sourceNode) {
                this.sourceNode.disconnect();
                
                // Reconnect with filter
                this.sourceNode.connect(filter.node);
                filter.node.connect(this.analyser);
            }
            
            filter.active = true;
        } else if (!enable && filter.active) {
            // Disconnect current chain
            if (this.sourceNode) {
                this.sourceNode.disconnect();
                
                // Reconnect without filter
                this.sourceNode.connect(this.analyser);
            }
            
            filter.active = false;
        }
    }
    
    /**
     * Sets volume level
     * @param {number} level - Volume level (0-1)
     */
    setVolume(level) {
        if (level < 0) level = 0;
        if (level > 1) level = 1;
        
        // Apply smoothly to avoid clicks
        this.gainNode.gain.linearRampToValueAtTime(
            level, 
            this.audioContext.currentTime + 0.05
        );
    }
    
    /**
     * Plays audio from an ArrayBuffer
     * @param {ArrayBuffer} audioData - Raw audio data
     * @returns {Promise} Resolves when playback starts
     */
    async playAudioBuffer(audioData) {
        try {
            // Stop any current playback
            if (this.isPlaying) {
                this.stopPlayback();
            }
            
            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(audioData);
            
            // Create source node
            this.sourceNode = this.audioContext.createBufferSource();
            this.sourceNode.buffer = audioBuffer;
            
            // Connect to audio chain
            this.sourceNode.connect(this.analyser);
            
            // Start playback
            this.sourceNode.start(0);
            this.isPlaying = true;
            
            // Set up event for when playback ends
            this.sourceNode.onended = () => {
                this.isPlaying = false;
                this.sourceNode = null;
            };
            
            return true;
        } catch (error) {
            console.error('Error playing audio buffer:', error);
            return false;
        }
    }
    
    /**
     * Plays audio from a Blob
     * @param {Blob} audioBlob - Audio blob
     * @returns {Promise} Resolves when playback starts
     */
    async playAudioBlob(audioBlob) {
        try {
            // Convert Blob to ArrayBuffer
            const arrayBuffer = await new Response(audioBlob).arrayBuffer();
            
            // Play using the array buffer method
            return await this.playAudioBuffer(arrayBuffer);
        } catch (error) {
            console.error('Error playing audio blob:', error);
            return false;
        }
    }
    
    /**
     * Plays audio from a file URL
     * @param {string} url - Audio file URL
     * @returns {Promise} Resolves when playback starts
     */
    async playAudioFile(url) {
        try {
            // Fetch audio file
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            
            // Play using the array buffer method
            return await this.playAudioBuffer(arrayBuffer);
        } catch (error) {
            console.error('Error playing audio file:', error);
            return false;
        }
    }
    
    /**
     * Stops current audio playback
     */
    stopPlayback() {
        if (this.sourceNode && this.isPlaying) {
            try {
                this.sourceNode.stop();
            } catch (error) {
                // Ignore errors from already stopped sources
            }
            
            this.isPlaying = false;
            this.sourceNode = null;
        }
    }
    
    /**
     * Starts recording from microphone
     * @returns {Promise} Resolves when recording starts
     */
    async startRecording() {
        // Stop any current recording
        if (this.isRecording) {
            this.stopRecording();
        }
        
        try {
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaStream = stream;
            
            // Create media recorder
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            // Connect microphone to audio nodes for visualization
            const micSource = this.audioContext.createMediaStreamSource(stream);
            micSource.connect(this.analyser);
            
            // Store source node
            this.sourceNode = micSource;
            
            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Start visualization
            this.startVisualization();
            
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            return false;
        }
    }
    
    /**
     * Stops current recording
     * @returns {Promise} Resolves with recorded audio blob
     */
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return null;
        }
        
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
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
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                
                this.isRecording = false;
                this.mediaRecorder = null;
                this.mediaStream = null;
                
                // Stop visualization
                this.stopVisualization();
                
                resolve(audioBlob);
            };
            
            // Stop recording
            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            } else {
                resolve(null);
            }
        });
    }
    
    /**
     * Starts audio visualization update loop
     */
    startVisualization() {
        // Set up visualization loop
        const updateVisualization = () => {
            // Get data for visualization
            this.analyser.getByteFrequencyData(this.frequencyData);
            this.analyser.getByteTimeDomainData(this.timeData);
            
            // Connect to visualizer if available
            if (window.soundVisualizer) {
                // Already handled in digital-effects.js
            }
            
            // Continue loop if recording or playing
            if (this.isRecording || this.isPlaying) {
                requestAnimationFrame(updateVisualization);
            }
        };
        
        // Start the loop
        updateVisualization();
    }
    
    /**
     * Stops visualization updates
     */
    stopVisualization() {
        // The visualization loop will stop on its own
        // when isRecording and isPlaying are both false
    }
    
    /**
     * Applies voice effects for AI speech
     * @param {boolean} enable - Whether to enable effects
     */
    applyAiVoiceEffects(enable = true) {
        if (enable) {
            // Apply slight reverb for depth
            this.applyReverb(true);
            
            // Set moderate volume
            this.setVolume(0.85);
        } else {
            // Disable effects
            this.applyReverb(false);
            this.applyFilter(false);
            
            // Reset volume
            this.setVolume(0.8);
        }
    }
    
    /**
     * Gets current audio visualization data
     * @returns {Object} Frequency and time domain data
     */
    getVisualizationData() {
        return {
            frequencyData: [...this.frequencyData],
            timeData: [...this.timeData]
        };
    }
    
    /**
     * Disposes of audio resources
     */
    dispose() {
        // Stop any ongoing processes
        this.stopPlayback();
        this.stopRecording();
        
        // Disconnect all nodes
        if (this.sourceNode) {
            this.sourceNode.disconnect();
        }
        
        this.analyser.disconnect();
        this.gainNode.disconnect();
        
        // Disconnect effect nodes
        Object.values(this.effectNodes).forEach(effect => {
            if (effect.node) {
                effect.node.disconnect();
            }
            
            if (effect.feedback) {
                effect.feedback.disconnect();
            }
        });
        
        // Close audio context
        if (this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

// Initialize audio processor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only create if there's no existing instance from main.js
    if (!window.audioProcessor) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        window.audioProcessor = new AudioProcessor(audioContext);
    }
});