# PostgreSQL Migration Guide

This guide documents the PostgreSQL migration implementation for RadioCalico, providing instructions for migrating from SQLite to PostgreSQL.

## Overview

RadioCalico now supports both SQLite and PostgreSQL databases. PostgreSQL provides better performance, scalability, and concurrent user handling for production deployments.

## Features Implemented

### 1. Dual Database Support
- Application can run with either SQLite or PostgreSQL
- Database type configurable via `DATABASE_TYPE` environment variable
- Unified database interface for seamless switching

### 2. PostgreSQL Features
- Connection pooling for optimal performance
- UUID primary keys for better distributed systems support
- JSONB columns for flexible metadata storage
- Materialized views for analytics
- Automatic timestamp updates via triggers
- Comprehensive indexing for query optimization

### 3. Migration Tools
- Automated migration script from SQLite to PostgreSQL
- Schema creation scripts
- Data validation and verification
- Rollback capabilities

## Quick Start

### Using Docker (Recommended)

1. **Start PostgreSQL with Docker:**
```bash
make postgres-up
```

2. **Run the application with PostgreSQL:**
```bash
cp .env.postgres .env
make postgres
```

3. **Access pgAdmin (optional):**
```bash
make pgadmin
# Open http://localhost:5050
# Login: admin@radiocalico.com / admin
```

### Manual Setup

1. **Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-15 postgresql-client-15

# macOS
brew install postgresql@15
```

2. **Setup database:**
```bash
./scripts/setup-postgres.sh
```

3. **Configure environment:**
```bash
cp .env.postgres .env
# Edit .env with your PostgreSQL credentials
```

4. **Run application:**
```bash
npm start
```

## Migration from SQLite

### Prerequisites
- Existing SQLite database with data
- PostgreSQL instance running
- Node.js environment configured

### Migration Steps

1. **Backup SQLite database:**
```bash
cp database/radiocalico.db database/radiocalico.db.backup
```

2. **Ensure PostgreSQL is running:**
```bash
make postgres-up
# OR
sudo systemctl start postgresql
```

3. **Run migration script:**
```bash
node scripts/migrate-to-postgres.js
```

4. **Verify migration:**
```bash
# Check migration report
cat migration-report.json

# Connect to PostgreSQL
make postgres-shell
# OR
psql -h localhost -U radiocalico -d radiocalico

# Verify data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM song_ratings;
```

## Configuration

### Environment Variables

```bash
# Database Type (sqlite or postgres)
DATABASE_TYPE=postgres

# PostgreSQL Connection
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=radiocalico
PG_USER=radiocalico
PG_PASSWORD=radiocalico_password

# Connection Pool Settings
PG_MAX_CONNECTIONS=20
PG_IDLE_TIMEOUT=30000
PG_CONNECTION_TIMEOUT=2000

# SSL Configuration (optional)
PG_SSL=false
PG_SSL_REJECT_UNAUTHORIZED=true
```

### Docker Compose Configuration

The `docker-compose.postgres.yml` file includes:
- PostgreSQL 15 Alpine
- pgAdmin for database management
- Redis for session storage (optional)
- RadioCalico application configured for PostgreSQL

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);
```

### Song Ratings Table
```sql
CREATE TABLE song_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_id VARCHAR(255) NOT NULL,
    user_identifier VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    title VARCHAR(255),
    rating SMALLINT CHECK(rating IN (-1, 0, 1)),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(song_id, user_identifier)
);
```

### Materialized View for Analytics
```sql
CREATE MATERIALIZED VIEW song_statistics AS
SELECT
    song_id,
    artist,
    title,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as likes,
    COUNT(CASE WHEN rating = -1 THEN 1 END) as dislikes,
    -- ... additional statistics
FROM song_ratings
GROUP BY song_id, artist, title;
```

## Makefile Commands

```bash
# PostgreSQL Management
make postgres          # Start PostgreSQL environment
make postgres-up       # Start PostgreSQL in background
make postgres-down     # Stop PostgreSQL
make postgres-logs     # View PostgreSQL logs
make postgres-shell    # Open PostgreSQL shell
make postgres-build    # Rebuild PostgreSQL image

# Database Operations
make migrate           # Migrate from SQLite to PostgreSQL
make setup-postgres    # Setup PostgreSQL locally

# Tools
make pgadmin          # Start pgAdmin interface
```

## Testing

### Test Database Connection
```bash
# Using the application
curl http://localhost:3000/api/health/db

# Direct connection test
psql -h localhost -U radiocalico -d radiocalico -c "SELECT 1"
```

### Run Tests with PostgreSQL
```bash
# Set test environment
export NODE_ENV=test
export DATABASE_TYPE=postgres

# Run tests
npm test
```

## Performance Comparison

### SQLite vs PostgreSQL

| Metric | SQLite | PostgreSQL | Improvement |
|--------|--------|------------|-------------|
| Concurrent Users | 10-20 | 1000+ | 50x+ |
| Write Performance | Sequential | Parallel | 10x+ |
| Query Complexity | Basic | Advanced | N/A |
| Data Size Limit | 281 TB | Unlimited | N/A |
| Replication | No | Yes | N/A |

## Troubleshooting

### Common Issues

1. **Connection refused:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql
# OR
docker ps | grep postgres

# Check connection settings
psql -h localhost -p 5432 -U radiocalico -d radiocalico
```

2. **Authentication failed:**
```bash
# Check pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Ensure: local all all md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

3. **Migration errors:**
```bash
# Check migration log
cat migration.log

# Verify source database
sqlite3 database/radiocalico.db ".tables"

# Reset and retry
make postgres-down
make postgres-up
node scripts/migrate-to-postgres.js
```

## Rollback to SQLite

If needed, you can rollback to SQLite:

1. **Stop application**
2. **Update environment:**
```bash
export DATABASE_TYPE=sqlite
# OR edit .env file
```
3. **Restart application:**
```bash
npm start
```

The SQLite database remains untouched during PostgreSQL operations.

## Production Deployment

### Recommendations

1. **Use connection pooling** - Configure pgBouncer for high-traffic scenarios
2. **Enable SSL** - Set `PG_SSL=true` for secure connections
3. **Regular backups** - Use `pg_dump` for scheduled backups
4. **Monitor performance** - Use pg_stat_statements extension
5. **Optimize queries** - Analyze slow queries with EXPLAIN ANALYZE

### Security Best Practices

1. Use strong passwords
2. Restrict network access
3. Enable SSL/TLS
4. Regular security updates
5. Audit logging
6. Row-level security where applicable

## Next Steps

1. **High Availability** - Set up streaming replication
2. **Performance Tuning** - Optimize PostgreSQL configuration
3. **Monitoring** - Implement Prometheus/Grafana monitoring
4. **Caching** - Add Redis for query caching
5. **Load Balancing** - Implement read replicas

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js PostgreSQL Driver](https://node-postgres.com/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Docker PostgreSQL Image](https://hub.docker.com/_/postgres)