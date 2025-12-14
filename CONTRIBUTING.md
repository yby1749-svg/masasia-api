# Contributing to Call MSG API

Thank you for your interest in contributing to Call MSG! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Strategy](#branch-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the problem, not the person
- Help others learn and grow

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/yby1749-svg/callmsg-api.git
cd callmsg-api

# Install dependencies
npm install

# Start development services
docker-compose up -d

# Setup database
npx prisma migrate deploy
npm run db:seed

# Run development server
npm run dev
```

### Verify Setup

```bash
# Run tests
npm test

# Check linting
npm run lint

# Build project
npm run build
```

## Development Workflow

1. **Create an issue** - Describe the bug or feature
2. **Fork the repository** - Create your own copy
3. **Create a branch** - Branch from `develop`
4. **Make changes** - Write code and tests
5. **Submit PR** - Open a pull request to `develop`
6. **Code review** - Address feedback
7. **Merge** - After approval, PR is merged

## Branch Strategy

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production code | Production |
| `develop` | Staging code | Staging |
| `feature/*` | New features | PR → develop |
| `bugfix/*` | Bug fixes | PR → develop |
| `hotfix/*` | Urgent fixes | PR → main |

### Branch Naming

```
feature/add-user-authentication
bugfix/fix-login-error
hotfix/security-patch
```

## Commit Guidelines

### Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting (no code change) |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |

### Examples

```
feat(auth): add password reset functionality

fix(booking): resolve double-booking issue

docs(readme): update installation instructions

test(providers): add unit tests for availability
```

## Pull Request Process

1. **Update from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/your-feature
   ```

4. **PR Requirements**
   - All CI checks must pass
   - At least 1 approving review (for main)
   - No merge conflicts
   - Tests for new functionality

5. **After merge**
   ```bash
   git checkout develop
   git pull origin develop
   git branch -d feature/your-feature
   ```

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Define types for all functions
- Avoid `any` type when possible
- Use interfaces for objects

```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

async function getUser(id: string): Promise<User> {
  // ...
}

// Avoid
async function getUser(id: any): Promise<any> {
  // ...
}
```

### API Routes

- Use RESTful conventions
- Return consistent response format
- Handle errors properly

```typescript
// Response format
{
  "success": true,
  "data": { ... }
}

// Error format
{
  "success": false,
  "error": "Error message"
}
```

### File Structure

```
src/
├── controllers/    # Request handlers
├── services/       # Business logic
├── routes/         # Route definitions
├── middleware/     # Express middleware
├── utils/          # Helper functions
└── __tests__/      # Test files
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- providers.test.ts

# Run in watch mode
npm test -- --watch
```

### Writing Tests

```typescript
describe('Feature', () => {
  beforeEach(async () => {
    // Setup
  });

  afterEach(async () => {
    // Cleanup
  });

  it('should do something', async () => {
    // Arrange
    const input = { ... };

    // Act
    const result = await someFunction(input);

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Test Coverage

- Minimum 80% coverage required
- Test happy paths and error cases
- Mock external services

## Documentation

### Code Comments

- Document complex logic
- Explain "why", not "what"
- Keep comments up to date

### API Documentation

- Update Swagger annotations
- Include request/response examples
- Document error codes

```typescript
/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
```

## Questions?

- Check existing issues
- Read the documentation
- Open a new issue for help

---

Thank you for contributing! 🎉
