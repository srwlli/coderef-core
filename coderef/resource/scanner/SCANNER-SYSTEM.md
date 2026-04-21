---
Agent: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
Date: 2026-01-04
Task: DOCUMENT
---

# Scanner System with Directory Creation — Authoritative Documentation

## Executive Summary

The Scanner System is a three-phase code analysis orchestrator that manages directory structure creation, code scanning, and file population for CodeRef projects. It provides a user interface for selecting projects and configuring which phases to execute (Directories, Scan, Populate), with real-time output streaming via Server-Sent Events (SSE). The system bridges frontend React components with backend Node.js subprocess orchestration, serving as the primary interface for initializing and analyzing CodeRef project structures.

## Audience & Intent

- **Markdown (this document):** Architectural truth for phase execution order, state ownership, selection contracts, and subprocess lifecycle
- **TypeScript (`ProjectListCard.tsx`, `scanExecutor.ts`):** Runtime behavior for UI state management and process orchestration
- **TypeScript Interfaces (`ProjectSelection`):** Compile-time contracts for phase selection
- **Python Scripts (`setup_coderef_dirs.py`, `generate-coderef-directories.py`):** External subprocess execution contracts

---

## 1. Architecture Overview

### System Role

The Scanner System is the **primary interface for CodeRef project initialization and analysis**, responsible for:
- Managing project registration and persistence
- Providing phase selection UI (Directories, Scan, Populate)
- Orchestrating sequential subprocess execution
- Streaming real-time console output to the browser
- Managing scan lifecycle (start, progress, completion, cancellation)

### Component Hierarchy

```
Frontend (Browser)
├── Scanner Page (/scanner)
│   └── ProjectListCard Component
│       ├── Project list with checkboxes
│       ├── Add/Remove project controls
│       └── Selection state management
└── ConsoleTabs Component
    └── Real-time output display (SSE)

Backend (Next.js Server)
├── API Routes
│   ├── GET/POST /api/scanner/projects (CRUD)
│   ├── POST /api/scanner/scan (start scan)
│   └── GET /api/scanner/output (SSE stream)
└── ScanExecutor (lib/scanExecutor.ts)
    ├── Phase 0: runDirectoriesForProject()
    ├── Phase 1: runScanForProject()
    └── Phase 2: runPopulateForProject()

External Subprocesses
├── setup_coderef_dirs.py (Phase 0)
├── @coderef/core scanner (Phase 1 - in-process)
└── generate-coderef-directories.py (Phase 2)
```

### Key Integration Points

1. **Frontend → Backend API:** POST `/api/scanner/scan` with project selections
2. **Backend → Python Scripts:** `child_process.spawn()` for Phase 0 and Phase 2
3. **Backend → TypeScript Core:** Direct function call to `@coderef/core` for Phase 1
4. **Backend → Frontend SSE:** Real-time output streaming via EventEmitter

---

## 2. State Ownership & Source of Truth (Canonical)

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| `projects: ScannerProject[]` | ProjectListCard | UI | API → JSON file | Backend (scanner-projects.json) |
| `selections: Map<string, ProjectSelection>` | ProjectListCard | UI | None (ephemeral) | Frontend component state |
| `selection.directories` | ProjectListCard | UI | None | Frontend checkbox |
| `selection.scan` | ProjectListCard | UI | None | Frontend checkbox |
| `selection.populate` | ProjectListCard | UI | None | Frontend checkbox |
| `currentProcess: ChildProcess` | ScanExecutor | System | None | Backend runtime |
| `status: ScanStatus` | ScanExecutor | System | None (ephemeral) | Backend ScanExecutor instance |
| `outputBuffer: string[]` | ScanExecutor | System | None (1hr retention) | Backend ScanExecutor instance |

### State Precedence Rules

1. **Project List:** Backend JSON file is authoritative. Frontend state is read-only cache.
2. **Phase Selections:** Frontend checkbox state is authoritative. Backend receives selections as payload.
3. **Scan Status:** Backend ScanExecutor is authoritative. Frontend receives status via SSE.
4. **Output Buffer:** Backend ScanExecutor retains output for 1 hour after completion for late-joining SSE clients.

---

## 3. Data Persistence

### Storage Schema

**Backend: `scanner-projects.json`**
```json
{
  "projects": [
    {
      "id": "uuid-v4",
      "name": "project-name",
      "path": "/absolute/path/to/project",
      "addedAt": "2026-01-04T12:00:00.000Z"
    }
  ]
}
```

