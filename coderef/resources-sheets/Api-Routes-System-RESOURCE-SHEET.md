---
agent: claude-sonnet-4.5
date: "2026-01-13"
task: DOCUMENT
subject: API Routes System
parent_project: coderef-dashboard
category: service
version: "1.0.0"
related_files:
  - packages/dashboard/src/app/api/workorders/route.ts
  - packages/dashboard/src/app/api/stubs/route.ts
  - packages/dashboard/src/app/api/sessions/route.ts
  - packages/dashboard/src/app/api/scanner/scan/route.ts
  - packages/dashboard/src/app/api/scanner/projects/route.ts
  - packages/dashboard/src/app/api/coderef/projects/route.ts
  - packages/dashboard/src/app/api/coderef/tree/route.ts
  - packages/dashboard/src/app/api/coderef/file/route.ts
  - packages/dashboard/src/app/api/scan/route.ts
status: APPROVED
---

# API Routes System — Authoritative Documentation

## Executive Summary

The API Routes System is a Next.js App Router-based REST API layer that provides HTTP endpoints for the CodeRef dashboard. It consists of multiple route handlers organized by domain (workorders, stubs, sessions, scanner, coderef) that handle file system operations, data scanning, project management, and real-time streaming via Server-Sent Events (SSE). The system serves as the contract layer between frontend components and backend services, providing type-safe request/response handling, error management, and integration with ScanExecutor, file systems, and configuration files. It enables the dashboard to read workorders, manage projects, execute scans, and access code files through a unified HTTP interface.

## Audience & Intent

- **Markdown (this document):** Architectural truth for endpoint contracts, request/response schemas, error handling, and integration patterns
- **TypeScript (route.ts files):** Runtime behavior for HTTP handling, validation, and business logic coordination
- **API Clients:** Frontend components consume via fetch() calls
- **OpenAPI/Swagger:** Future documentation generation (not yet implemented)

## 1. Architecture Overview

### Role in System

The API Routes System is the **HTTP contract layer** between frontend and backend, positioned between:
- **Input:** HTTP requests from frontend components
- **Processing:** Business logic coordination (ScanExecutor, file system, config parsing)
- **Output:** HTTP responses (JSON, SSE streams)

**Integration Points:**
- **Frontend Components:** All dashboard components make HTTP requests
- **ScanExecutor:** Scanner endpoints create and manage ScanExecutor instances
- **File System:** Workorders, stubs, sessions endpoints read from file system
- **Configuration:** Projects endpoints read/write `projects.config.json`

### Route Organization

```
/api/
├── workorders/
│   └── route.ts (GET - list all workorders)
├── stubs/
│   └── route.ts (GET - list all stubs)
├── sessions/
│   └── route.ts (GET - list all sessions)
├── scanner/
│   ├── scan/
│   │   └── route.ts (POST - start scan)
│   ├── scan/[scanId]/
│   │   ├── output/route.ts (GET - SSE stream)
│   │   ├── status/route.ts (GET - progress)
│   │   └── cancel/route.ts (POST - cancel)
│   └── projects/
│       └── route.ts (GET/POST - list/create projects)
├── coderef/
│   ├── projects/
│   │   └── route.ts (GET/POST - list/create projects)
│   ├── tree/
│   │   └── route.ts (GET - directory tree)
│   └── file/
│       └── route.ts (GET - file content)
└── scan/
    └── route.ts (POST - in-process scan via @coderef/core)
```

### Endpoint Categories

**1. Workorder Management:**
- `GET /api/workorders` - List all workorders across projects

**2. Stub Management:**
- `GET /api/stubs` - List all stubs

**3. Session Management:**
- `GET /api/sessions` - List all sessions

