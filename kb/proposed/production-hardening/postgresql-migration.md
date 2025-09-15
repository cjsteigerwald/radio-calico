# PostgreSQL Migration Guide

## Overview

This document provides a detailed guide for migrating RadioCalico from SQLite to PostgreSQL, including schema conversion, data migration, and application code updates.

## Prerequisites

### PostgreSQL Setup
```bash
# Install PostgreSQL 15
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-client-15 postgresql-contrib-15

# Install pgBouncer for connection pooling
sudo apt-get install pgbouncer

# Install migration tools
npm install --save pg pg-migrate
npm install --save-dev @types/pg
```

## Database Design

### Schema Conversion

#### SQLite Schema (Current)
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Song ratings table
CREATE TABLE song_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    user_identifier TEXT NOT NULL,
    artist TEXT,
    title TEXT,
    rating INTEGER CHECK(rating IN (-1, 0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, user_identifier)
);
```

#### PostgreSQL Schema (Target)
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema
CREATE SCHEMA IF NOT EXISTS radiocalico;
SET search_path TO radiocalico;

-- Users table with UUID primary key
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_metadata ON users USING gin(metadata);

-- Song ratings table with partitioning support
CREATE TABLE song_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    song_id VARCHAR(255) NOT NULL,
    user_identifier VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    title VARCHAR(255),
    rating SMALLINT CHECK(rating IN (-1, 0, 1)),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(song_id, user_identifier)
) PARTITION BY RANGE (created_at);

-- Create partitions for song_ratings (monthly)
CREATE TABLE song_ratings_2024_01 PARTITION OF song_ratings
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE song_ratings_2024_02 PARTITION OF song_ratings
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Continue for all months...

-- Indexes for song_ratings
CREATE INDEX idx_song_ratings_song_id ON song_ratings(song_id);
CREATE INDEX idx_song_ratings_user ON song_ratings(user_identifier);
CREATE INDEX idx_song_ratings_created_at ON song_ratings(created_at);
CREATE INDEX idx_song_ratings_artist_title ON song_ratings(artist, title);

-- Updated trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_song_ratings_updated_at BEFORE UPDATE ON song_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics
CREATE MATERIALIZED VIEW song_statistics AS
SELECT
    song_id,
    artist,
    title,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as likes,
    COUNT(CASE WHEN rating = -1 THEN 1 END) as dislikes,
    COUNT(DISTINCT user_identifier) as total_ratings,
    AVG(CASE
        WHEN rating = 1 THEN 1.0
        WHEN rating = -1 THEN -1.0
        ELSE 0.0
    END)::NUMERIC(3,2) as average_rating,
    MAX(created_at) as last_rated
FROM song_ratings
WHERE rating != 0
GROUP BY song_id, artist, title;

-- Refresh materialized view periodically
CREATE INDEX idx_song_statistics_song_id ON song_statistics(song_id);
CREATE INDEX idx_song_statistics_average_rating ON song_statistics(average_rating DESC);
```

## Data Migration

### Migration Script
```javascript
// migrations/001-initial-schema.js
exports.up = async (pgm) => {
    // Enable extensions
    pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Create users table
    pgm.createTable('users', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('uuid_generate_v4()')
        },
        username: {
            type: 'varchar(255)',
            notNull: true,
            unique: true
        },
        email: {
            type: 'varchar(255)',
            notNull: true,
            unique: true
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        updated_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp')
        },
        is_active: {
            type: 'boolean',
            default: true
        },
        metadata: {
            type: 'jsonb',
            default: '{}'
        }
    });

    // Create indexes
    pgm.createIndex('users', 'username');
    pgm.createIndex('users', 'email');
    pgm.createIndex('users', 'created_at');
    pgm.createIndex('users', 'metadata', { method: 'gin' });
};

exports.down = (pgm) => {
    pgm.dropTable('users');
};
```

