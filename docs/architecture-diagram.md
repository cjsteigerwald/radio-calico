# RadioCalico System Architecture

## Complete System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Browser"
        HTML[radio-modular.html<br/>Semantic HTML + PWA]
        SW[Service Worker<br/>Offline Cache + Sync]

        subgraph "Frontend Assets"
            CSS[CSS Modules<br/>11 files, 49KB gzipped]
            JS[JavaScript Modules<br/>ES6, State Management]
        end

        subgraph "JavaScript Architecture"
            APP[app.js<br/>Main Coordinator]
            STATE[AppState.js<br/>Centralized State]

            subgraph "Services"
                API[ApiService<br/>Backend API]
                ITUNES[iTunesService<br/>Artwork API]
                META[MetadataService<br/>Track Polling]
            end

            subgraph "Modules"
                PLAYER[AudioPlayer<br/>HLS.js Streaming]
                RATING[RatingSystem<br/>Rating Sync]
            end
        end

        HLSJS[HLS.js v1.5.15<br/>CDN: jsdelivr.net]
        FONTS[Google Fonts<br/>Preconnect + Cache]
    end

    subgraph "Express Server (Node.js)"
        SERVER[server.js<br/>Port 3000]

        subgraph "Middleware Pipeline"
            SECURITY[Security Layer<br/>Helmet.js + Headers]
            COMPRESS[Compression<br/>gzip/brotli 62%]
            RATE[Rate Limiting<br/>DDoS Protection]
            SANITIZE[Input Sanitization<br/>validator.js]
            CORS[CORS<br/>Origin Control]
            STATIC[Static Files<br/>1-day cache]
        end

        subgraph "MVC Architecture"
            subgraph "Routes"
                HEALTH_R[health.js]
                USERS_R[users.js]
                SONGS_R[songs.js]
            end

            subgraph "Controllers"
                HEALTH_C[healthController]
                USERS_C[userController]
                SONGS_C[songController]
            end

            subgraph "Services"
                HEALTH_S[healthService]
                USERS_S[userService]
                SONGS_S[songService]
            end
        end
    end

    subgraph "Database Layer"
        DB_INTERFACE[database/index.js<br/>Unified Interface]

        SQLITE[(SQLite<br/>Development<br/>radiocalico.db)]
        POSTGRES[(PostgreSQL<br/>Production<br/>Connection Pool)]
    end

    subgraph "External Services"
        ITUNES_API[iTunes Search API<br/>Album Artwork]
        HLS_CDN[CDN: jsdelivr.net<br/>HLS.js Library]
        FONT_CDN[Google Fonts CDN<br/>Montserrat + Open Sans]
        STREAM[HLS Audio Stream<br/>Live Radio Source]
    end

    subgraph "Performance Optimizations"
        WEBP[WebP Images<br/>49.7% smaller]
        PRECONNECT[Resource Hints<br/>DNS + Preconnect]
        CACHE[HTTP Caching<br/>ETag + Max-Age]
    end

    %% Client to Server Flow
    HTML --> APP
    APP --> STATE
    STATE --> API
    STATE --> ITUNES
    STATE --> META
    APP --> PLAYER
    APP --> RATING

    PLAYER --> HLSJS
    HTML --> SW
    HTML --> CSS
    HTML --> JS
    HTML --> FONTS

    %% API Communication
    API -->|REST API| SERVER
    ITUNES -->|Search| ITUNES_API
    META -->|Polling| SERVER
    RATING -->|Sync| SERVER
    HLSJS -->|Load| HLS_CDN
    FONTS -->|Load| FONT_CDN
    PLAYER -->|Stream| STREAM

    %% Server Pipeline
    SERVER --> SECURITY
    SECURITY --> COMPRESS
    COMPRESS --> RATE
    RATE --> SANITIZE
    SANITIZE --> CORS
    CORS --> STATIC
    STATIC --> HEALTH_R
    STATIC --> USERS_R
    STATIC --> SONGS_R

    %% MVC Flow
    HEALTH_R --> HEALTH_C
    USERS_R --> USERS_C
    SONGS_R --> SONGS_C

    HEALTH_C --> HEALTH_S
    USERS_C --> USERS_S
    SONGS_C --> SONGS_S

    %% Database Access
    HEALTH_S --> DB_INTERFACE
    USERS_S --> DB_INTERFACE
    SONGS_S --> DB_INTERFACE

    DB_INTERFACE -->|SQLite Mode| SQLITE
    DB_INTERFACE -->|PostgreSQL Mode| POSTGRES

    %% Performance Features
    HTML -.->|Uses| WEBP
    HTML -.->|Uses| PRECONNECT
    SERVER -.->|Implements| CACHE

    %% Service Worker Caching
    SW -.->|Caches| CSS
    SW -.->|Caches| JS
    SW -.->|Caches| WEBP
    SW -.->|Caches| API

    style HTML fill:#D8F2D5
    style SERVER fill:#38A29D
    style DB_INTERFACE fill:#EFA63C
    style SQLITE fill:#1F4E23,color:#fff
    style POSTGRES fill:#1F4E23,color:#fff
    style WEBP fill:#90EE90
    style COMPRESS fill:#90EE90
    style CACHE fill:#90EE90
