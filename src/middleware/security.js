const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

/**
 * Security Headers Middleware
 * Configures various HTTP headers to enhance security
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://d3d4yli4hf5bmh.cloudfront.net", "https://itunes.apple.com", "blob:"],
      mediaSrc: ["'self'", "https:", "http:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // May need to be false for some external resources
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * Rate Limiting Configuration
 */
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  };

  return rateLimit({ ...defaults, ...options });
};

// Specific rate limiters for different endpoints
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many API requests, please try again later.'
  }
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter limit for auth endpoints
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  }
});

const rateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Strict limit for song ratings
  message: {
    success: false,
    error: 'Too many rating submissions, please wait a moment.'
  }
});

/**
 * Custom Security Headers Middleware
 * Adds additional security headers not covered by Helmet
 */
const customSecurityHeaders = (req, res, next) => {
  try {
    // Prevent browser from MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable browser XSS filtering
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()'
    );

    next();
  } catch (error) {
    console.error('Error setting security headers:', error);
    next(); // Continue even if header setting fails
  }
};

/**
 * Input Sanitization Middleware
 * Robust XSS protection using validator.js
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Use validator.js for robust sanitization
        // This escapes HTML entities and removes dangerous characters
        obj[key] = validator.escape(obj[key]);

        // Additional sanitization for common XSS patterns
        // Strip any remaining HTML tags
        obj[key] = validator.stripLow(obj[key]);

        // Trim whitespace
        obj[key] = validator.trim(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively sanitize nested objects (but not arrays)
        sanitize(obj[key]);
      } else if (Array.isArray(obj[key])) {
        // Sanitize array elements
        obj[key] = obj[key].map(item => {
          if (typeof item === 'string') {
            return validator.trim(validator.escape(item));
          }
          return item;
        });
      }
    }
  };

  try {
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);

    // Also sanitize headers that might contain user input
    const dangerousHeaders = ['referer', 'user-agent', 'x-forwarded-for'];
    dangerousHeaders.forEach(header => {
      if (req.headers[header] && typeof req.headers[header] === 'string') {
        req.headers[header] = validator.escape(req.headers[header]);
      }
    });

    next();
  } catch (error) {
    console.error('Error sanitizing input:', error);
    next(); // Continue even if sanitization fails
  }
};

module.exports = {
  securityHeaders,
  customSecurityHeaders,
  apiLimiter,
  authLimiter,
  rateLimiter,
  sanitizeInput,
  createRateLimiter
};