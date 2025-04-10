/**
 * Aikira Terminal - Animations
 * Handles dynamic animations and visual effects for the interface
 */

class AnimationController {
    constructor() {
        // Store animation instances
        this.animations = {};
        
        // Track running animations
        this.runningAnimations = new Set();
        
        // DOM elements
        this.terminalContainer = document.querySelector('.terminal-container');
        this.hexagonalDisplay = document.querySelector('.hexagonal-display');
        this.responseArea = document.querySelector('.response-area');
        
        // Animation settings
        this.settings = {
            particleDensity: 30,
            dataFlowSpeed: 3,
            glowIntensity: 0.8,
            animationsEnabled: true
        };
        
        // Initialize animations
        this.init();
    }
    
    init() {
        // Set up GSAP if available
        if (window.gsap) {
            this.setupGsapAnimations();
        }
        
        // Create data particles
        this.createDataParticles();
        
        // Create data flow lines
        this.createDataFlowLines();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize startup sequence
        this.playStartupSequence();
    }
    
    setupEventListeners() {
        // Track mouse for interactive effects
        if (this.terminalContainer) {
            this.terminalContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
        }
        
        // Listen for proposal submission
        const submitBtn = document.getElementById('submit-proposal');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.playSubmitAnimation();
            });
        }
        
        // Listen for voice input
        const voiceBtn = document.getElementById('voice-input-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                if (voiceBtn.classList.contains('active')) {
                    this.playVoiceActiveAnimation();
                } else {
                    this.stopVoiceActiveAnimation();
                }
            });
        }
    }
    
    setupGsapAnimations() {
        // Register GSAP plugins if available
        if (gsap.registerPlugin) {
            // Could register specific plugins here if needed
        }
        
        // Set defaults
        gsap.defaults({
            ease: 'power2.inOut',
            duration: 0.8
        });
    }
    
    /**
     * Plays the terminal startup sequence
     */
    playStartupSequence() {
        if (!this.settings.animationsEnabled) return;
        
        // Create startup timeline if GSAP is available
        if (window.gsap && this.hexagonalDisplay) {
            const startup = gsap.timeline();
            
            // Initial fade in
            startup.fromTo(this.hexagonalDisplay, 
                { opacity: 0, scale: 0.9 }, 
                { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' }
            );
            
            // Glow pulse effect
            startup.to(this.hexagonalDisplay, {
                boxShadow: '0 0 30px rgba(216, 181, 255, 0.5)',
                duration: 0.8,
                repeat: 1,
                yoyo: true
            }, '-=0.3');
            
            // Start data particle animation
            this.startAnimation('dataParticles');
            
            // Start data flow animation
            this.startAnimation('dataFlow');
            
            // Store for possible cleanup
            this.animations.startup = startup;
        } else {
            // Fallback for no GSAP
            if (this.hexagonalDisplay) {
                this.hexagonalDisplay.classList.add('fade-in');
            }
        }
    }
    
    /**
     * Plays animation when submitting a proposal
     */
    playSubmitAnimation() {
        if (!this.settings.animationsEnabled) return;
        
        // Create particles around submit button
        this.createSubmitParticles();
        
        // Add pulse effect to hexagonal display
        if (this.hexagonalDisplay) {
            this.hexagonalDisplay.classList.add('pulse');
            
            // Remove class after animation completes
            setTimeout(() => {
                this.hexagonalDisplay.classList.remove('pulse');
            }, 1000);
        }
        
        // Create slight shake effect for processing
        if (window.gsap && this.responseArea) {
            gsap.to(this.responseArea, {
                x: 2,
                duration: 0.1,
                repeat: 5,
                yoyo: true,
                ease: 'none',
                onComplete: () => {
                    gsap.set(this.responseArea, { x: 0 });
                }
            });
        }
    }
    
    /**
     * Creates particles when submitting a proposal
     */
    createSubmitParticles() {
        const submitBtn = document.getElementById('submit-proposal');
        if (!submitBtn || !this.terminalContainer) return;
        
        // Get button position
        const rect = submitBtn.getBoundingClientRect();
        const containerRect = this.terminalContainer.getBoundingClientRect();
        
        // Create particles
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.classList.add('data-particle');
            
            // Position relative to button
            const x = rect.left - containerRect.left + rect.width / 2;
            const y = rect.top - containerRect.top + rect.height / 2;
            
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            
            // Random direction and speed
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const duration = 1 + Math.random() * 1.5;
            
            // Add to container
            this.terminalContainer.appendChild(particle);
            
            // Animate with GSAP if available
            if (window.gsap) {
                gsap.to(particle, {
                    x: Math.cos(angle) * 100 * speed,
                    y: Math.sin(angle) * 100 * speed,
                    opacity: 0,
                    scale: 0,
                    duration: duration,
                    ease: 'power2.out',
                    onComplete: () => {
                        particle.remove();
                    }
                });
            } else {
                // Fallback animation
                setTimeout(() => {
                    particle.remove();
                }, duration * 1000);
            }
        }
    }
    
    /**
     * Plays animation for active voice input
     */
    playVoiceActiveAnimation() {
        if (!this.settings.animationsEnabled) return;
        
        const voiceBtn = document.getElementById('voice-input-btn');
        if (!voiceBtn) return;
        
        // Start pulsing animation
        if (window.gsap) {
            this.animations.voicePulse = gsap.to(voiceBtn, {
                boxShadow: '0 0 15px rgba(255, 158, 229, 0.7)',
                scale: 1.05,
                duration: 0.8,
                repeat: -1,
                yoyo: true
            });
            
            // Track this animation
            this.runningAnimations.add('voicePulse');
        } else {
            // Fallback
            voiceBtn.classList.add('pulse');
        }
        
        // Add voice-active data particles
        this.createVoiceParticles();
    }
    
    /**
     * Stops voice active animation
     */
    stopVoiceActiveAnimation() {
        const voiceBtn = document.getElementById('voice-input-btn');
        if (!voiceBtn) return;
        
        // Stop GSAP animation if running
        if (this.animations.voicePulse) {
            this.animations.voicePulse.kill();
            this.runningAnimations.delete('voicePulse');
            
            // Reset styles
            gsap.set(voiceBtn, {
                boxShadow: '',
                scale: 1
            });
        }
        
        // Remove fallback class
        voiceBtn.classList.remove('pulse');
        
        // Stop voice particles
        this.stopAnimation('voiceParticles');
    }
    
    /**
     * Creates voice-activated particles
     */
    createVoiceParticles() {
        if (!this.terminalContainer) return;
        
        // Clear any existing voice particles
        this.stopAnimation('voiceParticles');
        
        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.classList.add('voice-particles-container');
        particleContainer.style.position = 'absolute';
        particleContainer.style.top = '0';
        particleContainer.style.left = '0';
        particleContainer.style.width = '100%';
        particleContainer.style.height = '100%';
        particleContainer.style.pointerEvents = 'none';
        particleContainer.style.zIndex = '5';
        
        this.terminalContainer.appendChild(particleContainer);
        
        // Store container
        this.voiceParticlesContainer = particleContainer;
        
        // Create and animate particles
        const createParticle = () => {
            if (!this.runningAnimations.has('voiceParticles')) return;
            
            const particle = document.createElement('div');
            particle.classList.add('voice-particle');
            
            // Style particle
            particle.style.position = 'absolute';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = 'var(--soft-pink)';
            particle.style.opacity = '0.8';
            
            // Random position at bottom
            const x = Math.random() * this.terminalContainer.offsetWidth;
            particle.style.left = `${x}px`;
            particle.style.bottom = '0';
            
            // Add to container
            particleContainer.appendChild(particle);
            
            // Animate with GSAP
            if (window.gsap) {
                gsap.to(particle, {
                    y: -100 - Math.random() * 100,
                    x: (Math.random() - 0.5) * 50,
                    opacity: 0,
                    duration: 1 + Math.random() * 2,
                    ease: 'power1.out',
                    onComplete: () => {
                        particle.remove();
                    }
                });
            } else {
                // Fallback
                setTimeout(() => {
                    particle.remove();
                }, 2000);
            }
            
            // Continue creating particles
            setTimeout(createParticle, 100 + Math.random() * 200);
        };
        
        // Start creating particles
        this.runningAnimations.add('voiceParticles');
        createParticle();
    }
    
    /**
     * Creates background data particles
     */
    createDataParticles() {
        if (!this.terminalContainer) return;
        
        // Create particle container if it doesn't exist
        if (!this.particlesContainer) {
            const container = document.createElement('div');
            container.classList.add('data-particles-container');
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.pointerEvents = 'none';
            container.style.zIndex = '1';
            
            this.terminalContainer.appendChild(container);
            this.particlesContainer = container;
        }
        
        // Create initial particles
        for (let i = 0; i < this.settings.particleDensity; i++) {
            this.createDataParticle();
        }
    }
    
    /**
     * Creates a single data particle
     */
    createDataParticle() {
        if (!this.particlesContainer) return;
        
        const particle = document.createElement('div');
        particle.classList.add('data-particle');
        
        // Style particle
        particle.style.position = 'absolute';
        particle.style.width = '2px';
        particle.style.height = '2px';
        particle.style.borderRadius = '50%';
        
        // Random color
        const colors = [
            'var(--soft-pink)',
            'var(--lavender-purple)',
            'var(--pastel-turquoise)'
        ];
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Random opacity
        particle.style.opacity = 0.2 + Math.random() * 0.5;
        
        // Add to container
        this.particlesContainer.appendChild(particle);
        
        // Animate with GSAP if available
        if (window.gsap) {
            // Float animation
            gsap.to(particle, {
                y: '-=20',
                x: (Math.random() - 0.5) * 30,
                duration: 3 + Math.random() * 5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
            
            // Pulse opacity
            gsap.to(particle, {
                opacity: 0.1 + Math.random() * 0.3,
                duration: 2 + Math.random() * 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });
        }
        
        return particle;
    }
    
    /**
     * Creates data flow lines
     */
    createDataFlowLines() {
        if (!this.terminalContainer) return;
        
        // Create flow lines container if it doesn't exist
        if (!this.flowLinesContainer) {
            const container = document.createElement('div');
            container.classList.add('data-flow-lines-container');
            container.style.position = 'absolute';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.pointerEvents = 'none';
            container.style.zIndex = '0';
            
            this.terminalContainer.appendChild(container);
            this.flowLinesContainer = container;
        }
        
        // Create horizontal flow lines
        for (let i = 0; i < 5; i++) {
            const line = document.createElement('div');
            line.classList.add('data-flow-line');
            
            // Style line
            line.style.position = 'absolute';
            line.style.height = '1px';
            line.style.width = '100%';
            line.style.left = '0';
            line.style.top = `${10 + Math.random() * 80}%`;
            
            // Random color
            const colors = [
                'var(--accent-pink)',
                'var(--accent-purple)',
                'var(--accent-turquoise)'
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            line.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
            line.style.opacity = 0.2 + Math.random() * 0.3;
            
            // Add to container
            this.flowLinesContainer.appendChild(line);
            
            // Animate with GSAP if available
            if (window.gsap) {
                gsap.fromTo(line,
                    { x: -this.terminalContainer.offsetWidth },
                    {
                        x: this.terminalContainer.offsetWidth,
                        duration: 10 + Math.random() * 10,
                        repeat: -1,
                        ease: 'none'
                    }
                );
            }
        }
        
        // Create vertical flow lines
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            line.classList.add('data-flow-vertical');
            
            // Style line
            line.style.position = 'absolute';
            line.style.width = '1px';
            line.style.height = '100%';
            line.style.top = '0';
            line.style.left = `${10 + Math.random() * 80}%`;
            
            // Random color
            const colors = [
                'var(--accent-pink)',
                'var(--accent-purple)',
                'var(--accent-turquoise)'
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            line.style.background = `linear-gradient(transparent, ${color}, transparent)`;
            line.style.opacity = 0.2 + Math.random() * 0.3;
            
            // Add to container
            this.flowLinesContainer.appendChild(line);
            
            // Animate with GSAP if available
            if (window.gsap) {
                gsap.fromTo(line,
                    { y: -this.terminalContainer.offsetHeight },
                    {
                        y: this.terminalContainer.offsetHeight,
                        duration: 15 + Math.random() * 10,
                        repeat: -1,
                        ease: 'none'
                    }
                );
            }
        }
    }
    
    /**
     * Handles mouse movement for interactive effects
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        if (!this.settings.animationsEnabled || !this.terminalContainer) return;
        
        // Calculate relative position
        const rect = this.terminalContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Create interactive glow effect
        if (this.hexagonalDisplay) {
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate distance from center (normalized)
            const distX = (x - centerX) / (rect.width / 2);
            const distY = (y - centerY) / (rect.height / 2);
            
            // Create glow effect that follows mouse
            if (window.gsap) {
                gsap.to(this.hexagonalDisplay, {
                    boxShadow: `${distX * 20}px ${distY * 20}px 30px rgba(216, 181, 255, 0.3)`,
                    duration: 1
                });
            }
        }
        
        // Occasionally create a new particle near the cursor
        if (Math.random() > 0.9 && this.particlesContainer) {
            const particle = this.createDataParticle();
            if (particle) {
                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;
                particle.style.opacity = '0.8';
            }
        }
    }
    
    /**
     * Creates a digital glitch effect
     * @param {number} duration - Effect duration in ms
     * @param {HTMLElement} target - Target element (defaults to terminal container)
     */
    createGlitchEffect(duration = 1000, target = null) {
        if (!this.settings.animationsEnabled) return;
        
        const element = target || this.terminalContainer;
        if (!element) return;
        
        // Add glitch class
        element.classList.add('glitch-effect');
        
        // Create glitch overlay
        const glitchOverlay = document.createElement('div');
        glitchOverlay.classList.add('glitch-overlay');
        glitchOverlay.style.position = 'absolute';
        glitchOverlay.style.top = '0';
        glitchOverlay.style.left = '0';
        glitchOverlay.style.right = '0';
        glitchOverlay.style.bottom = '0';
        glitchOverlay.style.pointerEvents = 'none';
        glitchOverlay.style.zIndex = '100';
        
        element.appendChild(glitchOverlay);
        
        // Create glitch elements
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                if (!glitchOverlay.isConnected) return;
                
                // Create horizontal glitch line
                const glitchLine = document.createElement('div');
                glitchLine.style.position = 'absolute';
                glitchLine.style.height = `${1 + Math.random() * 2}px`;
                glitchLine.style.width = `${50 + Math.random() * 50}%`;
                glitchLine.style.top = `${Math.random() * 100}%`;
                glitchLine.style.left = `${Math.random() * 50}%`;
                glitchLine.style.backgroundColor = 'rgba(216, 181, 255, 0.8)';
                glitchLine.style.transform = 'skewY(30deg)';
                
                glitchOverlay.appendChild(glitchLine);
                
                // Remove after short time
                setTimeout(() => {
                    glitchLine.remove();
                }, 50 + Math.random() * 150);
                
            }, Math.random() * duration);
        }
        
        // Create color shift effect with GSAP
        if (window.gsap) {
            const colorShift = gsap.timeline();
            
            colorShift.to(element, {
                filter: 'hue-rotate(20deg) brightness(1.1)',
                duration: 0.1,
                repeat: 3,
                yoyo: true
            });
            
            colorShift.to(element, {
                filter: 'hue-rotate(-20deg) brightness(0.9)',
                duration: 0.1,
                repeat: 2,
                yoyo: true
            });
            
            colorShift.to(element, {
                filter: 'none',
                duration: 0.1
            });
        }
        
        // Remove overlay and class after duration
        setTimeout(() => {
            glitchOverlay.remove();
            element.classList.remove('glitch-effect');
        }, duration);
    }
    
    /**
     * Plays the loading animation
     * @param {HTMLElement} target - Target element
     * @returns {Object} Control object with stop method
     */
    playLoadingAnimation(target) {
        if (!target || !this.settings.animationsEnabled) return { stop: () => {} };
        
        // Create loading container
        const loadingContainer = document.createElement('div');
        loadingContainer.classList.add('aikira-loader');
        loadingContainer.style.display = 'flex';
        loadingContainer.style.alignItems = 'center';
        loadingContainer.style.justifyContent = 'center';
        loadingContainer.style.width = '100%';
        loadingContainer.style.height = '100%';
        
        // Create loading spinner
        const spinner = document.createElement('div');
        spinner.classList.add('loading-spinner');
        spinner.style.width = '40px';
        spinner.style.height = '40px';
        spinner.style.borderRadius = '50%';
        spinner.style.border = '3px solid var(--trans-light)';
        spinner.style.borderTop = '3px solid var(--accent-purple)';
        spinner.style.animation = 'rotate 1s linear infinite';
        
        // Create loading text
        const loadingText = document.createElement('div');
        loadingText.classList.add('loading-text');
        loadingText.style.position = 'absolute';
        loadingText.style.top = 'calc(50% + 30px)';
        loadingText.style.fontSize = '14px';
        loadingText.style.color = 'var(--soft-white)';
        loadingText.textContent = 'Processing...';
        
        // Add elements to container
        loadingContainer.appendChild(spinner);
        loadingContainer.appendChild(loadingText);
        
        // Add to target
        target.appendChild(loadingContainer);
        
        // Create animation for text with GSAP
        let textAnimation;
        if (window.gsap) {
            textAnimation = gsap.to(loadingText, {
                opacity: 0.5,
                duration: 1,
                repeat: -1,
                yoyo: true
            });
        }
        
        // Return control object
        return {
            stop: () => {
                if (textAnimation) {
                    textAnimation.kill();
                }
                
                // Fade out with GSAP
                if (window.gsap) {
                    gsap.to(loadingContainer, {
                        opacity: 0,
                        duration: 0.3,
                        onComplete: () => {
                            loadingContainer.remove();
                        }
                    });
                } else {
                    loadingContainer.remove();
                }
            },
            
            updateText: (text) => {
                loadingText.textContent = text;
            }
        };
    }
    
    /**
     * Plays success animation
     * @param {HTMLElement} target - Target element
     */
    playSuccessAnimation(target) {
        if (!target || !this.settings.animationsEnabled) return;
        
        // Create success effect
        const successOverlay = document.createElement('div');
        successOverlay.style.position = 'absolute';
        successOverlay.style.top = '0';
        successOverlay.style.left = '0';
        successOverlay.style.right = '0';
        successOverlay.style.bottom = '0';
        successOverlay.style.backgroundColor = 'rgba(169, 238, 230, 0.1)';
        successOverlay.style.pointerEvents = 'none';
        successOverlay.style.zIndex = '10';
        
        target.appendChild(successOverlay);
        
        // Create success particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = '5px';
            particle.style.height = '5px';
            particle.style.backgroundColor = 'var(--accent-turquoise)';
            particle.style.borderRadius = '50%';
            
            // Position in center
            particle.style.top = '50%';
            particle.style.left = '50%';
            
            successOverlay.appendChild(particle);
            
            // Animate with GSAP
            if (window.gsap) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 100;
                
                gsap.to(particle, {
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    opacity: 0,
                    duration: 1 + Math.random(),
                    ease: 'power2.out'
                });
            }
        }
        
        // Fade in and out overlay
        if (window.gsap) {
            gsap.fromTo(successOverlay, 
                { opacity: 0 },
                { 
                    opacity: 1, 
                    duration: 0.3,
                    onComplete: () => {
                        gsap.to(successOverlay, {
                            opacity: 0,
                            duration: 0.5,
                            delay: 0.7,
                            onComplete: () => {
                                successOverlay.remove();
                            }
                        });
                    }
                }
            );
        } else {
            // Fallback
            setTimeout(() => {
                successOverlay.remove();
            }, 1500);
        }
    }
    
    /**
     * Starts a named animation
     * @param {string} animationName - Name of animation to start
     */
    startAnimation(animationName) {
        // Check if animation is already running
        if (this.runningAnimations.has(animationName)) return;
        
        // Add to running set
        this.runningAnimations.add(animationName);
        
        // Start appropriate animation
        switch (animationName) {
            case 'dataParticles':
                // Already created in init, nothing to do
                break;
                
            case 'dataFlow':
                // Already created in init, nothing to do
                break;
                
            case 'voiceParticles':
                this.createVoiceParticles();
                break;
                
            default:
                console.warn(`Unknown animation: ${animationName}`);
        }
    }
    
    /**
     * Stops a named animation
     * @param {string} animationName - Name of animation to stop
     */
    stopAnimation(animationName) {
        // Remove from running set
        this.runningAnimations.delete(animationName);
        
        // Cleanup specific animation
        switch (animationName) {
            case 'voiceParticles':
                if (this.voiceParticlesContainer) {
                    this.voiceParticlesContainer.remove();
                    this.voiceParticlesContainer = null;
                }
                break;
                
            case 'dataParticles':
                // Keep particles active
                break;
                
            case 'dataFlow':
                // Keep data flow active
                break;
                
            default:
                console.warn(`Unknown animation: ${animationName}`);
        }
        
        // Kill any GSAP animations
        if (this.animations[animationName]) {
            if (typeof this.animations[animationName].kill === 'function') {
                this.animations[animationName].kill();
            }
            delete this.animations[animationName];
        }
    }
    
    /**
     * Sets animation settings
     * @param {Object} settings - New settings
     */
    updateSettings(settings) {
        this.settings = {
            ...this.settings,
            ...settings
        };
        
        // Apply settings
        if (!this.settings.animationsEnabled) {
            this.stopAllAnimations();
        }
    }
    
    /**
     * Stops all running animations
     */
    stopAllAnimations() {
        // Stop all named animations
        [...this.runningAnimations].forEach(name => {
            this.stopAnimation(name);
        });
        
        // Clear running set
        this.runningAnimations.clear();
        
        // Kill all GSAP animations if available
        if (window.gsap && gsap.killAll) {
            gsap.killAll();
        }
    }
    
    /**
     * Cleans up animation resources
     */
    dispose() {
        // Stop all animations
        this.stopAllAnimations();
        
        // Remove event listeners
        if (this.terminalContainer) {
            this.terminalContainer.removeEventListener('mousemove', this.handleMouseMove);
        }
        
        // Remove containers
        if (this.particlesContainer) {
            this.particlesContainer.remove();
        }
        
        if (this.flowLinesContainer) {
            this.flowLinesContainer.remove();
        }
        
        if (this.voiceParticlesContainer) {
            this.voiceParticlesContainer.remove();
        }
    }
}

// Initialize animation controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.animationController = new AnimationController();
});