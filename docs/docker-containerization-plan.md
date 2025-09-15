# Docker Containerization Plan for RadioCalico

## Executive Summary
This plan outlines the complete containerization strategy for RadioCalico, enabling self-contained deployment with separate development and production configurations. The approach uses multi-stage builds, environment-specific configurations, and orchestration for both single-container and multi-service deployments.

## Goals & Requirements

### Primary Goals
1. **Self-Contained Deployment** - Single command deployment with all dependencies
2. **Environment Separation** - Distinct dev and prod configurations
3. **Data Persistence** - Database and uploaded files persist across container restarts
4. **Security** - Minimal attack surface, non-root user, secrets management
5. **Scalability** - Support for horizontal scaling and load balancing
6. **Development Efficiency** - Hot reload, debugging, and testing in containers

### Technical Requirements
- Node.js 20+ Alpine Linux base image for smaller size
- SQLite database with volume mounting
- Static asset serving optimization
- Health checks for container orchestration
- Graceful shutdown handling
- Environment variable configuration
- Log aggregation support

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Docker Host System              │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │    RadioCalico Container        │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │   Node.js Application    │   │   │
│  │  │   - Express Server       │   │   │
│  │  │   - API Endpoints        │   │   │
│  │  │   - Static File Server   │   │   │
│  │  └─────────────────────────┘   │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │   SQLite Database        │   │   │
│  │  └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Volumes:                               │
│  - ./database:/app/database             │
│  - ./logs:/app/logs (prod)              │
└─────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Base Dockerfile Creation

#### 1.1 Multi-Stage Dockerfile Structure
```dockerfile
# Dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run test

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
USER nodejs
EXPOSE 3000
CMD ["node", "src/server.js"]
```

#### 1.2 Development Dockerfile
```dockerfile
# Dockerfile.dev
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache sqlite
COPY package*.json ./
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### Phase 2: Docker Compose Configurations

#### 2.1 Development Configuration
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - ./database:/app/database
    environment:
      - NODE_ENV=development
      - DATABASE_FILE=/app/database/radiocalico.db
      - LOG_LEVEL=debug
    command: npm run dev
    networks:
      - radiocalico-network

networks:
  radiocalico-network:
    driver: bridge
```

#### 2.2 Production Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "80:3000"
    volumes:
      - ./database:/app/database
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - DATABASE_FILE=/app/database/radiocalico.db
      - LOG_LEVEL=error
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - radiocalico-network

networks:
  radiocalico-network:
    driver: bridge
```

### Phase 3: Environment Configuration

#### 3.1 Environment Files
```bash
# .env.docker.dev
NODE_ENV=development
PORT=3000
DATABASE_FILE=/app/database/radiocalico.db
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
CORS_CREDENTIALS=true
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# .env.docker.prod
NODE_ENV=production
PORT=3000
DATABASE_FILE=/app/database/radiocalico.db
LOG_LEVEL=error
ENABLE_REQUEST_LOGGING=false
CORS_CREDENTIALS=false
ALLOWED_ORIGINS=https://radiocalico.com
```

#### 3.2 .dockerignore File
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.*
!.env.docker.*
coverage
.nyc_output
.vscode
.idea
*.log
database/*.db
test-results
docs
kb
```

### Phase 4: Build Scripts & Automation

#### 4.1 Makefile for Common Operations
```makefile
# Makefile
.PHONY: help build dev prod test clean

help:
	@echo "Available commands:"
	@echo "  make build    - Build production image"
	@echo "  make dev      - Start development environment"
	@echo "  make prod     - Start production environment"
	@echo "  make test     - Run tests in container"
	@echo "  make clean    - Clean up containers and images"

build:
	docker build -t radiocalico:latest .

dev:
	docker-compose -f docker-compose.dev.yml up

prod:
	docker-compose up -d

test:
	docker run --rm radiocalico:latest npm test

clean:
	docker-compose down -v
	docker rmi radiocalico:latest
```

