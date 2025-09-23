# RadioCalico Security Guide

## Overview

This document outlines the comprehensive security measures implemented in RadioCalico, going beyond basic `npm audit` to provide defense-in-depth security.

## Security Layers

### 1. Dependency Security (npm audit)
- **What it does**: Scans npm packages for known vulnerabilities
- **Commands**:
  ```bash
  make security-audit          # Check all vulnerabilities
  make security-audit-critical # Critical only
  make security-audit-high     # High and critical
  make security-fix            # Auto-fix vulnerabilities
  ```
- **Limitations**: Only covers known CVEs in dependencies

### 2. Static Application Security Testing (SAST)
- **What it does**: Analyzes code for security vulnerabilities without executing it
- **Tools**: ESLint with security plugins
- **Commands**:
  ```bash
  make security-lint    # Run ESLint security checks
  make security-sast    # Complete SAST analysis
  npm run lint:security # Direct ESLint security scan
  ```
- **Detects**:
  - SQL injection risks
  - XSS vulnerabilities
  - Unsafe regex patterns
  - Eval usage
  - Path traversal risks

### 3. Secret Detection
- **What it does**: Prevents hardcoded secrets from being committed
- **Configuration**: `.secretsignore`, `.gitsecrets`
- **Commands**:
  ```bash
  make security-secrets # Scan for hardcoded secrets
  ```
- **Detects**:
  - API keys
  - Passwords
  - Private keys
  - Tokens
  - Database credentials

### 4. Security Headers
- **What it does**: Configures HTTP headers to prevent common attacks
- **Implementation**: Helmet.js + custom headers
- **Headers configured**:
  - Content-Security-Policy (CSP)
  - X-Frame-Options (clickjacking prevention)
  - X-Content-Type-Options (MIME sniffing prevention)
  - X-XSS-Protection (XSS filtering)
  - Strict-Transport-Security (HTTPS enforcement)
  - Referrer-Policy
  - Permissions-Policy
- **Commands**:
  ```bash
  make security-headers # Test security headers
  ```

### 5. Rate Limiting
- **What it does**: Prevents abuse and DDoS attacks
- **Implementation**: express-rate-limit
- **Configurations**:
  - General API: 100 requests/15 minutes
  - Authentication: 5 attempts/15 minutes
  - Song rating: 10 requests/minute
- **Applied to**:
  - All `/api/` endpoints
  - Specific sensitive endpoints

### 6. Input Sanitization
- **What it does**: Prevents XSS and injection attacks
- **Implementation**: Custom middleware
- **Sanitizes**:
  - Request body
  - Query parameters
  - URL parameters
- **Removes**:
  - Script tags
  - JavaScript URIs
  - Event handlers

### 7. Container Security
- **What it does**: Scans Docker images for vulnerabilities
- **Tools**: Trivy/Docker Scout/Snyk
- **Commands**:
  ```bash
  make security-docker  # Auto-detect and use available scanner
  make trivy-scan      # Comprehensive scan with Trivy (recommended)
  make scan-docker      # Scan running containers
  ```
- **Trivy Features**:
  - Zero false positives
  - Fast scanning (offline database)
  - Detailed vulnerability information
  - Support for multiple formats (table, JSON, SARIF)

## Security Testing Commands

### Quick Security Check
```bash
make security-quick  # High severity vulnerabilities only
```

### Complete Security Assessment
```bash
make security-full   # Runs all security checks
```

### Individual Checks
```bash
make security              # Dependencies + Docker
make security-sast         # Static analysis
make security-secrets      # Secret scanning
make security-headers      # HTTP headers test
make security-test         # Security-focused tests
make security-metrics      # Security metrics tracking
```

## Security Checklist

### Before Every Commit
- [ ] Run `make security-quick`
- [ ] Run `make security-secrets`
- [ ] Review code for security issues

### Weekly
- [ ] Run `make security-full`
- [ ] Review security-metrics.txt
- [ ] Update dependencies

### Monthly
- [ ] Full penetration testing
- [ ] Review security policies
- [ ] Update security documentation

## Common Vulnerabilities Prevented

### 1. Injection Attacks
- **SQL Injection**: Parameterized queries, input validation
- **NoSQL Injection**: Input sanitization, validation
- **Command Injection**: No shell command execution from user input

### 2. Cross-Site Scripting (XSS)
- **Stored XSS**: Input sanitization, output encoding
- **Reflected XSS**: CSP headers, input validation
- **DOM XSS**: Secure JavaScript practices

### 3. Cross-Site Request Forgery (CSRF)
- Rate limiting
- Same-origin policy
- Proper CORS configuration

### 4. Authentication & Session
- Rate limiting on auth endpoints
- Secure session configuration
- No hardcoded credentials

### 5. Sensitive Data Exposure
- No secrets in code
- Environment variables for config
- Secure headers

### 6. XML External Entities (XXE)
- No XML parsing of user input
- JSON-only APIs

### 7. Broken Access Control
- Proper authorization checks
- Rate limiting
- Input validation

### 8. Security Misconfiguration
- Security headers configured
- Error messages don't leak info
- Updated dependencies

### 9. Using Components with Known Vulnerabilities
- Regular npm audit
- Automated security updates
- Docker image scanning

### 10. Insufficient Logging & Monitoring
- Request logging
- Security event tracking
- Metrics generation

## Best Practices

### Development
1. Never commit secrets (use environment variables)
2. Validate all user input
3. Use parameterized queries
4. Implement proper error handling
5. Keep dependencies updated
6. Use HTTPS in production
7. Implement proper authentication
8. Use secure session management
9. Follow principle of least privilege
10. Regular security testing

### Production Deployment
1. Enable all security headers
2. Use HTTPS only
3. Implement WAF if possible
4. Regular security audits
5. Monitor for security events
6. Keep systems patched
7. Use secure configurations
8. Implement backup strategy
9. Have incident response plan
10. Regular penetration testing

## Security Tools Integration

### CI/CD Pipeline
```yaml
# Example GitHub Actions
- name: Security Audit
  run: |
    make security-audit
    make security-sast
    make security-secrets
```

### Pre-commit Hooks
```bash
# .git/hooks/pre-commit
#!/bin/bash
make security-secrets || exit 1
make security-lint || exit 1
```

### Monitoring
- Set up alerts for security events
- Monitor rate limiting hits
- Track failed authentication attempts
- Review security metrics regularly

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Email security details to: [security@radiocalico.com]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

## Compliance

This security implementation helps meet requirements for:
- OWASP Top 10 protection
- PCI DSS (partial - for payment processing)
- GDPR (data protection aspects)
- SOC 2 (security controls)

## Version History

- v1.0.0 - Initial security implementation
- v1.1.0 - Added SAST, secrets detection, security headers
- v1.2.0 - Added rate limiting, input sanitization

---

Remember: Security is not a one-time implementation but an ongoing process. Regular reviews, updates, and testing are essential for maintaining a secure application.