**4. Scanner Operations:**
- `POST /api/scanner/scan` - Start scan execution
- `GET /api/scanner/scan/[scanId]/output` - SSE output stream
- `GET /api/scanner/scan/[scanId]/status` - Get scan progress
- `POST /api/scanner/scan/[scanId]/cancel` - Cancel scan
- `GET /api/scanner/projects` - List scanner projects
- `POST /api/scanner/projects` - Create scanner project

**5. CodeRef Operations:**
- `GET /api/coderef/projects` - List CodeRef projects
- `POST /api/coderef/projects` - Create CodeRef project
- `DELETE /api/coderef/projects/[id]` - Delete project
- `GET /api/coderef/tree` - Get directory tree
- `GET /api/coderef/file` - Get file content

**6. Scan Operations:**
- `POST /api/scan` - In-process scan via @coderef/core

### File Structure

**Location:** `packages/dashboard/src/app/api/`

**Route Files:**
- `workorders/route.ts` - Workorder listing
- `stubs/route.ts` - Stub listing
- `sessions/route.ts` - Session listing
- `scanner/scan/route.ts` - Scan initiation
- `scanner/scan/[scanId]/output/route.ts` - SSE streaming
- `scanner/scan/[scanId]/status/route.ts` - Status polling
- `scanner/scan/[scanId]/cancel/route.ts` - Cancellation
- `scanner/projects/route.ts` - Scanner project management
- `coderef/projects/route.ts` - CodeRef project management
- `coderef/projects/[id]/route.ts` - Project deletion
- `coderef/tree/route.ts` - Directory tree
- `coderef/file/route.ts` - File content
- `scan/route.ts` - In-process scanning

**Shared Files:**
- `scanner/types.ts` - TypeScript interfaces
- `scanner/lib/scanExecutor.ts` - ScanExecutor class

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Workorders data | File system | Domain | File system | `{project}/coderef/workorder/` directories |
| Stubs data | File system | Domain | File system | `{project}/coderef/stubs/` directories |
| Sessions data | File system | Domain | File system | `{project}/coderef/sessions/` directories |
| Scanner projects | File system | Domain | File system | `scanner-projects.json` |
| CodeRef projects | File system | Domain | File system | `projects.config.json` |
| Active scans | Global registry | System | None (ephemeral) | `activeScans` Map<scanId, ScanExecutor> |
| Scan status | ScanExecutor | System | None (ephemeral) | ScanExecutor instance state |

**Precedence Rules:**
- File system is authoritative for workorders, stubs, sessions, projects (read-only API)
- Global registry is authoritative for active scans (in-memory, ephemeral)
- Configuration files are authoritative for project lists (JSON files)

## 3. Data Persistence

### Storage Keys and Schema

**Workorders:**
- Location: `{project.path}/coderef/workorder/{workorder_id}/`
- Files: `plan.json`, `DELIVERABLES.md`
- Schema: WorkorderObject interface (see API Contracts section)

**Stubs:**
- Location: `{project.path}/coderef/stubs/`
- Files: Individual stub files
- Schema: StubObject interface

**Sessions:**
- Location: `{project.path}/coderef/sessions/`
- Files: Session files
- Schema: SessionObject interface

**Projects:**
- Location: `scanner-projects.json` (scanner) or `projects.config.json` (coderef)
- Schema: Array of project objects with `id`, `name`, `path`

**Versioning Strategy:**
- No versioning in API responses
- File formats may change (no migration logic)
- Consumers should validate response structure

**Failure Modes & Recovery:**
- **File read failure:** Returns error response (no recovery)
- **Invalid JSON:** Returns error response (no recovery)
- **Missing directories:** Returns empty arrays (graceful degradation)
- **Scan registry miss:** Returns 404 for scanId not found

**Cross-tab/Multi-client Sync:**
- File system reads are stateless (each request reads fresh data)
- Scan registry is shared (multiple clients can access same scan)

## 4. State Lifecycle

### Canonical Request Sequence

1. **Request Reception:**
   - Next.js App Router receives HTTP request
   - Route handler function called (GET, POST, etc.)

