# Contributing to CodeRef Core

Thank you for your interest in contributing to CodeRef Core! This document provides guidelines and workflows for contributing.

---

## Quick Start

```bash
# Fork and clone
git clone https://github.com/your-username/coderef-core.git
cd coderef-core

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- Follow existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:scanner
npm run test:cli

# Run linting
npm run lint

# Type check
npm run typecheck
```

### 4. Build CLI

```bash
# Build CLI for testing
npm run build:cli

# Test CLI locally
node dist/src/cli/index.js scan --dir ./src
```

### 5. Commit

```bash
git add .
git commit -m "feat: your feature description"
```

**Commit message format:**
- `feat:` New feature
- `fix:` Bug fix
- `doc:` Documentation update
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Maintenance tasks

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Create a pull request with:
- Clear description of changes
- Link to related issues
- Test results/screenshots if applicable

---

## Project Structure

```
coderef-core/
├── src/
│   ├── analyzer/       # Code analysis tools
│   ├── cache/          # Incremental caching
│   ├── cli/            # CLI commands
│   ├── context/        # Context management
│   ├── errors/         # Error handling
│   ├── export/         # Export formats
│   ├── indexer/        # Index management
│   ├── integration/    # External integrations (RAG, vector DB)
│   ├── parser/         # Code parsing
│   ├── pipeline/       # Processing pipelines
│   ├── scanner/        # Code scanning
│   ├── search/         # Search functionality
│   └── types/          # TypeScript definitions
├── docs/               # Documentation
├── __tests__/          # Test files
└── examples/           # Usage examples
```

---

## Code Standards

### TypeScript

- Use strict TypeScript settings
- Explicit return types on public APIs
- Document complex functions with JSDoc

### Testing

- Write tests for new features
- Maintain test coverage > 80%
- Use descriptive test names

### Documentation

- Update README.md for user-facing changes
- Update docs/ for technical changes
- Add inline comments for complex logic

---

## Adding CLI Commands

To add a new CLI command:

1. Create `src/cli/<command-name>.ts`
2. Implement using `Commander.js`
3. Export command factory
4. Register in `src/cli/index.ts`
5. Add tests in `__tests__/cli/`
6. Document in `docs/CLI.md`

**Example:**

```typescript
// src/cli/my-command.ts
import { Command } from 'commander';

export function createMyCommand(): Command {
  return new Command('my-command')
    .description('Description of command')
    .option('-d, --dir <path>', 'Directory to process')
    .action(async (options) => {
      // Implementation
    });
}
```

---

## Adding Scanner Languages

To add support for a new language:

1. Add language patterns to `src/scanner/scanner.ts`
2. Add file extensions to language mapping
3. Add tests in `src/scanner/__tests__/`
4. Update `docs/CLI.md` supported languages list

---

## Reporting Issues

When reporting bugs, include:

1. **Environment:** OS, Node version, CodeRef Core version
2. **Steps to reproduce:** Clear steps
3. **Expected behavior:** What should happen
4. **Actual behavior:** What actually happens
5. **Logs:** Error messages, stack traces

---

## Security

- Never commit API keys or credentials
- Use environment variables for sensitive data
- Report security issues privately

---

## Questions?

- Check existing documentation in `docs/`
- Review closed issues for similar questions
- Open a new issue with the "question" label

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to CodeRef Core!**
