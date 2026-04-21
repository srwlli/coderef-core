---
date: 2026-01-08
subject: Scanner Implementation Reference
status: TESTING_REQUIRED
category: reference
version: 1.0.0
related_files:
  - packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts
  - packages/dashboard/src/components/Scanner/index.tsx
  - scripts/setup-coderef-dir/setup_coderef_dirs.py
  - coderef-system/scripts/generate-coderef-directories.py
---

# Scanner Implementation Reference

## Executive Summary

Complete reference for the CodeRef Dashboard Scanner implementation, documenting all 3 phases (Directories, Scan, Populate), current status, Python script migration assessment, and testing checklist.

**Current Status:**
- ✅ Phase 0 (Directories): Working, tested
- ✅ Phase 1 (Scan): Pure TypeScript, working
- ⚠️ Phase 2 (Populate): Python subprocess, requires CLI
- ❌ End-to-end testing: NOT COMPLETED

---

## Architecture Overview

### Scanner UI Components

**Location:** `packages/dashboard/src/components/Scanner/`

**Main Components:**
1. **Scanner/index.tsx** - Main container with 12-column grid layout
2. **ProjectListCard.tsx** - Project management (add/remove, 3 checkboxes per project)
3. **ConsoleTabs.tsx** - Terminal-style output with SSE streaming
4. **ActionBar.tsx** - Execute button with validation
5. **ConfirmationDialog.tsx** - Pre-execution confirmation

**Project Selection Interface:**
- **Directories checkbox** - Phase 0: Create directory structure
- **Scan checkbox** - Phase 1: Scan code elements
- **Populate checkbox** - Phase 2: Generate .coderef/ outputs (16 files)

### Backend API Routes

**Location:** `packages/dashboard/src/app/api/scanner/`

**Endpoints:**
- `POST /api/scanner/scan` - Start scan execution
- `GET /api/scanner/scan/[scanId]/output` - SSE stream for live output
- `GET /api/scanner/scan/[scanId]/status` - Get scan progress
- `POST /api/scanner/scan/[scanId]/cancel` - Cancel running scan
- `GET /api/scanner/projects` - List saved projects
- `POST /api/scanner/projects` - Add new project
- `DELETE /api/scanner/projects/[id]` - Remove project

**Project Storage:** `~/.coderef-scanner-projects.json`

---

## Phase 0: Directories (✅ WORKING)

### Implementation

**Script:** `packages/coderef-core/scripts/setup-coderef-dir/setup_coderef_dirs.py`

**Purpose:** Creates standardized directory structure

**Directories Created:**

**`.coderef/` (Hidden - Technical outputs)**
```
.coderef/
├── reports/complexity/
├── diagrams/
└── exports/
```

**`coderef/` (Visible - Workflow management)**
```
coderef/
├── workorder/
├── archived/
├── standards/
├── documents/
├── resource/
├── user/
└── notes/
```

**Total:** 10 directories (2 parents + 8 subdirectories)

### Scanner Integration

**File:** `scanExecutor.ts` lines 178-219

```typescript
private async runDirectoriesForProject(projectPath: string): Promise<void> {
  const dirsScriptPath = process.env.DIRS_SCRIPT_PATH ||
    path.join(process.cwd(), 'packages/coderef-core/scripts/setup-coderef-dir/setup_coderef_dirs.py');

  const pythonCmd = await this.findPythonCommand();

  // Spawn Python subprocess
  const childProcess = spawn(pythonCmd, [dirsScriptPath, projectPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: path.dirname(dirsScriptPath),
  });

  // Handles stdout, stderr, exit codes
  // Emits output to SSE stream
}
```

### Testing Status

**Unit Tests:** ✅ ALL PASSING (3/3)
- `test_create_structure_creates_all_dirs` ✅
- `test_dry_run_does_not_create_dirs` ✅
- `test_idempotency` ✅

**End-to-End:** ❌ NOT TESTED
- Need to verify via dashboard UI
- Check directories actually created in project path
- Verify console output streams correctly