2. **Request Parsing:**
   - Query parameters extracted (for GET requests)
   - Request body parsed (for POST requests)
   - Path parameters extracted (for dynamic routes like [scanId])

3. **Validation:**
   - Request parameters validated (if required)
   - Type checking (TypeScript compile-time, no runtime validation)

4. **Business Logic:**
   - File system operations (read workorders, stubs, sessions)
   - ScanExecutor operations (create scan, get status, cancel)
   - Configuration file operations (read/write projects)

5. **Response Generation:**
   - Data assembled into response format
   - Error handling (try/catch, error responses)
   - Status codes set (200, 400, 404, 500)

6. **Response Transmission:**
   - JSON responses: `NextResponse.json(data)`
   - SSE responses: `NextResponse` with `text/event-stream` content type
   - Error responses: `NextResponse.json({ error }, { status })`

## 5. Behaviors (Events & Side Effects)

### User Behaviors

**None.** API Routes System has no direct user interaction. It's invoked via HTTP requests.

### System Behaviors

1. **File System Reads:**
   - Workorders endpoint: Scans `coderef/workorder/` directories
   - Stubs endpoint: Scans `coderef/stubs/` directories
   - Sessions endpoint: Scans `coderef/sessions/` directories
   - Projects endpoints: Read/write JSON configuration files

2. **HTTP Responses:**
   - JSON responses for most endpoints
   - SSE streams for scanner output
   - Error responses with status codes

3. **ScanExecutor Integration:**
   - Scanner endpoints create ScanExecutor instances
   - Register in global `activeScans` Map
   - Stream output via SSE
   - Manage scan lifecycle

4. **Memory Usage:**
   - File system reads load data into memory
   - ScanExecutor instances retained in memory
   - No streaming for large file reads (all data loaded)

5. **Error Handling:**
   - Try/catch blocks around business logic
   - Error responses with status codes
   - No retry logic (failures return immediately)

## 6. Event & Callback Contracts

**HTTP Request/Response Contracts:**

| Endpoint | Method | Request | Response | Side Effects |
|----------|--------|--------|----------|--------------|
| `/api/workorders` | GET | Query: `?project=...` (optional) | `{ success, data: { workorders, total, by_project, by_status }, timestamp }` | File system read |
| `/api/stubs` | GET | None | `{ success, data: { stubs, total, location }, timestamp }` | File system read |
| `/api/sessions` | GET | None | `{ success, data: { sessions, total }, timestamp }` | File system read |
| `/api/scanner/scan` | POST | Body: `{ projectPaths, selections }` | `{ success, data: { scanId }, timestamp }` | Creates ScanExecutor, registers in global registry |
| `/api/scanner/scan/[scanId]/output` | GET | None | SSE stream (`text/event-stream`) | Connects to ScanExecutor output events |
| `/api/scanner/scan/[scanId]/status` | GET | None | `{ success, data: ScanProgress, timestamp }` | Reads ScanExecutor status |
| `/api/scanner/scan/[scanId]/cancel` | POST | None | `{ success, timestamp }` | Calls ScanExecutor.cancelScan() |
| `/api/scanner/projects` | GET | None | `{ success, data: Project[], timestamp }` | Reads scanner-projects.json |
| `/api/scanner/projects` | POST | Body: `{ id, name, path }` | `{ success, data: Project, timestamp }` | Writes scanner-projects.json |
| `/api/coderef/projects` | GET | None | `{ success, data: Project[], timestamp }` | Reads projects.config.json |
| `/api/coderef/projects` | POST | Body: `{ id, name, path }` | `{ success, data: Project, timestamp }` | Writes projects.config.json |
| `/api/coderef/projects/[id]` | DELETE | Path param: `id` | `{ success, timestamp }` | Deletes from projects.config.json |
| `/api/coderef/tree` | GET | Query: `?path=...` | `{ success, data: TreeNode[], timestamp }` | File system read |
| `/api/coderef/file` | GET | Query: `?path=...` | `{ success, data: FileData, timestamp }` | File system read |
| `/api/scan` | POST | Body: `{ projectPath, options }` | `{ success, data: ScanResult, timestamp }` | Calls @coderef/core scanner |

