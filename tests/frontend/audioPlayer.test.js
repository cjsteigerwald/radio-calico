/**
 * Tests for AudioPlayer elapsed time functionality
 * Ensures elapsed time resets correctly on track changes
 */

import { jest } from '@jest/globals';
import { AudioPlayer } from '../../public/js/modules/AudioPlayer.js';

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

describe('AudioPlayer - Elapsed Time', () => {
  let audioPlayer;
  let mockAppState;
  let mockAudioElement;

  beforeEach(() => {
    // Clear all timers
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Mock appState
    mockAppState = {
      get: jest.fn((key) => {
        if (key === 'audioPlayer.volume') return 0.5;
        return null;
      }),
      set: jest.fn(),
      setBatch: jest.fn()
    };

    // Mock audio element
    mockAudioElement = {
      play: jest.fn().mockResolvedValue(),
      pause: jest.fn(),
      paused: false,
      volume: 0.5,
      currentTime: 0,
      duration: 0,
      readyState: 0,
      addEventListener: jest.fn(),
      style: {},
      preload: 'none'
    };

    // Mock document.createElement
    jest.spyOn(document, 'createElement').mockReturnValue(mockAudioElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});

    // Mock Hls constructor
    global.Hls = jest.fn().mockImplementation(() => ({
      loadSource: jest.fn(),
      attachMedia: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
      startLoad: jest.fn(),
      recoverMediaError: jest.fn()
    }));
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
    audioPlayer = new AudioPlayer(mockAppState);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('resetElapsedTime', () => {
    it('should reset startTime to current time', () => {
      // Set initial startTime
      const initialTime = Date.now() - 10000; // 10 seconds ago
      audioPlayer.startTime = initialTime;

      // Call resetElapsedTime
      audioPlayer.resetElapsedTime();

      // Verify startTime was updated
      expect(audioPlayer.startTime).toBeGreaterThan(initialTime);
      expect(audioPlayer.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should set elapsed time to 0 in appState', () => {
      // Call resetElapsedTime
      audioPlayer.resetElapsedTime();

      // Verify appState was updated with 0
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 0);
    });

    it('should be callable even when timer is running', () => {
      // Start the elapsed time counter
      audioPlayer.startElapsedTimeCounter();

      // Advance timer to simulate elapsed time
      jest.advanceTimersByTime(5000);

      // Reset elapsed time
      audioPlayer.resetElapsedTime();

      // Verify reset was successful
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 0);
    });
  });

  describe('startElapsedTimeCounter', () => {
    it('should update elapsed time every second', () => {
      // Start the counter
      audioPlayer.startElapsedTimeCounter();

      // Advance time by 1 second
      jest.advanceTimersByTime(1000);
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 1);

      // Advance time by another 2 seconds
      jest.advanceTimersByTime(2000);
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 3);

      // Advance time by another 5 seconds
      jest.advanceTimersByTime(5000);
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 8);
    });

    it('should continue from 0 after resetElapsedTime is called', () => {
      // Start the counter
      audioPlayer.startElapsedTimeCounter();

      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 5);

      // Reset elapsed time (simulating track change)
      audioPlayer.resetElapsedTime();

      // Clear previous calls to focus on new behavior
      mockAppState.set.mockClear();

      // Advance time by 3 more seconds
      jest.advanceTimersByTime(3000);

      // Should show 3 seconds, not 8
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 3);
    });

    it('should handle multiple resets correctly', () => {
      // Start the counter
      audioPlayer.startElapsedTimeCounter();

      // First period: 4 seconds
      jest.advanceTimersByTime(4000);
      expect(mockAppState.set).toHaveBeenLastCalledWith('audioPlayer.elapsedTime', 4);

      // First reset
      audioPlayer.resetElapsedTime();
      mockAppState.set.mockClear();

      // Second period: 2 seconds
      jest.advanceTimersByTime(2000);
      expect(mockAppState.set).toHaveBeenLastCalledWith('audioPlayer.elapsedTime', 2);

      // Second reset
      audioPlayer.resetElapsedTime();
      mockAppState.set.mockClear();

      // Third period: 6 seconds
      jest.advanceTimersByTime(6000);
      expect(mockAppState.set).toHaveBeenLastCalledWith('audioPlayer.elapsedTime', 6);
    });
  });

  describe('stopElapsedTimeCounter', () => {
    it('should stop updating elapsed time when called', () => {
      // Start the counter
      audioPlayer.startElapsedTimeCounter();

      // Advance time and verify it's working
      jest.advanceTimersByTime(2000);
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 2);

      // Stop the counter
      audioPlayer.stopElapsedTimeCounter();
      mockAppState.set.mockClear();

      // Advance time more - should not update
      jest.advanceTimersByTime(3000);
      expect(mockAppState.set).not.toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      // Start the counter
      audioPlayer.startElapsedTimeCounter();

      // Stop multiple times - should not throw
      expect(() => {
        audioPlayer.stopElapsedTimeCounter();
        audioPlayer.stopElapsedTimeCounter();
        audioPlayer.stopElapsedTimeCounter();
      }).not.toThrow();
    });
  });

  describe('Play/Pause integration', () => {
    it('should start elapsed time counter when play event fires', () => {
      // Get the play event handler
      const playHandler = mockAudioElement.addEventListener.mock.calls
        .find(call => call[0] === 'play')[1];

      // Trigger play event
      playHandler();

      // Verify counter started
      jest.advanceTimersByTime(1000);
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 1);
    });

    it('should stop elapsed time counter when pause event fires', () => {
      // Get event handlers
      const playHandler = mockAudioElement.addEventListener.mock.calls
        .find(call => call[0] === 'play')[1];
      const pauseHandler = mockAudioElement.addEventListener.mock.calls
        .find(call => call[0] === 'pause')[1];

      // Start playing
      playHandler();
      jest.advanceTimersByTime(3000);
      expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 3);

      // Pause
      pauseHandler();
      mockAppState.set.mockClear();

      // Time should not advance
      jest.advanceTimersByTime(2000);
      expect(mockAppState.set).not.toHaveBeenCalledWith(
        'audioPlayer.elapsedTime',
        expect.any(Number)
      );
    });
  });

  describe('formatTime', () => {
    it('should format seconds to MM:SS correctly', () => {
      expect(audioPlayer.formatTime(0)).toBe('0:00');
      expect(audioPlayer.formatTime(5)).toBe('0:05');
      expect(audioPlayer.formatTime(59)).toBe('0:59');
      expect(audioPlayer.formatTime(60)).toBe('1:00');
      expect(audioPlayer.formatTime(61)).toBe('1:01');
      expect(audioPlayer.formatTime(600)).toBe('10:00');
      expect(audioPlayer.formatTime(3599)).toBe('59:59');
      expect(audioPlayer.formatTime(3600)).toBe('60:00');
    });
  });
});

