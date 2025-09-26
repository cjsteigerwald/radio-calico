/**
 * Tests for AudioPlayer elapsed time behavior
 * Verifies timer stays at 0 until user presses play
 */

import { AudioPlayer } from '../../../public/js/modules/AudioPlayer.js';
import { AppState } from '../../../public/js/utils/AppState.js';

// Mock Hls.js
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

class MockHls {
  constructor() {
    this.listeners = {};
  }

  loadSource() {}
  attachMedia() {}
  on(event, handler) {
    this.listeners[event] = handler;
  }
  trigger(event, data) {
    if (this.listeners[event]) {
      this.listeners[event](event, data);
    }
  }
  startLoad() {}
  recoverMediaError() {}
  destroy() {}
}

describe('AudioPlayer Elapsed Time', () => {
  let audioPlayer;
  let appState;
  let mockAudioElement;
  let mockHls;

  beforeEach(() => {
    // Use fake timers for testing intervals
    jest.useFakeTimers();
    // Clear any existing audio elements
    document.body.innerHTML = '';

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

    // Mock createElement to return our mock audio element
    document.createElement = jest.fn((tag) => {
      if (tag === 'audio') {
        return mockAudioElement;
      }
      return document.createElement.bind(document)(tag);
    });

    document.body.appendChild = jest.fn();

    // Mock Hls constructor
    global.Hls = jest.fn(() => {
      mockHls = new MockHls();
      return mockHls;
    });
    global.Hls.isSupported = jest.fn(() => true);
    global.Hls.Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError'
    };
    global.Hls.ErrorTypes = {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError'
    };

    // Create AudioPlayer instance
    audioPlayer = new AudioPlayer(appState);
  });

  afterEach(() => {
    // Clean up
    if (audioPlayer) {
      audioPlayer.destroy();
    }
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('elapsed time should be 0 on initialization', () => {
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });

  test('elapsed time should stay at 0 when loadstart event fires', () => {
    // Get the loadstart handler
    const loadstartHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'loadstart')[1];

    // Set some non-zero value
    appState.set('audioPlayer.elapsedTime', 15);

    // Trigger loadstart
    loadstartHandler();

    // Should reset to 0
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
    expect(appState.get('audioPlayer.status')).toBe('Loading stream...');
  });

  test('elapsed time should stay at 0 when canplay event fires', () => {
    // Get the canplay handler
    const canplayHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'canplay')[1];

    // Set some non-zero value
    appState.set('audioPlayer.elapsedTime', 15);

    // Trigger canplay
    canplayHandler();

    // Should reset to 0
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
    expect(appState.get('audioPlayer.status')).toBe('Ready to play');
  });

  test('elapsed time should stay at 0 when HLS manifest is parsed', () => {
    // Set some non-zero value
    appState.set('audioPlayer.elapsedTime', 15);

    // Trigger HLS manifest parsed event
    mockHls.trigger(global.Hls.Events.MANIFEST_PARSED);

    // Should reset to 0
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
    expect(appState.get('audioPlayer.status')).toBe('Stream ready');
  });

  test('elapsed time should stay at 0 during buffering if not playing', () => {
    // Get the waiting handler
    const waitingHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'waiting')[1];

    // Ensure audio is paused
    mockAudioElement.paused = true;

    // Set some non-zero value
    appState.set('audioPlayer.elapsedTime', 15);

    // Trigger waiting event
    waitingHandler();

    // Should reset to 0 since audio is paused
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
    expect(appState.get('audioPlayer.status')).toBe('Buffering...');
  });

  test('elapsed time should not change during buffering if already playing', () => {
    // Get the waiting handler and play handler
    const waitingHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'waiting')[1];
    const playHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'play')[1];

    // Simulate playing state properly
    mockAudioElement.paused = false;
    playHandler(); // This sets isPlaying to true
    appState.set('audioPlayer.elapsedTime', 45); // Now we can set non-zero value

    // Trigger waiting event
    waitingHandler();

    // Should not reset since audio is playing
    expect(appState.get('audioPlayer.elapsedTime')).toBe(45);
    expect(appState.get('audioPlayer.status')).toBe('Buffering...');
  });

  test('elapsed time counter should not start if audio is paused', () => {
    // Ensure audio is paused
    mockAudioElement.paused = true;

    // Try to start the counter
    audioPlayer.startElapsedTimeCounter();

    // Timer interval should not be set
    expect(audioPlayer.elapsedTimeInterval).toBeNull();
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });

  test('elapsed time counter should start when audio is playing', () => {
    // Simulate playing state
    mockAudioElement.paused = false;

    // Start the counter
    audioPlayer.startElapsedTimeCounter();

    // Timer interval should be set
    expect(audioPlayer.elapsedTimeInterval).not.toBeNull();
  });

  test('elapsed time should only increment after play event', async () => {
    // Get the play handler
    const playHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'play')[1];

    // Initial state - paused
    expect(mockAudioElement.paused).toBe(true);
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Mock Date.now() for consistent timing
    const originalNow = Date.now;
    let currentTime = 1000000;
    Date.now = jest.fn(() => currentTime);

    // Simulate user clicking play
    mockAudioElement.paused = false;
    playHandler();

    // Should start counting
    expect(appState.get('audioPlayer.isPlaying')).toBe(true);
    expect(audioPlayer.elapsedTimeInterval).not.toBeNull();

    // Advance time by 2 seconds
    currentTime += 2000;
    jest.advanceTimersByTime(2000);

    // Elapsed time should have incremented
    expect(appState.get('audioPlayer.elapsedTime')).toBeGreaterThanOrEqual(1);

    // Restore Date.now
    Date.now = originalNow;
  });

  test('elapsed time should stop incrementing on pause', () => {
    // Get handlers
    const playHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'play')[1];
    const pauseHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'pause')[1];

    // Mock Date.now() for consistent timing
    const originalNow = Date.now;
    let currentTime = 1000000;
    Date.now = jest.fn(() => currentTime);

    // Start playing
    mockAudioElement.paused = false;
    playHandler();

    // Let it run for 3 seconds
    currentTime += 3000;
    jest.advanceTimersByTime(3000);
    const elapsedBeforePause = appState.get('audioPlayer.elapsedTime');
    expect(elapsedBeforePause).toBeGreaterThanOrEqual(2);

    // Pause
    mockAudioElement.paused = true;
    pauseHandler();

    // Timer should stop
    expect(audioPlayer.elapsedTimeInterval).toBeNull();

    // Wait 2 more seconds
    currentTime += 2000;
    jest.advanceTimersByTime(2000);

    // Elapsed time should not have changed
    expect(appState.get('audioPlayer.elapsedTime')).toBe(elapsedBeforePause);

    // Restore Date.now
    Date.now = originalNow;
  });

  test('resetElapsedTime should reset timer to 0', () => {
    // Set some elapsed time
    appState.set('audioPlayer.elapsedTime', 120);
    audioPlayer.pausedTime = 120;

    // Reset
    audioPlayer.resetElapsedTime();

    // Should be back to 0
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
    expect(audioPlayer.pausedTime).toBe(0);
    expect(audioPlayer.startTime).toBe(Date.now());
  });

  test('multiple status changes before play should keep timer at 0', () => {
    const loadstartHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'loadstart')[1];
    const canplayHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'canplay')[1];
    const waitingHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'waiting')[1];

    // Simulate typical loading sequence
    loadstartHandler(); // Loading stream...
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    waitingHandler(); // Buffering...
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    canplayHandler(); // Ready to play
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // HLS manifest parsed
    mockHls.trigger(global.Hls.Events.MANIFEST_PARSED);
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Another buffering event
    waitingHandler();
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Ready again
    canplayHandler();
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);

    // Timer should still be at 0
    expect(appState.get('audioPlayer.status')).toBe('Ready to play');
    expect(appState.get('audioPlayer.elapsedTime')).toBe(0);
  });
});