### Data Transfer Script
```javascript
// scripts/migrate-data.js
const sqlite3 = require('sqlite3');
const { Pool } = require('pg');
const path = require('path');

const sqliteDb = new sqlite3.Database(
    path.join(__dirname, '../database/radiocalico.db')
);

const pgPool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'radiocalico',
    user: process.env.PG_USER || 'radiocalico',
    password: process.env.PG_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function migrateUsers() {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM users', async (err, rows) => {
            if (err) return reject(err);

            const client = await pgPool.connect();
            try {
                await client.query('BEGIN');

                for (const row of rows) {
                    await client.query(
                        `INSERT INTO users (username, email, created_at)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (username) DO NOTHING`,
                        [row.username, row.email, row.created_at]
                    );
                }

                await client.query('COMMIT');
                console.log(`Migrated ${rows.length} users`);
                resolve(rows.length);
            } catch (error) {
                await client.query('ROLLBACK');
                reject(error);
            } finally {
                client.release();
            }
        });
    });
}

async function migrateSongRatings() {
    return new Promise((resolve, reject) => {
        sqliteDb.all('SELECT * FROM song_ratings', async (err, rows) => {
            if (err) return reject(err);

            const client = await pgPool.connect();
            try {
                await client.query('BEGIN');

                const batchSize = 1000;
                for (let i = 0; i < rows.length; i += batchSize) {
                    const batch = rows.slice(i, i + batchSize);
                    const values = batch.map(row =>
                        `('${row.song_id}', '${row.user_identifier}',
                          '${row.artist}', '${row.title}', ${row.rating},
                          '${row.created_at}', '${row.updated_at}')`
                    ).join(',');

                    await client.query(
                        `INSERT INTO song_ratings
                         (song_id, user_identifier, artist, title, rating, created_at, updated_at)
                         VALUES ${values}
                         ON CONFLICT (song_id, user_identifier)
                         DO UPDATE SET
                            rating = EXCLUDED.rating,
                            updated_at = EXCLUDED.updated_at`
                    );
                }

                await client.query('COMMIT');
                console.log(`Migrated ${rows.length} song ratings`);
                resolve(rows.length);
            } catch (error) {
                await client.query('ROLLBACK');
                reject(error);
            } finally {
                client.release();
            }
        });
    });
}

async function migrate() {
    try {
        console.log('Starting migration...');
        await migrateUsers();
        await migrateSongRatings();
        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
```

## Application Code Updates

### Database Connection Module
```javascript
// src/database/postgres.js
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    max: config.database.maxConnections || 20,
    idleTimeoutMillis: config.database.idleTimeout || 30000,
    connectionTimeoutMillis: config.database.connectionTimeout || 2000,
    ssl: config.database.ssl ? {
        rejectUnauthorized: config.database.sslRejectUnauthorized !== false
    } : false
});

// Connection pool error handling
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Health check
async function checkConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

module.exports = {
    pool,
    checkConnection,
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect()
};
```

