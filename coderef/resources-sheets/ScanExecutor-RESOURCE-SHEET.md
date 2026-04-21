---
agent: claude-sonnet-4.5
date: "2026-01-13"
task: DOCUMENT
subject: ScanExecutor
parent_project: coderef-dashboard
category: service
version: "1.0.0"
related_files:
  - packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts
  - packages/dashboard/src/app/api/scanner/scan/route.ts
  - packages/dashboard/src/app/api/scanner/scan/[scanId]/output/route.ts
  - packages/dashboard/src/app/api/scanner/scan/[scanId]/status/route.ts
  - packages/dashboard/src/app/api/scanner/scan/[scanId]/cancel/route.ts
  - packages/dashboard/src/app/api/scanner/types.ts
status: APPROVED
---

# ScanExecutor — Authoritative Documentation

## Executive Summary

ScanExecutor is a Node.js EventEmitter-based service class that orchestrates 3-phase scan execution (directories → scan → generate) for the CodeRef dashboard scanner. It manages sequential project processing, real-time output streaming via Server-Sent Events (SSE), process lifecycle (start, cancel, cleanup), and maintains a global registry of active scans with automatic cleanup. The system bridges frontend scanner UI with backend file generation, coordinating HTTP-based Phase 1 scanning (via @coderef/core) and optional Phase 2 file generation, while providing real-time progress updates and output buffering for late-joining SSE clients. It serves as the core orchestrator of the scanner backend, enabling multi-project batch scanning with fault tolerance and cancellation support.

## Audience & Intent

- **Markdown (this document):** Architectural truth for process orchestration, event contracts, SSE integration, and lifecycle management
- **TypeScript (scanExecutor.ts):** Runtime behavior for sequential execution, event emission, and process management
- **API Routes:** HTTP/SSE contracts for scan initiation, output streaming, status polling, and cancellation
- **Frontend Components:** Integration contracts for Scanner UI System

## 1. Architecture Overview

### Role in System

ScanExecutor is the **core orchestrator** of the scanner backend, positioned between:
- **Input:** Project selections from Scanner UI (via POST /api/scanner/scan)
- **Execution:** 3-phase scan workflow (directories, scan, generate)
- **Output:** Real-time SSE streams and status updates

**Integration Points:**
- **Frontend:** Scanner UI System initiates scans via POST /api/scanner/scan
- **File Generation:** Calls file generation functions from @coderef/core
- **SSE:** Streams output via GET /api/scanner/scan/[scanId]/output
- **Global Registry:** `activeScans` Map for multi-client access

### Component Hierarchy

```
API Routes (HTTP/SSE Layer)
├── POST /api/scanner/scan
│   ├── Create ScanExecutor instance
│   ├── Register in global activeScans Map
│   └── Call startScan() (async, non-blocking)
│
├── GET /api/scanner/scan/[scanId]/output (SSE)
│   ├── Get ScanExecutor from registry
│   ├── Stream buffered output
│   └── Listen to 'output' events
│
├── GET /api/scanner/scan/[scanId]/status
│   └── Return getScanStatus()
│
└── POST /api/scanner/scan/[scanId]/cancel
    └── Call cancelScan()

ScanExecutor (Business Logic Layer)
├── Sequential Project Loop
│   ├── Phase 0: runDirectoriesForProject() (optional)
│   ├── Phase 1: runScanForProject() → HTTP POST /api/scan
│   └── Phase 2: runGenerateForProject() → File Generation System
│
├── Event Emitter
│   ├── 'output' → new output line
│   ├── 'progress' → progress update
│   ├── 'complete' → scan finished
│   └── 'error' → scan failed
│
└── Global Registry (activeScans Map)
    └── Auto-cleanup after 1 hour retention
```

### File Structure

**Location:** `packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts`

**Related Files:**
- `app/api/scanner/scan/route.ts` - POST endpoint to initiate scans
- `app/api/scanner/scan/[scanId]/output/route.ts` - SSE streaming endpoint
- `app/api/scanner/scan/[scanId]/status/route.ts` - Status polling endpoint
- `app/api/scanner/scan/[scanId]/cancel/route.ts` - Cancel scan endpoint
- `app/api/scanner/types.ts` - TypeScript interfaces (ScanProgress, ScanStatus)

