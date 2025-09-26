# GitHub Actions CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration, testing, and security scanning for the RadioCalico project.

## Workflows

### 1. CI Pipeline (`ci.yml`)
**Purpose:** Main continuous integration workflow for testing and code quality checks.

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual workflow dispatch

**Jobs:**
- **Test**: Runs unit tests on Node.js 18.x and 20.x
- **Security**: Performs basic security scanning (npm audit, ESLint security, secrets detection)
- **Docker Security**: Scans Docker images with Trivy
- **Code Quality**: Runs ESLint and Prettier checks
- **Dependency Check**: Checks for outdated dependencies and licenses

### 2. Security Scanning (`security.yml`)
**Purpose:** Comprehensive security analysis with multiple scanning tools.

**Triggers:**
- Weekly schedule (Mondays at 3 AM UTC)
- Push to `main` (when package files or Dockerfiles change)
- Manual workflow dispatch

**Jobs:**
- **Comprehensive Security Scan**: npm audit, Snyk, OWASP dependency check
- **Container Security**: Trivy and Grype scanning on Docker images
- **Secret Scanning**: TruffleHog, detect-secrets, GitLeaks
- **SAST Analysis**: ESLint security, NodeJsScan, Semgrep
- **Create Issues**: Automatically creates GitHub issues when vulnerabilities are found

### 3. Pull Request Check (`pr-check.yml`)
**Purpose:** Automated checks for pull requests with feedback comments.

**Triggers:**
- Pull request events (opened, synchronized, reopened, ready_for_review)

**Jobs:**
- **Validate**: Checks commit messages, runs tests, linting, and security scans
- **Size Check**: Monitors bundle sizes
- **PR Comment**: Posts automated feedback as PR comments

## Required Secrets

Some workflows require the following secrets to be configured in the repository:

- `SNYK_TOKEN`: (Optional) For enhanced Snyk security scanning
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Workflow Features

### Security Features
- Multiple security scanners for comprehensive coverage
- SARIF upload for GitHub Security tab integration
- Automatic issue creation for security alerts
- Container vulnerability scanning
- Secret detection across multiple tools

### Quality Assurance
- Multi-version Node.js testing matrix
- Code coverage reporting
- ESLint and Prettier formatting checks
- Conventional commit message validation
- Bundle size monitoring

### Developer Experience
- Automated PR feedback comments
- Test result artifacts
- Coverage report uploads
- Continuous monitoring with scheduled scans

## Usage

### Running Workflows Manually

You can trigger workflows manually from the Actions tab:

1. Go to the repository's Actions tab
2. Select the workflow you want to run
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

### Viewing Results

- **Test Results**: Available as artifacts in each workflow run
- **Security Findings**: Check the Security tab for SARIF results
- **PR Feedback**: Automated comments on pull requests
- **Coverage Reports**: Downloaded as artifacts from test jobs

## Best Practices

1. **Keep dependencies updated** to minimize security vulnerabilities
2. **Review security scan results** regularly, especially the weekly scans
3. **Fix high and critical vulnerabilities** before merging PRs
4. **Follow conventional commits** for consistent commit messages
5. **Monitor bundle sizes** to prevent performance regression

## Troubleshooting

### Common Issues

1. **npm audit failures**: Run `npm audit fix` locally
2. **ESLint errors**: Run `npx eslint . --fix` to auto-fix issues
3. **Test failures**: Check test artifacts for detailed error messages
4. **Docker scan failures**: Update base images and dependencies

### Workflow Maintenance

- Review and update Node.js versions in test matrix
- Update action versions periodically
- Adjust security thresholds based on project needs
- Configure additional secrets for enhanced scanning features

## Contributing

When modifying workflows:

1. Test changes in a feature branch first
2. Ensure all existing checks pass
3. Document any new requirements or secrets
4. Update this README with workflow changes

## Support

For issues or questions about the CI/CD workflows:
1. Check workflow run logs in the Actions tab
2. Review artifacts for detailed information
3. Open an issue with the `ci/cd` label