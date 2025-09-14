# Phase 1: Backend Restructuring

## Overview
Separate the monolithic server.js into modular components following MVC architecture patterns and separation of concerns.

## Current Issues
- Single server.js file handling multiple responsibilities
- Routes, business logic, and data access mixed together
- No middleware organization
- Error handling scattered throughout

## Proposed Structure

### 1.1 Route Separation
```
src/
├── routes/
│   ├── health.js       # Health check endpoints
│   ├── users.js        # User management routes
│   ├── songs.js        # Song rating system routes
│   └── index.js        # Route aggregation and mounting
```

**Example: src/routes/songs.js**
```javascript
const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const { validateRating } = require('../middleware/validation');

// Rate a song
router.post('/rate', validateRating, songController.rateSong);

// Get song ratings
router.get('/:songId/ratings', songController.getSongRatings);

module.exports = router;
```

### 1.2 Controllers Layer
```
src/controllers/
├── userController.js   # User-related request handling
└── songController.js   # Song rating request handling
```

**Example: src/controllers/songController.js**
```javascript
const songService = require('../services/songService');

class SongController {
  async rateSong(req, res) {
    try {
      const { songId, artist, title, rating, userIdentifier } = req.body;
      const result = await songService.rateSong(songId, artist, title, userIdentifier, rating);
      res.json({ success: true, ratings: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSongRatings(req, res) {
    try {
      const { songId } = req.params;
      const { userIdentifier } = req.query;
      const result = await songService.getSongRatings(songId, userIdentifier);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new SongController();
```

### 1.3 Services Layer
```
src/services/
├── userService.js     # User business logic
└── songService.js     # Song rating business logic
```

**Example: src/services/songService.js**
```javascript
const database = require('../database/db');

class SongService {
  async rateSong(songId, artist, title, userIdentifier, rating) {
    if (rating === 0) {
      await database.removeSongRating(songId, userIdentifier);
    } else {
      await database.rateSong(songId, artist, title, userIdentifier, rating);
    }

    return await database.getSongRatings(songId);
  }

  async getSongRatings(songId, userIdentifier = null) {
    const ratings = await database.getSongRatings(songId);
    let userRating = null;

    if (userIdentifier) {
      userRating = await database.getUserSongRating(songId, userIdentifier);
    }

    return { ratings, userRating };
  }
}

module.exports = new SongService();
```

### 1.4 Middleware Organization
```
src/middleware/
├── cors.js           # CORS configuration
├── validation.js     # Request validation middleware
├── errorHandler.js   # Centralized error handling
└── index.js         # Middleware aggregation
```

**Example: src/middleware/validation.js**
```javascript
const { body, param, query, validationResult } = require('express-validator');

const validateRating = [
  body('songId').notEmpty().withMessage('Song ID is required'),
  body('artist').notEmpty().withMessage('Artist is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('userIdentifier').notEmpty().withMessage('User identifier is required'),
  body('rating').isIn([1, -1, 0]).withMessage('Rating must be 1, -1, or 0'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

module.exports = { validateRating };
```

### 1.5 Configuration Management
```
src/config/
├── database.js       # Database configuration
├── server.js        # Server settings
└── environment.js   # Environment variables
```

**Example: src/config/server.js**
```javascript
module.exports = {
  port: process.env.PORT || 3000,
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  bodyParser: {
    json: { limit: '10mb' },
    urlencoded: { extended: true, limit: '10mb' }
  }
};
```

### 1.6 Updated server.js
```javascript
const express = require('express');
require('dotenv').config();

const database = require('./database/db');
const routes = require('./routes');
const middleware = require('./middleware');
const config = require('./config/server');

const app = express();

// Apply middleware
middleware.apply(app);

// Mount routes
app.use('/api', routes);

// Serve static files
app.use(express.static('public'));

// Error handling
app.use(middleware.errorHandler);

// Initialize and start server
async function startServer() {
  try {
    await database.initialize();

    const server = app.listen(config.port, () => {
      console.log(`Server running on http://localhost:${config.port}`);
      console.log(`API health check: http://localhost:${config.port}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

## Implementation Steps

1. **Create directory structure** - Set up the new folder organization
2. **Extract route handlers** - Move API endpoints to separate route files
3. **Create controllers** - Extract request/response handling logic
4. **Create services** - Extract business logic from controllers
5. **Organize middleware** - Centralize middleware configuration
6. **Add configuration** - Environment and server config management
7. **Update server.js** - Simplify main server file to orchestration
8. **Add validation** - Implement proper request validation
9. **Add error handling** - Centralized error handling middleware
10. **Test migration** - Ensure all endpoints work after refactoring

## Benefits

- **Separation of Concerns**: Each layer has a single responsibility
- **Testability**: Individual components can be unit tested
- **Maintainability**: Changes isolated to specific layers
- **Scalability**: Easy to add new routes and functionality
- **Code Reuse**: Services can be shared across multiple controllers
- **Error Handling**: Consistent error responses across all endpoints

## Timeline: Week 1-2

- Days 1-3: Create structure and extract routes
- Days 4-7: Create controllers and services
- Days 8-10: Organize middleware and configuration
- Days 11-14: Testing and refinement