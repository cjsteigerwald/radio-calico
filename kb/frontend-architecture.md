# RadioCalico Frontend Architecture

## Overview

The RadioCalico frontend has been completely refactored from a monolithic 1,080+ line HTML file into a modern, modular architecture following Phase 2 of the refactoring plan. This document outlines the new frontend structure, component design, and implementation details.

## Architecture Transformation

### Before Phase 2 (Monolithic)
```
public/radio.html (1,080+ lines)
├── Embedded CSS (400+ lines)
├── Embedded JavaScript (400+ lines)
├── Mixed HTML structure
└── No separation of concerns
```

### After Phase 2 (Modular)
```
Frontend Architecture:
├── radio-modular.html (160 lines) - Clean semantic HTML
├── css/ (11 files, ~800 lines)
│   ├── base/ - Foundation styles
│   ├── components/ - Component-specific styles
│   └── utilities/ - Helper classes
├── js/ (7 files, ~1,200 lines)
│   ├── app.js - Application coordinator
│   ├── modules/ - Core functionality
│   ├── services/ - External integrations
│   └── utils/ - Shared utilities
└── sw.js - Service worker for PWA
```

## HTML Structure

### Semantic HTML Architecture
The new HTML structure follows semantic principles with proper accessibility:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Modern meta tags, PWA manifest, SEO -->
</head>
<body class="layout-container">
    <header class="header-bar" role="banner">
        <!-- Logo and branding -->
    </header>

    <main class="main-content" role="main">
        <section class="album-section" aria-label="Album artwork">
            <!-- Album artwork with overlay -->
        </section>

        <section class="track-details-section" aria-label="Track information">
            <!-- Track info, quality, rating, controls -->
        </section>

        <section class="footer-section" aria-label="Recently played">
            <!-- Recent tracks list -->
        </section>
    </main>

    <script type="module" src="js/app.js"></script>
</body>
</html>
```

### Accessibility Features
- **ARIA Labels**: Comprehensive labeling for screen readers
- **Semantic Elements**: Proper use of `<header>`, `<main>`, `<section>`
- **Keyboard Navigation**: Focus management and tab order
- **Screen Reader Support**: Live regions and descriptive text
- **Color Contrast**: WCAG 2.1 compliant color schemes

### SEO Optimization
- **Meta Tags**: Title, description, keywords
- **Open Graph**: Social media sharing optimization
- **Schema Markup**: Structured data for search engines
- **Performance**: Optimized loading and resource hints

## CSS Architecture

### Modular CSS Structure
```
css/
├── main.css              # Main stylesheet with imports
├── base/
│   ├── variables.css     # CSS custom properties
│   ├── reset.css         # Modern CSS reset
│   └── layout.css        # Grid and layout systems
├── components/
│   ├── header.css        # Header and navigation
│   ├── album-artwork.css # Album art display
│   ├── track-details.css # Track information
│   ├── rating-system.css # Song rating components
│   ├── player-controls.css # Audio controls
│   └── recent-tracks.css # Track history
└── utilities/
    └── helpers.css       # Utility classes
```

### CSS Custom Properties (Design System)
```css
:root {
  /* Brand Colors */
  --color-mint: #D8F2D5;
  --color-forest-green: #1F4E23;
  --color-teal: #38A29D;
  --color-calico-orange: #EFA63C;
  --color-charcoal: #231F20;

  /* Typography */
  --font-primary: "Open Sans", sans-serif;
  --font-heading: "Montserrat", sans-serif;

  /* Spacing Scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Component Tokens */
  --header-height: 70px;
  --border-radius-md: 8px;
  --transition-normal: 0.25s ease-in-out;
}
```

### Component-Based Styling
Each component has its own CSS file with:
- **Scoped Styles**: Component-specific rules
- **Responsive Design**: Mobile-first breakpoints
- **State Management**: Hover, focus, active states
- **Theme Integration**: Uses design tokens from variables

### Responsive Design Strategy
```css
/* Mobile First Approach */
.main-content {
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .main-content {
    grid-template-columns: 1.5fr 1fr;
  }
}

