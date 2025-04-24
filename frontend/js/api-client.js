/**
 * Aikira Terminal - API Client
 * Handles communication with backend services including Eleven Labs and Whisper
 */

class ApiClient {
    constructor() {
        // Base URL for API endpoints
        this.baseUrl = window.location.origin; // Same origin as frontend
        
        // Default headers
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        // Request timeout (ms)
        this.timeout = 30000;
        
        // Track pending requests
        this.pendingRequests = {};
    }
    
    /**
     * Handles API requests with timeouts and error management
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise} - Promise resolving to response data
     */
    async request(endpoint, options = {}) {
        const requestId = Date.now().toString();
        const url = `${this.baseUrl}${endpoint}`;
        
        // Apply default headers
        options.headers = {
            ...this.defaultHeaders,
            ...options.headers
        };
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        // Track request
        this.pendingRequests[requestId] = controller;
        
        try {
            // Attempt request
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            // Clean up
            clearTimeout(timeoutId);
            delete this.pendingRequests[requestId];
            
            // Check response status
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(
                    errorData?.message || 
                    `Request failed with status ${response.status}`
                );
            }
            
            // Parse response
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else if (contentType && contentType.includes('audio/')) {
                return await response.blob();
            } else {
                return await response.text();
            }
            
        } catch (error) {
            // Clean up
            clearTimeout(timeoutId);
            delete this.pendingRequests[requestId];
            
            // Handle specific errors
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            
            throw error;
        }
    }
    
    /**
     * Cancels all pending requests
     */
    cancelAllRequests() {
        Object.values(this.pendingRequests).forEach(controller => {
            try {
                controller.abort();
            } catch (error) {
                console.error('Error aborting request:', error);
            }
        });
        
        this.pendingRequests = {};
    }
    
    /**
     * Transcribes audio using Whisper API
     * @param {Blob} audioBlob - Audio data to transcribe
     * @returns {Promise} - Promise resolving to transcription data
     */
    async transcribeAudio(audioBlob) {
        // Create FormData to send audio file
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        
        try {
            return await this.request('/api/speech/transcribe', {
                method: 'POST',
                headers: {
                    // Remove default Content-Type for FormData
                    'Content-Type': undefined
                },
                body: formData
            });
        } catch (error) {
            console.error('Transcription error:', error);
            throw new Error(`Failed to transcribe audio: ${error.message}`);
        }
    }
    
    /**
     * Generates speech using Eleven Labs API
     * @param {string} text - Text to convert to speech
     * @param {Object} options - Speech generation options
     * @returns {Promise} - Promise resolving to audio blob
     */
    async generateSpeech(text, options = {}) {
        // Build payload: include only text and any provided overrides
        const payload = { text, ...options };
        try {
            return await this.request('/api/speech/generate', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Speech generation error:', error);
            throw new Error(`Failed to generate speech: ${error.message}`);
        }
    }
    
    /**
     * Submits a proposal for evaluation
     * @param {string} proposalText - Proposal text
     * @returns {Promise} - Promise resolving to evaluation data
     */
    async submitProposal(proposalText) {
        try {
            return await this.request('/api/proposal/evaluate', {
                method: 'POST',
                body: JSON.stringify({
                    proposal: proposalText
                })
            });
        } catch (error) {
            console.error('Proposal submission error:', error);
            throw new Error(`Failed to submit proposal: ${error.message}`);
        }
    }
    
    /**
     * Plays generated speech audio
     * @param {Blob} audioBlob - Audio blob to play
     * @returns {Promise} - Promise resolving when audio playback ends
     */
    async playAudio(audioBlob) {
        return new Promise((resolve, reject) => {
            try {
                // Create audio element
                const audio = new Audio();
                
                // Create object URL for blob
                const audioUrl = URL.createObjectURL(audioBlob);
                audio.src = audioUrl;
                
                // Setup event handlers
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                
                audio.onerror = (error) => {
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error(`Audio playback error: ${error}`));
                };
                
                // Play audio
                audio.play();
                
            } catch (error) {
                reject(new Error(`Failed to play audio: ${error.message}`));
            }
        });
    }
    
    /**
     * Gets audio from microphone
     * @param {number} maxDuration - Maximum recording duration in ms
     * @returns {Promise} - Promise resolving to audio blob
     */
    async recordAudio(maxDuration = 10000) {
        return new Promise(async (resolve, reject) => {
            try {
                // Get microphone access
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Create media recorder
                const mediaRecorder = new MediaRecorder(stream);
                const audioChunks = [];
                
                // Set up event handlers
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Create audio blob
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    resolve(audioBlob);
                };
                
                // Start recording
                mediaRecorder.start();
                
                // Stop after maxDuration
                setTimeout(() => {
                    if (mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                }, maxDuration);
                
            } catch (error) {
                reject(new Error(`Failed to record audio: ${error.message}`));
            }
        });
    }
    
    /**
     * Performs voice interaction - records audio, transcribes, and generates response
     * @param {number} recordingDuration - Maximum recording duration in ms
     * @returns {Promise} - Promise resolving to interaction result
     */
    async performVoiceInteraction(recordingDuration = 5000) {
        try {
            // Record audio
            const audioBlob = await this.recordAudio(recordingDuration);
            
            // Transcribe audio
            const transcriptionResult = await this.transcribeAudio(audioBlob);
            
            // Process as proposal
            const evaluationResult = await this.submitProposal(transcriptionResult.text);
            
            // Generate speech response
            const responseAudio = await this.generateSpeech(evaluationResult.response);
            
            // Play response
            await this.playAudio(responseAudio);
            
            return {
                transcription: transcriptionResult.text,
                evaluation: evaluationResult,
                success: true
            };
            
        } catch (error) {
            console.error('Voice interaction error:', error);
            return {
                error: error.message,
                success: false
            };
        }
    }
    
    /**
     * Fetches system status
     * @returns {Promise} - Promise resolving to system status data
     */
    async getSystemStatus() {
        try {
            return await this.request('/api/system/status', {
                method: 'GET'
            });
        } catch (error) {
            console.error('System status error:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

// Initialize API client when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.apiClient = new ApiClient();
    // Define the core processProposal function for terminal input
    window.processProposal = async (text) => {
        try {
            console.log('processProposal called with:', text);
            // Add user message to chat feed
            if (typeof window.addUserMessageToConversation === 'function') {
                window.addUserMessageToConversation(text);
            }
            // Echo user input in the terminal UI (typewriter)
            if (window.terminalInterface) {
                window.terminalInterface.displayText(text, true);
            }
            // Send to OpenAI for a response
            const openaiResp = await window.apiClient.request('/api/openai/generate-response', {
                method: 'POST',
                body: JSON.stringify({ proposal: text })
            });
            if (!openaiResp.success) {
                throw new Error(openaiResp.error || openaiResp.message);
            }
            const aiText = openaiResp.response || openaiResp.result?.response;
            // Add Aikira's response to chat feed
            if (typeof window.addAikiraMessageToConversation === 'function') {
                window.addAikiraMessageToConversation(aiText);
            }
            // Also type out the AI's response in terminal UI
            if (window.terminalInterface) {
                await window.terminalInterface.typeText(aiText, 30, true);
            }
            // Generate speech audio via Eleven Labs and play it
            // Returns an audio Blob
            const audioBlob = await window.apiClient.generateSpeech(aiText);
            // Create a URL for the Blob and play it
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.volume = (window.currentVolume != null ? window.currentVolume : 1);
            await audio.play();
        } catch (error) {
            console.error('processProposal error:', error);
            if (window.terminalInterface) {
                window.terminalInterface.displayText(`Error: ${error.message}`, false);
            }
        }
    };
});