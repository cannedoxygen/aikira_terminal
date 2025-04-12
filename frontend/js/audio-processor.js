/**
 * Aikira Terminal - Audio Processor
 * Unified audio handling functionality for voice interactions
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
       * Check if an audio file exists before trying to play it
       */
      async checkAudioFile(url) {
          try {
              const response = await fetch(url, { method: 'HEAD' });
              
              if (!response.ok) {
                  console.error(`Audio file not found or not accessible: ${url}`);
                  return false;
              }
              
              // Check content type
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('audio')) {
                  console.log(`Audio file verified: ${url} (${contentType})`);
                  return true;
              } else {
                  console.warn(`File exists but may not be audio: ${url} (${contentType || 'unknown type'})`);
                  return true; // Still try to play it
              }
          } catch (error) {
              console.error(`Error checking audio file: ${error.message}`);
              return false;
          }
      }
      
      /**
       * Create a user-friendly message when audio is blocked
       */
      createAudioEnableMessage() {
          // Check if message already exists
          if (document.getElementById('audio-enable-message')) {
              return;
          }
          
          // Create message container
          const messageContainer = document.createElement('div');
          messageContainer.id = 'audio-enable-message';
          messageContainer.style.position = 'fixed';
          messageContainer.style.top = '20px';
          messageContainer.style.left = '50%';
          messageContainer.style.transform = 'translateX(-50%)';
          messageContainer.style.backgroundColor = 'rgba(28, 32, 41, 0.9)';
          messageContainer.style.color = '#FFD6EC';
          messageContainer.style.padding = '15px 20px';
          messageContainer.style.borderRadius = '8px';
          messageContainer.style.boxShadow = '0 0 15px rgba(216, 181, 255, 0.5)';
          messageContainer.style.zIndex = '10000';
          messageContainer.style.textAlign = 'center';
          messageContainer.style.maxWidth = '80%';
          messageContainer.style.animation = 'fadeIn 0.3s ease-out';
          
          // Add message text
          messageContainer.innerHTML = `
              <div style="font-weight: bold; margin-bottom: 10px;">Audio Playback Blocked</div>
              <div>Click anywhere on the page to enable Aikira's voice</div>
          `;
          
          // Add to document
          document.body.appendChild(messageContainer);
          
          // Auto-remove after 10 seconds
          setTimeout(() => {
              if (messageContainer.parentNode) {
                  messageContainer.style.animation = 'fadeOut 0.3s ease-in';
                  setTimeout(() => {
                      if (messageContainer.parentNode) {
                          messageContainer.parentNode.removeChild(messageContainer);
                      }
                  }, 300);
              }
          }, 10000);
          
          // Add necessary CSS animations if not already present
          if (!document.getElementById('audio-message-styles')) {
              const styleEl = document.createElement('style');
              styleEl.id = 'audio-message-styles';
              styleEl.textContent = `
                  @keyframes fadeIn {
                      from { opacity: 0; transform: translate(-50%, -20px); }
                      to { opacity: 1; transform: translate(-50%, 0); }
                  }
                  @keyframes fadeOut {
                      from { opacity: 1; transform: translate(-50%, 0); }
                      to { opacity: 0; transform: translate(-50%, -20px); }
                  }
              `;
              document.head.appendChild(styleEl);
          }
      }
      
      /**
       * Plays audio from a URL with improved error handling
       */
      async playAudio(audioUrl) {
          try {
              console.log(`PlayAudio: Starting playback of ${audioUrl}`);
              
              // Make sure audio context is ready
              await this.ensureAudioContext();
              console.log("PlayAudio: Audio context ready:", this.audioContext.state);
              
              // Stop any existing playback
              if (this.isPlaying && this.currentAudio) {
                  console.log("PlayAudio: Stopping previous audio");
                  this.currentAudio.pause();
                  this.currentAudio = null;
              }
              
              this.updateStatus('Playing audio...');
              
              // Create a new audio element with robust error handling
              return new Promise((resolve, reject) => {
                  try {
                      const audio = new Audio();
                      
                      // Set up all event handlers before setting src
                      audio.oncanplay = () => {
                          console.log("PlayAudio: Audio can play now");
                      };
                      
                      audio.onloadstart = () => {
                          console.log("PlayAudio: Started loading audio");
                      };
                      
                      audio.onloadeddata = () => {
                          console.log("PlayAudio: Audio data loaded");
                      };
                      
                      audio.onplay = () => {
                          console.log("PlayAudio: Audio playback started");
                          this.isPlaying = true;
                          
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(true);
                          }
                      };
                      
                      audio.onended = () => {
                          console.log("PlayAudio: Audio playback ended normally");
                          this.isPlaying = false;
                          
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(false);
                          }
                          
                          this.updateStatus('Ready for input');
                          resolve();
                      };
                      
                      audio.onpause = () => {
                          console.log("PlayAudio: Audio playback paused");
                      };
                      
                      audio.onerror = (event) => {
                          const errorCode = audio.error ? audio.error.code : 'unknown';
                          const errorMsg = `Audio error (${errorCode}): ${audio.error ? audio.error.message : 'Unknown error'}`;
                          console.error("PlayAudio:", errorMsg, event);
                          
                          this.isPlaying = false;
                          
                          if (typeof window.animateActiveWaveform === 'function') {
                              window.animateActiveWaveform(false);
                          }
                          
                          reject(new Error(errorMsg));
                      };
                      
                      // Store reference to control playback
                      this.currentAudio = audio;
                      
                      // Set volume from our stored value
                      audio.volume = this.volume || 0.8;
                      console.log(`PlayAudio: Setting volume to ${audio.volume}`);
                      
                      // Only now set the source - this is important for proper event sequencing
                      audio.src = audioUrl;
                      console.log("PlayAudio: Set audio source to", audioUrl);
                      
                      // Start loading the audio
                      audio.load();
                      console.log("PlayAudio: Audio.load() called");
                      
                      // Try to play with robust error handling
                      const playPromise = audio.play();
                      
                      if (playPromise !== undefined) {
                          playPromise
                              .then(() => {
                                  console.log("PlayAudio: Audio.play() promise resolved successfully");
                              })
                              .catch(error => {
                                  console.error("PlayAudio: Audio.play() promise rejected:", error);
                                  
                                  // Handle autoplay policy issues
                                  if (error.name === 'NotAllowedError') {
                                      console.log("PlayAudio: Autoplay blocked. Trying to handle...");
                                      this.updateStatus('Audio blocked. Click to enable.');
                                      
                                      // Create a user-friendly message
                                      this.createAudioEnableMessage();
                                      
                                      // Set up one-time click handler to retry
                                      const clickHandler = async () => {
                                          console.log("PlayAudio: User clicked, trying to play again");
                                          try {
                                              // Resume audio context first
                                              if (this.audioContext) {
                                                  await this.audioContext.resume();
                                                  console.log("PlayAudio: Audio context resumed after click");
                                              }
                                              
                                              // Try playing again
                                              await audio.play();
                                              console.log("PlayAudio: Successfully playing after user interaction");
                                              
                                              // Remove event listener
                                              document.removeEventListener('click', clickHandler);
                                          } catch (retryError) {
                                              console.error("PlayAudio: Still failed after user interaction:", retryError);
                                              reject(retryError);
                                          }
                                      };
                                      
                                      document.addEventListener('click', clickHandler, { once: true });
                                  } else {
                                      this.updateStatus(`Audio error: ${error.message}`);
                                      reject(error);
                                  }
                              });
                      } else {
                          console.log("PlayAudio: Audio.play() didn't return a promise");
                      }
                  } catch (error) {
                      console.error("PlayAudio: Unexpected error setting up audio:", error);
                      reject(error);
                  }
              });
          } catch (error) {
              console.error("PlayAudio: Top-level error:", error);
              this.updateStatus(`Playback error: ${error.message}`);
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
       * Process a written or spoken proposal and generate spoken response
       * with improved error handling
       */
      async processProposal(proposalText) {
          if (!proposalText || !proposalText.trim()) {
              throw new Error('Proposal text is required');
          }
          
          this.updateStatus('Processing proposal...');
          
          try {
              // Step 1: Submit proposal to API
              console.log("Step 1: Sending proposal to API");
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
              
              // Step 2: Process API response
              console.log("Step 2: Processing API response");
              const data = await response.json();
              
              if (!data.success || !data.result || !data.result.response) {
                  throw new Error(data.error || 'Invalid API response');
              }
              
              const aiResponse = data.result.response;
              
              // Step 3: Update UI with response
              console.log("Step 3: Updating UI with response");
              if (typeof window.addAikiraMessageToConversation === 'function') {
                  window.addAikiraMessageToConversation(aiResponse);
              }
              
              // Step 4: Update metrics if available
              console.log("Step 4: Updating metrics");
              if (data.result.scores && typeof window.updateMetrics === 'function') {
                  window.updateMetrics(
                      Math.round(data.result.scores.fairness * 100),
                      Math.round(data.result.scores.value * 100),
                      Math.round(data.result.scores.protection * 100),
                      Math.round(data.result.consensusIndex * 100)
                  );
              }
              
              // Step 5: Generate and play speech - CRITICAL SECTION
              console.log("Step 5: Starting speech generation");
              
              try {
                  // Make sure audio context is initialized first
                  await this.ensureAudioContext();
                  console.log("Audio context initialized:", this.audioContext.state);
                  
                  // Use a try-catch block specifically for speech generation
                  try {
                      console.log("Generating speech for:", aiResponse.substring(0, 50) + "...");
                      const audioUrl = await this.generateSpeech(aiResponse);
                      console.log("Speech generated successfully, URL:", audioUrl);
                      
                      // Verify the audio file exists before trying to play it
                      const audioExists = await this.checkAudioFile(audioUrl);
                      console.log("Audio file exists check:", audioExists);
                      
                      if (audioExists) {
                          try {
                              console.log("Attempting to play audio from URL:", audioUrl);
                              await this.playAudio(audioUrl);
                              console.log("Audio playback completed successfully");
                          } catch (playError) {
                              console.error("Audio playback error:", playError);
                              // Try playing a fallback sound to test audio system
                              try {
                                  console.log("Trying fallback sound");
                                  this.playSoundEffect('assets/audio/startup.wav', 0.8);
                              } catch (fallbackError) {
                                  console.error("Even fallback sound failed:", fallbackError);
                              }
                          }
                      } else {
                          console.error("Audio file does not exist at URL:", audioUrl);
                          this.updateStatus('Audio file not found');
                      }
                  } catch (speechError) {
                      console.error("Speech generation error:", speechError);
                      this.updateStatus(`Speech error: ${speechError.message}`);
                  }
              } catch (audioContextError) {
                  console.error("Audio context error:", audioContextError);
                  this.updateStatus(`Audio system error: ${audioContextError.message}`);
              }
              
              // Step 6: Final status update
              console.log("Step 6: Completing proposal processing");
              this.updateStatus('Ready for input');
              
              return aiResponse;
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
              console.log(`Playing sound effect: ${soundPath}`);
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
      
      // Set up volume button as audio verification button
      const volumeButton = document.getElementById('volume-btn');
      if (volumeButton) {
          volumeButton.addEventListener('click', async function() {
              // First, ensure audio context is initialized and resumed
              try {
                  await audioProcessor.ensureAudioContext();
                  console.log('Audio context initialized and resumed');
                  
                  // Play a verification sound to test audio is working
                  audioProcessor.playSoundEffect('assets/audio/startup.wav', 0.5);
                  
                  // Update status
                  audioProcessor.updateStatus('Audio system verified');
                  
                  // Visual feedback that audio is working
                  volumeButton.style.backgroundColor = 'rgba(169, 238, 230, 0.3)'; // Highlight in turquoise
                  setTimeout(() => {
                      volumeButton.style.backgroundColor = ''; // Reset after 1 second
                  }, 1000);
                  
                  // Show a temporary notification
                  const notification = document.createElement('div');
                  notification.textContent = 'Audio system active';
                  notification.style.position = 'fixed';
                  notification.style.bottom = '80px';
                  notification.style.right = '20px';
                  notification.style.backgroundColor = 'rgba(169, 238, 230, 0.3)';
                  notification.style.color = 'white';
                  notification.style.padding = '10px 15px';
                  notification.style.borderRadius = '8px';
                  notification.style.zIndex = '1000';
                  document.body.appendChild(notification);
                  
                  // Remove the notification after 3 seconds
                  setTimeout(() => {
                      notification.style.opacity = '0';
                      notification.style.transition = 'opacity 0.5s';
                      setTimeout(() => notification.remove(), 500);
                  }, 3000);
                  
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
      
      // Play startup sound when audio is enabled
      const enableAudioBtn = document.getElementById('enable-audio-btn');
      if (enableAudioBtn) {
          enableAudioBtn.addEventListener('click', function() {
              audioProcessor.playSoundEffect('assets/audio/startup.wav');
          });
      }
  });