const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.env.DATABASE_FILE || './database/radiocalico.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database:', dbPath);
  }
});

const initialize = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
          return;
        }
      });

      // Create song_ratings table
      db.run(`
        CREATE TABLE IF NOT EXISTS song_ratings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          song_id TEXT NOT NULL,
          artist TEXT NOT NULL,
          title TEXT NOT NULL,
          user_identifier TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK (rating IN (1, -1)),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(song_id, user_identifier)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating song_ratings table:', err);
          reject(err);
          return;
        }
      });

      // Create index for faster queries
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id 
        ON song_ratings(song_id)
      `, (err) => {
        if (err) {
          console.error('Error creating index:', err);
          reject(err);
        } else {
          console.log('Database tables initialized');
          resolve();
        }
      });
    });
  });
};

const testConnection = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT datetime('now') as now", (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const createUser = (username, email) => {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO users (username, email) VALUES (?, ?)';
    db.run(query, [username, email], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
};

const getAllUsers = () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT id, username, email, created_at FROM users ORDER BY created_at DESC';
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Rate a song (thumbs up = 1, thumbs down = -1)
const rateSong = (songId, artist, title, userIdentifier, rating) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT OR REPLACE INTO song_ratings (song_id, artist, title, user_identifier, rating, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    db.run(query, [songId, artist, title, userIdentifier, rating], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, songId, rating });
      }
    });
  });
};

// Get rating counts for a song
const getSongRatings = (songId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        COUNT(CASE WHEN rating = 1 THEN 1 END) as thumbs_up,
        COUNT(CASE WHEN rating = -1 THEN 1 END) as thumbs_down
      FROM song_ratings
      WHERE song_id = ?
    `;
    db.get(query, [songId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          thumbs_up: row.thumbs_up || 0,
          thumbs_down: row.thumbs_down || 0
        });
      }
    });
  });
};

// Get user's rating for a song
const getUserSongRating = (songId, userIdentifier) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT rating FROM song_ratings WHERE song_id = ? AND user_identifier = ?';
    db.get(query, [songId, userIdentifier], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.rating : null);
      }
    });
  });
};

// Remove a user's rating for a song
const removeSongRating = (songId, userIdentifier) => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM song_ratings WHERE song_id = ? AND user_identifier = ?';
    db.run(query, [songId, userIdentifier], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

module.exports = {
  db,
  initialize,
  testConnection,
  createUser,
  getAllUsers,
  rateSong,
  getSongRatings,
  getUserSongRating,
  removeSongRating
};