**Test Command:**
```bash
cd packages/coderef-core/scripts/setup-coderef-dir
python test_setup_coderef_dirs.py
```

---

## Phase 1: Scan (✅ PURE TYPESCRIPT)

### Implementation

**File:** `scanExecutor.ts` lines 224-257

```typescript
private async runScanForProject(projectPath: string): Promise<void> {
  this.emitOutput(`\n[Scanner] Starting scan for: ${projectPath}`);
  this.emitOutput(`[Scanner] Using @coderef/core scanner (in-process)\n`);

  const startTime = Date.now();

  // Call scanner directly (no HTTP, no subprocess)
  const elements: ElementData[] = await scanCurrentElements(
    projectPath,
    ['ts', 'tsx', 'js', 'jsx'],
    {
      recursive: true,
      exclude: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**'],
    }
  );

  const scanDuration = Date.now() - startTime;
  const filesScanned = new Set(elements.map(el => el.file)).size;
  const totalElements = elements.length;

  this.emitOutput(`[Scanner] Found ${totalElements} elements in ${filesScanned} files`);
  this.emitOutput(`[Scanner] Scan duration: ${scanDuration}ms\n`);
}
```

### Key Features

**✅ Pure TypeScript** - No subprocess, no Python dependency
**✅ In-process** - Direct function call to `scanCurrentElements()`
**✅ Fast** - ~1-2 seconds for medium projects
**✅ Tested** - Scanner consolidation tested (1,148 elements detected)

### Scanner Configuration

**Languages:** ts, tsx, js, jsx
**Recursive:** true
**Excludes:** node_modules, .git, dist, build, .next

### Testing Status

**Scanner Tests:** ✅ PASSING (from consolidation work)
- Detected 1,148 elements in coderef-core
- Successfully scanned src/ directory
- All exports working correctly

**End-to-End:** ❌ NOT TESTED
- Need to verify via dashboard UI
- Check elements count in console output
- Verify scan duration logged

---

## Phase 2: Populate (⚠️ PYTHON SUBPROCESS)

### Implementation

**File:** `scanExecutor.ts` lines 307-366

```typescript
private async runPopulateForProject(projectPath: string): Promise<void> {
  // Locate generate-coderef-directories.py script from coderef-system
  const populateScriptPath = process.env.POPULATE_SCRIPT_PATH ||
    'C:\\Users\\willh\\Desktop\\projects\\coderef-system\\scripts\\generate-coderef-directories.py';

  const pythonCmd = await this.findPythonCommand();

  this.emitOutput(`\n[Intelligence] Generating coderef directories for: ${projectPath}`);
  this.emitOutput(`[Intelligence] Using Python: ${pythonCmd}`);
  this.emitOutput(`[Intelligence] Using script: ${populateScriptPath}\n`);

  // Spawn Python subprocess
  this.currentProcess = spawn(pythonCmd, [populateScriptPath, projectPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: path.dirname(populateScriptPath),
  });

  // Handles stdout, stderr, exit codes
}
```

### What Populate Does

**Script:** `coderef-system/scripts/generate-coderef-directories.py`

**Generates 16 output files in `.coderef/`:**

**Root Level (4 files):**
1. `index.json` - Complete inventory of code elements
2. `graph.json` - Dependency graph with nodes and edges
3. `context.json` - Structured project context
4. `context.md` - Human-readable context

**reports/ (5 files):**
5. `reports/patterns.json` - Code patterns & anti-patterns
6. `reports/coverage.json` - Test coverage analysis
7. `reports/validation.json` - CodeRef2 reference validation
8. `reports/drift.json` - Index drift detection
9. `reports/complexity/README.md` - On-demand complexity guide

**diagrams/ (4 files):**
10. `diagrams/dependencies.mmd` - Dependency graph (Mermaid)
11. `diagrams/dependencies.dot` - Dependency graph (GraphViz)
12. `diagrams/calls.mmd` - Call relationships (Mermaid)
13. `diagrams/imports.mmd` - Import relationships (Mermaid)

