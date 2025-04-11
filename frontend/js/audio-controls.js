/**
 * Enhanced Speech Module for Aikira Terminal
 * This module simplifies the speech generation and playback process
 * 
 * To use: Replace the content of frontend/js/audio-controls.js with this file
 * or create a new file and import it in your HTML
 */

// Initialize Audio Context on page load
let audioContext;
let gainNode;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initAudio();
});

// Initialize audio on first user interaction
document.addEventListener('click', function initOnInteraction() {
    initAudio();
    // Remove this listener after first interaction
    document.removeEventListener('click', initOnInteraction);
}, { once: true });

// Initialize audio context and gain node
function initAudio() {
    // Only initialize once
    if (audioContext) return;

    try {
        // Create audio context
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // Create gain node for volume control
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        
        // Resume if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('Audio context resumed successfully');
            });
        }
        
        console.log('Audio initialized successfully');
        
        // Update status display if it exists
        const statusElement = document.getElementById('input-status');
        if (statusElement) {
            statusElement.textContent = 'Audio initialized';
        }
        
        // Play a short silent sound to ensure audio is working
        playTestSound();
    } catch (error) {
        console.error('Audio initialization error:', error);
    }
}

// Play a short test sound to verify audio is working
function playTestSound() {
    if (!audioContext) return;
    
    try {
        // Create a short silent oscillator to ensure audio is working
        const oscillator = audioContext.createOscillator();
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0.01; // Nearly silent
        
        oscillator.connect(silentGain);
        silentGain.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        
        console.log('Test sound played successfully');
    } catch (error) {
        console.error('Test sound error:', error);
    }
}

// Generate speech via the Eleven Labs API
async function generateSpeech(text) {
    console.log('Generating speech for text');
    
    // Update status
    const statusElement = document.getElementById('input-status');
    if (statusElement) {
        statusElement.textContent = 'Generating speech...';
    }
    
    try {
        // Make the API request to our backend
        const response = await fetch('/api/speech/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                voice_id: "default",
                model_id: "eleven_multilingual_v2"
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.audio_url) {
            console.log('Speech generated successfully');
            
            // Start visualization if available
            if (typeof animateActiveWaveform === 'function') {
                animateActiveWaveform(true);
            }
            
            // Play the generated speech
            await playGeneratedSpeech(data.audio_url);
            
            // Update status
            if (statusElement) {
                statusElement.textContent = 'Ready for input';
            }
            
            return true;
        } else {
            throw new Error(data.error || 'Speech generation failed');
        }
    } catch (error) {
        console.error('Speech generation error:', error);
        
        if (statusElement) {
            statusElement.textContent = `Speech error: ${error.message}`;
        }
        
        // Play error sound
        playAudio('assets/audio/governance-alert.wav');
        return false;
    }
}

// Play the generated speech
async function playGeneratedSpeech(audioUrl) {
    console.log('Playing generated speech');
    
    try {
        // Create an audio element
        const audio = new Audio(audioUrl);
        
        // Set volume
        audio.volume = getVolume();
        
        // Update status display
        const statusElement = document.getElementById('input-status');
        if (statusElement) {
            statusElement.textContent = 'Speaking...';
        }
        
        // Event handlers
        audio.onended = () => {
            console.log('Speech playback completed');
            
            if (statusElement) {
                statusElement.textContent = 'Ready for input';
            }
            
            // Stop visualization if available
            if (typeof animateActiveWaveform === 'function') {
                animateActiveWaveform(false);
            }
        };
        
        audio.onerror = (e) => {
            console.error('Speech playback error:', e);
            
            if (statusElement) {
                statusElement.textContent = 'Playback error';
            }
            
            // Stop visualization if available
            if (typeof animateActiveWaveform === 'function') {
                animateActiveWaveform(false);
            }
        };
        
        // Try to play the audio
        try {
            await audio.play();
            console.log('Audio playback started');
        } catch (playError) {
            console.error('Playback error:', playError);
            
            // Check if this is due to autoplay restrictions
            if (playError.name === 'NotAllowedError') {
                console.log('Autoplay prevented - attempting to resume audio context');
                
                // Try to resume audio context
                if (audioContext && audioContext.state === 'suspended') {
                    await audioContext.resume();
                    console.log('Audio context resumed, trying playback again');
                    await audio.play();
                } else {
                    if (statusElement) {
                        statusElement.textContent = 'Click anywhere to enable audio';
                    }
                    
                    // Try once more after user interaction
                    const clickHandler = async () => {
                        try {
                            await audio.play();
                            document.removeEventListener('click', clickHandler);
                        } catch (err) {
                            console.error('Play after click failed:', err);
                        }
                    };
                    
                    document.addEventListener('click', clickHandler, { once: true });
                }
            }
        }
    } catch (error) {
        console.error('Error playing speech:', error);
    }
}

