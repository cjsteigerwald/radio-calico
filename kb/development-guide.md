# RadioCalico Backend Development Guide

## Quick Start

### Prerequisites
- Node.js 16+
- npm 8+
- SQLite3

### Setup
```bash
# Clone and setup
git clone <repository>
cd radiocalico
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

## Development Workflow

### Project Structure Overview
```
src/
├── server.js          # Application entry point
├── config/            # Configuration management
│   ├── environment.js # Environment variables & defaults
│   ├── database.js    # Database configuration
│   └── index.js       # Configuration exports
├── controllers/       # Request/response handling
│   ├── healthController.js
│   ├── userController.js
│   └── songController.js
├── services/          # Business logic layer
│   ├── healthService.js
│   ├── userService.js
│   └── songService.js
├── routes/           # API route definitions
│   ├── index.js      # Route aggregation
│   ├── health.js     # Health endpoints
│   ├── users.js      # User management
│   └── songs.js      # Song rating
├── middleware/       # Express middleware
│   ├── cors.js       # CORS handling
│   ├── errorHandler.js # Global error handling
│   ├── validation.js # Request validation
│   ├── logging.js    # Request logging
│   └── index.js      # Middleware exports
└── database/         # Data access layer
    └── db.js         # SQLite operations

public/               # Static files (frontend)
kb/                   # Knowledge base (documentation)
tests/                # Test files
```

## Adding New Features

### 1. Adding a New API Endpoint

Follow the MVC pattern: Route → Controller → Service → Database

#### Step 1: Create Service (Business Logic)
```javascript
// src/services/playlistService.js
class PlaylistService {
  static validatePlaylistInput(name, userId) {
    const errors = [];

    if (!name || name.trim().length === 0) {
      errors.push('Playlist name is required');
    }

    if (!userId) {
      errors.push('User ID is required');
    }

    return errors;
  }

  static async createPlaylist(name, userId) {
    const validationErrors = this.validatePlaylistInput(name, userId);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Database operations
    const database = require('../database/db');
    const playlistId = await database.createPlaylist(name.trim(), userId);

    return { playlistId, message: 'Playlist created successfully' };
  }
}

module.exports = PlaylistService;
```

#### Step 2: Create Controller (Request/Response)
```javascript
// src/controllers/playlistController.js
const PlaylistService = require('../services/playlistService');

class PlaylistController {
  static async createPlaylist(req, res) {
    const { name, userId } = req.body;

    try {
      const result = await PlaylistService.createPlaylist(name, userId);
      res.json({ success: true, ...result });
    } catch (error) {
      if (error.message.includes('required')) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }
}

module.exports = PlaylistController;
```

#### Step 3: Create Routes
```javascript
// src/routes/playlists.js
const express = require('express');
const router = express.Router();
const PlaylistController = require('../controllers/playlistController');

router.post('/', PlaylistController.createPlaylist);

module.exports = router;
```

#### Step 4: Mount Routes
```javascript
// src/routes/index.js
const playlistRoutes = require('./playlists');

// Add to existing routes
router.use('/playlists', playlistRoutes);
```

### 2. Adding Middleware

#### Create Middleware
```javascript
// src/middleware/authentication.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
```

#### Export in Middleware Index
```javascript
// src/middleware/index.js
const { authenticateToken } = require('./authentication');

module.exports = {
  // ... existing middleware
  authenticateToken
};
```

#### Use in Routes
```javascript
// src/routes/playlists.js
const { authenticateToken } = require('../middleware');

// Protected route
router.post('/', authenticateToken, PlaylistController.createPlaylist);
```

### 3. Adding Configuration Options

#### Add to Environment Config
```javascript
// src/config/environment.js
const config = {
  // ... existing config

  authentication: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    enableAuth: process.env.ENABLE_AUTH === 'true'
  }
};
```

#### Use Configuration
```javascript
// In middleware or services
const config = require('../config');

