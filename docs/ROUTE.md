# API Route Detection and Validation

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

Complete guide for detecting and validating API routes across multiple frameworks.

---

## Overview

The CodeRef scanner automatically detects and validates API route definitions across seven frameworks:

- **Flask** (Python) - `@app.route()`, `@blueprint.route()`
- **FastAPI** (Python) - `@app.get()`, `@app.post()`, etc.
- **Express** (Node.js) - `app.get()`, `router.post()`, etc.
- **Next.js** (React) - App Router file-based routing

Route metadata is extracted during scanning and saved to:
- `.coderef/index.json` - Individual elements with route metadata
- `.coderef/routes.json` - Grouped route inventory by framework

---

## Part 1: Route Detection

### Quick Start

```bash
# Build the CLI first
npm run build:cli

# Scan for routes
npx coderef-scan --project-dir ./src --lang py,js,ts

# Generate routes report
npx coderef-validate-routes --project-dir ./src
```

**Programmatic Usage:**

```typescript
import { scanCurrentElements } from './dist/src/index.js';
import { generateRoutes } from './dist/src/generator/index.js';

// Scan project for routes
const elements = await scanCurrentElements('/my/project', ['py', 'js', 'ts']);

// Generate routes.json
const routes = generateRoutes(elements, '/my/project');

console.log(`Found ${routes.totalRoutes} routes`);
console.log(`Frameworks: ${Object.keys(routes.byFramework).join(', ')}`);
```

**Output:**
```
Found 15 routes
Frameworks: flask, express, nextjs
```

---

### Supported Frameworks

#### Flask (Python)

Detects:
- `@app.route()` decorators
- `@blueprint.route()` decorators
- Route parameters (`<param>`, `<int:param>`)
- HTTP methods (GET, POST, PUT, DELETE, PATCH)

```python
@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify(users)

@app.route('/api/users/<int:id>', methods=['GET'])
def get_user(id):
    return jsonify(user)
```

#### FastAPI (Python)

Detects:
- `@app.get()`, `@app.post()`, etc.
- Path parameters
- Query parameters
- Request/Response models

```python
@app.get("/api/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
```

#### Express (Node.js)

Detects:
- `app.get()`, `app.post()`, etc.
- `router.get()`, `router.post()`, etc.
- Route parameters (`:id`)
- Middleware chains

```javascript
app.get('/api/users', (req, res) => {
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  res.json(user);
});
```

#### Next.js (React)

Detects:
- App Router file-based routing
- Route handlers (`route.ts`, `route.js`)
- Dynamic segments (`[id]`, `[...slug]`)

```typescript
// app/api/users/route.ts
export async function GET() {
  return Response.json(users);
}

// app/api/users/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return Response.json(user);
}
```

---

### Route Metadata

Each detected route includes:

```typescript
{
  "type": "route",
  "name": "get_users",
  "file": "src/routes/users.py",
  "line": 15,
  "route": {
    "path": "/api/users",
    "method": "GET",
    "framework": "flask",
    "parameters": [],
    "handler": "get_users"
  }
}
```

---

## Part 2: Route Validation

### Validation Rules

The validation system checks for:

1. **Path Format Consistency**
   - Leading slashes required
   - No trailing slashes (configurable)
   - Valid parameter syntax

2. **HTTP Method Validation**
   - Standard methods: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
   - Case sensitivity
   - Duplicate method+path combinations

3. **Parameter Naming**
   - Consistent naming conventions
   - No reserved keywords
   - Valid characters only

4. **Duplicate Detection**
   - Same path + method combinations
   - Case-insensitive path duplicates
   - Parameter vs static path conflicts

5. **Handler Verification**
   - Handler function exists
   - Proper async/await usage
   - Return type validation (optional)

---

### Using the Validation CLI

```bash
# Basic validation
npx coderef-validate-routes --project-dir ./src

# Strict mode (fails on warnings)
npx coderef-validate-routes --project-dir ./src --strict

# Auto-fix issues where possible
npx coderef-validate-routes --project-dir ./src --fix

# Output to file
npx coderef-validate-routes --project-dir ./src --output ./route-report.json
```

### Validation Output

```
Route Validation Report
======================
✓ Valid routes: 42
⚠ Warnings: 3
✗ Errors: 1

Errors:
  - src/routes/user.ts:23: Duplicate route '/api/users/:id'
    Method: GET conflicts with src/routes/users.ts:45

Warnings:
  - src/routes/api.py:12: Route path missing leading slash
    Current: 'api/health' → Should be: '/api/health'
  - src/routes/legacy.js:34: Deprecated handler pattern
```

---

### Configuration

Create `.coderef/route-validation.json`:

```json
{
  "rules": {
    "pathFormat": {
      "requireLeadingSlash": true,
      "allowTrailingSlash": false,
      "caseSensitive": false
    },
    "methods": {
      "allowed": ["GET", "POST", "PUT", "DELETE", "PATCH"],
      "requireUppercase": true
    },
    "parameters": {
      "namingConvention": "camelCase",
      "requireTypeAnnotation": true
    }
  },
  "exclude": [
    "**/test/**",
    "**/node_modules/**"
  ]
}
```

---

### Programmatic Validation

```typescript
import { validateRoutes } from './dist/src/validator/index.js';

const result = await validateRoutes({
  dir: './src',
  strict: true,
  rules: {
    pathFormat: { requireLeadingSlash: true }
  }
});

if (!result.valid) {
  console.log('Validation failed:');
  result.errors.forEach(error => {
    console.log(`  - ${error.file}:${error.line}: ${error.message}`);
  });
}
```

---

## Troubleshooting

### Common Issues

**Issue:** Routes not detected
- Ensure file extensions are included in scan (`--lang py,js,ts`)
- Check that decorators are using standard syntax
- Verify the scanner supports your framework version

**Issue:** Duplicate route errors
- Use route prefixing for nested routers
- Check for copy-pasted route definitions
- Review blueprints/router modularization

**Issue:** Validation false positives
- Add excludes for test files
- Adjust strictness level
- File an issue if the validator is incorrect

---

## See Also

- [CLI Reference](./CLI.md) - All CLI commands
- [Scanner Guide](./SCANNER.md) - How scanning works
- [API Reference](./API.md) - Programmatic API
