// Frontend test setup
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock Audio API
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  volume: 1,
  currentTime: 0,
  duration: 0,
  paused: true
}));

// Mock HLS.js
global.Hls = {
  isSupported: jest.fn(() => true),
  Events: {
    MANIFEST_PARSED: 'MANIFEST_PARSED',
    ERROR: 'ERROR'
  }
};

// Setup DOM cleanup after each test
afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  jest.clearAllMocks();
  localStorageMock.clear();
});

// Global test utilities for frontend
global.createMockAppState = () => ({
  state: {},
  listeners: new Map(),
  get: jest.fn(),
  set: jest.fn(),
  setBatch: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
});

global.waitFor = (callback, options = {}) => {
  const { timeout = 1000, interval = 50 } = options;
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      try {
        callback();
        resolve();
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
        } else {
          setTimeout(check, interval);
        }
      }
    };

    check();
  });
};