-- PostgreSQL schema creation for RadioCalico
-- Migration: 001-create-schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_metadata ON users USING gin(metadata);

-- Add comments
COMMENT ON TABLE users IS 'User accounts for RadioCalico';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.preferences IS 'User preferences in JSON format';
COMMENT ON COLUMN users.metadata IS 'Additional metadata for analytics';

-- Create song_ratings table
CREATE TABLE IF NOT EXISTS song_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    UNIQUE(song_id, user_identifier)
);

-- Create indexes for song_ratings
CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id ON song_ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_song_ratings_user_identifier ON song_ratings(user_identifier);
CREATE INDEX IF NOT EXISTS idx_song_ratings_created_at ON song_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_song_ratings_rating ON song_ratings(rating) WHERE rating != 0;
CREATE INDEX IF NOT EXISTS idx_song_ratings_artist_title ON song_ratings(artist, title);
CREATE INDEX IF NOT EXISTS idx_song_ratings_metadata ON song_ratings USING gin(metadata);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_song_ratings_updated_at
    BEFORE UPDATE ON song_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS song_statistics AS
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_song_statistics_song_id ON song_statistics(song_id);
CREATE INDEX IF NOT EXISTS idx_song_statistics_average_rating ON song_statistics(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_song_statistics_total_plays ON song_statistics(total_plays DESC);
CREATE INDEX IF NOT EXISTS idx_song_statistics_last_played ON song_statistics(last_played DESC);

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_song_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY song_statistics;
END;
$$ LANGUAGE plpgsql;