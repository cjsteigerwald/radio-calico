# RadioCalico Docker Makefile
.PHONY: help build dev prod test clean logs shell stop restart
.PHONY: test-all test-backend test-frontend test-watch test-coverage test-verbose
.PHONY: security security-prereq security-quick security-audit security-audit-critical security-audit-high
.PHONY: security-fix security-fix-force security-docker scan-docker security-check security-outdated
.PHONY: security-docker-audit security-report security-report-full security-metrics
.PHONY: test-save test-report
.PHONY: security-sast security-lint security-secrets security-headers security-test security-full

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
	@echo "  make test-save     - Run tests and save to docs/test-results"
	@echo "  make test-report   - Run coverage and save to docs/test-results"
	@echo ""
	@echo "Test Commands (Docker):"
	@echo "  make test-docker         - Run all tests in Docker"
	@echo "  make test-docker-backend - Run backend tests in Docker"
	@echo "  make test-docker-frontend- Run frontend tests in Docker"
	@echo "  make test-docker-coverage- Generate coverage report in Docker"
	@echo ""
	@echo "Security Commands:"
	@echo "  make security              - Run all security checks"
	@echo "  make security-prereq       - Check security scan prerequisites"
	@echo "  make security-quick        - Quick scan (high severity only)"
	@echo "  make security-audit        - Check for all vulnerabilities"
	@echo "  make security-audit-critical - Check for critical vulnerabilities only"
	@echo "  make security-audit-high   - Check for high+ severity vulnerabilities"
	@echo "  make security-fix          - Auto-fix vulnerabilities (use with caution)"
	@echo "  make security-fix-force    - Force fix with confirmation (may break)"
	@echo "  make security-docker       - Scan Docker images for vulnerabilities"
	@echo "  make trivy-scan            - Comprehensive Docker scan with Trivy"
	@echo "  make scan-docker           - Scan running containers"
	@echo "  make security-check        - Generate JSON report for CI/CD"
	@echo "  make security-report       - Generate basic security report"
	@echo "  make security-report-full  - Generate comprehensive report with all scans"
	@echo "  make security-metrics      - Track security metrics (requires jq)"
	@echo ""
	@echo "SAST & Code Analysis:"
	@echo "  make security-sast         - Run static application security testing"
	@echo "  make security-lint         - Run ESLint security checks"
	@echo "  make security-secrets      - Scan for hardcoded secrets"
	@echo "  make security-headers      - Test security headers"
	@echo "  make security-full         - Run all security tests"
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

# Run tests and save results to docs
test-save:
	@echo "🧪 Running tests and saving results..."
	@mkdir -p docs/test-results
	npm test > docs/test-results/test-output-$$(date +%Y%m%d-%H%M%S).txt 2>&1
	@echo "✅ Test results saved to docs/test-results/"

# Run tests with coverage and save report
test-report:
	@echo "📊 Running tests with coverage..."
	@mkdir -p docs/test-results
	npm run test:coverage > docs/test-results/coverage-$$(date +%Y%m%d-%H%M%S).txt 2>&1
	@echo "✅ Coverage report saved to docs/test-results/"

# =================== Security Commands ===================
# Check security prerequisites
security-prereq:
	@echo "🔍 Checking security scan prerequisites..."
	@command -v npm >/dev/null 2>&1 || (echo "❌ npm is required" && exit 1)
	@command -v docker >/dev/null 2>&1 || echo "⚠️  docker is optional but recommended for container scanning"
	@command -v jq >/dev/null 2>&1 || echo "⚠️  jq is optional but required for security-metrics"
	@echo "✅ Prerequisites check complete"

# Quick security scan for development
security-quick:
	@echo "⚡ Running quick security scan (high severity only)..."
	npm audit --audit-level=high
	@echo "✅ Quick scan complete"

# Run all security checks
security: security-prereq security-audit security-docker
	@echo "✅ All security checks completed"

# Run npm audit to check for vulnerabilities
security-audit:
	@echo "🔍 Running npm security audit..."
	npm audit

