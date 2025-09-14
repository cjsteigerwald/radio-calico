# Phase 2: Frontend Modularization

## Overview
Break down the 1,080-line monolithic HTML file into modular, maintainable components with separated concerns for CSS, JavaScript, and HTML structure.

## Current Issues
- Single HTML file with embedded CSS and JavaScript (1,080+ lines)
- No separation between styling, behavior, and structure
- Inline styles making theming difficult
- Large JavaScript blocks making debugging challenging
- No code reusability or modularity

## Proposed Structure

### 2.1 Asset Separation

#### CSS Organization
```
public/css/
├── base.css           # Reset, normalize, base typography
├── variables.css      # CSS custom properties (brand colors, spacing)
├── layout.css         # Grid system, main layout structures
├── components/
│   ├── header.css     # Header bar styling
│   ├── album-art.css  # Album artwork section
│   ├── track-info.css # Track details styling
│   ├── player.css     # Player controls
│   └── footer.css     # Recent tracks footer
├── utilities.css      # Utility classes
└── main.css          # Main stylesheet importing all others
```

**Example: public/css/variables.css**
```css
:root {
  /* Brand Colors (from style guide) */
  --color-mint: #D8F2D5;
  --color-forest-green: #1F4E23;
  --color-teal: #38A29D;
  --color-calico-orange: #EFA63C;
  --color-charcoal: #231F20;
  --color-cream: #F5EADA;
  --color-white: #FFFFFF;

  /* Typography */
  --font-heading: "Montserrat", sans-serif;
  --font-body: "Open Sans", sans-serif;

  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 16px;
  --spacing-md: 24px;
  --spacing-lg: 32px;
  --spacing-xl: 40px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 25px;

  /* Shadows */
  --shadow-sm: 0 2px 6px rgba(31, 78, 35, 0.15);
  --shadow-md: 0 4px 12px rgba(31, 78, 35, 0.15);
}
```

#### JavaScript Modularization
```
public/js/
├── modules/
│   ├── AudioPlayer.js     # HLS.js wrapper and audio controls
│   ├── MetadataService.js # Track information fetching
│   ├── RatingSystem.js    # Song rating functionality
│   ├── AlbumArtService.js # iTunes API integration
│   ├── UIController.js    # DOM manipulation and updates
│   └── StorageManager.js  # LocalStorage management
├── utils/
│   ├── ApiClient.js       # HTTP request wrapper
│   ├── EventEmitter.js    # Custom event system
│   ├── Formatters.js      # Time and text formatting
│   └── Constants.js       # Application constants
├── config/
│   └── AppConfig.js       # Application configuration
└── app.js                 # Main application entry point
```

**Example: public/js/modules/AudioPlayer.js**
```javascript
import { EventEmitter } from '../utils/EventEmitter.js';
import { formatTime } from '../utils/Formatters.js';
import { STREAM_URL } from '../config/AppConfig.js';

class AudioPlayer extends EventEmitter {
  constructor() {
    super();
    this.hls = null;
    this.audioElement = null;
    this.isPlaying = false;
    this.volume = 0.7;
    this.initializePlayer();
  }

  initializePlayer() {
    this.audioElement = document.getElementById('audioPlayer');
    this.setupEventListeners();
    this.loadStream();
  }

  setupEventListeners() {
    this.audioElement.addEventListener('timeupdate', () => {
      this.emit('timeupdate', {
        currentTime: this.audioElement.currentTime,
        formattedTime: formatTime(this.audioElement.currentTime)
      });
    });

    this.audioElement.addEventListener('loadstart', () => {
      this.emit('loading');
    });

    this.audioElement.addEventListener('canplay', () => {
      this.emit('ready');
    });
  }

  loadStream() {
    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      this.hls.loadSource(STREAM_URL);
      this.hls.attachMedia(this.audioElement);
      this.setupHlsEvents();
    } else if (this.audioElement.canPlayType('application/vnd.apple.mpegurl')) {
      this.audioElement.src = STREAM_URL;
    } else {
      this.emit('error', 'HLS not supported');
    }
  }

  async play() {
    try {
      await this.audioElement.play();
      this.isPlaying = true;
      this.emit('play');
    } catch (error) {
      this.emit('error', error.message);
    }
  }

  pause() {
    this.audioElement.pause();
    this.isPlaying = false;
    this.emit('pause');
  }

  setVolume(volume) {
    this.volume = volume;
    this.audioElement.volume = volume;
    this.emit('volumechange', volume);
  }
}

export { AudioPlayer };
```