#### 4.2 GitHub Actions CI/CD
```yaml
# .github/workflows/docker-build.yml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to DockerHub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            radiocalico/app:latest
            radiocalico/app:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Phase 5: Deployment Configurations

#### 5.1 Docker Swarm Stack
```yaml
# stack.yml
version: '3.8'

services:
  app:
    image: radiocalico/app:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    ports:
      - "80:3000"
    volumes:
      - database:/app/database
      - logs:/app/logs
    secrets:
      - db_password
    networks:
      - radiocalico

volumes:
  database:
  logs:

secrets:
  db_password:
    external: true

networks:
  radiocalico:
    driver: overlay
```

#### 5.2 Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: radiocalico
spec:
  replicas: 3
  selector:
    matchLabels:
      app: radiocalico
  template:
    metadata:
      labels:
        app: radiocalico
    spec:
      containers:
      - name: app
        image: radiocalico/app:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: database
          mountPath: /app/database
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: database
        persistentVolumeClaim:
          claimName: radiocalico-pvc
```

## Security Considerations

### 1. Image Security
- Use Alpine Linux for minimal attack surface
- Run as non-root user (nodejs:1001)
- Regular security scanning with Trivy/Snyk
- Pin base image versions
- Multi-stage builds to exclude build tools

### 2. Runtime Security
- Read-only root filesystem where possible
- Drop unnecessary capabilities
- Use secrets management (Docker secrets, K8s secrets)
- Network isolation with custom networks
- Rate limiting and DDoS protection

### 3. Data Security
- Encrypted volumes for sensitive data
- Regular backups of database volume
- Secure environment variable handling
- TLS/SSL termination at ingress

## Performance Optimizations

### 1. Image Optimization
- Multi-stage builds reduce final image size
- Layer caching for faster builds
- Use .dockerignore to exclude unnecessary files
- Optimize npm install with --production flag

### 2. Runtime Optimization
- Health checks for container orchestration
- Graceful shutdown handling
- Connection pooling for database
- Static asset caching headers
- Gzip compression for responses

### 3. Scaling Strategy
- Horizontal scaling with replicas
- Load balancing across instances
- Database connection pooling
- Redis for session management (future)
- CDN for static assets (future)

## Monitoring & Logging

### 1. Application Metrics
- Prometheus metrics endpoint
- Custom metrics for business logic
- Response time tracking
- Error rate monitoring

### 2. Container Metrics
- CPU and memory usage
- Network I/O statistics
- Disk usage monitoring
- Container restart tracking

### 3. Centralized Logging
- JSON structured logging
- Log aggregation with ELK stack
- Error tracking with Sentry
- Audit logging for security

## Testing Strategy

### 1. Container Testing
```bash
# Test build
docker build -t radiocalico:test --target build .

# Run unit tests
docker run --rm radiocalico:test npm test

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Security scanning
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image radiocalico:latest
```

### 2. End-to-End Testing
- Selenium/Playwright tests in containers
- API testing with Postman/Newman
- Load testing with K6/JMeter
- Chaos engineering with Litmus

## Deployment Guide

### Local Development
```bash
# Start development environment
make dev

# Access application
open http://localhost:3000/radio-modular.html

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop environment
docker-compose -f docker-compose.dev.yml down
```

### Production Deployment
```bash
# Build production image
make build

# Start production environment
make prod

# Scale application
docker-compose up -d --scale app=3

# Update application
docker-compose pull
docker-compose up -d --no-deps app

# Backup database
docker run --rm -v radiocalico_database:/data \
  -v $(pwd):/backup alpine \
  tar czf /backup/database-$(date +%Y%m%d).tar.gz /data
```

### Cloud Deployment

#### AWS ECS
1. Push image to ECR
2. Create ECS task definition
3. Configure ALB for load balancing
4. Set up auto-scaling policies
5. Configure CloudWatch monitoring

