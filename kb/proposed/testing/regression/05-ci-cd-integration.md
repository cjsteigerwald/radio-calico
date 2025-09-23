# CI/CD Integration for Regression Testing

## Overview

This document outlines the continuous integration and deployment pipeline configuration for automated regression testing in RadioCalico, ensuring quality gates are enforced at every stage of development.

## Pipeline Architecture

### Pipeline Stages Overview

```mermaid
graph LR
    A[Commit] --> B[Pre-commit Hooks]
    B --> C[CI Build]
    C --> D[Unit Tests]
    D --> E[Integration Tests]
    E --> F[E2E Tests]
    F --> G[Security Scan]
    G --> H[Coverage Check]
    H --> I[Deploy to Staging]
    I --> J[Smoke Tests]
    J --> K[Deploy to Production]
    K --> L[Production Monitoring]
```

## GitHub Actions Configuration

### Main Workflow

```yaml
# .github/workflows/regression-tests.yml
name: Regression Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Nightly regression run

env:
  NODE_VERSION: '18.x'
  POSTGRES_VERSION: '15'

jobs:
  # Job 1: Lint and Type Check
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Type checking
        run: npm run type-check

  # Job 2: Unit Tests
  unit-tests:
    runs-on: ubuntu-latest
    needs: code-quality
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unit-tests
          name: unit-coverage-${{ matrix.node-version }}

  # Job 3: Integration Tests
  integration-tests:
    runs-on: ubuntu-latest
    needs: code-quality
    services:
      postgres:
        image: postgres:${{ env.POSTGRES_VERSION }}
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: radiocalico_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: |
          npm run db:migrate:test
          npm run db:seed:test

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/radiocalico_test
        run: npm run test:integration -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: integration-tests

  # Job 4: E2E Tests
  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          npx playwright install --with-deps ${{ matrix.browser }}

      - name: Start application
        run: |
          npm run build
          npm start &
          npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e -- --project=${{ matrix.browser }}

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-failures-${{ matrix.browser }}
          path: |
            test-results/
            playwright-report/

  # Job 5: Performance Tests
  performance-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun

      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci/

  # Job 6: Security Scanning
  security-scan:
    runs-on: ubuntu-latest
    needs: code-quality
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'RadioCalico'
          path: '.'
          format: 'HTML'

      - name: Upload security reports
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: reports/

  # Job 7: Coverage Analysis
  coverage-check:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v3

      - name: Download coverage reports
        uses: actions/download-artifact@v3

      - name: Merge coverage reports
        run: |
          npm install -g nyc
          nyc merge coverage/ coverage/merged.json
          nyc report -t coverage --report-dir coverage/final

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/final/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 85" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold of 85%"
            exit 1
          fi

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/final/coverage-summary.json', 'utf8'));
            const comment = `
            ## 📊 Coverage Report
            - Lines: ${coverage.total.lines.pct}%
            - Branches: ${coverage.total.branches.pct}%
            - Functions: ${coverage.total.functions.pct}%
            - Statements: ${coverage.total.statements.pct}%
            `;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Pull Request Workflow

```yaml
# .github/workflows/pr-checks.yml
name: Pull Request Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  changed-files:
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.changes.outputs.backend }}
      frontend: ${{ steps.changes.outputs.frontend }}
      database: ${{ steps.changes.outputs.database }}
    steps:
      - uses: actions/checkout@v3
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            backend:
              - 'src/**'
              - 'package.json'
            frontend:
              - 'public/**'
            database:
              - 'migrations/**'
              - 'src/database/**'

  test-backend:
    needs: changed-files
    if: needs.changed-files.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test backend changes
        run: npm run test:backend

  test-frontend:
    needs: changed-files
    if: needs.changed-files.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test frontend changes
        run: npm run test:frontend

  test-database:
    needs: changed-files
    if: needs.changed-files.outputs.database == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test database migrations
        run: npm run test:migrations
```

## Pre-commit Hooks

### Husky Configuration

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test:changed"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ],
    "*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

### Git Hooks Setup

```bash
#!/bin/sh
# .husky/pre-commit

# Run linting
npm run lint:staged

# Run tests for changed files
npm run test:staged

