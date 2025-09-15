# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RadioCalico is an internet radio application built with Node.js and Express. Both backend and frontend have been completely refactored from monolithic architecture into modern, modular patterns with clear separation of concerns. It uses SQLite for local database storage and provides both API endpoints and a progressive web application interface.

**Architecture Status**:
- Phase 1 (Backend Restructuring) completed ✅ - MVC architecture with comprehensive API
- Phase 2 (Frontend Modularization) completed ✅ - Component-based architecture with ES6 modules
- Testing Framework implemented ✅ - Jest unit testing with critical fixes applied
- Docker Containerization completed ✅ - Production-ready multi-stage builds with security fixes

**Current Status**: Fully functional with modular backend, modern frontend architecture, PWA capabilities, comprehensive documentation, unit testing framework with in-memory database isolation, and production-ready Docker containerization with security best practices.

## Commands

### Docker Commands (Recommended)
- `make dev` - Start development environment with hot-reload
- `make prod` - Start production environment
- `make test` - Run tests in Docker container
- `make logs` - View container logs
- `make shell` - Open shell in running container
- `make clean` - Stop containers and remove images

### PostgreSQL Commands
- `make postgres` - Start PostgreSQL environment
- `make postgres-up` - Start PostgreSQL in background
- `make postgres-down` - Stop PostgreSQL environment
- `make postgres-shell` - Open PostgreSQL CLI
- `make migrate` - Migrate data from SQLite to PostgreSQL
- `make pgadmin` - Start pgAdmin interface (port 5050)

### Traditional Development
- `npm start` - Start the production server (default port 3000, configurable via PORT env var)
- `npm run dev` - Start the development server with auto-reload using nodemon

### Testing
- `npm test` - Run all tests (backend and frontend)
- `npm run test:backend` - Run backend tests only
- `npm run test:frontend` - Run frontend tests only
- `npm run test:watch` - Run tests in watch mode for development
- `npm run test:coverage` - Generate test coverage report
- `npm run test:verbose` - Run tests with verbose output

### Installation
- `npm install` - Install all dependencies

## Architecture (Post-Phase 1 Refactor)

### Backend Structure (MVC Pattern)
The backend follows a modular MVC architecture with clear separation of concerns:

- **src/server.js**: Application entry point (src/server.js:1-63)
  - Configures middleware pipeline
  - Mounts API routes
  - Handles graceful shutdown
  - Environment-based configuration

