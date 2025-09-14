# RadioCalico

![Tests](https://img.shields.io/badge/tests-33%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-backend%2080%25%20%7C%20frontend%2075%25-blue)
![License](https://img.shields.io/badge/license-MIT-green)

A modern internet radio streaming application with high-quality audio and interactive features. Built with Node.js/Express backend and modular frontend architecture. Features comprehensive unit testing with Jest.

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
- **SQLite Database** - Local data storage for ratings and tracks
- **RESTful API** - JSON endpoints for frontend integration
- **CORS Enabled** - Cross-origin resource sharing support

### Frontend (Modular ES6)
- **Component-Based CSS** - 11 modular CSS files with design system
- **ES6 Modules** - 7 JavaScript modules with reactive state management
- **Semantic HTML** - Accessible markup with ARIA labels
- **Service Worker** - PWA capabilities with offline caching

## Quick Start

### Prerequisites
- Node.js 16+
- npm

### Installation
```bash
# Clone repository
git clone https://github.com/your-username/radiocalico.git
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

### Commands
```bash
npm run dev          # Start with nodemon auto-reload
npm start            # Production server
npm test             # Run all test suites
npm run test:backend # Run backend tests only
npm run test:frontend # Run frontend tests only
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm install          # Install dependencies
```

### Environment Configuration
Create `.env` file:
```env
PORT=3000
NODE_ENV=development
DATABASE_FILE=./database/radiocalico.db
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
- **Coverage Targets** - 80% backend, 75% frontend
- **Continuous Integration Ready** - GitHub Actions compatible

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
  - Integration tests for API endpoints
  - Database mocking with in-memory SQLite

- **Frontend Tests** (`tests/frontend/`)
  - Unit tests for modules and utilities
  - DOM testing with JSDOM
  - Mocked browser APIs (localStorage, fetch)

### Coverage Reports
Generated in `coverage/` directory after running `npm run test:coverage`

## Documentation

Comprehensive technical documentation available in `/kb/`:
- **Frontend Architecture** - Component structure and patterns
- **CSS Architecture** - Design system and styling approach
- **JavaScript Modules** - Module system and API reference
- **Testing Strategy** - Testing approach and guidelines (`docs/testing-strategy.md`)

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