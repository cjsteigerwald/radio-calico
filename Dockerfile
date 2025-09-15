# Multi-stage Dockerfile for RadioCalico Production
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install build dependencies, install npm packages, then remove build dependencies
# This keeps the layer smaller by cleaning up in the same RUN command
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --only=production \
    && apk del .build-deps

# Stage 2: Build and Test
FROM node:20-alpine AS build

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy application source
COPY . .

# Build argument to control test execution
ARG SKIP_TESTS=false

# Run tests conditionally based on build argument
# Use SKIP_TESTS=true during development or when tests are run in CI separately
RUN if [ "$SKIP_TESTS" = "true" ]; then \
        echo "Skipping tests (SKIP_TESTS=true)"; \
    else \
        echo "Running tests..."; \
        npm test || { echo "Tests failed! Build aborted."; exit 1; }; \
    fi

# Stage 3: Production
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    wget \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs public ./public
COPY --chown=nodejs:nodejs package*.json ./

# Create necessary directories with proper permissions
RUN mkdir -p database logs && \
    chown -R nodejs:nodejs database logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "src/server.js"]