# Contributing to FloWiz API

Thank you for your interest in contributing to FloWiz API! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and professional in all interactions. We aim to create a welcoming environment for all contributors.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/your-username/flowiz-api.git`
3. **Create a branch**: `git checkout -b feature/your-feature-name`
4. **Set up the development environment**: See [DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Development Workflow

1. **Make your changes**
   - Follow the coding standards in [DEVELOPMENT.md](docs/DEVELOPMENT.md)
   - Write tests for new features
   - Update documentation as needed

2. **Run tests**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

3. **Commit your changes**
   - Use conventional commit format: `feat:`, `fix:`, `docs:`, `test:`, etc.
   - Example: `feat: add GitLab CI parser`

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure all CI checks pass

## Coding Standards

- **TypeScript strict mode** - No `any` types
- **Test coverage** - Maintain >80% coverage
- **ESLint** - All code must pass linting
- **Prettier** - Code must be formatted
- **Documentation** - JSDoc comments for public APIs

## Testing Requirements

- **Unit tests** for all new functions
- **Integration tests** for API endpoints
- **E2E tests** for complete workflows
- All tests must pass before PR approval

## Pull Request Process

1. Update README.md with details of changes if applicable
2. Update the documentation in `docs/` if needed
3. Add or update tests as required
4. Ensure the PR description clearly describes the problem and solution
5. Link to any relevant issues

## Review Process

- All PRs require at least one approval
- All CI checks must pass
- Code must meet quality standards
- Documentation must be updated

## Questions?

- Check [DEVELOPMENT.md](docs/DEVELOPMENT.md) for development guidelines
- Check [ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design
- Open an issue for questions or discussions

Thank you for contributing!