# Check for console.log statements
if grep -r "console.log" --include="*.js" --exclude-dir=node_modules --exclude-dir=tests .; then
  echo "⚠️  console.log statements found. Please remove them."
  exit 1
fi
```

## Deployment Pipeline

### Staging Deployment

```yaml
# .github/workflows/deploy-staging.yml
deploy-staging:
  needs: [e2e-tests, security-scan]
  if: github.ref == 'refs/heads/develop'
  runs-on: ubuntu-latest
  environment: staging
  steps:
    - uses: actions/checkout@v3

    - name: Build Docker image
      run: |
        docker build -t radiocalico:staging .
        docker tag radiocalico:staging ${{ secrets.REGISTRY }}/radiocalico:staging

    - name: Push to registry
      run: |
        echo ${{ secrets.REGISTRY_PASSWORD }} | docker login -u ${{ secrets.REGISTRY_USER }} --password-stdin
        docker push ${{ secrets.REGISTRY }}/radiocalico:staging

    - name: Deploy to staging
      run: |
        ssh ${{ secrets.STAGING_HOST }} "docker pull ${{ secrets.REGISTRY }}/radiocalico:staging && docker-compose up -d"

    - name: Run smoke tests
      run: npm run test:smoke -- --url=https://staging.radiocalico.com

    - name: Notify Slack
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'Staging deployment ${{ job.status }}'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Production Deployment

```yaml
# .github/workflows/deploy-production.yml
deploy-production:
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  environment: production
  steps:
    - name: Create deployment
      uses: actions/github-script@v6
      with:
        script: |
          const deployment = await github.rest.repos.createDeployment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            ref: context.sha,
            environment: 'production',
            required_contexts: [],
            auto_merge: false
          });

    - name: Blue-Green Deployment
      run: |
        # Deploy to green environment
        kubectl set image deployment/radiocalico-green radiocalico=${{ secrets.REGISTRY }}/radiocalico:${{ github.sha }}

        # Wait for rollout
        kubectl rollout status deployment/radiocalico-green

        # Run health checks
        npm run test:health -- --url=https://green.radiocalico.com

        # Switch traffic
        kubectl patch service radiocalico -p '{"spec":{"selector":{"version":"green"}}}'

        # Verify production
        npm run test:smoke -- --url=https://radiocalico.com

    - name: Rollback on failure
      if: failure()
      run: |
        kubectl patch service radiocalico -p '{"spec":{"selector":{"version":"blue"}}}'
        echo "⚠️ Deployment failed, rolled back to previous version"
```

## Test Parallelization

### Matrix Strategy

```yaml
test-matrix:
  strategy:
    matrix:
      test-suite: [unit, integration, e2e]
      shard: [1, 2, 3, 4]
  steps:
    - name: Run tests shard ${{ matrix.shard }}
      run: npm run test:${{ matrix.test-suite }} -- --shard=${{ matrix.shard }}/4
```

### Docker Compose for Parallel Testing

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  test-runner-1:
    build: .
    command: npm run test:unit -- --shard=1/4
    volumes:
      - ./coverage/unit-1:/app/coverage

  test-runner-2:
    build: .
    command: npm run test:unit -- --shard=2/4
    volumes:
      - ./coverage/unit-2:/app/coverage

  test-runner-3:
    build: .
    command: npm run test:unit -- --shard=3/4
    volumes:
      - ./coverage/unit-3:/app/coverage

  test-runner-4:
    build: .
    command: npm run test:unit -- --shard=4/4
    volumes:
      - ./coverage/unit-4:/app/coverage

  coverage-merger:
    build: .
    command: npm run coverage:merge
    depends_on:
      - test-runner-1
      - test-runner-2
      - test-runner-3
      - test-runner-4
    volumes:
      - ./coverage:/app/coverage
```

## Monitoring and Notifications

### Test Results Dashboard

```yaml
# Grafana dashboard configuration
dashboard:
  title: "RadioCalico CI/CD Metrics"
  panels:
    - title: "Test Pass Rate"
      query: "avg(ci_test_pass_rate)"
      threshold: 95

    - title: "Build Duration"
      query: "avg(ci_build_duration)"
      threshold: 300

    - title: "Coverage Trend"
      query: "ci_coverage_percentage"
      threshold: 85

    - title: "Deployment Frequency"
      query: "count(deployments)"
