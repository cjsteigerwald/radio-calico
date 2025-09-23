/**
 * RadioCalico Main Application
 * Entry point that initializes and coordinates all modules
 */

// Import all modules and services
import { appState } from './utils/AppState.js';
import { apiService } from './services/ApiService.js';
import { iTunesService } from './services/iTunesService.js';
import { MetadataService } from './services/MetadataService.js';
import { AudioPlayer } from './modules/AudioPlayer.js';
import { RatingSystem } from './modules/RatingSystem.js';

/**
 * Main RadioCalico Application Class
 */
class RadioCalicoApp {
  constructor() {
    this.appState = appState;
    this.apiService = apiService;
    this.iTunesService = iTunesService;

    this.metadataService = null;
    this.audioPlayer = null;
    this.ratingSystem = null;

    this.uiElements = {};
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.isInitialized) {
      console.warn('Application already initialized');
      return;
    }

    try {
      console.log('Initializing RadioCalico application...');

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Check for required dependencies
      this.checkDependencies();

      // Initialize UI elements
      this.initializeUIElements();

      // Initialize services
      this.initializeServices();

      // Initialize modules
      this.initializeModules();

      // Setup event listeners
      this.setupEventListeners();

      // Setup state subscriptions
      this.setupStateSubscriptions();

      this.isInitialized = true;
      console.log('RadioCalico application initialized successfully');

      // Initial health check
      this.performHealthCheck();

    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError('Application failed to initialize');
    }
  }

  /**
   * Check for required dependencies
   */
  checkDependencies() {
    if (typeof Hls === 'undefined') {
      throw new Error('HLS.js library is required but not loaded');
    }

    console.log('All dependencies available');
  }

  /**
   * Initialize UI elements references
   */
  initializeUIElements() {
    this.uiElements = {
      // Audio controls
      playBtn: document.getElementById('playBtn'),
      playIcon: document.getElementById('playIcon'),
      pauseIcon: document.getElementById('pauseIcon'),
      volumeSlider: document.getElementById('volumeSlider'),
      elapsedTime: document.getElementById('elapsedTime'),
      status: document.getElementById('status'),

      // Track info
      trackArtistMain: document.getElementById('trackArtistMain'),
      trackArtistSub: document.getElementById('trackArtistSub'),
      trackTitleMain: document.getElementById('trackTitleMain'),
      trackAlbumMain: document.getElementById('trackAlbumMain'),
      artistNameLarge: document.getElementById('artistNameLarge'),

      // Album artwork
      albumArtworkLarge: document.getElementById('albumArtworkLarge'),
      albumPlaceholder: document.getElementById('albumPlaceholder'),

      // Quality info
      sourceQuality: document.getElementById('sourceQuality'),
      streamQuality: document.getElementById('streamQuality'),

      // Rating system
      thumbsUp: document.getElementById('thumbsUp'),
      thumbsDown: document.getElementById('thumbsDown'),
      thumbsUpCount: document.getElementById('thumbsUpCount'),
      thumbsDownCount: document.getElementById('thumbsDownCount'),

      // Recent tracks
      recentTracksList: document.getElementById('recentTracksList')
    };

    // Validate critical elements
    const criticalElements = ['playBtn', 'volumeSlider', 'status'];
    const missing = criticalElements.filter(id => !this.uiElements[id]);

    if (missing.length > 0) {
      throw new Error(`Critical UI elements missing: ${missing.join(', ')}`);
    }

    console.log('UI elements initialized');
  }

  /**
   * Initialize services
   */
  initializeServices() {
    this.metadataService = new MetadataService(this.appState, this.iTunesService);
    console.log('Services initialized');
  }

  /**
   * Initialize modules
   */
  initializeModules() {
    this.audioPlayer = new AudioPlayer(this.appState);
    this.ratingSystem = new RatingSystem(this.appState, this.apiService);
    console.log('Modules initialized');
  }

  /**
   * Setup event listeners for UI interactions
   */
  setupEventListeners() {
    // Play/pause button
    if (this.uiElements.playBtn) {
      this.uiElements.playBtn.addEventListener('click', () => {
        this.audioPlayer.togglePlay();
      });
    }

    // Volume slider
    if (this.uiElements.volumeSlider) {
      this.uiElements.volumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value) / 100;
        this.audioPlayer.setVolume(volume);
      });
    }

    // Rating buttons
    if (this.uiElements.thumbsUp) {
      this.uiElements.thumbsUp.addEventListener('click', () => {
        this.ratingSystem.handleLike();
      });
    }

    if (this.uiElements.thumbsDown) {
      this.uiElements.thumbsDown.addEventListener('click', () => {
        this.ratingSystem.handleDislike();
      });
    }

    // Track change events
    document.addEventListener('trackChanged', (event) => {
      this.ratingSystem.onTrackChange();
      // Reset elapsed time when track changes (regardless of play state)
      if (this.audioPlayer) {
        this.audioPlayer.resetElapsedTime();
      }
    });

    console.log('Event listeners setup complete');
  }

  /**
   * Setup state subscriptions for UI updates
   */
  setupStateSubscriptions() {
    // Audio player state
    this.appState.subscribe('audioPlayer.isPlaying', (isPlaying) => {
      this.updatePlayButton(isPlaying);
    });

    this.appState.subscribe('audioPlayer.volume', (volume) => {
      this.updateVolumeSlider(volume);
    });

    this.appState.subscribe('audioPlayer.elapsedTime', (elapsed) => {
      this.updateElapsedTime(elapsed);
    });

    this.appState.subscribe('audioPlayer.status', (status) => {
      this.updateStatus(status);
    });

    // Track information
    this.appState.subscribe('currentTrack.artist', (artist) => {
      this.updateTrackInfo();
    });

    this.appState.subscribe('currentTrack.title', (title) => {
      this.updateTrackInfo();
    });

    this.appState.subscribe('currentTrack.artwork', (artwork) => {
      this.updateArtwork(artwork);
    });

    // Quality info
    this.appState.subscribe('quality.source', (quality) => {
      this.updateQualityInfo();
    });

    // Rating system
    this.appState.subscribe('rating.thumbsUp', (count) => {
      this.updateRatingCounts();
    });

    this.appState.subscribe('rating.userRating', (rating) => {
      this.updateRatingButtons(rating);
    });

    // Recent tracks
    this.appState.subscribe('recentTracks', (tracks) => {
      this.updateRecentTracks(tracks);
    });

    console.log('State subscriptions setup complete');
  }

  /**
   * Update play/pause button state
   * @param {boolean} isPlaying - Whether audio is playing
   */
  updatePlayButton(isPlaying) {
    if (this.uiElements.playIcon && this.uiElements.pauseIcon) {
      this.uiElements.playIcon.style.display = isPlaying ? 'none' : 'block';
      this.uiElements.pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
  }

  /**
   * Update volume slider position
   * @param {number} volume - Volume level (0-1)
   */
  updateVolumeSlider(volume) {
    if (this.uiElements.volumeSlider) {
      this.uiElements.volumeSlider.value = Math.round(volume * 100);
    }
  }

  /**
   * Update elapsed time display
   * @param {number} elapsed - Elapsed time in seconds
   */
  updateElapsedTime(elapsed) {
    if (this.uiElements.elapsedTime) {
      this.uiElements.elapsedTime.textContent = this.formatTime(elapsed);
    }
  }

  /**
   * Update status message
   * @param {string} status - Status message
   */
  updateStatus(status) {
    if (this.uiElements.status) {
      this.uiElements.status.textContent = status;
    }
  }

  /**
   * Update track information display
   */
  updateTrackInfo() {
    const track = this.appState.get('currentTrack');

    if (this.uiElements.trackArtistMain) {
      this.uiElements.trackArtistMain.textContent = track.artist;
    }

    if (this.uiElements.trackArtistSub && track.subArtist) {
      this.uiElements.trackArtistSub.textContent = track.subArtist;
      this.uiElements.trackArtistSub.style.display = 'block';
    } else if (this.uiElements.trackArtistSub) {
      this.uiElements.trackArtistSub.style.display = 'none';
    }

    if (this.uiElements.trackTitleMain) {
      this.uiElements.trackTitleMain.textContent = track.title;
    }

    if (this.uiElements.trackAlbumMain && track.album) {
      this.uiElements.trackAlbumMain.textContent = track.album;
      this.uiElements.trackAlbumMain.style.display = 'block';
    } else if (this.uiElements.trackAlbumMain) {
      this.uiElements.trackAlbumMain.style.display = 'none';
    }

    if (this.uiElements.artistNameLarge) {
      this.uiElements.artistNameLarge.textContent = track.artist;
    }
  }

  /**
   * Update album artwork display
   * @param {string} artwork - Artwork URL
   */
  updateArtwork(artwork) {
    if (artwork) {
      if (this.uiElements.albumArtworkLarge) {
        this.uiElements.albumArtworkLarge.src = artwork;
        this.uiElements.albumArtworkLarge.style.display = 'block';
      }
      if (this.uiElements.albumPlaceholder) {
        this.uiElements.albumPlaceholder.style.display = 'none';
      }
    } else {
      if (this.uiElements.albumArtworkLarge) {
        this.uiElements.albumArtworkLarge.style.display = 'none';
      }
      if (this.uiElements.albumPlaceholder) {
        this.uiElements.albumPlaceholder.style.display = 'flex';
      }
    }
  }

  /**
   * Update quality information display
   */
  updateQualityInfo() {
    const quality = this.appState.get('quality');

    if (this.uiElements.sourceQuality) {
      this.uiElements.sourceQuality.textContent = quality.source;
    }

    if (this.uiElements.streamQuality) {
      this.uiElements.streamQuality.textContent = quality.stream;
    }
  }

  /**
   * Update rating counts display
   */
  updateRatingCounts() {
    const rating = this.appState.get('rating');

    if (this.uiElements.thumbsUpCount) {
      this.uiElements.thumbsUpCount.textContent = rating.thumbsUp;
    }

    if (this.uiElements.thumbsDownCount) {
      this.uiElements.thumbsDownCount.textContent = rating.thumbsDown;
    }
  }

  /**
   * Update rating buttons state
   * @param {number} userRating - User's current rating
   */
  updateRatingButtons(userRating) {
    if (this.uiElements.thumbsUp) {
      this.uiElements.thumbsUp.classList.toggle('active', userRating === 1);
    }

    if (this.uiElements.thumbsDown) {
      this.uiElements.thumbsDown.classList.toggle('active', userRating === -1);
    }
  }

  /**
   * Update recent tracks list
   * @param {Array} tracks - Recent tracks array
   */
  updateRecentTracks(tracks) {
    if (!this.uiElements.recentTracksList) return;

    this.uiElements.recentTracksList.innerHTML = tracks.map(track => `
      <div class="recent-track">
        <span class="recent-track-artist">${this.escapeHtml(track.artist)}:</span>
        <span class="recent-track-title">${this.escapeHtml(track.title)}</span>
      </div>
    `).join('');
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
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Perform initial health check
   */
  async performHealthCheck() {
    try {
      const health = await this.apiService.checkHealth();
      console.log('Backend health check passed:', health);
    } catch (error) {
      console.warn('Backend health check failed:', error);
      this.showError('Backend connection issues detected');
    }
  }

  /**
   * Show error message to user
   * @param {string} message - Error message
   */
  showError(message) {
    if (this.uiElements.status) {
      this.uiElements.status.textContent = `Error: ${message}`;
      this.uiElements.status.classList.add('error');

      setTimeout(() => {
        this.uiElements.status.classList.remove('error');
      }, 5000);
    }
  }

  /**
   * Get application status
   * @returns {Object} Application status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      services: {
        metadata: this.metadataService?.getStatus(),
        audioPlayer: this.audioPlayer?.getState(),
        rating: this.ratingSystem?.getRatingStats()
      },
      state: this.appState.state
    };
  }

  /**
   * Destroy application and cleanup
   */
  destroy() {
    if (this.metadataService) {
      this.metadataService.destroy();
    }

    if (this.audioPlayer) {
      this.audioPlayer.destroy();
    }

    this.isInitialized = false;
    console.log('Application destroyed');
  }
}

// Initialize application when DOM is ready
const app = new RadioCalicoApp();

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for debugging
window.RadioCalicoApp = app;