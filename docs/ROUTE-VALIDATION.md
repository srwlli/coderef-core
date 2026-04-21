# Route Validation Guide

> **WO-ROUTE-VALIDATION-ENHANCEMENT-001** - Comprehensive guide to validating frontend API calls against server routes

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [CLI Usage](#cli-usage)
- [Programmatic API](#programmatic-api)
- [Validation Rules](#validation-rules)
- [Supported Frameworks](#supported-frameworks)
- [Output Files](#output-files)
- [CI/CD Integration](#cicd-integration)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Overview

Route validation ensures your frontend API calls have matching server route handlers, preventing common runtime errors:

### Problems Detected

| Issue Type | Severity | Runtime Error | Description |
|------------|----------|---------------|-------------|
| **Missing Route** | 🔴 Critical | HTTP 404 | Frontend calls endpoint with no server handler |
| **Method Mismatch** | 🔴 Critical | HTTP 405 | Frontend uses wrong HTTP method (POST vs GET) |
| **Unused Route** | 🟡 Warning | Dead Code | Server route never called by frontend |

### Benefits

- ✅ **Prevent 404 Errors** - Catch missing routes before deployment
- ✅ **Prevent 405 Errors** - Detect HTTP method mismatches early
- ✅ **Identify Dead Code** - Find unused server routes for cleanup
- ✅ **Multi-Framework** - Works with Flask, FastAPI, Express, Next.js
- ✅ **Auto-Fix Suggestions** - Get code snippets to fix issues
- ✅ **CI/CD Ready** - Fail builds on critical issues

---

## Quick Start

### 1. Install Package

```bash
npm install @coderef/core
```

### 2. Scan Your Codebase

```bash
# This generates .coderef/routes.json and .coderef/frontend-calls.json
npx coderef scan --project-dir ./my-project
```

### 3. Run Validation

```bash
# Validate routes
npx validate-routes --project-dir ./my-project
```

### 4. Review Results

```
🔍 Starting route validation...

📊 Statistics:
  Frontend API Calls: 45
  Server Routes:      42
  Matched Routes:     40
  Match Rate:         89%

🔍 Issues Found:
  🔴 Critical: 3
  🟡 Warnings: 2
  🔵 Info:     0

⚠️  Critical issues detected! These will cause runtime errors:
  1. No server route found for GET /api/users/profile
     Location: src/pages/profile.tsx:15
  2. No server route found for POST /api/settings
     Location: src/components/Settings.tsx:42
  3. HTTP method mismatch: Frontend calls POST /api/login but server only supports GET
     Location: src/auth/LoginForm.tsx:28

✅ Validation complete
💾 JSON report saved: ./.coderef/route-validation.json
📄 Markdown report saved: ./.coderef/route-validation-report.md
```

---

## How It Works

### 1. Frontend Call Detection

The validator scans your frontend code using AST parsing to detect API calls:

**Supported Patterns:**
```javascript
// Fetch API
fetch('/api/users', { method: 'GET' })
fetch(`/api/users/${id}`)

// Axios
axios.get('/api/users')
axios.post('/api/users', data)

// React Query
useQuery(['users'], () => fetch('/api/users'))
useMutation(() => axios.post('/api/users', data))

// Custom API clients
apiClient.get('/api/users')
api.post('/users')
```

**Confidence Scoring:**
- `100%` - Static string: `fetch('/api/users')`
- `80%` - Template literal: `` fetch(`/api/users/${id}`) ``
- `50%` - Variable (skipped): `fetch(url)`

### 2. Route Normalization

Routes from different frameworks are normalized to a common format:

| Framework | Original | Normalized |
|-----------|----------|------------|
| **Flask** | `/users/<int:id>` | `/users/{id}` |
| **FastAPI** | `/users/{user_id}` | `/users/{user_id}` |
| **Express** | `/users/:id` | `/users/{id}` |
| **Next.js** | `/app/api/users/[id]/route.ts` | `/api/users/{id}` |

### 3. Route Matching

Routes are matched using three strategies:

**Exact Match** (Confidence: 100%)
```
Frontend: /api/users
Server:   /api/users
✅ Match
```

**Dynamic Match** (Confidence: 95%)
```
Frontend: /api/users/{id}
Server:   /api/users/:id  (Express)
✅ Match (normalized to /api/users/{id})
```

**Partial Match** (Confidence: 70%)
```
Frontend: /api/users
Server:   /api/users/{id}
⚠️  Partial match (frontend may use dynamic ID)
```

### 4. Validation Checks

Three validation checks are performed:

1. **Missing Routes** - Frontend calls with no server match
2. **Unused Routes** - Server routes with no frontend calls
3. **Method Mismatches** - Frontend and server use different HTTP methods

---

## CLI Usage

### Basic Commands

```bash
# Validate using .coderef directory
npx validate-routes --project-dir ./my-project

# Validate using explicit file paths
npx validate-routes \
  --frontend-calls ./.coderef/frontend-calls.json \
  --server-routes ./.coderef/routes.json

# Save report to custom location
npx validate-routes --project-dir ./my-project \
  --output ./reports/validation-$(date +%Y%m%d).md
```

### CI/CD Integration

```bash
# Fail build on critical issues (exit code 1)
npx validate-routes --project-dir ./my-project --fail-on-critical

# Use short flags
npx validate-routes -p ./my-project -c -o ./reports/validation.md
```

### CLI Options

| Flag | Short | Description |
|------|-------|-------------|
| `--project-dir <path>` | `-p` | Project root directory (looks for .coderef/) |
| `--frontend-calls <path>` | `-f` | Path to frontend-calls.json file |
| `--server-routes <path>` | `-s` | Path to routes.json file |
| `--fail-on-critical` | `-c` | Exit with code 1 if critical issues found |
| `--output <path>` | `-o` | Output path for markdown report |
| `--help` | `-h` | Show help message |

### Exit Codes

- `0` - Success (no critical issues or `--fail-on-critical` not set)
- `1` - Critical issues found (only when `--fail-on-critical` is set)
- `2` - Invalid arguments or file not found

---

## Programmatic API

### Generate Validation Report

```typescript
import { generateValidationReport } from '@coderef/core';

const report = await generateValidationReport(
  './.coderef/frontend-calls.json',
  './.coderef/routes.json'
);

console.log(`Total Issues: ${report.issues.length}`);
console.log(`Critical: ${report.summary.critical}`);
console.log(`Warnings: ${report.summary.warnings}`);

// Check for specific issue types
const missingRoutes = report.issues.filter(i => i.type === 'missing_route');
const unusedRoutes = report.issues.filter(i => i.type === 'unused_route');
const methodMismatches = report.issues.filter(i => i.type === 'method_mismatch');
```

### Generate Markdown Report

```typescript
import { generateMarkdownReport, saveMarkdownReport } from '@coderef/core';

// Generate markdown string
const markdown = generateMarkdownReport(report);

// Save to file
await saveMarkdownReport(report, './validation-report.md');
```

### Route Normalization

```typescript
import { normalizeRoutePath, NormalizedRoute } from '@coderef/core';

// Normalize Flask route
const flaskRoute = normalizeRoutePath('/users/<int:id>', 'flask');
console.log(flaskRoute.path); // /users/{id}
console.log(flaskRoute.dynamicSegments); // ['id']

// Normalize Express route
const expressRoute = normalizeRoutePath('/users/:id', 'express');
console.log(expressRoute.path); // /users/{id}

// Normalize Next.js route
const nextjsRoute = normalizeRoutePath('/app/api/users/[id]/route.ts', 'nextjs');
console.log(nextjsRoute.path); // /api/users/{id}
```

### Route Matching

```typescript
import { calculateMatchConfidence, findBestMatch } from '@coderef/core';

// Calculate match confidence
const match = calculateMatchConfidence(
  '/api/users/{id}',  // Frontend path
  {
    path: '/api/users/:id',
    dynamicSegments: ['id'],
    methods: ['GET'],
    framework: 'express'
  },
  'GET'
);

console.log(match.matched); // true
console.log(match.confidence); // 95
console.log(match.matchType); // 'dynamic'
console.log(match.methodsMatch); // true
```

### Custom Validation

```typescript
import {
  loadFrontendCalls,
  loadServerRoutes,
  detectMissingRoutes,
  detectUnusedRoutes,
  detectMethodMismatches
} from '@coderef/core';

// Load data
const frontendCalls = await loadFrontendCalls('./.coderef/frontend-calls.json');
const serverRoutes = await loadServerRoutes('./.coderef/routes.json');

// Run specific checks
const missingRoutes = detectMissingRoutes(frontendCalls, serverRoutes);
const unusedRoutes = detectUnusedRoutes(frontendCalls, serverRoutes);
const methodMismatches = detectMethodMismatches(frontendCalls, serverRoutes);

// Combine results
const allIssues = [...missingRoutes, ...unusedRoutes, ...methodMismatches];
```

---

## Validation Rules

### Missing Route Detection

**Rule:** Frontend call has no matching server route

**Example:**
```typescript
// Frontend (src/pages/profile.tsx)
const response = await fetch('/api/users/profile');

// Server routes.json
{
  "byFramework": {
    "express": [
      { "path": "/api/users", "methods": ["GET"] }
      // Missing: /api/users/profile
    ]
  }
}

// Issue
{
  type: 'missing_route',
  severity: 'critical',
  message: 'No server route found for GET /api/users/profile',
  suggestion: 'Add a server route handler for GET /api/users/profile'
}
```

### Unused Route Detection

**Rule:** Server route is never called by frontend

**Example:**
```typescript
// Server routes.json
{
  "byFramework": {
    "express": [
      { "path": "/api/legacy-users", "methods": ["GET"] }
    ]
  }
}

// Frontend - No calls to /api/legacy-users

// Issue
{
  type: 'unused_route',
  severity: 'warning',
  message: 'Server route GET /api/legacy-users is not called by any frontend code',
  suggestion: 'Consider removing this route if it is truly unused'
}
```

### Method Mismatch Detection

**Rule:** Frontend uses different HTTP method than server supports

**Example:**
```typescript
// Frontend (src/components/Login.tsx)
const response = await fetch('/api/login', { method: 'POST' });

// Server routes.json
{
  "byFramework": {
    "express": [
      { "path": "/api/login", "methods": ["GET"] }  // Only GET supported
    ]
  }
}

// Issue
{
  type: 'method_mismatch',
  severity: 'critical',
  message: 'HTTP method mismatch: Frontend calls POST /api/login but server only supports GET',
  suggestion: 'Update frontend to use GET or add POST support to server route'
}
```

---

## Supported Frameworks

### Backend Frameworks

| Framework | Detection | Dynamic Routes | HTTP Methods |
|-----------|-----------|----------------|--------------|
| **Flask** | ✅ `@app.route()`, `@blueprint.route()` | ✅ `<type:param>` | ✅ All methods |
| **FastAPI** | ✅ `@app.get()`, `@app.post()`, etc. | ✅ `{param}` | ✅ All methods |
| **Express** | ✅ `app.METHOD()`, `router.METHOD()` | ✅ `:param` | ✅ All methods |
| **Next.js** | ✅ App Router `route.ts` files | ✅ `[param]` | ✅ Named exports |

### Frontend Frameworks

| Framework | Detection | Confidence |
|-----------|-----------|------------|
| **Vanilla JS** | ✅ `fetch()` API | 100% (static), 80% (template) |
| **Axios** | ✅ `axios.METHOD()` | 100% (static), 80% (template) |
| **React Query** | ✅ `useQuery()`, `useMutation()` | 100% (static), 80% (template) |
| **Custom Clients** | ✅ Configurable patterns | 100% (static), 80% (template) |

---

## Output Files

### route-validation.json

Structured JSON report with all validation results:

```json
{
  "totalFrontendCalls": 45,
  "totalServerRoutes": 42,
  "matchedRoutes": 40,
  "issues": [
    {
      "type": "missing_route",
      "severity": "critical",
      "frontendCall": {
        "path": "/api/users/profile",
        "method": "GET",
        "file": "src/pages/profile.tsx",
        "line": 15,
        "callType": "fetch",
        "confidence": 100
      },
      "message": "No server route found for GET /api/users/profile",
      "suggestion": "Add a server route handler for GET /api/users/profile"
    }
  ],
  "summary": {
    "critical": 3,
    "warnings": 2,
    "info": 0
  }
}
```

### route-validation-report.md

Human-readable markdown report:

````markdown
# Route Validation Report

**Generated:** 2026-01-26T10:30:45Z

---

## Summary

**Total Issues:** 5
- 🔴 Critical: 3
- 🟡 Warnings: 2
- 🔵 Info: 0

**Routes Analysis:**
- Frontend API Calls: 45
- Server Routes: 42
- Matched Routes: 40
- Match Rate: 89%

---

## Issues

### 🔴 Critical Issues

#### 1. [MISSING_ROUTE] No server route found for GET /api/users/profile

**Frontend Call:**
- Path: `GET /api/users/profile`
- Location: src/pages/profile.tsx:15
- Type: fetch
- Confidence: 100%

**Suggestion:** Add a server route handler for GET /api/users/profile or verify the frontend call is correct

---

## Recommendations

- 🔴 **Critical Issues Found:** 3 critical issue(s) require immediate attention.
- 🟡 **Unused Routes:** 2 server route(s) are not called by frontend. Consider removing or documenting them.

---

## Auto-Fix Suggestions

### Missing Routes - Suggested Server Handlers

Add these route handlers to your server:

#### GET /api/users/profile

**Express:**
```javascript
app.get('/api/users/profile', (req, res) => {
  // TODO: Implement GET /api/users/profile
  res.json({ message: 'Not implemented' });
});
```

**Next.js (App Router):**
```typescript
// app/api/users/profile/route.ts
export async function GET() {
  // TODO: Implement GET /api/users/profile
  return Response.json({ message: 'Not implemented' });
}
```

---

## Next Steps

1. Fix critical issues (missing routes and method mismatches)
2. Review warnings (unused routes)
3. Run validation again after fixes
4. Integrate validation into CI/CD pipeline

*Report generated by coderef-core route validation (WO-ROUTE-VALIDATION-ENHANCEMENT-001)*
````

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Route Validation

on: [push, pull_request]

jobs:
  validate-routes:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Scan codebase
        run: npx coderef scan --project-dir .

      - name: Validate routes
        run: npx validate-routes --project-dir . --fail-on-critical

      - name: Upload validation report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: validation-report
          path: ./.coderef/route-validation-report.md
```

### GitLab CI

```yaml
validate-routes:
  stage: test
  script:
    - npm install
    - npx coderef scan --project-dir .
    - npx validate-routes --project-dir . --fail-on-critical
  artifacts:
    when: on_failure
    paths:
      - .coderef/route-validation-report.md
    expire_in: 1 week
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running route validation..."

# Scan codebase
npx coderef scan --project-dir .

# Validate routes
npx validate-routes --project-dir . --fail-on-critical

if [ $? -ne 0 ]; then
  echo "❌ Route validation failed! Fix critical issues before committing."
  echo "See ./.coderef/route-validation-report.md for details."
  exit 1
fi

echo "✅ Route validation passed"
exit 0
```

---

## Examples

### Example 1: Flask + React

```typescript
// Frontend (React)
// src/components/UserList.tsx
const users = await fetch('/api/users');  // ✅ Matches Flask route

// Backend (Flask)
// app.py
@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify(users)

// Validation Result: ✅ No issues
```

### Example 2: Express + Axios (Missing Route)

```typescript
// Frontend (Axios)
// src/services/api.ts
await axios.post('/api/settings', data);  // ❌ No matching route

// Backend (Express)
// routes/settings.js
router.get('/api/settings', (req, res) => {  // Only GET supported
  res.json(settings);
});

// Validation Result:
// 🔴 CRITICAL: No server route found for POST /api/settings
// Suggestion: Add POST handler or change frontend to use GET
```

### Example 3: Next.js (Method Mismatch)

```typescript
// Frontend
// app/dashboard/page.tsx
const data = await fetch('/api/stats', { method: 'PUT' });  // ❌ PUT not supported

// Backend
// app/api/stats/route.ts
export async function GET() {  // Only GET exported
  return Response.json({ stats });
}

// Validation Result:
// 🔴 CRITICAL: HTTP method mismatch - Frontend calls PUT but server only supports GET
```

---

## Troubleshooting

### Issue: "Frontend calls file not found"

**Cause:** `.coderef/frontend-calls.json` doesn't exist

**Solution:**
```bash
# Run frontend call detection first
npx coderef scan --project-dir . --frontend-only
```

### Issue: "False positive: Route marked as unused"

**Cause:** Frontend call uses dynamic variable instead of string literal

**Example:**
```typescript
// This will NOT be detected (variable URL)
const endpoint = '/api/users';
fetch(endpoint);

// This WILL be detected
fetch('/api/users');
```

**Solution:** Use string literals for API calls, or add comments to mark intentional dynamic calls

### Issue: "Template literal not detected"

**Cause:** Complex template expressions may have lower confidence

**Example:**
```typescript
// This is detected (confidence: 80%)
fetch(`/api/users/${id}`);

// This may not be detected (too complex)
fetch(`${baseUrl}/${endpoint}/${resource}`);
```

**Solution:** Extract complex templates into string literals where possible

### Issue: "Validation report is empty"

**Cause:** No API calls or routes detected

**Solution:**
```bash
# Verify detection worked
cat .coderef/frontend-calls.json
cat .coderef/routes.json

# Re-scan with verbose mode
npx coderef scan --project-dir . --verbose
```

### Issue: "Performance is slow on large codebases"

**Cause:** Validating 1000+ routes takes time

**Solution:**
```bash
# Exclude unnecessary directories
npx coderef scan --project-dir . --exclude '**/node_modules/**' --exclude '**/dist/**'

# Use cached results (don't re-scan)
npx validate-routes --frontend-calls ./.coderef/frontend-calls.json --server-routes ./.coderef/routes.json
```

---

## Advanced Usage

### Custom Confidence Thresholds

```typescript
import { detectMissingRoutes, findBestMatch } from '@coderef/core';

// Only report issues with high confidence (>= 80%)
const frontendCalls = await loadFrontendCalls('./.coderef/frontend-calls.json');
const serverRoutes = await loadServerRoutes('./.coderef/routes.json');

const highConfidenceCalls = frontendCalls.filter(call => call.confidence >= 80);
const issues = detectMissingRoutes(highConfidenceCalls, serverRoutes);
```

### Filtering by Framework

```typescript
// Only validate Express routes
const expressRoutes = serverRoutes.filter(route => route.framework === 'express');
const issues = detectMissingRoutes(frontendCalls, expressRoutes);
```

### Custom Report Formatting

```typescript
import { generateValidationReport } from '@coderef/core';

const report = await generateValidationReport(
  './.coderef/frontend-calls.json',
  './.coderef/routes.json'
);

// Generate custom JSON report
const customReport = {
  timestamp: new Date().toISOString(),
  project: 'my-project',
  validation: {
    passed: report.summary.critical === 0,
    criticalIssues: report.issues.filter(i => i.severity === 'critical'),
    matchRate: (report.matchedRoutes / report.totalFrontendCalls) * 100
  }
};

await fs.writeFile('./validation-summary.json', JSON.stringify(customReport, null, 2));
```

---

## Best Practices

### 1. Run Validation Regularly

- ✅ Add to CI/CD pipeline
- ✅ Run before deployments
- ✅ Include in pre-commit hooks

### 2. Fix Critical Issues Immediately

- 🔴 Critical issues cause runtime errors
- 🔴 Should block deployments
- 🔴 Fix before merging PRs

### 3. Review Warnings Periodically

- 🟡 Unused routes may indicate dead code
- 🟡 Clean up unused routes during refactoring
- 🟡 Document intentionally unused routes

### 4. Use String Literals for API Calls

```typescript
// ✅ Good - Will be detected
fetch('/api/users');
fetch(`/api/users/${id}`);

// ❌ Avoid - Will not be detected
const url = '/api/users';
fetch(url);
```

### 5. Keep Reports for Audit Trail

```bash
# Save reports with timestamps
npx validate-routes --project-dir . --output ./reports/validation-$(date +%Y%m%d-%H%M%S).md

# Compare reports over time
diff reports/validation-20260125.md reports/validation-20260126.md
```

---

## Support

- 📧 **Email:** support@coderef.dev
- 💬 **Discord:** [Join our community](https://discord.gg/coderef)
- 🐛 **Issues:** [GitHub Issues](https://github.com/coderef/core/issues)
- 📖 **Docs:** [Official Documentation](https://docs.coderef.dev)

---

**Built with ❤️ by the CodeRef Team**
