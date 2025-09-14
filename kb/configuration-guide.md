# RadioCalico Configuration Guide

## Overview

The RadioCalico backend uses a centralized configuration system that supports environment variables, validation, and sensible defaults. This guide covers all configuration options, setup procedures, and best practices.

## Configuration Architecture

### Configuration Files
```
src/config/
├── environment.js    # Main configuration object with validation
├── database.js      # Database-specific configuration helpers
└── index.js         # Configuration exports and aggregation
```

### Loading Order
1. Load environment variables from `.env` file (via dotenv)
2. Apply configuration defaults
3. Validate configuration values
4. Export configuration object

## Environment Variables

### Core Server Configuration

#### PORT
- **Type**: Number
- **Default**: `3000`
- **Description**: Port number for the HTTP server
- **Validation**: Must be between 1 and 65535
- **Example**: `PORT=8080`

#### HOST
- **Type**: String
- **Default**: `localhost`
- **Description**: Host address for the server to bind to
- **Example**: `HOST=0.0.0.0`

#### NODE_ENV
- **Type**: String
- **Default**: `development`
- **Valid Values**: `development`, `production`, `test`
- **Description**: Application environment mode
- **Impact**: Affects error handling, logging, and performance optimizations
- **Example**: `NODE_ENV=production`

### Database Configuration

#### DATABASE_FILE
- **Type**: String
- **Default**: `./database/radiocalico.db`
- **Description**: Path to the SQLite database file
- **Note**: Directory will be created automatically if it doesn't exist
- **Example**: `DATABASE_FILE=/opt/radiocalico/data/radio.db`

#### DB_POOL_SIZE
- **Type**: Number
- **Default**: `10`
- **Description**: Maximum number of database connections in the pool
- **Example**: `DB_POOL_SIZE=20`

### CORS Configuration

#### ALLOWED_ORIGINS
- **Type**: String (comma-separated)
- **Default**: `*` (allow all origins)
- **Description**: Allowed origins for CORS requests
- **Security**: Set specific origins in production
- **Example**: `ALLOWED_ORIGINS=https://radiocalico.com,https://www.radiocalico.com`

#### CORS_CREDENTIALS
- **Type**: Boolean
- **Default**: `false`
- **Description**: Whether to allow credentials in CORS requests
- **Example**: `CORS_CREDENTIALS=true`

### Security Configuration

#### RATE_LIMIT_WINDOW
- **Type**: Number (milliseconds)
- **Default**: `900000` (15 minutes)
- **Description**: Time window for rate limiting
- **Example**: `RATE_LIMIT_WINDOW=300000` (5 minutes)

#### RATE_LIMIT_MAX
- **Type**: Number
- **Default**: `100`
- **Description**: Maximum number of requests per IP per window
- **Example**: `RATE_LIMIT_MAX=200`

#### MAX_REQUEST_SIZE
- **Type**: String
- **Default**: `1mb`
- **Description**: Maximum size for request payloads
- **Formats**: `1kb`, `1mb`, `1gb`, or bytes as number
- **Example**: `MAX_REQUEST_SIZE=5mb`

### Logging Configuration

#### LOG_LEVEL
- **Type**: String
- **Default**: `info`
- **Valid Values**: `error`, `warn`, `info`, `debug`
- **Description**: Logging level for the application
- **Example**: `LOG_LEVEL=debug`

#### ENABLE_REQUEST_LOGGING
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to log HTTP requests and responses
- **Performance**: Disable in high-traffic production environments
- **Example**: `ENABLE_REQUEST_LOGGING=false`

## Environment Setup

### Development Environment
Create a `.env` file in the project root:

```bash
# .env
PORT=3000
NODE_ENV=development
DATABASE_FILE=./database/radiocalico.db
ENABLE_REQUEST_LOGGING=true
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Production Environment
```bash
# .env.production
PORT=8080
NODE_ENV=production
HOST=0.0.0.0
DATABASE_FILE=/var/lib/radiocalico/radio.db
ENABLE_REQUEST_LOGGING=false
LOG_LEVEL=info
ALLOWED_ORIGINS=https://radiocalico.com,https://www.radiocalico.com
CORS_CREDENTIALS=true
RATE_LIMIT_MAX=200
MAX_REQUEST_SIZE=2mb
```

### Testing Environment
```bash
# .env.test
PORT=0
NODE_ENV=test
DATABASE_FILE=:memory:
ENABLE_REQUEST_LOGGING=false
LOG_LEVEL=error
```

## Configuration Access

### In Application Code
```javascript
const config = require('./config');

// Server configuration
console.log(`Starting server on port ${config.server.port}`);
console.log(`Environment: ${config.server.nodeEnv}`);

// Database configuration
const dbPath = config.DatabaseConfig.getDatabasePath();
const isProduction = config.DatabaseConfig.isProduction();