@media (min-width: 1024px) {
  .main-content {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## JavaScript Architecture

### ES6 Module System
The JavaScript is organized into ES6 modules with clear separation of concerns:

```javascript
// app.js - Main application coordinator
import { appState } from './utils/AppState.js';
import { AudioPlayer } from './modules/AudioPlayer.js';
import { RatingSystem } from './modules/RatingSystem.js';
```

### State Management (`utils/AppState.js`)
Centralized reactive state management:

```javascript
export class AppState {
  constructor() {
    this.state = {
      currentTrack: { artist, title, album, artwork },
      audioPlayer: { isPlaying, volume, elapsedTime },
      rating: { thumbsUp, thumbsDown, userRating },
      recentTracks: []
    };
    this.listeners = new Map();
  }

  // Subscribe to state changes
  subscribe(key, callback) { /* ... */ }

  // Update state and notify listeners
  set(key, value) { /* ... */ }
}
```

### Service Layer Architecture
```
js/services/
├── ApiService.js      # Backend API communication
├── iTunesService.js   # Album artwork fetching
└── MetadataService.js # Track metadata polling
```

#### API Service Pattern
```javascript
export class ApiService {
  async request(url, options = {}) {
    // Unified error handling
    // Request/response logging
    // Automatic retries
  }

  async rateSong(songId, artist, title, rating, userIdentifier) {
    return this.post('/songs/rate', { songId, artist, title, rating, userIdentifier });
  }
}
```

### Core Modules
```
js/modules/
├── AudioPlayer.js    # HLS.js streaming integration
└── RatingSystem.js   # Song rating with backend sync
```

#### Audio Player Module
```javascript
export class AudioPlayer {
  constructor(appState) {
    this.appState = appState;
    this.hls = null;
    this.audioElement = null;
  }

  initializeHLS() {
    // HLS.js configuration
    // Error handling and recovery
    // Stream quality management
  }

  async togglePlay() {
    // Playback state management
    // Error handling for autoplay
  }
}
```

### Component Communication
Components communicate through:

1. **State Subscriptions**: React to state changes
2. **Custom Events**: Cross-component messaging
3. **Service Layer**: Shared business logic
4. **Direct Method Calls**: When appropriate

```javascript
// State subscription pattern
appState.subscribe('currentTrack.artist', (artist) => {
  this.updateUI(artist);
});

// Custom event pattern
document.addEventListener('trackChanged', (event) => {
  this.onTrackChange(event.detail.track);
});
```

## Progressive Web App (PWA) Features

### Service Worker (`sw.js`)
Implements PWA capabilities:

```javascript
const CACHE_NAME = 'radiocalico-v1.0.0';
const STATIC_CACHE_URLS = [
  '/radio-modular.html',
  '/css/main.css',
  '/js/app.js',
  // ... all static assets
];

// Cache-first strategy for static assets
// Network-first strategy for API calls
// Background sync for offline rating submissions
```

### Caching Strategy
- **Static Assets**: Cache-first with network fallback
- **API Responses**: Network-first with cache fallback
- **Images**: Cache with expiration policies
- **Offline Support**: Cached HTML for offline access

### Future PWA Enhancements
- **Push Notifications**: Track change notifications
- **Background Sync**: Offline rating submissions
- **App Install**: Add to home screen prompts
- **Offline Playback**: Cached audio segments

## Performance Optimizations

### Loading Strategy
```html
<!-- Critical CSS inlined -->
<link rel="stylesheet" href="css/main.css">

<!-- JavaScript modules -->
<script type="module" src="js/app.js"></script>

<!-- External dependencies -->
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
```

### Code Splitting
- **Lazy Loading**: Modules loaded on demand
- **Tree Shaking**: Unused code elimination
- **Dynamic Imports**: Feature-based loading

### Asset Optimization
- **Image Optimization**: WebP format with fallbacks
- **Font Loading**: Optimized Google Fonts loading
- **CSS Purging**: Unused styles removal
- **JavaScript Minification**: Production builds

### Runtime Performance
- **Virtual DOM**: Efficient UI updates
- **Event Delegation**: Optimized event handling
- **Debouncing**: Rate-limited API calls
- **Memory Management**: Proper cleanup and disposal

## Component Specifications

### Album Artwork Component
**Location**: `css/components/album-artwork.css`

**Features**:
- Responsive aspect ratio (1:1)
- Smooth loading transitions
- Hover overlay effects
- Fallback placeholder
- iTunes API integration

**HTML Structure**:
```html
<section class="album-section">
  <div class="album-artwork-container">
    <img id="albumArtworkLarge" class="album-artwork-large">
    <div id="albumPlaceholder" class="album-artwork-large loading">
      <div class="artist-overlay">
        <h2 id="artistNameLarge">LOADING</h2>
      </div>
    </div>
  </div>
</section>
```

### Player Controls Component
**Location**: `css/components/player-controls.css`

**Features**:
- Play/pause toggle with SVG icons
- Volume slider with visual feedback
- Elapsed time display
- Status message area
- Mobile-responsive layout

### Rating System Component
**Location**: `css/components/rating-system.css`

**Features**:
- Like/dislike buttons with emoji
- Real-time count updates
- Optimistic UI updates
- Loading states
- Error handling with user feedback

## Development Guidelines

### Adding New Components

1. **Create Component CSS**:
```css
/* css/components/new-component.css */
.new-component {
  /* Component styles using design tokens */
  background: var(--color-mint);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
}
```

2. **Import in Main CSS**:
```css
/* css/main.css */
@import url('./components/new-component.css');
```

3. **Create Component JavaScript** (if needed):
```javascript
// js/modules/NewComponent.js
export class NewComponent {
  constructor(appState) {
    this.appState = appState;
    this.init();
  }
}
```

### State Management Patterns

```javascript
// Subscribe to state changes
appState.subscribe('data.key', (newValue, oldValue) => {
  this.updateComponent(newValue);
});

// Update state
appState.set('data.key', newValue);

// Batch updates
appState.setBatch({
  'data.key1': value1,
  'data.key2': value2
});
```

### Error Handling Best Practices

```javascript
// Service layer errors
try {
  const result = await apiService.rateSong(data);
  this.handleSuccess(result);
} catch (error) {
  this.handleError(error);
  this.showUserFeedback('Failed to submit rating');
}

// UI error states
showError(message) {
  appState.set('ui.error', message);
  setTimeout(() => appState.set('ui.error', null), 5000);
}
```

## Testing Strategy

### Component Testing
```javascript
// Test state management
describe('AppState', () => {
  test('should notify subscribers on state change', () => {
    const callback = jest.fn();
    appState.subscribe('test.key', callback);
    appState.set('test.key', 'value');
    expect(callback).toHaveBeenCalledWith('value', undefined);
  });
});

// Test API integration
describe('ApiService', () => {
  test('should submit rating successfully', async () => {
    const result = await apiService.rateSong('song1', 'artist', 'title', 1, 'user1');
    expect(result.success).toBe(true);
  });
});
```

### Integration Testing
- **User Interactions**: Click, keyboard navigation
- **State Updates**: Component responses to state changes
- **API Integration**: Service communication
- **Error Scenarios**: Network failures, invalid data

### Accessibility Testing
- **Screen Reader**: NVDA, JAWS compatibility
- **Keyboard Navigation**: Tab order, focus management
- **Color Contrast**: WCAG AA compliance
- **Mobile Accessibility**: Touch targets, zoom support

## Deployment Considerations

### Build Process
```bash
# Development
npm start  # Serves files directly

# Production (future Phase 3)
npm run build    # Vite build with optimization
npm run preview  # Preview production build
```

### Browser Compatibility
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **ES6 Modules**: Native browser support required
- **CSS Grid**: Full support in target browsers
- **Service Workers**: Progressive enhancement

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.0s
- **Bundle Size**: < 500KB compressed

## Future Enhancements

### Phase 3 Integration Points
- **Vite Build System**: Module bundling and optimization
- **TypeScript**: Type safety and better developer experience
- **Testing Framework**: Jest integration for component testing
- **Linting**: ESLint, Prettier, Stylelint integration

### Advanced Features
- **Web Components**: Custom element definitions
- **WebAssembly**: High-performance audio processing
- **WebRTC**: Peer-to-peer audio streaming
- **Machine Learning**: Recommendation engine

### User Experience
- **Dark Mode**: Theme switching capability
- **Customization**: User preference persistence
- **Accessibility**: Enhanced screen reader support
- **Internationalization**: Multi-language support

## Migration Notes

### From Monolithic to Modular
- **Backward Compatibility**: Original `radio.html` preserved
- **Feature Parity**: All original functionality maintained
- **Performance**: Improved loading and runtime performance
- **Maintainability**: Significantly easier to modify and extend

### Breaking Changes
- **File Structure**: Complete reorganization
- **Build Process**: Module system requires modern browsers
- **Dependencies**: External libraries now properly managed

### Migration Checklist
- [ ] Update bookmarks to `/radio-modular.html`
- [ ] Test all functionality in target browsers
- [ ] Verify accessibility compliance
- [ ] Update monitoring and analytics
- [ ] Train team on new architecture

This modular frontend architecture provides a solid foundation for continued development, better maintainability, and enhanced user experience while maintaining all original RadioCalico functionality.