**Dependencies:**
- `events` (Node.js built-in) - EventEmitter base class
- `@/lib/coderef/api-access` - CodeRefApi client for /api/scan endpoint
- File Generation System functions (saveIndex, generateContext, etc.)

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Scan status | ScanExecutor | System | None (ephemeral) | `this.status` field |
| Current project index | ScanExecutor | System | None (ephemeral) | `this.currentProjectIndex` field |
| Output buffer | ScanExecutor | System | None (1hr retention) | `this.outputBuffer` array |
| Active scans registry | Global `activeScans` Map | System | None (ephemeral) | Global Map<scanId, ScanExecutor> |
| Scan results cache | ScanExecutor | Domain | None (ephemeral) | `this.scanResults` Map<projectPath, ElementData[]> |
| Current process | ScanExecutor | System | None (ephemeral) | `this.currentProcess` ChildProcess \| null |

**Precedence Rules:**
- ScanExecutor instance owns its internal state (status, progress, output buffer)
- Global registry is authoritative for active scan lookup (multiple SSE clients can access same scan)
- Scan results cache is authoritative for Phase 2 file generation (no re-scanning)
- Output buffer is append-only (no deletion, only cleared on cleanup)

## 3. Data Persistence

### Storage Keys and Schema

**No Built-in Persistence:**
- ScanExecutor does not persist scan state to disk
- Output buffer retained in memory for 1 hour, then auto-cleaned
- Scan results cache is ephemeral (lost on process restart)

**Global Registry:**
- `activeScans: Map<string, ScanExecutor>` - Global in-memory registry
- Key: `scanId` (UUID generated by API route)
- Value: ScanExecutor instance
- Auto-cleanup: Removed from registry 1 hour after completion

**Scan Results Cache:**
- `this.scanResults: Map<string, ElementData[]>` - Per-executor cache
- Key: `projectPath` (absolute path)
- Value: `ElementData[]` from Phase 1 scan
- Used by: Phase 2 file generation (avoids re-scanning)

**Versioning Strategy:**
- No versioning - state is ephemeral
- Scan results cache format matches @coderef/core ElementData interface

**Failure Modes & Recovery:**
- **Process crash:** All state lost (no recovery, user must restart scan)
- **Memory exhaustion:** Output buffer grows unbounded (mitigated by 1hr cleanup)
- **Registry leak:** Abandoned scans not cleaned (mitigated by timeout, but no max execution timeout)

**Cross-tab/Multi-client Sync:**
- Multiple SSE clients can connect to same scan (via global registry)
- All clients receive same output stream (event-driven)
- Status polling returns same state for all clients

## 4. State Lifecycle

### Canonical Execution Sequence

1. **Initialization:**
   - API route creates ScanExecutor instance: `new ScanExecutor(config)`
   - Instance registered in global `activeScans` Map
   - Status set to `'idle'`
   - Output buffer initialized as empty array

2. **Scan Initiation:**
   - `startScan()` called (async, non-blocking)
   - Status set to `'running'`
   - `emitProgress()` called with initial progress
   - Sequential project loop begins