**Frontend: No persistence** (selections are ephemeral per session)

### Versioning Strategy

- **Not applicable:** No schema versioning (simple JSON structure)
- **Migration:** Not required (projects can be re-added if schema changes)

### Failure Modes & Recovery

| Failure | Recovery Path |
|---------|--------------|
| `scanner-projects.json` missing | Auto-create empty file on first write |
| `scanner-projects.json` corrupted | Return empty array, log error, allow re-adding projects |
| Duplicate project path | Backend rejects with error (path uniqueness enforced) |
| Python subprocess fails | Log error to output buffer, continue to next project |
| SSE connection drops | Client can reconnect and retrieve buffered output (1hr retention) |

---

## 4. State Lifecycle

### Phase Selection Lifecycle

```
1. Initialization
   └── ProjectListCard mounts → loads projects from API
   └── selections Map initialized as empty

2. User Interaction
   └── User checks "Directories" → handleDirectoriesCheckboxChange()
   └── User checks "Scan" → handleScanCheckboxChange()
   └── User checks "Populate" → handlePopulateCheckboxChange()
   └── selections Map updated with { directories, scan, populate }

3. Validation (Implicit)
   └── ActionBar checks if any selections exist
   └── "Scan Projects" button disabled if no selections

4. Transmission
   └── User clicks "Scan Projects" → POST /api/scanner/scan
   └── Payload: { projectPaths: string[], selections: Record<id, ProjectSelection> }

5. Backend Execution
   └── ScanExecutor receives selections
   └── For each project:
       └── Phase 0: if (selection.directories) → runDirectoriesForProject()
       └── Phase 1: if (selection.scan) → runScanForProject()
       └── Phase 2: if (selection.populate) → runPopulateForProject()

6. Cleanup
   └── Scan completes → selections Map cleared (user must re-select for next scan)
```

---

## 5. Behaviors (Events & Side Effects)

### User Behaviors

| Event | Component | Handler | State Change | Side Effect |
|-------|-----------|---------|--------------|-------------|
| Check "Directories" | ProjectListCard | `handleDirectoriesCheckboxChange()` | `selections.set(id, { ...current, directories: true })` | None |
| Check "Scan" | ProjectListCard | `handleScanCheckboxChange()` | `selections.set(id, { ...current, scan: true })` | None |
| Check "Populate" | ProjectListCard | `handlePopulateCheckboxChange()` | `selections.set(id, { ...current, populate: true })` | None |
| Click "Add Path" | ProjectListCard | `handleAddPath()` | None | Opens Electron directory picker → POST /api/scanner/projects |
| Click "Remove" | ProjectListCard | `handleRemove()` | `selections.delete(id)` | DELETE /api/scanner/projects/:id |
| Click "Scan Projects" | ActionBar | `handleScan()` | None | POST /api/scanner/scan with selections payload |

### System Behaviors

| Event | Trigger | Handler | State Change | Side Effect |
|-------|---------|---------|--------------|-------------|
| Projects API response | `useEffect` mount | `loadProjects()` | `setProjects(data)` | None |
| Selection change | Checkbox state update | `onSelectionChange?.(selections)` | Parent component receives selections | ActionBar updates button state |
| Scan start | API route handler | `executor.startScan()` | `status = 'running'` | Emit 'progress' event |
| Subprocess output | `childProcess.stdout` | `emitOutput(line)` | `outputBuffer.push(line)` | SSE broadcast to clients |
| Scan complete | Last project finishes | `emit('complete')` | `status = 'completed'` | Auto-cleanup after 1 hour |

---

## 6. Event & Callback Contracts

### ProjectListCard Callbacks

| Callback | Trigger | Payload | Side Effects |
|----------|---------|---------|--------------|
| `onSelectionChange` | Any checkbox change | `Map<string, ProjectSelection>` | ActionBar re-evaluates button disabled state |
| `onProjectsChange` | Add/Remove project | None | Parent refreshes project-dependent UI |
| `onProjectsLoad` | Initial projects fetch | `ScannerProject[]` | Parent receives project list for validation |

### ScanExecutor Events

| Event | Trigger | Payload | Subscribers |
|-------|---------|---------|-------------|
| `'output'` | Subprocess stdout/stderr | `string` (line) | SSE route handler → broadcasts to all clients |
| `'progress'` | Phase transition | `ScanProgress` | SSE route handler → sends progress updates |
| `'complete'` | All projects scanned | `ScanProgress` | SSE route handler → sends completion event |
| `'error'` | Unrecoverable error | `string` (error message) | SSE route handler → sends error event |

