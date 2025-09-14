# Phase 5: Testing & Quality Assurance

## Overview
Implement comprehensive testing strategies, documentation standards, and code quality measures to ensure reliability, maintainability, and accessibility of the RadioCalico application.

## Current Issues
- No automated testing in place
- No code coverage metrics
- No accessibility testing
- Limited error handling validation
- No performance monitoring
- Lack of comprehensive documentation

## Proposed Testing Strategy

### 5.1 Testing Structure

```
tests/
├── unit/
│   ├── api/
│   │   ├── BaseApiClient.test.js
│   │   ├── RadioCalicoAPI.test.js
│   │   ├── MetadataAPI.test.js
│   │   └── iTunesAPI.test.js
│   ├── modules/
│   │   ├── AudioPlayer.test.js
│   │   ├── MetadataService.test.js
│   │   ├── RatingSystem.test.js
│   │   └── UIController.test.js
│   ├── services/
│   │   ├── TrackService.test.js
│   │   └── userService.test.js
│   ├── utils/
│   │   ├── Formatters.test.js
│   │   ├── EventEmitter.test.js
│   │   └── StorageManager.test.js
│   └── state/
│       └── AppState.test.js
├── integration/
│   ├── api-integration.test.js
│   ├── player-workflow.test.js
│   └── rating-system.test.js
├── e2e/
│   ├── player-functionality.test.js
│   ├── responsive-design.test.js
│   └── accessibility.test.js
├── performance/
│   ├── load-testing.test.js
│   └── memory-usage.test.js
├── fixtures/
│   ├── metadata-samples.json
│   ├── itunes-responses.json
│   └── user-scenarios.json
└── helpers/
    ├── test-utils.js
    ├── mock-server.js
    └── dom-helpers.js
```

### 5.2 Unit Testing Framework

#### Jest Configuration
```javascript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'public/js/**/*.js',
    'src/**/*.js',
    '!src/server.js',
    '!**/*.config.js',
    '!**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/public/js/$1'
  }
};
```

#### Test Setup
```javascript
// tests/setup.js
import { TextEncoder, TextDecoder } from 'util';
import 'whatwg-fetch';

// Polyfills for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock audio element
global.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
global.HTMLMediaElement.prototype.pause = jest.fn();
global.HTMLMediaElement.prototype.load = jest.fn();

// Mock HLS.js
global.Hls = {
  isSupported: jest.fn(() => true),
  Events: {
    MANIFEST_PARSED: 'manifestParsed',
    FRAG_LOADING: 'fragLoading',
    FRAG_LOADED: 'fragLoaded',
    ERROR: 'hlsError'
  },
  ErrorTypes: {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError'
  }
};

// Console error suppression for tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
```

### 5.3 Example Unit Tests

#### API Client Testing
```javascript
// tests/unit/api/BaseApiClient.test.js
import { BaseApiClient } from '@/api/BaseApiClient.js';
import { ApiError } from '@/api/ApiError.js';

// Mock fetch
global.fetch = jest.fn();

describe('BaseApiClient', () => {
  let apiClient;

  beforeEach(() => {
    apiClient = new BaseApiClient('https://api.example.com');
    fetch.mockClear();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { success: true, data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: expect.any(AbortSignal)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should retry failed requests', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          headers: new Map([['content-type', 'application/json']])
        });

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should throw ApiError on permanent failure', async () => {
      fetch.mockRejectedValue(new Error('Permanent error'));

      await expect(apiClient.get('/test')).rejects.toThrow(ApiError);
      expect(fetch).toHaveBeenCalledTimes(3); // Original + 2 retries
    });

    it('should timeout long requests', async () => {
      const apiClientWithTimeout = new BaseApiClient('https://api.example.com', { timeout: 100 });

      fetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      await expect(apiClientWithTimeout.get('/test')).rejects.toThrow();
    });
  });

  describe('POST requests', () => {
    it('should send JSON data correctly', async () => {
      const testData = { name: 'test', value: 123 };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
        headers: new Map([['content-type', 'application/json']])
      });

      await apiClient.post('/create', testData);

      expect(fetch).toHaveBeenCalledWith('https://api.example.com/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
        signal: expect.any(AbortSignal)
      });
    });
  });

  describe('Interceptors', () => {
    it('should apply request interceptors', async () => {
      const interceptor = jest.fn((config) => {
        config.headers['X-Custom'] = 'test';
        return config;
      });

      apiClient.addRequestInterceptor(interceptor);

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Map([['content-type', 'application/json']])
      });

      await apiClient.get('/test');

      expect(interceptor).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'test'
          })
        })
      );
    });
  });
});
```