describe('AudioPlayer - Track Change Integration', () => {
  let audioPlayer;
  let mockAppState;
  let mockAudioElement;

  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();

    mockAppState = {
      get: jest.fn((key) => {
        if (key === 'audioPlayer.volume') return 0.5;
        return null;
      }),
      set: jest.fn(),
      setBatch: jest.fn()
    };

    mockAudioElement = {
      play: jest.fn().mockResolvedValue(),
      pause: jest.fn(),
      paused: false,
      volume: 0.5,
      addEventListener: jest.fn(),
      style: {},
      preload: 'none'
    };

    jest.spyOn(document, 'createElement').mockReturnValue(mockAudioElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});

    global.Hls = jest.fn().mockImplementation(() => ({
      loadSource: jest.fn(),
      attachMedia: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn()
    }));
    global.Hls.isSupported = jest.fn(() => true);
    global.Hls.Events = { MANIFEST_PARSED: 'hlsManifestParsed', ERROR: 'hlsError' };
    global.Hls.ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' };

    audioPlayer = new AudioPlayer(mockAppState);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should handle track change event correctly while playing', () => {
    // Start playing
    const playHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'play')[1];
    playHandler();

    // Let some time pass (simulating current track playing)
    jest.advanceTimersByTime(30000); // 30 seconds
    expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 30);

    // Simulate track change by calling resetElapsedTime
    audioPlayer.resetElapsedTime();

    // Clear previous calls to check new behavior
    mockAppState.set.mockClear();

    // Continue playing new track
    jest.advanceTimersByTime(5000); // 5 seconds into new track

    // Should show 5 seconds, not 35
    expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 5);
  });

  it('should not affect elapsed time if paused during track change', () => {
    // Get event handlers
    const playHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'play')[1];
    const pauseHandler = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'pause')[1];

    // Start playing
    playHandler();
    jest.advanceTimersByTime(15000); // 15 seconds

    // Pause
    pauseHandler();
    mockAudioElement.paused = true;

    // Track changes while paused
    audioPlayer.resetElapsedTime();
    expect(mockAppState.set).toHaveBeenCalledWith('audioPlayer.elapsedTime', 0);

    mockAppState.set.mockClear();

    // Time passes while paused
    jest.advanceTimersByTime(5000);

    // Elapsed time should remain at 0
    expect(mockAppState.set).not.toHaveBeenCalled();
  });
});