jwt.sign(payload, config.authentication.jwtSecret, {
  expiresIn: config.authentication.jwtExpiresIn
});
```

## Code Style Guidelines

### General Principles
- Follow Single Responsibility Principle
- Use clear, descriptive naming
- Keep functions small and focused
- Prefer composition over inheritance
- Handle errors explicitly

### Naming Conventions
```javascript
// Classes: PascalCase
class UserService {}

// Functions and variables: camelCase
const getUserById = () => {};
const currentUser = {};

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;

// Files: camelCase or kebab-case
userService.js
user-controller.js
```

### Error Handling Patterns

#### Service Layer
```javascript
// Throw descriptive errors
throw new Error('User not found');
throw new Error('Invalid email format');
throw new Error('Username already exists');
```

#### Controller Layer
```javascript
// Map service errors to HTTP status codes
try {
  const result = await UserService.createUser(data);
  res.json({ success: true, ...result });
} catch (error) {
  if (error.message.includes('already exists')) {
    res.status(409).json({ success: false, error: error.message });
  } else if (error.message.includes('required') || error.message.includes('Invalid')) {
    res.status(400).json({ success: false, error: error.message });
  } else {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### Response Patterns

#### Successful Response
```javascript
res.json({
  success: true,
  data: result,
  message: 'Operation completed successfully' // optional
});
```

#### Error Response
```javascript
res.status(400).json({
  success: false,
  error: 'Descriptive error message'
});
```

## Testing Guidelines

### Test Structure
```
tests/
├── unit/              # Unit tests for individual components
│   ├── services/      # Service layer tests
│   ├── controllers/   # Controller tests
│   └── middleware/    # Middleware tests
├── integration/       # Integration tests
│   ├── api/          # API endpoint tests
│   └── database/     # Database tests
├── e2e/              # End-to-end tests
└── helpers/          # Test utilities and fixtures
```

### Unit Testing Examples

#### Service Tests
```javascript
// tests/unit/services/userService.test.js
const UserService = require('../../../src/services/userService');

describe('UserService', () => {
  describe('validateUserInput', () => {
    test('should return errors for missing username', () => {
      const errors = UserService.validateUserInput('', 'test@example.com');
      expect(errors).toContain('Username is required');
    });

    test('should return errors for invalid email', () => {
      const errors = UserService.validateUserInput('test', 'invalid-email');
      expect(errors).toContain('Invalid email format');
    });

    test('should return no errors for valid input', () => {
      const errors = UserService.validateUserInput('test', 'test@example.com');
      expect(errors).toHaveLength(0);
    });
  });
});
```

#### Controller Tests
```javascript
// tests/unit/controllers/userController.test.js
const UserController = require('../../../src/controllers/userController');
const UserService = require('../../../src/services/userService');

jest.mock('../../../src/services/userService');

describe('UserController', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  test('should create user successfully', async () => {
    UserService.createUser.mockResolvedValue({ userId: 1, message: 'Success' });
    req.body = { username: 'test', email: 'test@example.com' };

    await UserController.createUser(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      userId: 1,
      message: 'Success'
    });
  });
});
```

### Integration Testing

```javascript
// tests/integration/api/users.test.js
const request = require('supertest');
const app = require('../../../src/server');

describe('POST /api/users', () => {
  test('should create user with valid data', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com'
    };

    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.userId).toBeDefined();
  });

  test('should reject invalid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ username: 'test' }) // missing email
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('email');
  });
});
```

## Database Guidelines

### Database Operations
- Always use parameterized queries
- Handle database errors gracefully
- Use transactions for multi-step operations
- Validate data before database operations

### Adding New Tables
```sql
-- migrations/003_create_playlists.sql
CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### Database Service Methods
```javascript
// src/database/db.js
async function createPlaylist(name, userId) {
  const stmt = db.prepare(`
    INSERT INTO playlists (name, user_id)
    VALUES (?, ?)
  `);

  const result = stmt.run(name, userId);
  return result.lastInsertRowid;
}
```

## Debugging

### Enable Debug Logging
```bash
# Environment variable
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
```

### Add Debug Statements
```javascript
// Use console.log for debugging (remove before commit)
console.log('Debug: Processing user creation', { username, email });

// Use config-based logging
if (config.logging.level === 'debug') {
  console.log('Debug: Database query executed', query);
}
```

### Database Debugging
```javascript
// Enable SQLite debugging
const sqlite3 = require('sqlite3').verbose();

// Log SQL queries in development
if (config.server.nodeEnv === 'development') {
  db.on('trace', (sql) => console.log('SQL:', sql));
}
```

## Performance Optimization

### Database Performance
- Use indices on frequently queried columns
- Implement connection pooling
- Use prepared statements
- Optimize query structure

### Memory Management
- Avoid memory leaks in long-running processes
- Clean up resources properly
- Use appropriate data structures
- Monitor memory usage

### API Performance
- Implement caching where appropriate
- Use compression for large responses
- Optimize database queries
- Consider request batching

## Deployment

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
PORT=8080
DATABASE_FILE=/var/lib/radiocalico/radio.db
ALLOWED_ORIGINS=https://radiocalico.com
ENABLE_REQUEST_LOGGING=false
```

### Health Checks
```bash
# Health check endpoints for monitoring
curl http://localhost:8080/api/health
curl http://localhost:8080/api/health/db
```

### Process Management
```bash
# Using PM2 for process management
npm install -g pm2
pm2 start src/server.js --name radiocalico
pm2 save
pm2 startup
```

## Common Patterns

### Repository Pattern (Future Enhancement)
```javascript
// src/repositories/userRepository.js
class UserRepository {
  static async findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static async create(userData) {
    const stmt = db.prepare(`
      INSERT INTO users (username, email)
      VALUES (?, ?)
    `);
    return stmt.run(userData.username, userData.email);
  }
}
```

### Service Layer Pattern
```javascript
// Business logic in services, not controllers
class UserService {
  static async createUser(username, email) {
    // 1. Validate input
    this.validateInput(username, email);

    // 2. Business rules
    await this.checkUserExists(username, email);

    // 3. Data transformation
    const userData = this.prepareUserData(username, email);

    // 4. Database operation
    return await UserRepository.create(userData);
  }
}
```

## Security Considerations

### Input Validation
- Validate all input data
- Sanitize user input
- Use parameterized queries
- Implement rate limiting

### Error Handling
- Don't expose sensitive information
- Log security events
- Use appropriate HTTP status codes
- Implement proper authentication

### Configuration Security
- Use environment variables for secrets
- Don't commit secrets to version control
- Use proper CORS configuration
- Implement security headers

## Troubleshooting Common Issues

### Database Issues
```bash
# Database file permissions
chmod 644 database/radiocalico.db
chown app:app database/radiocalico.db

# SQLite locked database
rm database/radiocalico.db-wal
rm database/radiocalico.db-shm
```

### Port Issues
```bash
# Find process using port
lsof -i :3000
kill -9 <PID>

# Use different port
PORT=3001 npm run dev
```

### CORS Issues
```javascript
// Add specific origins to CORS config
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Code Review Checklist

### Before Submitting PR
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] No console.log statements in production code
- [ ] Error handling is implemented
- [ ] Documentation is updated
- [ ] Configuration is externalized
- [ ] Security considerations addressed

### Review Criteria
- [ ] Code is readable and maintainable
- [ ] Follows established patterns
- [ ] Has appropriate test coverage
- [ ] Handles errors gracefully
- [ ] Performance considerations addressed
- [ ] Security best practices followed

This guide provides the foundation for contributing to the RadioCalico backend. For specific implementation details, refer to the other documentation files in the `kb/` directory.