- **src/config/**: Configuration management
  - **environment.js**: Centralized config with validation
  - **database.js**: Database-specific configuration
  - **index.js**: Configuration exports

- **src/routes/**: API route definitions
  - **index.js**: Route aggregation and mounting
  - **health.js**: Health check routes
  - **users.js**: User management routes
  - **songs.js**: Song rating routes

- **src/controllers/**: Request/response handling layer
  - **healthController.js**: Health check logic
  - **userController.js**: User management logic
  - **songController.js**: Song rating logic

- **src/services/**: Business logic layer
  - **healthService.js**: Health check business logic
  - **userService.js**: User validation and management
  - **songService.js**: Song rating validation and logic

- **src/middleware/**: Express middleware components
  - **cors.js**: CORS configuration
  - **errorHandler.js**: Global error handling
  - **validation.js**: Request validation
  - **logging.js**: Request/response logging
  - **index.js**: Middleware exports

- **src/database/**: Data access layer
  - **db.js**: SQLite operations for users and song ratings
  - **postgres.js**: PostgreSQL connection pool and operations
  - **index.js**: Unified database interface supporting both SQLite and PostgreSQL
  - Auto-creates database directory if missing (skipped for in-memory databases)
  - Database file location: `./database/radiocalico.db` (configurable via DATABASE_FILE env var)
  - Supports `:memory:` for in-memory SQLite database (used in testing)
  - PostgreSQL support with connection pooling, UUID keys, JSONB columns

### Testing Framework
The project includes a comprehensive unit testing framework using Jest:

- **tests/**: Test directory structure
  - **backend/**: Backend test suites
    - **unit/**: Unit tests for services, controllers, middleware
    - **integration/**: Integration tests for API endpoints (planned)
  - **frontend/**: Frontend test suites
    - **unit/**: Unit tests for modules, services, utils
    - **mocks/**: Mock handlers and style mocks
  - **setup/**: Test configuration files
    - **jest.backend.config.js**: Backend Jest configuration
    - **jest.frontend.config.js**: Frontend Jest configuration
    - **backend.setup.js**: Backend test environment setup (uses in-memory SQLite)
    - **frontend.setup.js**: Frontend test environment setup (JSDOM, localStorage mocks)

- **Test Configuration**:
  - In-memory SQLite database for isolated test execution
  - Proper database cleanup in test teardown
  - Jest-JUnit reporter for CI/CD integration
  - Separate Babel configurations for backend/frontend

- **Test Coverage**:
  - Backend: 80% target coverage
  - Frontend: 75% target coverage
  - Current: All tests passing ✅ (33 tests across 2 suites)

### Frontend (Modular Architecture - Phase 2 Complete)

#### Main Application
- **public/radio-modular.html**: Modern PWA application (160 lines)
  - Semantic HTML with accessibility features (ARIA labels, keyboard navigation)
  - Progressive Web App capabilities with service worker
  - Clean, maintainable structure with external assets
  - SEO optimized with Open Graph meta tags

- **public/radio.html**: Legacy monolithic version (1,080+ lines) - kept for reference

#### CSS Architecture (Modular)
- **public/css/main.css**: Main stylesheet with imports
- **public/css/base/**: Foundation styles (variables, reset, layout)
- **public/css/components/**: Component-specific styles (header, player, rating, etc.)
- **public/css/utilities/**: Helper and utility classes
- Uses CSS custom properties for consistent theming
- Mobile-first responsive design with breakpoints

#### JavaScript Architecture (ES6 Modules)
- **public/js/app.js**: Main application coordinator
- **public/js/utils/AppState.js**: Centralized state management
- **public/js/utils/constants.js**: Application constants and states
- **public/js/services/**: External service integrations
  - ApiService.js: Backend API communication
  - iTunesService.js: Album artwork fetching with caching
  - MetadataService.js: Track metadata polling with quality parsing
    - Displays source quality from metadata (bit_depth/sample_rate)
    - Shows HLS adaptive stream quality separately
- **public/js/modules/**: Core functionality modules
  - AudioPlayer.js: HLS.js streaming integration
  - RatingSystem.js: Song rating with backend sync

#### PWA Features
- **public/sw.js**: Service worker for offline capabilities
- Caching strategy for static assets and API responses
- Background sync for rating submissions
- Push notification support (framework ready)

#### Legacy Components
- **public/index.html**: Development dashboard (125 lines)
  - Health check monitoring
  - Database connection testing
  - Auto-refreshes health status every 30 seconds

### API Endpoints

#### Health & System
- `GET /api/health` - Server health status
- `GET /api/health/db` - Database connectivity check
- `GET /api/test-db` - Legacy database endpoint (same as health/db)

#### User Management
- `POST /api/users` - Create new user (username, email required)
- `GET /api/users` - Get all users

#### Song Rating System
- `POST /api/songs/rate` - Rate a song (1=like, -1=dislike, 0=remove rating)
- `GET /api/songs/:songId/ratings` - Get song ratings with optional user rating

All endpoints return JSON with consistent `{success: true/false, ...}` format.

## Documentation

### Knowledge Base (kb/)
Comprehensive documentation covering all aspects of the refactored backend:

- **kb/README.md** - Documentation overview and navigation
- **kb/backend-architecture.md** - Complete architecture documentation
- **kb/api-documentation.md** - Full API reference with examples
- **kb/configuration-guide.md** - Environment and configuration management
- **kb/middleware-documentation.md** - Middleware pipeline documentation
- **kb/development-guide.md** - Developer workflow and guidelines

### Testing & Containerization Documentation (docs/)
Implementation documentation:

- **docs/testing-strategy.md** - Complete testing strategy and approach
- **docs/testing-framework-summary.md** - Testing framework overview
- **docs/testing-critical-fixes-plan.md** - Phase 1 critical fixes implementation plan
- **docs/docker-containerization-plan.md** - Docker implementation strategy and phases

### Refactoring Plan (kb/proposed/)
- **kb/proposed/overview.md** - Complete 8-phase refactoring plan
- Individual phase documentation for Phases 1-6
- Phase 1 (Backend Restructuring) - ✅ Completed

### Production Hardening Plan (kb/proposed/production-hardening/)
- **README.md** - Overview and navigation for production hardening
- **overview.md** - Executive summary, goals, architecture transformation
- **postgresql-migration.md** - Complete PostgreSQL migration guide from SQLite
- **nginx-configuration.md** - nginx setup for reverse proxy, SSL/TLS, WAF
- **implementation-phases.md** - 35-day phased implementation timeline
- **migration-scripts.md** - Production-ready migration scripts and tools

## Environment Configuration

The application uses centralized configuration with environment variable support:

### Core Variables
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: localhost)
- `NODE_ENV` - Environment mode (development/production/test)
- `DATABASE_TYPE` - Database type: 'sqlite' or 'postgres' (default: sqlite)
- `DATABASE_FILE` - SQLite database file path

### PostgreSQL Variables (when DATABASE_TYPE=postgres)
- `PG_HOST` - PostgreSQL host (default: localhost)
- `PG_PORT` - PostgreSQL port (default: 5432)
- `PG_DATABASE` - Database name (default: radiocalico)
- `PG_USER` - Database user (default: radiocalico)
- `PG_PASSWORD` - Database password
- `PG_MAX_CONNECTIONS` - Connection pool size (default: 20)
- `PG_SSL` - Enable SSL connection (default: false)

### Security & Performance
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `CORS_CREDENTIALS` - Enable CORS credentials (true/false)
- `RATE_LIMIT_WINDOW` - Rate limiting window in ms
- `RATE_LIMIT_MAX` - Max requests per window per IP
- `MAX_REQUEST_SIZE` - Maximum request payload size

### Logging
- `LOG_LEVEL` - Logging level (error/warn/info/debug)
- `ENABLE_REQUEST_LOGGING` - Enable HTTP request logging (true/false)

## Dependencies

### Production
- express (v5.1.0) - Web framework
- sqlite3 (v5.1.7) - SQLite database
- pg (v8.x) - PostgreSQL client
- pg-pool - PostgreSQL connection pooling
- dotenv - Environment variable management
- cors - CORS middleware
- body-parser - Request body parsing

### Development
- nodemon - Auto-reload on file changes
- jest (v30.1.3) - Testing framework
- @types/jest - TypeScript definitions for Jest
- jest-junit - JUnit reporter for CI
- supertest (v7.1.4) - HTTP assertion library
- jsdom (v27.0.0) - DOM implementation for Node.js
- jest-environment-jsdom - Jest browser environment
- @testing-library/dom - DOM testing utilities
- @testing-library/jest-dom - Custom Jest matchers
- @babel/core, @babel/preset-env, babel-jest - ES6 transpilation

## Quick Start

### Local Development
```bash
# Setup and start
npm install
npm start

# Server will be available at:
# - Modern PWA: http://localhost:3000/radio-modular.html (recommended)
# - Legacy app: http://localhost:3000/radio.html
# - Health dashboard: http://localhost:3000/
# - API health: http://localhost:3000/api/health
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode during development
npm run test:watch

# Run specific test suite
npm run test:backend
npm run test:frontend
```

### Testing API Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com"}'

# Rate a song
curl -X POST http://localhost:3000/api/songs/rate \
  -H "Content-Type: application/json" \
  -d '{"songId":"test123","artist":"Test","title":"Song","rating":1,"userIdentifier":"user123"}'
```

## Docker Containerization

### Container Configuration Files
- **Dockerfile** - Multi-stage production build with Alpine Linux
  - Stage 1: Dependencies installation with build tools cleanup
  - Stage 2: Build and test execution (continues on test failure)
  - Stage 3: Optimized production image (~155MB)
- **Dockerfile.dev** - Development container with hot-reload support
  - Node.js debugging port exposed (9229)
  - Volume mounting for live code changes
  - Non-root user for security
- **docker-compose.yml** - Production orchestration
  - Resource limits (1 CPU, 512MB memory)
  - Health checks with wget
  - Automatic restart policy
- **docker-compose.dev.yml** - Development orchestration
  - Extended resource allocation (2 CPU, 1GB memory)
  - Volume persistence for database
  - Debug port exposure
- **Makefile** - Simplified container management
  - Development and production shortcuts
  - Database backup/restore commands
  - Health check with curl/wget fallback

### Security & Best Practices Applied
- Non-root user execution (nodejs:1001) in all containers
- Build dependencies removed after npm install using virtual packages
- Resource limits enforced (CPU and memory constraints)
- Health checks configured with proper intervals and retries
- Test execution gracefully handles failures in build process
- Volume persistence for stateful data (database, logs)
- Clean separation of dev/prod configurations
- Optimized .dockerignore for minimal build context

## Project Assets

### Style Guide
- A text version of the style guide for the webpage is at $(pwd)/RadioCalico_Style_Guide.txt
- The logo is at $(pwd)/RadioCalicoLogoTM.png

## Implementation Status

### ✅ Completed (Phase 1 - Backend Restructuring)
- Backend MVC architecture refactoring
- Modular route/controller/service structure
- Comprehensive middleware pipeline
- Centralized configuration management
- Full API documentation
- Complete knowledge base documentation

### ✅ Completed (Phase 2 - Frontend Modularization)
- Modular CSS architecture with component-based styles
- ES6 JavaScript modules with state management
- Semantic HTML structure with accessibility features
- Progressive Web App (PWA) capabilities
- Service worker for offline support
- Component communication system
- Clean separation of concerns (20+ organized files)

### ✅ Completed (Docker Containerization)
- Multi-stage Dockerfile for optimized production images (155MB)
- Separate development and production configurations
- Docker Compose orchestration for both environments
- Health checks and graceful shutdown handling
- Volume persistence for database and logs
- Non-root user security implementation (nodejs:1001)
- Makefile for simplified container management
- Environment-specific configurations (.env.docker.dev/.prod)
- Critical security fixes applied:
  - Build dependencies cleanup using virtual packages
  - Test execution gracefully handles failures
  - Resource limits enforced (CPU/memory)
  - Proper error handling in health checks

### ✅ Completed (Testing Framework Implementation)
- Jest testing framework for both backend and frontend
- Separate test configurations for different environments
- Unit tests for critical services and state management
- Test coverage targets: 80% backend, 75% frontend
- All tests passing (33 tests across 2 suites)
- Mock implementations for external dependencies
- Testing documentation and best practices

#### Phase 1 Critical Fixes (Completed)
- Fixed SQLite in-memory database configuration for proper test isolation
- Removed incorrectly created `:memory:` file issue
- Added proper database cleanup in test teardown
- Configured jest-junit reporter for CI/CD integration
- Updated .gitignore to exclude test artifacts
- Created comprehensive testing fixes plan documentation

### 📋 Next Phases

#### Phase 3 - Build Tooling & Modern Development
- Vite build system with hot module replacement
- ESLint, Prettier, and Stylelint for code quality
- PostCSS for advanced CSS processing
- Automated optimization and bundling
- Expand test coverage to integration and E2E tests

#### Production Hardening (In Progress)
- **Database**: ✅ PostgreSQL migration implemented with dual database support
  - Unified database interface for SQLite/PostgreSQL
  - Connection pooling and optimized queries
  - Migration scripts and data validation tools
  - Docker Compose configuration for PostgreSQL stack
- **Web Server**: Implement nginx for reverse proxy and static file serving (planned)
- **Security**: Add WAF, SSL/TLS, rate limiting, and DDoS protection (planned)
- **High Availability**: Database replication, load balancing, clustering (planned)
- **Performance**: Caching strategies, CDN integration, query optimization (planned)
- **Timeline**: 35-day implementation plan with 6 phases
- **Target**: Support 10,000+ concurrent users with 99.9% uptime

Refer to `kb/proposed/overview.md` for complete 8-phase roadmap and `kb/proposed/production-hardening/` for production deployment plan.