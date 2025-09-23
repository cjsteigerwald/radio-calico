# Test Coverage Requirements

## Overview

This document defines the test coverage standards, metrics, and requirements for RadioCalico to ensure comprehensive testing and maintain code quality.

## Coverage Metrics Definition

### Types of Coverage

#### 1. Line Coverage
**Definition**: Percentage of code lines executed during tests
**Target**: 85% overall, 95% for critical modules
**Formula**: `(Lines Executed / Total Lines) × 100`

#### 2. Branch Coverage
**Definition**: Percentage of decision branches tested
**Target**: 80% overall, 90% for business logic
**Formula**: `(Branches Tested / Total Branches) × 100`

#### 3. Function Coverage
**Definition**: Percentage of functions called during tests
**Target**: 90% overall, 100% for public APIs
**Formula**: `(Functions Called / Total Functions) × 100`

#### 4. Statement Coverage
**Definition**: Percentage of statements executed
**Target**: 85% overall
**Formula**: `(Statements Executed / Total Statements) × 100`

## Module-Specific Requirements

### Critical Modules (95% Coverage Required)

#### AudioPlayer Module
```javascript
// Coverage requirements
{
  "public/js/modules/AudioPlayer.js": {
    "lines": 95,
    "branches": 90,
    "functions": 100,
    "statements": 95,
    "critical_methods": [
      "play",
      "pause",
      "resetElapsedTime",
      "startElapsedTimeCounter",
      "initializeHLS"
    ]
  }
}
```

#### Database Operations
```javascript
// Coverage requirements
{
  "src/database/index.js": {
    "lines": 95,
    "branches": 90,
    "functions": 100,
    "statements": 95,
    "critical_operations": [
      "createUser",
      "rateSong",
      "getSongRatings",
      "transaction"
    ]
  }
}
```

#### API Controllers
```javascript
// Coverage requirements
{
  "src/controllers/*.js": {
    "lines": 90,
    "branches": 85,
    "functions": 100,
    "statements": 90,
    "required_tests": [
      "Success paths",
      "Error handling",
      "Validation failures",
      "Edge cases"
    ]
  }
}
```

### Standard Modules (80% Coverage Required)

#### UI Components
```javascript
{
  "public/js/app.js": {
    "lines": 80,
    "branches": 75,
    "functions": 85,
    "statements": 80
  }
}
```

#### Utility Functions
```javascript
{
  "src/utils/*.js": {
    "lines": 85,
    "branches": 80,
    "functions": 90,
    "statements": 85
  }
}
```

### Excluded from Coverage

#### Files to Exclude
```javascript
// jest.config.js
coveragePathIgnorePatterns: [
  '/node_modules/',
  '/tests/',
  '/coverage/',
  '/.git/',
  '/docs/',
  '/kb/',
  'jest.config.js',
  '.eslintrc.js',
  '/migrations/',  // Database migrations
  '/scripts/',     // Build and deployment scripts
  '*.test.js',     // Test files themselves
  '*.spec.js'
]
```

## Coverage by Test Type

### Unit Test Coverage

#### Expected Coverage
- **Target**: 70% of total coverage
- **Focus**: Business logic, utilities, data transformations
- **Speed**: < 30 seconds for full suite

#### Example Coverage Report
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
AudioPlayer.js      |   96.5  |   92.3   |  100.0  |   96.5  |
RatingSystem.js     |   88.2  |   85.7   |   90.0  |   88.2  |
AppState.js         |   92.1  |   88.9   |   95.0  |   92.1  |
--------------------|---------|----------|---------|---------|
```

### Integration Test Coverage

#### Expected Coverage
- **Target**: 25% of total coverage
- **Focus**: API endpoints, service interactions, database operations
- **Speed**: < 2 minutes for full suite

#### Coverage Areas
```javascript
// API Endpoint Coverage
const endpointCoverage = {
  'GET /api/health': 100,
  'GET /api/health/db': 100,
  'POST /api/users': 95,
  'GET /api/users': 90,
  'POST /api/songs/rate': 95,
  'GET /api/songs/:id/ratings': 90
};
```

### E2E Test Coverage

#### Expected Coverage
- **Target**: 5% of total coverage (critical paths)
- **Focus**: User journeys, cross-component workflows
- **Speed**: < 5 minutes for full suite

## Coverage Thresholds

### Global Thresholds
```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
};
```

### Per-File Thresholds
```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    './src/database/*.js': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/controllers/*.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './public/js/modules/*.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
};
```

## Coverage Reporting

### Report Generation

#### Local Development
```bash
# Generate coverage report
npm test -- --coverage

# Generate detailed HTML report
npm test -- --coverage --coverageReporters=html

# Generate coverage for specific module
npm test -- --coverage --collectCoverageFrom='src/database/**/*.js'
```

#### CI/CD Pipeline
```yaml
test-coverage:
  script:
    - npm test -- --coverage --coverageReporters=json
    - npm run coverage:upload
  artifacts:
    paths:
      - coverage/
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

### Coverage Visualization

#### HTML Report Structure
```
coverage/
├── lcov-report/
│   ├── index.html           # Main coverage dashboard
│   ├── src/
│   │   ├── controllers/     # Controller coverage
│   │   ├── services/        # Service coverage
│   │   └── database/        # Database coverage
│   └── public/
│       └── js/              # Frontend coverage
├── coverage-summary.json    # JSON summary
└── lcov.info               # LCOV format for tools
```

