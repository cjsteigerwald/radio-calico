# RadioCalico CSS Architecture Guide

## Overview

The RadioCalico CSS architecture has been completely restructured from embedded styles to a modular, maintainable system using modern CSS practices. This guide covers the design system, component structure, and development workflows.

## Architecture Philosophy

### Design Principles
- **Modular**: Each component has its own stylesheet
- **Scalable**: CSS custom properties for consistent theming
- **Maintainable**: Clear naming conventions and organization
- **Responsive**: Mobile-first design approach
- **Accessible**: WCAG 2.1 compliant color schemes and interactions
- **Performance**: Optimized loading and minimal CSS footprint

### Methodology
The CSS architecture follows a hybrid approach inspired by:
- **ITCSS (Inverted Triangle CSS)**: Layered specificity management
- **BEM**: Component-based naming conventions
- **Atomic Design**: Hierarchical component structure
- **CSS Custom Properties**: Design token system

## File Structure

```
css/
├── main.css              # Entry point with all imports
├── base/                 # Foundation layer
│   ├── variables.css     # Design tokens and custom properties
│   ├── reset.css         # Modern CSS reset and normalization
│   └── layout.css        # Grid systems and layout utilities
├── components/           # Component-specific styles
│   ├── header.css        # Site header and branding
│   ├── album-artwork.css # Album art display and overlay
│   ├── track-details.css # Track information layout
│   ├── rating-system.css # Song rating interface
│   ├── player-controls.css # Audio playback controls
│   └── recent-tracks.css # Track history display
└── utilities/            # Helper classes and utilities
    └── helpers.css       # Utility classes for common patterns
```

## Design System (CSS Custom Properties)

### Brand Color Palette
```css
:root {
  /* Primary Brand Colors */
  --color-mint: #D8F2D5;           /* Light mint green */
  --color-forest-green: #1F4E23;   /* Deep forest green */
  --color-teal: #38A29D;           /* Teal accent */
  --color-calico-orange: #EFA63C;  /* Orange accent */
  --color-charcoal: #231F20;       /* Dark charcoal */
  --color-white: #FFFFFF;          /* Pure white */

  /* Extended Palette */
  --color-light-gray: #f0f0f0;     /* Light backgrounds */
  --color-medium-gray: #ccc;       /* Borders and dividers */
  --color-dark-gray: #666;         /* Secondary text */
  --color-black: #000;             /* High contrast elements */
}
```

### Typography System
```css
:root {
  /* Font Families */
  --font-primary: "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-heading: "Montserrat", var(--font-primary);

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Font Size Scale */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.85rem;    /* ~14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-md: 1.125rem;   /* 18px */
  --font-size-lg: 1.25rem;    /* 20px */
  --font-size-xl: 1.5rem;     /* 24px */
  --font-size-2xl: 2rem;      /* 32px */
  --font-size-3xl: 2.5rem;    /* 40px */
}
```

### Spacing System
```css
:root {
  /* Spacing Scale (based on 8px grid) */
  --spacing-xs: 0.25rem;      /* 4px */
  --spacing-sm: 0.5rem;       /* 8px */
  --spacing-md: 1rem;         /* 16px */
  --spacing-lg: 1.5rem;       /* 24px */
  --spacing-xl: 2rem;         /* 32px */
  --spacing-2xl: 3rem;        /* 48px */

  /* Component-Specific Spacing */
  --header-height: 70px;
  --container-max-width: 1200px;
  --player-controls-height: 80px;
}
```

### Visual Effects
```css
:root {
  /* Border Radius */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-full: 50%;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Transitions */
  --transition-fast: 0.15s ease-in-out;
  --transition-normal: 0.25s ease-in-out;
  --transition-slow: 0.35s ease-in-out;

  /* Z-Index Scale */
  --z-index-base: 1;
  --z-index-header: 10;
  --z-index-overlay: 20;
  --z-index-modal: 30;
  --z-index-tooltip: 40;
}
```

## Base Layer

### CSS Reset (`base/reset.css`)
Modern CSS reset based on normalize.css with RadioCalico-specific defaults:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-primary);
  background: var(--color-white);
  color: var(--color-charcoal);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

