# RadioCalico Middleware Documentation

## Overview

The RadioCalico backend uses a sophisticated middleware pipeline to handle cross-cutting concerns like CORS, logging, validation, and error handling. This document details each middleware component, its purpose, configuration, and usage.

## Middleware Pipeline Order

The middleware components are applied in a specific order to ensure proper request processing:

```javascript
// Middleware execution order (src/server.js)
1. Request Logging (optional)      // Logs incoming requests
2. CORS Headers                    // Handles cross-origin requests
3. Request Size Validation         // Validates payload size
4. Content-Type Validation         // Validates content type
5. Body Parsing (JSON/URL-encoded) // Parses request bodies
6. Static File Serving             // Serves static files
7. API Routes                      // Application routes
8. Error Handling (catch-all)      // Global error handler
```

## Middleware Components

### 1. Request Logging Middleware (`src/middleware/logging.js`)

**Purpose**: Logs HTTP requests and responses with timing information.

**Features**:
- Request method, path, and IP address logging
- Response status code and duration tracking
- Configurable enable/disable via environment variable
- ISO timestamp formatting

**Configuration**:
```javascript
// Enable/disable via environment variable
ENABLE_REQUEST_LOGGING=true  // default: true
```

**Implementation**:
```javascript
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Log incoming request
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    res.end(chunk, encoding);
  };

  next();
};
```

**Log Format**:
```
[2025-09-13T12:37:32.119Z] GET /api/health - 127.0.0.1
[2025-09-13T12:37:32.119Z] GET /api/health - 200 - 15ms
```

**Performance Considerations**:
- Disable in high-traffic production environments
- Minimal overhead when enabled
- No external dependencies

---

### 2. CORS Middleware (`src/middleware/cors.js`)

**Purpose**: Handles Cross-Origin Resource Sharing (CORS) for web browser security.

**Features**:
- Configurable allowed origins
- Support for credentials
- Proper preflight request handling
- Standard HTTP methods support

**Configuration**:
```javascript
// Environment variables
ALLOWED_ORIGINS=https://example.com,https://www.example.com  // comma-separated
CORS_CREDENTIALS=true  // default: false
```

**Implementation**:
```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: process.env.CORS_CREDENTIALS === 'true'
};

module.exports = cors(corsOptions);
```

**Supported Methods**: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`

**Supported Headers**: `Content-Type`, `Authorization`, `X-Requested-With`

**Security Considerations**:
- Use specific origins in production (not `*`)
- Enable credentials only when necessary
- Regularly review allowed origins

---

### 3. Request Size Validation (`src/middleware/validation.js`)

**Purpose**: Validates incoming request payload size to prevent DoS attacks.

**Features**:
- Configurable maximum request size
- Early request rejection for oversized payloads
- Consistent error response format

**Configuration**:
```javascript
// Environment variable
MAX_REQUEST_SIZE=1mb  // default: 1mb
```

**Implementation**:
```javascript
const validateRequestSize = (req, res, next) => {
  const maxSize = 1024 * 1024; // 1MB
  const contentLength = parseInt(req.get('Content-Length') || '0');

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large'
    });
  }

  next();
};
```

**Error Response**:
```json
{
  "success": false,
  "error": "Request payload too large"
}
```

**HTTP Status Code**: `413 Payload Too Large`

---

### 4. Content-Type Validation (`src/middleware/validation.js`)

**Purpose**: Ensures proper Content-Type headers for request methods that require them.

**Features**:
- Validates Content-Type for POST, PUT, PATCH requests
- Requires `application/json` for JSON APIs
- Provides clear error messages

**Validation Rules**:
- `POST`, `PUT`, `PATCH` requests must have `Content-Type: application/json`
- `GET`, `DELETE`, `OPTIONS` requests don't require Content-Type
- Other content types are rejected

**Implementation**:
```javascript
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type must be application/json'
      });
    }
  }
  next();
};
```

**Error Response**:
```json
{
  "success": false,
  "error": "Content-Type must be application/json"
}
```

**HTTP Status Code**: `400 Bad Request`

---

### 5. Body Parsing Middleware (Express Built-in)

**Purpose**: Parses incoming request bodies for JSON and URL-encoded data.

**Configuration**:
```javascript
app.use(bodyParser.json({ limit: config.security.maxRequestSize }));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: config.security.maxRequestSize
}));
```

**Features**:
- JSON parsing with size limits
- URL-encoded form parsing
- Automatic error handling for invalid JSON
- Configurable payload limits

**Error Handling**:
- Invalid JSON triggers global error handler
- Oversized payloads return 413 status
- Malformed data returns 400 status

---

### 6. Error Handling Middleware (`src/middleware/errorHandler.js`)

**Purpose**: Global error handling for all unhandled errors in the application.

**Features**:
- Environment-aware error responses
- Specific error type handling
- Security-conscious error messages
- Comprehensive error logging

**Implementation**:
```javascript
const errorHandler = (err, req, res, next) => {
  console.error(`Error on ${req.method} ${req.path}:`, err);

  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large'
    });
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
};
```

**Error Types Handled**:
- `entity.parse.failed` - Invalid JSON (400)
- `entity.too.large` - Payload too large (413)
- Generic errors (500)

**Environment Behavior**:
- **Development**: Full error details with stack trace
- **Production**: Generic error messages only

**Security Features**:
- No sensitive information exposure in production
- Stack traces only in development
- Consistent error response format

## Middleware Usage Examples

### Adding Custom Middleware

```javascript
// Custom middleware example
const customMiddleware = (req, res, next) => {
  // Add custom header
  res.setHeader('X-RadioCalico-Version', '1.0.0');

  // Custom logic here
  console.log('Custom middleware executed');

  next(); // Always call next() to continue pipeline
};

