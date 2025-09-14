const path = require('path');
const fs = require('fs');
const config = require('./environment');

class DatabaseConfig {
  static getDatabasePath() {
    const dbPath = path.resolve(config.database.file);
    const dbDir = path.dirname(dbPath);

    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory: ${dbDir}`);
    }

    return dbPath;
  }

  static getConnectionOptions() {
    return {
      filename: this.getDatabasePath(),
      mode: require('sqlite3').OPEN_READWRITE | require('sqlite3').OPEN_CREATE
    };
  }

  static isDevelopment() {
    return config.server.nodeEnv === 'development';
  }

  static isProduction() {
    return config.server.nodeEnv === 'production';
  }
}

module.exports = DatabaseConfig;