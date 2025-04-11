/**
 * Aikira Terminal - Audio Controller
 * Provides centralized audio control for voice playback and sound effects
 */

class AudioController {
    constructor() {
        // Audio context
        this.audioContext = null;
        
        // Volume settings
        this.volume = 0.8; // Default 80%
        this.isMuted = false;
        this.lastVolume = 0.8;
        
        // DOM elements
        this.volumeBtn = null;
        this.volumeSlider = null;
        this.volumeValue = null;
        
        // Audio playback
        this.currentAudio = null;
        this.audioSources = {};
        
        // Flag to track initialization
        this.initialized = false;
        
        // Sound visualization
        this.analyzer = null;
        this.visualizationData = null;
        
        // Debug mode
        this.debug = true;
        
        // Initialize
        this.init();
    }
    
    init() {
        this.log('Initializing AudioController');
        
        // Create overlay for audio initialization
        this.createAudioInitOverlay();
        
        // Create volume controls
        this.createVolumeControl();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load saved volume from localStorage
        this.loadSavedVolume();
        
        // Add animation styles
        this.addAnimationStyles();
        
        // Preload critical audio files
        this.preloadAudioFiles([
            'assets/audio/startup.wav',
            'assets/audio/deliberation.wav',
            'assets/audio/proposal-submit.wav',
            'assets/audio/governance-alert.wav'
        ]);
        
        // Mark as initialized
        this.initialized = true;
        
        this.log('AudioController initialized');
    }
    
    log(message) {
        if (this.debug) {
            console.log(`[AudioController] ${message}`);
            
            // Also log to debug panel if available
            const debugPanel = document.getElementById('debug-panel');
            if (debugPanel) {
                const entry = document.createElement('div');
                entry.textContent = `[Audio] ${message}`;
                debugPanel.appendChild(entry);
                debugPanel.scrollTop = debugPanel.scrollHeight;
                
                // Limit entries
                if (debugPanel.children.length > 20) {
                    debugPanel.removeChild(debugPanel.firstChild);
                }
            }
        }
    }
    
    createAudioInitOverlay() {
        this.log('Creating audio initialization overlay');
        
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
        
        // Create container
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        container.style.padding = '30px';
        container.style.backgroundColor = 'var(--medium-bg)';
        container.style.borderRadius = '15px';
        container.style.border = '1px solid var(--trans-light)';
        container.style.boxShadow = '0 0 30px rgba(216, 181, 255, 0.3)';
        container.style.maxWidth = '400px';
        container.style.width = '80%';
        container.style.animation = 'fadeIn 0.5s ease-out forwards';
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = 'Enable Aikira Voice';
        title.style.color = 'var(--soft-pink)';
        title.style.marginBottom = '20px';
        title.style.fontFamily = 'var(--display-font)';
        
        // Create message
        const message = document.createElement('p');
        message.textContent = 'Browser security requires user interaction before playing audio. Click the button below to enable Aikira\'s voice.';
        message.style.color = 'var(--soft-white)';
        message.style.marginBottom = '25px';
        message.style.lineHeight = '1.5';
        
        // Create button
        const button = document.createElement('button');
        button.id = 'enable-audio-btn';
        button.textContent = 'Enable Audio';
        button.style.background = 'linear-gradient(135deg, var(--accent-purple), var(--accent-turquoise))';
        button.style.border = 'none';
        button.style.borderRadius = '10px';
        button.style.color = 'var(--soft-white)';
        button.style.padding = '12px 25px';
        button.style.fontFamily = 'var(--display-font)';
        button.style.fontSize = '16px';
        button.style.cursor = 'pointer';
        button.style.transition = 'all 0.3s ease';
        button.style.marginBottom = '15px';
        button.style.letterSpacing = '1px';
        
        // Create secondary text
        const secondary = document.createElement('p');
        secondary.textContent = 'You must enable audio to hear Aikira\'s voice responses';
        secondary.style.color = 'var(--lavender-purple)';
        secondary.style.fontSize = '14px';
        secondary.style.opacity = '0.8';
        
        // Assemble container
        container.appendChild(title);
        container.appendChild(message);
        container.appendChild(button);
        container.appendChild(secondary);
        
        overlay.appendChild(container);
        document.body.appendChild(overlay);
    }
    
