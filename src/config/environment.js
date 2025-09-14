require('dotenv').config();

const config = {
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  database: {
    file: process.env.DATABASE_FILE || './database/radiocalico.db',
    connectionPoolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },

  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // requests per window
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '1mb'
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false'
  }
};

// Validation
if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
  throw new Error('Invalid PORT configuration. Must be between 1 and 65535.');
}

if (!['development', 'production', 'test'].includes(config.server.nodeEnv)) {
  console.warn(`Unknown NODE_ENV: ${config.server.nodeEnv}. Defaulting to development.`);
  config.server.nodeEnv = 'development';
}

module.exports = config;