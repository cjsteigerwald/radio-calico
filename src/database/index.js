// Unified database interface for SQLite and PostgreSQL
const DatabaseConfig = require('../config/database');
const sqliteDb = require('./db');
const postgresDb = require('./postgres');

class Database {
  static async initialize() {
    if (DatabaseConfig.isPostgreSQL()) {
      console.log('Initializing PostgreSQL database...');
      postgresDb.initializePool();
      await postgresDb.createTablesIfNotExist();
    } else {
      console.log('Using SQLite database...');
      // SQLite initialization is handled in db.js
    }
  }

  static async checkConnection() {
    if (DatabaseConfig.isPostgreSQL()) {
      return postgresDb.checkConnection();
    } else {
      // For SQLite, check if database file exists or is :memory:
      const dbPath = DatabaseConfig.getDatabasePath();
      const isConnected = dbPath === ':memory:' || require('fs').existsSync(dbPath);
      return {
        connected: isConnected,
        type: 'sqlite',
        path: dbPath
      };
    }
  }

  static async close() {
    if (DatabaseConfig.isPostgreSQL()) {
      await postgresDb.closePool();
    } else {
      // SQLite doesn't need explicit closing in our current implementation
      console.log('SQLite connection closed');
    }
  }

  // User operations
  static async createUser(username, email) {
    if (DatabaseConfig.isPostgreSQL()) {
      const query = `
        INSERT INTO users (username, email)
        VALUES ($1, $2)
        RETURNING id, username, email, created_at
      `;
      const result = await postgresDb.query(query, [username, email]);
      return result.rows[0];
    } else {
      return sqliteDb.createUser(username, email);
    }
  }

  static async getUsers() {
    if (DatabaseConfig.isPostgreSQL()) {
      const query = `
        SELECT id, username, email, created_at, is_active
        FROM users
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 100
      `;
      const result = await postgresDb.query(query);
      return result.rows;
    } else {
      return sqliteDb.getUsers();
    }
  }

  static async getUserByUsername(username) {
    if (DatabaseConfig.isPostgreSQL()) {
      const query = `
        SELECT id, username, email, created_at
        FROM users
        WHERE username = $1 AND is_active = true
      `;
      const result = await postgresDb.query(query, [username]);
      return result.rows[0];
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.db.get(
          'SELECT * FROM users WHERE username = ?',
          [username],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }
  }

  // Song rating operations
  static async rateSong(songId, userIdentifier, artist, title, rating) {
    if (DatabaseConfig.isPostgreSQL()) {
      const query = `
        INSERT INTO song_ratings (song_id, user_identifier, artist, title, rating)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (song_id, user_identifier)
        DO UPDATE SET
          rating = $5,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, song_id, rating, created_at
      `;
      const result = await postgresDb.query(query, [
        songId,
        userIdentifier,
        artist,
        title,
        rating
      ]);
      return result.rows[0];
    } else {
      return sqliteDb.rateSong(songId, userIdentifier, artist, title, rating);
    }
  }

  static async getSongRatings(songId) {
    if (DatabaseConfig.isPostgreSQL()) {
      const query = `
        SELECT
          COUNT(CASE WHEN rating = 1 THEN 1 END) as likes,
          COUNT(CASE WHEN rating = -1 THEN 1 END) as dislikes
        FROM song_ratings
        WHERE song_id = $1 AND rating != 0
      `;
      const result = await postgresDb.query(query, [songId]);
      return result.rows[0];
    } else {
      return sqliteDb.getSongRatings(songId);
    }
  }

  static async getUserSongRating(songId, userIdentifier) {
    if (DatabaseConfig.isPostgreSQL()) {
      const query = `
        SELECT rating
        FROM song_ratings
        WHERE song_id = $1 AND user_identifier = $2
      `;
      const result = await postgresDb.query(query, [songId, userIdentifier]);
      return result.rows[0];
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.db.get(
          'SELECT rating FROM song_ratings WHERE song_id = ? AND user_identifier = ?',
          [songId, userIdentifier],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
    }
  }

  // Transaction support
  static async transaction(callback) {
    if (DatabaseConfig.isPostgreSQL()) {
      return postgresDb.transaction(callback);
    } else {
      // SQLite transaction support
      return new Promise((resolve, reject) => {
        sqliteDb.db.serialize(() => {
          sqliteDb.db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);

            Promise.resolve(callback(sqliteDb.db))
              .then((result) => {
                sqliteDb.db.run('COMMIT', (err) => {
                  if (err) reject(err);
                  else resolve(result);
                });
              })
              .catch((error) => {
                sqliteDb.db.run('ROLLBACK', () => {
                  reject(error);
                });
              });
          });
        });
      });
    }
  }

  // Get database type
  static getDatabaseType() {
    return DatabaseConfig.getDatabaseType();
  }

  static isPostgreSQL() {
    return DatabaseConfig.isPostgreSQL();
  }

  static isSQLite() {
    return DatabaseConfig.isSQLite();
  }
}

module.exports = Database;