#### Google Cloud Run
1. Push image to GCR
2. Deploy to Cloud Run
3. Configure Cloud SQL for database
4. Set up Cloud Load Balancing
5. Configure Stackdriver monitoring

#### Azure Container Instances
1. Push image to ACR
2. Create container instance
3. Configure Azure Database
4. Set up Application Gateway
5. Configure Application Insights

## Rollback Strategy

### 1. Version Tagging
- Tag all production releases
- Maintain last 5 versions
- Document version changes
- Test rollback procedures

### 2. Database Migrations
- Version database schema
- Backward compatible changes
- Migration rollback scripts
- Database backup before migration

### 3. Blue-Green Deployment
- Maintain two production environments
- Switch traffic between versions
- Quick rollback capability
- Zero-downtime deployments

## Cost Optimization

### 1. Resource Sizing
- Start with minimal resources
- Monitor actual usage
- Right-size containers
- Use spot instances where possible

### 2. Image Storage
- Clean up old images regularly
- Use image registry with retention policies
- Compress layers where possible
- Share base layers across services

### 3. Development Costs
- Use local development environment
- Shut down unused environments
- Automate environment provisioning
- Use free tier services where available

## Timeline & Milestones

### Week 1: Foundation
- [ ] Create base Dockerfile
- [ ] Set up docker-compose files
- [ ] Configure environment variables
- [ ] Test local development workflow

### Week 2: Optimization
- [ ] Implement multi-stage builds
- [ ] Add health checks
- [ ] Configure logging
- [ ] Optimize image size

### Week 3: Security & Testing
- [ ] Implement security best practices
- [ ] Set up vulnerability scanning
- [ ] Create test configurations
- [ ] Document security procedures

### Week 4: Deployment & Documentation
- [ ] Create deployment scripts
- [ ] Set up CI/CD pipeline
- [ ] Write deployment documentation
- [ ] Create troubleshooting guide

## Success Metrics

### Technical Metrics
- Image size < 100MB
- Container start time < 5 seconds
- Memory usage < 256MB
- CPU usage < 0.5 cores
- 99.9% uptime

### Development Metrics
- Build time < 2 minutes
- Deployment time < 5 minutes
- Rollback time < 1 minute
- Test coverage > 80%
- Zero security vulnerabilities

## Troubleshooting Guide

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker logs radiocalico_app_1

# Inspect container
docker inspect radiocalico_app_1

# Check health status
docker ps --format "table {{.Names}}\t{{.Status}}"
```

#### Database Connection Issues
```bash
# Verify volume mount
docker exec radiocalico_app_1 ls -la /app/database

# Check permissions
docker exec radiocalico_app_1 stat /app/database/radiocalico.db

# Test database connection
docker exec radiocalico_app_1 npm run test:db
```

#### Performance Issues
```bash
# Check resource usage
docker stats radiocalico_app_1

# Profile application
docker exec radiocalico_app_1 node --prof src/server.js

# Analyze logs
docker logs radiocalico_app_1 2>&1 | grep ERROR
```

## Next Steps

1. **Immediate Actions**
   - Create Dockerfile with multi-stage build
   - Set up docker-compose configurations
   - Test development workflow
   - Document container usage

2. **Short-term Goals**
   - Implement health checks
   - Add monitoring endpoints
   - Set up log aggregation
   - Create backup procedures

3. **Long-term Vision**
   - Kubernetes deployment
   - Service mesh integration
   - Distributed tracing
   - Auto-scaling policies

## Conclusion

This containerization plan provides a comprehensive approach to packaging RadioCalico as a self-contained, deployable application. The multi-stage build process ensures optimal image size and security, while separate development and production configurations maintain environment integrity. With proper implementation of this plan, RadioCalico will be ready for deployment across various container orchestration platforms with minimal configuration changes.

---

**Document Version:** 1.0
**Created:** 2025-01-14
**Author:** RadioCalico Development Team
**Status:** Ready for Implementation