#### Component Testing
```javascript
// tests/unit/modules/AudioPlayer.test.js
import { AudioPlayer } from '@/modules/AudioPlayer.js';

describe('AudioPlayer', () => {
  let audioPlayer;
  let mockAudioElement;

  beforeEach(() => {
    // Mock audio element
    mockAudioElement = {
      addEventListener: jest.fn(),
      play: jest.fn(() => Promise.resolve()),
      pause: jest.fn(),
      volume: 1,
      currentTime: 0
    };

    document.getElementById = jest.fn().mockReturnValue(mockAudioElement);

    audioPlayer = new AudioPlayer();
  });

  afterEach(() => {
    audioPlayer?.destroy();
  });

  it('should initialize with correct default state', () => {
    expect(audioPlayer.isPlaying).toBe(false);
    expect(audioPlayer.volume).toBe(0.7);
    expect(audioPlayer.audioElement).toBe(mockAudioElement);
  });

  it('should play audio successfully', async () => {
    const playPromise = audioPlayer.play();

    expect(mockAudioElement.play).toHaveBeenCalled();
    await expect(playPromise).resolves.toBeUndefined();
    expect(audioPlayer.isPlaying).toBe(true);
  });

  it('should handle play errors', async () => {
    const error = new Error('Play failed');
    mockAudioElement.play.mockRejectedValue(error);

    const errorListener = jest.fn();
    audioPlayer.on('error', errorListener);

    await audioPlayer.play();

    expect(errorListener).toHaveBeenCalledWith('Play failed');
    expect(audioPlayer.isPlaying).toBe(false);
  });

  it('should pause audio', () => {
    audioPlayer.isPlaying = true;
    audioPlayer.pause();

    expect(mockAudioElement.pause).toHaveBeenCalled();
    expect(audioPlayer.isPlaying).toBe(false);
  });

  it('should set volume correctly', () => {
    audioPlayer.setVolume(0.5);

    expect(audioPlayer.volume).toBe(0.5);
    expect(mockAudioElement.volume).toBe(0.5);
  });

  it('should emit timeupdate events', () => {
    const timeUpdateListener = jest.fn();
    audioPlayer.on('timeupdate', timeUpdateListener);

    // Simulate time update
    mockAudioElement.currentTime = 30;
    const timeUpdateCallback = mockAudioElement.addEventListener.mock.calls
      .find(call => call[0] === 'timeupdate')[1];

    timeUpdateCallback();

    expect(timeUpdateListener).toHaveBeenCalledWith({
      currentTime: 30,
      formattedTime: '00:30'
    });
  });
});
```

### 5.4 Integration Testing

