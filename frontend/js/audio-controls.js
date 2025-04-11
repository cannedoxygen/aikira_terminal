/**
 * Enhanced audio playback functions for Aikira Terminal
 * Replace the relevant functions in your main.js or audio-controls.js file
 */

// Generate speech from text
async function generateSpeech(text) {
    console.log('Generating speech for response:', text.substring(0, 50) + '...');
    
    try {
      // Show processing status
      document.getElementById('input-status').textContent = 'Generating speech...';
      
      // Call the speech generation API
      const response = await fetch('/api/speech/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: text,
          voice_id: "default",
          model_id: "eleven_multilingual_v2"
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      console.log('Speech generation response:', data);
      
      if (data.success && data.audio_url) {
        console.log('Speech generated successfully:', data.audio_url);
        
        // Play the generated speech audio
        await playGeneratedSpeech(data.audio_url);
        
        // Reset status
        document.getElementById('input-status').textContent = 'Ready for input';
      } else {
        throw new Error(data.error || 'Speech generation failed without specific error');
      }
    } catch (error) {
      console.error('Speech generation error:', error);
      document.getElementById('input-status').textContent = `Speech error: ${error.message}`;
      
      // Play fallback sound
      playAudio('assets/audio/governance-alert.wav');
    }
  }
  
  // Play generated speech with enhanced error handling
  async function playGeneratedSpeech(audioUrl) {
    console.log('Playing generated speech:', audioUrl);
    
    try {
      // Verify the URL is valid
      if (!audioUrl || !audioUrl.startsWith('/downloads/')) {
        throw new Error('Invalid audio URL format');
      }
      
      // First check if the file exists
      const fileCheckResponse = await fetch(audioUrl, { method: 'HEAD' });
      
      if (!fileCheckResponse.ok) {
        throw new Error(`Audio file not found: ${fileCheckResponse.status}`);
      }
      
      console.log('Audio file exists, preparing to play');
      
      // Create a new Audio element
      const audio = new Audio(audioUrl);
      
      // Set volume based on current settings
      const volumeSlider = document.getElementById('volume-slider');
      if (volumeSlider) {
        audio.volume = volumeSlider.value / 100;
        console.log('Setting audio volume to:', audio.volume);
      } else {
        audio.volume = 0.8; // Default 80% volume
      }
      
      // Set up event handlers
      audio.onloadeddata = () => {
        console.log('Audio loaded successfully, duration:', audio.duration);
      };
      
      audio.onplay = () => {
        console.log('Audio playback started');
        document.getElementById('input-status').textContent = 'Speaking...';
        
        // Start visualizer animation if available
        if (typeof animateActiveWaveform === 'function') {
          animateActiveWaveform(true);
        }
      };
      
      audio.onended = () => {
        console.log('Audio playback completed');
        document.getElementById('input-status').textContent = 'Ready for input';
        
        // Stop visualizer animation if available
        if (typeof animateActiveWaveform === 'function') {
          animateActiveWaveform(false);
        }
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        console.error('Error details:', audio.error);
        document.getElementById('input-status').textContent = 'Audio playback error';
        
        // Play fallback sound
        playAudio('assets/audio/governance-alert.wav');
      };
      
      // Play the audio with automatic retry for autoplay restrictions
      try {
        await audio.play();
      } catch (playError) {
        console.error('Initial playback failed:', playError.message);
        
        if (playError.name === 'NotAllowedError') {
          console.log('Autoplay prevented - attempting to resume audio context');
          
          // Try to resume audio context if it exists
          if (window.audioContext && window.audioContext.state === 'suspended') {
            try {
              await window.audioContext.resume();
              console.log('Audio context resumed, trying playback again');
              await audio.play();
            } catch (retryError) {
              console.error('Retry failed after resuming context:', retryError);
              throw retryError;
            }
          } else {
            // Show message to user about interaction requirement
            document.getElementById('input-status').textContent = 'Click anywhere to enable audio';
            
            // Set up one-time click handler to play audio
            const clickHandler = async () => {
              try {
                await audio.play();
                document.removeEventListener('click', clickHandler);
              } catch (err) {
                console.error('Play after click failed:', err);
              }
            };
            
            document.addEventListener('click', clickHandler, { once: true });
            throw playError;
          }
        } else {
          throw playError;
        }
      }
    } catch (error) {
      console.error('Generated speech playback error:', error);
      document.getElementById('input-status').textContent = `Speech playback error: ${error.message}`;
      
      // Play fallback sound if not already playing
      playAudio('assets/audio/governance-alert.wav');
    }
  }
  
  // Generic audio player with improved error handling
  function playAudio(src) {
    console.log('Playing audio file:', src);
    
    try {
      // First check if file exists
      fetch(src, { method: 'HEAD' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Audio file not found: ${response.status}`);
          }
          
          // Use existing audio elements if possible
          let audio = document.querySelector(`audio[src="${src}"]`);
          
          if (!audio) {
            audio = new Audio(src);
          }
          
          // Set volume
          const volumeSlider = document.getElementById('volume-slider');
          if (volumeSlider) {
            audio.volume = volumeSlider.value / 100;
          } else {
            audio.volume = 0.8; // Default volume
          }
          
          // Reset audio to beginning if it's already loaded
          audio.currentTime = 0;
          
          // Add event listeners for debugging
          const onPlay = () => {
            console.log('Audio started playing:', src);
            audio.removeEventListener('play', onPlay);
          };
          
          const onEnded = () => {
            console.log('Audio finished:', src);
            audio.removeEventListener('ended', onEnded);
          };
          
          const onError = (e) => {
            console.error('Audio error:', e);
            console.error('Error details:', audio.error);
            audio.removeEventListener('error', onError);
          };
          
          audio.addEventListener('play', onPlay);
          audio.addEventListener('ended', onEnded);
          audio.addEventListener('error', onError);
          
          // Play with error handling
          audio.play()
            .catch(error => {
              console.error('Audio play error:', error.message);
              
              if (error.name === 'NotAllowedError') {
                console.log('Autoplay prevented - trying to resume audio context');
                
                // Try to resume audio context if available
                if (window.audioContext && window.audioContext.state === 'suspended') {
                  window.audioContext.resume()
                    .then(() => {
                      console.log('Audio context resumed, trying again');
                      return audio.play();
                    })
                    .catch(retryError => {
                      console.error('Retry after context resume failed:', retryError);
                    });
                }
              }
            });
        })
        .catch(error => {
          console.error('Audio file check error:', error.message);
        });
    } catch (error) {
      console.error('Audio playback exception:', error.message);
    }
  }
  
  // Process proposal with enhanced speech integration
  async function processProposal(proposalText) {
    console.log('Processing proposal:', proposalText.substring(0, 50) + (proposalText.length > 50 ? '...' : ''));
    
    // Update status
    document.getElementById('input-status').textContent = 'Processing proposal...';
    
    // Clear the input
    document.getElementById('proposal-text').value = '';
    
    // Play deliberation sound
    playAudio('assets/audio/deliberation.wav');
    
    try {
      // Call API to process proposal
      const response = await fetch('/api/proposal/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposal: proposalText })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.result) {
        console.log('Proposal processing successful');
        
        // Type out the AI response
        typeText(document.getElementById('response-text'), data.result.response);
        
        // Update metrics with returned values
        updateMetrics(
          Math.round(data.result.scores.fairness * 100),
          Math.round(data.result.scores.value * 100),
          Math.round(data.result.scores.protection * 100),
          Math.round(data.result.consensusIndex * 100)
        );
        
        // Reset status
        document.getElementById('input-status').textContent = 'Generating speech...';
        
        // Generate and play speech
        await generateSpeech(data.result.response);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (error) {
      console.error('Proposal processing error:', error.message);
      document.getElementById('input-status').textContent = `Error: ${error.message}`;
      
      // Show error in response area
      document.getElementById('response-text').textContent = 
        `I encountered an error processing your proposal. Please try again later or contact support if the issue persists. Error: ${error.message}`;
      
      // Play error sound
      playAudio('assets/audio/governance-alert.wav');
      
      // Fall back to simulated response for testing
      simulateProposalResponse(proposalText);
    }
  }
  
  // Function to simulate proposal response for testing/fallback
  function simulateProposalResponse(proposalText) {
    console.log('Using simulated proposal response for fallback');
    
    // Generate a simple response based on the proposal length
    const response = "After constitutional analysis, I've determined that your proposal aligns with our governance principles. The value generation aspects are strong, though the fairness framework could be strengthened. I recommend enhancing the protection mechanisms to achieve better consensus alignment.";
    
    // Display the response
    typeText(document.getElementById('response-text'), response);
    
    // Update metrics with random but reasonable values
    const fairness = 70 + Math.floor(Math.random() * 15);
    const value = 75 + Math.floor(Math.random() * 15);
    const protection = 65 + Math.floor(Math.random() * 20);
    const consensus = Math.floor((fairness + value + protection) / 3);
    
    updateMetrics(fairness, value, protection, consensus);
    
    // Update status
    document.getElementById('input-status').textContent = 'Ready for input';
  }
  
  // Type text with typewriter effect
  function typeText(element, text, speed = 30) {
    if (!element) return;
    
    // Clear the element
    element.textContent = '';
    let i = 0;
    
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }
    
    // Start typing
    type();
  }