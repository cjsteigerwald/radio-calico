# RadioCalico Docker Makefile
.PHONY: help build dev prod test clean logs shell stop restart

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