// Add to server.js
app.use(customMiddleware);
```

### Conditional Middleware

```javascript
// Apply middleware only in development
if (config.server.nodeEnv === 'development') {
  app.use(requestLogger);
}

// Apply middleware to specific routes
app.use('/api/admin', adminAuthMiddleware);
```

### Error Middleware for Specific Routes

```javascript
// Route-specific error handling
router.use('/users', userRoutes);
router.use('/users', (err, req, res, next) => {
  if (err.code === 'USER_VALIDATION_ERROR') {
    return res.status(400).json({
      success: false,
      error: 'User validation failed'
    });
  }
  next(err); // Pass to global error handler
});
```

## Testing Middleware

### Unit Testing Example

```javascript
// tests/middleware/validation.test.js
const { validateContentType } = require('../../src/middleware/validation');

describe('validateContentType middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { method: 'POST', get: jest.fn() };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  test('should pass with valid content type', () => {
    req.get.mockReturnValue('application/json');

    validateContentType(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reject invalid content type', () => {
    req.get.mockReturnValue('text/plain');

    validateContentType(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Content-Type must be application/json'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
```

### Integration Testing

```javascript
// tests/integration/middleware.test.js
const request = require('supertest');
const app = require('../../src/server');

describe('Middleware Integration', () => {
  test('should handle CORS preflight request', async () => {
    const response = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  test('should reject oversized payload', async () => {
    const largePayload = 'x'.repeat(2 * 1024 * 1024); // 2MB

    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send(largePayload);

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('Request payload too large');
  });
});
```

## Performance Considerations

### Middleware Optimization Tips

1. **Order Matters**: Place lighter middleware before heavier ones
2. **Conditional Loading**: Only load middleware when needed
3. **Caching**: Cache middleware results when possible
4. **Early Termination**: Reject invalid requests early in pipeline

### Performance Monitoring

```javascript
// Add performance monitoring to middleware
const performanceMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });

  next();
};
```

## Security Best Practices

### Security Middleware Checklist

- [ ] **CORS**: Configure specific origins, not `*`
- [ ] **Content-Type**: Validate for state-changing requests
- [ ] **Request Size**: Limit payload size to prevent DoS
- [ ] **Error Handling**: Don't expose sensitive information
- [ ] **Logging**: Log security-relevant events
- [ ] **Headers**: Add security headers (future enhancement)

### Additional Security Headers (Future)

```javascript
// Security headers middleware (planned)
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
};
```

## Troubleshooting

### Common Middleware Issues

#### CORS Errors
```
Access-Control-Allow-Origin header is present on the requested resource
```
**Solution**: Check `ALLOWED_ORIGINS` configuration

#### Request Size Errors
```json
{ "success": false, "error": "Request payload too large" }
```
**Solution**: Increase `MAX_REQUEST_SIZE` or reduce payload

#### Content-Type Errors
```json
{ "success": false, "error": "Content-Type must be application/json" }
```
**Solution**: Add proper Content-Type header to requests

#### Middleware Not Executing
- Check middleware order in `server.js`
- Ensure `next()` is called in custom middleware
- Verify middleware is properly mounted

### Debug Middleware Execution

```javascript
// Debug middleware to trace execution
const debugMiddleware = (name) => (req, res, next) => {
  console.log(`Executing middleware: ${name}`);
  next();
};

// Usage
app.use(debugMiddleware('CORS'));
app.use(corsMiddleware);
app.use(debugMiddleware('Validation'));
```

## Future Enhancements

### Planned Middleware Features

1. **Rate Limiting**: IP-based request rate limiting
2. **Authentication**: JWT token validation middleware
3. **Compression**: Response compression for better performance
4. **Security Headers**: Comprehensive security header middleware
5. **Request ID**: Unique request ID for tracing
6. **Cache Control**: HTTP caching headers
7. **API Versioning**: Version-based routing middleware

### Middleware Performance Metrics

```javascript
// Middleware performance tracking (planned)
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.record('http_request_duration', duration, {
      method: req.method,
      route: req.route?.path,
      status: res.statusCode
    });
  });

  next();
};
```