// Security settings
app.use(bodyParser.json({ limit: config.security.maxRequestSize }));
```

### Configuration Object Structure
```javascript
{
  server: {
    port: 3000,
    host: 'localhost',
    nodeEnv: 'development'
  },
  database: {
    file: './database/radiocalico.db',
    connectionPoolSize: 10
  },
  cors: {
    allowedOrigins: ['*'],
    credentials: false
  },
  security: {
    rateLimitWindow: 900000,
    rateLimitMax: 100,
    maxRequestSize: '1mb'
  },
  logging: {
    level: 'info',
    enableRequestLogging: true
  },
  DatabaseConfig: {
    getDatabasePath: Function,
    getConnectionOptions: Function,
    isDevelopment: Function,
    isProduction: Function
  }
}
```

## Validation Rules

### Server Configuration Validation
```javascript
// Port validation
if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
  throw new Error('Invalid PORT configuration. Must be between 1 and 65535.');
}

// Environment validation
if (!['development', 'production', 'test'].includes(config.server.nodeEnv)) {
  console.warn(`Unknown NODE_ENV: ${config.server.nodeEnv}. Defaulting to development.`);
  config.server.nodeEnv = 'development';
}
```

### Database Path Validation
- Database directory is created automatically if it doesn't exist
- Path is resolved to absolute path for consistency
- SQLite-specific connection options are applied

## Docker Configuration

### Dockerfile Environment
```dockerfile
ENV PORT=8080
ENV NODE_ENV=production
ENV DATABASE_FILE=/app/data/radio.db
ENV ALLOWED_ORIGINS=https://radiocalico.com
ENV ENABLE_REQUEST_LOGGING=false
```

### Docker Compose
```yaml
version: '3.8'
services:
  radiocalico:
    build: .
    environment:
      - PORT=8080
      - NODE_ENV=production
      - DATABASE_FILE=/app/data/radio.db
      - ALLOWED_ORIGINS=https://radiocalico.com
      - RATE_LIMIT_MAX=500
    volumes:
      - radiocalico_data:/app/data
    ports:
      - "8080:8080"

volumes:
  radiocalico_data:
```

## Best Practices

### Security
1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use specific CORS origins** in production
3. **Set appropriate rate limits** based on usage patterns
4. **Use HTTPS** in production environments
5. **Validate all configuration** at startup

### Performance
1. **Disable request logging** in high-traffic production
2. **Adjust rate limits** based on server capacity
3. **Set reasonable payload limits** to prevent DoS
4. **Use environment-specific database paths**

### Deployment
1. **Use environment-specific `.env` files**
2. **Validate configuration** in CI/CD pipelines
3. **Monitor configuration changes** in production
4. **Document environment variables** for operations teams

## Troubleshooting

### Common Configuration Issues

#### Port Already in Use
```bash
Error: listen EADDRINUSE :::3000
```
**Solution**: Change `PORT` environment variable or stop conflicting process

#### Database Permission Issues
```bash
Error: SQLITE_CANTOPEN: unable to open database file
```
**Solutions**:
- Check database file permissions
- Ensure database directory exists and is writable
- Verify `DATABASE_FILE` path is correct

#### CORS Errors in Browser
```
Access to fetch at 'http://localhost:3000/api/health' from origin 'http://localhost:8080' has been blocked by CORS policy
```
**Solution**: Add frontend origin to `ALLOWED_ORIGINS`

#### Invalid Configuration at Startup
```bash
Error: Invalid PORT configuration. Must be between 1 and 65535.
```
**Solution**: Check `.env` file for valid port number

### Debug Configuration
Add debug logging to see loaded configuration:

```javascript
// Add to src/config/environment.js for debugging
console.log('Loaded configuration:', {
  server: config.server,
  database: config.database,
  cors: config.cors
});
```

## Configuration Testing

### Unit Tests for Configuration
```javascript
// tests/config.test.js
const config = require('../src/config');

describe('Configuration', () => {
  test('should have valid server port', () => {
    expect(config.server.port).toBeGreaterThan(0);
    expect(config.server.port).toBeLessThanOrEqual(65535);
  });

  test('should have valid node environment', () => {
    expect(['development', 'production', 'test'])
      .toContain(config.server.nodeEnv);
  });

  test('should have database configuration', () => {
    expect(config.database.file).toBeDefined();
    expect(typeof config.database.file).toBe('string');
  });
});
```

### Configuration Validation in CI/CD
```yaml
# .github/workflows/test.yml
- name: Validate Configuration
  run: |
    export NODE_ENV=test
    export DATABASE_FILE=:memory:
    node -e "require('./src/config'); console.log('Configuration valid')"
```

## Migration from Legacy Configuration

### Before (Hardcoded Values)
```javascript
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.json());
```

### After (Centralized Configuration)
```javascript
const config = require('./config');
app.use(config.corsMiddleware);
app.use(bodyParser.json({ limit: config.security.maxRequestSize }));
```

### Migration Checklist
- [ ] Move hardcoded values to environment variables
- [ ] Add configuration validation
- [ ] Update documentation
- [ ] Test with different environment configurations
- [ ] Update deployment scripts

## Future Configuration Enhancements

### Planned Features
- Configuration hot-reloading
- Remote configuration management
- Configuration schema validation (JSON Schema)
- Configuration encryption for sensitive values
- Multi-environment configuration inheritance
- Configuration change auditing