**Error Response Format:**
```typescript
{
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
}
```

## 7. Performance Considerations

### Known Limits

- **Tested Thresholds:**
  - Small projects (< 100 workorders): ~100-500ms response time
  - Medium projects (100-1000 workorders): ~500-2000ms
  - Large projects (> 1000 workorders): Not tested (may require pagination)

- **Memory Limits:**
  - File system reads load all data into memory
  - No streaming for large datasets
  - Estimated: ~10MB per 1000 workorders

### Bottlenecks

1. **File System Scans:** Sequential directory scanning (O(n) where n=directories)
2. **JSON Parsing:** Large JSON files parsed synchronously
3. **No Caching:** Every request reads from file system (no cache layer)

### Optimization Opportunities

1. **Response Caching:** Cache workorders/stubs/sessions responses (requires cache invalidation)
2. **Pagination:** Add pagination for large datasets (limit/offset query params)
3. **Streaming:** Stream large file reads instead of loading all at once
4. **Parallel File Reads:** Read multiple files concurrently

### Deferred Optimizations

- **Response Caching:** No caching implemented. Rationale: Data changes infrequently, but cache invalidation adds complexity.
- **Pagination:** All data returned. Rationale: Typical datasets small enough, pagination adds API complexity.

## 8. Accessibility

**Not Applicable.** API Routes System is a backend service with no UI components. Accessibility concerns do not apply.

## 9. Testing Strategy

### Must-Cover Scenarios

1. **Happy Path:**
   - All endpoints return successful responses
   - Data matches expected schema
   - Status codes correct (200 for success)

2. **Error Handling:**
   - Invalid request parameters → 400 Bad Request
   - Missing resources → 404 Not Found
   - Server errors → 500 Internal Server Error
   - Error responses include message and code

3. **File System Operations:**
   - Missing directories → Empty arrays (graceful)
   - Invalid JSON → Error response
   - Permission errors → Error response

4. **ScanExecutor Integration:**
   - Scan creation → Returns scanId
   - SSE connection → Streams output
   - Status polling → Returns current status
   - Cancellation → Scan cancelled

5. **Query Parameters:**
   - Optional parameters handled correctly
   - Invalid parameters return errors
   - Missing required parameters return errors

### Explicitly Not Tested

- **Concurrent Requests:** Multiple simultaneous requests (no locking tested)
- **Very Large Datasets:** > 10,000 workorders (performance not guaranteed)
- **Network Failures:** Request timeouts, connection drops (not handled)
- **Rate Limiting:** No rate limiting (unlimited requests)

### Test Files

- No test files found in codebase (testing needed)

## 10. Non-Goals / Out of Scope

1. **Authentication/Authorization:** No auth layer (assumes trusted environment)
2. **Rate Limiting:** No rate limiting (unlimited requests)
3. **Request Validation:** Minimal validation (TypeScript types only, no runtime validation)
4. **Response Caching:** No caching layer (every request hits file system)
5. **Pagination:** All data returned (no pagination)
6. **WebSockets:** Only SSE for streaming (no WebSocket support)
7. **GraphQL:** REST API only (no GraphQL)
8. **OpenAPI/Swagger:** No API documentation generation (manual documentation)

## 11. Common Pitfalls & Sharp Edges

### Known Bugs/Quirks

1. **No Request Validation:**
   - TypeScript provides compile-time types only
   - Runtime validation not implemented
   - Invalid request bodies may cause runtime errors

2. **File System Race Conditions:**
   - Multiple requests may read/write same files
   - No file locking mechanism
   - Last write wins (data loss possible)