    createVolumeControl() {
        // Create container
        const control = document.createElement('div');
        control.id = 'aikira-volume-control';
        control.style.position = 'fixed';
        control.style.bottom = '20px';
        control.style.right = '20px';
        control.style.backgroundColor = 'var(--medium-bg)';
        control.style.borderRadius = '10px';
        control.style.padding = '10px 15px';
        control.style.display = 'flex';
        control.style.alignItems = 'center';
        control.style.gap = '10px';
        control.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.3)';
        control.style.border = '1px solid var(--trans-light)';
        control.style.zIndex = '100';
        
        // Volume icon
        const icon = document.createElement('div');
        icon.id = 'volume-icon';
        icon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 5L5 9H1V15H5L10 19V5Z" stroke="var(--soft-white)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19.07 4.93C20.9447 6.80528 21.9979 9.34836 21.9979 12C21.9979 14.6516 20.9447 17.1947 19.07 19.07M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="var(--soft-white)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        // Volume slider
        const slider = document.createElement('input');
        slider.id = 'volume-slider';
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = Math.round(this.volume * 100);
        slider.style.width = '80px';
        slider.style.height = '4px';
        slider.style.appearance = 'none';
        slider.style.backgroundColor = 'var(--trans-light)';
        slider.style.borderRadius = '2px';
        slider.style.outline = 'none';
        
        // Volume value
        const value = document.createElement('span');
        value.id = 'volume-value';
        value.textContent = `${Math.round(this.volume * 100)}%`;
        value.style.color = 'var(--soft-white)';
        value.style.fontSize = '12px';
        value.style.minWidth = '35px';
        value.style.textAlign = 'right';
        
        // Mute button
        const muteBtn = document.createElement('button');
        muteBtn.id = 'mute-button';
        muteBtn.style.background = 'none';
        muteBtn.style.border = 'none';
        muteBtn.style.cursor = 'pointer';
        muteBtn.style.display = 'flex';
        muteBtn.style.alignItems = 'center';
        muteBtn.style.justifyContent = 'center';
        muteBtn.style.padding = '5px';
        muteBtn.style.borderRadius = '5px';
        muteBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="24" height="24" fill="none" stroke="none" />
                <path d="M22 9.5L12 3L2 9.5V21.5H22V9.5Z" stroke="var(--soft-white)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9 21.5V12.5H15V21.5" stroke="var(--soft-white)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        // Add elements to container
        control.appendChild(icon);
        control.appendChild(slider);
        control.appendChild(value);
        control.appendChild(muteBtn);
        
        // Initially hide the control
        control.style.display = 'none';
        
        // Add to page
        document.body.appendChild(control);
        