button:focus-visible {
  outline: 2px solid var(--color-teal);
  outline-offset: 2px;
}
```

### Layout System (`base/layout.css`)
CSS Grid-based layout system:

```css
.layout-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  padding: var(--spacing-xl);
  gap: var(--spacing-2xl);
  max-width: var(--container-max-width);
  margin: 0 auto;
  width: 100%;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    padding: var(--spacing-lg);
    gap: var(--spacing-lg);
  }
}
```

## Component Architecture

### Header Component (`components/header.css`)
Site header with logo and branding:

```css
.header-bar {
  background: var(--color-charcoal);
  color: var(--color-mint);
  padding: var(--spacing-md) 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  height: var(--header-height);
  position: sticky;
  top: 0;
  z-index: var(--z-index-header);
  box-shadow: var(--shadow-md);
}

.header-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.025em;
}
```

**Key Features**:
- Sticky positioning for persistent branding
- Responsive logo and typography scaling
- High contrast for accessibility
- Consistent brand color usage

### Album Artwork Component (`components/album-artwork.css`)
Dynamic album art display with hover effects:

```css
.album-artwork-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  background: var(--color-black);
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-artwork-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: var(--transition-normal);
}

.artist-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    transparent 100%
  );
  color: var(--color-white);
  padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
  transform: translateY(100%);
  transition: var(--transition-normal);
}

.album-artwork-container:hover .artist-overlay {
  transform: translateY(0);
}
```

**Key Features**:
- 1:1 aspect ratio maintained across screen sizes
- Smooth hover animations with gradient overlays
- Loading state with placeholder
- High-quality image optimization

### Player Controls Component (`components/player-controls.css`)
Audio playback interface with modern styling:

```css
.player-controls {
  background: var(--color-charcoal);
  color: var(--color-white);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  box-shadow: var(--shadow-lg);
  flex-wrap: wrap;
}

.play-btn {
  width: 60px;
  height: 60px;
  background: var(--color-teal);
  border-radius: var(--border-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
  transition: var(--transition-fast);
  box-shadow: var(--shadow-md);
  flex-shrink: 0;
}

.play-btn:hover {
  background: var(--color-forest-green);
  transform: scale(1.05);
}

.volume-slider {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-full);
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: var(--border-radius-full);
  background: var(--color-teal);
  cursor: pointer;
  transition: var(--transition-fast);
}

.volume-slider::-webkit-slider-thumb:hover {
  background: var(--color-mint);
  transform: scale(1.2);
}
```

**Key Features**:
- Custom-styled range sliders
- Responsive layout with flex wrapping
- Smooth hover animations and feedback
- Cross-browser slider styling

### Rating System Component (`components/rating-system.css`)
Interactive song rating interface:

```css
.rating-section {
  padding: var(--spacing-lg);
  background: var(--color-white);
  border: 1px solid var(--color-light-gray);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
}

.rating-btn {
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-lg);
  transition: var(--transition-fast);
  border: 2px solid transparent;
  background: var(--color-light-gray);
  min-width: 50px;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rating-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.rating-btn.thumbs-up {
  background: var(--color-mint);
  border-color: var(--color-forest-green);
}

.rating-btn.thumbs-up.active {
  background: var(--color-forest-green);
  color: var(--color-white);
  box-shadow: var(--shadow-md);
}
```

**Key Features**:
- Visual feedback for user interactions
- State management for active ratings
- Accessible button sizing (min 44px touch targets)
- Loading states with opacity changes

## Responsive Design Strategy

### Breakpoint System
```css
/* Mobile First Approach */
/* Base styles: 320px+ */

/* Tablet */
@media (min-width: 768px) {
  .main-content {
    grid-template-columns: 1.5fr 1fr;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .main-content {
    max-width: var(--container-max-width);
  }
}

/* Large Desktop */
@media (min-width: 1200px) {
  .main-content {
    padding: var(--spacing-2xl);
  }
}
```

### Responsive Patterns
1. **Flexible Grid**: CSS Grid with responsive columns
2. **Fluid Typography**: Relative font sizes with viewport units
3. **Adaptive Spacing**: Spacing scales with screen size
4. **Touch Optimization**: Larger touch targets on mobile

### Mobile Optimizations
```css
@media (max-width: 480px) {
  .player-controls {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-sm);
  }

  .rating-btn {
    min-width: 44px;
    min-height: 44px;
  }

  .album-artwork-container {
    border-radius: var(--border-radius-md);
  }
}
```

## Utility Classes

### Layout Utilities
```css
/* Display */
.d-none { display: none; }
.d-block { display: block; }
.d-flex { display: flex; }
.d-grid { display: grid; }

/* Flexbox */
.flex-column { flex-direction: column; }
.justify-center { justify-content: center; }
.align-center { align-items: center; }
.flex-grow { flex-grow: 1; }

