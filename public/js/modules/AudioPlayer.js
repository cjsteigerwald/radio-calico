/**
 * Audio Player Module
 * Handles HLS audio streaming and playback controls
 */
export class AudioPlayer {
  constructor(appState) {
    this.appState = appState;
    this.streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
    this.audioElement = null;
    this.hls = null;
    this.elapsedTimeInterval = null;
    this.startTime = Date.now();
    this.pausedTime = 0;  // Track accumulated paused time

    this.init();
  }

  /**
   * Initialize audio player
   */
  init() {
    this.createAudioElement();
    this.setupEventListeners();
    this.initializeHLS();

    // Ensure timer is at 0 on initialization
    this.appState.set('audioPlayer.elapsedTime', 0);
  }

  /**
   * Create audio element
   */
  createAudioElement() {
    this.audioElement = document.createElement('audio');
    this.audioElement.id = 'audioPlayer';
    this.audioElement.style.display = 'none';
    this.audioElement.preload = 'none';
    document.body.appendChild(this.audioElement);

    // Set initial volume
    this.audioElement.volume = this.appState.get('audioPlayer.volume');
  }

  /**
   * Setup audio element event listeners
   */
  setupEventListeners() {
    this.audioElement.addEventListener('loadstart', () => {
      this.updateStatus('Loading stream...');
      // Ensure timer stays at 0 during loading
      this.appState.set('audioPlayer.elapsedTime', 0);
    });

    this.audioElement.addEventListener('canplay', () => {
      this.updateStatus('Ready to play');
      // Ensure timer stays at 0 when ready to play (before user presses play)
      this.appState.set('audioPlayer.elapsedTime', 0);
    });

    this.audioElement.addEventListener('play', () => {
      this.appState.set('audioPlayer.isPlaying', true);
      this.startElapsedTimeCounter();
      this.updateStatus('Playing live stream');
    });

    this.audioElement.addEventListener('pause', () => {
      this.appState.set('audioPlayer.isPlaying', false);
      this.stopElapsedTimeCounter();
      this.updateStatus('Paused');
    });

    this.audioElement.addEventListener('error', (e) => {
      this.appState.set('audioPlayer.isPlaying', false);
      this.stopElapsedTimeCounter();
      const error = e.target.error;
      let errorMessage = 'Audio error occurred';

      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading aborted';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Audio format not supported';
            break;
        }
      }

      this.updateStatus(errorMessage);
      console.error('Audio player error:', error);
    });

    this.audioElement.addEventListener('waiting', () => {
      this.updateStatus('Buffering...');
      // Keep timer at 0 if not playing
      if (this.audioElement.paused) {
        this.appState.set('audioPlayer.elapsedTime', 0);
      }
    });

    this.audioElement.addEventListener('playing', () => {
      this.updateStatus('Playing live stream');
    });
  }

  /**
   * Initialize HLS.js for streaming
   */
  initializeHLS() {
    // Ensure timer stays at 0 during HLS initialization
    this.appState.set('audioPlayer.elapsedTime', 0);

    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30
      });

      this.hls.loadSource(this.streamUrl);
      this.hls.attachMedia(this.audioElement);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.updateStatus('Stream ready');
        // Ensure timer stays at 0 when stream is ready
        this.appState.set('audioPlayer.elapsedTime', 0);
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);

        // Ensure timer stays at 0 during errors if not playing
        if (this.audioElement.paused) {
          this.appState.set('audioPlayer.elapsedTime', 0);
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              this.updateStatus('Network error - retrying...');
              this.hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              this.updateStatus('Media error - recovering...');
              this.hls.recoverMediaError();
              break;
            default:
              this.updateStatus('Fatal error occurred');
              this.hls.destroy();
              break;
          }
        }
      });

    } else if (this.audioElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Fallback for Safari
      this.audioElement.src = this.streamUrl;
      this.updateStatus('Stream ready (native HLS)');
      // Ensure timer stays at 0
      this.appState.set('audioPlayer.elapsedTime', 0);

    } else {
      this.updateStatus('HLS not supported in this browser');
      console.error('HLS is not supported');
      // Ensure timer stays at 0
      this.appState.set('audioPlayer.elapsedTime', 0);
    }
  }

  /**
   * Toggle play/pause
   */
  async togglePlay() {
    try {
      if (this.audioElement.paused) {
        await this.play();
      } else {
        this.pause();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      this.updateStatus('Playback error occurred');
    }
  }

  /**
   * Start playback
   */
  async play() {
    try {
      await this.audioElement.play();
    } catch (error) {
      console.error('Error starting playback:', error);

      // Handle autoplay restrictions
      if (error.name === 'NotAllowedError') {
        this.updateStatus('Click to start playback');
      } else {
        this.updateStatus('Failed to start playback');
      }

      throw error;
    }
  }

  /**
   * Pause playback
   */
  pause() {
    this.audioElement.pause();
  }

  /**
   * Set volume
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.audioElement.volume = clampedVolume;
    this.appState.set('audioPlayer.volume', clampedVolume);
  }

  /**
   * Update status message
   * @param {string} status - Status message
   */
  updateStatus(status) {
    this.appState.set('audioPlayer.status', status);
  }

  /**
   * Start elapsed time counter
   */
  startElapsedTimeCounter() {
    // Only start counter if user has initiated playback
    // This prevents timer from starting during HLS buffering
    if (!this.audioElement.paused) {
      // If we have paused time, resume from there, otherwise start fresh
      if (this.pausedTime > 0) {
        // Resume from pause - calculate when we originally started
        this.startTime = Date.now() - (this.pausedTime * 1000);
      } else {
        // Fresh start
        this.startTime = Date.now();
      }

      // Clear any existing interval
      if (this.elapsedTimeInterval) {
        clearInterval(this.elapsedTimeInterval);
      }

      this.elapsedTimeInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.appState.set('audioPlayer.elapsedTime', elapsed);
        this.pausedTime = elapsed; // Store current elapsed time
      }, 1000);
    }
  }

  /**
   * Reset elapsed time counter for new track
   */
  resetElapsedTime() {
    // Reset the start time to now
    this.startTime = Date.now();
    // Reset the paused time
    this.pausedTime = 0;
    // Reset the displayed elapsed time
    this.appState.set('audioPlayer.elapsedTime', 0);
  }

  /**
   * Stop elapsed time counter
   */
  stopElapsedTimeCounter() {
    if (this.elapsedTimeInterval) {
      clearInterval(this.elapsedTimeInterval);
      this.elapsedTimeInterval = null;
    }
  }

  /**
   * Format time in MM:SS format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get current playback state
   * @returns {Object} Current state
   */
  getState() {
    return {
      isPlaying: !this.audioElement.paused,
      volume: this.audioElement.volume,
      currentTime: this.audioElement.currentTime,
      duration: this.audioElement.duration,
      readyState: this.audioElement.readyState
    };
  }

  /**
   * Destroy audio player and cleanup
   */
  destroy() {
    this.stopElapsedTimeCounter();

    if (this.hls) {
      this.hls.destroy();
    }

    if (this.audioElement) {
      this.audioElement.remove();
    }
  }
}