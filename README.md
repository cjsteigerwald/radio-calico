# RadioCalico

![Tests](https://img.shields.io/badge/tests-33%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-backend%2080%25%20%7C%20frontend%2075%25-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A modern internet radio streaming application with high-quality audio and interactive features. Built with Node.js/Express backend and modular frontend architecture. Features comprehensive unit testing with Jest, including in-memory database isolation and full CI/CD integration.

## Features

- **Live HLS Audio Streaming** - High-quality lossless audio streaming
- **Interactive Song Rating** - Like/dislike tracks with real-time counts
- **Album Artwork Integration** - Automatic artwork fetching via iTunes API
- **Recent Tracks History** - Track previously played songs
- **Progressive Web App** - Offline support and installable experience
- **Mobile Responsive** - Optimized for all device sizes
- **Accessibility Compliant** - WCAG 2.1 AA standards

## Architecture

### Backend (Node.js/Express)
- **MVC Architecture** - Clean separation of concerns
- **Dual Database Support** - SQLite for development, PostgreSQL for production
- **RESTful API** - JSON endpoints for frontend integration
- **CORS Enabled** - Cross-origin resource sharing support
- **Connection Pooling** - Optimized PostgreSQL performance

### Frontend (Modular ES6)
- **Component-Based CSS** - 11 modular CSS files with design system
- **ES6 Modules** - 7 JavaScript modules with reactive state management
- **Semantic HTML** - Accessible markup with ARIA labels
- **Service Worker** - PWA capabilities with offline caching

## Quick Start

### Docker Quick Start (Recommended)

#### Prerequisites
- Docker Desktop or Docker Engine
- Docker Compose
- Make (optional, for simplified commands)

#### Quick Start
```bash
# Clone repository
git clone https://github.com/cjsteigerwald/radio-calico.git
cd radiocalico

# Start with Docker
make dev    # Development with hot-reload
# OR
make prod   # Production deployment

# Access the application
open http://localhost:3000/radio-modular.html
```

### PostgreSQL Setup (Production)

#### Prerequisites
- PostgreSQL 15+
- Node.js 16+
- npm

#### Quick Start with Docker
```bash
# Start PostgreSQL
make postgres-up

# Run application with PostgreSQL
DATABASE_TYPE=postgres npm start

# Access pgAdmin (optional)
make pgadmin
# Open http://localhost:5050
```

#### Migration from SQLite
```bash
# Run migration script
make migrate

# Or manually
node scripts/migrate-to-postgres.js
```

### Traditional Setup (SQLite)

#### Prerequisites
- Node.js 16+
- npm

#### Installation
```bash
# Clone repository
git clone https://github.com/cjsteigerwald/radio-calico.git
cd radiocalico

# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

### Access Points
- **Main Application**: http://localhost:3000/radio-modular.html
- **Development Dashboard**: http://localhost:3000/
- **Health Check**: http://localhost:3000/api/health

## File Structure

```
radiocalico/
├── src/                    # Backend source code
│   ├── server.js          # Express server
│   ├── config/            # Configuration management
│   ├── controllers/       # Request handlers
│   ├── services/          # Business logic
│   ├── routes/            # API endpoints
│   ├── middleware/        # Express middleware
│   └── database/          # Database operations
├── public/                # Frontend assets
│   ├── radio-modular.html # Main PWA application
│   ├── radio.html         # Legacy version
│   ├── css/               # Modular stylesheets
│   │   ├── base/          # Foundation styles
│   │   ├── components/    # Component styles
│   │   └── utilities/     # Helper classes
│   ├── js/                # ES6 modules
│   │   ├── modules/       # Core functionality
│   │   ├── services/      # API integrations
│   │   └── utils/         # Shared utilities
│   └── sw.js              # Service worker
├── tests/                 # Test suites
│   ├── backend/           # Backend tests
│   │   ├── unit/          # Unit tests
│   │   └── integration/   # Integration tests
│   ├── frontend/          # Frontend tests
│   │   ├── unit/          # Unit tests
│   │   └── mocks/         # Test mocks
│   └── setup/             # Test configuration
├── docs/                  # Project documentation
│   ├── testing-strategy.md
│   └── testing-framework-summary.md
├── kb/                    # Knowledge base
│   ├── frontend-architecture.md
│   ├── backend-architecture.md
│   └── development-guide.md
└── database/              # SQLite database files
```

## API Endpoints

### Health & Status
- `GET /api/health` - Server health check
- `GET /api/test-db` - Database connection test

### Song Management
- `POST /api/songs/rate` - Submit song rating
- `GET /api/songs/:id/ratings` - Get song rating counts

### Track Information
- `GET /api/current-track` - Current playing track info
- `GET /api/recent-tracks` - Recently played tracks

## Development

### Quick Start with Docker
```bash
# Development environment with hot-reload
make dev

# Production environment
make prod

# Run tests in container
make test

# View available commands
make help
```

### Traditional Setup
```bash
npm install          # Install dependencies
npm run dev          # Start with nodemon auto-reload
npm start            # Production server
npm test             # Run all test suites
npm run test:backend # Run backend tests only
npm run test:frontend # Run frontend tests only
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Docker Commands
```bash
# Build images
docker build -t radiocalico:latest .                  # Production image
docker-compose -f docker-compose.dev.yml build        # Development image

# Run containers
docker-compose -f docker-compose.dev.yml up           # Development mode
docker-compose up -d                                  # Production mode

# PostgreSQL containers
docker-compose -f docker-compose.postgres.yml up -d   # PostgreSQL stack
make postgres-up                                      # Start PostgreSQL
make postgres-shell                                   # PostgreSQL CLI

# Container management
docker-compose logs -f                                # View logs
docker exec -it radiocalico-app sh                    # Shell access
docker-compose down                                   # Stop containers

# Database backup
docker run --rm -v radiocalico_database:/data -v $(pwd):/backup alpine \
  tar czf /backup/database-backup-$(date +%Y%m%d).tar.gz /data
```

### Environment Configuration
Create `.env` file:
```env
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_TYPE=sqlite  # or 'postgres' for PostgreSQL
DATABASE_FILE=./database/radiocalico.db

# PostgreSQL Configuration (if DATABASE_TYPE=postgres)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=radiocalico
PG_USER=radiocalico
PG_PASSWORD=radiocalico_password
```

### Adding New Features

#### Frontend Components
1. Create CSS file in `public/css/components/`
2. Add ES6 module in `public/js/modules/`
3. Import in `public/css/main.css` and `public/js/app.js`
4. Follow existing patterns for state management

#### Backend Endpoints
1. Add route in `src/routes/`
2. Create controller in `src/controllers/`
3. Update model in `src/models/` if needed
4. Follow MVC architecture patterns

## Docker Support

### Containerization Features
- **Multi-stage builds** - Optimized production images (155MB)
- **Development container** - Hot-reload and debugging support
- **Production container** - Security-hardened with non-root user
- **Docker Compose** - Orchestration for both dev and prod
- **Health checks** - Built-in container health monitoring
- **Volume persistence** - Database and logs persist across restarts

### Docker Images
- **Base**: Node.js 20 Alpine Linux (minimal footprint)
- **Production Size**: ~155MB
- **Security**: Non-root user (nodejs:1001)
- **Ports**: 3000 (app), 9229 (debug in dev)
- **Volumes**: `/app/database`, `/app/logs`

### Container Management
```bash
# Using Makefile (recommended)
make dev        # Start development
make prod       # Start production
make test       # Run tests
make logs       # View logs
make shell      # Container shell access
make clean      # Remove containers
make health     # Check container health

# Using docker-compose directly
docker-compose -f docker-compose.dev.yml up    # Development
docker-compose up -d                           # Production
docker-compose down                            # Stop
docker-compose ps                              # View running containers
```

### Environment Files
- `.env.docker.dev` - Development configuration
- `.env.docker.prod` - Production configuration (update ALLOWED_ORIGINS for your domain)

### Troubleshooting Docker

#### Container won't start
```bash
# Check logs
docker-compose logs -f app

# Rebuild image
docker-compose build --no-cache
```

#### Permission issues
```bash
# Fix volume permissions
docker exec radiocalico-app chown -R nodejs:nodejs /app/database
```

#### Port conflicts
```bash
# Check if port 3000 is in use
lsof -i :3000

# Use different port
PORT=3001 docker-compose up
```

## Progressive Web App

RadioCalico includes PWA features:
- **Offline Support** - Cached static assets
- **Installable** - Add to home screen
- **Service Worker** - Background sync capabilities
- **App Manifest** - Native app-like experience

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires ES6 modules and modern CSS support.

## Testing

### Framework
- **Jest** - Testing framework for both frontend and backend
- **Separate Configurations** - Optimized for Node.js and browser environments
- **In-Memory Database** - SQLite `:memory:` for isolated test execution
- **Coverage Targets** - 80% backend, 75% frontend
- **CI/CD Integration** - Jest-JUnit reporter for GitHub Actions and other CI systems
- **Test Isolation** - Proper setup/teardown with database cleanup

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend
```

### Test Structure
- **Backend Tests** (`tests/backend/`)
  - Unit tests for services, controllers, middleware
  - Integration tests for API endpoints (planned)
  - In-memory SQLite database for test isolation
  - Automatic database cleanup after tests

- **Frontend Tests** (`tests/frontend/`)
  - Unit tests for modules and utilities
  - DOM testing with JSDOM environment
  - Mocked browser APIs (localStorage, fetch, HLS.js)
  - ES6 module support with Babel transpilation

### Test Configuration
- **Jest Config** (`jest.config.js`) - Main configuration orchestrating test suites
- **Backend Setup** (`tests/setup/backend.setup.js`) - Node environment with in-memory database
- **Frontend Setup** (`tests/setup/frontend.setup.js`) - JSDOM environment with browser mocks
- **Babel Config** (`.babelrc`) - ES6 module transpilation for tests

### Coverage Reports
- Generated in `coverage/` directory after running `npm run test:coverage`
- JUnit XML reports in `test-results/` for CI/CD integration
- Separate coverage tracking for backend and frontend code

## Documentation

### Technical Documentation (`/kb/`)
- **Frontend Architecture** - Component structure and patterns
- **CSS Architecture** - Design system and styling approach
- **JavaScript Modules** - Module system and API reference
- **Backend Architecture** - MVC patterns and service layer

### Testing Documentation (`/docs/`)
- **Testing Strategy** (`testing-strategy.md`) - Complete testing approach and guidelines
- **Testing Framework** (`testing-framework-summary.md`) - Framework overview and setup
- **Testing Fixes Plan** (`testing-critical-fixes-plan.md`) - Phase 1 critical fixes documentation

## Deployment

### Production Deployment with Docker

#### Local Production
```bash
# Build and start production container
make prod

# Or manually
docker-compose up -d
```

#### Cloud Deployment

##### AWS ECS
1. Push image to ECR
2. Create ECS task definition
3. Configure Application Load Balancer
4. Set up auto-scaling

##### Google Cloud Run
1. Push image to Artifact Registry
2. Deploy with `gcloud run deploy`
3. Configure custom domain

##### DigitalOcean App Platform
1. Connect GitHub repository
2. Select Dockerfile
3. Configure environment variables
4. Deploy

#### SSL/TLS Configuration
For production, use a reverse proxy (nginx, Traefik) or cloud load balancer for SSL termination.

## Contributing

This is a proof-of-concept project built with Claude Code. The architecture supports:
- Modular development
- Component-based design
- Clean separation of concerns
- Comprehensive documentation

## License

MIT License - See LICENSE file for details

## Built With Claude Code

This project was developed using [Claude Code](https://claude.ai/code) for rapid prototyping and modern web development practices.