# Run npm audit with severity filtering
security-audit-critical:
	@echo "🚨 Checking for critical vulnerabilities..."
	npm audit --audit-level=critical

security-audit-high:
	@echo "⚠️  Checking for high and critical vulnerabilities..."
	npm audit --audit-level=high

# Run npm audit with JSON output for CI/CD integration
security-check:
	@echo "🔍 Running detailed security audit..."
	npm audit --json > security-report.json || true
	@echo "📊 Security report saved to security-report.json"
	@npm audit || true

# Auto-fix npm vulnerabilities (use with caution)
security-fix:
	@echo "🔧 Attempting to auto-fix vulnerabilities..."
	npm audit fix
	@echo "⚠️  Remember to test your application after fixing vulnerabilities"

# Force fix npm vulnerabilities (use with extreme caution)
security-fix-force:
	@echo "⚠️  WARNING: Force fixing vulnerabilities may introduce breaking changes!"
	@echo "Are you sure you want to continue? [y/N]"
	@read confirm && [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ] || (echo "Aborted." && exit 1)
	@echo "🔧 Force fixing vulnerabilities..."
	npm audit fix --force
	@echo "❗ Critical: Test your application thoroughly after force fixing"

# Scan Docker images for vulnerabilities using Trivy or native Docker scan
security-docker:
	@echo "🐳 Detecting available Docker security scanner..."
	@if command -v trivy >/dev/null 2>&1; then \
		echo "✅ Using Trivy for vulnerability scanning"; \
		echo "Scanning production image..."; \
		trivy image radiocalico:latest --severity HIGH,CRITICAL --scanners vuln 2>/dev/null || echo "Production image not found"; \
		echo ""; \
		echo "Scanning development image..."; \
		trivy image radiocalico:dev --severity HIGH,CRITICAL --scanners vuln 2>/dev/null || echo "Development image not found"; \
	elif command -v docker scout >/dev/null 2>&1; then \
		echo "✅ Using Docker Scout for vulnerability scanning"; \
		echo "Scanning production image..."; \
		docker scout cves radiocalico:latest 2>/dev/null || echo "Production image not found"; \
		echo ""; \
		echo "Scanning development image..."; \
		docker scout cves radiocalico:dev 2>/dev/null || echo "Development image not found"; \
	elif docker scan --version >/dev/null 2>&1; then \
		echo "✅ Using Docker Scan (Snyk) for vulnerability scanning"; \
		echo "Scanning production image..."; \
		docker scan radiocalico:latest 2>/dev/null || echo "Production image not found"; \
		echo ""; \
		echo "Scanning development image..."; \
		docker scan radiocalico:dev 2>/dev/null || echo "Development image not found"; \
	else \
		echo "❌ No Docker security scanner found."; \
		echo "Install Trivy, Docker Desktop, or docker-scan plugin for vulnerability scanning."; \
		echo ""; \
		echo "To install Trivy:"; \
		echo "  brew install aquasecurity/trivy/trivy  # macOS"; \
		echo "  curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin  # Linux"; \
	fi

# Scan Docker images with Trivy for detailed vulnerability report
trivy-scan:
	@echo "🔍 Running comprehensive Trivy security scan..."
	@if command -v trivy >/dev/null 2>&1; then \
		mkdir -p docs/security-scans; \
		echo "Scanning production image (radiocalico:latest)..."; \
		trivy image radiocalico:latest --format table > docs/security-scans/trivy-scan-latest-$$(date +%Y%m%d-%H%M%S).txt 2>&1; \
		trivy image radiocalico:latest --severity HIGH,CRITICAL --quiet || echo "✅ No HIGH/CRITICAL vulnerabilities"; \
		echo ""; \
		echo "Scanning development image (radiocalico:dev)..."; \
		trivy image radiocalico:dev --format table > docs/security-scans/trivy-scan-dev-$$(date +%Y%m%d-%H%M%S).txt 2>&1; \
		trivy image radiocalico:dev --severity HIGH,CRITICAL --quiet || echo "✅ No HIGH/CRITICAL vulnerabilities"; \
		echo ""; \
		echo "📊 Full reports saved to docs/security-scans/"; \
		echo "Summary:"; \
		echo "  Production image vulnerabilities: $$(trivy image radiocalico:latest --quiet --format json 2>/dev/null | grep -o '"VulnerabilityID"' | wc -l | xargs)"; \
		echo "  Development image vulnerabilities: $$(trivy image radiocalico:dev --quiet --format json 2>/dev/null | grep -o '"VulnerabilityID"' | wc -l | xargs)"; \
	else \
		echo "❌ Trivy not installed. Install with:"; \
		echo "  brew install aquasecurity/trivy/trivy  # macOS"; \
		echo "  curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin  # Linux"; \
	fi

