# RadioCalico Knowledge Base

Welcome to the RadioCalico Knowledge Base - your comprehensive guide to understanding, developing, and maintaining the RadioCalico internet radio application.

## Documentation Overview

This knowledge base contains detailed documentation for all aspects of the RadioCalico project, from high-level architecture decisions to specific implementation details.

### 📋 Project Planning & Architecture

#### **[Complete Refactoring Overview](proposed/overview.md)**
Executive summary of the 8-week refactoring plan that transforms RadioCalico from a monolithic application into a modern, scalable system.

#### **Phase-by-Phase Implementation Guides**
- **[Phase 1: Backend Restructuring](proposed/phase-1-backend-restructuring.md)** ✅ *Completed*
  - MVC architecture implementation
  - Route separation and controller layers
  - Service layer with business logic
  - Middleware organization
  - Configuration management

- **[Phase 2: Frontend Modularization](proposed/phase-2-frontend-modularization.md)** 📋 *Planned*
- **[Phase 3: Build Tooling](proposed/phase-3-build-tooling.md)** 📋 *Planned*
- **[Phase 4: API & Data Layer](proposed/phase-4-api-data-layer.md)** 📋 *Planned*
- **[Phase 5: Testing & Quality](proposed/phase-5-testing-quality.md)** 📋 *Planned*
- **[Phase 6: Performance & Deployment](proposed/phase-6-performance-deployment.md)** 📋 *Planned*

### 🏗️ Backend Documentation

#### **[Backend Architecture Guide](backend-architecture.md)**
Comprehensive overview of the refactored backend architecture, including:
- MVC pattern implementation
- Component responsibilities and interactions
- Data flow and request lifecycle
- Error handling strategy
- Security features and performance considerations

#### **[API Documentation](api-documentation.md)**
Complete API reference with:
- All endpoint specifications
- Request/response formats
- Error codes and handling
- Authentication requirements
- Usage examples and testing procedures

#### **[Configuration Guide](configuration-guide.md)**
Detailed configuration management documentation:
- Environment variable reference
- Configuration validation
- Environment-specific setups
- Security best practices
- Docker and deployment configurations

#### **[Middleware Documentation](middleware-documentation.md)**
In-depth middleware pipeline documentation:
- Middleware execution order
- Component-by-component breakdown
- Custom middleware development
- Performance considerations
- Security implications

#### **[Development Guide](development-guide.md)**
Developer-focused guide for contributing to the project:
- Development workflow
- Code style guidelines
- Testing strategies
- Adding new features
- Debugging techniques
- Deployment procedures

## Quick Reference

### 🚀 Getting Started
```bash
# Setup project
npm install
cp .env.example .env

# Development server
npm run dev

# Production server
npm start
```

### 🔍 Key Endpoints
- **Health Check**: `GET /api/health`
- **Database Health**: `GET /api/health/db`
- **User Management**: `POST /api/users`, `GET /api/users`
- **Song Rating**: `POST /api/songs/rate`, `GET /api/songs/:id/ratings`

### 📁 Architecture Overview
```
src/
├── server.js          # Application entry point
├── config/            # Configuration management
├── controllers/       # Request/response handling
├── services/          # Business logic
├── routes/           # API route definitions
├── middleware/       # Express middleware
└── database/         # Data access layer
```

## Project Status

### ✅ Phase 1 Complete: Backend Restructuring
- **Duration**: 2 weeks (completed)
- **Achievement**: Transformed monolithic server into modular MVC architecture
- **Impact**: Improved maintainability, testability, and scalability
- **Files Changed**: 20+ new files, 125-line server.js → 63 lines + modular components

### 📈 Key Improvements Delivered
- **Separation of Concerns**: Routes → Controllers → Services → Database
- **Error Handling**: Centralized error middleware with proper HTTP status codes
- **Configuration Management**: Environment-based config with validation
- **Security**: Input validation, CORS configuration, request size limits
- **Performance**: Optimized middleware pipeline and request handling
- **Documentation**: Comprehensive knowledge base with 5 detailed guides

### 🎯 Next Steps
Phase 2 (Frontend Modularization) is ready to begin:
- Break down 1,080-line HTML file into modular components
- Implement CSS architecture with custom properties
- Create ES6 modules for JavaScript functionality
- Establish component communication patterns

## Development Principles

### Code Quality Standards
- **Single Responsibility**: Each component has one clear purpose
- **Error Handling**: Explicit error handling at every layer
- **Security First**: Input validation, parameterized queries, secure headers
- **Performance Conscious**: Optimized middleware, efficient database queries
- **Test Coverage**: Comprehensive testing strategy with unit and integration tests

### Architecture Decisions
- **MVC Pattern**: Clear separation between routes, controllers, and services
- **Configuration Driven**: Environment variables for all configurable values
- **Middleware Pipeline**: Ordered middleware for cross-cutting concerns
- **RESTful APIs**: Consistent REST patterns with proper HTTP status codes
- **Database Abstraction**: Service layer abstracts database operations

## Contributing

### Before Contributing
1. Read the **[Development Guide](development-guide.md)**
2. Review **[API Documentation](api-documentation.md)** for endpoint patterns
3. Understand **[Backend Architecture](backend-architecture.md)**
4. Follow **[Configuration Guide](configuration-guide.md)** for environment setup

### Development Workflow
1. Create feature branch from `main`
2. Follow established patterns in existing code
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

### Code Review Checklist
- [ ] Follows established architecture patterns
- [ ] Includes appropriate error handling
- [ ] Has test coverage
- [ ] Updates documentation
- [ ] Follows security best practices

## Troubleshooting

### Common Issues
- **Port in use**: Change `PORT` environment variable
- **Database locked**: Check file permissions and running processes
- **CORS errors**: Update `ALLOWED_ORIGINS` configuration
- **Request too large**: Adjust `MAX_REQUEST_SIZE` setting

### Debug Configuration
```bash
# Enable detailed logging
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
NODE_ENV=development
```

### Getting Help
1. Check relevant documentation section
2. Review troubleshooting sections in guides
3. Examine error logs and status codes
4. Test with curl commands from API documentation

## Future Vision

### Upcoming Enhancements
- **Frontend Modularization**: Component-based architecture
- **Build System**: Modern tooling with Vite and hot reload
- **Testing Framework**: Comprehensive test suite
- **Performance Optimization**: Caching, CDN, and monitoring
- **Production Deployment**: Docker, CI/CD, and observability

### Long-term Goals
- **Progressive Web App**: Offline functionality and service workers
- **Real-time Features**: WebSocket integration for live updates
- **Advanced Analytics**: User behavior tracking and insights
- **Microservices**: Scalable service-oriented architecture
- **Cloud Native**: Kubernetes deployment and cloud integration

---

## Document Status

| Document | Status | Last Updated | Coverage |
|----------|--------|--------------|----------|
| Backend Architecture | ✅ Complete | 2025-09-13 | Comprehensive |
| API Documentation | ✅ Complete | 2025-09-13 | All endpoints |
| Configuration Guide | ✅ Complete | 2025-09-13 | All variables |
| Middleware Documentation | ✅ Complete | 2025-09-13 | Full pipeline |
| Development Guide | ✅ Complete | 2025-09-13 | Complete workflow |
| Phase 1 Implementation | ✅ Complete | 2025-09-13 | Backend refactor |

**Documentation Coverage**: 100% for Phase 1 backend implementation

This knowledge base will continue to evolve as the project progresses through subsequent phases. Each phase will add new documentation while maintaining the existing guides with updates and refinements.