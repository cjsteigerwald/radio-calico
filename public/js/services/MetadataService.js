/**
 * Metadata Service
 * Handles fetching and updating track metadata and artwork
 */
import { QUALITY_LOADING_STATE, QUALITY_UNKNOWN_STATE } from '../utils/constants.js';

export class MetadataService {
  constructor(appState, iTunesService) {
    this.appState = appState;
    this.iTunesService = iTunesService;
    this.metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
    this.pollInterval = 10000; // 10 seconds
    this.pollTimer = null;
    this.lastTrackId = null;

    this.init();
  }

  /**
   * Initialize metadata service
   */
  init() {
    this.startPolling();
    this.loadInitialArtwork();
  }

  /**
   * Start polling for metadata updates
   */
  startPolling() {
    this.pollTimer = setInterval(() => {
      this.fetchMetadata();
    }, this.pollInterval);

    // Fetch immediately
    this.fetchMetadata();
  }

  /**
   * Stop polling for metadata updates
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Fetch current track metadata
   */
  async fetchMetadata() {
    try {
      // Simple GET request without custom headers to avoid CORS preflight
      const response = await fetch(this.metadataUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json();
      await this.processMetadata(metadata);

    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      // Don't update status on metadata errors to avoid spam
    }
  }

  /**
   * Format quality string from bit depth and sample rate
   * @param {number} bitDepth - Bit depth (e.g., 16, 24)
   * @param {number} sampleRate - Sample rate in Hz (e.g., 44100)
   * @returns {string} Formatted quality string (e.g., "16-bit 44.1kHz")
   */
  formatQuality(bitDepth, sampleRate) {
    // Use integer division for cleaner display of standard rates
    const khz = sampleRate % 1000 === 0 
      ? (sampleRate / 1000).toString()
      : (sampleRate / 1000).toFixed(1);
    return `${bitDepth}-bit ${khz}kHz`;
  }

  /**
   * Process fetched metadata
   * @param {Object} metadata - Raw metadata from server
   * @param {Object} [metadata.quality] - Quality object (legacy format)
   * @param {string} [metadata.quality.source] - Source quality string
   * @param {string} [metadata.quality.stream] - Stream quality string
   * @param {number|string} [metadata.bit_depth] - Bit depth (new format)
   * @param {number|string} [metadata.sample_rate] - Sample rate in Hz (new format)
   * @param {Object} [metadata.track] - Track information object
   * @param {string} [metadata.artist] - Artist name (fallback format)
   * @param {string} [metadata.title] - Track title (fallback format)
   * @param {string} [metadata.album] - Album name (fallback format)
   */
  async processMetadata(metadata) {
    // Extract track information
    const trackInfo = this.parseTrackInfo(metadata);
    const trackId = this.generateTrackId(trackInfo);

    // Check if track has changed
    if (trackId !== this.lastTrackId) {
      this.lastTrackId = trackId;

      // Update track information
      this.appState.setBatch({
        'currentTrack.artist': trackInfo.artist,
        'currentTrack.subArtist': trackInfo.subArtist,
        'currentTrack.title': trackInfo.title,
        'currentTrack.album': trackInfo.album,
        'currentTrack.songId': trackId
      });

      // Update recent tracks
      this.updateRecentTracks(trackInfo);

      // Fetch new artwork
      await this.fetchArtwork(trackInfo.artist, trackInfo.title, trackInfo.album);

      // Notify about track change
      this.onTrackChange(trackInfo);
    }

    // Update quality information if available
    // Handle both metadata.quality object format and direct bit_depth/sample_rate fields
    if (metadata.quality) {
      this.appState.setBatch({
        'quality.source': metadata.quality.source || this.appState.get('quality.source'),
        'quality.stream': metadata.quality.stream || this.appState.get('quality.stream')
      });
    } else if (metadata.bit_depth && metadata.sample_rate) {
      // Handle metadatav2.json format with bit_depth and sample_rate
      // Parse values as integers and validate before processing
      const bitDepth = parseInt(metadata.bit_depth, 10);
      const sampleRate = parseInt(metadata.sample_rate, 10);

      console.log('Quality data:', { bit_depth: metadata.bit_depth, sample_rate: metadata.sample_rate, parsed: { bitDepth, sampleRate } });

      // Check if values are valid numbers
      if (!isNaN(bitDepth) && !isNaN(sampleRate) && sampleRate > 0) {
        const sourceQuality = this.formatQuality(bitDepth, sampleRate);

        // Source quality from metadata
        // Stream quality: HLS adaptive bitrate streaming
        // The actual stream quality may vary based on network conditions
        // but typically streams at 48kHz for HLS
        const streamQuality = metadata.stream_quality || 'HLS Adaptive (up to 48kHz)';

        console.log('Setting quality:', { source: sourceQuality, stream: streamQuality });

        this.appState.setBatch({
          'quality.source': sourceQuality,
          'quality.stream': streamQuality
        });
      } else {
        // Fallback when values are invalid
        this.appState.setBatch({
          'quality.source': QUALITY_UNKNOWN_STATE,
          'quality.stream': QUALITY_UNKNOWN_STATE
        });
      }
    } else {
      // Fallback when no quality data is available
      // Only set to "Unknown" if we're still showing "Loading..."
      if (this.appState.get('quality.source') === QUALITY_LOADING_STATE) {
        this.appState.setBatch({
          'quality.source': QUALITY_UNKNOWN_STATE,
          'quality.stream': QUALITY_UNKNOWN_STATE
        });
      }
    }
  }

  /**
   * Parse track information from metadata
   * @param {Object} metadata - Raw metadata
   * @returns {Object} Parsed track info
   */
  parseTrackInfo(metadata) {
    // Handle different metadata formats
    if (metadata.track) {
      return {
        artist: metadata.track.artist || 'Unknown Artist',
        subArtist: metadata.track.subArtist || null,
        title: metadata.track.title || 'Unknown Title',
        album: metadata.track.album || null
      };
    }

    // Fallback parsing
    return {
      artist: metadata.artist || 'Unknown Artist',
      subArtist: null,
      title: metadata.title || 'Unknown Title',
      album: metadata.album || null
    };
  }

  /**
   * Generate unique track ID
   * @param {Object} trackInfo - Track information
   * @returns {string} Track ID
   */
  generateTrackId(trackInfo) {
    return `${trackInfo.artist}-${trackInfo.title}`.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Update recent tracks list
   * @param {Object} newTrack - New track information
   */
  updateRecentTracks(newTrack) {
    const recentTracks = this.appState.get('recentTracks');
    const newTrackEntry = {
      artist: newTrack.artist,
      title: newTrack.title,
      timestamp: new Date().toISOString()
    };

    // Check if track is already in recent tracks
    const isDuplicate = recentTracks.some(track =>
      track.artist === newTrack.artist && track.title === newTrack.title
    );

    if (!isDuplicate) {
      // Add to beginning and keep only last 10 tracks
      const updatedTracks = [newTrackEntry, ...recentTracks].slice(0, 10);
      this.appState.set('recentTracks', updatedTracks);
    }
  }

  /**
   * Fetch artwork for track
   * @param {string} artist - Artist name
   * @param {string} title - Track title
   * @param {string} album - Album name
   */
  async fetchArtwork(artist, title, album) {
    try {
      // Clear current artwork while loading
      this.appState.set('currentTrack.artwork', null);

      const result = await this.iTunesService.searchAlbumArtwork(artist, title, album);

      if (result.artwork) {
        // Preload artwork to avoid loading flicker
        try {
          await this.iTunesService.preloadArtwork(result.artwork);
          this.appState.set('currentTrack.artwork', result.artwork);
        } catch (preloadError) {
          console.error('Failed to preload artwork:', preloadError);
        }
      } else {
        console.log('No artwork found for:', { artist, title, album });
      }

    } catch (error) {
      console.error('Failed to fetch artwork:', error);
    }
  }

  /**
   * Load initial artwork for current track
   */
  async loadInitialArtwork() {
    const currentTrack = this.appState.get('currentTrack');
    if (currentTrack.artist && currentTrack.title && !currentTrack.artwork) {
      await this.fetchArtwork(
        currentTrack.artist,
        currentTrack.title,
        currentTrack.album
      );
    }
  }

  /**
   * Handle track change event
   * @param {Object} newTrack - New track information
   */
  onTrackChange(newTrack) {
    console.log('Track changed:', newTrack);

    // Dispatch custom event for other modules
    const event = new CustomEvent('trackChanged', {
      detail: { track: newTrack }
    });
    document.dispatchEvent(event);
  }

  /**
   * Manually refresh metadata
   */
  async refresh() {
    await this.fetchMetadata();
  }

  /**
   * Set polling interval
   * @param {number} interval - Polling interval in milliseconds
   */
  setPollingInterval(interval) {
    this.pollInterval = Math.max(5000, interval); // Minimum 5 seconds

    if (this.pollTimer) {
      this.stopPolling();
      this.startPolling();
    }
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isPolling: !!this.pollTimer,
      pollInterval: this.pollInterval,
      lastTrackId: this.lastTrackId,
      metadataUrl: this.metadataUrl
    };
  }

  /**
   * Destroy service and cleanup
   */
  destroy() {
    this.stopPolling();
  }
}