#### Badge Generation
```javascript
// generate-badge.js
const coverage = require('./coverage/coverage-summary.json');
const total = coverage.total;

const badge = {
  schemaVersion: 1,
  label: 'coverage',
  message: `${total.lines.pct}%`,
  color: total.lines.pct > 80 ? 'green' :
         total.lines.pct > 60 ? 'yellow' : 'red'
};
```

## Coverage Analysis

### Uncovered Code Analysis

#### Common Patterns to Check
1. **Error Handling Paths**
   ```javascript
   // Often uncovered
   catch (error) {
     logger.error('Unexpected error', error);
     throw new InternalServerError();
   }
   ```

2. **Edge Cases**
   ```javascript
   // Boundary conditions
   if (array.length === 0) {
     return defaultValue;
   }
   ```

3. **Fallback Logic**
   ```javascript
   // Default branches
   const config = process.env.CONFIG || 'default';
   ```

### Coverage Improvement Strategies

#### 1. Identify Coverage Gaps
```bash
# Find files with low coverage
npm test -- --coverage --coverageReporters=json
jq '.total | to_entries | map(select(.value.pct < 80))' coverage/coverage-summary.json
```

#### 2. Prioritize Critical Gaps
```javascript
// Priority matrix
const priorityMatrix = {
  'High Impact + Low Coverage': 'Critical',
  'High Impact + Medium Coverage': 'High',
  'Low Impact + Low Coverage': 'Medium',
  'Low Impact + High Coverage': 'Low'
};
```

#### 3. Write Targeted Tests
```javascript
// Focus on uncovered branches
describe('Edge case coverage', () => {
  it('handles empty input', () => {
    expect(processData([])).toEqual(defaultResult);
  });

  it('handles null values', () => {
    expect(processData(null)).toThrow(ValidationError);
  });
});
```

## Coverage Enforcement

### Pre-Commit Hooks
```json
// .husky/pre-commit
{
  "scripts": {
    "pre-commit": "npm test -- --coverage --changedSince=main"
  }
}
```

### Pull Request Checks
```yaml
# .github/workflows/coverage.yml
coverage-check:
  steps:
    - name: Run tests with coverage
      run: npm test -- --coverage

    - name: Check coverage thresholds
      run: |
        if [ $(jq '.total.lines.pct' coverage/coverage-summary.json) -lt 85 ]; then
          echo "Coverage below threshold"
          exit 1
        fi

    - name: Comment PR with coverage
      uses: actions/github-script@v6
      with:
        script: |
          const coverage = require('./coverage/coverage-summary.json');
          const comment = `Coverage: ${coverage.total.lines.pct}%`;
          github.issues.createComment({
            issue_number: context.issue.number,
            body: comment
          });
```

### Coverage Trends

#### Tracking Over Time
```javascript
// track-coverage.js
const fs = require('fs');
const coverage = require('./coverage/coverage-summary.json');

const historicalData = JSON.parse(
  fs.readFileSync('coverage-history.json', 'utf8')
);

historicalData.push({
  date: new Date().toISOString(),
  lines: coverage.total.lines.pct,
  branches: coverage.total.branches.pct,
  functions: coverage.total.functions.pct,
  statements: coverage.total.statements.pct
});

fs.writeFileSync(
  'coverage-history.json',
  JSON.stringify(historicalData, null, 2)
);
```

## Coverage Exceptions

### Acceptable Exclusions

#### 1. Generated Code
- Migration files
- Auto-generated API clients
- Build artifacts

#### 2. Configuration Files
- Environment configs
- Build configurations
- Test setup files

#### 3. Third-Party Integrations
- Vendor-specific code
- Platform-specific shims
- Polyfills

### Exception Process

1. **Request**: Developer identifies code for exclusion
2. **Justification**: Provide reason for exclusion
3. **Review**: Team lead approves exception
4. **Documentation**: Add to exclusion list with comment
5. **Re-evaluation**: Review quarterly

#### Example Exception
```javascript
/* istanbul ignore next - Platform specific code */
if (process.platform === 'win32') {
  // Windows-specific implementation
}
```

## Coverage Goals Timeline

### Current State (Baseline)
- Overall: ~70%
- Backend: ~75%
- Frontend: ~65%

### Q1 2025 Goals
- Overall: 80%
- Backend: 85%
- Frontend: 75%
- Critical paths: 95%

### Q2 2025 Goals
- Overall: 85%
- Backend: 90%
- Frontend: 80%
- Critical paths: 100%

### Q3 2025 Goals
- Overall: 90%
- Backend: 95%
- Frontend: 85%
- New code: 95% minimum

## Coverage Best Practices

### Do's
- ✅ Test both success and failure paths
- ✅ Cover edge cases and boundaries
- ✅ Test error handling
- ✅ Mock external dependencies
- ✅ Use coverage as a guide, not a goal

### Don'ts
- ❌ Write tests just for coverage
- ❌ Test implementation details
- ❌ Ignore flaky tests
- ❌ Skip integration tests
- ❌ Sacrifice quality for coverage percentage

## Tooling and Integration

### Coverage Tools
- **Jest**: Built-in coverage via Istanbul
- **NYC**: Advanced coverage reporting
- **Codecov**: Cloud coverage tracking
- **SonarQube**: Code quality and coverage
- **Coveralls**: Coverage badge service

### IDE Integration
```json
// VS Code settings.json
{
  "jest.showCoverageOnLoad": true,
  "jest.coverageColors": {
    "covered": "green",
    "uncovered": "red",
    "partially-covered": "yellow"
  }
}
```