```

## Component Details

### Frontend Layer
- **HTML**: Semantic, accessible markup with PWA capabilities
- **CSS Modules**: 11 modular files, component-based architecture
- **JavaScript**: ES6 modules with centralized state management
- **Service Worker**: Offline caching and background sync

### Middleware Stack
1. **Security Headers** (Helmet.js) - CSP, X-Frame-Options, etc.
2. **Compression** (gzip/brotli) - 62% transfer size reduction
3. **Rate Limiting** - DDoS protection
4. **Input Sanitization** (validator.js) - XSS prevention
5. **CORS** - Cross-origin resource sharing
6. **Static Files** - Optimized serving with cache headers

### Backend MVC Architecture
- **Routes**: API endpoint definitions
- **Controllers**: Request/response handling
- **Services**: Business logic layer
- **Database Interface**: Unified SQLite/PostgreSQL abstraction

### Performance Optimizations
- **WebP Images**: 49.7% size reduction
- **Resource Hints**: Preconnect and DNS prefetch
- **Compression**: gzip/brotli middleware
- **HTTP Caching**: ETag and Max-Age headers
- **Service Worker**: Aggressive static asset caching

---

## Frontend Module Architecture

```mermaid
graph LR
    subgraph "app.js - Main Application"
        INIT[Initialize App]
        UI[UI Elements]
        EVENTS[Event Listeners]
        SUBS[State Subscriptions]
    end

    subgraph "State Management"
        STATE[AppState.js<br/>Reactive State Store]
        AUDIO_STATE[Audio Player State]
        TRACK_STATE[Current Track State]
        RATING_STATE[Rating State]
        QUALITY_STATE[Quality Info State]
    end

    subgraph "Services Layer"
        API_SVC[ApiService<br/>HTTP Client]
        ITUNES_SVC[iTunesService<br/>Artwork Cache]
        META_SVC[MetadataService<br/>Track Polling]
    end

    subgraph "Core Modules"
        AUDIO_MOD[AudioPlayer<br/>HLS Integration]
        RATING_MOD[RatingSystem<br/>Like/Dislike]
    end

    INIT --> UI
    UI --> EVENTS
    EVENTS --> STATE
    STATE --> SUBS
    SUBS --> UI

    EVENTS --> AUDIO_MOD
    EVENTS --> RATING_MOD

    STATE --> AUDIO_STATE
    STATE --> TRACK_STATE
    STATE --> RATING_STATE
    STATE --> QUALITY_STATE

    AUDIO_MOD --> STATE
    RATING_MOD --> STATE
    META_SVC --> STATE

    API_SVC -.->|Backend API| RATING_MOD
    ITUNES_SVC -.->|Artwork| META_SVC
    META_SVC -.->|Polling| API_SVC

    style STATE fill:#38A29D
    style AUDIO_MOD fill:#D8F2D5
    style RATING_MOD fill:#D8F2D5
