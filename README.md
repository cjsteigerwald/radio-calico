# RadioCalico

A modern internet radio streaming application with high-quality audio and interactive features. Built with Node.js/Express backend and modular frontend architecture.

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
│   ├── database/          # Database module
│   ├── models/            # Data models
│   ├── controllers/       # Route controllers
│   └── routes/            # API routes
├── public/                # Frontend assets
│   ├── radio-modular.html # Main application
│   ├── css/               # Modular stylesheets
│   ├── js/                # ES6 modules
│   └── sw.js              # Service worker
├── kb/                    # Knowledge base documentation
│   ├── frontend-architecture.md
│   ├── css-architecture.md
│   └── javascript-modules.md
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
npm run dev      # Start with nodemon auto-reload
npm start        # Production server
npm test         # Run test suite (when configured)
npm install      # Install dependencies
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

## Documentation

Comprehensive technical documentation available in `/kb/`:
- **Frontend Architecture** - Component structure and patterns
- **CSS Architecture** - Design system and styling approach
- **JavaScript Modules** - Module system and API reference

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