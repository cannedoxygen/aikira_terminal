/**
 * Aikira Terminal - Audio Processor
 * Unified audio handling functionality for voice interactions
 * UPDATED FOR CHROME COMPATIBILITY
 */

// Global error handler for unhandled Promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Add visual feedback for debugging
    const statusElement = document.getElementById('input-status');
    if (statusElement) {
      statusElement.textContent = `Audio Error: ${event.reason.message || 'Unknown async error'}`;
      statusElement.classList.add('active');
      
      // Reset after a few seconds
      setTimeout(() => {
        statusElement.classList.remove('active');
      }, 5000);
    }
  });
  
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
      this.permissionRequested = false;
      
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
              
              // Play a silent sound to fully activate audio in Chrome
              this.playSilentSound();
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
     * Plays a silent sound to help initialize audio in Chrome
     */
    playSilentSound() {
      try {
        // Create silent oscillator - this helps Chrome recognize audio is active
        const oscillator = this.audioContext.createOscillator();
        const silentGain = this.audioContext.createGain();
        
        // Set volume to near-zero (completely silent causes issues)
        silentGain.gain.value = 0.001;
        
        // Connect and start oscillator briefly
        oscillator.connect(silentGain);
        silentGain.connect(this.audioContext.destination);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
        
        console.log('Silent sound played to activate audio');
      } catch (error) {
        console.error('Error playing silent sound:', error);
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
          
          // Play a silent sound to fully activate audio
          this.playSilentSound();
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
     * Handles microphone permissions with clear user guidance
     */
    async requestMicrophonePermission() {
      // Update status
      this.updateStatus('Requesting microphone access...');
      
      try {
        // Request microphone with explicit constraints for better Chrome support
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        
        console.log('Requesting microphone with constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // If we get here, permission was granted
        console.log('Microphone access granted!');
        this.permissionRequested = true;
        
        // Stop tracks to release the microphone - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        
        // Update status
        this.updateStatus('Microphone access granted');
        
        return true;
      } catch (error) {
        console.error('Microphone permission error:', error);
        
        // Show appropriate error message
        if (error.name === 'NotAllowedError') {
          this.updateStatus('Microphone access denied');
          this.showNotification(
            'Microphone access denied. Check browser settings and try again.',
            'error'
          );
        } else if (error.name === 'NotFoundError') {
          this.updateStatus('No microphone detected');
          this.showNotification(
            'No microphone detected. Please connect a microphone and try again.',
            'error'
          );
        } else {
          this.updateStatus(`Microphone error: ${error.message}`);
          this.showNotification(`Error: ${error.message}`, 'error');
        }
        
        return false;
      }
    }
    
    /**
     * Displays a notification to the user
     */
    showNotification(message, type = 'info', duration = 5000) {
      // Create notification element
      const notification = document.createElement('div');
      notification.textContent = message;
      
      // Style the notification
      Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 15px',
        borderRadius: '10px',
        color: 'white',
        zIndex: '1000',
        opacity: '0',
        transition: 'opacity 0.3s ease'
      });
      
      // Set background color based on type
      switch (type) {
        case 'error':
          notification.style.backgroundColor = 'rgba(255, 107, 107, 0.9)';
          break;
        case 'warning':
          notification.style.backgroundColor = 'rgba(255, 209, 102, 0.9)';
          break;
        case 'success':
          notification.style.backgroundColor = 'rgba(169, 238, 230, 0.9)';
          break;
        default:
          notification.style.backgroundColor = 'rgba(216, 181, 255, 0.9)';
      }
      
      // Add to document
      document.body.appendChild(notification);
      
      // Fade in
      setTimeout(() => {
        notification.style.opacity = '1';
      }, 10);
      
      // Remove after duration
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }
    
    /**
     * Starts recording from the microphone
     */
    async startRecording() {
      // Ensure audio context is ready
      await this.ensureAudioContext();
      
      // Stop any existing recording
      if (this.isRecording) {
        await this.stopRecording();
      }
      
      this.updateStatus('Requesting microphone...');
      
      try {
        // First check if we need to get permission
        if (!this.permissionRequested) {
          const permissionGranted = await this.requestMicrophonePermission();
          if (!permissionGranted) {
            throw new Error('Microphone permission denied');
          }
        }
        
        // Now request the stream for actual recording
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        };
        
        console.log('Setting up microphone for recording...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.mediaStream = stream;
        
        // Set up MediaRecorder with appropriate options for better Chrome support
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
     * Check if an audio file exists before trying to play it
     */
    async checkAudioFile(url) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        
        if (!response.ok) {
          console.error(`Audio file not found or not accessible: ${url}`);
          return false;
        }
        
        console.log(`Audio file verified: ${url}`);
        return true;
      } catch (error) {
        console.error(`Error checking audio file: ${error.message}`);
        return false;
      }
    }
    
    /**
     * Plays audio from a URL with improved Chrome compatibility
     */
    async playAudio(audioUrl) {
      try {
        // Make sure audio context is initialized first
        await this.ensureAudioContext();
        
        // Verify the file exists
        const fileExists = await this.checkAudioFile(audioUrl);
        if (!fileExists) {
          throw new Error(`Audio file not found: ${audioUrl}`);
        }
        
        this.updateStatus('Playing audio...');
        
        // Create a new audio element for playback
        const audio = new Audio();
        
        // Set volume from our stored value
        audio.volume = this.volume;
        
        // Return a promise that resolves when audio finishes playing
        return new Promise((resolve, reject) => {
          // Set up all event handlers before setting src
          audio.oncanplay = () => console.log('Audio can play now');
          audio.onloadstart = () => console.log('Started loading audio');
          
          audio.onplay = () => {
            console.log('Audio playback started');
            this.isPlaying = true;
            
            // Animate waveform if available
            if (typeof window.animateActiveWaveform === 'function') {
              window.animateActiveWaveform(true);
            }
          };
          
          audio.onended = () => {
            console.log('Audio playback completed');
            this.isPlaying = false;
            
            // Stop waveform animation
            if (typeof window.animateActiveWaveform === 'function') {
              window.animateActiveWaveform(false);
            }
            
            this.updateStatus('Ready for input');
            resolve();
          };
          
          audio.onerror = (event) => {
            console.error('Audio playback error:', event);
            this.isPlaying = false;
            
            // Stop waveform animation
            if (typeof window.animateActiveWaveform === 'function') {
              window.animateActiveWaveform(false);
            }
            
            this.updateStatus('Audio playback error');
            reject(new Error(`Audio error: ${audio.error?.message || 'Unknown error'}`));
          };
          
          // Store reference to control playback
          this.currentAudio = audio;
          
          // Set source and start loading
          audio.src = audioUrl;
          audio.load();
          
          // Try to play with special handling for Chrome autoplay policy
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Audio play error:', error);
              
              // Special handling for Chrome's autoplay restriction
              if (error.name === 'NotAllowedError') {
                console.log('Autoplay blocked by browser, needs user interaction');
                this.updateStatus('Audio blocked - click anywhere to enable');
                
                // Show a notification to the user
                this.showNotification(
                  'Click anywhere on the page to enable audio playback',
                  'warning',
                  8000
                );
                
                // Set up one-time click handler to try playing again
                const clickHandler = async () => {
                  try {
                    // Resume audio context first
                    await this.audioContext.resume();
                    
                    // Try playing again
                    await audio.play();
                    console.log('Audio playing after user interaction');
                    
                    // Remove the click handler
                    document.removeEventListener('click', clickHandler);
                  } catch (retryError) {
                    console.error('Still failed to play after user interaction:', retryError);
                    reject(retryError);
                  }
                };
                
                document.addEventListener('click', clickHandler, { once: true });
              } else {
                reject(error);
              }
            });
          }
        });
      } catch (error) {
        console.error('Audio playback setup error:', error);
        this.updateStatus(`Audio error: ${error.message}`);
        throw error;
      }
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
     * Process a proposal with improved error handling
     */
    async processProposal(proposalText) {
      if (!proposalText || !proposalText.trim()) {
        throw new Error('Proposal text is required');
      }
      
      this.updateStatus('Processing proposal...');
      
      try {
        // Submit proposal to API
        console.log('Sending proposal to API');
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
        
        // Process API response
        console.log('Processing API response');
        const data = await response.json();
        
        if (!data.success || !data.result || !data.result.response) {
          throw new Error(data.error || 'Invalid API response');
        }
        
        const aiResponse = data.result.response;
        
        // Update UI with response
        console.log('Updating UI with response');
        if (typeof window.addAikiraMessageToConversation === 'function') {
          window.addAikiraMessageToConversation(aiResponse);
        }
        
        // Update metrics if available
        console.log('Updating metrics');
        if (data.result.scores && typeof window.updateMetrics === 'function') {
          window.updateMetrics(
            Math.round(data.result.scores.fairness * 100),
            Math.round(data.result.scores.value * 100),
            Math.round(data.result.scores.protection * 100),
            Math.round(data.result.consensusIndex * 100)
          );
        }
        
        // Generate and play speech - CRITICAL SECTION
        try {
          // Make sure audio context is initialized first
          await this.ensureAudioContext();
          
          // Use a try-catch block specifically for speech generation
          try {
            console.log('Generating speech');
            const audioUrl = await this.generateSpeech(aiResponse);
            
            // Verify the audio file exists before trying to play it
            const audioExists = await this.checkAudioFile(audioUrl);
            
            if (audioExists) {
              try {
                console.log('Playing audio from:', audioUrl);
                await this.playAudio(audioUrl);
              } catch (playError) {
                console.error('Audio playback error:', playError);
                // Show notification but don't throw
                this.showNotification('Audio playback issue: Click anywhere to enable audio', 'warning');
              }
            } else {
              console.error('Audio file not found:', audioUrl);
              this.updateStatus('Audio file not found');
            }
          } catch (speechError) {
            console.error('Speech generation error:', speechError);
            this.updateStatus(`Speech error: ${speechError.message}`);
          }
        } catch (audioContextError) {
          console.error('Audio context error:', audioContextError);
          this.updateStatus(`Audio system error: ${audioContextError.message}`);
        }
        
        // Final status update
        this.updateStatus('Ready for input');
        
        return aiResponse;
      } catch (error) {
        console.error('Proposal processing error:', error);
        this.updateStatus(`Error: ${error.message}`);
        throw error;
      }
    }
    
    /**
     * Plays a sound effect from a file with improved Chrome compatibility
     */
    playSoundEffect(soundPath, volume = null) {
      try {
        console.log(`Playing sound effect: ${soundPath}`);
        
        // Ensure audio context is running
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        
        const audio = new Audio(soundPath);
        audio.volume = volume !== null ? volume : this.volume;
        
        // Log when sound loads and plays
        audio.oncanplay = () => console.log(`Sound effect loaded: ${soundPath}`);
        audio.onplay = () => console.log(`Sound effect playing: ${soundPath}`);
        audio.onerror = (e) => console.error(`Sound effect error: ${soundPath}`, e);
        
        audio.play().catch(error => {
          console.error(`Error playing sound effect: ${error.message}`);
          
          // If autoplay is blocked, try after user interaction
          if (error.name === 'NotAllowedError') {
            console.log('Sound blocked by browser. Will try on next user interaction.');
            
            const playOnClick = () => {
              audio.play()
                .then(() => {
                  console.log(`Sound effect played after user interaction: ${soundPath}`);
                  document.removeEventListener('click', playOnClick);
                })
                .catch(e => console.error('Still failed to play sound after interaction:', e));
            };
            
            document.addEventListener('click', playOnClick, { once: true });
          }
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
    window.initAudio = async () => {
      const success = await audioProcessor.ensureAudioContext();
      
      // Play a silent sound to ensure audio is fully initialized
      if (success) {
        audioProcessor.playSilentSound();
        
        // Play startup sound to test audio system
        setTimeout(() => {
          audioProcessor.playSoundEffect('assets/audio/startup.wav', 0.3);
        }, 500);
      }
      
      return success;
    };
    
    window.setVolume = (level) => audioProcessor.setVolume(level);
    window.playAudio = (url) => audioProcessor.playAudio(url);
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
            // Before starting recording, explicitly request microphone permission
            try {
              // First request microphone permission
              const permissionGranted = await audioProcessor.requestMicrophonePermission();
              
              if (permissionGranted) {
                // If granted, proceed with recording
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
              } else {
                // If denied, prevent activation
                voiceButton.classList.remove('active');
                audioProcessor.updateStatus('Microphone access denied');
              }
            } catch (err) {
              console.error('Microphone permission error:', err);
              voiceButton.classList.remove('active');
              audioProcessor.updateStatus(`Microphone error: ${err.message}`);
            }
          }
        } catch (error) {
          console.error('Voice button error:', error);
          voiceButton.classList.remove('active');
          audioProcessor.updateStatus(`Error: ${error.message}`);
        }
      });
    }
    
    // Set up volume button as audio verification button
    const volumeButton = document.getElementById('volume-btn');
    if (volumeButton) {
      volumeButton.addEventListener('click', async function() {
        try {
          // Ensure audio context is initialized and resumed
          await audioProcessor.ensureAudioContext();
          console.log('Audio context initialized and resumed');
          
          // Play a verification sound to test audio
          audioProcessor.playSoundEffect('assets/audio/startup.wav', 0.5);
          
          // Update status
          audioProcessor.updateStatus('Audio system verified');
          
          // Visual feedback
          audioProcessor.showNotification('Audio system active', 'success');
        } catch (error) {
          console.error('Audio verification error:', error);
          audioProcessor.updateStatus(`Audio error: ${error.message}`);
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
      
      // Add enter key handler for text input
      proposalText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitButton.click();
        }
      });
    }
    
    // Make the enable audio button more effective
    const enableAudioBtn = document.getElementById('enable-audio-btn');
    if (enableAudioBtn) {
      enableAudioBtn.addEventListener('click', async function() {
        // Ensure audio is initialized
        const success = await audioProcessor.ensureAudioContext();
        
        if (success) {
          // Play a silent sound first to ensure audio context is fully active
          audioProcessor.playSilentSound();
          
          // Then play startup sound to verify audio system
          setTimeout(() => {
            audioProcessor.playSoundEffect('assets/audio/startup.wav', 0.5);
          }, 300);
          
          // Hide overlay with animation
          const overlay = document.getElementById('audio-init-overlay');
          if (overlay) {
            overlay.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
              overlay.style.display = 'none';
            }, 500);
          }
        } else {
          // If initialization failed, show notification
          audioProcessor.showNotification(
            'Audio initialization failed. Try clicking anywhere on the page.',
            'error'
          );
        }
      });
    }
  });