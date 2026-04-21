# Frontend Call Detection & Generation

**Part of WO-ROUTE-VALIDATION-ENHANCEMENT-001**

## Overview

This module automatically detects frontend API calls in your codebase and generates `frontend-calls.json` for route validation.

## Quick Start

### CLI Usage (Recommended)

```bash
# Scan project and generate frontend-calls.json
npx scan-frontend-calls

# Custom options
npx scan-frontend-calls --project-dir ./my-app --output ./custom/calls.json

# Scan only TypeScript files
npx scan-frontend-calls --extensions .ts,.tsx
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
npx scan-frontend-calls
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
     validate-routes --project-dir /path/to/project
```

### Step 2: Validate Routes

```bash
npx validate-routes --project-dir ./my-project --fail-on-critical
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
npx scan-frontend-calls                  # Generate frontend-calls.json
npx validate-routes --fail-on-critical   # Validate against routes.json

# CI/CD pipeline
scan-frontend-calls && validate-routes --fail-on-critical || exit 1
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
scan-frontend-calls [OPTIONS] [PROJECT_DIR]

OPTIONS:
  -p, --project-dir <path>     Project directory to scan (default: current directory)
  -o, --output <path>          Output file path (default: .coderef/frontend-calls.json)
  -e, --extensions <exts>      Comma-separated file extensions (default: .js,.jsx,.ts,.tsx,.vue)
  -h, --help                   Show help message

EXAMPLES:
  scan-frontend-calls
  scan-frontend-calls /path/to/project
  scan-frontend-calls --output ./custom.json
  scan-frontend-calls --extensions .ts,.tsx
```

## See Also

- [Route Validation Guide](./ROUTE-VALIDATION.md) - Complete route validation workflow
- [Route Detection Guide](./ROUTE-DETECTION.md) - Backend route detection (routes.json)
- [Package README](../README.md) - Main package documentation
