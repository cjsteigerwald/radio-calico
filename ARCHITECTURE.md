# RadioCalico Architecture Overview

## Quick Reference

For detailed architecture diagrams and visualizations, see:

**📐 [Complete System Architecture Diagrams](docs/architecture-diagram.md)**

This document contains 7 comprehensive Mermaid diagrams covering:
- Full system architecture
- Frontend module architecture
- Backend MVC flow
- Database architecture
- Security architecture
- Deployment architecture
- CI/CD pipeline

---

## Architecture at a Glance

### Frontend Architecture
- **HTML**: Semantic, PWA-enabled single page application
- **CSS**: 11 modular files, component-based design system
- **JavaScript**: ES6 modules with centralized state management
- **Service Worker**: Offline caching and background sync
- **Performance**: WebP images, resource hints, compression (49KB total)

### Backend Architecture (MVC Pattern)
- **Routes**: API endpoint definitions (`/api/health`, `/api/users`, `/api/songs`)
- **Controllers**: Request/response handling with validation
- **Services**: Business logic layer with data validation
- **Database**: Unified interface supporting SQLite and PostgreSQL
- **Middleware**: Security, compression, rate limiting, sanitization

### Database Layer
- **Development**: SQLite (local file + in-memory for tests)
- **Production**: PostgreSQL with connection pooling
- **Abstraction**: Unified interface for seamless switching

### Security (Multi-Layered)
1. **Helmet.js**: Security headers (CSP, X-Frame-Options, HSTS)
2. **Rate Limiting**: 100 requests per 15 minutes per IP
3. **Input Sanitization**: validator.js for XSS prevention
4. **CORS**: Origin-based access control
5. **SAST**: ESLint security plugins
6. **Container Security**: Trivy scanning (0 vulnerabilities)

### Performance Optimizations (Phase 1)
- **Transfer Size**: 128KB → 49KB (62% reduction)
- **Images**: WebP format (49.7% smaller)
- **Compression**: gzip/brotli middleware
- **Caching**: HTTP cache headers (1-day for production)
- **Resource Hints**: Preconnect and DNS prefetch
- **Result**: 30-40% faster load times

---

## Component Breakdown

### Frontend Components

#### JavaScript Modules
```
app.js (Main Coordinator)
├── utils/
│   ├── AppState.js (Centralized State)
│   └── constants.js (Application Constants)
├── services/
│   ├── ApiService.js (Backend API)
│   ├── iTunesService.js (Artwork API)
│   └── MetadataService.js (Track Polling)
└── modules/
    ├── AudioPlayer.js (HLS.js Integration)
    └── RatingSystem.js (Rating Sync)
```

#### CSS Structure
```
css/
├── main.css (Entry Point)
├── base/
│   ├── variables.css (Design Tokens)
│   ├── reset.css (CSS Reset)
│   └── layout.css (Layout Grid)
├── components/
│   ├── header.css
│   ├── album-artwork.css
│   ├── track-details.css
│   ├── rating-system.css
│   ├── player-controls.css
│   └── recent-tracks.css
└── utilities/
    └── helpers.css (Utility Classes)
```

### Backend Components

#### Express Server Structure
```
src/
├── server.js (Application Entry)
├── config/ (Environment Configuration)
├── routes/ (API Endpoint Definitions)
├── controllers/ (Request Handlers)
├── services/ (Business Logic)
├── middleware/ (Express Middleware)
│   ├── cors.js
│   ├── errorHandler.js
│   ├── validation.js
│   ├── logging.js
│   └── security.js
└── database/ (Data Access Layer)
    ├── index.js (Unified Interface)
    ├── db.js (SQLite Operations)
    └── postgres.js (PostgreSQL Operations)
```

---

## Data Flow

### User Interaction Flow
1. **User Action** → HTML/JavaScript Event
2. **State Update** → AppState.js (Centralized)
3. **UI Update** → React to State Changes
4. **API Call** → ApiService → Backend
5. **Database** → SQLite/PostgreSQL
6. **Response** → Update State → Update UI

### API Request Flow
1. **Client Request** → Express Server
2. **Security Middleware** → Headers, Rate Limiting
3. **Compression** → gzip/brotli
4. **CORS & Sanitization** → Origin Check, Input Cleaning
5. **Routes** → Match Endpoint
6. **Controllers** → Validate Request
7. **Services** → Business Logic
8. **Database** → Data Operations
9. **Response** → JSON to Client

### Caching Strategy
- **Service Worker**: Cache static assets (CSS, JS, images)
- **HTTP Cache**: 1-day cache for production static files
- **API Cache**: Network-first with cache fallback
- **CDN Cache**: External resources (fonts, HLS.js)

---

## Key Features

### Progressive Web App (PWA)
- Service worker for offline support
- App manifest with optimized icons
- Installable on mobile and desktop
- Background sync for rating submissions
- Push notification framework (ready)

### Real-Time Features
- HLS.js audio streaming
- Metadata polling (track info updates)
- Real-time rating synchronization
- iTunes artwork fetching with caching

