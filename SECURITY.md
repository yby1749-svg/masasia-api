# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email security concerns to: security@callmsg.com
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### Security Measures

This project implements the following security measures:

#### Authentication & Authorization
- JWT tokens with short expiration
- Refresh token rotation
- Password hashing with bcrypt (cost factor 12)
- Role-based access control (RBAC)

#### API Security
- Helmet.js security headers
- Rate limiting (100 requests/15 minutes)
- Input validation with Zod
- SQL injection prevention via Prisma ORM
- XSS protection

#### Infrastructure
- HTTPS only in production
- Environment variables for secrets
- No secrets in codebase
- Docker container isolation

#### Dependencies
- Dependabot automated updates
- Regular npm audit checks
- 0 known vulnerabilities policy

### Security Best Practices for Contributors

1. Never commit secrets or credentials
2. Use environment variables for sensitive data
3. Validate all user inputs
4. Use parameterized queries (Prisma handles this)
5. Keep dependencies updated
6. Follow the principle of least privilege

### Bug Bounty

Currently, we do not offer a bug bounty program. However, we appreciate responsible disclosure and will acknowledge security researchers in our release notes.

## Contact

For security-related inquiries:
- Email: security@callmsg.com

Thank you for helping keep Call MSG secure!