**Example: public/js/modules/MetadataService.js**
```javascript
import { EventEmitter } from '../utils/EventEmitter.js';
import { ApiClient } from '../utils/ApiClient.js';
import { METADATA_URL, METADATA_INTERVAL } from '../config/AppConfig.js';

class MetadataService extends EventEmitter {
  constructor() {
    super();
    this.apiClient = new ApiClient();
    this.intervalId = null;
    this.currentTrack = null;
  }

  start() {
    this.fetchMetadata();
    this.intervalId = setInterval(() => {
      this.fetchMetadata();
    }, METADATA_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async fetchMetadata() {
    try {
      const metadata = await this.apiClient.get(METADATA_URL);

      if (this.hasTrackChanged(metadata)) {
        this.currentTrack = metadata;
        this.emit('trackchange', metadata);
      }

      this.emit('metadata', metadata);
    } catch (error) {
      this.emit('error', error.message);
    }
  }

  hasTrackChanged(metadata) {
    return !this.currentTrack ||
           this.currentTrack.artist !== metadata.artist ||
           this.currentTrack.title !== metadata.title;
  }
}

export { MetadataService };
```

### 2.2 Clean HTML Structure

**public/index.html** (Clean, semantic structure)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RadioCalico - Live Stream Player</title>

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">

    <!-- Stylesheets -->
    <link rel="stylesheet" href="/css/main.css">

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/assets/images/favicon.png">
</head>
<body>
    <!-- Header -->
    <header class="header-bar">
        <img src="/assets/images/RadioCalicoLogoTM.png" alt="RadioCalico Logo" class="header-logo">
        <h1 class="header-title">Radio Calico</h1>
    </header>

    <!-- Main Content -->
    <main class="main-content">
        <!-- Album Artwork Section -->
        <section class="album-section" id="albumSection">
            <img id="albumArtwork" class="album-artwork" src="" alt="Album Artwork" style="display: none;">
            <div id="albumPlaceholder" class="album-placeholder">
                <svg class="music-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
            </div>
            <div class="artist-overlay">
                <h2 id="artistNameLarge" class="artist-name-large">LOADING</h2>
            </div>
        </section>

        <!-- Track Details Section -->
        <section class="track-details-section">
            <div class="track-info-main">
                <h3 id="trackArtist" class="track-artist-main">Loading...</h3>
                <h4 id="trackTitle" class="track-title-main">...</h4>
                <p id="trackAlbum" class="track-album-main"></p>
            </div>

            <div class="quality-info">
                <p class="quality-title">Source quality: <span id="sourceQuality">16-bit 44.1kHz</span></p>
                <p class="quality-details">Stream quality: <span id="streamQuality">48kHz FLAC / HLS Lossless</span></p>
            </div>

            <div class="rating-section" id="ratingSection">
                <!-- Rating UI will be populated by RatingSystem module -->
            </div>

            <div class="player-controls" id="playerControls">
                <!-- Player controls will be populated by UIController -->
            </div>

            <div id="status" class="status">Ready to play</div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="footer-section">
        <div class="recent-tracks">
            <h3 class="recent-tracks-title">Previous tracks:</h3>
            <div id="recentTracksList" class="recent-tracks-list">
                <!-- Recent tracks populated by MetadataService -->
            </div>
        </div>
    </footer>

    <!-- Audio Element -->
    <audio id="audioPlayer" style="display: none;"></audio>

    <!-- External Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>

    <!-- Application -->
    <script type="module" src="/js/app.js"></script>
</body>
</html>
```

### 2.3 Component Architecture

Each component follows a consistent pattern:

```javascript
// Component Template
class ComponentName extends EventEmitter {
  constructor(element, options = {}) {
    super();
    this.element = element;
    this.options = { ...this.defaultOptions, ...options };
    this.state = this.getInitialState();
    this.init();
  }

  get defaultOptions() {
    return {};
  }

  getInitialState() {
    return {};
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    // Update DOM
  }

  bindEvents() {
    // Event listeners
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  destroy() {
    // Cleanup
  }
}
```

## Implementation Steps

1. **Create directory structure** - Set up CSS and JS folders
2. **Extract CSS** - Split inline styles into modular CSS files
3. **Create CSS variables** - Convert brand colors to CSS custom properties
4. **Extract JavaScript modules** - Break down monolithic JS into classes
5. **Create utility functions** - Common functionality like formatting, API calls
6. **Build event system** - Implement communication between modules
7. **Create clean HTML** - Semantic structure without inline styles/scripts
8. **Implement module loading** - ES6 modules with proper imports/exports
9. **Add error handling** - Proper error boundaries for each module
10. **Test module integration** - Ensure all pieces work together

## Benefits

- **Maintainability**: Easy to modify individual components
- **Reusability**: Modules can be used across different pages
- **Testability**: Each module can be unit tested independently
- **Performance**: Selective loading of required modules
- **Debugging**: Easier to isolate and fix issues
- **Theming**: CSS variables enable easy theme switching
- **Collaboration**: Multiple developers can work on different modules

## File Size Reduction

- **Before**: 1,080-line monolithic HTML file
- **After**:
  - HTML: ~100 lines (clean structure)
  - CSS: ~300 lines (across multiple files)
  - JS: ~600 lines (across multiple modules)

## Timeline: Week 3-4

- Days 1-3: CSS extraction and organization
- Days 4-5: JavaScript module creation
- Days 6-7: HTML structure cleanup
- Days 8-10: Module integration and testing
- Days 11-14: Polish and optimization