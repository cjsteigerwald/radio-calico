# Phase 3: Build Process & Tooling

## Overview
Implement modern build tooling to automate development workflows, optimize assets for production, and improve developer experience with hot reloading, linting, and testing.

## Current Issues
- No build process or asset optimization
- Manual file management and deployment
- No code quality tools or linting
- No development server with hot reload
- No minification or bundling for production

## Proposed Tooling Stack

### 3.1 Build System: Vite
**Why Vite**: Fast development server, modern ES modules, excellent HMR, simple configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        radio: resolve(__dirname, 'public/radio.html')
      }
    },
    minify: 'terser',
    sourcemap: true
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  css: {
    postcss: './postcss.config.js',
    devSourcemap: true
  }
});
```

### 3.2 CSS Processing: PostCSS
```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-custom-properties'),
    require('postcss-nested'),
    require('autoprefixer'),
    require('cssnano')({
      preset: 'default'
    })
  ]
};
```

### 3.3 Package.json Scripts
```json
{
  "name": "radiocalico",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "nodemon src/server.js",
    "dev:client": "vite",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "node scripts/build-server.js",
    "preview": "vite preview",
    "start": "NODE_ENV=production node dist/server.js",
    "lint": "npm run lint:js && npm run lint:css",
    "lint:js": "eslint src/ public/js/ --ext .js",
    "lint:css": "stylelint public/css/**/*.css",
    "lint:fix": "npm run lint:js -- --fix && npm run lint:css -- --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "clean": "rimraf dist/",
    "format": "prettier --write src/ public/js/",
    "validate": "npm run lint && npm run test && npm run build"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "postcss": "^8.4.0",
    "postcss-import": "^15.1.0",
    "postcss-custom-properties": "^13.3.0",
    "postcss-nested": "^6.0.0",
    "autoprefixer": "^10.4.0",
    "cssnano": "^6.0.0",
    "eslint": "^8.57.0",
    "eslint-config-standard": "^17.1.0",
    "stylelint": "^16.0.0",
    "stylelint-config-standard": "^36.0.0",
    "prettier": "^3.2.0",
    "jest": "^29.7.0",
    "@jest/environment-jsdom": "^29.7.0",
    "nodemon": "^3.0.0",
    "concurrently": "^8.2.0",
    "rimraf": "^5.0.0"
  }
}
```

### 3.4 Code Quality Configuration

#### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'semi': ['error', 'always']
  },
  ignorePatterns: ['dist/', 'node_modules/']
};
```

#### Stylelint Configuration
```javascript
// .stylelintrc.js
module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    'custom-property-pattern': '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
    'selector-class-pattern': '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
    'property-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,
    'color-hex-case': 'upper',
    'declaration-colon-space-after': 'always',
    'declaration-colon-space-before': 'never',
    'block-closing-brace-newline-after': 'always',
    'rule-empty-line-before': ['always', {
      except: ['first-nested'],
      ignore: ['after-comment']
    }]
  },
  ignoreFiles: ['dist/**/*.css', 'node_modules/**/*.css']
};
```

#### Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "trailingComma": "none",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 3.5 Development Environment

#### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.fixAll.stylelint": true
  },
  "css.validate": false,
  "scss.validate": false,
  "less.validate": false,
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

#### VS Code Extensions (recommendations)
```json
// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "stylelint.vscode-stylelint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 3.6 Build Scripts

#### Server Build Script
```javascript
// scripts/build-server.js
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '../src');
const distDir = join(__dirname, '../dist');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy server files
const serverFiles = [
  'server.js',
  'database/db.js',
  'routes/index.js',
  'controllers/songController.js',
  // ... other server files
];

serverFiles.forEach(file => {
  const srcPath = join(srcDir, file);
  const destPath = join(distDir, file);

  // Create directory if it doesn't exist
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  copyFileSync(srcPath, destPath);
});

console.log('✅ Server files copied to dist/');
```

#### Asset Optimization
```javascript
// scripts/optimize-images.js
import sharp from 'sharp';
import { glob } from 'glob';
import { join } from 'path';

async function optimizeImages() {
  const images = await glob('public/assets/images/**/*.{jpg,jpeg,png}');

  for (const imagePath of images) {
    const outputPath = imagePath.replace('public/', 'dist/');

    await sharp(imagePath)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85, progressive: true })
      .png({ quality: 85, progressive: true })
      .toFile(outputPath);

    console.log(`Optimized: ${imagePath}`);
  }
}

optimizeImages().catch(console.error);
```

### 3.7 Testing Configuration

#### Jest Configuration
```javascript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'public/js/**/*.js',
    'src/**/*.js',
    '!src/server.js',
    '!**/*.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};
```

### 3.8 Continuous Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run tests
      run: npm run test:coverage

    - name: Build project
      run: npm run build

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build for production
      run: npm run build

    - name: Archive production artifacts
      uses: actions/upload-artifact@v3
      with:
        name: dist-files
        path: dist/
```

## Implementation Steps

1. **Initialize package.json** - Set up project dependencies and scripts
2. **Configure Vite** - Set up build system and dev server
3. **Add PostCSS** - CSS processing and optimization
4. **Configure linting** - ESLint and Stylelint setup
5. **Add Prettier** - Code formatting configuration
6. **Set up Jest** - Testing framework configuration
7. **Create build scripts** - Custom build and optimization scripts
8. **Add VS Code config** - Editor settings and extensions
9. **Set up CI/CD** - GitHub Actions workflow
10. **Documentation** - Build and development guides

## Benefits

- **Developer Experience**: Hot reload, linting, formatting
- **Code Quality**: Automated linting and testing
- **Performance**: Minified, optimized production builds
- **Maintainability**: Consistent code style and structure
- **Automation**: CI/CD pipeline for testing and deployment
- **Modern Tooling**: ES modules, modern JavaScript features
- **Asset Optimization**: Compressed images and minified code

## Timeline: Week 5

- Days 1-2: Vite setup and configuration
- Days 3-4: Linting and code quality tools
- Days 5-6: Testing framework setup
- Day 7: CI/CD pipeline configuration