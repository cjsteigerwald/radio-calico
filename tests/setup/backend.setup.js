// Backend test setup
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_FILE = ':memory:'; // Use in-memory SQLite for tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn
};

// Global test utilities
global.testHelpers = {
  createMockRequest: (options = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...options
  }),

  createMockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res;
  },

  createMockNext: () => jest.fn()
};

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  try {
    const { db } = require('../../src/database/db');
    if (db) {
      await new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (error) {
    // Database might not have been initialized
  }

  // Clear timers and mocks
  jest.clearAllTimers();
  jest.clearAllMocks();
});