---

## 7. Phase Execution Contracts

### Phase 0: Directories

**Purpose:** Create `.coderef/` and `coderef/` directory structure

**Execution:**
```typescript
await runDirectoriesForProject(projectPath)
```

**Subprocess:**
```bash
python setup_coderef_dirs.py /path/to/project
```

**Script Location:** `packages/coderef-core/scripts/setup-coderef-dir/setup_coderef_dirs.py`

**Output Directories:**
```
.coderef/
├── reports/complexity/
├── diagrams/
└── exports/

coderef/
├── workorder/
├── archived/
├── standards/
├── documents/
├── reference/
├── user/
└── notes/
```

**Exit Codes:**
- `0`: Success
- `1`: Error (path not found, permission denied)
- `null`: Process cancelled

**Failure Behavior:** Log error, continue to Phase 1 (non-blocking)

---

### Phase 1: Scan

**Purpose:** Analyze code elements (functions, classes, imports) using TypeScript AST parsing

**Execution:**
```typescript
await runScanForProject(projectPath)
```

**Implementation:** Direct function call (in-process, no subprocess)
```typescript
const elements = await scanCurrentElements(projectPath, ['ts', 'tsx', 'js', 'jsx'], {
  recursive: true,
  exclude: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**']
});
```

**Output:** None (in-memory analysis, future: write to `.coderef/index.json`)

**Failure Behavior:** Log error, skip Phase 2 for this project, continue to next project

---

### Phase 2: Populate

**Purpose:** Generate 16 CodeRef output files (graph.json, diagrams, reports, exports)

**Execution:**
```typescript
await runPopulateForProject(projectPath)
```

**Subprocess:**
```bash
python generate-coderef-directories.py /path/to/project
```

**Script Location:** `packages/coderef-core/scripts/generate-coderef-directories.py`

**Output Files:** (16 total)
```
.coderef/
├── index.json
├── graph.json
├── context.json
├── context.md
├── reports/
│   ├── patterns.json
│   ├── coverage.json
│   ├── validation.json
│   ├── drift.json
│   └── complexity/README.md
├── diagrams/
│   ├── dependencies.mmd
│   ├── dependencies.dot
│   ├── calls.mmd
│   └── imports.mmd
└── exports/
    ├── graph.json
    ├── graph.jsonld
    └── diagram-wrapped.md
```

**Exit Codes:**
- `0`: Success
- Non-zero: Error (Python not found, script error)
- `null`: Process cancelled

**Failure Behavior:** Log error, continue to next project (non-blocking)

---

## 8. TypeScript Interface Contracts

### ProjectSelection (Authoritative)

```typescript
interface ProjectSelection {
  directories: boolean;  // Phase 0: Create directory structure
  scan: boolean;         // Phase 1: Scan code elements
  populate: boolean;     // Phase 2: Generate output files
}
```

**Rules:**
- All fields are independent (can select any combination)
- Default state: `{ directories: false, scan: false, populate: false }`
- No mutual exclusivity (all three can be true simultaneously)
- Order of execution: Directories → Scan → Populate (regardless of checkbox order)

### ScannerProject

```typescript
interface ScannerProject {
  id: string;        // UUID v4
  name: string;      // Display name (derived from last path segment)
  path: string;      // Absolute file system path
  addedAt: string;   // ISO 8601 timestamp
}
```

### ScanProgress

```typescript
interface ScanProgress {
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  currentProjectIndex: number;
  totalProjects: number;
  currentProjectPath: string | null;
  startedAt: string | null;      // ISO 8601
  completedAt: string | null;    // ISO 8601
  error: string | null;
}
```

---

## 9. Performance Considerations

### Tested Limits

| Metric | Tested | Bottleneck | Mitigation |
|--------|--------|------------|------------|
| Projects per scan | 10 projects | Sequential execution | None (intentional - prevents resource exhaustion) |
| Output buffer size | ~50KB per project | Memory (server) | 1-hour retention, auto-cleanup |
| SSE clients | 5 concurrent | EventEmitter listeners | No limit imposed (Node.js default: 10 warning threshold) |
| Python subprocess spawn time | ~200ms | Python interpreter startup | Cached Python command path |

