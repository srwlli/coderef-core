---
skill_name: -coderef-core-quickstart
version: 1.0.0
category: WORKFLOW
description: > Core scanning and analysis library for the CodeRef Dashboard ecosystem
project_type: node
generated_at: 2026-04-20T08:54:31.095Z
prerequisites: ["Node.js >= 18"]
time_estimate: 5-10 minutes
success_indicator: "All services respond on health endpoints"
---

# -coderef-core — Quick Start

> Core scanning and analysis library for the CodeRef Dashboard ecosystem

## When to Use

This guide is for getting -coderef-core running locally for development or testing. Follow these steps to install dependencies, start services, and verify everything is working.

## Prerequisites

- [ ] Node.js >= 18 installed (run: `node --version`)

## Environment Setup

<!-- NOTE: No environment variables discovered. If the project requires .env, add vars here. -->

## Steps

### Step 1: Install Dependencies

**Input:** Project root (`C:\Users\willh\Desktop\CODEREF\DASHBOARD\packages\coderef-core`)
**Action:** npm install
**Output:** Dependencies installed
**Verify:** `npm list`

### Step 2: Build Project

**Input:** Project root, installed dependencies
**Action:** `pnpm build`
**Output:** Compiled JavaScript in `dist/` directory
**Verify:** `ls dist/index.js` exists

### Step 3: Run Tests

**Input:** Built project
**Action:** `pnpm test`
**Output:** Test results (35+ tests)
**Verify:** All tests pass (✓ 35 passed)

### Step 4: Confirm Ready

**Input:** Built project, passing tests
**Action:** Import library in your project
**Output:** `const { scanProject } = require('@coderef/core')`
**Verify:** No module resolution errors

## Library Usage

This is a core library package, not a service. Import and use in your projects:

```javascript
import { scanProject, saveIndex } from '@coderef/core';

const elements = await scanProject('./src', ['ts', 'tsx']);
await saveIndex('./my-project', elements);
```

## Available CLI Commands

| Command | Purpose |
|---------|---------|
| `populate-coderef` | Scan and populate .coderef/ directory |
| `validate-routes` | Validate API route definitions |
| `scan-frontend-calls` | Detect frontend API calls |
| `rag-index` | Build RAG index for codebase |
| `rag-search` | Search codebase using RAG |
| `rag-status` | Check RAG index status |

## Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start TypeScript watch mode |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |

## Common Issues

### Build fails
**Symptom:** `Cannot find module` or `tsc` errors
**Fix:** Run `pnpm install` to ensure all dependencies are installed

### Test failures
**Symptom:** Tests fail with import errors
**Fix:** Run `pnpm build` first - tests require compiled JavaScript

## Example Output

```text
> pnpm test
 RUN  v4.0.16
 ✓ src/fileGeneration/__tests__/index-storage.test.ts (35 tests) 158ms
 ✓ src/fileGeneration/__tests__/saveIndex.test.ts (10 tests)
 ...
 Test Files  5 passed (5)
      Tests  120 passed (120)
```

## Next Steps

- Review the API documentation in `docs/API.md`
- Explore the scanner modules in `src/scanner/`
- Check example usage in `examples/` directory
- Read `README.md` for architectural overview

## See Also

- Project documentation: `README.md`
- Service API docs: Individual service `/docs` endpoints
- Environment variables: Check `.env.example` for configuration options