### Responsive Design
- Mobile-first CSS architecture
- Breakpoints for tablet and desktop
- Touch-optimized controls
- Accessible (WCAG 2.1 AA compliant)

---

## Technology Stack

### Frontend
- **HTML5**: Semantic markup with ARIA
- **CSS3**: Custom properties, Grid, Flexbox
- **JavaScript**: ES6 modules, native APIs
- **HLS.js**: Adaptive bitrate streaming
- **Service Worker**: PWA capabilities

### Backend
- **Node.js 20**: Runtime environment
- **Express 5**: Web framework
- **SQLite3**: Development database
- **PostgreSQL**: Production database
- **Compression**: gzip/brotli middleware

### Development Tools
- **Jest**: Testing framework (78 tests)
- **ESLint**: Code quality and security
- **Docker**: Containerization
- **GitHub Actions**: CI/CD
- **Trivy**: Container security scanning
- **Sharp**: Image optimization

---

## Development vs Production

### Development Environment
- SQLite local database
- Hot-reload with nodemon
- Verbose logging enabled
- Source maps available
- Debug port exposed (9229)
- No compression or caching

### Production Environment
- PostgreSQL with connection pool
- Multi-container deployment
- Security headers enforced
- Compression enabled (62% reduction)
- HTTP caching (1-day)
- Health checks configured
- Non-root container user

---

## Performance Metrics

### Current Performance (After Phase 1)
- **First Contentful Paint**: 1.8s (was 2.8s)
- **Largest Contentful Paint**: 2.8s (was 4.0s)
- **Time to Interactive**: 3.2s (was 4.5s)
- **Total Transfer Size**: 49KB (was 128KB)
- **Lighthouse Score**: 85+ (estimated)

### Phase 2 Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.0s
- **Lighthouse Score**: 90+

---

## Security Measures

### Application Security
- Helmet.js security headers
- CORS with origin validation
- Input sanitization (validator.js)
- Rate limiting (DDoS protection)
- XSS prevention
- CSRF protection (planned)

### Container Security
- Non-root user (nodejs:1001)
- Minimal base image (Alpine)
- No unnecessary packages
- Trivy scanning (0 vulnerabilities)
- Resource limits enforced

### Code Security
- ESLint security plugins
- Secret detection scanning
- npm audit checks
- SAST analysis
- Dependency vulnerability scanning

---

## Scalability Considerations

### Current Architecture
- Single container deployment
- SQLite/PostgreSQL support
- Stateless application design
- CDN-ready static assets

### Future Scalability (Planned)
- **Load Balancing**: nginx reverse proxy
- **Horizontal Scaling**: Multiple app containers
- **Database**: PostgreSQL with read replicas
- **Caching**: Redis for session/data cache
- **CDN**: Static asset distribution
- **Monitoring**: Real-time metrics and alerts

---

## Testing Strategy

### Test Coverage
- **78 tests** across 6 test suites
- **Backend**: Services, controllers, middleware
- **Frontend**: Modules, state management, utils
- **In-memory SQLite** for test isolation
- **Mocked APIs** for external dependencies

### Testing Types
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing (planned)
- **E2E Tests**: Full user flow testing (planned)
- **Performance Tests**: Load testing (planned)
- **Security Tests**: SAST, dependency scanning

---

## Deployment

### Docker Deployment
```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up -d
```

### Environment Variables
```env
# Application
PORT=3000
NODE_ENV=production

# Database
DATABASE_TYPE=postgres
PG_HOST=localhost
PG_DATABASE=radiocalico
PG_USER=radiocalico
PG_PASSWORD=***

# Security
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Documentation Links

### Detailed Documentation
- **[System Architecture Diagrams](docs/architecture-diagram.md)** - 7 Mermaid diagrams
- **[Backend Architecture](kb/backend-architecture.md)** - Detailed backend documentation
- **[API Documentation](kb/api-documentation.md)** - Complete API reference
- **[Frontend Architecture](kb/frontend-architecture.md)** - Frontend patterns
- **[Testing Strategy](docs/testing-strategy.md)** - Testing approach
- **[Docker Guide](docs/docker-containerization-plan.md)** - Container deployment

### Quick References
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines
- **[README.md](README.md)** - Project overview
- **[PHASE-1-SUMMARY.md](PHASE-1-SUMMARY.md)** - Performance optimization results

---

## Getting Help

For questions about specific areas:
- **Architecture Questions**: See `docs/architecture-diagram.md`
- **Backend/API**: See `kb/backend-architecture.md` and `kb/api-documentation.md`
- **Frontend/UI**: See `kb/frontend-architecture.md`
- **Testing**: See `docs/testing-strategy.md`
- **Performance**: See `docs/page-speed-optimization-plan.md`
- **Deployment**: See `docs/docker-containerization-plan.md`

---

**Last Updated:** October 2025
**Version:** 1.1.0 (Phase 1 Optimized)
**Status:** Production Ready
