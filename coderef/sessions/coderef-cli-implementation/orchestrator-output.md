# Dashboard Scanner File Generation - Implementation Plan

**Session:** WO-CODEREF-CLI-IMPLEMENTATION-001
**Created:** 2026-01-09
**Orchestrator:** CodeRef Assistant

---

## Executive Summary

**Goal:** Implement file generation functions so that clicking "Scan" in the dashboard UI produces all 16 output files in the `.coderef/` directory.

**Critical Clarification:**
- ✅ **We ARE implementing:** TypeScript functions in `@coderef/core` for dashboard integration
- ❌ **We are NOT building:** A CLI tool
- 📚 **CLI documentation:** Reference material only (shows what capabilities to replicate)

**Access Method:** Dashboard UI → Scanner Page → Scan Button → Files Generated

---

## Current State Analysis

### ✅ What Works

1. **Directory Creation** (Python script)
   - Creates `.coderef/` and 10 subdirectories
   - **Result:** Empty structure exists

2. **Code Scanning** (TypeScript - Phase 1)
   - `runScanForProject()` at scanExecutor.ts:234-266
   - Calls `scanCurrentElements()` from `@coderef/core`
   - Calculates statistics, emits output to UI
   - **Result:** Data collected but DISCARDED (not saved, not returned)

3. **File Population** (Python - Phase 2)
   - `runPopulateForProject()` at scanExecutor.ts:314-381
   - **Currently:** Calls external Python script via spawn()
   - Python script: `C:\Users\willh\Desktop\projects\coderef-system\scripts\generate-coderef-directories.py`
   - **Problems:** External dependency, spawn() issues on Windows, slower
   - **Result:** Generates 16 files but via external process

### 🏗️ Dashboard Architecture (Two-Phase Scan)

```typescript
// scanExecutor.ts workflow
for (const projectPath of projectPaths) {
  // Phase 1: Scan (line 131) - ALWAYS RUNS
  await this.runScanForProject(projectPath);
  // -> Scans, shows stats
  // -> PROBLEM: Discards data (local variable)
  // -> SOLUTION: Store in this.scanResults cache

  // Phase 2: Generate Files (line 152, optional)
  if (selection.populate) {
    await this.runGenerateForProject(projectPath); // Rename from runPopulateForProject
    // -> CURRENTLY: Spawns Python script (re-scans wastefully)
    // -> GOAL: Use cached scan results + parallel file generation
  }
}
```

### ❌ Critical Problems to Fix

**File generation exists BUT has multiple issues:**

1. **External Dependency:** Requires `coderef-system` project at specific path
2. **Python Dependency:** Requires Python installed on system
3. **spawn() Issues:** Windows spawn problems cause failures
4. **Performance Issues:**
   - Subprocess overhead (slow)
   - **Re-scans codebase** (Phase 1 discards data, Phase 2 scans again)
   - Sequential file generation (no parallelization)
5. **Maintainability:** Logic lives in separate project

**Current Flow (Inefficient):**
1. ✅ Phase 1: Scan → collect elements → show stats → **discard data** ❌
2. ✅ Phase 2: Spawn Python → **re-scan codebase** ❌ → generate 16 files sequentially ❌

