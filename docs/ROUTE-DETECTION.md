# API Route Detection Guide

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

**WO-API-ROUTE-DETECTION-001**

Multi-framework API route detection for Flask, FastAPI, Express, and Next.js applications.

---

## Overview

The CodeRef scanner automatically detects API route definitions across seven frameworks:

- **Flask** (Python) - `@app.route()`, `@blueprint.route()`
- **FastAPI** (Python) - `@app.get()`, `@app.post()`, etc.
- **Express** (Node.js) - `app.get()`, `router.post()`, etc.
- **Next.js** (React) - App Router file-based routing

Route metadata is extracted during scanning and saved to:
- `.coderef/index.json` - Individual elements with route metadata
- `.coderef/routes.json` - Grouped route inventory by framework

---

## Quick Start

```typescript
import { scanCurrentElements } from '@coderef/core';
import { generateRoutes } from '@coderef/core/generator';

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

## Supported Frameworks

### Flask (Python)

**Detects:**
- `@app.route('/path')` - Application routes
- `@bp.route('/path')` - Blueprint routes
- Methods: `methods=['GET', 'POST']` parameter
- Path parameters: `/users/<int:user_id>`

**Example:**
```python
from flask import Flask, Blueprint

app = Flask(__name__)
auth_bp = Blueprint('auth', __name__)

@app.route('/users')
def get_users():
    return []

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    return {}
```

**Extracted Metadata:**
```json
{
  "path": "/users",
  "methods": ["GET"],
  "framework": "flask",
  "blueprint": undefined
}
```

```json
{
  "path": "/login",
  "methods": ["GET", "POST"],
  "framework": "flask",
  "blueprint": "auth_bp"
}
```

---

### FastAPI (Python)

**Detects:**
- `@app.get('/path')` - GET routes
- `@app.post('/path')` - POST routes
- `@app.put('/path')` - PUT routes
- `@app.delete('/path')` - DELETE routes
- `@app.patch('/path')` - PATCH routes
- Path parameters: `/items/{item_id}`

**Example:**
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items")
async def read_items():
    return []

@app.post("/items")
async def create_item(item: Item):
    return item

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {}
```

**Extracted Metadata:**
```json
{
  "path": "/items",
  "methods": ["GET"],
  "framework": "fastapi"
}
```

---

### Express (Node.js)

**Detects:**
- `app.get('/path', handler)` - Application routes
- `router.post('/path', handler)` - Router routes
- Methods: `get`, `post`, `put`, `delete`, `patch`
- Path parameters: `/users/:id`

**Example:**
```javascript
const express = require('express');
const app = express();
const router = express.Router();

app.get('/users', (req, res) => {
  res.json([]);
});

app.post('/users', (req, res) => {
  res.json({});
});

router.get('/login', authMiddleware, loginHandler);
```

**Extracted Metadata:**
```json
{
  "path": "/users",
  "methods": ["GET"],
  "framework": "express",
  "blueprint": undefined
}
```

```json
{
  "path": "/login",
  "methods": ["GET"],
  "framework": "express",
  "blueprint": "router"
}
```

---

### Next.js App Router (React)

**Detects:**
- File-based routing: `app/api/*/route.{ts,js,tsx,jsx}`
- Named exports: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Dynamic routes: `[id]`, `[...slug]`

**Example:**
```typescript
// app/api/users/route.ts
export async function GET() {
  return Response.json({ users: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ created: true });
}
```

**Extracted Metadata:**
```json
{
  "path": "/api/users",
  "methods": ["GET", "POST"],
  "framework": "nextjs"
}
```

**Dynamic Route Example:**
```typescript
// app/api/boards/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  return Response.json({ id: params.id });
}
```

**Extracted Metadata:**
```json
{
  "path": "/api/boards/[id]",
  "methods": ["GET"],
  "framework": "nextjs"
}
```

---

## Output Format

### routes.json Structure

```json
{
  "totalRoutes": 12,
  "byFramework": {
    "flask": [
      {
        "name": "get_users",
        "file": "app.py",
        "line": 10,
        "route": {
          "path": "/users",
          "methods": ["GET"],
          "framework": "flask"
        }
      }
    ],
    "fastapi": [...],
    "express": [...],
    "nextjs": [...]
  },
  "metadata": {
    "generatedAt": "2026-02-28T12:00:00.000Z",
    "projectPath": "/my/project",
    "scanVersion": "1.0.0"
  }
}
```

### Route Element Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Function/handler name |
| `file` | string | Absolute file path |
| `line` | number | Line number in file |
| `route.path` | string | Route path pattern |
| `route.methods` | string[] | HTTP methods (uppercase) |
| `route.framework` | string | `'flask'` \| `'fastapi'` \| `'express'` \| `'nextjs'` |
| `route.blueprint` | string? | Blueprint/router name (Flask, Express) |

---

## Usage Examples

### 1. Find All GET Routes

```typescript
import { generateRoutes } from '@coderef/core/generator';

const routes = generateRoutes(elements);

// Collect all GET routes across frameworks
const getRoutes = [];
for (const framework of Object.values(routes.byFramework)) {
  const gets = framework.filter(r => r.route.methods.includes('GET'));
  getRoutes.push(...gets);
}

console.log(`Found ${getRoutes.length} GET endpoints`);
```

