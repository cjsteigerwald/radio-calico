# Phase 6: Performance Optimization & Deployment

## Overview
Implement advanced performance optimizations, caching strategies, monitoring solutions, and establish robust deployment pipelines for production-ready RadioCalico application.

## Current Issues
- No performance monitoring
- No caching strategies
- No CDN integration
- No service worker for offline functionality
- Single server deployment with no scaling
- No monitoring or alerting systems

## Performance Optimization Strategy

### 6.1 Frontend Performance

#### Code Splitting & Lazy Loading
```javascript
// public/js/app.js - Dynamic imports for code splitting
class App {
  async initializePlayer() {
    const { AudioPlayer } = await import('./modules/AudioPlayer.js');
    this.audioPlayer = new AudioPlayer();
  }

  async initializeRatingSystem() {
    // Only load rating system when user interacts
    if (!this.ratingSystem) {
      const { RatingSystem } = await import('./modules/RatingSystem.js');
      this.ratingSystem = new RatingSystem(this.appState);
    }
    return this.ratingSystem;
  }

  async loadAlbumArtService() {
    // Lazy load artwork service
    const { AlbumArtService } = await import('./modules/AlbumArtService.js');
    return new AlbumArtService();
  }
}
```

#### Service Worker Implementation
```javascript
// public/sw.js - Service Worker for caching and offline support
const CACHE_NAME = 'radiocalico-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/radio.html',
  '/css/main.css',
  '/js/app.js',
  '/assets/images/RadioCalicoLogoTM.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Open+Sans:wght@400;500;600&display=swap'
];

const API_CACHE_STRATEGIES = {
  '/api/health': 'network-first',
  '/api/songs/': 'cache-first',
  'metadatav2.json': 'network-only'
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with specific strategies
  if (url.pathname.startsWith('/api/') || url.hostname.includes('cloudfront')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Default: try cache first, then network
  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
  );
});

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const strategy = getAPIStrategy(url.pathname);

  switch (strategy) {
    case 'network-first':
      return networkFirst(request);
    case 'cache-first':
      return cacheFirst(request);
    case 'network-only':
      return fetch(request);
    default:
      return fetch(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}
```

#### Image Optimization Pipeline
```javascript
// scripts/optimize-images.js
import sharp from 'sharp';
import { glob } from 'glob';
import { join, dirname, basename, extname } from 'path';
import { mkdirSync, existsSync } from 'fs';

class ImageOptimizer {
  constructor(options = {}) {
    this.inputDir = options.inputDir || 'public/assets/images';
    this.outputDir = options.outputDir || 'dist/assets/images';
    this.quality = options.quality || 85;
    this.sizes = options.sizes || [300, 600, 1200];
  }

  async optimizeAll() {
    const imageFiles = await glob(`${this.inputDir}/**/*.{jpg,jpeg,png,webp}`);

    for (const imagePath of imageFiles) {
      await this.optimizeImage(imagePath);
    }

    console.log(`✅ Optimized ${imageFiles.length} images`);
  }

  async optimizeImage(inputPath) {
    const filename = basename(inputPath, extname(inputPath));
    const extension = extname(inputPath).toLowerCase();
    const relativePath = inputPath.replace(this.inputDir, '');
    const outputPath = join(this.outputDir, dirname(relativePath), filename);

    // Ensure output directory exists
    const outputDirPath = dirname(join(this.outputDir, relativePath));
    if (!existsSync(outputDirPath)) {
      mkdirSync(outputDirPath, { recursive: true });
    }

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Generate multiple sizes
    for (const size of this.sizes) {
      if (metadata.width && metadata.width >= size) {
        await this.generateSize(image, outputPath, size, extension);
      }
    }

    // Generate WebP versions
    for (const size of this.sizes) {
      if (metadata.width && metadata.width >= size) {
        await this.generateWebP(image, outputPath, size);
      }
    }
  }

  async generateSize(image, outputPath, size, extension) {
    const filename = `${outputPath}-${size}w${extension}`;

    await image
      .clone()
      .resize(size, null, { withoutEnlargement: true })
      .jpeg({ quality: this.quality, progressive: true })
      .png({ quality: this.quality, progressive: true })
      .toFile(filename);
  }

  async generateWebP(image, outputPath, size) {
    const filename = `${outputPath}-${size}w.webp`;

    await image
      .clone()
      .resize(size, null, { withoutEnlargement: true })
      .webp({ quality: this.quality })
      .toFile(filename);
  }
}

// Usage
const optimizer = new ImageOptimizer();
optimizer.optimizeAll().catch(console.error);
```

### 6.2 Backend Performance

#### Redis Caching Layer
```javascript
// src/middleware/cache.js
import Redis from 'ioredis';

class CacheManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      lazyConnect: true
    });

    this.defaultTTL = 300; // 5 minutes
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  middleware() {
    return (req, res, next) => {
      // Add cache methods to request object
      req.cache = this;

      // Add cache helper methods to response
      res.cachedJson = async (key, data, ttl) => {
        await this.set(key, data, ttl);
        res.json(data);
      };

      next();
    };
  }
}

// Cache middleware for specific routes
export const cacheMiddleware = (ttl = 300) => {
  const cacheManager = new CacheManager();

  return async (req, res, next) => {
    const cacheKey = `${req.method}:${req.originalUrl}`;

    try {
      const cachedResponse = await cacheManager.get(cacheKey);

      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        cacheManager.set(cacheKey, data, ttl);
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};
```

