# RadioCalico Testing Strategy

## Overview
This document outlines a comprehensive unit testing framework for RadioCalico's frontend and backend systems.

## Testing Stack Recommendations

### Backend Testing
- **Framework**: Jest
- **Assertion Library**: Built-in Jest matchers
- **Mocking**: Jest mocks for dependencies
- **Database Testing**: SQLite in-memory for tests
- **HTTP Testing**: Supertest for API endpoints
- **Coverage**: Jest built-in coverage with Istanbul

### Frontend Testing
- **Framework**: Jest with JSDOM environment
- **Component Testing**: Testing Library (vanilla JS)
- **Module Mocking**: Jest ES6 module support
- **API Mocking**: MSW (Mock Service Worker)
- **Browser Testing**: Playwright for E2E (future)

## Test Directory Structure

```
tests/
├── backend/
│   ├── unit/
│   │   ├── controllers/
│   │   │   ├── healthController.test.js
│   │   │   ├── userController.test.js
│   │   │   └── songController.test.js
│   │   ├── services/
│   │   │   ├── healthService.test.js
│   │   │   ├── userService.test.js
│   │   │   └── songService.test.js
│   │   └── middleware/
│   │       ├── errorHandler.test.js
│   │       ├── validation.test.js
│   │       └── cors.test.js
│   ├── integration/
│   │   ├── api/
│   │   │   ├── health.test.js
│   │   │   ├── users.test.js
│   │   │   └── songs.test.js
│   │   └── database/
│   │       └── db.test.js
│   └── fixtures/
│       ├── mockData.js
│       └── testDatabase.js
├── frontend/
│   ├── unit/
│   │   ├── modules/
│   │   │   ├── AudioPlayer.test.js
│   │   │   └── RatingSystem.test.js
│   │   ├── services/
│   │   │   ├── ApiService.test.js
│   │   │   ├── MetadataService.test.js
│   │   │   └── iTunesService.test.js
│   │   └── utils/
│   │       ├── AppState.test.js
│   │       └── constants.test.js
│   ├── integration/
│   │   ├── app.test.js
│   │   └── stateManagement.test.js
│   └── mocks/
│       ├── handlers.js        # MSW request handlers
│       └── server.js          # MSW server setup
├── e2e/                       # Future Playwright tests
│   ├── userFlows.test.js
│   └── audioPlayback.test.js
└── setup/
    ├── jest.backend.config.js
    ├── jest.frontend.config.js
    └── testSetup.js
```

## Backend Testing Strategy

### 1. Controller Testing
Controllers should be tested for:
- Request/response handling
- Input validation
- Error response formatting
- Proper service delegation

Example pattern:
```javascript
// tests/backend/unit/controllers/userController.test.js
describe('UserController', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      req.body = { username: 'test', email: 'test@example.com' };

      await userController.createUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 for invalid email', async () => {
      req.body = { username: 'test', email: 'invalid' };

      await userController.createUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
```

### 2. Service Testing
Services contain business logic and should test:
- Data transformation
- Business rules
- External API integration (mocked)
- Database operations (mocked)

Example:
```javascript
// tests/backend/unit/services/songService.test.js
describe('SongService', () => {
  describe('validateRating', () => {
    it('should accept valid ratings (-1, 0, 1)', () => {
      expect(songService.validateRating(1)).toBe(true);
      expect(songService.validateRating(-1)).toBe(true);
      expect(songService.validateRating(0)).toBe(true);
    });

    it('should reject invalid ratings', () => {
      expect(songService.validateRating(2)).toBe(false);
      expect(songService.validateRating('like')).toBe(false);
    });
  });

  describe('generateSongId', () => {
    it('should generate consistent IDs', () => {
      const id1 = songService.generateSongId('Artist', 'Title');
      const id2 = songService.generateSongId('Artist', 'Title');
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different songs', () => {
      const id1 = songService.generateSongId('Artist1', 'Title1');
      const id2 = songService.generateSongId('Artist2', 'Title2');
      expect(id1).not.toBe(id2);
    });
  });
});
```