// Play any audio file - for notification sounds
function playAudio(src) {
    console.log('Playing audio file');
    
    try {
        const audio = new Audio(src);
        audio.volume = getVolume();
        audio.play().catch(error => {
            console.error('Error playing audio:', error);
        });
    } catch (error) {
        console.error('Audio play error:', error);
    }
}

// Helper function to get current volume setting
function getVolume() {
    // Check for volume slider
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        return volumeSlider.value / 100;
    }
    
    // Default volume if no slider (80%)
    return 0.8;
}

// Set volume level
function setVolume(level) {
    // Ensure level is between 0 and 1
    const volumeLevel = Math.max(0, Math.min(1, level));
    
    // Update gain node
    if (gainNode) {
        gainNode.gain.value = volumeLevel;
    }
    
    // Update volume slider if it exists
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.value = volumeLevel * 100;
    }
    
    console.log('Volume set to:', volumeLevel);
}

// Process proposal with OpenAI and speak the response
async function processProposal(proposalText) {
    console.log('Processing proposal');
    
    // Update status
    const statusElement = document.getElementById('input-status');
    if (statusElement) {
        statusElement.textContent = 'Processing proposal...';
    }
    
    // Clear input field
    const proposalInput = document.getElementById('proposal-text');
    if (proposalInput) {
        proposalInput.value = '';
    }
    
    try {
        // Call proposal evaluation API
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
        
        if (data.success && data.result && data.result.response) {
            console.log('Received response from OpenAI');
            
            // Type out the response
            const responseText = document.getElementById('response-text');
            if (responseText) {
                typeText(responseText, data.result.response);
            }
            
            // Update metrics with return values
            if (data.result.scores) {
                updateMetrics(
                    Math.round(data.result.scores.fairness * 100),
                    Math.round(data.result.scores.value * 100),
                    Math.round(data.result.scores.protection * 100),
                    Math.round(data.result.consensusIndex * 100)
                );
            }
            
            // Generate and play speech - this is the key part
            await generateSpeech(data.result.response);
            
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error('Proposal processing error:', error);
        
        if (statusElement) {
            statusElement.textContent = `Error: ${error.message}`;
        }
        
        // Show error in response area
        const responseText = document.getElementById('response-text');
        if (responseText) {
            responseText.textContent = `I encountered an error processing your proposal. Please try again. Error: ${error.message}`;
        }
        
        // Play error sound
        playAudio('assets/audio/governance-alert.wav');
    }
}

// Type text with typewriter effect
function typeText(element, text, speed = 30) {
    if (!element) return;
    
    // Clear element text
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

// Update UI metrics (implemented elsewhere but included for completeness)
function updateMetrics(fairness, value, protection, consensus) {
    console.log(`Updating metrics - F:${fairness}, V:${value}, P:${protection}, C:${consensus}`);
    
    // Update metrics bars if they exist
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
    
    // Update consensus value
    const consensusValue = document.querySelector('.consensus-value');
    if (consensusValue) {
        consensusValue.textContent = `${consensus}%`;
    }
    
    // Update status bar value
    const consensusStatusValue = document.querySelector('#consensus-index .status-value');
    if (consensusStatusValue) {
        consensusStatusValue.textContent = `${consensus}%`;
    }
    
    // Update triangle visualization if that function exists
    if (typeof updateConsensusTriangle === 'function') {
        updateConsensusTriangle(consensus / 100);
    }
}

// Export the key functions
window.generateSpeech = generateSpeech;
window.playAudio = playAudio;
window.setVolume = setVolume;
window.processProposal = processProposal;
window.initAudio = initAudio;