#### Database Connection Pooling
```javascript
// src/config/database.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

class DatabasePool {
  constructor() {
    this.connections = new Map();
    this.maxConnections = process.env.DB_POOL_SIZE || 10;
    this.connectionTimeout = 30000; // 30 seconds
  }

  async getConnection() {
    const threadId = this.getCurrentThreadId();

    if (!this.connections.has(threadId)) {
      const db = await open({
        filename: process.env.DATABASE_FILE || './database/radiocalico.db',
        driver: sqlite3.Database
      });

      // Configure SQLite for better performance
      await db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 1000;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
      `);

      this.connections.set(threadId, {
        db,
        lastUsed: Date.now(),
        inUse: false
      });

      // Clean up old connections
      this.cleanupConnections();
    }

    const connection = this.connections.get(threadId);
    connection.lastUsed = Date.now();
    connection.inUse = true;

    return connection.db;
  }

  releaseConnection(threadId = this.getCurrentThreadId()) {
    const connection = this.connections.get(threadId);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }

  cleanupConnections() {
    const now = Date.now();
    const timeout = this.connectionTimeout;

    for (const [threadId, connection] of this.connections.entries()) {
      if (!connection.inUse && (now - connection.lastUsed) > timeout) {
        connection.db.close();
        this.connections.delete(threadId);
      }
    }
  }

  getCurrentThreadId() {
    // Simple thread identification for Node.js
    return process.pid + '-' + Date.now();
  }

  async closeAll() {
    for (const [threadId, connection] of this.connections.entries()) {
      await connection.db.close();
    }
    this.connections.clear();
  }
}

export const dbPool = new DatabasePool();
```

### 6.3 Deployment Configuration

#### Docker Setup
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Set user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

#### Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_FILE=/data/radiocalico.db
      - REDIS_HOST=redis
    volumes:
      - ./data:/data
      - ./src:/app/src:ro
      - ./public:/app/public:ro
    depends_on:
      - redis
      - db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

  monitoring:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    restart: unless-stopped

volumes:
  redis_data:
```

#### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
        keepalive 32;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    server {
        listen 80;
        server_name localhost;

        # Redirect to HTTPS in production
        # return 301 https://$server_name$request_uri;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static file caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API caching
        location /api/songs/ {
            proxy_pass http://app;
            proxy_cache_valid 200 5m;
            add_header X-Cache-Status $upstream_cache_status;
        }
    }
}
```

### 6.4 Monitoring & Observability

#### Application Metrics
```javascript
// src/middleware/metrics.js
import client from 'prom-client';

// Create metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation']
});

// Register default metrics
client.collectDefaultMetrics({ prefix: 'radiocalico_' });

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });

  next();
};

export const getMetrics = (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
};
```

#### Health Check Endpoint
```javascript
// src/routes/health.js
import express from 'express';
import { dbPool } from '../config/database.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    checks: {}
  };

  try {
    // Database check
    const db = await dbPool.getConnection();
    await db.get('SELECT 1 as test');
    health.checks.database = { status: 'ok', responseTime: Date.now() };
    dbPool.releaseConnection();
  } catch (error) {
    health.checks.database = { status: 'error', message: error.message };
    health.status = 'error';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: memUsage.heapUsed < 100 * 1024 * 1024 ? 'ok' : 'warning', // 100MB
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    rss: Math.round(memUsage.rss / 1024 / 1024)
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/ready', async (req, res) => {
  try {
    // More comprehensive readiness check
    const db = await dbPool.getConnection();
    await db.get('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"');
    dbPool.releaseConnection();

    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

export default router;
```

### 6.5 CI/CD Pipeline

#### GitHub Actions Production Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm run test:coverage

    - name: Run E2E tests
      run: |
        npx playwright install
        npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: |
          ghcr.io/${{ github.repository }}:latest
          ghcr.io/${{ github.repository }}:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.PRODUCTION_SSH_KEY }}
        script: |
          cd /opt/radiocalico
          docker-compose pull
          docker-compose up -d --no-deps app
          docker system prune -f

    - name: Health check
      run: |
        sleep 30
        curl -f ${{ secrets.PRODUCTION_URL }}/api/health || exit 1

    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      if: always()
```

## Implementation Steps

1. **Service Worker setup** - Caching and offline support
2. **Image optimization** - Automated image processing pipeline
3. **Backend caching** - Redis integration and cache strategies
4. **Database optimization** - Connection pooling and query optimization
5. **Docker containerization** - Production-ready containers
6. **Load balancing** - Nginx configuration and upstream servers
7. **Monitoring setup** - Prometheus metrics and health checks
8. **CI/CD pipeline** - Automated testing and deployment
9. **Performance monitoring** - Real-time metrics and alerting
10. **Security hardening** - SSL/TLS, headers, and vulnerability scanning

## Benefits

- **Performance**: Faster load times and better user experience
- **Scalability**: Handle increased traffic and concurrent users
- **Reliability**: Monitoring, health checks, and graceful degradation
- **Security**: Hardened deployment with best practices
- **Maintainability**: Automated deployments and rollback capabilities
- **Observability**: Comprehensive monitoring and logging
- **Offline Support**: Service worker enables offline functionality

## Timeline: Week 8

- Days 1-2: Service worker and frontend optimization
- Days 3-4: Backend caching and database optimization
- Days 5-6: Docker and deployment configuration
- Day 7: Monitoring setup and CI/CD pipeline