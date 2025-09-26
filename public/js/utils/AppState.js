/**
 * Application State Management
 * Centralized state for the RadioCalico application
 */
import { QUALITY_LOADING_STATE } from './constants.js';

export class AppState {
  constructor() {
    this.state = {
      currentTrack: {
        artist: 'Shandi',
        subArtist: 'Sinnamon',
        title: 'He\'s A Dream (1983)',
        album: 'Flashdance (Original Motion Picture Soundtrack)',
        artwork: null,
        songId: null
      },
      audioPlayer: {
        isPlaying: false,
        volume: 0.7,
        elapsedTime: 0,
        status: 'Ready to play'
      },
      quality: {
        source: QUALITY_LOADING_STATE,
        stream: QUALITY_LOADING_STATE
      },
      rating: {
        thumbsUp: 0,
        thumbsDown: 0,
        userRating: null,
        isLoading: false
      },
      recentTracks: [
        { artist: 'TLC', title: 'Ain\'t 2 Proud 2 Beg' },
        { artist: 'The Raconteurs', title: 'Steady, As She Goes' },
        { artist: 'Mick Jagger', title: 'Just Another Night' },
        { artist: 'Beyoncé', title: 'Irreplaceable (Album Version)' },
        { artist: 'Etta James', title: 'I\'d Rather Go Blind' }
      ]
    };

    this.listeners = new Map();
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Get current state value
   * @param {string} key - State key
   * @returns {any} State value
   */
  get(key) {
    return this.getNestedValue(this.state, key);
  }

  /**
   * Update state and notify listeners
   * @param {string} key - State key
   * @param {any} value - New value
   */
  set(key, value) {
    // Safeguard: Prevent non-zero elapsed time when not playing
    // Check if isPlaying is explicitly true (not undefined, null, or false)
    const isPlaying = this.get('audioPlayer.isPlaying');
    if (key === 'audioPlayer.elapsedTime' && isPlaying !== true) {
      // Only allow setting to 0 when not playing
      if (value !== 0) {
        // Silently block and reset to 0
        value = 0;
      }
    }

    const oldValue = this.get(key);
    this.setNestedValue(this.state, key, value);

    // Notify listeners
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      });
    }
  }

  /**
   * Update multiple state values at once
   * @param {Object} updates - Object with key-value pairs
   */
  setBatch(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path
   * @returns {any} Value at path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   * @param {Object} obj - Object to update
   * @param {string} path - Dot notation path
   * @param {any} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();

    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Generate user identifier for rating system
   * @returns {string} User identifier
   */
  getUserIdentifier() {
    let userId = localStorage.getItem('radiocalico-user-id');
    if (!userId) {
      userId = 'user-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('radiocalico-user-id', userId);
    }
    return userId;
  }

  /**
   * Generate song ID from current track
   * @returns {string} Song ID
   */
  getCurrentSongId() {
    const track = this.get('currentTrack');
    return `${track.artist}-${track.title}`.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

// Create global state instance
export const appState = new AppState();