### Updated Service Layer
```javascript
// src/services/userService.js
const db = require('../database/postgres');

class UserService {
    async createUser(username, email) {
        const query = `
            INSERT INTO users (username, email)
            VALUES ($1, $2)
            RETURNING id, username, email, created_at
        `;

        try {
            const result = await db.query(query, [username, email]);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('Username or email already exists');
            }
            throw error;
        }
    }

    async getUsers(limit = 100, offset = 0) {
        const query = `
            SELECT id, username, email, created_at, is_active
            FROM users
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await db.query(query, [limit, offset]);
        return result.rows;
    }

    async getUserById(id) {
        const query = `
            SELECT id, username, email, created_at, metadata
            FROM users
            WHERE id = $1 AND is_active = true
        `;

        const result = await db.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = new UserService();
```

## Connection Pooling with pgBouncer

### pgBouncer Configuration
```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
radiocalico = host=localhost port=5432 dbname=radiocalico

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = postgres
stats_users = stats, postgres
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 100
server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 15
server_login_retry = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
client_login_timeout = 60
autodb_idle_timeout = 3600
dns_max_ttl = 15
dns_nxdomain_ttl = 15
```

## Performance Optimization

### Query Optimization
```javascript
// Use prepared statements for repeated queries
const preparedStatements = {
    getUserById: {
        name: 'get-user-by-id',
        text: 'SELECT * FROM users WHERE id = $1',
        values: []
    },
    rateSong: {
        name: 'rate-song',
        text: `INSERT INTO song_ratings (song_id, user_identifier, artist, title, rating)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (song_id, user_identifier)
               DO UPDATE SET rating = $5, updated_at = CURRENT_TIMESTAMP`,
        values: []
    }
};

// Use connection pooling efficiently
async function executeQuery(statement, values) {
    const client = await db.getClient();
    try {
        const query = { ...statement, values };
        return await client.query(query);
    } finally {
        client.release();
    }
}
```

### Monitoring Queries
```sql
-- Monitor slow queries
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT
    query,
    mean_exec_time,
    calls,
    total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Monitor connection pool usage
SELECT
    datname,
    numbackends,
    xact_commit,
    xact_rollback,
    blks_read,
    blks_hit,
    tup_returned,
    tup_fetched,
    tup_inserted,
    tup_updated,
    tup_deleted
FROM pg_stat_database
WHERE datname = 'radiocalico';
```

## Backup and Recovery

### Backup Strategy
```bash
#!/bin/bash
# backup-postgres.sh

BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="radiocalico"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h localhost -U radiocalico -d $DB_NAME -F c -b -v -f "$BACKUP_DIR/radiocalico_$TIMESTAMP.backup"

# Compress backup
gzip "$BACKUP_DIR/radiocalico_$TIMESTAMP.backup"

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.backup.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/radiocalico_$TIMESTAMP.backup.gz" s3://radiocalico-backups/
```

### Recovery Procedure
```bash
#!/bin/bash
# restore-postgres.sh

BACKUP_FILE=$1
DB_NAME="radiocalico"

# Drop existing database
psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

# Create new database
psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER radiocalico;"

# Restore from backup
pg_restore -h localhost -U radiocalico -d $DB_NAME -v "$BACKUP_FILE"

# Verify restoration
psql -U radiocalico -d $DB_NAME -c "SELECT COUNT(*) FROM users;"
psql -U radiocalico -d $DB_NAME -c "SELECT COUNT(*) FROM song_ratings;"
```

## Testing Strategy

### Unit Tests
```javascript
// tests/database/postgres.test.js
const { Pool } = require('pg');
const UserService = require('../../src/services/userService');

describe('PostgreSQL User Service', () => {
    let pool;

    beforeAll(async () => {
        pool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'radiocalico_test',
            user: 'test_user',
            password: 'test_password'
        });
    });

    afterAll(async () => {
        await pool.end();
    });

    test('should create a new user', async () => {
        const user = await UserService.createUser('testuser', 'test@example.com');
        expect(user).toHaveProperty('id');
        expect(user.username).toBe('testuser');
        expect(user.email).toBe('test@example.com');
    });

    test('should handle duplicate username', async () => {
        await expect(
            UserService.createUser('testuser', 'other@example.com')
        ).rejects.toThrow('Username or email already exists');
    });
});
```

## Rollback Plan

### Immediate Rollback
```bash
#!/bin/bash
# rollback-to-sqlite.sh

# Stop application
pm2 stop radiocalico

# Export PostgreSQL data
pg_dump -h localhost -U radiocalico -d radiocalico --data-only --column-inserts > pg_export.sql

# Convert and import to SQLite
python3 pg_to_sqlite.py pg_export.sql database/radiocalico.db

# Update configuration
export DATABASE_TYPE=sqlite
export DATABASE_FILE=./database/radiocalico.db

# Restart application
pm2 start radiocalico
```

## Monitoring and Alerts

### Key Metrics
- Connection pool utilization
- Query response times
- Transaction throughput
- Replication lag
- Disk usage
- CPU and memory usage

### Alert Thresholds
- Connection pool > 80% utilized
- Query time > 1 second
- Replication lag > 10 seconds
- Disk usage > 80%
- Failed connections > 10 per minute

## Conclusion

This PostgreSQL migration provides RadioCalico with enterprise-grade database capabilities including:
- Better concurrency handling
- Advanced querying capabilities
- Built-in replication
- Superior performance for complex queries
- ACID compliance
- Horizontal scalability

The migration process is designed to be reversible with minimal downtime and zero data loss.