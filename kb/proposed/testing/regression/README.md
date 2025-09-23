# RadioCalico Regression Testing Plan

## Overview

This directory contains the comprehensive regression testing strategy for RadioCalico, ensuring that new changes don't break existing functionality and maintaining high quality standards across releases.

## Documentation Structure

1. **[Test Plan Overview](./01-test-plan-overview.md)** - High-level regression testing strategy
2. **[Critical Path Tests](./02-critical-path-tests.md)** - Essential user journeys that must always work
3. **[Automated Testing Strategy](./03-automated-testing-strategy.md)** - Automation framework and implementation
4. **[Test Coverage Requirements](./04-test-coverage-requirements.md)** - Coverage metrics and standards
5. **[CI/CD Integration](./05-ci-cd-integration.md)** - Continuous testing pipeline
6. **[Test Case Catalog](./06-test-case-catalog.md)** - Comprehensive test case repository

## Quick Start

### Running Regression Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=backend
npm test -- --testPathPattern=frontend
npm test -- --testPathPattern=integration

# Run with coverage
npm test -- --coverage

# Run regression suite only
npm run test:regression
```

### Test Categories

- **Unit Tests**: Individual component/function testing
- **Integration Tests**: Module interaction testing
- **E2E Tests**: Complete user journey testing
- **Performance Tests**: Load and response time testing
- **Security Tests**: Vulnerability scanning

## Key Principles

1. **Prevent Regressions**: Every bug fix includes a test
2. **Maintain Coverage**: Minimum 80% code coverage
3. **Automate Everything**: Manual testing only for exploratory
4. **Fast Feedback**: Tests run on every commit
5. **Clear Documentation**: Every test has a clear purpose

## Current Status

- ✅ Unit test framework established (Jest)
- ✅ Backend API tests implemented
- ✅ Frontend component tests started
- 📋 E2E testing framework needed
- 📋 Performance testing suite needed
- 📋 Security testing integration needed

## Contact

For questions about testing strategy or implementation, refer to the main project documentation or create an issue in the repository.