### 3. Middleware Testing
Test middleware in isolation:
```javascript
// tests/backend/unit/middleware/errorHandler.test.js
describe('ErrorHandler Middleware', () => {
  it('should handle 404 errors', () => {
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    errorHandler.notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('should handle generic errors', () => {
    const error = new Error('Test error');
    const req = {};
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    errorHandler.generic(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
```

### 4. Database Testing
Use in-memory SQLite for fast, isolated tests:
```javascript
// tests/backend/fixtures/testDatabase.js
const sqlite3 = require('sqlite3').verbose();

function createTestDb() {
  const db = new sqlite3.Database(':memory:');

  // Initialize schema
  db.serialize(() => {
    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE song_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id TEXT NOT NULL,
      artist TEXT,
      title TEXT,
      rating INTEGER,
      user_identifier TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });

  return db;
}

module.exports = { createTestDb };
```

## Frontend Testing Strategy

### 1. State Management Testing
Test the reactive state system:
```javascript
// tests/frontend/unit/utils/AppState.test.js
import { AppState } from '../../../../public/js/utils/AppState.js';

describe('AppState', () => {
  let appState;

  beforeEach(() => {
    appState = new AppState();
  });

  describe('subscription system', () => {
    it('should notify subscribers on state change', () => {
      const callback = jest.fn();
      appState.subscribe('test.key', callback);

      appState.set('test.key', 'value');

      expect(callback).toHaveBeenCalledWith('value', undefined);
    });

    it('should handle nested path updates', () => {
      const callback = jest.fn();
      appState.subscribe('currentTrack.artist', callback);

      appState.set('currentTrack.artist', 'Test Artist');

      expect(callback).toHaveBeenCalledWith('Test Artist', undefined);
    });

    it('should support batch updates', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      appState.subscribe('key1', callback1);
      appState.subscribe('key2', callback2);

      appState.setBatch({ key1: 'value1', key2: 'value2' });

      expect(callback1).toHaveBeenCalledOnce();
      expect(callback2).toHaveBeenCalledOnce();
    });
  });
});
```

### 2. Service Testing
Mock external dependencies:
```javascript
// tests/frontend/unit/services/MetadataService.test.js
import { MetadataService } from '../../../../public/js/services/MetadataService.js';

describe('MetadataService', () => {
  let metadataService;
  let mockAppState;

  beforeEach(() => {
    mockAppState = {
      set: jest.fn(),
      setBatch: jest.fn(),
      get: jest.fn()
    };

    global.fetch = jest.fn();
    metadataService = new MetadataService(mockAppState);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('parseQuality', () => {
    it('should parse bit_depth and sample_rate correctly', () => {
      const metadata = { bit_depth: 16, sample_rate: 44100 };

      metadataService.parseQuality(metadata);

      expect(mockAppState.setBatch).toHaveBeenCalledWith({
        'quality.source': '16-bit 44.1kHz',
        'quality.stream': 'HLS Adaptive (up to 48kHz)'
      });
    });

    it('should handle missing quality data', () => {
      mockAppState.get.mockReturnValue('Loading...');
      const metadata = {};

      metadataService.parseQuality(metadata);

      expect(mockAppState.setBatch).toHaveBeenCalledWith({
        'quality.source': 'Unknown',
        'quality.stream': 'Unknown'
      });
    });
  });

  describe('fetchMetadata', () => {
    it('should fetch and parse metadata', async () => {
      const mockMetadata = {
        artist: 'Test Artist',
        title: 'Test Song',
        bit_depth: 24,
        sample_rate: 48000
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });

      await metadataService.fetchMetadata();

      expect(fetch).toHaveBeenCalledWith(
        'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json'
      );
      expect(mockAppState.setBatch).toHaveBeenCalled();
    });
  });
});
```