```javascript
// tests/integration/player-workflow.test.js
import { AudioPlayer } from '@/modules/AudioPlayer.js';
import { MetadataService } from '@/modules/MetadataService.js';
import { TrackService } from '@/services/TrackService.js';
import { AppState } from '@/state/AppState.js';

describe('Player Workflow Integration', () => {
  let appState;
  let audioPlayer;
  let trackService;
  let metadataService;

  beforeEach(() => {
    appState = new AppState();
    audioPlayer = new AudioPlayer();
    trackService = new TrackService(appState);
    metadataService = new MetadataService();

    // Mock API responses
    global.fetch = jest.fn();
  });

  afterEach(() => {
    trackService?.destroy();
    metadataService?.destroy();
    audioPlayer?.destroy();
  });

  it('should complete full playback workflow', async () => {
    // Mock metadata response
    const mockMetadata = {
      artist: 'Test Artist',
      title: 'Test Song',
      album: 'Test Album',
      bit_depth: 24,
      sample_rate: 44100
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMetadata
    });

    // Mock iTunes artwork response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          artworkUrl100: 'https://example.com/artwork100x100.jpg'
        }]
      })
    });

    // Start the workflow
    await trackService.fetchMetadata();

    // Verify state updates
    const currentTrack = appState.get('currentTrack');
    expect(currentTrack.artist).toBe('Test Artist');
    expect(currentTrack.title).toBe('Test Song');
    expect(currentTrack.artworkUrl).toBe('https://example.com/artwork600x600.jpg');

    // Test playback
    await audioPlayer.play();
    expect(appState.get('isPlaying')).toBe(true);

    audioPlayer.pause();
    expect(appState.get('isPlaying')).toBe(false);
  });

  it('should handle rating workflow', async () => {
    // Set up current track
    appState.setCurrentTrack({
      artist: 'Test Artist',
      title: 'Test Song'
    });

    // Mock rating API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        ratings: { thumbs_up: 5, thumbs_down: 1 }
      })
    });

    const result = await trackService.rateSong(1);

    expect(result.thumbs_up).toBe(5);
    expect(appState.get('ratings').get('VGVzdEFydGlzdC1UZXN0U29uZw')).toBe(1);
  });
});
```

### 5.5 End-to-End Testing (Playwright)

```javascript
// tests/e2e/player-functionality.test.js
import { test, expect } from '@playwright/test';

test.describe('RadioCalico Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/radio.html');
  });

  test('should load player interface correctly', async ({ page }) => {
    await expect(page.locator('.header-title')).toHaveText('Radio Calico');
    await expect(page.locator('.play-btn')).toBeVisible();
    await expect(page.locator('.volume-slider')).toBeVisible();
    await expect(page.locator('#status')).toContainText('Ready to play');
  });

  test('should start playback when play button is clicked', async ({ page }) => {
    // Mock the audio play method
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.resolve();
    });

    await page.click('.play-btn');

    await expect(page.locator('#pauseIcon')).toBeVisible();
    await expect(page.locator('#playIcon')).toBeHidden();
    await expect(page.locator('#status')).toContainText('Playing');
  });

  test('should adjust volume with slider', async ({ page }) => {
    const volumeSlider = page.locator('#volumeSlider');

    await volumeSlider.fill('50');

    // Check if volume was applied (you'd need to check audio element volume)
    const volume = await volumeSlider.inputValue();
    expect(volume).toBe('50');
  });

  test('should display track information when metadata loads', async ({ page }) => {
    // Mock metadata API response
    await page.route('**/metadatav2.json', route => {
      route.fulfill({
        json: {
          artist: 'Mock Artist',
          title: 'Mock Song',
          album: 'Mock Album',
          bit_depth: 24,
          sample_rate: 44100
        }
      });
    });

    // Trigger metadata fetch
    await page.click('.play-btn');

    await expect(page.locator('#trackArtist')).toContainText('Mock Artist');
    await expect(page.locator('#trackTitle')).toContainText('Mock Song');
    await expect(page.locator('#sourceQuality')).toContainText('24-bit');
  });

  test('should handle rating functionality', async ({ page }) => {
    // Set up current track
    await page.evaluate(() => {
      window.appState.setCurrentTrack({
        artist: 'Test Artist',
        title: 'Test Song'
      });
    });

    // Mock rating API
    await page.route('**/api/songs/rate', route => {
      route.fulfill({
        json: { success: true, ratings: { thumbs_up: 1, thumbs_down: 0 } }
      });
    });

    await page.click('#thumbsUp');

    await expect(page.locator('#thumbsUpCount')).toHaveText('1');
    await expect(page.locator('#thumbsUp')).toHaveClass(/active/);
  });
});
```