```

## Backend MVC Flow

```mermaid
sequenceDiagram
    participant Client as Client Browser
    participant Routes as API Routes
    participant Controller as Controller Layer
    participant Service as Service Layer
    participant DB as Database Interface
    participant Data as SQLite/PostgreSQL

    Client->>Routes: POST /api/songs/rate
    Routes->>Controller: songController.rateSong()

    Note over Controller: Validate Request
    Controller->>Service: songService.rateSong(data)

    Note over Service: Business Logic<br/>Validation
    Service->>DB: database.rateSong()

    Note over DB: Abstract Layer<br/>SQLite or PostgreSQL
    DB->>Data: INSERT/UPDATE
    Data-->>DB: Result

    DB-->>Service: Success
    Service-->>Controller: Formatted Response
    Controller-->>Routes: JSON Response
    Routes-->>Client: {success: true, data: {...}}

    Note over Client: Update UI<br/>via State Management
```

## Database Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        APP[Express Application]
        CONFIG[Configuration<br/>DATABASE_TYPE env var]
    end

    subgraph "Database Abstraction"
        INTERFACE[database/index.js<br/>Unified Interface]

        SQLITE_MODULE[db.js<br/>SQLite Operations]
        POSTGRES_MODULE[postgres.js<br/>PostgreSQL Operations]
    end

    subgraph "SQLite (Development)"
        SQLITE_FILE[radiocalico.db<br/>Local File]
        SQLITE_MEM[:memory:<br/>Testing Only]
    end

    subgraph "PostgreSQL (Production)"
        PG_POOL[Connection Pool<br/>Max 20 connections]
        PG_DB[(PostgreSQL Database<br/>UUID keys, JSONB)]
    end

    APP --> CONFIG
    CONFIG -->|sqlite| INTERFACE
    CONFIG -->|postgres| INTERFACE

    INTERFACE -->|MODE: sqlite| SQLITE_MODULE
    INTERFACE -->|MODE: postgres| POSTGRES_MODULE

    SQLITE_MODULE --> SQLITE_FILE
    SQLITE_MODULE -.->|Tests| SQLITE_MEM

    POSTGRES_MODULE --> PG_POOL
    PG_POOL --> PG_DB

    style INTERFACE fill:#EFA63C
    style SQLITE_FILE fill:#1F4E23,color:#fff
    style PG_DB fill:#1F4E23,color:#fff
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        REQ[Incoming Request]

        HELMET[Helmet.js<br/>Security Headers]
        RATE_LIM[Rate Limiter<br/>100 req/15min per IP]
        SANITIZE[Input Sanitization<br/>validator.js]
        CORS_MW[CORS Middleware<br/>Origin Validation]

        APP_LOGIC[Application Logic]
    end

    subgraph "Security Features"
        CSP[Content Security Policy<br/>Strict + blob: for HLS]
        XSS[XSS Protection<br/>X-XSS-Protection]
        FRAME[Clickjacking Protection<br/>X-Frame-Options: DENY]
        HSTS[HTTPS Enforcement<br/>Strict-Transport-Security]
    end

    subgraph "Testing & Monitoring"
        ESLINT[ESLint Security Plugin<br/>SAST]
        SECRETS[Secret Detection<br/>Hardcoded Credentials]
        TRIVY[Trivy Scanner<br/>Container Vulnerabilities]
        NPM_AUDIT[npm audit<br/>Dependency Check]
    end

    REQ --> HELMET
    HELMET --> RATE_LIM
    RATE_LIM --> SANITIZE
    SANITIZE --> CORS_MW
    CORS_MW --> APP_LOGIC

    HELMET -.->|Implements| CSP
    HELMET -.->|Implements| XSS
    HELMET -.->|Implements| FRAME
    HELMET -.->|Implements| HSTS

    APP_LOGIC -.->|Scanned by| ESLINT
    APP_LOGIC -.->|Scanned by| SECRETS
    APP_LOGIC -.->|Scanned by| TRIVY
    APP_LOGIC -.->|Scanned by| NPM_AUDIT

    style HELMET fill:#90EE90
    style RATE_LIM fill:#90EE90
    style SANITIZE fill:#90EE90
    style CORS_MW fill:#90EE90
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DEV_DOCKER[Docker Container<br/>Node.js + Hot Reload]
        DEV_DB[SQLite<br/>Local File]
        DEV_VOLUMES[Volumes<br/>Code + Database]
    end

    subgraph "Production Environment"
        LB[Load Balancer<br/>nginx (planned)]

        subgraph "Application Tier"
            APP1[RadioCalico Container 1<br/>Non-root user]
            APP2[RadioCalico Container 2<br/>Non-root user]
        end

        subgraph "Database Tier"
            PG_PRIMARY[(PostgreSQL Primary<br/>Connection Pool)]
            PG_REPLICA[(PostgreSQL Replica<br/>Read-only)]
        end

        subgraph "Cache Tier"
            REDIS[(Redis Cache<br/>planned)]
        end
    end

    subgraph "CDN & External"
        CDN[CDN<br/>Static Assets]
        MONITORING[Monitoring<br/>Logs + Metrics]
    end

    DEV_DOCKER --> DEV_DB
    DEV_VOLUMES -.->|Mount| DEV_DOCKER

    LB --> APP1
    LB --> APP2

    APP1 --> PG_PRIMARY
    APP2 --> PG_PRIMARY

    APP1 -.->|Reads| PG_REPLICA
    APP2 -.->|Reads| PG_REPLICA

    PG_PRIMARY -.->|Replication| PG_REPLICA

    APP1 -.->|Cache| REDIS
    APP2 -.->|Cache| REDIS

    LB -.->|Static| CDN
    APP1 -.->|Logs| MONITORING
    APP2 -.->|Logs| MONITORING

    style APP1 fill:#38A29D
    style APP2 fill:#38A29D
    style PG_PRIMARY fill:#1F4E23,color:#fff
    style PG_REPLICA fill:#1F4E23,color:#fff
```

