# Contributing to react-use-sse

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/react-use-sse.git
cd react-use-sse
```

2. **Install dependencies**

```bash
npm install
```

3. **Run tests**

```bash
npm test
```

4. **Build the library**

```bash
npm run build
```

## Development Workflow

### Available Scripts

- `npm run dev` - Watch mode for development
- `npm run build` - Build the library
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint the code
- `npm run lint:fix` - Lint and fix issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Check TypeScript types

### Making Changes

1. Create a new branch from `main`:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Add tests for new functionality
4. Run tests and ensure they pass
5. Run linting and fix any issues
6. Commit your changes with a descriptive message

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding or updating tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

Examples:

```
feat: add support for custom parsers
fix: handle reconnection timeout correctly
docs: update README with new examples
```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md with your changes
3. Ensure all tests pass and coverage is maintained
4. Request review from maintainers

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Testing

- Write tests for all new functionality
- Maintain test coverage above 80%
- Use descriptive test names
- Group related tests with `describe` blocks

## Questions?

If you have questions, feel free to:

- Open an issue
- Start a discussion on GitHub

Thank you for contributing! 🎉
