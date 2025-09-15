# Database Migration Scripts

## Overview

This document contains all the migration scripts needed to transition RadioCalico from SQLite to PostgreSQL, including schema creation, data migration, validation, and rollback procedures.

## Prerequisites Setup Script

```bash
#!/bin/bash
# setup-prerequisites.sh

set -e

echo "Installing PostgreSQL and dependencies..."

# Update package list
sudo apt-get update

# Install PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install postgresql-15 postgresql-client-15 postgresql-contrib-15

# Install pgBouncer
sudo apt-get -y install pgbouncer

# Install Node.js dependencies
npm install pg pg-migrate dotenv
npm install --save-dev @types/pg

# Create PostgreSQL user and database
sudo -u postgres psql <<EOF
CREATE USER radiocalico WITH PASSWORD 'radiocalico_password';
CREATE DATABASE radiocalico OWNER radiocalico;
CREATE DATABASE radiocalico_test OWNER radiocalico;
GRANT ALL PRIVILEGES ON DATABASE radiocalico TO radiocalico;
GRANT ALL PRIVILEGES ON DATABASE radiocalico_test TO radiocalico;
EOF

echo "Prerequisites installed successfully!"
```

## PostgreSQL Schema Creation

```sql
-- create-schema.sql
-- Run this script to create the initial PostgreSQL schema

-- Connect to the database
\c radiocalico;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create schema
CREATE SCHEMA IF NOT EXISTS radiocalico;
SET search_path TO radiocalico, public;

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS song_ratings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}' ::jsonb,
    metadata JSONB DEFAULT '{}' ::jsonb
);

-- Create indexes for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_metadata ON users USING gin(metadata);
CREATE INDEX idx_users_username_trgm ON users USING gin(username gin_trgm_ops);

-- Add comments
COMMENT ON TABLE users IS 'User accounts for RadioCalico';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.preferences IS 'User preferences in JSON format';
COMMENT ON COLUMN users.metadata IS 'Additional metadata for analytics';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create song_ratings table with partitioning
CREATE TABLE song_ratings (
    id UUID DEFAULT uuid_generate_v4(),
    song_id VARCHAR(255) NOT NULL,
    user_identifier VARCHAR(255) NOT NULL,
    artist VARCHAR(255),
    title VARCHAR(255),
    album VARCHAR(255),
    rating SMALLINT CHECK (rating IN (-1, 0, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    play_count INTEGER DEFAULT 1,
    skip_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}' ::jsonb,
    PRIMARY KEY (id, created_at),
    UNIQUE(song_id, user_identifier, created_at)
) PARTITION BY RANGE (created_at);

-- Create indexes for song_ratings (on parent table)
CREATE INDEX idx_song_ratings_song_id ON song_ratings(song_id);
CREATE INDEX idx_song_ratings_user_identifier ON song_ratings(user_identifier);
CREATE INDEX idx_song_ratings_created_at ON song_ratings(created_at);
CREATE INDEX idx_song_ratings_rating ON song_ratings(rating) WHERE rating != 0;
CREATE INDEX idx_song_ratings_artist_title ON song_ratings(artist, title);
CREATE INDEX idx_song_ratings_metadata ON song_ratings USING gin(metadata);

-- Create trigger for updated_at
CREATE TRIGGER update_song_ratings_updated_at
    BEFORE UPDATE ON song_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create partitions for song_ratings (monthly partitions)
DO $$
DECLARE
    start_date DATE := '2024-01-01';
    end_date DATE := '2025-12-31';
    partition_date DATE;
    partition_name TEXT;
BEGIN
    partition_date := start_date;

    WHILE partition_date < end_date LOOP
        partition_name := 'song_ratings_' || TO_CHAR(partition_date, 'YYYY_MM');

        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I PARTITION OF song_ratings
            FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            partition_date,
            partition_date + INTERVAL '1 month'
        );

        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- Create materialized view for analytics
CREATE MATERIALIZED VIEW song_statistics AS
SELECT
    song_id,
    artist,
    title,
    album,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as likes,
    COUNT(CASE WHEN rating = -1 THEN 1 END) as dislikes,
    COUNT(DISTINCT user_identifier) as unique_listeners,
    SUM(play_count) as total_plays,
    SUM(skip_count) as total_skips,
    AVG(CASE
        WHEN rating = 1 THEN 1.0
        WHEN rating = -1 THEN -1.0
        ELSE 0.0
    END)::NUMERIC(3,2) as average_rating,
    MAX(created_at) as last_played,
    MIN(created_at) as first_played
FROM song_ratings
WHERE rating IS NOT NULL
GROUP BY song_id, artist, title, album
WITH DATA;

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_song_statistics_song_id ON song_statistics(song_id);
CREATE INDEX idx_song_statistics_average_rating ON song_statistics(average_rating DESC);
CREATE INDEX idx_song_statistics_total_plays ON song_statistics(total_plays DESC);
CREATE INDEX idx_song_statistics_last_played ON song_statistics(last_played DESC);

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_song_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY song_statistics;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON SCHEMA radiocalico TO radiocalico;
GRANT ALL ON ALL TABLES IN SCHEMA radiocalico TO radiocalico;
GRANT ALL ON ALL SEQUENCES IN SCHEMA radiocalico TO radiocalico;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA radiocalico TO radiocalico;

-- Create audit table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    user_name VARCHAR(255),
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    old_data JSONB,
    new_data JSONB
);

CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log(table_name, operation, user_name, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        current_user,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to tables
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER song_ratings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON song_ratings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Data Migration Script

```javascript
// migrate-data.js
// Complete data migration script from SQLite to PostgreSQL

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const config = {
    sqlite: {
        path: process.env.SQLITE_PATH || './database/radiocalico.db'
    },
    postgres: {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        database: process.env.PG_DATABASE || 'radiocalico',
        user: process.env.PG_USER || 'radiocalico',
        password: process.env.PG_PASSWORD || 'radiocalico_password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    },
    batchSize: 1000,
    logFile: './migration.log'
};

// Logger
class Logger {
    constructor(logFile) {
        this.logFile = logFile;
    }

    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}\n`;
        console.log(logMessage);
        await fs.appendFile(this.logFile, logMessage);
    }

    async error(message, error) {
        await this.log(`${message}: ${error.message}`, 'ERROR');
        if (error.stack) {
            await fs.appendFile(this.logFile, error.stack + '\n');
        }
    }
}

// Migration class
class DataMigration {
    constructor(config) {
        this.config = config;
        this.logger = new Logger(config.logFile);
        this.stats = {
            users: { total: 0, migrated: 0, failed: 0 },
            songRatings: { total: 0, migrated: 0, failed: 0 }
        };
    }

    async connect() {
        // Connect to SQLite
        this.sqlite = new sqlite3.Database(this.config.sqlite.path, (err) => {
            if (err) {
                throw new Error(`SQLite connection failed: ${err.message}`);
            }
        });

        // Connect to PostgreSQL
        this.pgPool = new Pool(this.config.postgres);

        // Test PostgreSQL connection
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();

        await this.logger.log('Database connections established');
    }

    async disconnect() {
        if (this.sqlite) {
            this.sqlite.close();
        }
        if (this.pgPool) {
            await this.pgPool.end();
        }
        await this.logger.log('Database connections closed');
    }

    // Get SQLite data
    async getSQLiteData(query) {
        return new Promise((resolve, reject) => {
            this.sqlite.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Migrate users
    async migrateUsers() {
        await this.logger.log('Starting user migration...');

        const users = await this.getSQLiteData('SELECT * FROM users');
        this.stats.users.total = users.length;

        const client = await this.pgPool.connect();

        try {
            await client.query('BEGIN');

            for (let i = 0; i < users.length; i += this.config.batchSize) {
                const batch = users.slice(i, i + this.config.batchSize);

                const values = batch.map(user => {
                    return [
                        user.username,
                        user.email,
                        user.created_at || new Date().toISOString()
                    ];
                });

                const query = `
                    INSERT INTO users (username, email, created_at)
                    VALUES ${values.map((_, idx) =>
                        `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`
                    ).join(', ')}
                    ON CONFLICT (username) DO UPDATE SET
                        email = EXCLUDED.email,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                `;

                const flatValues = values.flat();

                try {
                    const result = await client.query(query, flatValues);
                    this.stats.users.migrated += result.rowCount;

                    if ((i + batch.length) % 1000 === 0) {
                        await this.logger.log(
                            `Migrated ${i + batch.length}/${users.length} users`
                        );
                    }
                } catch (error) {
                    this.stats.users.failed += batch.length;
                    await this.logger.error(`Failed to migrate user batch ${i}`, error);
                }
            }

            await client.query('COMMIT');
            await this.logger.log(
                `User migration completed: ${this.stats.users.migrated} migrated, ` +
                `${this.stats.users.failed} failed`
            );

        } catch (error) {
            await client.query('ROLLBACK');
            await this.logger.error('User migration failed', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Migrate song ratings
    async migrateSongRatings() {
        await this.logger.log('Starting song ratings migration...');

        const ratings = await this.getSQLiteData('SELECT * FROM song_ratings');
        this.stats.songRatings.total = ratings.length;

        const client = await this.pgPool.connect();

        try {
            await client.query('BEGIN');

            for (let i = 0; i < ratings.length; i += this.config.batchSize) {
                const batch = ratings.slice(i, i + this.config.batchSize);

                const values = batch.map(rating => {
                    return [
                        rating.song_id,
                        rating.user_identifier,
                        rating.artist || 'Unknown Artist',
                        rating.title || 'Unknown Title',
                        rating.rating,
                        rating.created_at || new Date().toISOString(),
                        rating.updated_at || rating.created_at || new Date().toISOString()
                    ];
                });

                const query = `
                    INSERT INTO song_ratings
                    (song_id, user_identifier, artist, title, rating, created_at, updated_at)
                    VALUES ${values.map((_, idx) =>
                        `($${idx * 7 + 1}, $${idx * 7 + 2}, $${idx * 7 + 3},
                          $${idx * 7 + 4}, $${idx * 7 + 5}, $${idx * 7 + 6}, $${idx * 7 + 7})`
                    ).join(', ')}
                    ON CONFLICT (song_id, user_identifier, created_at) DO UPDATE SET
                        rating = EXCLUDED.rating,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id
                `;

                const flatValues = values.flat();

                try {
                    const result = await client.query(query, flatValues);
                    this.stats.songRatings.migrated += result.rowCount;

                    if ((i + batch.length) % 5000 === 0) {
                        await this.logger.log(
                            `Migrated ${i + batch.length}/${ratings.length} song ratings`
                        );
                    }
                } catch (error) {
                    this.stats.songRatings.failed += batch.length;
                    await this.logger.error(`Failed to migrate rating batch ${i}`, error);
                }
            }

            await client.query('COMMIT');

            // Refresh materialized view
            await client.query('REFRESH MATERIALIZED VIEW song_statistics');

            await this.logger.log(
                `Song ratings migration completed: ${this.stats.songRatings.migrated} migrated, ` +
                `${this.stats.songRatings.failed} failed`
            );

        } catch (error) {
            await client.query('ROLLBACK');
            await this.logger.error('Song ratings migration failed', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Validate migration
    async validate() {
        await this.logger.log('Starting validation...');

        const sqliteUsers = await this.getSQLiteData('SELECT COUNT(*) as count FROM users');
        const sqliteRatings = await this.getSQLiteData('SELECT COUNT(*) as count FROM song_ratings');

        const client = await this.pgPool.connect();

        try {
            const pgUsers = await client.query('SELECT COUNT(*) as count FROM users');
            const pgRatings = await client.query('SELECT COUNT(*) as count FROM song_ratings');

            const validation = {
                users: {
                    sqlite: sqliteUsers[0].count,
                    postgres: parseInt(pgUsers.rows[0].count),
                    match: sqliteUsers[0].count === parseInt(pgUsers.rows[0].count)
                },
                songRatings: {
                    sqlite: sqliteRatings[0].count,
                    postgres: parseInt(pgRatings.rows[0].count),
                    match: sqliteRatings[0].count === parseInt(pgRatings.rows[0].count)
                }
            };

            await this.logger.log(`Validation Results: ${JSON.stringify(validation, null, 2)}`);

            if (!validation.users.match || !validation.songRatings.match) {
                throw new Error('Validation failed: Row counts do not match');
            }

            // Sample data validation
            const sampleValidation = await this.validateSampleData();

            if (!sampleValidation) {
                throw new Error('Sample data validation failed');
            }

            await this.logger.log('Validation completed successfully');
            return validation;

        } finally {
            client.release();
        }
    }

    // Validate sample data
    async validateSampleData() {
        const client = await this.pgPool.connect();

        try {
            // Check a few random records
            const sqliteUsers = await this.getSQLiteData(
                'SELECT * FROM users ORDER BY RANDOM() LIMIT 5'
            );

            for (const user of sqliteUsers) {
                const pgUser = await client.query(
                    'SELECT * FROM users WHERE username = $1',
                    [user.username]
                );

                if (pgUser.rows.length === 0) {
                    await this.logger.error(
                        `User not found in PostgreSQL: ${user.username}`,
                        new Error('Missing user')
                    );
                    return false;
                }

                if (pgUser.rows[0].email !== user.email) {
                    await this.logger.error(
                        `Email mismatch for user ${user.username}`,
                        new Error('Data mismatch')
                    );
                    return false;
                }
            }

            await this.logger.log('Sample data validation passed');
            return true;

        } finally {
            client.release();
        }
    }

    // Generate migration report
    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            statistics: this.stats,
            validation: await this.validate()
        };

        await fs.writeFile(
            './migration-report.json',
            JSON.stringify(report, null, 2)
        );

        await this.logger.log('Migration report generated: migration-report.json');
        return report;
    }

    // Main migration process
    async migrate() {
        this.startTime = Date.now();

        try {
            await this.logger.log('='.repeat(50));
            await this.logger.log('Starting RadioCalico Data Migration');
            await this.logger.log('='.repeat(50));

            await this.connect();
            await this.migrateUsers();
            await this.migrateSongRatings();
            await this.validate();
            await this.generateReport();

            const duration = (Date.now() - this.startTime) / 1000;
            await this.logger.log(`Migration completed successfully in ${duration} seconds`);

        } catch (error) {
            await this.logger.error('Migration failed', error);
            throw error;
        } finally {
            await this.disconnect();
        }
    }
}

// Run migration
if (require.main === module) {
    const migration = new DataMigration(config);

    migration.migrate()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = DataMigration;
```

## Rollback Script

```javascript
// rollback-migration.js
// Emergency rollback from PostgreSQL to SQLite

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class MigrationRollback {
    constructor(config) {
        this.config = config;
        this.logger = console;
    }

    async connect() {
        // Connect to PostgreSQL
        this.pgPool = new Pool(this.config.postgres);

        // Backup existing SQLite database
        const backupPath = `${this.config.sqlite.path}.backup.${Date.now()}`;
        await fs.copyFile(this.config.sqlite.path, backupPath);
        this.logger.log(`SQLite backup created: ${backupPath}`);

        // Connect to SQLite
        this.sqlite = new sqlite3.Database(this.config.sqlite.path);
    }

    async rollbackUsers() {
        const client = await this.pgPool.connect();

        try {
            const result = await client.query('SELECT * FROM users');
            const users = result.rows;

            // Clear existing SQLite users
            await this.runSQLite('DELETE FROM users');

            // Insert PostgreSQL users back to SQLite
            for (const user of users) {
                await this.runSQLite(
                    `INSERT INTO users (username, email, created_at)
                     VALUES (?, ?, ?)`,
                    [user.username, user.email, user.created_at]
                );
            }

            this.logger.log(`Rolled back ${users.length} users`);

        } finally {
            client.release();
        }
    }

    async rollbackSongRatings() {
        const client = await this.pgPool.connect();

        try {
            const result = await client.query('SELECT * FROM song_ratings');
            const ratings = result.rows;

            // Clear existing SQLite ratings
            await this.runSQLite('DELETE FROM song_ratings');

            // Insert PostgreSQL ratings back to SQLite
            for (const rating of ratings) {
                await this.runSQLite(
                    `INSERT INTO song_ratings
                     (song_id, user_identifier, artist, title, rating, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        rating.song_id,
                        rating.user_identifier,
                        rating.artist,
                        rating.title,
                        rating.rating,
                        rating.created_at,
                        rating.updated_at
                    ]
                );
            }

            this.logger.log(`Rolled back ${ratings.length} song ratings`);

        } finally {
            client.release();
        }
    }

    runSQLite(query, params = []) {
        return new Promise((resolve, reject) => {
            this.sqlite.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    async rollback() {
        try {
            await this.connect();
            await this.rollbackUsers();
            await this.rollbackSongRatings();

            this.logger.log('Rollback completed successfully');

            // Update application configuration
            await fs.writeFile('.env',
                `DATABASE_TYPE=sqlite\nDATABASE_FILE=./database/radiocalico.db`
            );

        } catch (error) {
            this.logger.error('Rollback failed:', error);
            throw error;
        } finally {
            if (this.sqlite) this.sqlite.close();
            if (this.pgPool) await this.pgPool.end();
        }
    }
}

// Run rollback
if (require.main === module) {
    const config = {
        sqlite: {
            path: process.env.SQLITE_PATH || './database/radiocalico.db'
        },
        postgres: {
            host: process.env.PG_HOST || 'localhost',
            port: process.env.PG_PORT || 5432,
            database: process.env.PG_DATABASE || 'radiocalico',
            user: process.env.PG_USER || 'radiocalico',
            password: process.env.PG_PASSWORD || 'radiocalico_password'
        }
    };

    const rollback = new MigrationRollback(config);

    rollback.rollback()
        .then(() => {
            console.log('Rollback completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Rollback failed:', error);
            process.exit(1);
        });
}
```

## Validation Script

```bash
#!/bin/bash
# validate-migration.sh

set -e

echo "Starting migration validation..."

# Function to run SQLite query
sqlite_query() {
    sqlite3 ./database/radiocalico.db "$1"
}

# Function to run PostgreSQL query
pg_query() {
    psql -h localhost -U radiocalico -d radiocalico -t -c "$1"
}

# Compare row counts
echo "Comparing row counts..."

SQLITE_USERS=$(sqlite_query "SELECT COUNT(*) FROM users;")
PG_USERS=$(pg_query "SELECT COUNT(*) FROM users;")

SQLITE_RATINGS=$(sqlite_query "SELECT COUNT(*) FROM song_ratings;")
PG_RATINGS=$(pg_query "SELECT COUNT(*) FROM song_ratings;")

echo "Users - SQLite: $SQLITE_USERS, PostgreSQL: $PG_USERS"
echo "Ratings - SQLite: $SQLITE_RATINGS, PostgreSQL: $PG_RATINGS"

# Check for discrepancies
if [ "$SQLITE_USERS" != "$PG_USERS" ]; then
    echo "ERROR: User count mismatch!"
    exit 1
fi

if [ "$SQLITE_RATINGS" != "$PG_RATINGS" ]; then
    echo "ERROR: Rating count mismatch!"
    exit 1
fi

# Validate sample data
echo "Validating sample data..."

# Get random user from SQLite
SQLITE_USER=$(sqlite_query "SELECT username FROM users ORDER BY RANDOM() LIMIT 1;")

# Check if user exists in PostgreSQL
PG_USER=$(pg_query "SELECT username FROM users WHERE username = '$SQLITE_USER';")

if [ -z "$PG_USER" ]; then
    echo "ERROR: User $SQLITE_USER not found in PostgreSQL!"
    exit 1
fi

echo "Validation completed successfully!"
```

## Performance Testing Script

```sql
-- performance-test.sql
-- Run performance comparisons between SQLite and PostgreSQL

-- Test 1: Simple SELECT
EXPLAIN ANALYZE
SELECT * FROM users WHERE username = 'testuser';

-- Test 2: JOIN query
EXPLAIN ANALYZE
SELECT u.username, COUNT(sr.id) as rating_count
FROM users u
LEFT JOIN song_ratings sr ON u.username = sr.user_identifier
GROUP BY u.username
LIMIT 100;

-- Test 3: Aggregation query
EXPLAIN ANALYZE
SELECT
    artist,
    title,
    COUNT(*) as play_count,
    AVG(rating) as avg_rating
FROM song_ratings
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY artist, title
ORDER BY play_count DESC
LIMIT 50;

-- Test 4: Complex query with subqueries
EXPLAIN ANALYZE
WITH user_stats AS (
    SELECT
        user_identifier,
        COUNT(*) as total_ratings,
        AVG(rating) as avg_rating
    FROM song_ratings
    GROUP BY user_identifier
)
SELECT
    u.username,
    us.total_ratings,
    us.avg_rating
FROM users u
JOIN user_stats us ON u.username = us.user_identifier
WHERE us.total_ratings > 10
ORDER BY us.avg_rating DESC;

-- Test 5: Insert performance
EXPLAIN ANALYZE
INSERT INTO song_ratings (song_id, user_identifier, artist, title, rating)
SELECT
    'test_' || generate_series,
    'user_' || (generate_series % 100),
    'Artist ' || (generate_series % 50),
    'Title ' || generate_series,
    (ARRAY[-1, 0, 1])[1 + floor(random() * 3)]
FROM generate_series(1, 10000);
```

## Monitoring Script

```bash
#!/bin/bash
# monitor-migration.sh

# Monitor migration progress in real-time

while true; do
    clear
    echo "==================================="
    echo "Migration Progress Monitor"
    echo "==================================="
    echo ""

    # PostgreSQL stats
    echo "PostgreSQL Database:"
    psql -h localhost -U radiocalico -d radiocalico -c "
        SELECT
            'Users' as table_name,
            COUNT(*) as row_count
        FROM users
        UNION ALL
        SELECT
            'Song Ratings' as table_name,
            COUNT(*) as row_count
        FROM song_ratings;
    "

    # Connection pool stats
    echo ""
    echo "Connection Pool:"
    psql -h localhost -U radiocalico -d radiocalico -c "
        SELECT
            datname,
            numbackends as connections,
            xact_commit as commits,
            xact_rollback as rollbacks
        FROM pg_stat_database
        WHERE datname = 'radiocalico';
    "

    # Disk usage
    echo ""
    echo "Disk Usage:"
    psql -h localhost -U radiocalico -d radiocalico -c "
        SELECT
            pg_size_pretty(pg_database_size('radiocalico')) as database_size;
    "

    # Latest migration log
    echo ""
    echo "Latest Migration Log:"
    tail -n 5 migration.log

    sleep 5
done
```

## Conclusion

These migration scripts provide a complete solution for migrating RadioCalico from SQLite to PostgreSQL, including:

1. **Schema creation** with advanced PostgreSQL features
2. **Data migration** with batch processing and error handling
3. **Validation** to ensure data integrity
4. **Rollback** capability for emergency recovery
5. **Performance testing** to verify improvements
6. **Monitoring** for real-time migration tracking

The scripts are designed to be idempotent, handle errors gracefully, and provide comprehensive logging for troubleshooting.