## CI/CD Pipeline

```mermaid
graph LR
    subgraph "Version Control"
        COMMIT[Git Commit]
        PUSH[Git Push]
    end

    subgraph "GitHub Actions CI"
        CHECKOUT[Checkout Code]
        SETUP[Setup Node.js 20]
        INSTALL[npm install]

        subgraph "Testing"
            LINT[ESLint<br/>Code Quality]
            TEST[Jest Tests<br/>78 tests]
            SECURITY[Security Scans<br/>npm audit + Trivy]
        end

        BUILD[Build Docker Image]
        SCAN[Scan Image<br/>Trivy CVE Check]
    end

    subgraph "Deployment"
        PUSH_IMAGE[Push to Registry]
        DEPLOY[Deploy to Production]
        HEALTH[Health Check]
    end

    COMMIT --> PUSH
    PUSH --> CHECKOUT
    CHECKOUT --> SETUP
    SETUP --> INSTALL

    INSTALL --> LINT
    INSTALL --> TEST
    INSTALL --> SECURITY

    LINT --> BUILD
    TEST --> BUILD
    SECURITY --> BUILD

    BUILD --> SCAN
    SCAN -->|Pass| PUSH_IMAGE
    SCAN -->|Fail| PUSH

    PUSH_IMAGE --> DEPLOY
    DEPLOY --> HEALTH
    HEALTH -->|Success| COMMIT
    HEALTH -->|Fail| DEPLOY

    style TEST fill:#90EE90
    style SECURITY fill:#90EE90
    style SCAN fill:#90EE90
```

---

## Legend

- **Solid Lines** (→): Direct data flow or function calls
- **Dashed Lines** (-.->): Indirect relationships, caching, or monitoring
- **Green Fill**: Performance or security optimizations
- **Blue Fill**: Core application components
- **Orange Fill**: Data access layer
- **Dark Green Fill**: Database systems

---

**Last Updated:** October 2025
**Version:** 1.1.0 (Phase 1 Optimized)