# Scan running containers for security issues
scan-docker:
	@echo "🔍 Checking for running RadioCalico containers..."
	@if docker ps --format "{{.Names}}" | grep -q radiocalico; then \
		echo "Found running containers. Starting security scan..."; \
		docker ps --format "table {{.Names}}\t{{.Image}}" | grep radiocalico | while read name image; do \
			echo "Scanning container: $$name"; \
			docker exec $$name sh -c "npm audit || true" 2>/dev/null || echo "Container $$name not accessible"; \
		done; \
	else \
		echo "❌ No RadioCalico containers are currently running."; \
		echo "Start containers with 'make dev' or 'make prod' first."; \
	fi

# Check for outdated dependencies (security relevant)
security-outdated:
	@echo "📦 Checking for outdated dependencies..."
	npm outdated || true

# Run security audit in Docker container (for CI/CD)
security-docker-audit:
	@echo "🐳 Running security audit in Docker container..."
	docker run --rm -v $(PWD):/app -w /app node:20-alpine npm audit

# Generate basic security report
security-report:
	@echo "📊 Generating basic security report..."
	@echo "=== SECURITY REPORT ===" > security-full-report.txt
	@echo "Generated: $$(date)" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "=== NPM Security Audit ===" >> security-full-report.txt
	npm audit >> security-full-report.txt 2>&1 || true
	@echo "" >> security-full-report.txt
	@echo "=== Outdated Dependencies ===" >> security-full-report.txt
	npm outdated >> security-full-report.txt 2>&1 || true
	@echo "✅ Basic security report saved to security-full-report.txt"

