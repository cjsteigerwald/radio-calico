const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');

const config = require('./config');
const database = require('./database/db');
const routes = require('./routes');
const {
  corsMiddleware,
  errorHandler,
  validateContentType,
  validateRequestSize,
  requestLogger
} = require('./middleware');
const {
  securityHeaders,
  customSecurityHeaders,
  apiLimiter,
  sanitizeInput
} = require('./middleware/security');

const app = express();

// Security headers - apply first
app.use(securityHeaders);
app.use(customSecurityHeaders);

// Compression middleware - apply early for maximum benefit
app.use(compression({
  // Compress all responses
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      // Don't compress responses if this header is present
      return false;
    }
    // Use compression's default filter
    return compression.filter(req, res);
  },
  // Compression level: 6 is a good balance between speed and compression
  level: 6
}));

// Middleware setup
if (config.logging.enableRequestLogging) {
  app.use(requestLogger);
}

app.use(corsMiddleware);
app.use(validateRequestSize);
app.use(validateContentType);
app.use(bodyParser.json({ limit: config.security.maxRequestSize }));
app.use(bodyParser.urlencoded({ extended: true, limit: config.security.maxRequestSize }));

// Input sanitization
app.use(sanitizeInput);

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Static files with cache headers for performance
app.use(express.static('public', {
  maxAge: config.server.nodeEnv === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// API routes
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
database.initialize().then(() => {
  const server = app.listen(config.server.port, () => {
    console.log(`Server is running on http://localhost:${config.server.port}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
    console.log(`API health check: http://localhost:${config.server.port}/api/health`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});