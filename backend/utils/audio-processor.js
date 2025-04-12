/**
 * Aikira Terminal - Enhanced Audio Processor
 * Unified audio handling functionality for voice interactions with improved debugging and error handling
 */

class AudioProcessor {
  constructor() {
      // Debug mode - set to true for detailed console logging
      this.DEBUG_AUDIO = true;
      
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
      
      // Audio playback attempts counter
      this.playbackAttempts = 0;
      this.maxPlaybackAttempts = 3;
      
      // Audio playback fallback options
      this.useFallbackAudio = false;
      
      // Initialize on creation
      this.initAudio();
      
      // Store globally for access from other scripts
      window.audioProcessor = this;
      
      // Log creation
      this.debugLog('AudioProcessor created');
  }
  
  /**
   * Debug logging helper
   */
  debugLog(...args) {
      if (this.DEBUG_AUDIO) {
          console.log('🔊', ...args);
      }
  }
  
  /**
   * Error logging helper
   */
  errorLog(...args) {
      console.error('❌', ...args);
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
                      this.debugLog('Audio context resumed on user interaction');
                      this.isInitialized = true;
                  });
              }
          });
          
          this.debugLog('Audio context created:', this.audioContext.state);
          this.isInitialized = this.audioContext.state === 'running';
          
          return true;
      } catch (error) {
          this.errorLog('Error initializing audio processor:', error);
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
      this.debugLog('Status update:', message);
      if (this.statusCallback) {
          this.statusCallback(message);
      }
  }
  
  /**
   * Ensures audio context is initialized and resumed
   */
  async ensureAudioContext() {
      if (!this.audioContext) {
          this.debugLog('Audio context not found, initializing');
          this.initAudio();
      }
      
      if (this.audioContext.state === 'suspended') {
          this.debugLog('Audio context is suspended, attempting to resume');
          try {
              await this.audioContext.resume();
              this.debugLog('Audio context resumed successfully');
              this.isInitialized = true;
          } catch (error) {
              this.errorLog('Failed to resume audio context:', error);
              throw new Error('Audio context initialization failed. Please try again or enable audio in your browser settings.');
          }
      }
      
      this.debugLog('Audio context is ready:', this.audioContext.state);
      return this.audioContext;
  }
  
  /**
   * Sets volume level
   */
  setVolume(level) {
      const newVolume = Math.max(0, Math.min(1, level));
      this.volume = newVolume;
      
      this.debugLog(`Setting volume to ${this.volume}`);
      
      if (this.gainNode) {
          // Use more gradual transition to avoid clicks
          this.gainNode.gain.linearRampToValueAtTime(
              this.volume, 
              this.audioContext.currentTime + 0.05
          );
      }
      
      // Update mute state
      this.isMuted = this.volume === 0;
      
      // Update current audio if playing
      if (this.currentAudio) {
          this.currentAudio.volume = this.volume;
      }
      
      return this.volume;
  }
  
  /**
   * Starts recording from the microphone
   */
  async startRecording() {
      await this.ensureAudioContext();
      
      if (this.isRecording) {
          this.debugLog('Already recording, stopping first');
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
          
          this.debugLog('Requesting microphone access');
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          this.mediaStream = stream;
          
          // Set up MediaRecorder with appropriate options
          let options = {};
          
          // Try to find the best supported format for compatibility
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              options = { mimeType: 'audio/webm;codecs=opus' };
              this.debugLog('Using audio/webm;codecs=opus');
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
              options = { mimeType: 'audio/webm' };
              this.debugLog('Using audio/webm');
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              options = { mimeType: 'audio/mp4' };
              this.debugLog('Using audio/mp4');
          } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
              options = { mimeType: 'audio/ogg;codecs=opus' };
              this.debugLog('Using audio/ogg;codecs=opus');
          } else if (MediaRecorder.isTypeSupported('audio/wav')) {
              options = { mimeType: 'audio/wav' };
              this.debugLog('Using audio/wav');
          }
          
          try {
              this.debugLog('Creating MediaRecorder with options:', options);
              this.mediaRecorder = new MediaRecorder(stream, options);
              this.debugLog('MediaRecorder created with MIME type:', this.mediaRecorder.mimeType);
          } catch (e) {
              this.errorLog('MediaRecorder creation with options failed:', e);
              this.debugLog('Creating MediaRecorder without specific options');
              this.mediaRecorder = new MediaRecorder(stream);
              this.debugLog('MediaRecorder created with default settings');
          }
          
          // Reset audio chunks
          this.audioChunks = [];
          
          // Set up data handler
          this.mediaRecorder.ondataavailable = (event) => {
              this.debugLog('Got data chunk, size:', event.data.size);
              if (event.data.size > 0) {
                  this.audioChunks.push(event.data);
              }
          };
          
          // Set up error handler
          this.mediaRecorder.onerror = (event) => {
              this.errorLog('MediaRecorder error:', event.error);
              this.updateStatus(`Recording error: ${event.error.message}`);
          };
          
          // Connect to analyser node for visualization
          const micSource = this.audioContext.createMediaStreamSource(stream);
          micSource.connect(this.analyser);
          this.sourceNode = micSource;
          
          // Start recording - request data every second
          this.debugLog('Starting MediaRecorder...');
          this.mediaRecorder.start(1000);
          this.debugLog('MediaRecorder started:', this.mediaRecorder.state);
          
          this.isRecording = true;
          this.updateStatus('Listening to your voice...');
          
          // Start waveform animation if available
          if (typeof window.animateActiveWaveform === 'function') {
              window.animateActiveWaveform(true);
          }
          
          // Set a safety timeout to automatically stop recording after 15 seconds
          this.recordingTimeout = setTimeout(() => {
              if (this.isRecording) {
                  this.debugLog('Safety timeout: auto-stopping recording after 15s');
                  this.stopRecording();
              }
          }, 15000);
          
          return true;
      } catch (error) {
          this.errorLog('Error starting recording:', error);
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
      // Clear safety timeout if it exists
      if (this.recordingTimeout) {
          clearTimeout(this.recordingTimeout);
          this.recordingTimeout = null;
      }
      
      if (!this.isRecording || !this.mediaRecorder) {
          this.debugLog('No active recording to stop');
          return null;
      }
      
      this.updateStatus('Processing recording...');
      
      return new Promise((resolve, reject) => {
          // Define onstop handler for the media recorder
          this.mediaRecorder.onstop = () => {
              this.debugLog('Recording stopped');
              
              // Stop all tracks in the media stream
              if (this.mediaStream) {
                  this.mediaStream.getTracks().forEach(track => {
                      track.stop();
                      this.debugLog('Media track stopped');
                  });
              }
              
              // Disconnect the source node if it exists
              if (this.sourceNode) {
                  this.sourceNode.disconnect();
                  this.sourceNode = null;
                  this.debugLog('Source node disconnected');
              }
              
              // Get recorder MIME type or fall back to default
              const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
              this.debugLog('Creating audio blob with MIME type:', mimeType);
              
              // Create blob from collected chunks
              const audioBlob = new Blob(this.audioChunks, { type: mimeType });
              this.debugLog(`Recording complete: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
              
              // Reset recording state
              this.isRecording = false;
              this.mediaRecorder = null;
              this.mediaStream = null;
              
              // Stop waveform animation if available
              if (typeof window.animateActiveWaveform === 'function') {
                  window.animateActiveWaveform(false);
              }
              
              // Check if the recording was successful
              if (audioBlob.size > 1000) {
                  resolve(audioBlob);
              } else {
                  reject(new Error('Recording too short or empty'));
              }
          };
          
          // Define error handler
          this.mediaRecorder.onerror = (event) => {
              this.errorLog('MediaRecorder error during stop:', event.error);
              reject(event.error || new Error('Unknown recording error'));
          };
          
          // Stop the recorder if it's active
          if (this.mediaRecorder.state !== 'inactive') {
              this.debugLog('Stopping media recorder from state:', this.mediaRecorder.state);
              try {
                  this.mediaRecorder.stop();
              } catch (e) {
                  this.errorLog('Error stopping media recorder:', e);
                  reject(e);
              }
          } else {
              this.debugLog('MediaRecorder already inactive');
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
      this.debugLog(`Transcribing audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      try {
          // Create form data for the API request
          const formData = new FormData();
          
          // Determine the best filename extension based on the blob type
          let fileName = 'recording';
          if (audioBlob.type.includes('webm')) {
              fileName += '.webm';
          } else if (audioBlob.type.includes('mp4')) {
              fileName += '.mp4';
          } else if (audioBlob.type.includes('mp3')) {
              fileName += '.mp3';
          } else if (audioBlob.type.includes('ogg')) {
              fileName += '.ogg';
          } else if (audioBlob.type.includes('wav')) {
              fileName += '.wav';
          } else {
              // Default extension
              fileName += '.webm';
          }
          
          this.debugLog(`Adding audio blob to form with filename: ${fileName}`);
          formData.append('audio', audioBlob, fileName);
          
          // Set up request with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          this.debugLog('Sending transcription request to server...');
          const response = await fetch('/api/speech/transcribe', {
              method: 'POST',
              body: formData,
              signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          this.debugLog(`Transcription API response status: ${response.status}`);
          
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
          this.debugLog('Transcription response:', data);
          
          if (data.success && data.text) {
              this.updateStatus('Transcription complete');
              return data.text;
          } else {
              throw new Error(data.error || 'Transcription failed - no text received');
          }
      } catch (error) {
          this.errorLog('Transcription error:', error);
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
          
          this.debugLog('Generating speech with params:', JSON.stringify(speechParams, null, 2));
          
          const response = await fetch('/api/speech/generate', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(speechParams)
          });
          
          this.debugLog(`Speech generation API response status: ${response.status}`);
          
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Speech generation failed: ${errorData.error || response.statusText}`);
          }
          
          const data = await response.json();
          this.debugLog('Speech generation response:', data);
          
          if (data.success && data.audio_url) {
              this.updateStatus('Speech generated successfully');
              return data.audio_url;
          } else {
              throw new Error(data.error || 'Failed to generate speech');
          }
      } catch (error) {
          this.errorLog('Speech generation error:', error);
          this.updateStatus(`Speech error: ${error.message}`);
          throw error;
      }
  }
  
  /**
   * Enhanced audio playback with multiple fallback strategies
   */
  async playAudio(audioUrl) {
      // Reset attempts counter
      this.playbackAttempts = 0;
      
      // Ensure audio context is ready
      await this.ensureAudioContext();
      
      this.updateStatus('Playing audio...');
      this.debugLog('Playing audio from URL:', audioUrl);
      
      // Stop any current playback
      if (this.isPlaying) {
          this.stopPlayback();
      }
      
      // First try standard Audio element approach
      return this.attemptStandardPlayback(audioUrl)
          .catch(error => {
              this.errorLog('Standard playback failed:', error);
              this.updateStatus('Trying fallback playback method...');
              return this.attemptFetchAndPlayBlob(audioUrl);
          })
          .catch(error => {
              this.errorLog('Fetch and play blob failed:', error);
              this.updateStatus('Trying Audio Context playback...');
              return this.attemptAudioContextPlayback(audioUrl);
          })
          .catch(error => {
              this.errorLog('All playback methods failed:', error);
              this.updateStatus('Audio playback failed. Please check your sound settings.');
              throw new Error('Audio playback failed after multiple attempts');
          });
  }
  
  /**
   * Attempt playback using standard Audio element
   */
  attemptStandardPlayback(audioUrl) {
      this.playbackAttempts++;
      this.debugLog(`Standard playback attempt ${this.playbackAttempts}/${this.maxPlaybackAttempts}:`, audioUrl);
      
      return new Promise((resolve, reject) => {
          try {
              // First check if the file exists and is accessible
              fetch(audioUrl, { method: 'HEAD' })
                  .then(response => {
                      if (!response.ok) {
                          throw new Error(`Audio file not accessible: ${response.status}`);
                      }
                      this.debugLog('Audio file exists and is accessible');
                      
                      // Create and set up Audio element
                      const audio = new Audio(audioUrl);
                      
                      // Force volume to be high enough
                      audio.volume = Math.max(0.7, this.volume);
                      this.debugLog('Created Audio element with volume:', audio.volume);
                      
                      // Comprehensive event handlers for debugging
                      audio.onloadstart = () => this.debugLog('Audio load started');
                      audio.oncanplay = () => this.debugLog('Audio can play, duration:', audio.duration);
                      
                      audio.onplay = () => {
                          this.debugLog('Audio playback started');
                          this.isPlaying = true;
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(true);
                          }
                      };
                      
                      audio.onended = () => {
                          this.debugLog('Audio playback completed');
                          this.isPlaying = false;
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(false);
                          }
                          this.updateStatus('Playback complete');
                          resolve();
                      };
                      
                      audio.onerror = (e) => {
                          this.errorLog('Audio playback error:', e);
                          this.errorLog('Error code:', audio.error ? audio.error.code : 'unknown');
                          this.errorLog('Error message:', audio.error ? audio.error.message : 'unknown');
                          
                          this.isPlaying = false;
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(false);
                          }
                          
                          reject(new Error(`Audio playback error: ${audio.error?.message || 'unknown error'}`));
                      };
                      
                      // Store reference to control playback
                      this.currentAudio = audio;
                      
                      // Try to play and handle potential errors
                      return audio.play();
                  })
                  .then(() => {
                      this.debugLog('Audio playback initiated successfully');
                  })
                  .catch(error => {
                      this.errorLog('Audio element error:', error);
                      
                      // Handle autoplay policy errors
                      if (error.name === 'NotAllowedError') {
                          this.debugLog('Autoplay blocked. Adding play button...');
                          
                          // Add a visible button for user interaction
                          this.createUserInteractionButton(() => {
                              if (this.currentAudio) {
                                  this.currentAudio.play()
                                      .then(() => {
                                          this.debugLog('Play successful after user interaction');
                                      })
                                      .catch(err => {
                                          this.errorLog('Still failed after user interaction:', err);
                                          reject(err);
                                      });
                              }
                          });
                      } else {
                          reject(error);
                      }
                  });
          } catch (error) {
              this.errorLog('Error in standard playback:', error);
              reject(error);
          }
      });
  }
  
  /**
   * Attempt playback using fetch to get blob and object URL
   */
  attemptFetchAndPlayBlob(audioUrl) {
      this.playbackAttempts++;
      this.debugLog(`Fetch and play blob attempt ${this.playbackAttempts}/${this.maxPlaybackAttempts}:`, audioUrl);
      
      return new Promise((resolve, reject) => {
          try {
              fetch(audioUrl)
                  .then(response => {
                      if (!response.ok) {
                          throw new Error(`Failed to fetch audio: ${response.status}`);
                      }
                      return response.blob();
                  })
                  .then(blob => {
                      this.debugLog(`Blob received: ${blob.size} bytes, type: ${blob.type}`);
                      
                      // Create object URL from blob
                      const objectUrl = URL.createObjectURL(blob);
                      this.debugLog('Created object URL:', objectUrl);
                      
                      // Create and set up Audio element
                      const audio = new Audio(objectUrl);
                      audio.volume = 1.0; // Maximum volume for this attempt
                      
                      audio.oncanplay = () => this.debugLog('Blob audio can play, duration:', audio.duration);
                      
                      audio.onplay = () => {
                          this.debugLog('Blob audio playback started');
                          this.isPlaying = true;
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(true);
                          }
                      };
                      
                      audio.onended = () => {
                          this.debugLog('Blob audio playback completed');
                          URL.revokeObjectURL(objectUrl);
                          this.isPlaying = false;
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(false);
                          }
                          resolve();
                      };
                      
                      audio.onerror = (e) => {
                          this.errorLog('Blob audio error:', e);
                          URL.revokeObjectURL(objectUrl);
                          this.isPlaying = false;
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(false);
                          }
                          reject(new Error(`Blob audio error: ${audio.error?.message || 'unknown'}`));
                      };
                      
                      // Store reference
                      this.currentAudio = audio;
                      
                      // Try to play
                      return audio.play();
                  })
                  .catch(error => {
                      this.errorLog('Fetch and play blob error:', error);
                      
                      // Handle autoplay policy errors
                      if (error.name === 'NotAllowedError') {
                          this.debugLog('Autoplay blocked for blob audio. Adding play button...');
                          
                          // Add a visible button for user interaction
                          this.createUserInteractionButton(() => {
                              if (this.currentAudio) {
                                  this.currentAudio.play()
                                      .then(() => {
                                          this.debugLog('Blob play successful after user interaction');
                                      })
                                      .catch(err => {
                                          this.errorLog('Blob still failed after user interaction:', err);
                                          reject(err);
                                      });
                              }
                          });
                      } else {
                          reject(error);
                      }
                  });
          } catch (error) {
              this.errorLog('Error in fetch and play blob approach:', error);
              reject(error);
          }
      });
  }
  
  /**
   * Attempt playback using Web Audio API directly
   */
  attemptAudioContextPlayback(audioUrl) {
      this.playbackAttempts++;
      this.debugLog(`Audio Context playback attempt ${this.playbackAttempts}/${this.maxPlaybackAttempts}:`, audioUrl);
      
      return new Promise((resolve, reject) => {
          try {
              // Make sure audio context is resumed
              this.ensureAudioContext()
                  .then(() => {
                      return fetch(audioUrl);
                  })
                  .then(response => {
                      if (!response.ok) {
                          throw new Error(`Failed to fetch audio for context: ${response.status}`);
                      }
                      return response.arrayBuffer();
                  })
                  .then(arrayBuffer => {
                      this.debugLog(`Array buffer received: ${arrayBuffer.byteLength} bytes`);
                      // Decode the audio data
                      return this.audioContext.decodeAudioData(arrayBuffer);
                  })
                  .then(audioBuffer => {
                      this.debugLog(`Audio decoded, duration: ${audioBuffer.duration} seconds`);
                      
                      // Create a buffer source
                      const source = this.audioContext.createBufferSource();
                      source.buffer = audioBuffer;
                      
                      // Create a gain node for volume control
                      const gainNode = this.audioContext.createGain();
                      gainNode.gain.value = Math.max(0.8, this.volume); // Ensure volume is high enough
                      
                      // Connect nodes
                      source.connect(gainNode);
                      gainNode.connect(this.audioContext.destination);
                      
                      // Set up completion handler
                      source.onended = () => {
                          this.debugLog('Audio context playback completed');
                          this.isPlaying = false;
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(false);
                          }
                          this.updateStatus('Playback complete');
                          resolve();
                      };
                      
                      // Start playback
                      this.debugLog('Starting Audio Context playback');
                      source.start(0);
                      this.isPlaying = true;
                      
                      // Start animation if available
                      if (typeof window.animateActiveWaveform === 'function') {
                          window.animateActiveWaveform(true);
                      }
                  })
                  .catch(error => {
                      this.errorLog('Audio Context playback error:', error);
                      reject(error);
                  });
          } catch (error) {
              this.errorLog('Error in Audio Context playback approach:', error);
              reject(error);
          }
      });
  }
  
  /**
   * Create a button for user interaction to bypass autoplay restrictions
   */
  createUserInteractionButton(clickCallback) {
      // Remove any existing buttons first
      const existingButton = document.getElementById('audio-interaction-button');
      if (existingButton) {
          existingButton.remove();
      }
      
      // Create a styled button
      const button = document.createElement('button');
      button.id = 'audio-interaction-button';
      button.textContent = 'Click to enable audio';
      
      // Style the button
      Object.assign(button.style, {
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: '9999',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #D8B5FF, #A9EEE6)',
          color: '#12151a',
          border: 'none',
          borderRadius: '5px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer',
          fontFamily: 'var(--text-font), Arial, sans-serif',
          fontWeight: 'bold',
          animation: 'pulse 2s infinite'
      });
      
      // Add pulse animation
      const style = document.createElement('style');
      style.textContent = `
          @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
          }
      `;
      document.head.appendChild(style);
      
      // Add click handler
      button.onclick = () => {
          // Resume audio context
          if (this.audioContext && this.audioContext.state === 'suspended') {
              this.audioContext.resume()
                  .then(() => this.debugLog('Audio context resumed by button click'));
          }
          
          // Call the provided callback
          if (typeof clickCallback === 'function') {
              clickCallback();
          }
          
          // Remove the button
          button.remove();
      };
      
      // Add to document
      document.body.appendChild(button);
      this.debugLog('User interaction button created');
  }
  
  /**
   * Stops current audio playback
   */
  stopPlayback() {
      if (this.currentAudio && this.isPlaying) {
          this.debugLog('Stopping current audio playback');
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
          this.currentAudio = null;
          this.isPlaying = false;
          
          // Stop animation if available
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
      this.debugLog('Processing proposal:', proposalText.substring(0, 50) + (proposalText.length > 50 ? '...' : ''));
      
      try {
          const response = await fetch('/api/proposal/evaluate', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ proposal: proposalText })
          });
          
          this.debugLog(`Proposal API response status: ${response.status}`);
          
          if (!response.ok) {
              throw new Error(`Proposal API error: ${response.status}`);
          }
          
          const data = await response.json();
          this.debugLog('Proposal API response received');
          
          if (data.success && data.result && data.result.response) {
              const aiResponse = data.result.response;
              this.debugLog('AI response received:', aiResponse.substring(0, 50) + (aiResponse.length > 50 ? '...' : ''));
              
              // Type text in the response area if function exists
              if (typeof window.typeText === 'function') {
                  const responseText = document.getElementById('response-text');
                  if (responseText) {
                      window.typeText(responseText, aiResponse);
                  }
              }
              
              // Add to conversation feed if function exists
              if (typeof window.addAikiraMessageToConversation === 'function') {
                  window.addAikiraMessageToConversation(aiResponse);
              }
              
              // Update metrics if function exists
              if (data.result.scores && typeof window.updateMetrics === 'function') {
                  window.updateMetrics(
                      Math.round(data.result.scores.fairness * 100),
                      Math.round(data.result.scores.value * 100),
                      Math.round(data.result.scores.protection * 100),
                      Math.round(data.result.consensusIndex * 100)
                  );
              }
              
              // Generate and play speech response
              try {
                  this.debugLog('Generating speech for AI response');
                  const audioUrl = await this.generateSpeech(aiResponse);
                  this.debugLog('Speech generated successfully, playing audio from:', audioUrl);
                  await this.playAudio(audioUrl);
              } catch (speechError) {
                  this.errorLog('Speech generation or playback failed:', speechError);
                  this.updateStatus(`Note: Voice response failed - ${speechError.message}`);
              }
              
              this.updateStatus('Ready for input');
              return aiResponse;
          } else {
              throw new Error(data.error || 'Invalid API response');
          }
      } catch (error) {
          this.errorLog('Proposal processing error:', error);
          this.updateStatus(`Error: ${error.message}`);
          throw error;
      }
  }
  
  /**
   * Plays a sound effect from a file with error handling
   */
  playSoundEffect(soundPath, volume = null) {
      try {
          this.debugLog('Playing sound effect:', soundPath);
          const audio = new Audio(soundPath);
          
          // Set volume, fallback to global volume if not specified
          audio.volume = volume !== null ? volume : this.volume;
          
          // Add error handler
          audio.onerror = (e) => {
              this.errorLog('Sound effect error:', e);
              this.errorLog('Error code:', audio.error ? audio.error.code : 'unknown');
          };
          
          // Play with error handling
          audio.play().catch(error => {
              this.errorLog(`Error playing sound effect: ${error.message}`);
              
              // If autoplay is blocked, ignore - sound effects aren't critical
              if (error.name !== 'NotAllowedError') {
                  this.debugLog('Non-critical sound effect playback error');
              }
          });
      } catch (error) {
          this.errorLog(`Error loading sound effect: ${error.message}`);
      }
  }
}

// Create global instance on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const audioProcessor = new AudioProcessor();
  
  // Set up status callback
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
  
  // Set up global functions for compatibility with existing code
  window.initAudio = () => audioProcessor.ensureAudioContext();
  window.setVolume = (level) => audioProcessor.setVolume(level);
  window.playAudio = (url) => audioProcessor.playAudio(url);
  window.startVoiceRecording = () => audioProcessor.startRecording();
  window.stopVoiceRecording = () => audioProcessor.stopRecording();
  window.transcribeAudio = (blob) => audioProcessor.transcribeAudio(blob);
  window.generateSpeech = (text, options) => audioProcessor.generateSpeech(text, options);
  window.processProposal = (text) => audioProcessor.processProposal(text);
  
  // Set up voice button functionality with improved reliability
  const voiceButton = document.getElementById('voice-input-btn');
  if (voiceButton) {
      voiceButton.addEventListener('click', async function() {
          try {
              const isActive = voiceButton.classList.contains('active');
              
              if (isActive) {
                  // User clicked to stop recording
                  audioProcessor.debugLog('Stopping voice recording via button');
                  voiceButton.classList.remove('active');
                  
                  try {
                      const audioBlob = await audioProcessor.stopRecording();
                      
                      if (audioBlob) {
                          try {
                              // Transcribe audio
                              const transcribedText = await audioProcessor.transcribeAudio(audioBlob);
                              
                              if (transcribedText && transcribedText.trim() !== '') {
                                  // Update input field if it exists
                                  const terminalInput = document.getElementById('terminal-input');
                                  if (terminalInput) {
                                      terminalInput.value = transcribedText;
                                  }
                                  
                                  // Add to conversation if function exists
                                  if (typeof window.addUserMessageToConversation === 'function') {
                                      window.addUserMessageToConversation(transcribedText);
                                  }
                                  
                                  // Process the transcribed text
                                  await audioProcessor.processProposal(transcribedText);
                              } else {
                                  audioProcessor.updateStatus('No speech detected. Please try again.');
                              }
                          } catch (processError) {
                              audioProcessor.errorLog('Voice processing error:', processError);
                              audioProcessor.updateStatus(`Error: ${processError.message}`);
                          }
                      } else {
                          audioProcessor.updateStatus('No audio recorded. Please try again.');
                      }
                  } catch (stopError) {
                      audioProcessor.errorLog('Error stopping recording:', stopError);
                      audioProcessor.updateStatus(`Error: ${stopError.message}`);
                  }
              } else {
                  // User clicked to start recording
                  audioProcessor.debugLog('Starting voice recording via button');
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
                                  audioProcessor.debugLog('Auto-stopping recording after timeout');
                                  voiceButton.click(); // Trigger the stop recording action
                              }
                          }, 5000);
                      } catch (startError) {
                          audioProcessor.errorLog('Error starting recording:', startError);
                          voiceButton.classList.remove('active');
                          audioProcessor.updateStatus(`Microphone error: ${startError.message}`);
                      }
                  }, 100);
              }
          } catch (error) {
              audioProcessor.errorLog('Voice button error:', error);
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
                  // Add to conversation if function exists
                  if (typeof window.addUserMessageToConversation === 'function') {
                      window.addUserMessageToConversation(text);
                  }
                  
                  // Process the proposal
                  await audioProcessor.processProposal(text);
              } catch (error) {
                  audioProcessor.errorLog('Proposal submission error:', error);
                  audioProcessor.updateStatus(`Error: ${error.message}`);
              }
          }
      });
  }
  
  // Play startup sound when audio is enabled
  const enableAudioBtn = document.getElementById('enable-audio-btn');
  if (enableAudioBtn) {
      enableAudioBtn.addEventListener('click', function() {
          // Make sure audio context is initialized
          audioProcessor.ensureAudioContext()
              .then(() => {
                  // Play startup sound
                  audioProcessor.playSoundEffect('assets/audio/startup.wav', 0.7);
                  audioProcessor.debugLog('Startup sound triggered');
              })
              .catch(error => {
                  audioProcessor.errorLog('Error initializing audio for startup sound:', error);
              });
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
      
      // Initialize with current volume
      volumeSlider.value = audioProcessor.volume * 100;
      if (volumeValue) {
          volumeValue.textContent = `Volume: ${Math.round(audioProcessor.volume * 100)}%`;
      }
  }
  
  // Add a diagnostic function to the window object
  window.testAikiraAudio = async (text = "This is a test of the Aikira audio system.") => {
      try {
          audioProcessor.debugLog('Running audio diagnostic test');
          audioProcessor.updateStatus('Running audio test...');
          
          // Ensure audio context is initialized and resumed
          await audioProcessor.ensureAudioContext();
          audioProcessor.debugLog('Audio context state:', audioProcessor.audioContext.state);
          
          // Check volume settings
          audioProcessor.debugLog('Current volume:', audioProcessor.volume);
          audioProcessor.debugLog('Gain node value:', audioProcessor.gainNode.gain.value);
          
          // Generate test speech
          const audioUrl = await audioProcessor.generateSpeech(text);
          audioProcessor.debugLog('Test speech generated, URL:', audioUrl);
          
          // Create interactive button for best results
          audioProcessor.createUserInteractionButton(() => {
              audioProcessor.playAudio(audioUrl)
                  .then(() => {
                      audioProcessor.debugLog('Test playback completed successfully');
                      audioProcessor.updateStatus('Audio test completed successfully');
                  })
                  .catch(error => {
                      audioProcessor.errorLog('Test playback failed:', error);
                      audioProcessor.updateStatus(`Audio test failed: ${error.message}`);
                  });
          });
          
          return 'Audio test initiated. Click the button that appears to play test audio.';
      } catch (error) {
          audioProcessor.errorLog('Audio test error:', error);
          audioProcessor.updateStatus(`Audio test error: ${error.message}`);
          return `Audio test error: ${error.message}`;
      }
  };
  
  audioProcessor.debugLog('AudioProcessor initialized and global functions set up');
});