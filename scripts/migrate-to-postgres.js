#!/usr/bin/env node

// Migration script from SQLite to PostgreSQL
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
    await fs.appendFile(this.logFile, logMessage).catch(console.error);
  }

  async error(message, error) {
    await this.log(`${message}: ${error.message}`, 'ERROR');
    if (error.stack) {
      await fs.appendFile(this.logFile, error.stack + '\n').catch(console.error);
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
    // Check if SQLite database exists
    try {
      await fs.access(this.config.sqlite.path);
    } catch (error) {
      throw new Error(`SQLite database not found at ${this.config.sqlite.path}`);
    }

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
        else resolve(rows || []);
      });
    });
  }

  // Check if tables exist in SQLite
  async checkSQLiteTables() {
    const tables = await this.getSQLiteData(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'song_ratings')"
    );
    return tables.map(t => t.name);
  }

  // Migrate users
  async migrateUsers() {
    await this.logger.log('Starting user migration...');

    // Check if users table exists
    const tables = await this.checkSQLiteTables();
    if (!tables.includes('users')) {
      await this.logger.log('Users table not found in SQLite, skipping...');
      return;
    }

    const users = await this.getSQLiteData('SELECT * FROM users');
    this.stats.users.total = users.length;

    if (users.length === 0) {
      await this.logger.log('No users found to migrate');
      return;
    }

    const client = await this.pgPool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < users.length; i += this.config.batchSize) {
        const batch = users.slice(i, i + this.config.batchSize);

        for (const user of batch) {
          try {
            await client.query(
              `INSERT INTO users (username, email, created_at)
               VALUES ($1, $2, $3)
               ON CONFLICT (username) DO UPDATE SET
                 email = EXCLUDED.email,
                 updated_at = CURRENT_TIMESTAMP`,
              [
                user.username,
                user.email,
                user.created_at || new Date().toISOString()
              ]
            );
            this.stats.users.migrated++;
          } catch (error) {
            this.stats.users.failed++;
            await this.logger.error(`Failed to migrate user ${user.username}`, error);
          }
        }

        if ((i + batch.length) % 1000 === 0) {
          await this.logger.log(
            `Migrated ${i + batch.length}/${users.length} users`
          );
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

    // Check if song_ratings table exists
    const tables = await this.checkSQLiteTables();
    if (!tables.includes('song_ratings')) {
      await this.logger.log('Song_ratings table not found in SQLite, skipping...');
      return;
    }

    const ratings = await this.getSQLiteData('SELECT * FROM song_ratings');
    this.stats.songRatings.total = ratings.length;

    if (ratings.length === 0) {
      await this.logger.log('No song ratings found to migrate');
      return;
    }

    const client = await this.pgPool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < ratings.length; i += this.config.batchSize) {
        const batch = ratings.slice(i, i + this.config.batchSize);

        for (const rating of batch) {
          try {
            await client.query(
              `INSERT INTO song_ratings
               (song_id, user_identifier, artist, title, rating, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (song_id, user_identifier)
               DO UPDATE SET
                 rating = EXCLUDED.rating,
                 updated_at = EXCLUDED.updated_at`,
              [
                rating.song_id,
                rating.user_identifier,
                rating.artist || 'Unknown Artist',
                rating.title || 'Unknown Title',
                rating.rating,
                rating.created_at || new Date().toISOString(),
                rating.updated_at || rating.created_at || new Date().toISOString()
              ]
            );
            this.stats.songRatings.migrated++;
          } catch (error) {
            this.stats.songRatings.failed++;
            await this.logger.error(`Failed to migrate rating for song ${rating.song_id}`, error);
          }
        }

        if ((i + batch.length) % 5000 === 0) {
          await this.logger.log(
            `Migrated ${i + batch.length}/${ratings.length} song ratings`
          );
        }
      }

      await client.query('COMMIT');

      // Refresh materialized view if it exists
      try {
        await client.query('REFRESH MATERIALIZED VIEW song_statistics');
        await this.logger.log('Refreshed materialized view');
      } catch (error) {
        await this.logger.log('Materialized view not found or could not be refreshed');
      }

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

    const tables = await this.checkSQLiteTables();
    const validation = {};

    if (tables.includes('users')) {
      const sqliteUsers = await this.getSQLiteData('SELECT COUNT(*) as count FROM users');
      const pgUsers = await this.pgPool.query('SELECT COUNT(*) as count FROM users');

      validation.users = {
        sqlite: sqliteUsers[0].count,
        postgres: parseInt(pgUsers.rows[0].count),
        match: sqliteUsers[0].count === parseInt(pgUsers.rows[0].count)
      };
    }

    if (tables.includes('song_ratings')) {
      const sqliteRatings = await this.getSQLiteData('SELECT COUNT(*) as count FROM song_ratings');
      const pgRatings = await this.pgPool.query('SELECT COUNT(*) as count FROM song_ratings');

      validation.songRatings = {
        sqlite: sqliteRatings[0].count,
        postgres: parseInt(pgRatings.rows[0].count),
        match: sqliteRatings[0].count === parseInt(pgRatings.rows[0].count)
      };
    }

    await this.logger.log(`Validation Results: ${JSON.stringify(validation, null, 2)}`);

    const allMatch = Object.values(validation).every(v => v.match !== false);
    if (!allMatch) {
      throw new Error('Validation failed: Row counts do not match');
    }

    await this.logger.log('Validation completed successfully');
    return validation;
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