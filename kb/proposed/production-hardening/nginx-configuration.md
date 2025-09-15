# nginx Configuration Guide for RadioCalico

## Overview

This document provides comprehensive nginx configuration for RadioCalico, including reverse proxy setup, static file serving, SSL/TLS configuration, load balancing, and security hardening.

## Architecture

```
Internet → nginx (Port 443/80) → Node.js (Port 3000-3003)
             ├── Static Files     └── API Requests
             ├── SSL Termination
             ├── Load Balancing
             ├── Caching
             └── Security (WAF)
```

## Base nginx Configuration

### Main Configuration File
```nginx
# /etc/nginx/nginx.conf

user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main buffer=32k flush=5s;

    # Performance Optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 100;
    reset_timedout_connection on;
    client_body_timeout 10;
    client_header_timeout 10;
    send_timeout 10;

    # Buffers
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 8k;
    output_buffers 32 32k;
    postpone_output 1460;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml application/atom+xml image/svg+xml
               text/x-js text/x-cross-domain-policy application/x-font-ttf
               application/x-font-opentype application/vnd.ms-fontobject
               image/x-icon;

    # Brotli Compression (if module installed)
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css text/xml text/javascript
    #              application/json application/javascript application/xml+rss;

    # Cache Settings
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=radiocalico_cache:10m
                     max_size=1g inactive=60m use_temp_path=off;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=static:10m rate=50r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Security Headers (global)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Hide nginx version
    server_tokens off;
    more_clear_headers Server;

    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

## Site Configuration

### RadioCalico Site Configuration
```nginx
# /etc/nginx/sites-available/radiocalico