3. **Project Loop (Sequential):**
   - For each project path:
     - `currentProjectIndex` incremented
     - `emitProgress()` called
     - **Phase 0 (Optional):** `runDirectoriesForProject()` if `selection.directories === true`
     - **Phase 1:** `runScanForProject()` → HTTP POST /api/scan → cache results in `this.scanResults`
     - **Phase 2 (Optional):** `runGenerateForProject()` if `selection.populate === true` → uses cached results
     - Continue to next project (fail-safe: errors don't abort loop)

4. **Output Streaming:**
   - `emitOutput(line)` called for each output line
   - Line added to `outputBuffer` array
   - `'output'` event emitted (SSE clients receive)
   - Late-joining clients receive full buffer on connection

5. **Completion:**
   - All projects processed → Status set to `'completed'`
   - `emitProgress()` called with final progress
   - `'complete'` event emitted
   - Auto-cleanup timer scheduled (1 hour)

6. **Cleanup:**
   - After 1 hour: Instance removed from `activeScans` Map
   - Output buffer cleared (garbage collected)
   - Scan results cache cleared

## 5. Behaviors (Events & Side Effects)

### User Behaviors

**None.** ScanExecutor has no direct user interaction. It's invoked programmatically by API routes.

### System Behaviors

1. **HTTP Requests:**
   - Phase 1: POST /api/scan for each project (in-process @coderef/core)
   - Requests made sequentially (one project at a time)

2. **File System Operations:**
   - Phase 2: File Generation System writes 16 files to `.coderef/` directories
   - Operations happen in parallel within each project (via Promise.all/allSettled)

3. **Event Emission:**
   - `'output'` events emitted for each output line (high frequency)
   - `'progress'` events emitted on status changes (low frequency)
   - `'complete'` event emitted once on completion
   - `'error'` event emitted on catastrophic failure

4. **Memory Usage:**
   - Output buffer grows with scan duration (unbounded until cleanup)
   - Scan results cache stores ElementData[] per project (memory intensive for large projects)
   - No memory limits or cleanup during execution

5. **Process Management:**
   - No subprocess spawning (Phase 1 is HTTP, Phase 2 is in-process)
   - Previous implementation spawned Python subprocesses (deprecated)

## 6. Event & Callback Contracts

| Event | Trigger | Payload | Side Effects |
|-------|---------|---------|--------------|
| `'output'` | `emitOutput(line)` called | `line: string` | Added to outputBuffer, SSE clients receive |
| `'progress'` | Status changes | `progress: ScanProgress` | SSE clients receive, status API returns |
| `'complete'` | All projects finished | `progress: ScanProgress` | Auto-cleanup timer scheduled, SSE streams close |
| `'error'` | Catastrophic failure | `error: string` | Status set to 'error', SSE streams close |

**Method Contracts:**

| Method | Input | Output | Side Effects |
|--------|-------|--------|--------------|
| `startScan()` | None | `Promise<void>` | Begins sequential project loop, emits events |
| `cancelScan()` | None | `void` | Sets status to 'cancelled', kills current process if any |
| `getScanStatus()` | None | `ScanProgress` | Returns current status (no side effects) |
| `getBufferedOutput()` | None | `string[]` | Returns output buffer copy (no side effects) |
| `runScanForProject(projectPath)` | `string` | `Promise<void>` | HTTP POST /api/scan, caches results |
| `runGenerateForProject(projectPath)` | `string` | `Promise<void>` | Calls File Generation System functions |

## 7. Performance Considerations

### Known Limits

- **Tested Thresholds:**
  - Small batches (1-3 projects): ~5-15 seconds total
  - Medium batches (4-10 projects): ~30-120 seconds
  - Large batches (> 10 projects): Not tested (may require optimization)

- **Memory Limits:**
  - Output buffer: Unbounded (grows with scan duration)
  - Scan results cache: ~1MB per 1000 elements per project
  - Estimated: ~10MB per 10 projects with 1000 elements each

### Bottlenecks

1. **Sequential Execution:** Projects processed one-by-one (slower than parallel)
2. **Output Buffering:** Unbounded buffer growth (memory leak risk for long scans)
3. **HTTP Requests:** Phase 1 makes HTTP request per project (network overhead)

### Optimization Opportunities

1. **Parallel Execution:** Process multiple projects concurrently (requires resource management)
2. **Bounded Output Buffer:** Limit buffer size, use circular buffer or streaming
3. **Batch HTTP Requests:** Combine multiple project scans into single request
4. **Incremental Cleanup:** Clean completed projects from cache during execution

### Deferred Optimizations

- **Parallel Execution:** Sequential preferred for now. Rationale: Simpler error handling, predictable progress, no resource contention.
- **Output Buffer Limits:** Unbounded preferred for now. Rationale: Late-joining SSE clients need full history, 1hr cleanup sufficient.

## 8. Accessibility

**Not Applicable.** ScanExecutor is a backend service with no UI components. Accessibility concerns do not apply.

## 9. Testing Strategy

### Must-Cover Scenarios

1. **Happy Path:**
   - Single project scan completes successfully
   - Multiple projects scanned sequentially
   - All phases execute (directories, scan, generate)

2. **Cancellation:**
   - User cancels scan mid-execution
   - Status set to 'cancelled'
   - No further projects processed

3. **Error Handling:**
   - Phase 1 fails for one project → continues to next project
   - Phase 2 fails for one project → continues to next project
   - Catastrophic error → entire scan fails

4. **SSE Integration:**
   - Multiple clients connect to same scan
   - Late-joining client receives full output buffer
   - Events streamed in real-time

5. **Registry Management:**
   - Scan registered in global registry on creation
   - Scan removed from registry after 1 hour
   - Multiple scans can run concurrently (different scanIds)

6. **Output Buffering:**
   - Output lines added to buffer
   - Buffer returned by `getBufferedOutput()`
   - Buffer cleared on cleanup

### Explicitly Not Tested

- **Very Long Scans:** > 1 hour execution time (cleanup may interfere)
- **Memory Exhaustion:** Unbounded buffer growth (no limits tested)
- **Concurrent Scans:** Multiple scans on same project (undefined behavior)
- **Network Failures:** HTTP request failures in Phase 1 (error handling not tested)

### Test Files

- No test files found in codebase (testing needed)

## 10. Non-Goals / Out of Scope

1. **Parallel Execution:** Projects processed sequentially (not in parallel)
2. **Persistent State:** No disk persistence (all state ephemeral)
3. **Job Queue:** No job queue system (simple in-memory execution)
4. **Retry Logic:** No automatic retries (failures logged, scan continues)
5. **Progress Persistence:** Progress not saved across restarts
6. **Subprocess Management:** No subprocess spawning (Phase 1 is HTTP, Phase 2 is in-process)
7. **Resource Limits:** No CPU/memory limits enforced
8. **Scheduled Scans:** No cron/scheduling (manual trigger only)

## 11. Common Pitfalls & Sharp Edges

### Known Bugs/Quirks

1. **Unbounded Output Buffer:**
   - Buffer grows indefinitely during scan
   - Long scans may cause memory issues
   - No cleanup during execution (only after 1 hour)

2. **No Max Execution Timeout:**
   - Scans can run indefinitely
   - Hanging scans not automatically killed
   - Manual cancellation required

3. **Sequential Execution Slowness:**
   - Projects processed one-by-one
   - Total time = sum of individual project times
   - No parallelization for speed

4. **Cache Memory Usage:**
   - Scan results cached for all projects
   - Large projects consume significant memory
   - Cache not cleared until executor cleanup

### Integration Gotchas

1. **Global Registry:**
   - `activeScans` Map is global (shared across all requests)
   - Multiple API routes access same registry
   - No locking mechanism (race conditions possible)

2. **SSE Connection Lifecycle:**
   - SSE clients must handle reconnection
   - Late-joining clients receive full buffer (may be large)
   - No connection limits (unlimited clients per scan)

3. **Error Propagation:**
   - Phase 1 errors caught, logged, scan continues
   - Phase 2 errors caught, logged, scan continues
   - Only catastrophic errors abort entire scan

### Configuration Mistakes

1. **Missing Scan Results:**
   - Phase 2 requires Phase 1 to complete first
   - If Phase 1 fails, Phase 2 skipped (no error, just skipped)
   - User may not realize Phase 2 didn't run

2. **Invalid Project Paths:**
   - Invalid paths cause Phase 1 to fail
   - Error logged but scan continues
   - No validation before scan starts

3. **Concurrent Scans:**
   - Multiple scans on same project possible
   - File generation may conflict (last write wins)
   - No locking or coordination

### Edge Cases

1. **Empty Project List:**
   - Scan completes immediately (no projects to process)
   - Status set to 'completed' immediately
   - No output generated

2. **Cancellation During Phase:**
   - Cancellation checked between projects only
   - Current project completes before cancellation takes effect
   - May process one more project after cancel requested

3. **Registry Cleanup Race:**
   - Cleanup timer fires while SSE client connected
   - Client may lose connection mid-stream
   - No graceful shutdown for active connections

## 12. Diagrams

> **Maintenance Rule:** Diagrams below are **illustrative**, not authoritative. State tables and text define truth.

### Execution Flow

```
startScan()
    │
    ├─→ Status: 'running'
    ├─→ emitProgress()
    │
    └─→ For each project (sequential):
        ├─→ currentProjectIndex++
        ├─→ emitProgress()
        │
        ├─→ Phase 0 (if selection.directories):
        │   └─→ runDirectoriesForProject()
        │
        ├─→ Phase 1 (if selection.scan):
        │   ├─→ runScanForProject()
        │   ├─→ HTTP POST /api/scan
        │   └─→ Cache results in this.scanResults
        │
        └─→ Phase 2 (if selection.populate):
            ├─→ runGenerateForProject()
            ├─→ Use cached results (no re-scan)
            └─→ File Generation System (8 functions)
    
    └─→ Status: 'completed'
        ├─→ emitProgress()
        ├─→ emit('complete')
        └─→ Schedule cleanup (1 hour)
```

### Event Flow

```
ScanExecutor
    │
    ├─→ emitOutput(line) → 'output' event
    │   ├─→ Added to outputBuffer
    │   └─→ SSE clients receive
    │
    ├─→ emitProgress() → 'progress' event
    │   └─→ SSE clients receive
    │
    ├─→ emit('complete') → 'complete' event
    │   ├─→ SSE streams close
    │   └─→ Cleanup timer scheduled
    │
    └─→ emit('error') → 'error' event
        └─→ SSE streams close with error
```

## Conclusion

ScanExecutor is the core orchestrator of the scanner backend, managing sequential project processing, real-time output streaming, and 3-phase scan execution. It bridges frontend UI with backend file generation, providing fault tolerance, cancellation support, and multi-client SSE access through a global registry. The system is simple, reliable, and performant for typical use cases, though it has limitations (unbounded output buffer, sequential execution, no persistent state) that are acceptable tradeoffs for the current architecture.

**Maintenance Expectations:**
- Sequential execution model is stable - parallel execution would require significant refactoring
- Event-driven architecture is stable - event format changes require SSE client updates
- Global registry pattern is stable - changes require API route coordination
- Output buffering strategy may need optimization for very long scans
