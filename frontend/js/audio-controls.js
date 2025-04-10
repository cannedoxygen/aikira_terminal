/* Audio Controls CSS for Aikira Terminal */

/* Audio Initialization Overlay */
#audio-init-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(18, 21, 26, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    backdrop-filter: blur(5px);
}

.audio-init-container {
    text-align: center;
    padding: 30px;
    background-color: var(--medium-bg);
    border-radius: 15px;
    border: 1px solid var(--trans-light);
    box-shadow: 0 0 30px rgba(216, 181, 255, 0.3);
    max-width: 400px;
    width: 80%;
}

.audio-init-title {
    color: var(--soft-pink);
    margin-bottom: 20px;
    font-family: var(--display-font);
    font-size: 24px;
    letter-spacing: 1px;
}

.audio-init-message {
    color: var(--soft-white);
    margin-bottom: 25px;
    line-height: 1.5;
}

#enable-audio-btn {
    background: linear-gradient(135deg, var(--accent-purple), var(--accent-turquoise));
    border: none;
    border-radius: 10px;
    color: var(--soft-white);
    padding: 12px 25px;
    font-family: var(--display-font);
    font-size: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 15px;
    letter-spacing: 1px;
}

#enable-audio-btn:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(169, 238, 230, 0.3);
}

.audio-init-secondary {
    color: var(--lavender-purple);
    font-size: 14px;
    opacity: 0.8;
}

/* Volume Control */
#aikira-volume-control {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: var(--medium-bg);
    border-radius: 10px;
    padding: 10px 15px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--trans-light);
    z-index: 100;
    transition: all 0.3s ease;
}

#aikira-volume-control:hover {
    box-shadow: 0 0 20px rgba(216, 181, 255, 0.3);
}

#volume-icon {
    display: flex;
    align-items: center;
    justify-content: center;
}

#volume-icon svg {
    width: 20px;
    height: 20px;
}

#volume-icon svg path {
    stroke: var(--soft-white);
}

#volume-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 80px;
    height: 4px;
    background: var(--trans-light);
    border-radius: 2px;
    outline: none;
}

#volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent-purple);
    cursor: pointer;
    transition: all 0.2s;
}

#volume-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    background: var(--soft-pink);
}

#volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent-purple);
    cursor: pointer;
    border: none;
    transition: all 0.2s;
}

#volume-slider::-moz-range-thumb:hover {
    transform: scale(1.2);
    background: var(--soft-pink);
}

#volume-value {
    color: var(--soft-white);
    font-size: 12px;
    min-width: 35px;
    text-align: right;
}

#mute-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    border-radius: 5px;
    transition: all 0.2s;
}

#mute-button:hover {
    background-color: var(--trans-light);
}

#mute-button svg {
    width: 16px;
    height: 16px;
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

.fade-in {
    animation: fadeIn 0.5s ease-out forwards;
}

.fade-out {
    animation: fadeOut 0.5s ease-out forwards;
}

/* Audio status indicator for header */
.audio-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    background-color: var(--trans-medium);
    border-radius: 12px;
    font-size: 12px;
    color: var(--accent-turquoise);
}

.audio-status-icon {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--accent-turquoise);
}

.audio-status.muted .audio-status-icon {
    background-color: var(--accent-pink);
}

.audio-status.muted {
    color: var(--accent-pink);
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .audio-init-container {
        width: 90%;
        padding: 20px;
    }
    
    #aikira-volume-control {
        bottom: 10px;
        right: 10px;
        padding: 8px 10px;
    }
    
    #volume-slider {
        width: 60px;
    }
}