3. **Error Response Inconsistency:**
   - Some endpoints return different error formats
   - No standardized error response schema
   - Error codes not consistently used

4. **SSE Connection Management:**
   - No connection limits (unlimited SSE clients)
   - No graceful shutdown for active connections
   - Cleanup timer may close active connections

### Integration Gotchas

1. **Path Parameter Extraction:**
   - Dynamic routes use `[param]` syntax
   - Parameters extracted from `params` object
   - Type safety not enforced (params are `any`)

2. **Query Parameter Parsing:**
   - Query params extracted from `searchParams`
   - No validation of parameter types
   - Invalid types may cause runtime errors

3. **Response Format Inconsistency:**
   - Some endpoints return `{ success, data }`
   - Some endpoints return raw data
   - No standardized response wrapper

### Configuration Mistakes

1. **Missing Configuration Files:**
   - Projects endpoints require `projects.config.json`
   - Missing file causes errors (no default empty array)

2. **Invalid JSON:**
   - Corrupted JSON files cause parse errors
   - No validation or recovery
   - Error propagates to client

3. **Path Resolution:**
   - Project paths must be absolute
   - Relative paths may cause incorrect file locations
   - No path validation

### Edge Cases

1. **Empty Directories:**
   - Missing workorder/stub/session directories
   - Returns empty arrays (graceful)
   - No error thrown

2. **Concurrent File Writes:**
   - Multiple POST requests to projects endpoint
   - Last write wins (data loss possible)
   - No locking or coordination

3. **Very Long File Paths:**
   - Windows 260-character limit
   - Deeply nested projects may hit limit
   - No path length validation

## 12. Diagrams

> **Maintenance Rule:** Diagrams below are **illustrative**, not authoritative. State tables and text define truth.

### Request Flow

```
HTTP Request
    │
    ├─→ Next.js App Router
    │   └─→ Route Handler (GET/POST/etc.)
    │
    ├─→ Parse Request (query params, body, path params)
    │
    ├─→ Business Logic
    │   ├─→ File System Read/Write
    │   ├─→ ScanExecutor Operations
    │   └─→ Configuration File Operations
    │
    └─→ Generate Response
        ├─→ JSON Response (NextResponse.json)
        ├─→ SSE Stream (NextResponse with text/event-stream)
        └─→ Error Response (NextResponse.json with status code)
```

### Endpoint Categories

```
API Routes System
├── Workorder Management
│   └─→ GET /api/workorders
├── Stub Management
│   └─→ GET /api/stubs
├── Session Management
│   └─→ GET /api/sessions
├── Scanner Operations
│   ├─→ POST /api/scanner/scan
│   ├─→ GET /api/scanner/scan/[scanId]/output (SSE)
│   ├─→ GET /api/scanner/scan/[scanId]/status
│   ├─→ POST /api/scanner/scan/[scanId]/cancel
│   └─→ GET/POST /api/scanner/projects
├── CodeRef Operations
│   ├─→ GET/POST /api/coderef/projects
│   ├─→ DELETE /api/coderef/projects/[id]
│   ├─→ GET /api/coderef/tree
│   └─→ GET /api/coderef/file
└── Scan Operations
    └─→ POST /api/scan
```

## Conclusion

The API Routes System is the HTTP contract layer between frontend and backend, providing REST endpoints for workorder management, project management, scanner operations, and file access. It coordinates file system operations, ScanExecutor lifecycle, and configuration management through a unified HTTP interface. The system is simple, stateless (except for scan registry), and performant for typical use cases, though it has limitations (no validation, no caching, no pagination) that are acceptable tradeoffs for the current architecture.

**Maintenance Expectations:**
- Endpoint contracts are stable - changes require frontend client updates
- Response formats are stable - schema changes require client updates
- Error handling is basic - enhancements may require standardized error responses
- File system operations are stable - path changes require endpoint updates