# Upstream backend servers
upstream radiocalico_backend {
    least_conn;

    # Backend servers with health checks
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s backup;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s backup;
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s backup;

    # Connection keepalive
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name radiocalico.com www.radiocalico.com;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name radiocalico.com www.radiocalico.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/radiocalico.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/radiocalico.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/radiocalico.com/chain.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: https:;" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Root directory for static files
    root /var/www/radiocalico/public;
    index index.html radio-modular.html;

    # Logging
    access_log /var/log/nginx/radiocalico.access.log main;
    error_log /var/log/nginx/radiocalico.error.log warn;

    # Static file handling
    location / {
        try_files $uri $uri/ @backend;

        # Cache static files
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # Service Worker
        location = /sw.js {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        # PWA Manifest
        location = /manifest.json {
            expires 7d;
            add_header Cache-Control "public";
        }
    }

    # API endpoints
    location /api/ {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_conn addr 10;

        # Proxy settings
        proxy_pass http://radiocalico_backend;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;

        # Connection settings
        proxy_set_header Connection "";
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Cache for GET requests
        proxy_cache radiocalico_cache;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_key "$scheme$request_method$host$request_uri";
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # WebSocket support for real-time features
    location /ws/ {
        proxy_pass http://radiocalico_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout for WebSocket
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Health check endpoint (no logging)
    location = /health {
        access_log off;
        proxy_pass http://radiocalico_backend/api/health;
        proxy_set_header Host $host;
    }

    # Status page (restricted)
    location /nginx-status {
        stub_status;
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
    }

    # Backend fallback
    location @backend {
        proxy_pass http://radiocalico_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;

    location = /404.html {
        internal;
    }

    location = /50x.html {
        internal;
    }
}
```

## Security Configuration

### ModSecurity WAF Integration
```nginx
# /etc/nginx/modsecurity/modsecurity.conf

# Enable ModSecurity
SecRuleEngine On
SecRequestBodyAccess On
SecResponseBodyAccess Off
SecRequestBodyLimit 13107200
SecRequestBodyNoFilesLimit 131072
SecRequestBodyLimitAction Reject

# Audit logging
SecAuditEngine RelevantOnly
SecAuditLogRelevantStatus "^(?:5|4(?!04))"
SecAuditLogParts ABDEFHIJZ
SecAuditLogType Serial
SecAuditLog /var/log/modsecurity/audit.log

# Include OWASP CRS rules
Include /usr/share/modsecurity-crs/crs-setup.conf
Include /usr/share/modsecurity-crs/rules/*.conf

# Custom rules for RadioCalico
SecRule REQUEST_URI "@contains /api/songs/rate" \
    "id:1001,\
    phase:2,\
    block,\
    msg:'Rate limiting for song rating API',\
    logdata:'Matched Data: %{MATCHED_VAR} found within %{MATCHED_VAR_NAME}',\
    severity:'WARNING',\
    chain"
    SecRule IP:'/api/songs/rate' "@gt 10" \
        "setvar:ip.rate_limit_exceeded=1,\
        expirevar:ip.rate_limit_exceeded=60"
```

### DDoS Protection
```nginx
# /etc/nginx/conf.d/ddos-protection.conf

# Connection limits per IP
limit_conn_zone $binary_remote_addr zone=perip:10m;
limit_conn perip 10;

# Request rate limits
limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;
limit_req zone=general burst=10 nodelay;

# Blacklist suspicious user agents
map $http_user_agent $blocked_agent {
    default         0;
    ~*malicious     1;
    ~*bot           1;
    ~*crawler       1;
    ~*scraper       1;
}

# Geo-blocking (optional)
# geoip_country /usr/share/GeoIP/GeoIP.dat;
# map $geoip_country_code $blocked_country {
#     default     0;
#     CN          1;
#     RU          1;
# }
```

## Load Balancing Strategies

### Round Robin (Default)
```nginx
upstream backend_round_robin {
    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}
```

### Least Connections
```nginx
upstream backend_least_conn {
    least_conn;
    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}
```

### IP Hash (Session Persistence)
```nginx
upstream backend_ip_hash {
    ip_hash;
    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}
```

### Weighted Load Balancing
```nginx
upstream backend_weighted {
    server 10.0.1.1:3000 weight=3;
    server 10.0.1.2:3000 weight=2;
    server 10.0.1.3:3000 weight=1;
}
```

## Caching Strategy

### Static Content Caching
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";

    # Enable gzip for cached content
    gzip_static on;

    # Serve pre-compressed files if available
    location ~ \.(js|css)$ {
        gzip_static on;
        brotli_static on;
    }
}
```

### API Response Caching
```nginx
location /api/songs {
    proxy_pass http://radiocalico_backend;

    # Cache configuration
    proxy_cache radiocalico_cache;
    proxy_cache_key "$scheme$request_method$host$request_uri$is_args$args";
    proxy_cache_valid 200 302 5m;
    proxy_cache_valid 404 1m;
    proxy_cache_valid any 1m;
    proxy_cache_methods GET HEAD;
    proxy_cache_min_uses 2;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
    proxy_cache_lock on;
    proxy_cache_lock_timeout 5s;

    # Cache bypass conditions
    proxy_cache_bypass $http_cache_control $cookie_session;
    proxy_no_cache $http_cache_control $cookie_session;

    # Add cache status header
    add_header X-Cache-Status $upstream_cache_status;
    add_header X-Cache-Key $scheme$request_method$host$request_uri$is_args$args;
}
```

## Performance Tuning

### Kernel Parameters
```bash
# /etc/sysctl.conf

# Network optimizations
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_tw_recycle = 0
net.ipv4.ip_local_port_range = 10000 65000

# File descriptors
fs.file-max = 2097152
fs.nr_open = 2097152

# Apply settings
sudo sysctl -p
```

### nginx Worker Tuning
```nginx
# Optimal worker configuration
worker_processes auto;
worker_cpu_affinity auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
    accept_mutex off;
}
```

## Monitoring and Logging

### Access Log Format
```nginx
log_format detailed '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time" '
                    'cache=$upstream_cache_status';
```

### Error Log Levels
```nginx
# Development
error_log /var/log/nginx/error.log debug;

# Production
error_log /var/log/nginx/error.log warn;
```

### Prometheus Metrics
```nginx
# Install nginx-module-vts for metrics
location /metrics {
    vhost_traffic_status_display;
    vhost_traffic_status_display_format prometheus;
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    deny all;
}
```

## SSL/TLS Configuration

### Let's Encrypt Setup
```bash
#!/bin/bash
# setup-ssl.sh

# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx \
    -d radiocalico.com \
    -d www.radiocalico.com \
    --email admin@radiocalico.com \
    --agree-tos \
    --no-eff-email

# Auto-renewal
echo "0 0,12 * * * root python3 -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null
```

### SSL Security Headers
```nginx
# Modern SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Session resumption
ssl_session_timeout 1d;
ssl_session_cache shared:MozSSL:10m;
ssl_session_tickets off;

# HSTS
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

## Deployment Script

### nginx Configuration Deployment
```bash
#!/bin/bash
# deploy-nginx.sh

set -e

# Variables
NGINX_DIR="/etc/nginx"
SITE_NAME="radiocalico"
BACKUP_DIR="/var/backups/nginx"

# Create backup
echo "Creating backup..."
mkdir -p $BACKUP_DIR
cp -r $NGINX_DIR $BACKUP_DIR/nginx-$(date +%Y%m%d-%H%M%S)

# Test configuration
echo "Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Configuration test passed"

    # Reload nginx
    echo "Reloading nginx..."
    systemctl reload nginx

    echo "nginx configuration deployed successfully"
else
    echo "Configuration test failed. Rolling back..."
    exit 1
fi

# Verify site is accessible
echo "Verifying site accessibility..."
curl -f -s -o /dev/null -w "%{http_code}" https://radiocalico.com/health

if [ $? -eq 0 ]; then
    echo "Site is accessible"
else
    echo "Site is not accessible. Check logs: /var/log/nginx/error.log"
    exit 1
fi
```

## Troubleshooting

### Common Issues

#### 502 Bad Gateway
```bash
# Check backend servers
curl -I http://localhost:3000/api/health

# Check nginx error logs
tail -f /var/log/nginx/error.log

# Verify upstream configuration
nginx -T | grep upstream
```

#### 504 Gateway Timeout
```nginx
# Increase timeout values
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

#### High Memory Usage
```bash
# Check current connections
ss -ant | grep :443 | wc -l

# Monitor nginx processes
ps aux | grep nginx

# Adjust worker connections
worker_connections 2048;  # Reduce if memory constrained
```

## Maintenance

### Log Rotation
```bash
# /etc/logrotate.d/nginx
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

### Health Checks
```bash
#!/bin/bash
# health-check.sh

# Check nginx status
systemctl is-active nginx

# Check listening ports
ss -tlnp | grep nginx

# Test configuration
nginx -t

# Check SSL certificate expiry
echo | openssl s_client -servername radiocalico.com -connect radiocalico.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Conclusion

This nginx configuration provides RadioCalico with:
- High-performance static file serving
- Efficient reverse proxy to Node.js backend
- SSL/TLS security with A+ rating
- DDoS protection and rate limiting
- Caching for improved performance
- Load balancing for scalability
- Comprehensive monitoring and logging

The configuration is production-ready and follows industry best practices for security and performance.