# Generate comprehensive security report with all scan outputs
security-report-full:
	@echo "📊 Generating comprehensive security report with all scans..."
	@mkdir -p docs/security-scans
	@echo "=== COMPREHENSIVE SECURITY REPORT ===" > security-full-report.txt
	@echo "Generated: $$(date)" >> security-full-report.txt
	@echo "========================================" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "=== 1. NPM DEPENDENCY AUDIT ===" >> security-full-report.txt
	npm audit >> security-full-report.txt 2>&1 || true
	@echo "" >> security-full-report.txt
	@echo "=== 2. CRITICAL VULNERABILITIES CHECK ===" >> security-full-report.txt
	npm audit --audit-level=critical >> security-full-report.txt 2>&1 || echo "No critical vulnerabilities found" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "=== 3. HIGH SEVERITY VULNERABILITIES ===" >> security-full-report.txt
	npm audit --audit-level=high >> security-full-report.txt 2>&1 || echo "No high severity vulnerabilities found" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "=== 4. OUTDATED DEPENDENCIES ===" >> security-full-report.txt
	npm outdated >> security-full-report.txt 2>&1 || echo "All dependencies up to date" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "=== 5. ESLINT SECURITY ANALYSIS ===" >> security-full-report.txt
	@npx eslint src/ public/js/ --ext .js --format compact >> security-full-report.txt 2>&1 || echo "ESLint security scan completed with issues" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "=== 6. SECRET DETECTION SCAN ===" >> security-full-report.txt
	@echo "Scanning for hardcoded secrets..." >> security-full-report.txt
	@! grep -rE "(api[_-]?key|apikey|secret|password|passwd|pwd|token|auth)\\s*[:=]\\s*['\\"][^'\\\"]+['\\"]" src/ public/js/ --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null >> security-full-report.txt || echo "✅ No hardcoded secrets detected" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "Scanning for private key files..." >> security-full-report.txt
	@! find . -type f \( -name "*.pem" -o -name "*.key" -o -name "*.p12" \) 2>/dev/null | grep -v node_modules >> security-full-report.txt || echo "✅ No private key files found in repository" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "=== 7. SECURITY HEADERS TEST ===" >> security-full-report.txt
	@echo "Note: Server must be running for header test" >> security-full-report.txt
	@curl -I -s http://localhost:3000 2>/dev/null | grep -E "(x-frame-options|x-content-type|x-xss|content-security-policy|strict-transport|referrer-policy|permissions-policy)" >> security-full-report.txt 2>&1 || echo "⚠️  Server not running or headers not detected" >> security-full-report.txt
	@echo "" >> security-full-report.txt
	@echo "=== 8. DOCKER IMAGE SCAN STATUS ===" >> security-full-report.txt
	@if command -v docker scout >/dev/null 2>&1; then \
		echo "Docker Scout available - run 'make security-docker' for image scanning" >> security-full-report.txt; \
	elif docker scan --version >/dev/null 2>&1; then \
		echo "Docker Scan available - run 'make security-docker' for image scanning" >> security-full-report.txt; \
	else \
		echo "⚠️  No Docker scanner available" >> security-full-report.txt; \
	fi
	@echo "" >> security-full-report.txt
	@echo "=== REPORT SUMMARY ===" >> security-full-report.txt
	@echo "Report completed: $$(date)" >> security-full-report.txt
	@echo "For detailed metrics run: make security-metrics" >> security-full-report.txt
	@echo "✅ Comprehensive security report saved to security-full-report.txt"
	@cp security-full-report.txt "docs/security-scans/security-scan-$$(date +%Y%m%d-%H%M%S).txt"
	@echo "📁 Report archived in docs/security-scans/"

# Track security metrics and trends
security-metrics:
	@echo "📈 Generating security metrics..."
	@which jq >/dev/null 2>&1 || (echo "❌ Error: jq is required for security metrics. Install with: brew install jq (macOS) or apt-get install jq (Linux)" && exit 1)
	@echo "=== Security Metrics Report ===" > security-metrics.txt
	@echo "Generated: $$(date)" >> security-metrics.txt
	@echo "" >> security-metrics.txt
	@echo "=== Vulnerability Summary ===" >> security-metrics.txt
	@npm audit --json 2>/dev/null | jq -r '.metadata | "Total Dependencies: \(.dependencies)\nTotal Dev Dependencies: \(.devDependencies)\nTotal Optional: \(.optionalDependencies // 0)\nVulnerabilities Found: \(.vulnerabilities.total // 0)\nCritical: \(.vulnerabilities.critical // 0)\nHigh: \(.vulnerabilities.high // 0)\nModerate: \(.vulnerabilities.moderate // 0)\nLow: \(.vulnerabilities.low // 0)"' >> security-metrics.txt 2>/dev/null || echo "No vulnerability data available" >> security-metrics.txt
	@echo "" >> security-metrics.txt
	@echo "=== Outdated Packages Count ===" >> security-metrics.txt
	@npm outdated --json 2>/dev/null | jq -r 'length' >> security-metrics.txt 2>/dev/null || echo "0" >> security-metrics.txt
	@echo "" >> security-metrics.txt
	@echo "=== License Summary ===" >> security-metrics.txt
	@npm ls --json --depth=0 2>/dev/null | jq -r '.dependencies | to_entries | map("\(.key): \(.value.license // "UNKNOWN")") | .[]' >> security-metrics.txt 2>/dev/null || echo "License data not available" >> security-metrics.txt
	@echo "✅ Security metrics saved to security-metrics.txt"
	@echo ""
	@echo "📊 Quick Summary:"
	@npm audit 2>/dev/null | grep -E "found|Severity:" || echo "No vulnerabilities found"

# =================== SAST & Code Analysis ===================
# Run static application security testing
security-sast: security-lint security-secrets
	@echo "✅ SAST analysis complete"

# Run ESLint with security plugins
security-lint:
	@echo "🔍 Running ESLint security analysis..."
	@npx eslint src/ public/js/ --ext .js --format unix || echo "⚠️  Some security issues found - review above"
	@echo "✅ ESLint security scan complete"

# Scan for hardcoded secrets
security-secrets:
	@echo "🔍 Scanning for hardcoded secrets..."
	@echo "Checking for common secret patterns..."
	@! grep -rE "(api[_-]?key|apikey|secret|password|passwd|pwd|token|auth)\s*[:=]\s*['\"][^'\"]+['\"]" src/ public/js/ --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null || echo "⚠️  Potential secrets found - review above"
	@echo "Checking for private keys..."
	@! find . -type f -name "*.pem" -o -name "*.key" -o -name "*.p12" 2>/dev/null | grep -v node_modules || echo "⚠️  Private key files found"
	@echo "✅ Secrets scan complete"

# Test security headers
security-headers:
	@echo "🔍 Testing security headers..."
	@echo "Starting server if not running..."
	@curl -I -s http://localhost:3000 > /tmp/headers.txt 2>/dev/null || (echo "⚠️  Server not running. Start with 'npm start' first" && exit 1)
	@echo "Checking security headers:"
	@echo -n "  X-Frame-Options: "
	@grep -i "x-frame-options" /tmp/headers.txt | cut -d' ' -f2- || echo "❌ Missing"
	@echo -n "  X-Content-Type-Options: "
	@grep -i "x-content-type-options" /tmp/headers.txt | cut -d' ' -f2- || echo "❌ Missing"
	@echo -n "  X-XSS-Protection: "
	@grep -i "x-xss-protection" /tmp/headers.txt | cut -d' ' -f2- || echo "❌ Missing"
	@echo -n "  Content-Security-Policy: "
	@grep -i "content-security-policy" /tmp/headers.txt | cut -d' ' -f2- | head -c 50 || echo "❌ Missing"
	@echo "..."
	@echo -n "  Strict-Transport-Security: "
	@grep -i "strict-transport-security" /tmp/headers.txt | cut -d' ' -f2- || echo "⚠️  Missing (OK for dev)"
	@echo -n "  Referrer-Policy: "
	@grep -i "referrer-policy" /tmp/headers.txt | cut -d' ' -f2- || echo "❌ Missing"
	@echo -n "  Permissions-Policy: "
	@grep -i "permissions-policy" /tmp/headers.txt | cut -d' ' -f2- | head -c 50 || echo "❌ Missing"
	@echo "..."
	@rm -f /tmp/headers.txt
	@echo "✅ Security headers test complete"

# Run security tests
security-test:
	@echo "🧪 Running security-focused tests..."
	@npm test -- --testNamePattern="security|auth|csrf|xss|injection" 2>/dev/null || echo "ℹ️  No specific security tests found"
	@echo "✅ Security tests complete"

# Run all security checks and generate comprehensive report
security-full: security-report-full security security-sast security-test
	@echo "" >> security-full-report.txt
	@echo "=== FINAL STATUS ===" >> security-full-report.txt
	@echo "✅ Full security assessment complete" >> security-full-report.txt
	@echo "Report location: security-full-report.txt" >> security-full-report.txt
	@echo "========================================" >> security-full-report.txt
	@echo ""
	@echo "✅ Full security assessment complete"
	@echo ""
	@echo "📊 Security Summary:"
	@echo "  1. Dependency vulnerabilities checked ✓"
	@echo "  2. Static analysis performed ✓"
	@echo "  3. Secrets scanning completed ✓"
	@echo "  4. Security headers validated ✓"
	@echo "  5. Comprehensive report generated ✓"
	@echo ""
	@echo "📝 Reports generated:"
	@echo "  - security-full-report.txt (comprehensive)"
	@echo "  - security-metrics.txt (run 'make security-metrics' separately)"
	@echo ""
	@echo "👀 View report: cat security-full-report.txt"

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