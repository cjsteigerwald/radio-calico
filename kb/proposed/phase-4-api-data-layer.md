# Phase 4: API & Data Layer

## Overview
Create a robust API abstraction layer and state management system to handle data flow between the frontend, backend, and external services (metadata, iTunes API).

## Current Issues
- Direct fetch calls scattered throughout code
- No centralized error handling for API calls
- No request/response caching
- No state management between components
- Hard-coded URLs and configurations
- No retry logic for failed requests

## Proposed Architecture

### 4.1 API Client Layer

```
public/js/api/
├── BaseApiClient.js     # Core HTTP client with common functionality
├── RadioCalicoAPI.js    # Internal API endpoints
├── MetadataAPI.js       # External metadata service
├── iTunesAPI.js         # iTunes artwork API
├── RequestCache.js      # Caching layer for API responses
└── ApiError.js          # Custom error handling
```

#### Base API Client
```javascript
// public/js/api/BaseApiClient.js
class BaseApiClient {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.defaultOptions = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...options
    };
    this.interceptors = {
      request: [],
      response: []
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...this.defaultOptions,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultOptions.headers,
        ...options.headers
      }
    };

    // Apply request interceptors
    for (const interceptor of this.interceptors.request) {
      config = interceptor(config) || config;
    }

    try {
      const response = await this.fetchWithRetry(url, config);
      const data = await this.parseResponse(response);

      // Apply response interceptors
      let result = { data, response };
      for (const interceptor of this.interceptors.response) {
        result = interceptor(result) || result;
      }

      return result.data;
    } catch (error) {
      throw new ApiError(error.message, error.status, endpoint);
    }
  }

  async fetchWithRetry(url, config, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (attempt < config.retries && !error.name === 'AbortError') {
        await this.delay(config.retryDelay * attempt);
        return this.fetchWithRetry(url, config, attempt + 1);
      }
      throw error;
    }
  }

  async parseResponse(response) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Interceptor methods
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
  }

  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export { BaseApiClient };
```

#### RadioCalico API Client
```javascript
// public/js/api/RadioCalicoAPI.js
import { BaseApiClient } from './BaseApiClient.js';
import { RequestCache } from './RequestCache.js';

class RadioCalicoAPI extends BaseApiClient {
  constructor() {
    super('/api', {
      timeout: 5000,
      retries: 2
    });

    this.cache = new RequestCache();
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Add user identifier to requests
    this.addRequestInterceptor((config) => {
      const userIdentifier = localStorage.getItem('radioUserId');
      if (userIdentifier && config.method === 'POST') {
        const body = JSON.parse(config.body || '{}');
        body.userIdentifier = userIdentifier;
        config.body = JSON.stringify(body);
      }
      return config;
    });

    // Cache GET responses
    this.addResponseInterceptor((result) => {
      if (result.response.url.includes('/ratings') && result.response.status === 200) {
        this.cache.set(result.response.url, result.data, 30000); // 30 second cache
      }
      return result;
    });
  }

  async getHealth() {
    return this.get('/health');
  }

  async rateSong(songId, artist, title, rating) {
    const data = { songId, artist, title, rating };
    const result = await this.post('/songs/rate', data);

    // Invalidate cache for this song
    this.cache.delete(`/api/songs/${songId}/ratings`);

    return result;
  }

  async getSongRatings(songId, userIdentifier = null) {
    const url = `/songs/${songId}/ratings${userIdentifier ? `?userIdentifier=${userIdentifier}` : ''}`;

    // Check cache first
    const cached = this.cache.get(url);
    if (cached) {
      return cached;
    }

    return this.get(url);
  }

  async createUser(username, email) {
    return this.post('/users', { username, email });
  }

  async getUsers() {
    return this.get('/users');
  }
}

export { RadioCalicoAPI };
```

#### Metadata API Client
```javascript
// public/js/api/MetadataAPI.js
import { BaseApiClient } from './BaseApiClient.js';
import { RequestCache } from './RequestCache.js';

class MetadataAPI extends BaseApiClient {
  constructor() {
    super('https://d3d4yli4hf5bmh.cloudfront.net', {
      timeout: 8000,
      retries: 3
    });

    this.cache = new RequestCache();
  }

  async getCurrentMetadata() {
    const cached = this.cache.get('/metadatav2.json');
    if (cached && Date.now() - cached.timestamp < 5000) { // 5 second cache
      return cached.data;
    }

    const data = await this.get('/metadatav2.json');
    this.cache.set('/metadatav2.json', data, 5000);

    return data;
  }

  extractPreviousTracks(metadata) {
    const tracks = [];
    for (let i = 1; i <= 5; i++) {
      const artist = metadata[`prev_artist_${i}`];
      const title = metadata[`prev_title_${i}`];
      if (artist && title) {
        tracks.push({ artist, title });
      }
    }
    return tracks;
  }
}

export { MetadataAPI };
```

