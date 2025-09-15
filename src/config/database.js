const path = require('path');
const fs = require('fs');
const config = require('./environment');

class DatabaseConfig {
  static getDatabaseType() {
    return process.env.DATABASE_TYPE || 'sqlite';
  }

  static isPostgreSQL() {
    return this.getDatabaseType() === 'postgres' || this.getDatabaseType() === 'postgresql';
  }

  static isSQLite() {
    return this.getDatabaseType() === 'sqlite';
  }

  static getDatabasePath() {
    const dbPath = path.resolve(config.database.file);
    const dbDir = path.dirname(dbPath);

    // Only create directory for SQLite and not for in-memory databases
    if (this.isSQLite() && dbPath !== ':memory:' && !fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory: ${dbDir}`);
    }

    return dbPath;
  }

  static getSQLiteOptions() {
    return {
      filename: this.getDatabasePath(),
      mode: require('sqlite3').OPEN_READWRITE | require('sqlite3').OPEN_CREATE
    };
  }

  static getPostgreSQLOptions() {
    return {
      host: process.env.PG_HOST || config.database.pgHost || 'localhost',
      port: parseInt(process.env.PG_PORT || config.database.pgPort || '5432'),
      database: process.env.PG_DATABASE || config.database.pgDatabase || 'radiocalico',
      user: process.env.PG_USER || config.database.pgUser || 'radiocalico',
      password: process.env.PG_PASSWORD || config.database.pgPassword || '',

      // Connection pool settings
      max: parseInt(process.env.PG_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT || '2000'),

      // SSL configuration
      ssl: process.env.PG_SSL === 'true' ? {
        rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false'
      } : false
    };
  }

  static getConnectionOptions() {
    if (this.isPostgreSQL()) {
      return this.getPostgreSQLOptions();
    }
    return this.getSQLiteOptions();
  }

  static isDevelopment() {
    return config.server.nodeEnv === 'development';
  }

  static isProduction() {
    return config.server.nodeEnv === 'production';
  }

  static isTest() {
    return config.server.nodeEnv === 'test';
  }
}

module.exports = DatabaseConfig;