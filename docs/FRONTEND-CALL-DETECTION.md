# Frontend Call Detection & Generation

> ## Status — read this first
>
> **Updated 2026-07-31 (WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001).** Between March 2026 and this update, everything described below was **built but unreachable**: the detectors, parsers, matcher and validator all existed and were integration-tested, but their only producer (`saveIndex` / `scanCodebase`) lost its production call site when `PipelineOrchestrator` replaced the legacy scan. `.coderef/routes.json` went stale, `.coderef/frontend-calls.json` stopped being written, and `coderef-validate-routes` exited 2. Three things below were therefore wrong, and are now corrected:
>
> 1. **The producer is `populate-coderef <path> --mode full`.** It emits `.coderef/routes.json` and `.coderef/frontend-calls.json` on its existing single pass. The `scanCurrentElements` + `saveIndex` recipes some sections still show are the DEAD path — they no longer run in production.
> 2. **Seven frameworks are supported, not four:** Flask, FastAPI, Express, Next.js (App + Pages Router), SvelteKit, Nuxt, and Remix.
> 3. **The two CLIs were renamed** to `coderef-validate-routes` and `coderef-scan-frontend-calls`. The old names still work for one minor version and print a deprecation notice.
>
> **New in this release:** an HTTP endpoint is now a first-class **graph node** (`@Endpoint/<path>#<METHOD>`), so `what_calls`, `impact_of` and `path_between` cross the network boundary — a handler change surfaces the CLIENTS that call it, not just the modules that import it. The same surface is available as the `api_surface` MCP tool and the `api` block of `.coderef/map/data.json`. See [CLI.md](./CLI.md#coderef-validate-routes).
>
> **Known bounds, stated rather than implied:**
> - Each detector reports at most **one route per file**, so a single Express file declaring thirty routes yields one endpoint. Every count here is a **lower bound** on the real surface.
> - Frontend-call detection gates on browser-reachable file extensions, so **server-to-server HTTP calls are invisible**. An endpoint with no detected caller means NO CALLER WAS FOUND IN THIS REPO — never that none exists.
> - Route detection reads comment-blanked content and skips test files, because a route mentioned in a JSDoc `@example` or asserted in a fixture is documentation, not an exposed endpoint.

---

**Part of WO-ROUTE-VALIDATION-ENHANCEMENT-001**

## Overview

This module automatically detects frontend API calls in your codebase and generates `frontend-calls.json` for route validation.

## Quick Start

### CLI Usage (Recommended)

```bash
# Scan project and generate frontend-calls.json
npx coderef-scan-frontend-calls

# Custom options
npx coderef-scan-frontend-calls --project-dir ./my-app --output ./custom/calls.json

# Scan only TypeScript files
npx coderef-scan-frontend-calls --extensions .ts,.tsx
```

### Programmatic Usage

```typescript
import { saveFrontendCalls } from '@coderef/core';

// Generate frontend-calls.json
await saveFrontendCalls('./my-project');
// Creates: .coderef/frontend-calls.json

// Custom output path
await saveFrontendCalls('./my-project', './output/calls.json');

// Scan only specific extensions
await saveFrontendCalls('./my-project', undefined, ['.ts', '.tsx']);
```

## What It Detects

### 1. Fetch API
```typescript
// Static paths (100% confidence)
fetch('/api/users')
fetch('/api/users', { method: 'POST' })

// Template literals (80% confidence)
fetch(`/api/users/${id}`)
```

### 2. Axios
```typescript
axios.get('/api/users')
axios.post('/api/users', data)
axios.put('/api/users/123')
axios.delete('/api/users/123')
axios.patch('/api/users/123')
```

### 3. React Query
```typescript
useQuery({ queryKey: ['/api/users'], queryFn })
useMutation({ mutationFn: () => fetch('/api/users') })
```

### 4. Custom API Clients
```typescript
// Detects common patterns: api.*, apiClient.*, client.*, http.*
api.get('/users')
apiClient.post('/users')
client.put('/users')
httpClient.delete('/users')
```

## Output Format

### frontend-calls.json Structure

```json
{
  "totalCalls": 42,
  "byType": {
    "fetch": [
      {
        "path": "/api/users",
        "method": "GET",
        "file": "src/components/UserList.tsx",
        "line": 15,
        "callType": "fetch",
        "confidence": 100
      }
    ],
    "axios": [...],
    "reactQuery": [...],
    "custom": [...]
  },
  "calls": [
    // All calls as flat array, sorted by path
  ],
  "metadata": {
    "generatedAt": "2024-01-15T10:30:00.000Z",
    "projectPath": "/path/to/project",
    "scanVersion": "1.0.0"
  }
}
```

## Complete Workflow

### Step 1: Generate Frontend Calls

```bash
npx coderef-scan-frontend-calls
```

**Output:**
```
🔍 Scanning for frontend API calls...

Project: /path/to/project

✅ Frontend calls scanned successfully!

📊 Summary:
  Total calls found: 42

  By type:
    - fetch():      18
    - axios:        12
    - React Query:  8
    - Custom:       4

📁 Output saved to: /path/to/project/.coderef/frontend-calls.json

💡 Next steps:
  1. Review the generated frontend-calls.json
  2. Run route validation:
     coderef-validate-routes --project-dir /path/to/project
```

### Step 2: Validate Routes

```bash
npx coderef-validate-routes --project-dir ./my-project --fail-on-critical
```

See [ROUTE-VALIDATION.md](./ROUTE-VALIDATION.md) for full validation guide.

## Advanced Usage

### Count Calls Without Full Processing

```typescript
import { countFrontendCalls } from '@coderef/core';

const count = await countFrontendCalls('./my-project');
console.log(`Found ${count} API calls`);
```

### Get Output Without Saving

```typescript
import { generateFrontendCallsOutput } from '@coderef/core';

const output = await generateFrontendCallsOutput('./my-project');
console.log(`Fetch calls: ${output.byType.fetch?.length || 0}`);
console.log(`Axios calls: ${output.byType.axios?.length || 0}`);
```

### Attach Calls to Existing Elements

```typescript
import { scanCurrentElements, attachFrontendCalls } from '@coderef/core';

// Scan codebase
const elements = await scanCurrentElements('./src', ['ts', 'tsx']);

// Attach frontend call metadata
const enriched = await attachFrontendCalls(elements);

// Now elements have .frontendCall property if they contain API calls
enriched.forEach(element => {
  if (element.frontendCall) {
    console.log(`${element.name} calls ${element.frontendCall.path}`);
  }
});
```

## Confidence Scoring

| Pattern | Confidence | Example |
|---------|-----------|---------|
| Static string | 100% | `fetch('/api/users')` |
| Template literal | 80% | ``fetch(`/api/users/${id}`)`` |
| Variable | N/A (skipped) | `fetch(url)` |

## File Filtering

**Default Extensions:**
- `.js`, `.jsx`, `.ts`, `.tsx`, `.vue`

**Excluded Directories:**
- `node_modules/`
- `dist/`, `build/`, `out/`
- `.git/`, `.next/`, `.cache/`
- `.vscode/`, `.idea/`
- Any directory starting with `.`

## Integration with Route Validation

The generated `frontend-calls.json` is used by the route validation tool:

```bash
# Complete workflow
npx coderef-scan-frontend-calls                  # Generate frontend-calls.json
npx coderef-validate-routes --fail-on-critical   # Validate against routes.json

# CI/CD pipeline
coderef-scan-frontend-calls && coderef-validate-routes --fail-on-critical || exit 1
```

## Programmatic API Reference

### saveFrontendCalls()

```typescript
async function saveFrontendCalls(
  projectPath: string,
  outputPath?: string,
  extensions?: string[]
): Promise<string>
```

Scans project for frontend calls and saves to file.

**Returns:** Path where frontend-calls.json was saved

### generateFrontendCallsOutput()

```typescript
async function generateFrontendCallsOutput(
  projectPath: string,
  extensions?: string[]
): Promise<FrontendCallsOutput>
```

Generates frontend calls output without saving to file.

**Returns:** Formatted frontend calls data

### countFrontendCalls()

```typescript
async function countFrontendCalls(
  projectPath: string,
  extensions?: string[]
): Promise<number>
```

Quick count of frontend calls without full processing.

**Returns:** Number of API calls detected

### scanProjectForFrontendCalls()

```typescript
async function scanProjectForFrontendCalls(
  projectPath: string,
  extensions?: string[]
): Promise<FrontendCall[]>
```

Low-level function to scan project and return raw call data.

**Returns:** Array of FrontendCall objects

### attachFrontendCalls()

```typescript
async function attachFrontendCalls(
  elements: ElementData[]
): Promise<ElementData[]>
```

Attaches frontend call metadata to existing elements.

**Returns:** Elements with `.frontendCall` property added

## Troubleshooting

### No Calls Detected

**Possible causes:**
1. No API calls in scanned files
2. API calls use unsupported patterns (e.g., dynamic URLs from variables)
3. Wrong file extensions specified
4. Files in excluded directories

**Solutions:**
- Review the code manually
- Use custom extensions: `--extensions .ts,.tsx`
- Check if calls match supported patterns

### Low Confidence Scores

Template literals with dynamic segments get 80% confidence:
```typescript
// 80% confidence
fetch(`/api/users/${userId}`)  // Detected as /api/users/{id}

// 100% confidence
fetch('/api/users/' + userId)  // Not detected (dynamic)
```

### Missing Custom API Clients

If your custom client isn't detected, check if it matches these patterns:
- `api.*`
- `apiClient.*`
- `client.*`
- `http.*`
- `httpClient.*`
- `request.*`

If not, consider renaming or use standard fetch/axios.

## CLI Options

```
coderef-scan-frontend-calls [OPTIONS] [PROJECT_DIR]

OPTIONS:
  -p, --project-dir <path>     Project directory to scan (default: current directory)
  -o, --output <path>          Output file path (default: .coderef/frontend-calls.json)
  -e, --extensions <exts>      Comma-separated file extensions (default: .js,.jsx,.ts,.tsx,.vue)
  -h, --help                   Show help message

EXAMPLES:
  coderef-scan-frontend-calls
  coderef-scan-frontend-calls /path/to/project
  coderef-scan-frontend-calls --output ./custom.json
  coderef-scan-frontend-calls --extensions .ts,.tsx
```

## See Also

- [Route Validation Guide](./ROUTE-VALIDATION.md) - Complete route validation workflow
- [Route Detection Guide](./ROUTE-DETECTION.md) - Backend route detection (routes.json)
- [Package README](../README.md) - Main package documentation