#### iTunes API Client
```javascript
// public/js/api/iTunesAPI.js
import { BaseApiClient } from './BaseApiClient.js';
import { RequestCache } from './RequestCache.js';

class iTunesAPI extends BaseApiClient {
  constructor() {
    super('https://itunes.apple.com', {
      timeout: 10000,
      retries: 2
    });

    this.cache = new RequestCache();
  }

  async searchAlbumArtwork(artist, album, title) {
    let searchQuery = this.buildSearchQuery(artist, album, title);

    // Check cache first
    const cacheKey = `artwork_${searchQuery}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const data = await this.get('/search', {
        params: {
          term: searchQuery,
          media: 'music',
          limit: 1
        }
      });

      let artworkUrl = null;
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        artworkUrl = result.artworkUrl100?.replace('100x100', '600x600');
      }

      // Cache for 1 hour
      this.cache.set(cacheKey, artworkUrl, 3600000);
      return artworkUrl;

    } catch (error) {
      console.warn('iTunes API error:', error.message);
      return null;
    }
  }

  buildSearchQuery(artist, album, title) {
    let query = '';

    if (artist && album) {
      query = `${artist} ${album}`;
    } else if (artist && title) {
      query = `${artist} ${title}`;
    } else if (artist) {
      query = artist;
    }

    // Clean up search query
    return query.replace(/\(.*?(remaster|version|edit|mix).*?\)/gi, '').trim();
  }

  // Override to handle query parameters
  async request(endpoint, options = {}) {
    if (options.params) {
      const params = new URLSearchParams(options.params);
      endpoint += `?${params.toString()}`;
      delete options.params;
    }

    return super.request(endpoint, options);
  }
}

export { iTunesAPI };
```

### 4.2 State Management

```javascript
// public/js/state/AppState.js
import { EventEmitter } from '../utils/EventEmitter.js';

class AppState extends EventEmitter {
  constructor() {
    super();
    this.state = {
      // Player state
      isPlaying: false,
      volume: 0.7,
      currentTime: 0,

      // Track state
      currentTrack: null,
      previousTracks: [],

      // UI state
      isLoading: false,
      error: null,
      status: 'Ready to play',

      // User state
      userIdentifier: this.getUserIdentifier(),
      ratings: new Map()
    };

    this.persistentKeys = ['volume', 'userIdentifier'];
    this.loadPersistedState();
  }

  getUserIdentifier() {
    let userId = localStorage.getItem('radioUserId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('radioUserId', userId);
    }
    return userId;
  }

  loadPersistedState() {
    this.persistentKeys.forEach(key => {
      const value = localStorage.getItem(`radiocalico_${key}`);
      if (value !== null) {
        try {
          this.state[key] = JSON.parse(value);
        } catch {
          this.state[key] = value;
        }
      }
    });
  }

  setState(updates) {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Persist certain state changes
    this.persistentKeys.forEach(key => {
      if (key in updates) {
        localStorage.setItem(`radiocalico_${key}`, JSON.stringify(this.state[key]));
      }
    });

    // Emit state change event
    this.emit('statechange', {
      previousState,
      currentState: this.state,
      changes: updates
    });

    // Emit specific change events
    Object.keys(updates).forEach(key => {
      this.emit(`${key}changed`, this.state[key], previousState[key]);
    });
  }

  getState() {
    return { ...this.state };
  }

  get(key) {
    return this.state[key];
  }

  // Convenience methods
  setCurrentTrack(track) {
    this.setState({ currentTrack: track });
  }

  setPlaying(isPlaying) {
    this.setState({ isPlaying });
  }

  setVolume(volume) {
    this.setState({ volume: Math.max(0, Math.min(1, volume)) });
  }

  setLoading(isLoading, status = null) {
    const updates = { isLoading };
    if (status) updates.status = status;
    this.setState(updates);
  }

  setError(error) {
    this.setState({ error, isLoading: false });
  }

  clearError() {
    this.setState({ error: null });
  }

  addRating(songId, rating) {
    const ratings = new Map(this.state.ratings);
    ratings.set(songId, rating);
    this.setState({ ratings });
  }
}

export { AppState };
```

### 4.3 Service Layer Integration

```javascript
// public/js/services/TrackService.js
import { MetadataAPI } from '../api/MetadataAPI.js';
import { iTunesAPI } from '../api/iTunesAPI.js';
import { RadioCalicoAPI } from '../api/RadioCalicoAPI.js';

