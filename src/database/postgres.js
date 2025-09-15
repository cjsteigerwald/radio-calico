// PostgreSQL database connection module
const { Pool } = require('pg');
const DatabaseConfig = require('../config/database');

let pool = null;

// Initialize PostgreSQL connection pool
function initializePool() {
  if (!pool && DatabaseConfig.isPostgreSQL()) {
    const config = DatabaseConfig.getPostgreSQLOptions();

    pool = new Pool(config);

    // Connection pool error handling
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    pool.on('connect', () => {
      console.log('PostgreSQL pool: client connected');
    });

    pool.on('acquire', () => {
      console.log('PostgreSQL pool: client acquired');
    });

    pool.on('remove', () => {
      console.log('PostgreSQL pool: client removed');
    });
  }

  return pool;
}

// Get a client from the pool
async function getClient() {
  const pool = initializePool();
  if (!pool) {
    throw new Error('PostgreSQL is not configured');
  }
  return pool.connect();
}

// Execute a query
async function query(text, params) {
  const pool = initializePool();
  if (!pool) {
    throw new Error('PostgreSQL is not configured');
  }
  return pool.query(text, params);
}

// Check database connection
async function checkConnection() {
  try {
    const pool = initializePool();
    if (!pool) {
      return { connected: false, error: 'PostgreSQL is not configured' };
    }

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return { connected: true };
  } catch (error) {
    console.error('PostgreSQL connection check failed:', error);
    return { connected: false, error: error.message };
  }
}

// Close the pool
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('PostgreSQL connection pool closed');
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Create tables if they don't exist (for PostgreSQL)
async function createTablesIfNotExist() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}'::jsonb
    )
  `;

  const createSongRatingsTable = `
    CREATE TABLE IF NOT EXISTS song_ratings (
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
    )
  `;

  const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id ON song_ratings(song_id)',
    'CREATE INDEX IF NOT EXISTS idx_song_ratings_user ON song_ratings(user_identifier)',
    'CREATE INDEX IF NOT EXISTS idx_song_ratings_created_at ON song_ratings(created_at)'
  ];

  try {
    await query(createUsersTable);
    await query(createSongRatingsTable);

    for (const indexQuery of createIndexes) {
      await query(indexQuery);
    }

    console.log('PostgreSQL tables and indexes created successfully');
  } catch (error) {
    console.error('Error creating PostgreSQL tables:', error);
    throw error;
  }
}

module.exports = {
  initializePool,
  getClient,
  query,
  checkConnection,
  closePool,
  transaction,
  createTablesIfNotExist
};