### 5.6 Accessibility Testing

```javascript
// tests/e2e/accessibility.test.js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/radio.html');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be navigable with keyboard', async ({ page }) => {
    await page.goto('/radio.html');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator('.play-btn')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#volumeSlider')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#thumbsUp')).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/radio.html');

    await expect(page.locator('.play-btn')).toHaveAttribute('aria-label', 'Play/Pause');
    await expect(page.locator('#volumeSlider')).toHaveAttribute('aria-label', /volume/i);
  });

  test('should announce state changes to screen readers', async ({ page }) => {
    await page.goto('/radio.html');

    // Check for live regions
    await expect(page.locator('#status')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#trackArtist')).toHaveAttribute('aria-live', 'polite');
  });
});
```

### 5.7 Performance Testing

```javascript
// tests/performance/load-testing.test.js
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/radio.html');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 seconds
  });

  test('should not have memory leaks during extended use', async ({ page }) => {
    await page.goto('/radio.html');

    // Simulate extended usage
    for (let i = 0; i < 10; i++) {
      await page.click('.play-btn');
      await page.waitForTimeout(500);
      await page.click('.play-btn');
      await page.waitForTimeout(500);
    }

    // Check memory usage (this would need a more sophisticated implementation)
    const memoryUsage = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });

    expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
});
```

### 5.8 Documentation Standards

#### JSDoc Configuration
```javascript
// jsdoc.config.js
module.exports = {
  source: {
    include: ['./public/js/', './src/'],
    exclude: ['node_modules/', 'tests/']
  },
  opts: {
    destination: './docs/api/',
    readme: './README.md'
  },
  plugins: ['plugins/markdown'],
  templates: {
    cleverLinks: false,
    monospaceLinks: false
  }
};
```

#### Example Documentation
```javascript
/**
 * RadioCalico Audio Player
 * @class AudioPlayer
 * @extends EventEmitter
 * @description Manages HLS audio streaming with playback controls
 *
 * @example
 * const player = new AudioPlayer();
 * player.on('play', () => console.log('Playback started'));
 * await player.play();
 */
class AudioPlayer extends EventEmitter {
  /**
   * Initialize the audio player
   * @constructor
   * @param {Object} options - Configuration options
   * @param {number} [options.volume=0.7] - Initial volume (0-1)
   * @param {string} [options.streamUrl] - HLS stream URL
   */
  constructor(options = {}) {
    // Implementation
  }

  /**
   * Start audio playback
   * @async
   * @method play
   * @returns {Promise<void>} Resolves when playback starts
   * @throws {Error} When playback fails
   *
   * @example
   * try {
   *   await player.play();
   *   console.log('Playing...');
   * } catch (error) {
   *   console.error('Playback failed:', error);
   * }
   */
  async play() {
    // Implementation
  }
}
```

## Implementation Steps

1. **Set up testing framework** - Jest, Playwright configuration
2. **Create test utilities** - Helpers, mocks, fixtures
3. **Write unit tests** - API clients, modules, utilities
4. **Add integration tests** - Workflow and component interaction
5. **Implement E2E tests** - User scenarios and UI testing
6. **Set up accessibility testing** - Axe-core integration
7. **Add performance testing** - Load time and memory usage
8. **Create documentation** - JSDoc and user guides
9. **Set up code coverage** - Coverage reports and thresholds
10. **Integrate with CI/CD** - Automated testing pipeline

## Benefits

- **Reliability**: Catch bugs before production
- **Maintainability**: Refactor with confidence
- **Documentation**: Self-documenting codebase
- **Accessibility**: Inclusive user experience
- **Performance**: Monitor and optimize speed
- **Quality Assurance**: Consistent code standards
- **Developer Confidence**: Safe deployment process

## Timeline: Week 7

- Days 1-2: Unit testing framework and basic tests
- Days 3-4: Integration and E2E testing
- Days 5-6: Accessibility and performance testing
- Day 7: Documentation and CI integration