/* Spacing */
.m-0 { margin: 0; }
.p-0 { padding: 0; }
.mt-0 { margin-top: 0; }
.mb-0 { margin-bottom: 0; }
```

### Typography Utilities
```css
.text-center { text-align: center; }
.text-uppercase { text-transform: uppercase; }
.font-bold { font-weight: var(--font-weight-bold); }
.text-accent { color: var(--color-teal); }
```

### Interactive Utilities
```css
.cursor-pointer { cursor: pointer; }
.transition-normal { transition: var(--transition-normal); }
.shadow-md { box-shadow: var(--shadow-md); }
.border-rounded { border-radius: var(--border-radius-md); }
```

## Performance Optimizations

### CSS Loading Strategy
```css
/* main.css - Critical path CSS */
@import url('./base/variables.css');     /* Design tokens first */
@import url('./base/reset.css');         /* Foundation styles */
@import url('./base/layout.css');        /* Layout systems */

/* Component styles loaded in dependency order */
@import url('./components/header.css');
@import url('./components/album-artwork.css');
/* ... other components ... */

@import url('./utilities/helpers.css');  /* Utilities last */
```

### Optimization Techniques
1. **CSS Custom Properties**: Reduce code duplication
2. **Selective Imports**: Only load needed components
3. **Minimal Specificity**: Avoid deep selector nesting
4. **Efficient Selectors**: Use class-based selectors

### Build Optimizations (Future Phase 3)
- **CSS Purging**: Remove unused styles
- **Minification**: Compress CSS for production
- **Critical CSS**: Inline above-the-fold styles
- **PostCSS**: Advanced CSS processing and optimization

## Accessibility (A11y) Considerations

### Color Contrast
All color combinations meet WCAG 2.1 AA standards:
```css
/* High contrast text */
.text-primary { color: var(--color-charcoal); } /* 21:1 on white */
.text-secondary { color: var(--color-dark-gray); } /* 7:1 on white */

/* Interactive elements */
.rating-btn:focus-visible {
  outline: 2px solid var(--color-teal);
  outline-offset: 2px;
}
```

### Touch Targets
Minimum 44px touch targets for mobile accessibility:
```css
@media (max-width: 768px) {
  .rating-btn,
  .play-btn {
    min-width: 44px;
    min-height: 44px;
  }
}
```

### Reduced Motion
Respect user preferences for reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Development Workflow

### Adding New Components

1. **Create Component CSS File**:
```css
/* css/components/new-component.css */
.new-component {
  /* Use design tokens */
  background: var(--color-mint);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  transition: var(--transition-normal);
}

.new-component:hover {
  background: var(--color-forest-green);
  color: var(--color-white);
}

/* Responsive behavior */
@media (max-width: 768px) {
  .new-component {
    padding: var(--spacing-sm);
  }
}
```

2. **Import in Main CSS**:
```css
/* css/main.css */
@import url('./components/new-component.css');
```

3. **Follow BEM Naming**:
```css
.new-component { /* Block */ }
.new-component__element { /* Element */ }
.new-component--modifier { /* Modifier */ }
.new-component.is-active { /* State */ }
```

### CSS Testing Strategy

#### Visual Regression Testing
- **Screenshot Testing**: Automated visual comparisons
- **Cross-Browser Testing**: Consistent rendering across browsers
- **Responsive Testing**: Layout verification at different viewports

#### Performance Testing
- **CSS Size**: Monitor stylesheet growth
- **Render Performance**: Measure CSS parsing and rendering time
- **Critical Path**: Optimize above-the-fold CSS loading

#### Accessibility Testing
- **Color Contrast**: Automated contrast ratio testing
- **Focus Indicators**: Keyboard navigation verification
- **Screen Reader**: CSS content accessibility

### Maintenance Guidelines

#### Regular Tasks
1. **Design Token Updates**: Centralize color/spacing changes
2. **Component Audits**: Remove unused components and styles
3. **Performance Reviews**: Optimize heavy selectors and animations
4. **Accessibility Audits**: Verify WCAG compliance

#### Code Quality
- **Consistent Naming**: Follow established conventions
- **Logical Organization**: Group related styles together
- **Documentation**: Comment complex CSS logic
- **Refactoring**: Regularly consolidate duplicate styles

This CSS architecture provides a solid foundation for scalable, maintainable styling that supports the RadioCalico brand while ensuring excellent user experience across all devices and accessibility needs.