        // Store references
        this.volumeBtn = muteBtn;
        this.volumeSlider = slider;
        this.volumeValue = value;
    }
    
    setupEventListeners() {
        // Audio initialization
        const enableBtn = document.getElementById('enable-audio-btn');
        if (enableBtn) {
            enableBtn.addEventListener('click', this.initializeAudio.bind(this));
        }
        
        // Volume slider
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', this.handleVolumeChange.bind(this));
        }
        
        // Mute button
        if (this.volumeBtn) {
            this.volumeBtn.addEventListener('click', this.toggleMute.bind(this));
        }
    }
    
    initializeAudio() {
        this.log('Initializing audio...');
        
        try {
            // Create audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Resume audio context
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Hide overlay
            const overlay = document.getElementById('audio-init-overlay');
            if (overlay) {
                overlay.style.animation = 'fadeOut 0.5s forwards';
                setTimeout(() => {
                    overlay.remove();
                }, 500);
            }
            
            // Show volume control
            const volumeControl = document.getElementById('aikira-volume-control');
            if (volumeControl) {
                volumeControl.style.display = 'flex';
            }
            
            // Play startup sound
            this.playAudio('assets/audio/startup.wav');
            
            // Create global audio processor
            this.createAudioProcessor();
            
            this.log('Audio initialized successfully');
        } catch (error) {
            console.error('Audio initialization error:', error);
        }
    }
    
    showInitOverlay() {
        const overlay = document.getElementById('audio-init-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        } else {
            this.createAudioInitOverlay();
        }
    }
    
    createAudioProcessor() {
        // Create audio processor if not already available
        if (!window.audioProcessor && this.audioContext) {
            this.log('Creating audio processor...');
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = this.volume;
            gainNode.connect(this.audioContext.destination);
            
            // Create analyzer node for visualizations
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.connect(gainNode);
            
            // Store analyzer
            this.analyzer = analyser;
            this.visualizationData = new Uint8Array(analyser.frequencyBinCount);
            
            // Create basic audio processor object
            window.audioProcessor = {
                audioContext: this.audioContext,
                gainNode: gainNode,
                analyser: analyser,
                
                // Set volume method
                setVolume: (volume) => {
                    gainNode.gain.value = volume;
                },
                
                // Play audio method
                playAudio: async (src) => {
                    try {
                        const response = await fetch(src);
                        const arrayBuffer = await response.arrayBuffer();
                        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                        
                        // Create source
                        const source = this.audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(analyser);
                        source.start(0);
                        
                        return source;
                    } catch (error) {
                        console.error('Error playing audio:', error);
                        return null;
                    }
                },
                
                // Get visualization data
                getVisualizationData: () => {
                    analyser.getByteFrequencyData(this.visualizationData);
                    return this.visualizationData;
                }
            };
            
            this.log('Audio processor created successfully');
        }
    }
    
    handleVolumeChange() {
        const volume = this.volumeSlider.value / 100;
        
        // Update display
        this.volumeValue.textContent = `${this.volumeSlider.value}%`;
        
        // Update volume
        this.setVolume(volume);
        
        // Check mute state
        if (volume === 0 && !this.isMuted) {
            this.isMuted = true;
            this.updateMuteButtonStyle();
        } else if (volume > 0 && this.isMuted) {
            this.isMuted = false;
            this.updateMuteButtonStyle();
        }
        
        // Store non-zero volume
        if (volume > 0) {
            this.lastVolume = volume;
        }
        
        this.log(`Volume changed to ${volume}`);
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            // Store current volume
            if (parseFloat(this.volumeSlider.value) > 0) {
                this.lastVolume = parseFloat(this.volumeSlider.value) / 100;
            }
            
            // Set volume to 0
            this.volumeSlider.value = 0;
            this.volumeValue.textContent = '0%';
            this.setVolume(0);
        } else {
            // Restore previous volume
            const restoredValue = Math.round(this.lastVolume * 100);
            this.volumeSlider.value = restoredValue;
            this.volumeValue.textContent = `${restoredValue}%`;
            this.setVolume(this.lastVolume);
        }
        
        // Update button style
        this.updateMuteButtonStyle();
        
        this.log(`Audio ${this.isMuted ? 'muted' : 'unmuted'}`);
    }
    
    updateMuteButtonStyle() {
        if (!this.volumeBtn) return;
        
        if (this.isMuted) {
            this.volumeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3L2 9.5V21.5H22V9.5L12 3Z" fill="none" stroke="var(--accent-pink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="4" y1="20" x2="20" y2="4" stroke="var(--accent-pink)" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;
        } else {
            this.volumeBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="24" height="24" fill="none" stroke="none" />
                    <path d="M22 9.5L12 3L2 9.5V21.5H22V9.5Z" stroke="var(--soft-white)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 21.5V12.5H15V21.5" stroke="var(--soft-white)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        }
    }
    
    setVolume(volume) {
        // Update volume property
        this.volume = volume;
        
        // Update audio processor if available
        if (window.audioProcessor && window.audioProcessor.setVolume) {
            window.audioProcessor.setVolume(volume);
        }
        
        // Update all HTML audio elements
        const audioElements = document.querySelectorAll('audio');
        audioElements.forEach(audio => {
            audio.volume = volume;
        });
        
        // Update volume for current audio
        if (this.currentAudio) {
            this.currentAudio.volume = volume;
        }
        
        // Save to localStorage
        localStorage.setItem('aikiraVolume', volume);
    }
    
    loadSavedVolume() {
        // Load volume from localStorage
        const savedVolume = localStorage.getItem('aikiraVolume');
        if (savedVolume !== null) {
            const volume = parseFloat(savedVolume);
            this.volume = volume;
            
            // Update controls if available
            if (this.volumeSlider && this.volumeValue) {
                this.volumeSlider.value = Math.round(volume * 100);
                this.volumeValue.textContent = `${Math.round(volume * 100)}%`;
            }
        }
    }
    
    preloadAudioFiles(files) {
        this.log(`Preloading ${files.length} audio files`);
        
        files.forEach(file => {
            // Use fetch to preload and cache
            fetch(file)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to preload ${file}: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    this.log(`Preloaded: ${file}`);
                    
                    // If audio context is available, decode
                    if (this.audioContext) {
                        return this.audioContext.decodeAudioData(arrayBuffer);
                    }
                })
                .then(audioBuffer => {
                    if (audioBuffer) {
                        // Cache decoded buffer
                        this.audioSources[file] = audioBuffer;
                    }
                })
                .catch(error => {
                    this.log(`Error preloading ${file}: ${error.message}`);
                });
        });
    }
    
    playAudio(src) {
        this.log(`Playing audio: ${src}`);
        
        try {
            // Check if audio context is available and active
            if (this.audioContext && this.audioContext.state === 'running') {
                // Use audio processor if available
                if (window.audioProcessor && window.audioProcessor.playAudio) {
                    window.audioProcessor.playAudio(src)
                        .then(source => {
                            if (source) {
                                this.log(`Audio playing via processor: ${src}`);
                            }
                        })
                        .catch(error => {
                            this.log(`Error playing via processor: ${error.message}`);
                            this.fallbackPlayAudio(src);
                        });
                    return;
                }
                
                // Check if we have the decoded audio buffer cached
                if (this.audioSources[src]) {
                    const source = this.audioContext.createBufferSource();
                    source.buffer = this.audioSources[src];
                    
                    // Connect to analyzer if available
                    if (this.analyzer) {
                        source.connect(this.analyzer);
                    } else {
                        const gain = this.audioContext.createGain();
                        gain.gain.value = this.volume;
                        source.connect(gain);
                        gain.connect(this.audioContext.destination);
                    }
                    
                    source.start(0);
                    this.log(`Audio playing from cache: ${src}`);
                    return;
                }
                
                // Fetch and play
                fetch(src)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch audio: ${response.status}`);
                        }
                        return response.arrayBuffer();
                    })
                    .then(arrayBuffer => this.audioContext.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        const source = this.audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        
                        // Connect to analyzer if available
                        if (this.analyzer) {
                            source.connect(this.analyzer);
                        } else {
                            const gain = this.audioContext.createGain();
                            gain.gain.value = this.volume;
                            source.connect(gain);
                            gain.connect(this.audioContext.destination);
                        }
                        
                        // Cache for future use
                        this.audioSources[src] = audioBuffer;
                        
                        source.start(0);
                        this.log(`Audio playing via Web Audio API: ${src}`);
                    })
                    .catch(error => {
                        this.log(`Error playing via Web Audio API: ${error.message}`);
                        this.fallbackPlayAudio(src);
                    });
            } else {
                // Audio context not available, use fallback
                this.fallbackPlayAudio(src);
            }
        } catch (error) {
            this.log(`Exception in playAudio: ${error.message}`);
            this.fallbackPlayAudio(src);
        }
    }
    
    fallbackPlayAudio(src) {
        this.log(`Using fallback audio playback for: ${src}`);
        
        try {
            // Create or reuse audio element
            const audio = new Audio();
            
            // Set volume
            audio.volume = this.volume;
            
            // Set source
            audio.src = src;
            
            // Add event listeners for debugging
            audio.onplay = () => this.log(`Audio started playing: ${src}`);
            audio.onended = () => this.log(`Audio finished: ${src}`);
            audio.onerror = (e) => {
                this.log(`Audio error (${e.type}): ${audio.error ? audio.error.message : 'Unknown error'}`);
                
                // Show overlay if needed
                if (e.type === 'error' && audio.error && audio.error.code === 35) {
                    // This is likely due to autoplay restrictions
                    this.showInitOverlay();
                }
            };
            
            // Store reference
            this.currentAudio = audio;
            
            // Play with error handling
            audio.play()
                .then(() => this.log(`Audio playing via HTML5 Audio: ${src}`))
                .catch(error => {
                    this.log(`HTML5 Audio play error: ${error.message}`);
                    
                    // Check if this is an autoplay restriction
                    if (error.name === 'NotAllowedError') {
                        this.showInitOverlay();
                    }
                });
        } catch (error) {
            this.log(`Fallback audio exception: ${error.message}`);
        }
    }
    
    addAnimationStyles() {
        // Add keyframe animations if they don't exist
        if (!document.getElementById('audio-controller-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'audio-controller-styles';
            
            styleElement.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes slideInFromRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOutToRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                
                /* Style overrides for better appearance */
                #volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--accent-purple);
                    cursor: pointer;
                }
                
                #volume-slider::-moz-range-thumb {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--accent-purple);
                    cursor: pointer;
                    border: none;
                }
                
                #mute-button:hover {
                    background-color: var(--trans-light);
                }
            `;
            
            document.head.appendChild(styleElement);
        }
    }
}

// Initialize controller on page load
document.addEventListener('DOMContentLoaded', () => {
    window.audioController = new AudioController();
});