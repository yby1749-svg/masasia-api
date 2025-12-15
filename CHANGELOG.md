# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-14

### Added

#### API Features
- Complete REST API with 92 endpoints
- User authentication with JWT (access + refresh tokens)
- Password reset and phone verification
- User management (profiles, addresses, favorites)
- Provider registration and management
- Provider services, availability, and earnings
- Booking system with status tracking
- Payment processing and refunds
- Review and rating system
- User reporting functionality
- Push notifications system
- Admin dashboard with 35 management endpoints

#### Database
- PostgreSQL 15 with Prisma ORM
- Redis 7 for caching and sessions
- 15+ database models
- Seed data for development/testing

#### Testing
- 399 test cases
- 94.54% statement coverage
- 85.35% branch coverage
- 97.14% function coverage
- 94.78% line coverage

#### CI/CD
- GitHub Actions CI pipeline (lint, build, test)
- Staging deployment workflow
- Production deployment workflow
- Coverage reporting with artifacts
- Branch protection for main and develop

#### DevOps
- Docker containerization
- docker-compose for development
- AWS ECS task definition
- IAM deployment policy
- Dependabot for automated updates
- CODEOWNERS for PR reviews

#### Documentation
- README with setup instructions
- AWS deployment guide
- CONTRIBUTING.md guide
- Pull request template
- Issue templates (bug, feature)
- Swagger/OpenAPI documentation
- MIT License

### Security
- Helmet.js security headers
- Rate limiting
- JWT token authentication
- Password hashing with bcrypt
- Input validation with Zod
- 0 npm vulnerabilities

### Infrastructure
- Node.js 20 runtime
- Express.js framework
- TypeScript strict mode
- ESLint code quality
- Production-ready Dockerfile

---

## Release Links

- **Repository**: https://github.com/yby1749-svg/masasia-api
- **Release**: https://github.com/yby1749-svg/masasia-api/releases/tag/v1.0.0

## Contributors

- Development Team

---

[1.0.0]: https://github.com/yby1749-svg/masasia-api/releases/tag/v1.0.0