class TrackService {
  constructor(appState) {
    this.appState = appState;
    this.metadataAPI = new MetadataAPI();
    this.itunesAPI = new iTunesAPI();
    this.radioCalicoAPI = new RadioCalicoAPI();

    this.pollInterval = null;
  }

  async startMetadataPolling() {
    if (this.pollInterval) return;

    await this.fetchMetadata(); // Initial fetch
    this.pollInterval = setInterval(() => {
      this.fetchMetadata();
    }, 10000);
  }

  stopMetadataPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async fetchMetadata() {
    try {
      this.appState.setLoading(true, 'Fetching track info...');

      const metadata = await this.metadataAPI.getCurrentMetadata();
      const hasTrackChanged = this.hasTrackChanged(metadata);

      if (hasTrackChanged) {
        await this.handleTrackChange(metadata);
      }

      this.updatePreviousTracks(metadata);
      this.appState.setLoading(false, 'Playing live stream');

    } catch (error) {
      console.error('Error fetching metadata:', error);
      this.appState.setError(`Failed to fetch track info: ${error.message}`);
    }
  }

  hasTrackChanged(metadata) {
    const currentTrack = this.appState.get('currentTrack');
    return !currentTrack ||
           currentTrack.artist !== metadata.artist ||
           currentTrack.title !== metadata.title;
  }

  async handleTrackChange(metadata) {
    const track = {
      artist: metadata.artist,
      title: metadata.title,
      album: metadata.album,
      date: metadata.date,
      bitDepth: metadata.bit_depth,
      sampleRate: metadata.sample_rate
    };

    // Fetch album artwork
    try {
      track.artworkUrl = await this.itunesAPI.searchAlbumArtwork(
        metadata.artist,
        metadata.album,
        metadata.title
      );
    } catch (error) {
      console.warn('Failed to fetch artwork:', error);
    }

    this.appState.setCurrentTrack(track);

    // Fetch ratings for new track
    const songId = this.generateSongId(metadata.artist, metadata.title);
    try {
      const ratingsData = await this.radioCalicoAPI.getSongRatings(
        songId,
        this.appState.get('userIdentifier')
      );

      if (ratingsData.success) {
        this.appState.addRating(songId, ratingsData.userRating);
      }
    } catch (error) {
      console.warn('Failed to fetch ratings:', error);
    }
  }

  updatePreviousTracks(metadata) {
    const previousTracks = this.metadataAPI.extractPreviousTracks(metadata);
    this.appState.setState({ previousTracks });
  }

  generateSongId(artist, title) {
    return btoa(`${artist}-${title}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
  }

  async rateSong(rating) {
    const currentTrack = this.appState.get('currentTrack');
    if (!currentTrack) return;

    const songId = this.generateSongId(currentTrack.artist, currentTrack.title);
    const currentRating = this.appState.get('ratings').get(songId);

    // Toggle rating if same rating clicked
    const newRating = rating === currentRating ? 0 : rating;

    try {
      const result = await this.radioCalicoAPI.rateSong(
        songId,
        currentTrack.artist,
        currentTrack.title,
        newRating
      );

      if (result.success) {
        this.appState.addRating(songId, newRating);
        return result.ratings;
      }
    } catch (error) {
      this.appState.setError(`Failed to rate song: ${error.message}`);
      throw error;
    }
  }
}

export { TrackService };
```

## Implementation Steps

1. **Create base API client** - HTTP wrapper with retry logic
2. **Implement specific API clients** - RadioCalico, Metadata, iTunes
3. **Add request caching** - Reduce redundant API calls
4. **Create state management** - Centralized application state
5. **Build service layer** - Business logic abstraction
6. **Add error handling** - Comprehensive error management
7. **Implement interceptors** - Request/response middleware
8. **Add offline support** - Service worker and caching
9. **Create data models** - Type safety and validation
10. **Integration testing** - End-to-end API testing

## Benefits

- **Centralized API Management**: All API calls in one place
- **Error Handling**: Consistent error management across app
- **Caching**: Reduced API calls and improved performance
- **State Management**: Predictable data flow
- **Testability**: Easy to mock and test API interactions
- **Retry Logic**: Resilient to temporary network issues
- **Type Safety**: Better development experience
- **Offline Support**: Graceful degradation when offline

## Timeline: Week 6

- Days 1-2: Base API client and error handling
- Days 3-4: Specific API clients implementation
- Days 5-6: State management system
- Day 7: Integration and testing