# RadioCalico Docker Makefile
.PHONY: help build dev prod test clean logs shell stop restart
.PHONY: test-all test-backend test-frontend test-watch test-coverage test-verbose

# Default target
help:
	@echo "RadioCalico Docker Commands:"
	@echo ""
	@echo "  make build    - Build production Docker image"
	@echo "  make dev      - Start development environment with hot-reload"
	@echo "  make prod     - Start production environment"
	@echo "  make test     - Run tests in Docker container"
	@echo "  make clean    - Stop containers and remove images"
	@echo "  make logs     - Show container logs"
	@echo "  make shell    - Open shell in running container"
	@echo "  make stop     - Stop all containers"
	@echo "  make restart  - Restart all containers"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev-build  - Rebuild development image"
	@echo "  make dev-logs   - Show development logs"
	@echo "  make dev-shell  - Open shell in dev container"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod-build - Rebuild production image"
	@echo "  make prod-logs  - Show production logs"
	@echo "  make prod-shell - Open shell in prod container"
	@echo ""
	@echo "Test Commands (Local):"
	@echo "  make test-all      - Run all tests (backend + frontend)"
	@echo "  make test-backend  - Run backend tests only"
	@echo "  make test-frontend - Run frontend tests only"
	@echo "  make test-watch    - Run tests in watch mode"
	@echo "  make test-coverage - Generate test coverage report"
	@echo "  make test-verbose  - Run tests with verbose output"
	@echo ""
	@echo "Test Commands (Docker):"
	@echo "  make test-docker         - Run all tests in Docker"
	@echo "  make test-docker-backend - Run backend tests in Docker"
	@echo "  make test-docker-frontend- Run frontend tests in Docker"
	@echo "  make test-docker-coverage- Generate coverage report in Docker"
	@echo ""
	@echo "PostgreSQL Commands:"
	@echo "  make postgres      - Start PostgreSQL environment"
	@echo "  make postgres-up   - Start PostgreSQL in background"
	@echo "  make postgres-down - Stop PostgreSQL environment"
	@echo "  make postgres-logs - Show PostgreSQL logs"
	@echo "  make postgres-shell - Open PostgreSQL shell"
	@echo "  make migrate       - Run database migration from SQLite to PostgreSQL"
	@echo "  make pgadmin       - Start pgAdmin interface (port 5050)"

# Build production image
build:
	docker build -t radiocalico:latest .

# Start development environment
dev:
	docker-compose -f docker-compose.dev.yml up

# Start development environment in background
dev-up:
	docker-compose -f docker-compose.dev.yml up -d

# Rebuild development image
dev-build:
	docker-compose -f docker-compose.dev.yml build --no-cache

# Show development logs
dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Open shell in development container
dev-shell:
	docker exec -it radiocalico-dev sh

# Stop development environment
dev-down:
	docker-compose -f docker-compose.dev.yml down

# Start production environment
prod:
	docker-compose up -d

# Rebuild production image
prod-build:
	docker-compose build --no-cache

# Show production logs
prod-logs:
	docker-compose logs -f

# Open shell in production container
prod-shell:
	docker exec -it radiocalico-app sh

# Stop production environment
prod-down:
	docker-compose down

# Run tests in container
test:
	docker run --rm -v $(PWD):/app radiocalico:latest npm test

# Run tests in development container
test-dev:
	docker exec radiocalico-dev npm test

# =================== Local Test Commands ===================
# Run all tests locally (backend + frontend)
test-all:
	npm test

# Run backend tests only
test-backend:
	npm run test:backend

# Run frontend tests only
test-frontend:
	npm run test:frontend

# Run tests in watch mode for development
test-watch:
	npm run test:watch

# Generate test coverage report
test-coverage:
	npm run test:coverage

# Run tests with verbose output
test-verbose:
	npm run test:verbose

# =================== Docker Test Commands ===================
# Run all tests in Docker container
test-docker:
	docker run --rm -v $(PWD):/app -w /app node:20-alpine npm test

# Run backend tests in Docker
test-docker-backend:
	docker run --rm -v $(PWD):/app -w /app node:20-alpine npm run test:backend

# Run frontend tests in Docker
test-docker-frontend:
	docker run --rm -v $(PWD):/app -w /app node:20-alpine npm run test:frontend

# Generate coverage report in Docker
test-docker-coverage:
	docker run --rm -v $(PWD):/app -w /app node:20-alpine npm run test:coverage

# Run tests in watch mode in Docker (useful for CI/CD)
test-docker-watch:
	docker run --rm -it -v $(PWD):/app -w /app node:20-alpine npm run test:watch

# Clean up containers and images
clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose down -v
	docker rmi radiocalico:latest radiocalico:dev || true

# Show logs
logs:
	docker-compose logs -f

# Open shell in running container
shell:
	docker exec -it radiocalico-app sh

# Stop all containers
stop:
	docker-compose -f docker-compose.dev.yml stop
	docker-compose stop

# Restart all containers
restart:
	docker-compose -f docker-compose.dev.yml restart
	docker-compose restart

# Prune Docker system
prune:
	docker system prune -af --volumes

# Check container health
health:
	@echo "Checking container health..."
	@command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 || { echo "curl or wget required but not installed"; exit 1; }
	@if command -v curl >/dev/null 2>&1; then \
		curl -f http://localhost:3000/api/health || echo "Health check failed"; \
	else \
		wget -q -O- http://localhost:3000/api/health || echo "Health check failed"; \
	fi

# Database backup
backup-db:
	@echo "Backing up database..."
	docker run --rm -v radiocalico_database:/data -v $(PWD):/backup alpine \
		tar czf /backup/database-backup-$$(date +%Y%m%d-%H%M%S).tar.gz /data

# Database restore (usage: make restore-db FILE=database-backup-20240101-120000.tar.gz)
restore-db:
	@echo "Restoring database from $(FILE)..."
	docker run --rm -v radiocalico_database:/data -v $(PWD):/backup alpine \
		tar xzf /backup/$(FILE) -C /

# PostgreSQL Commands
postgres:
	docker-compose -f docker-compose.postgres.yml up

postgres-up:
	docker-compose -f docker-compose.postgres.yml up -d

postgres-down:
	docker-compose -f docker-compose.postgres.yml down

postgres-logs:
	docker-compose -f docker-compose.postgres.yml logs -f

postgres-shell:
	docker exec -it radiocalico-postgres psql -U radiocalico -d radiocalico

postgres-build:
	docker-compose -f docker-compose.postgres.yml build --no-cache

pgadmin:
	docker-compose -f docker-compose.postgres.yml --profile tools up pgadmin

# Database migration from SQLite to PostgreSQL
migrate:
	@echo "Running database migration from SQLite to PostgreSQL..."
	node scripts/migrate-to-postgres.js

# Setup PostgreSQL locally (without Docker)
setup-postgres:
	./scripts/setup-postgres.sh