/**
 * Integration tests for elapsed time behavior during app initialization
 * Verifies timer stays at 0 through all initialization states until play
 */

import { AppState } from '../../../public/js/utils/AppState.js';
import { AudioPlayer } from '../../../public/js/modules/AudioPlayer.js';
import { MetadataService } from '../../../public/js/services/MetadataService.js';

// Mock HLS.js
global.Hls = {
  isSupported: jest.fn(() => true),
  Events: {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError'
  },
  ErrorTypes: {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError'
  }
};

// Mock fetch for metadata polling
global.fetch = jest.fn();

describe('App Elapsed Time Integration', () => {
  let appState;
  let audioPlayer;
  let metadataService;
  let mockAudioElement;
  let mockHls;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Create AppState instance
    appState = new AppState();

    // Mock audio element
    mockAudioElement = {
      paused: true,
      volume: 0.7,
      currentTime: 0,
      duration: NaN,
      readyState: 0,
      play: jest.fn(() => Promise.resolve()),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      remove: jest.fn(),
      style: {},
      id: '',
      preload: ''
    };

    // Store event listeners
    const eventListeners = {};
    mockAudioElement.addEventListener = jest.fn((event, handler) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(handler);
    });

    // Helper to trigger events
    mockAudioElement.triggerEvent = (event) => {
      if (eventListeners[event]) {
        eventListeners[event].forEach(handler => handler());
      }
    };

    // Mock createElement to return our mock audio element
    document.createElement = jest.fn((tag) => {
      if (tag === 'audio') {
        return mockAudioElement;
      }
      return {};
    });

    document.body.appendChild = jest.fn();

    // Mock HLS instance
    mockHls = {
      listeners: {},
      loadSource: jest.fn(),
      attachMedia: jest.fn(),
      on: jest.fn(function(event, handler) {
        this.listeners[event] = handler;
      }),
      trigger: function(event, data) {
        if (this.listeners[event]) {
          this.listeners[event](event, data);
        }
      },
      startLoad: jest.fn(),
      recoverMediaError: jest.fn(),
      destroy: jest.fn()
    };

    // Mock HLS constructor
    global.Hls = jest.fn(() => mockHls);
    global.Hls.isSupported = jest.fn(() => true);
    global.Hls.Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError'
    };
    global.Hls.ErrorTypes = {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError'
    };

    // Mock iTunes service
    const mockITunesService = {
      searchAlbumArtwork: jest.fn(() => Promise.resolve({ artwork: null })),
      preloadArtwork: jest.fn(() => Promise.resolve())
    };

    // Mock successful metadata fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          artist: 'Test Artist',
          title: 'Test Song',
          album: 'Test Album',
          bit_depth: 16,
          sample_rate: 44100
        })
      })
    );

    // Initialize services
    audioPlayer = new AudioPlayer(appState);
    metadataService = new MetadataService(appState, mockITunesService);
  });

  afterEach(() => {
    if (audioPlayer) {
      audioPlayer.destroy();
    }
    if (metadataService) {
      metadataService.destroy();
    }
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('elapsed time should remain 0 through entire initialization sequence', async () => {
    // Initial state
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Simulate HLS initialization sequence
    // 1. loadstart event
    mockAudioElement.triggerEvent('loadstart');
    expect(appState.get('audioPlayer.status')).toBe('Loading stream...');
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // 2. HLS manifest parsed
    mockHls.trigger(global.Hls.Events.MANIFEST_PARSED);
    expect(appState.get('audioPlayer.status')).toBe('Stream ready');
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // 3. waiting/buffering event
    mockAudioElement.triggerEvent('waiting');
    expect(appState.get('audioPlayer.status')).toBe('Buffering...');
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // 4. canplay event (THIS IS WHERE IT SHOWS "Ready to play")
    mockAudioElement.triggerEvent('canplay');
    expect(appState.get('audioPlayer.status')).toBe('Ready to play');
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Wait to ensure no background processes change the timer
    jest.advanceTimersByTime(1000);
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });

  test('elapsed time should remain 0 when metadata updates before play', async () => {
    // Initial state
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Trigger metadata fetch (simulates 10-second polling)
    await metadataService.fetchMetadata();

    // Timer should still be 0
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Simulate ready to play status
    mockAudioElement.triggerEvent('canplay');
    expect(appState.get('audioPlayer.status')).toBe('Ready to play');
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Another metadata update
    await metadataService.fetchMetadata();
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });

  test('elapsed time should remain 0 during multiple status changes before play', () => {
    // Track all elapsed time changes
    const elapsedTimeChanges = [];
    appState.subscribe('audioPlayer.elapsedTime', (value) => {
      elapsedTimeChanges.push(value);
    });

    // Simulate rapid status changes
    mockAudioElement.triggerEvent('loadstart'); // Loading stream...
    mockAudioElement.triggerEvent('waiting');   // Buffering...
    mockAudioElement.triggerEvent('canplay');   // Ready to play
    mockAudioElement.triggerEvent('waiting');   // Buffering...
    mockAudioElement.triggerEvent('canplay');   // Ready to play

    // Check all recorded values
    elapsedTimeChanges.forEach((value, index) => {
      expect(value).toBe(0);
    });

    // Final check
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });

  test('elapsed time should only start counting after user presses play', () => {
    // Mock Date.now() for consistent timing
    const originalNow = Date.now;
    let currentTime = 1000000;
    Date.now = jest.fn(() => currentTime);

    // Go through initialization
    mockAudioElement.triggerEvent('loadstart');
    mockAudioElement.triggerEvent('canplay');
    expect(appState.get('audioPlayer.status')).toBe('Ready to play');
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Wait some time without playing
    currentTime += 5000;
    jest.advanceTimersByTime(5000);
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Now simulate user pressing play
    mockAudioElement.paused = false;
    mockAudioElement.triggerEvent('play');
    expect(appState.get('audioPlayer.isPlaying')).toBe(true);

    // Now timer should start
    currentTime += 3000;
    jest.advanceTimersByTime(3000);
    expect(appState.get('audioPlayer.elapsedTime')).toBeGreaterThan(0);

    Date.now = originalNow;
  });

  test('timer should stay at 0 even with background HLS activity', () => {
    // Initial state
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Simulate HLS buffering activity
    mockHls.trigger(global.Hls.Events.MANIFEST_PARSED);
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Simulate HLS level switching (quality change)
    mockHls.trigger('hlsLevelSwitching', { level: 1 });
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Simulate fragment loading
    mockHls.trigger('hlsFragLoading', { frag: {} });
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Ready to play
    mockAudioElement.triggerEvent('canplay');
    expect(appState.get('audioPlayer.status')).toBe('Ready to play');
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // More HLS activity
    mockHls.trigger('hlsFragLoaded', { frag: {} });
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });

  test('verify no timer starts on initialization without play', () => {
    // Check that no interval is set initially
    expect(audioPlayer.elapsedTimeInterval).toBeNull();

    // Go through full initialization
    mockAudioElement.triggerEvent('loadstart');
    expect(audioPlayer.elapsedTimeInterval).toBeNull();

    mockHls.trigger(global.Hls.Events.MANIFEST_PARSED);
    expect(audioPlayer.elapsedTimeInterval).toBeNull();

    mockAudioElement.triggerEvent('canplay');
    expect(audioPlayer.elapsedTimeInterval).toBeNull();

    // Wait to ensure no delayed timer start
    jest.advanceTimersByTime(5000);
    expect(audioPlayer.elapsedTimeInterval).toBeNull();
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });

  test('elapsed time should be 0 when currentTime is non-zero before play', () => {
    // Simulate HLS buffering data (currentTime might be non-zero)
    mockAudioElement.currentTime = 15.5; // Simulates buffered position

    // Status changes to ready
    mockAudioElement.triggerEvent('canplay');
    expect(appState.get('audioPlayer.status')).toBe('Ready to play');

    // Elapsed time should still be 0 (not using currentTime)
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // currentTime might change during buffering
    mockAudioElement.currentTime = 18.2;

    // But elapsed time should remain 0
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });

  test('resetElapsedTime should keep timer at 0 when not playing', () => {
    // Initial state
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Call reset multiple times
    audioPlayer.resetElapsedTime();
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Change status to ready
    mockAudioElement.triggerEvent('canplay');
    expect(appState.get('audioPlayer.status')).toBe('Ready to play');

    // Reset again
    audioPlayer.resetElapsedTime();
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // No timer should be running
    expect(audioPlayer.elapsedTimeInterval).toBeNull();
  });
});