### 2. Find Routes by Path Pattern

```typescript
// Find all user-related routes
const userRoutes = [];
for (const framework of Object.values(routes.byFramework)) {
  const matches = framework.filter(r =>
    r.route.path.includes('/users') ||
    r.route.path.includes('/user')
  );
  userRoutes.push(...matches);
}
```

### 3. Generate API Documentation

```typescript
function generateApiDocs(routes) {
  let markdown = '# API Routes\n\n';

  for (const [framework, routeList] of Object.entries(routes.byFramework)) {
    markdown += `## ${framework.toUpperCase()}\n\n`;

    for (const route of routeList) {
      const methods = route.route.methods.join(', ');
      markdown += `- **${methods}** \`${route.route.path}\` - ${route.name}\n`;
      markdown += `  - File: \`${route.file}:${route.line}\`\n\n`;
    }
  }

  return markdown;
}

const docs = generateApiDocs(routes);
console.log(docs);
```

**Output:**
```markdown
# API Routes

## FLASK

- **GET** `/users` - get_users
  - File: `app.py:10`

- **GET, POST** `/login` - login
  - File: `auth.py:25`

## EXPRESS

- **GET** `/api/data` - handler
  - File: `server.js:42`
```

### 4. Migration Planning (Flask → Next.js)

```typescript
function analyzeFlaskRoutes(routes) {
  const flaskRoutes = routes.byFramework.flask || [];

  console.log('Flask Routes to Migrate:\n');

  for (const route of flaskRoutes) {
    const nextjsPath = convertToNextJsPath(route.route.path);
    console.log(`${route.route.path} → ${nextjsPath}`);
    console.log(`  Methods: ${route.route.methods.join(', ')}`);
    console.log(`  Source: ${route.file}:${route.line}\n`);
  }
}

function convertToNextJsPath(flaskPath) {
  // Convert Flask path params to Next.js format
  // /users/<int:id> → /users/[id]
  return flaskPath.replace(/<[^:]+:([^>]+)>/g, '[$1]');
}
```

---

## Advanced Usage

### Custom Route Filtering

```typescript
import { filterRouteElements } from '@coderef/core/generator';

// Get only route elements
const routeElements = filterRouteElements(elements);

// Filter by custom criteria
const publicRoutes = routeElements.filter(el =>
  !el.route.path.includes('/admin') &&
  !el.route.path.includes('/internal')
);
```

### Framework-Specific Analysis

```typescript
// Count routes by framework
const frameworkCounts = {};
for (const [framework, routeList] of Object.entries(routes.byFramework)) {
  frameworkCounts[framework] = routeList.length;
}

console.log('Route Distribution:', frameworkCounts);
// Output: { flask: 8, express: 12, nextjs: 5 }
```

### Route Complexity Analysis

```typescript
// Find routes with most methods (e.g., CRUD endpoints)
const complexRoutes = [];
for (const framework of Object.values(routes.byFramework)) {
  const multi = framework.filter(r => r.route.methods.length > 2);
  complexRoutes.push(...multi);
}

console.log(`Found ${complexRoutes.length} routes with 3+ methods`);
```

---

## Integration with Scanner

Route detection is automatic when scanning:

```typescript
import { scanCurrentElements } from '@coderef/core';
import { saveIndex } from '@coderef/core/fileGeneration';

// Scan project
const elements = await scanCurrentElements('/project', ['py', 'js', 'ts']);

// Save index.json AND routes.json automatically
await saveIndex('/project', elements);

// Both files now exist:
// - /project/.coderef/index.json (all elements with route metadata)
// - /project/.coderef/routes.json (grouped route inventory)
```

---

## Limitations & Known Issues

1. **Flask**: Does not parse dynamic blueprint registration
2. **FastAPI**: Dependency injection parameters not captured
3. **Express**: Middleware chains not fully analyzed
4. **Next.js**: Only detects App Router (not Pages Router)
5. **All**: Route handlers with complex logic not analyzed (only metadata)

---

## Testing

Run tests for route detection:

```bash
npm test -- route-parsers.test.ts
npm test -- generateRoutes.test.ts
npm test -- route-detection-integration.test.ts
```

**Coverage:**
- 60+ test cases
- All 4 frameworks
- Edge cases (blueprints, dynamic routes, mixed projects)

---

## Performance

- **Overhead:** <5% increase in scan time
- **Memory:** ~1KB per detected route
- **File size:** routes.json typically <50KB for 100 routes

---

## Roadmap

- [ ] Pages Router support (Next.js)
- [ ] Django route detection
- [ ] Spring Boot route detection
- [ ] GraphQL endpoint detection
- [ ] Route duplication detection
- [ ] Automatic API documentation generation

---

## References

- [Flask Routing Documentation](https://flask.palletsprojects.com/en/stable/quickstart/#routing)
- [FastAPI Path Operations](https://fastapi.tiangolo.com/tutorial/path-operation/)
- [Express Routing Guide](https://expressjs.com/en/guide/routing.html)
- [Next.js App Router](https://nextjs.org/docs/app/building-your-application/routing)

---

**Version:** 1.0.0
**Last Updated:** 2026-02-28
**Workorder:** WO-API-ROUTE-DETECTION-001