**exports/ (3 files):**
14. `exports/graph.json` - Full graph export (JSON)
15. `exports/graph.jsonld` - Linked data export (JSON-LD)
16. `exports/diagram-wrapped.md` - Wrapped diagram (Markdown)

### Dependencies

**⚠️ CRITICAL BLOCKER:** Script calls `coderef` CLI commands:
```python
cli = "coderef"
run_save(f'{cli} scan "{project}" -l {lang} --json', coderef_dir / 'index.json')
run_save(f'{cli} export -f json -s "{project}" --lang {lang}', coderef_dir / 'graph.json')
run_save(f'{cli} context "{project}" -f json', coderef_dir / 'context.json')
run_save(f'{cli} diagram -f mermaid -t dependencies', coderef_dir / 'diagrams/dependencies.mmd')
# ... etc for all 16 outputs
```

**Problem:** Assumes `coderef` CLI exists - **IT DOESN'T IN CONSOLIDATED SYSTEM**

### Testing Status

**Unit Tests:** ❌ NONE
**End-to-End:** ❌ NOT TESTED
- Will fail if `coderef` CLI not installed
- Need to verify Python subprocess spawns correctly
- Check all 16 files generated
- Verify console output streams

### Migration Required

**Status:** ⚠️ **NEEDS TYPESCRIPT PORT**

**Effort Estimate:** ~12-16 hours

**Strategy:** Port Python logic to TypeScript modules in `src/populator/`:
- `writers/index-writer.ts` - Write index.json
- `writers/graph-writer.ts` - Build graph.json with edges
- `context/context-generator.ts` - Generate context files
- `diagrams/diagram-generator.ts` - Generate Mermaid/DOT
- `reports/pattern-analyzer.ts` - Analyze code patterns
- `reports/coverage-analyzer.ts` - Calculate coverage
- `exports/export-generator.ts` - Generate exports

---

## Python Script Migration Assessment

### Scripts Already Integrated (via subprocess)

