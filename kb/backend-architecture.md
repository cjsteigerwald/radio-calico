# RadioCalico Backend Architecture

## Overview

The RadioCalico backend has been refactored from a monolithic architecture into a modern MVC (Model-View-Controller) pattern with clear separation of concerns. This document outlines the current backend architecture, components, and design decisions.

## Architecture Pattern

### Before Refactoring
```
src/server.js (125 lines)
├── All routes defined inline
├── Business logic mixed with routing
├── No error handling strategy
├── Hard-coded configurations
└── Direct database calls from routes
```

### After Refactoring (Phase 1)
```
src/
├── server.js (63 lines) - Application entry point
├── config/ - Configuration management
├── controllers/ - Request/response handling
├── services/ - Business logic layer
├── routes/ - API route definitions
├── middleware/ - Express middleware
└── database/ - Data access layer (existing)
```

## Component Architecture

### 1. Application Entry Point (`src/server.js`)

The main server file orchestrates the application startup and middleware pipeline:

```javascript
// Middleware Pipeline
1. Request Logging (optional)
2. CORS Headers
3. Request Size Validation
4. Content-Type Validation
5. Body Parsing (JSON/URL-encoded)
6. Static File Serving
7. API Routes
8. Error Handling (catch-all)
```

**Key Features:**
- Environment-based configuration
- Graceful shutdown handlers (SIGTERM/SIGINT)
- Database initialization before server start
- Comprehensive error handling

### 2. Configuration Layer (`src/config/`)

Centralized configuration management with environment variable support.

**Files:**
- `environment.js` - Main configuration object
- `database.js` - Database-specific configuration
- `index.js` - Configuration exports

**Configuration Sections:**
```javascript
{
  server: { port, host, nodeEnv },
  database: { file, connectionPoolSize },
  cors: { allowedOrigins, credentials },
  security: { rateLimitWindow, rateLimitMax, maxRequestSize },
  logging: { level, enableRequestLogging }
}
```

### 3. Routes Layer (`src/routes/`)

Clean route definitions with controller delegation.

**Files:**
- `index.js` - Route aggregation and mounting
- `health.js` - Health check routes
- `users.js` - User management routes
- `songs.js` - Song rating routes

**Route Structure:**
```
/api
├── /health
│   ├── GET / - Basic health check
│   └── GET /db - Database health check
├── /test-db - Legacy database endpoint
├── /users
│   ├── POST / - Create user
│   └── GET / - Get all users
└── /songs
    ├── POST /rate - Rate a song
    └── GET /:songId/ratings - Get song ratings
```

### 4. Controllers Layer (`src/controllers/`)

Request/response handling with proper HTTP status codes.

**Files:**
- `healthController.js` - Health check logic
- `userController.js` - User management logic
- `songController.js` - Song rating logic

**Controller Responsibilities:**
- Extract request parameters
- Validate basic request structure
- Call appropriate service methods
- Handle service responses/errors
- Return proper HTTP status codes

### 5. Services Layer (`src/services/`)

Business logic and validation layer.

**Files:**
- `healthService.js` - Health check business logic
- `userService.js` - User management with validation
- `songService.js` - Song rating with validation

**Service Responsibilities:**
- Input validation and sanitization
- Business rule enforcement
- Data transformation
- Database operation orchestration
- Error handling with meaningful messages

### 6. Middleware Layer (`src/middleware/`)

Reusable middleware components for cross-cutting concerns.

**Files:**
- `cors.js` - CORS configuration
- `errorHandler.js` - Global error handling
- `validation.js` - Request validation
- `logging.js` - Request/response logging
- `index.js` - Middleware exports

## Data Flow

```
1. HTTP Request
   ↓
2. Middleware Pipeline
   ├── Logging
   ├── CORS
   ├── Validation
   └── Body Parsing
   ↓
3. Route Handler
   ↓
4. Controller
   ├── Extract parameters
   ├── Basic validation
   └── Call service
   ↓
5. Service
   ├── Input validation
   ├── Business logic
   └── Database calls
   ↓
6. Database Layer
   ↓
7. Response Pipeline
   ├── Service response
   ├── Controller formatting
   ├── Error handling
   └── HTTP response
```

## Error Handling Strategy

### Service Layer Errors
Services throw descriptive errors that controllers catch and convert to appropriate HTTP responses:

```javascript
// Service throws business logic errors
throw new Error('Username or email already exists');

// Controller maps to HTTP status
if (error.message.includes('already exists')) {
  res.status(409).json({ success: false, error: error.message });
}
```

### Global Error Handler
Catches unhandled errors and provides consistent error responses:
- Development: Full error details with stack trace
- Production: Generic error messages for security

### HTTP Status Codes Used
- `200` - Success
- `400` - Bad Request (validation errors)
- `409` - Conflict (unique constraint violations)
- `413` - Payload Too Large
- `500` - Internal Server Error

## Security Features

### Input Validation
- Request size limits (1MB default)
- Content-Type validation for POST/PUT/PATCH
- Input sanitization in service layer
- SQL injection prevention through parameterized queries

### CORS Configuration
- Configurable allowed origins
- Proper headers for cross-origin requests
- Credentials support when needed

### Error Information Disclosure
- Development vs production error details
- Stack traces only in development
- Generic error messages in production

## Performance Considerations

### Middleware Optimization
- Conditional request logging
- Early request validation
- Efficient CORS handling
- Proper body parsing limits

### Database Optimization
- Connection pooling configuration
- Prepared statement usage
- Proper error handling for connection issues

## Environment Configuration

### Required Environment Variables
```bash
PORT=3000                    # Server port
NODE_ENV=development         # Environment mode
DATABASE_FILE=./database/radiocalico.db  # Database path
```

### Optional Environment Variables
```bash
HOST=localhost               # Server host
ALLOWED_ORIGINS=*            # CORS origins
CORS_CREDENTIALS=true        # CORS credentials
RATE_LIMIT_WINDOW=900000     # Rate limit window (ms)
RATE_LIMIT_MAX=100          # Max requests per window
MAX_REQUEST_SIZE=1mb        # Max request payload size
LOG_LEVEL=info              # Logging level
ENABLE_REQUEST_LOGGING=true  # Request logging toggle
```

## Development Guidelines

### Adding New Routes
1. Create route in appropriate `src/routes/*.js` file
2. Create controller method in `src/controllers/*.js`
3. Create service method in `src/services/*.js`
4. Update this documentation

### Controller Best Practices
- Keep controllers thin - delegate to services
- Handle only HTTP concerns (status codes, headers)
- Use consistent error handling patterns
- Validate request structure minimally

### Service Best Practices
- Implement comprehensive input validation
- Throw descriptive errors for business rules
- Keep business logic separate from HTTP concerns
- Use transactions for multi-step operations

### Error Handling Best Practices
- Use specific error messages in services
- Map service errors to HTTP status codes in controllers
- Never expose sensitive information in errors
- Log errors appropriately for debugging

## Testing Strategy

### Unit Testing Targets
- Service layer business logic
- Controller error handling
- Middleware functionality
- Configuration validation

### Integration Testing Targets
- API endpoint responses
- Database operations
- Error handling pipeline
- Middleware interactions

### Example Test Structure
```javascript
// Service tests
describe('UserService', () => {
  it('should validate email format', () => {
    expect(() => UserService.createUser('test', 'invalid-email'))
      .toThrow('Invalid email format');
  });
});

// Controller tests
describe('UserController', () => {
  it('should return 400 for invalid input', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ username: 'test' }); // missing email
    expect(response.status).toBe(400);
  });
});
```

## Deployment Considerations

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up request logging
- [ ] Configure rate limiting
- [ ] Set appropriate payload limits
- [ ] Enable error monitoring
- [ ] Set up health check monitoring

### Monitoring Endpoints
- `GET /api/health` - Basic health check
- `GET /api/health/db` - Database connectivity
- Server logs include request/response times

## Future Enhancements

### Phase 2 Integration Points
- API client abstraction for frontend
- Enhanced error handling for frontend consumption
- WebSocket support for real-time features
- Caching layer integration points

### Scalability Considerations
- Database connection pooling
- Redis session storage
- Load balancer health checks
- Horizontal scaling support

## Conclusion

The refactored backend provides a solid foundation for the RadioCalico application with:
- Clear separation of concerns
- Maintainable and testable code structure
- Comprehensive error handling
- Production-ready configuration
- Security best practices
- Performance optimizations

This architecture supports the planned frontend modularization and provides a scalable foundation for future enhancements.