### 3. Module Testing
Test UI modules with DOM mocking:
```javascript
// tests/frontend/unit/modules/RatingSystem.test.js
import { RatingSystem } from '../../../../public/js/modules/RatingSystem.js';

describe('RatingSystem', () => {
  let ratingSystem;
  let mockAppState;
  let mockApiService;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <button id="thumbsUp">👍</button>
      <button id="thumbsDown">👎</button>
      <span id="thumbsUpCount">0</span>
      <span id="thumbsDownCount">0</span>
    `;

    mockAppState = {
      get: jest.fn(),
      set: jest.fn(),
      subscribe: jest.fn()
    };

    mockApiService = {
      rateSong: jest.fn().mockResolvedValue({ success: true })
    };

    ratingSystem = new RatingSystem(mockAppState, mockApiService);
  });

  it('should handle thumbs up click', async () => {
    mockAppState.get.mockImplementation((key) => {
      if (key === 'currentTrack.artist') return 'Artist';
      if (key === 'currentTrack.title') return 'Title';
      return null;
    });

    const thumbsUpBtn = document.getElementById('thumbsUp');
    thumbsUpBtn.click();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockApiService.rateSong).toHaveBeenCalledWith(
      expect.any(String), 'Artist', 'Title', 1, expect.any(String)
    );
  });
});
```

## Testing Best Practices

### 1. Test Organization
- **AAA Pattern**: Arrange, Act, Assert
- **Single Responsibility**: One test, one behavior
- **Descriptive Names**: Test names should explain what and why
- **Isolation**: Tests should not depend on each other

### 2. Mocking Strategy
- **Mock External Dependencies**: APIs, databases, file system
- **Don't Mock What You Test**: Test real implementation
- **Use Test Doubles Appropriately**:
  - Stub: Provides canned responses
  - Mock: Verifies interactions
  - Spy: Records calls for verification
  - Fake: Simplified working implementation

### 3. Coverage Goals
- **Unit Tests**: 80% coverage minimum
- **Critical Paths**: 100% coverage for:
  - Authentication/authorization
  - Payment processing
  - Data validation
  - Error handling

### 4. Performance
- **Fast Tests**: < 100ms per unit test
- **Parallel Execution**: Use Jest workers
- **In-Memory Databases**: For integration tests
- **Selective Running**: Watch mode for development

## Implementation Phases

### Phase 1: Setup (Week 1)
1. Install testing dependencies
2. Configure Jest for both environments
3. Setup test directory structure
4. Create test utilities and helpers

### Phase 2: Backend Unit Tests (Week 2-3)
1. Controller tests
2. Service tests
3. Middleware tests
4. Database utility tests

### Phase 3: Frontend Unit Tests (Week 3-4)
1. State management tests
2. Service layer tests
3. Module tests
4. Utility function tests

### Phase 4: Integration Tests (Week 5)
1. API endpoint tests
2. Database integration tests
3. Frontend integration tests

### Phase 5: E2E Tests (Week 6)
1. User flow tests
2. Cross-browser testing
3. Performance testing

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run backend tests
        run: npm run test:backend

      - name: Run frontend tests
        run: npm run test:frontend

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:backend": "jest --config=tests/setup/jest.backend.config.js",
    "test:frontend": "jest --config=tests/setup/jest.frontend.config.js",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test"
  }
}
```

## Dependencies to Install

### Production Dependencies
None required for testing

### Development Dependencies
```json
{
  "devDependencies": {
    // Testing Framework
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",

    // Backend Testing
    "supertest": "^6.3.0",

    // Frontend Testing
    "jsdom": "^22.1.0",
    "@testing-library/dom": "^9.3.0",
    "@testing-library/jest-dom": "^6.1.0",
    "msw": "^2.0.0",

    // E2E Testing (Future)
    "@playwright/test": "^1.40.0",

    // Utilities
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

## Monitoring & Reporting

### Coverage Reports
- **Format**: HTML, LCOV, text-summary
- **Thresholds**: 80% statements, 75% branches
- **Badge Generation**: For README
- **Trend Tracking**: Coverage over time

### Test Metrics
- **Execution Time**: Track slow tests
- **Flaky Tests**: Identify and fix
- **Test Count**: Growth over time
- **Coverage Trends**: Improvement tracking

## Conclusion

This testing strategy provides a solid foundation for ensuring RadioCalico's reliability and maintainability. Start with unit tests for critical paths, then expand to integration and E2E tests. Remember: good tests enable confident refactoring and rapid feature development.