### Known Bottlenecks

1. **Sequential Project Execution:** Projects are scanned one at a time (not parallel)
   - **Rationale:** Prevents CPU/IO contention, simplifies error handling
   - **Future Optimization:** Parallel execution with concurrency limit (deferred)

2. **Python Subprocess Overhead:** Phase 0 and Phase 2 spawn Python processes
   - **Mitigation Plan:** Migrate to TypeScript implementation (roadmap item)

3. **Output Buffer Growth:** Large projects generate 10-50KB of console output
   - **Current Limit:** None (unbounded buffer)
   - **Future Fix:** Implement circular buffer with 100KB limit

### Deferred Optimizations

- **Parallel project scanning:** Rejected due to complexity of error handling
- **Streaming output compression:** Not worth engineering cost for typical output sizes
- **IndexedDB caching of scan results:** No use case for client-side caching yet

---

## 10. Accessibility

### Current Gaps

| Issue | Severity | Component | Fix Required |
|-------|----------|-----------|--------------|
| Checkboxes lack `aria-label` | Medium | ProjectListCard | Add descriptive labels for screen readers |
| No keyboard shortcut for "Scan Projects" | Low | ActionBar | Add `accessKey` or document keyboard nav |
| Console output not announced | High | ConsoleTabs | Implement `aria-live` region for output updates |
| No focus management after scan starts | Medium | Scanner page | Auto-focus console tab on scan start |

### Required Tasks (Priority Order)

1. **P0:** Add `aria-live="polite"` to console output container
2. **P1:** Add `aria-label` to all checkboxes (e.g., "Enable directory creation for {projectName}")
3. **P1:** Add `aria-busy` state to ActionBar button during scan
4. **P2:** Implement keyboard shortcuts (e.g., `Ctrl+Enter` to start scan)
5. **P2:** Add `role="status"` to progress indicator

---

## 11. Testing Strategy

### Must-Cover Scenarios

**Frontend (ProjectListCard):**
- [ ] Checkbox state updates selections Map correctly
- [ ] Default selection is `{ directories: false, scan: false, populate: false }`
- [ ] Removing project deletes selection from Map
- [ ] `onSelectionChange` callback fires on every checkbox change
- [ ] Add/Remove project triggers API calls

**Backend (ScanExecutor):**
- [ ] Phase 0 runs before Phase 1 when `directories: true`
- [ ] Phase 1 runs before Phase 2 when `scan: true`
- [ ] Phases execute in order: Directories → Scan → Populate
- [ ] Phase 0 error does not block Phase 1
- [ ] Phase 1 error blocks Phase 2 (for same project)
- [ ] Python subprocess failure emits error to output buffer
- [ ] Cancellation kills current subprocess
- [ ] Output buffer retains data for 1 hour after completion

**Integration:**
- [ ] End-to-end: Select all 3 phases → verify all outputs created
- [ ] End-to-end: Select only Directories → verify no scan/populate
- [ ] End-to-end: Multiple projects → verify sequential execution
- [ ] SSE: Client reconnects mid-scan → receives buffered output

### Explicitly Not Tested

- **Python script internals:** Tested separately in `coderef-core/scripts/tests/`
- **Network failures:** No retry logic implemented (out of scope)
- **Concurrent scans:** Not supported (UI disables button during scan)
- **File system permissions:** Delegated to Python scripts (no validation in TypeScript)

---

## 12. Non-Goals / Out of Scope

**Rejected Features:**
- **Parallel project scanning:** Too complex for error handling, sequential is fast enough
- **Scan result caching:** No user request for this, scan is fast enough to re-run
- **Project templates:** Users manage projects manually, no templates needed
- **Custom phase ordering:** Phases must run in order (Directories → Scan → Populate)
- **Phase dependencies UI:** No visual indication of phase dependencies (kept simple)
- **Progress percentage per phase:** Only project-level progress shown
- **Scan history/logs:** Output buffer is ephemeral (1hr retention only)
- **Export scan results:** No export functionality (users access files directly)

**Explicitly Out of Scope:**
- **Authentication/authorization:** No multi-user support
- **Cloud storage integration:** Local file system only
- **Real-time collaboration:** Single-user tool
- **Undo/redo for selections:** Selections are ephemeral

---

## 13. Common Pitfalls & Sharp Edges

### Integration Gotchas

