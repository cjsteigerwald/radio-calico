#!/bin/bash

# PostgreSQL Setup Script for RadioCalico
# This script sets up PostgreSQL database and user for RadioCalico

set -e

# Configuration
DB_NAME="${PG_DATABASE:-radiocalico}"
DB_USER="${PG_USER:-radiocalico}"
DB_PASSWORD="${PG_PASSWORD:-radiocalico_password}"
DB_HOST="${PG_HOST:-localhost}"
DB_PORT="${PG_PORT:-5432}"

echo "======================================"
echo "RadioCalico PostgreSQL Setup"
echo "======================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Check if we can connect to PostgreSQL
echo "Checking PostgreSQL connection..."
if ! psql -h $DB_HOST -p $DB_PORT -U postgres -c "SELECT 1" &> /dev/null; then
    echo "Cannot connect to PostgreSQL. Make sure PostgreSQL is running."
    echo "You may need to run this script with sudo or as the postgres user."
    exit 1
fi

echo "Connected to PostgreSQL successfully."

# Create user if it doesn't exist
echo "Creating user '$DB_USER'..."
psql -h $DB_HOST -p $DB_PORT -U postgres <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;
EOF

echo "User '$DB_USER' ready."

# Create database if it doesn't exist
echo "Creating database '$DB_NAME'..."
psql -h $DB_HOST -p $DB_PORT -U postgres <<EOF
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
EOF

echo "Database '$DB_NAME' ready."

# Grant privileges
echo "Granting privileges..."
psql -h $DB_HOST -p $DB_PORT -U postgres <<EOF
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF

# Create test database for testing
echo "Creating test database..."
psql -h $DB_HOST -p $DB_PORT -U postgres <<EOF
SELECT 'CREATE DATABASE ${DB_NAME}_test OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}_test')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME}_test TO $DB_USER;
EOF

echo "Test database '${DB_NAME}_test' ready."

# Run schema creation
echo "Creating schema..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < migrations/001-create-schema.sql

echo ""
echo "======================================"
echo "PostgreSQL Setup Complete!"
echo "======================================"
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo ""
echo "To test the connection:"
echo "PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo ""
echo "To use PostgreSQL with RadioCalico:"
echo "1. Copy .env.postgres to .env"
echo "2. Update PG_PASSWORD in .env if needed"
echo "3. Run: npm start"