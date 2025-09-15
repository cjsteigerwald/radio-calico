-- RadioCalico Database Schema
-- This file contains the initial database structure for RadioCalico
-- Run this file to create a new database: sqlite3 radiocalico.db < schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Song ratings table
CREATE TABLE IF NOT EXISTS song_ratings (
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id ON song_ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_song_ratings_user ON song_ratings(user_identifier);
CREATE INDEX IF NOT EXISTS idx_song_ratings_created ON song_ratings(created_at);

-- Create views for common queries
CREATE VIEW IF NOT EXISTS song_rating_summary AS
SELECT
    song_id,
    artist,
    title,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as likes,
    COUNT(CASE WHEN rating = -1 THEN 1 END) as dislikes,
    COUNT(DISTINCT user_identifier) as total_ratings
FROM song_ratings
WHERE rating != 0
GROUP BY song_id, artist, title;