1. **Python Not Found Error:**
   - **Symptom:** Phase 0/2 fail with "command not found"
   - **Cause:** Python not in system PATH
   - **Fix:** Set `PYTHON_COMMAND` env var or install Python
   - **Detection:** Error emitted to output buffer with help text

2. **Script Path Resolution:**
   - **Symptom:** Phase 0 fails with "script not found"
   - **Cause:** Relative path breaks when running from different CWD
   - **Fix:** Use `path.resolve(__dirname, '...')` for absolute paths
   - **Prevention:** All script paths are absolute (already implemented)

3. **Selection State Not Syncing:**
   - **Symptom:** Checkboxes appear checked but scan doesn't run phase
   - **Cause:** `onSelectionChange` callback not wired
   - **Fix:** Ensure parent component passes callback prop
   - **Detection:** Check browser console for callback errors

4. **SSE Connection Timeout:**
   - **Symptom:** Console stops updating mid-scan
   - **Cause:** Browser closes SSE after 2min idle
   - **Mitigation:** ScanExecutor sends periodic progress events (every project)
   - **No Fix Needed:** Current implementation prevents idle timeout

### Configuration Mistakes

1. **Missing `setup_coderef_dirs.py`:**
   - **Error:** `ENOENT: no such file or directory`
   - **Fix:** Ensure script exists at `packages/coderef-core/scripts/setup-coderef-dir/setup_coderef_dirs.py`
   - **Override:** Set `DIRS_SCRIPT_PATH` env var

2. **Wrong Python Version:**
   - **Error:** `SyntaxError: invalid syntax` in script
   - **Requirement:** Python 3.7+
   - **Fix:** Update Python or set `PYTHON_COMMAND` to `python3`

### Edge Cases

1. **Empty Project List:**
   - **Behavior:** "Scan Projects" button always disabled
   - **Fix:** Add at least one project

2. **All Checkboxes Unchecked:**
   - **Behavior:** Scan runs but does nothing (all phases skipped)
   - **Fix:** UI should disable button if no selections (future enhancement)

3. **Project Path Deleted Between Add and Scan:**
   - **Behavior:** Phase 0 fails with "path not found"
   - **Recovery:** Error logged, next project continues
   - **No Fix:** User must remove stale projects manually

4. **Subprocess Killed Externally:**
   - **Behavior:** Process exit code `null` treated as cancellation
   - **Recovery:** Scan continues to next project
   - **Log Message:** "[Directories] Cancelled: {path}"

---

## 14. Maintenance Protocol

### When Adding New Phases

1. Update `ProjectSelection` interface with new field
2. Add checkbox to `ProjectListCard.tsx` in execution order
3. Add handler function `handle{PhaseName}CheckboxChange()`
4. Update default selection objects (3 locations in `ProjectListCard.tsx`)
5. Add phase logic to `ScanExecutor.startScan()` in correct order
6. Implement `run{PhaseName}ForProject()` method
7. Update this resource sheet with new phase contract

### When Modifying Phase Order

**DO NOT** change phase order without updating:
- This documentation (section 7)
- User-facing labels (checkbox order in UI)
- Backend execution sequence in `startScan()`
- Test scenarios

### When Migrating Python Scripts to TypeScript

1. Implement TypeScript equivalent in `@coderef/core`
2. Add feature flag to toggle between Python/TypeScript
3. Test TypeScript implementation with feature flag enabled
4. Remove Python subprocess call
5. Remove Python script file
6. Update this documentation

---

## Conclusion

This resource sheet defines the authoritative contracts for the Scanner System's three-phase execution model (Directories → Scan → Populate). It establishes:

- **State ownership:** Frontend owns selections (ephemeral), backend owns projects (persisted)
- **Execution contracts:** Phase order is fixed, failures are non-blocking
- **Interface contracts:** `ProjectSelection` is the canonical type for phase configuration
- **Integration points:** Python subprocesses for Phase 0/2, TypeScript in-process for Phase 1

**Maintenance Expectations:**
- Update phase execution contracts when adding new phases
- Keep TypeScript interfaces synchronized between frontend and backend
- Document new failure modes and recovery paths as discovered
- Migrate Python scripts to TypeScript when bandwidth allows

**Refactor Safety:**
- Phase order must not change (architectural constraint)
- `ProjectSelection` interface can add fields but not remove existing ones
- Backend subprocess paths must remain absolute (not relative)
- Output buffer retention (1hr) is assumed by SSE clients

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-04
**Maintained By:** CodeRef Development Team
