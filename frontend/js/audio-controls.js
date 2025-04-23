/**
 * Audio Controls
 * Exposes audio initialization and volume control for the UI.
 */
(function() {
  // Initialize audio context on user interaction
  window.initAudio = async function() {
    const ap = window.audioProcessor;
    if (ap) {
      if (typeof ap.ensureAudioContext === 'function') {
        await ap.ensureAudioContext();
      } else if (typeof ap.initAudio === 'function') {
        ap.initAudio();
      }
    }
  };

  // Adjust playback volume (0.0 to 1.0)
  window.setVolume = function(level) {
    const ap = window.audioProcessor;
    if (ap && typeof ap.setVolume === 'function') {
      return ap.setVolume(level);
    }
    return level;
  };
})();