| Script | Phase | Status | Notes |
|--------|-------|--------|-------|
| `setup_coderef_dirs.py` | Phase 0 | ✅ Working | Creates directory structure |
| `generate-coderef-directories.py` | Phase 2 | ⚠️ Subprocess | Calls `coderef` CLI (doesn't exist) |

### Scripts NOT Needed (CLI wrappers)

These scripts assume `coderef` CLI exists. **Skip migration.**

| Script | Reason to Skip |
|--------|---------------|
| `populate-coderef.py` | Wrapper around CLI commands |
| `scan-all.py` | Calls `coderef scan` (we use TypeScript scanner) |
| `extract-context.py` | Calls `coderef context` |

### Scripts to Consider (post-processing)

These read `.coderef/` data and generate additional outputs:

| Script | Purpose | Priority | Effort |
|--------|---------|----------|--------|
| `diagram-generator.py` | Visual diagrams (Mermaid, DOT) | MEDIUM | 4-6 hrs |
| `parse_coderef_data.py` | Foundation docs (README, ARCHITECTURE) | HIGH | 4-6 hrs |
| `coderef_foundation_generator.py` | Hybrid doc generator (faster) | MEDIUM | 2-3 hrs |
| `enhance-standards.py` | UI/behavior/UX standards | LOW | 3-4 hrs |
| `validate-docs.py` | Documentation validator | LOW | 2-3 hrs |

### Utility Scripts (skip)

| Script | Reason |
|--------|--------|
| `scan-emojis.py` | Debugging tool only |
| `build-exe.py` | PyInstaller GUI packaging |

---

## Testing Checklist

### ❌ End-to-End Testing Required

**Prerequisites:**
1. ✅ Dashboard server running (`npm run dev`)
2. ✅ Python installed (for Phase 0 and Phase 2)
3. ⚠️ `coderef` CLI installed (for Phase 2) - **LIKELY MISSING**

### Test Scenario 1: Phase 0 Only (Directories)

**Steps:**
1. Start dashboard: `npm run dev` in packages/dashboard
2. Open: http://localhost:3005/scanner
3. Click "Add Path" → Select a test project directory
4. Check **only** "Directories" checkbox
5. Click "Execute"
6. **Verify:**
   - ✅ Console shows: `[Directories] Creating structure for: <path>`
   - ✅ Console shows: `[CREATE] .coderef/` and `[CREATE] coderef/`
   - ✅ Status changes to "Completed"
   - ✅ Test project has `.coderef/` and `coderef/` directories
   - ✅ All 10 subdirectories exist

**Expected Output:**
```
[Directories] Creating structure for: C:\test\project
[Directories] Using Python: python
[Directories] Using script: packages/coderef-core/scripts/setup-coderef-dir/setup_coderef_dirs.py

[CREATE] .coderef/
  [CREATE] .coderef/reports/complexity/
  [CREATE] .coderef/diagrams/
  [CREATE] .coderef/exports/
[CREATE] coderef/
  [CREATE] coderef/workorder/
  [CREATE] coderef/archived/
  [CREATE] coderef/standards/
  [CREATE] coderef/documents/
  [CREATE] coderef/resource/
  [CREATE] coderef/user/
  [CREATE] coderef/notes/

[Directories] Completed: C:\test\project
```

### Test Scenario 2: Phase 1 Only (Scan)

**Steps:**
1. Use same test project (or new one)
2. Check **only** "Scan" checkbox
3. Click "Execute"
4. **Verify:**
   - ✅ Console shows: `[Scanner] Starting scan for: <path>`
   - ✅ Console shows: `[Scanner] Using @coderef/core scanner (in-process)`
   - ✅ Console shows element count: `[Scanner] Found X elements in Y files`
   - ✅ Console shows duration: `[Scanner] Scan duration: Xms`
   - ✅ Status changes to "Completed"
   - ✅ Scan completes in 1-3 seconds

**Expected Output:**
```
[Scanner] Starting scan for: C:\test\project
[Scanner] Using @coderef/core scanner (in-process)

[Scanner] Scan completed successfully
[Scanner] Found 1148 elements in 89 files
[Scanner] Scan duration: 1523ms
```

### Test Scenario 3: Phase 2 Only (Populate)

**Steps:**
1. Use same test project
2. Check **only** "Populate" checkbox
3. Click "Execute"
4. **Verify:**
   - ✅ Console shows: `[Intelligence] Generating coderef directories for: <path>`
   - ✅ Console shows Python path and script path
   - ⚠️ **LIKELY FAILS:** `coderef: command not found`
   - ❌ OR shows CLI output if `coderef` is installed
   - ✅ Test project `.coderef/` has 16 output files (if succeeds)

**Expected Output (if CLI exists):**
```
[Intelligence] Generating coderef directories for: C:\test\project
[Intelligence] Using Python: python
[Intelligence] Using script: C:\Users\willh\Desktop\projects\coderef-system\scripts\generate-coderef-directories.py

[*] index.json
    [OK] 30.5 KB
[*] graph.json
    [OK] 45.2 KB
[*] context.json
    [OK] 20.1 KB
... (14 more files)

[Intelligence] Completed: C:\test\project
```

**Expected Output (if CLI missing):**
```
[Intelligence] Generating coderef directories for: C:\test\project
[Intelligence] Using Python: python
[Intelligence] Using script: C:\Users\willh\Desktop\projects\coderef-system\scripts\generate-coderef-directories.py

[ERROR] Command 'coderef' not found
[ERROR] Failed to start Python: spawn coderef ENOENT
```

### Test Scenario 4: All Phases (Full Scan)

**Steps:**
1. Use same test project
2. Check **all three** checkboxes: Directories, Scan, Populate
3. Click "Execute"
4. **Verify:**
   - ✅ All three phases run sequentially
   - ✅ Console output from all phases
   - ⚠️ Phase 2 likely fails (no CLI)
   - ✅ Status tracking updates correctly
   - ✅ Progress shows: "Scanning 1/1"

### Test Scenario 5: Multiple Projects

**Steps:**
1. Add 2-3 test projects
2. Check "Scan" for all projects
3. Click "Execute"
4. **Verify:**
   - ✅ Projects scanned sequentially (one at a time)
   - ✅ Progress shows: "Scanning 1/3", "Scanning 2/3", "Scanning 3/3"
   - ✅ Console output for each project
   - ✅ All projects complete

### Test Scenario 6: SSE Streaming

**Steps:**
1. Run any scan
2. **Verify:**
   - ✅ Console updates in real-time (not all at once at end)
   - ✅ Lines appear as they're generated
   - ✅ Auto-scrolls to bottom
   - ✅ Colors applied correctly (green for success, red for errors)

### Test Scenario 7: Cancel Scan

**Steps:**
1. Start a scan
2. Click cancel button (if implemented)
3. **Verify:**
   - ✅ Process terminates
   - ✅ Status changes to "Cancelled"
   - ✅ No zombie processes left running

---

## Known Issues

### Issue 1: Phase 2 Requires CLI

**Problem:** `generate-coderef-directories.py` calls `coderef` CLI commands that don't exist in consolidated system.

**Workaround:** Install standalone `coderef` CLI (if available)

**Solution:** Port Phase 2 to TypeScript (12-16 hours effort)

### Issue 2: Graph Edges Missing

**Problem:** `graph.json` has 0 edges (empty array). Needed for call/import diagrams.

**Impact:** `diagrams/calls.mmd` and `diagrams/imports.mmd` will be incomplete

**Solution:** Verify analyzer builds edges with type='calls' and type='imports'

### Issue 3: Hardcoded Script Path

**Problem:** Phase 2 script path is hardcoded to specific machine path:
```typescript
const populateScriptPath = process.env.POPULATE_SCRIPT_PATH ||
  'C:\\Users\\willh\\Desktop\\projects\\coderef-system\\scripts\\generate-coderef-directories.py';
```

**Impact:** Won't work on other machines without coderef-system repo

**Solution:**
- Use environment variable
- Bundle script with dashboard
- Or port to TypeScript

---

## Next Steps

### Immediate (Testing Phase)

1. ✅ Save this reference document
2. ❌ Start dashboard server
3. ❌ Test Phase 0 (Directories)
4. ❌ Test Phase 1 (Scan)
5. ❌ Test Phase 2 (Populate) - expect CLI failure
6. ❌ Test SSE streaming
7. ❌ Test multiple projects
8. ❌ Document all failures/issues

### Short-term (Fix Blockers)

1. Fix Phase 2 CLI dependency:
   - Option A: Install `coderef` CLI globally
   - Option B: Port to TypeScript (recommended)
2. Verify graph edges being built
3. Fix script path issues

### Long-term (Migration)

1. Port Phase 2 to TypeScript (`src/populator/`)
2. Add Phase 3 (Documentation generation)
3. Optimize performance
4. Add error recovery

---

## Reference Documentation

**Scanner Component Tree:**
```
Scanner/
├── index.tsx (main container)
├── ProjectListCard.tsx (project management)
├── ConsoleTabs.tsx (output display)
├── ActionBar.tsx (execution trigger)
└── ConfirmationDialog.tsx (pre-execution)
```

**API Route Tree:**
```
/api/scanner/
├── scan/route.ts (POST - start scan)
├── scan/[scanId]/
│   ├── output/route.ts (GET - SSE stream)
│   ├── status/route.ts (GET - progress)
│   └── cancel/route.ts (POST - cancel)
├── projects/route.ts (GET/POST)
└── projects/[id]/route.ts (DELETE)
```

**Scanner Executor Flow:**
```
User clicks Execute
  → POST /api/scanner/scan
  → Create ScanExecutor instance
  → Register executor globally
  → Start scan asynchronously
  → Return scanId (202 Accepted)
  → Client connects SSE: GET /api/scanner/scan/{scanId}/output
  → Executor emits output events
  → SSE streams to client
  → Console updates in real-time
  → Scan completes → emit 'complete' event
  → SSE closes
  → Status: "Completed"
```

---

**Last Updated:** 2026-01-08
**Status:** Testing required before production use
**Maintainer:** CodeRef Core Team