```

### Notification Configuration

```yaml
# .github/workflows/notifications.yml
notify:
  runs-on: ubuntu-latest
  if: always()
  needs: [unit-tests, integration-tests, e2e-tests]
  steps:
    - name: Slack Notification
      uses: 8398a7/action-slack@v3
      with:
        status: custom
        custom_payload: |
          {
            text: `Test Results for ${process.env.GITHUB_REF}`,
            attachments: [{
              color: '${{ needs.unit-tests.result }}' === 'success' ? 'good' : 'danger',
              text: `Unit Tests: ${{ needs.unit-tests.result }}\nIntegration: ${{ needs.integration-tests.result }}\nE2E: ${{ needs.e2e-tests.result }}`
            }]
          }

    - name: Email Notification
      if: failure()
      uses: dawidd6/action-send-mail@v3
      with:
        to: dev-team@radiocalico.com
        subject: 'CI Build Failed - ${{ github.ref }}'
        body: 'Build failed. Check GitHub Actions for details.'
```

## Caching Strategy

### Dependency Caching

```yaml
cache-dependencies:
  - name: Cache node modules
    uses: actions/cache@v3
    with:
      path: ~/.npm
      key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      restore-keys: |
        ${{ runner.os }}-node-

  - name: Cache Playwright browsers
    uses: actions/cache@v3
    with:
      path: ~/.cache/ms-playwright
      key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}

  - name: Cache test results
    uses: actions/cache@v3
    with:
      path: .test-cache
      key: test-cache-${{ github.sha }}
      restore-keys: |
        test-cache-
```

## Quality Gates

### Branch Protection Rules

```json
{
  "protection_rules": {
    "main": {
      "required_status_checks": {
        "strict": true,
        "contexts": [
          "unit-tests",
          "integration-tests",
          "e2e-tests",
          "security-scan",
          "coverage-check"
        ]
      },
      "enforce_admins": true,
      "required_pull_request_reviews": {
        "required_approving_review_count": 2,
        "dismiss_stale_reviews": true
      },
      "restrictions": null
    }
  }
}
```

### Automated Rollback

```yaml
rollback-on-failure:
  runs-on: ubuntu-latest
  if: failure()
  steps:
    - name: Get previous deployment
      id: previous
      run: |
        echo "::set-output name=sha::$(git rev-parse HEAD~1)"

    - name: Rollback deployment
      run: |
        kubectl set image deployment/radiocalico radiocalico=${{ secrets.REGISTRY }}/radiocalico:${{ steps.previous.outputs.sha }}

    - name: Verify rollback
      run: |
        npm run test:smoke -- --url=https://radiocalico.com

    - name: Create incident
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.create({
            owner: context.repo.owner,
            repo: context.repo.repo,
            title: 'Production deployment failed - Automatic rollback triggered',
            body: 'Deployment of ${context.sha} failed. Rolled back to previous version.',
            labels: ['incident', 'production', 'high-priority']
          });
```

## Performance Optimization

### Build Time Optimization

```yaml
optimize-ci:
  steps:
    # Use npm ci instead of npm install
    - run: npm ci --prefer-offline --no-audit

    # Run only affected tests
    - run: npm run test:affected -- --base=origin/main

    # Parallel execution
    - run: npm run test -- --maxWorkers=4

    # Skip unnecessary steps
    - run: |
        if [[ "${{ github.event_name }}" == "pull_request" ]]; then
          npm run test:quick
        else
          npm run test:full
        fi
```

## Metrics and KPIs

### CI/CD Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Build Success Rate | > 95% | < 90% |
| Average Build Time | < 10 min | > 15 min |
| Test Execution Time | < 5 min | > 10 min |
| Deployment Frequency | Daily | < Weekly |
| Mean Time to Recovery | < 1 hour | > 2 hours |
| Test Flakiness | < 1% | > 5% |
| Coverage Percentage | > 85% | < 80% |

### Continuous Improvement

```yaml
weekly-metrics:
  schedule:
    - cron: '0 9 * * 1' # Every Monday
  steps:
    - name: Generate CI/CD report
      run: |
        npm run ci:metrics:generate

    - name: Post to Slack
      run: |
        npm run ci:metrics:post-slack

    - name: Update dashboard
      run: |
        npm run ci:metrics:update-dashboard
```