**Optimized Flow (What We're Building):**
1. ✅ Phase 1: Scan → collect elements → show stats → **cache data** ✅
2. ✅ Phase 2: **Use cached data** ✅ → generate 16 files **in parallel** ✅

**Goals:**
1. Replace Python with TypeScript functions
2. Cache scan results (no re-scanning)
3. Parallel file generation (3-4x faster)
4. Rename `runPopulateForProject()` → `runGenerateForProject()` (clearer terminology)

---

## Files to Generate (16 Total)

```
.coderef/
├── index.json                    ❌ NOT GENERATED
├── graph.json                    ❌ NOT GENERATED
├── context.json                  ❌ NOT GENERATED
├── context.md                    ❌ NOT GENERATED
├── reports/
│   ├── patterns.json            ❌ NOT GENERATED
│   ├── coverage.json            ❌ NOT GENERATED
│   ├── validation.json          ❌ NOT GENERATED
│   ├── drift.json               ❌ NOT GENERATED
│   └── complexity/README.md     ❌ NOT GENERATED (on-demand)
├── diagrams/
│   ├── dependencies.mmd         ❌ NOT GENERATED
│   ├── dependencies.dot         ❌ NOT GENERATED
│   ├── calls.mmd                ❌ NOT GENERATED
│   └── imports.mmd              ❌ NOT GENERATED
└── exports/
    ├── graph.json               ❌ NOT GENERATED
    └── graph.jsonld             ❌ NOT GENERATED
```

---

## Implementation Strategy

### Part 1: Add Scan Results Cache to `ScanExecutor` Class

**Current Problem:**
```typescript
private async runScanForProject(projectPath: string): Promise<void> {
  const elements = await scanCurrentElements(...);  // Scan
  // Calculate stats, show in UI
  // elements = local variable, DISCARDED when function ends ❌
}
```

**Solution: Add Cache Property**
```typescript
class ScanExecutor extends EventEmitter {
  private scanResults = new Map<string, ElementData[]>();  // ✅ ADD THIS

  private async runScanForProject(projectPath: string): Promise<void> {
    const elements = await scanCurrentElements(...);

    // Store for Phase 2 (NEW)
    this.scanResults.set(projectPath, elements);  // ✅ CACHE IT

    // Calculate stats, show in UI (existing code)
    const filesScanned = new Set(elements.map(el => el.file)).size;
    this.emitOutput(`[Scanner] Found ${elements.length} elements in ${filesScanned} files`);
  }
}
```

---

### Part 2: Replace `runPopulateForProject()` → `runGenerateForProject()`

**Rename + Optimize:**

**Current Implementation (lines 314-381) - REMOVE:**
```typescript
private async runPopulateForProject(projectPath: string): Promise<void> {
  // Get Python script path (external dependency)
  const populateScriptPath = process.env.POPULATE_SCRIPT_PATH || '...';
  const pythonCmd = await this.findPythonCommand();

  // Spawn Python subprocess (68 lines of complexity)
  this.currentProcess = spawn(pythonCmd, [populateScriptPath, projectPath], ...);
  // Error handling, stream management, etc.
}
```

**New Implementation - ADD:**
```typescript
private async runGenerateForProject(projectPath: string): Promise<void> {
  try {
    this.emitOutput(`\n[Generate] Starting file generation: ${projectPath}`);

    // Get cached scan results (NO re-scan!)
    const elements = this.scanResults.get(projectPath);
    if (!elements) {
      throw new Error('No scan data found. Run scan phase first.');
    }

    // Step 1: Critical file (must succeed)
    this.emitOutput(`[Generate] Saving index...`);
    await saveIndex(projectPath, elements);
    this.emitOutput(`[Generate] ✓ index.json`);

    // Step 2: Core files (parallel - depend on elements only)
    this.emitOutput(`[Generate] Creating context and graph...`);
    await Promise.all([
      generateContext(projectPath, elements),
      buildDependencyGraph(projectPath, elements),
    ]);
    this.emitOutput(`[Generate] ✓ context files, ✓ graph.json`);

    // Step 3: Analysis files (parallel + fault-tolerant)
    this.emitOutput(`[Generate] Running analysis...`);
    const analysisResults = await Promise.allSettled([
      detectPatterns(projectPath, elements),
      analyzeCoverage(projectPath, elements),
      validateReferences(projectPath, elements),
      detectDrift(projectPath, elements),
    ]);

    const analysisSuccess = analysisResults.filter(r => r.status === 'fulfilled').length;
    this.emitOutput(`[Generate] ✓ Generated ${analysisSuccess}/4 analysis files`);

    // Step 4: Diagrams (parallel + fault-tolerant)
    this.emitOutput(`[Generate] Creating diagrams...`);
    await generateDiagrams(projectPath, elements);
    this.emitOutput(`[Generate] ✓ diagram files`);

    this.emitOutput(`[Generate] Completed: ${projectPath}\n`);
  } catch (error: any) {
    this.emitOutput(`[ERROR] Generate failed: ${error.message}\n`);
    throw error;
  }
}
```

**Benefits:**
- ✅ No Python dependency (68 lines → 40 lines)
- ✅ No re-scanning (uses cached data)
- ✅ Parallel generation (3-4x faster)
- ✅ Fault-tolerant (one file failure doesn't kill everything)
- ✅ Better progress reporting
- ✅ Clearer terminology ("Generate" vs "Populate")

---

### Phase 1: Core File Generation (IMMEDIATE PRIORITY)

**Functions to Implement in `@coderef/core`:**

1. **`saveIndex(projectPath: string, elements: CodeElement[]): Promise<void>`**
   - **Purpose:** Save scan results to disk
   - **Output:** `.coderef/index.json`
   - **Implementation:**
     - Accept elements from `scanCurrentElements()`
     - Format as JSON
     - Write to `{projectPath}/.coderef/index.json`
   - **Priority:** CRITICAL (scan data currently discarded)

2. **`generateContext(projectPath: string, elements: CodeElement[]): Promise<void>`**
   - **Purpose:** Create AI-readable project context
   - **Output:** `.coderef/context.json` + `.coderef/context.md`
   - **Implementation:**
     - Analyze elements for statistics (total functions, classes, etc.)
     - Generate JSON structure
     - Generate markdown summary
     - Write both files
   - **Priority:** HIGH (needed for MCP/AI integration)

3. **`buildDependencyGraph(projectPath: string, elements: CodeElement[]): Promise<DependencyGraph>`**
   - **Purpose:** Build import/dependency relationships
   - **Output:** `.coderef/graph.json` (and `.coderef/exports/graph.json`)
   - **Implementation:**
     - Parse import statements from elements
     - Build graph structure (nodes = files, edges = imports)
     - Write JSON to both locations
   - **Priority:** HIGH (foundation for diagrams)

**Phase 1 Deliverable:** After implementation, dashboard scan produces **4 files**:
- `.coderef/index.json`
- `.coderef/context.json`
- `.coderef/context.md`
- `.coderef/graph.json`

### Phase 2: Reports & Analysis

**Functions to Implement:**

4. **`detectPatterns(projectPath: string, elements: CodeElement[]): Promise<void>`**
   - **Output:** `.coderef/reports/patterns.json`
   - **Detects:** Handlers, decorators, error patterns, test patterns, API endpoints

5. **`analyzeCoverage(projectPath: string, elements: CodeElement[]): Promise<void>`**
   - **Output:** `.coderef/reports/coverage.json`
   - **Analyzes:** Test coverage, uncovered files

6. **`validateReferences(projectPath: string, elements: CodeElement[]): Promise<void>`**
   - **Output:** `.coderef/reports/validation.json`
   - **Validates:** Broken references, missing imports

7. **`detectDrift(projectPath: string, elements: CodeElement[]): Promise<void>`**
   - **Output:** `.coderef/reports/drift.json`
   - **Detects:** Changes since last scan

**Phase 2 Deliverable:** Dashboard scan produces **8 additional files** (12 total)

### Phase 3: Diagrams & Visual Exports

**Functions to Implement:**

8. **`generateDiagrams(projectPath: string, graph: DependencyGraph): Promise<void>`**
   - **Output:** 4 diagram files (`.mmd`, `.dot` formats)
   - **Generates:** Mermaid and Graphviz formats for dependencies, calls, imports

9. **`exportFormats(projectPath: string, graph: DependencyGraph): Promise<void>`**
   - **Output:** `.coderef/exports/graph.jsonld`
   - **Generates:** JSON-LD semantic web format

**Phase 3 Deliverable:** Dashboard scan produces **4 additional files** (16 total) ✅

---

## Integration Point: scanExecutor.ts

**File:** `packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts`

### Changes Required:

#### Change 1: Add Cache Property + Modify Scan Phase

**Add to class properties:**
```typescript
class ScanExecutor extends EventEmitter {
  // ... existing properties
  private scanResults = new Map<string, ElementData[]>();  // ✅ ADD THIS
}
```

**Modify runScanForProject() (lines 234-266) - MINIMAL CHANGE:**
```typescript
private async runScanForProject(projectPath: string): Promise<void> {
  try {
    this.emitOutput(`\n[Scanner] Starting scan for: ${projectPath}`);
    this.emitOutput(`[Scanner] Using @coderef/core scanner (in-process)\n`);

    const startTime = Date.now();

    const elements: ElementData[] = await scanCurrentElements(
      projectPath,
      ['ts', 'tsx', 'js', 'jsx'],
      {
        recursive: true,
        exclude: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**'],
      }
    );

    // ✅ ADD THIS LINE: Cache results for Phase 2
    this.scanResults.set(projectPath, elements);

    const scanDuration = Date.now() - startTime;

    // (rest stays the same - calculate stats, emit output)
    const filesScanned = new Set(elements.map(el => el.file)).size;
    const totalElements = elements.length;

    this.emitOutput(`[Scanner] Scan completed successfully`);
    this.emitOutput(`[Scanner] Found ${totalElements} elements in ${filesScanned} files`);
    this.emitOutput(`[Scanner] Scan duration: ${scanDuration}ms\n`);
  } catch (error: any) {
    this.emitOutput(`[ERROR] Scan failed: ${error.message}\n`);
    throw new Error(`Scan failed: ${error.message}`);
  }
}
```

#### Change 2: Replace runPopulateForProject() → runGenerateForProject()

**BEFORE (lines 314-381) - DELETE ENTIRELY:**
```typescript
private async runPopulateForProject(projectPath: string): Promise<void> {
  // 68 lines of Python spawn() code
}
```

**AFTER - REPLACE WITH:**
```typescript
/**
 * Generate all coderef files for a project using cached scan results
 * No subprocess, no Python - pure TypeScript implementation
 */
private async runGenerateForProject(projectPath: string): Promise<void> {
  try {
    this.emitOutput(`\n[Generate] Starting file generation: ${projectPath}`);

    // Get cached scan results (no re-scan!)
    const elements = this.scanResults.get(projectPath);
    if (!elements) {
      throw new Error('No scan data found. Run scan phase first.');
    }

    // Step 1: Critical file (must succeed)
    this.emitOutput(`[Generate] Saving index...`);
    await saveIndex(projectPath, elements);
    this.emitOutput(`[Generate] ✓ index.json`);

    // Step 2: Core files (parallel)
    this.emitOutput(`[Generate] Creating context and graph...`);
    await Promise.all([
      generateContext(projectPath, elements),
      buildDependencyGraph(projectPath, elements),
    ]);
    this.emitOutput(`[Generate] ✓ context.json, context.md, graph.json`);

    // Step 3: Analysis files (parallel + fault-tolerant)
    this.emitOutput(`[Generate] Running analysis...`);
    const analysisResults = await Promise.allSettled([
      detectPatterns(projectPath, elements),
      analyzeCoverage(projectPath, elements),
      validateReferences(projectPath, elements),
      detectDrift(projectPath, elements),
    ]);

    const analysisSuccess = analysisResults.filter(r => r.status === 'fulfilled').length;
    this.emitOutput(`[Generate] ✓ Generated ${analysisSuccess}/4 analysis files`);

    // Step 4: Diagrams (parallel + fault-tolerant)
    this.emitOutput(`[Generate] Creating diagrams...`);
    await generateDiagrams(projectPath, elements);
    this.emitOutput(`[Generate] ✓ diagram files`);

    this.emitOutput(`[Generate] Completed: ${projectPath}\n`);
  } catch (error: any) {
    this.emitOutput(`[ERROR] Generate failed: ${error.message}\n`);
    throw error;
  }
}
```

#### Change 3: Update Function Call in Main Loop (line 152)

**BEFORE:**
```typescript
if (shouldPopulate) {
  try {
    await this.runPopulateForProject(projectPath);
  } catch (populateError: any) {
    this.emitOutput(`[ERROR] Populate failed for ${projectPath}: ${populateError.message}\n`);
  }
}
```

**AFTER:**
```typescript
if (shouldPopulate) {
  try {
    await this.runGenerateForProject(projectPath);  // ✅ RENAMED
  } catch (generateError: any) {
    this.emitOutput(`[ERROR] Generate failed for ${projectPath}: ${generateError.message}\n`);
  }
}
```

**Result:**
- ✅ No Python dependency
- ✅ No spawn() issues
- ✅ No re-scanning (uses cache)
- ✅ Parallel file generation (3-4x faster)
- ✅ Fault-tolerant (Promise.allSettled)
- ✅ Better progress reporting

---

## Function Signatures (Recommended)

### Phase 1 Functions

```typescript
// packages/coderef-core/src/fileGeneration/saveIndex.ts
export async function saveIndex(
  projectPath: string,
  elements: CodeElement[]
): Promise<void> {
  const indexPath = path.join(projectPath, '.coderef', 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(elements, null, 2));
}

// packages/coderef-core/src/fileGeneration/generateContext.ts
export async function generateContext(
  projectPath: string,
  elements: CodeElement[]
): Promise<void> {
  const stats = analyzeElements(elements);
  const json = { ...stats, generatedAt: new Date().toISOString() };
  const markdown = formatAsMarkdown(stats);

  await fs.writeFile(path.join(projectPath, '.coderef', 'context.json'), JSON.stringify(json, null, 2));
  await fs.writeFile(path.join(projectPath, '.coderef', 'context.md'), markdown);
}

// packages/coderef-core/src/fileGeneration/buildDependencyGraph.ts
export async function buildDependencyGraph(
  projectPath: string,
  elements: CodeElement[]
): Promise<DependencyGraph> {
  const graph = buildGraph(elements);
  const graphPath = path.join(projectPath, '.coderef', 'graph.json');
  const exportsPath = path.join(projectPath, '.coderef', 'exports', 'graph.json');

  await fs.writeFile(graphPath, JSON.stringify(graph, null, 2));
  await fs.writeFile(exportsPath, JSON.stringify(graph, null, 2));

  return graph;
}
```

### Package Export

```typescript
// packages/coderef-core/src/index.ts
export { scanCurrentElements } from './scanner/scanCurrentElements';

// Phase 1 exports (NEW)
export { saveIndex } from './fileGeneration/saveIndex';
export { generateContext } from './fileGeneration/generateContext';
export { buildDependencyGraph } from './fileGeneration/buildDependencyGraph';

// Phase 2 exports (FUTURE)
export { detectPatterns } from './fileGeneration/detectPatterns';
export { analyzeCoverage } from './fileGeneration/analyzeCoverage';
export { validateReferences } from './fileGeneration/validateReferences';
export { detectDrift } from './fileGeneration/detectDrift';

// Phase 3 exports (FUTURE)
export { generateDiagrams } from './fileGeneration/generateDiagrams';
export { exportFormats } from './fileGeneration/exportFormats';
```

---

## Testing Strategy

### Manual Testing (Dashboard UI)

**Test Steps:**
1. Open dashboard in browser
2. Navigate to Scanner page
3. Select project to scan
4. Click "Scan" button
5. Wait for scan completion
6. **Verify files exist:**
   ```bash
   ls {projectPath}/.coderef/
   # Should show: index.json, context.json, context.md, graph.json
   ```
7. **Verify file contents:**
   ```bash
   cat {projectPath}/.coderef/index.json
   # Should show array of elements
   ```

### Automated Testing

```typescript
// packages/coderef-core/src/__tests__/fileGeneration.test.ts
describe('File Generation', () => {
  test('saveIndex creates index.json', async () => {
    const elements = await scanCurrentElements(testProjectPath, ['ts']);
    await saveIndex(testProjectPath, elements);

    const indexPath = path.join(testProjectPath, '.coderef', 'index.json');
    expect(await fs.exists(indexPath)).toBe(true);

    const saved = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    expect(saved).toHaveLength(elements.length);
  });

  test('generateContext creates JSON and MD', async () => {
    const elements = await scanCurrentElements(testProjectPath, ['ts']);
    await generateContext(testProjectPath, elements);

    expect(await fs.exists(path.join(testProjectPath, '.coderef', 'context.json'))).toBe(true);
    expect(await fs.exists(path.join(testProjectPath, '.coderef', 'context.md'))).toBe(true);
  });
});
```

---

## Implementation Priority

**Week 1:** Phase 1 (saveIndex, generateContext, buildDependencyGraph)
- **Deliverable:** Dashboard scan generates 4 files
- **Proof:** Manual test shows files exist with correct data

**Week 2:** Phase 2 (detectPatterns, analyzeCoverage, validateReferences, detectDrift)
- **Deliverable:** Dashboard scan generates 12 files
- **Proof:** Manual test shows all report files

**Week 3:** Phase 3 (generateDiagrams, exportFormats)
- **Deliverable:** Dashboard scan generates 16 files ✅
- **Proof:** Complete `.coderef/` directory population

---

## Key Changes from Original Plan

**Before (Initial Misunderstanding):**
- Thought we were building a new CLI tool
- Planned CLI command implementations
- Separate CLI tool binary

**After (First Correction):**
- ✅ Implementing functions for dashboard scanner
- ✅ Dashboard UI is the access point
- ✅ CLI docs are reference only (not build target)

**After (Final Clarification - User Analysis):**
- ✅ **Target:** Replace `runPopulateForProject()` implementation
- ✅ **Current:** Spawns Python script (68 lines of subprocess management)
- ✅ **Goal:** Replace with TypeScript function calls (~40 lines)
- ✅ **Architecture:** Two-phase scan (Scan phase + Populate phase)
- ✅ **Leave alone:** `runScanForProject()` (already works, shows stats)
- ✅ **Replace:** `runPopulateForProject()` (remove Python, add TypeScript)

**Critical Distinctions:**
1. CLI tool = External binary ❌ NOT OUR GOAL
2. Dashboard scanner = Web UI ✅ CORRECT TARGET
3. Python script replacement = Core task ✅ WHAT WE'RE ACTUALLY DOING
4. Scan phase modification = NOT NEEDED (already works)
5. Populate phase modification = PRIMARY TASK (replace Python with TypeScript)

---

## Success Criteria

**Phase 1 Complete When:**
1. ✅ `saveIndex()` implemented in `@coderef/core`
2. ✅ `generateContext()` implemented in `@coderef/core`
3. ✅ `buildDependencyGraph()` implemented in `@coderef/core`
4. ✅ Functions exported from `@coderef/core/src/index.ts`
5. ✅ `runPopulateForProject()` in `scanExecutor.ts` REPLACED with TypeScript implementation
6. ✅ Python spawn() code removed (lines 314-381)
7. ✅ Dashboard populate generates 4 files (verified manually)
8. ✅ No Python dependency errors
9. ✅ Tests pass (automated)

**Project Complete When:**
- ✅ `runPopulateForProject()` fully replaced (no Python)
- ✅ Dashboard populate generates all 16 files
- ✅ All functions tested and working
- ✅ No spawn() errors
- ✅ No external coderef-system dependency
- ✅ Files contain correct, valid data
- ✅ Performance improved (faster than Python subprocess)

**Verification Test:**
1. Open dashboard
2. Select project
3. Enable "Populate" checkbox
4. Click Scan
5. **Verify:** Phase 1 scans, Phase 2 generates 16 files (NO Python spawn)
6. **Verify:** All files exist in `.coderef/` directory
7. **Verify:** No errors in console
8. **Verify:** Faster than Python implementation

---

**Next Steps for Implementor:**

**Agent Working Directory:** `C:\Users\willh\Desktop\coderef-dashboard\packages\coderef-core`

1. **Implement Phase 1 functions** in `src/fileGeneration/`:
   - `saveIndex.ts`
   - `generateContext.ts`
   - `buildDependencyGraph.ts`

2. **Export from `@coderef/core`** (`src/index.ts`)

3. **Modify `scanExecutor.ts`** in `../dashboard/src/app/api/scanner/lib/` (3 changes):
   - Add `private scanResults = new Map<string, ElementData[]>()` property
   - Add `this.scanResults.set(projectPath, elements)` to `runScanForProject()` (1 line)
   - Replace `runPopulateForProject()` → `runGenerateForProject()` (68 lines deleted, 40 new lines)
   - Update function call: `runPopulateForProject()` → `runGenerateForProject()`

4. **Test manually** via dashboard UI:
   - Verify no re-scanning (Phase 1 caches, Phase 2 uses cache)
   - Verify parallel generation (faster than sequential)
   - Verify all 16 files generated

5. **Add automated tests** in `src/__tests__/`

6. **Verify performance improvement** (should be 3-5x faster than Python subprocess)
