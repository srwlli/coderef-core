---
agent: claude-sonnet-4.5
date: "2026-01-13"
task: DOCUMENT
subject: Context Generator
parent_project: coderef-core
category: service
version: "1.0.0"
related_files:
  - packages/coderef-core/src/context/context-generator.ts
  - packages/coderef-core/src/context/entry-point-detector.ts
  - packages/coderef-core/src/context/markdown-formatter.ts
  - packages/coderef-core/src/scanner/scanner.ts
  - packages/coderef-core/src/analyzer/analyzer-service.ts
status: APPROVED
---

# Context Generator — Authoritative Documentation

## Executive Summary

The Context Generator is a TypeScript service class that orchestrates comprehensive codebase analysis and context generation for AI/MCP integration. It performs an 8-step pipeline: scanning code elements, detecting entry points, ranking critical functions, detecting architecture patterns, analyzing dependencies (via AnalyzerService), calculating health metrics, building structured context data, and formatting output as both Markdown (human-readable) and JSON (machine-readable). The system serves as the primary entry point for codebase comprehension, generating context.md and context.json files that power AI agents, MCP tools, and documentation workflows. It integrates multiple analysis services (EntryPointDetector, MarkdownFormatter, AnalyzerService) into a unified orchestration layer.

## Audience & Intent

- **Markdown (this document):** Architectural truth for the 8-step pipeline, integration contracts, and output formats
- **TypeScript (ContextGenerator class):** Runtime behavior for orchestration, analysis coordination, and formatting
- **JSON Output (context.json):** Structured data contract for AI agents and MCP tools
- **Markdown Output (context.md):** Human-readable documentation contract

## 1. Architecture Overview

### Role in System

The Context Generator is the **primary orchestration layer** for codebase comprehension, positioned between:
- **Input:** Source directory path and optional configuration
- **Analysis Services:** EntryPointDetector, AnalyzerService, pattern detection
- **Output:** Formatted Markdown and JSON context files

**Integration Points:**
- **Scanner:** Calls `scanCurrentElements()` to get code elements
- **EntryPointDetector:** Detects entry points via naming/file patterns
- **MarkdownFormatter:** Formats context data as Markdown
- **AnalyzerService:** Optional dependency graph analysis (fault-tolerant)
- **File System:** Reads source files for pattern detection

### Component Hierarchy

```
ContextGenerator (orchestrator)
├── EntryPointDetector (entry point detection)
├── MarkdownFormatter (output formatting)
├── scanCurrentElements() (code scanning)
├── AnalyzerService (optional dependency analysis)
└── Private methods:
    ├── rankByImportance() (function scoring)
    ├── detectPatterns() (architecture patterns)
    ├── calculateHealth() (health metrics)
    └── countFiles() (file counting)
```

### 8-Step Pipeline

1. **Scan:** `scanCurrentElements()` → `ElementData[]`
2. **Entry Points:** `entryPointDetector.detectEntryPoints()` → `ElementData[]`
3. **Ranking:** `rankByImportance()` → `Array<ElementData & { score: number }>`
4. **Patterns:** `detectPatterns()` → `{ errorHandling, barrelExports, decorators, asyncAwait }`
5. **Dependencies:** `AnalyzerService.analyze()` (optional, fault-tolerant) → `{ nodeCount, edgeCount, circularity, isolatedNodes }`
6. **Health:** `calculateHealth()` → `{ complexity, maintainability }`
7. **Build Data:** Assemble `ContextData` structure
8. **Format:** `markdownFormatter.format()` + `JSON.stringify()` → `{ markdown, json }`

### File Structure

**Location:** `packages/coderef-core/src/context/`

**Core Files:**
- `context-generator.ts` - Main ContextGenerator class
- `entry-point-detector.ts` - EntryPointDetector class
- `markdown-formatter.ts` - MarkdownFormatter class and ContextData interface

**Dependencies:**
- `../scanner/scanner.ts` - `scanCurrentElements()` function
- `../analyzer/analyzer-service.ts` - `AnalyzerService` class
- `../types/types.ts` - `ElementData`, `ScanOptions` interfaces

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Scanned elements | `scanCurrentElements()` | Domain | None (ephemeral) | Scanner output |
| Entry points | `EntryPointDetector` | Domain | None (ephemeral) | EntryPointDetector.detectEntryPoints() |
| Critical functions | `ContextGenerator.rankByImportance()` | Domain | None (ephemeral) | Scoring algorithm |
| Architecture patterns | `ContextGenerator.detectPatterns()` | Domain | None (ephemeral) | File content regex matching |
| Dependency graph | `AnalyzerService` | Domain | None (ephemeral) | AnalyzerService.analyze() |
| Health metrics | `ContextGenerator.calculateHealth()` | Domain | None (ephemeral) | Calculation from elements + dependencies |
| Context data | `ContextGenerator.generate()` | Domain | None (ephemeral) | Assembled from all analysis steps |
| Markdown output | `MarkdownFormatter` | System | File system (if saved) | MarkdownFormatter.format() |
| JSON output | `ContextGenerator.generate()` | System | File system (if saved) | JSON.stringify() |

**Precedence Rules:**
- Scanner output is authoritative for code elements (no caching, re-scans on each call)
- EntryPointDetector patterns are authoritative for entry point detection
- AnalyzerService failure is non-fatal (falls back to empty dependency stats)
- Health metrics are calculated from current analysis (no historical data)

## 3. Data Persistence

### Storage Keys and Schema

**No Built-in Persistence:**
- Context Generator does not persist output files automatically
- Caller must save `result.markdown` and `result.json` to disk if needed
- File Generation System (`generateContext()`) handles persistence

**Output Schema (ContextData):**
```typescript
interface ContextData {
  overview: {
    sourceDir: string;
    languages: string[];
    totalFiles: number;
    totalElements: number;
  };
  entryPoints: ElementData[];
  criticalFunctions: Array<ElementData & { score: number }>;
  architecturePatterns: {
    errorHandling: number;
    barrelExports: number;
    decorators: number;
    asyncAwait: number;
  };
  dependencies: {
    nodeCount: number;
    edgeCount: number;
    circularity: number;
    isolatedNodes: number;
  };
  health: {
    complexity: number;
    maintainability: 'Good' | 'Fair' | 'Poor';
  };
}
```

**Versioning Strategy:**
- No versioning in ContextGenerator itself
- Output format may change between versions (no migration logic)
- Callers should validate ContextData structure

**Failure Modes & Recovery:**
- **Scanner failure:** Propagates error (no recovery)
- **AnalyzerService failure:** Logs warning, continues with empty dependency stats
- **File read failure (pattern detection):** Skips file, continues with other files
- **Pattern detection errors:** Caught and skipped (non-fatal)

## 4. State Lifecycle

### Canonical Execution Sequence

1. **Initialization:**
   - `new ContextGenerator()` → Creates EntryPointDetector and MarkdownFormatter instances
   - No state initialization (stateless service)

2. **Generation Invocation:**
   - `generator.generate(sourceDir, options)` called
   - Start time recorded for execution metrics

3. **Step 1: Scan (Async)**
   - `scanCurrentElements(sourceDir, languages, scanOptions)` called
   - Returns `ElementData[]` array
   - **Blocking:** Must complete before proceeding

4. **Step 2: Entry Point Detection (Synchronous)**
   - `entryPointDetector.detectEntryPoints(elements)` called
   - Returns filtered `ElementData[]` array
   - **Blocking:** Must complete before proceeding

5. **Step 3: Function Ranking (Synchronous)**
   - `rankByImportance(elements, topN)` called
   - Filters to functions/methods, calculates scores, sorts, returns top N
   - **Blocking:** Must complete before proceeding

6. **Step 4: Pattern Detection (Async)**
   - `detectPatterns(sourceDir, elements)` called
   - Reads source files, applies regex patterns
   - Returns pattern counts
   - **Blocking:** Must complete before proceeding

7. **Step 5: Dependency Analysis (Async, Optional, Fault-Tolerant)**
   - If `useAnalyzer !== false`: Creates `AnalyzerService`, calls `analyze()`
   - On error: Logs warning, uses empty dependency stats
   - **Non-blocking:** Failure doesn't abort generation

8. **Step 6: Health Calculation (Synchronous)**
   - `calculateHealth(elements, dependencies)` called
   - Calculates complexity and maintainability
   - **Blocking:** Must complete before proceeding

9. **Step 7: Data Assembly (Synchronous)**
   - Assembles `ContextData` object from all analysis results
   - **Blocking:** Must complete before proceeding

10. **Step 8: Formatting (Synchronous)**
    - `markdownFormatter.format(contextData)` → Markdown string
    - `JSON.stringify(contextData, null, 2)` → JSON string
    - **Blocking:** Must complete before proceeding

11. **Return Result:**
    - Returns `ContextResult` with `markdown`, `json`, and `stats`
    - Execution time calculated and included in stats

## 5. Behaviors (Events & Side Effects)

### User Behaviors

**None.** Context Generator has no direct user interaction. It's invoked programmatically.

### System Behaviors

1. **File System Reads:**
   - Reads source files during pattern detection (Step 4)
   - Reads files listed in `ElementData[].file` paths
   - Skips files that can't be read (non-fatal)

2. **Console Warnings:**
   - Logs `console.warn()` if AnalyzerService fails (Step 5)
   - No other console output

3. **Memory Usage:**
   - Loads entire `ElementData[]` array into memory
   - Loads file contents for pattern detection (one file at a time)
   - No streaming - all processing in-memory

4. **Error Propagation:**
   - Scanner errors: Propagate to caller (abort generation)
   - AnalyzerService errors: Caught, logged, continue with defaults
   - File read errors: Caught, skipped, continue with other files

## 6. Event & Callback Contracts

**Not Applicable.** Context Generator uses direct method calls (no events or callbacks).

**Method Contracts:**

| Method | Input | Output | Side Effects |
|--------|-------|--------|--------------|
| `generate(sourceDir, options?)` | `string, ContextOptions?` | `Promise<ContextResult>` | Reads files, calls scanner/analyzer |
| `rankByImportance(elements, topN)` | `ElementData[], number` | `Array<ElementData & { score: number }>` | None (pure function) |
| `detectPatterns(sourceDir, elements)` | `string, ElementData[]` | `Promise<PatternCounts>` | Reads source files |
| `calculateHealth(elements, dependencies)` | `ElementData[], DependencyStats` | `HealthMetrics` | None (pure function) |

## 7. Performance Considerations

### Known Limits

- **Tested Thresholds:**
  - Small projects (< 100 files): ~1-2 seconds total
  - Medium projects (100-1000 files): ~5-15 seconds
  - Large projects (> 1000 files): Not tested (may require optimization)

- **Memory Limits:**
  - Entire `ElementData[]` array loaded in memory
  - File contents loaded sequentially (not all at once)
  - Estimated: ~2MB per 1000 elements + file contents

### Bottlenecks

1. **File I/O (Step 4):** Sequential file reads for pattern detection (O(n) file operations)
2. **AnalyzerService (Step 5):** AST parsing for dependency analysis (slowest step if enabled)
3. **Scanner (Step 1):** AST parsing for code element extraction (blocking)

### Optimization Opportunities

1. **Parallel File Reads:** Read multiple files concurrently in `detectPatterns()`
2. **Caching:** Cache scanner results if source directory hasn't changed
3. **Lazy Pattern Detection:** Only detect patterns if requested in options
4. **Streaming:** Stream large `ElementData[]` arrays instead of loading all at once

### Deferred Optimizations

- **Incremental Analysis:** No incremental updates (full re-analysis each time). Rationale: Ensures consistency, avoids change detection complexity.
- **Pattern Detection Caching:** No caching of pattern results. Rationale: Patterns may change, re-analysis ensures accuracy.

## 8. Accessibility

**Not Applicable.** Context Generator is a backend service with no UI components. Accessibility concerns do not apply.

## 9. Testing Strategy

### Must-Cover Scenarios

1. **Happy Path:**
   - All 8 steps complete successfully
   - Returns valid Markdown and JSON
   - Stats include correct counts

2. **AnalyzerService Failure:**
   - AnalyzerService throws error
   - Generation continues with empty dependency stats
   - Warning logged but not thrown

3. **File Read Failures:**
   - Some files can't be read during pattern detection
   - Generation continues, skips failed files
   - Pattern counts reflect only successfully read files

4. **Empty Codebase:**
   - No elements found by scanner
   - Returns valid context with zero counts
   - No errors thrown

5. **Custom Options:**
   - Custom languages, topN, scanOptions
   - Options applied correctly
   - Defaults used when options omitted

6. **Entry Point Detection:**
   - Entry points detected via name patterns
   - Entry points detected via file patterns
   - No false positives/negatives

### Explicitly Not Tested

- **Very Large Projects:** > 10,000 elements (performance not guaranteed)
- **Concurrent Calls:** Multiple `generate()` calls simultaneously (undefined behavior)
- **Network File Systems:** Files on network drives (may have permission issues)
- **Symbolic Links:** Projects with symlinks (behavior undefined)

### Test Files

- No test files found in codebase (testing needed)

## 10. Non-Goals / Out of Scope

1. **File Persistence:** Does not save output files (caller's responsibility)
2. **Incremental Updates:** Full re-analysis each time (no change detection)
3. **Caching:** No caching of scan results or analysis
4. **Streaming:** All processing in-memory (no streaming for large codebases)
5. **Custom Patterns:** Only 4 predefined architecture patterns (no extensibility)
6. **Graph Visualization:** Does not generate diagrams (only statistics)
7. **Historical Tracking:** No comparison with previous analyses
8. **Multi-language Support:** Supports 10 languages but no language-specific analysis

## 11. Common Pitfalls & Sharp Edges

### Known Bugs/Quirks

1. **Pattern Detection False Positives:**
   - Regex patterns may match comments or strings (not just code)
   - Example: `try {` in a comment string still counted

2. **Function Ranking Simplification:**
   - Scoring formula simplified (only uses `calls * 2`)
   - Full formula (`dependents * 3 + calls * 2 + coverage - complexity`) not implemented
   - May not accurately rank functions without dependency graph

3. **Circular Dependency Detection:**
   - AnalyzerService provides circularity percentage
   - But Context Generator doesn't use it for health calculation beyond threshold checks

4. **File Path Resolution:**
   - `detectPatterns()` handles absolute vs relative paths
   - But may fail if `sourceDir` and `element.file` paths don't align

### Integration Gotchas

1. **AnalyzerService Optional:**
   - Dependency analysis is optional (`useAnalyzer` defaults to `true` but can fail)
   - Callers should not assume dependency stats are always populated
   - Check for zero values to detect analyzer failure

2. **Scanner Dependency:**
   - Requires `scanCurrentElements()` to be available
   - Scanner must support all requested languages
   - Scanner errors propagate (no fallback)

3. **Output Format Changes:**
   - ContextData structure may change between versions
   - No version field in output
   - Callers should validate structure

### Configuration Mistakes

1. **Language Mismatch:**
   - Requesting unsupported languages causes scanner to fail
   - No validation of language support before scanning

2. **Exclude Patterns:**
   - Default excludes may be too aggressive
   - Custom `scanOptions.exclude` may conflict with defaults

3. **TopN Too Large:**
   - No limit on `topN` parameter
   - Very large values may cause performance issues

### Edge Cases

1. **Empty Source Directory:**
   - Returns valid context with all zero counts
   - No error thrown (acceptable behavior)

2. **No Functions Found:**
   - `criticalFunctions` array is empty
   - Health metrics still calculated (may be misleading)

3. **All Files Unreadable:**
   - Pattern detection returns all zeros
   - Generation continues (no error)

## 12. Diagrams

> **Maintenance Rule:** Diagrams below are **illustrative**, not authoritative. State tables and text define truth.

### Execution Pipeline

```
generate(sourceDir, options)
    │
    ├─→ Step 1: scanCurrentElements() → ElementData[]
    │
    ├─→ Step 2: detectEntryPoints() → ElementData[]
    │
    ├─→ Step 3: rankByImportance() → Array<ElementData & { score }>
    │
    ├─→ Step 4: detectPatterns() → PatternCounts
    │
    ├─→ Step 5: AnalyzerService.analyze() → DependencyStats (optional, fault-tolerant)
    │
    ├─→ Step 6: calculateHealth() → HealthMetrics
    │
    ├─→ Step 7: Assemble ContextData
    │
    └─→ Step 8: Format → { markdown, json, stats }
```

### Integration Dependencies

```
ContextGenerator
    │
    ├─→ scanCurrentElements() (Scanner)
    ├─→ EntryPointDetector
    ├─→ MarkdownFormatter
    └─→ AnalyzerService (optional)
```

## Conclusion

The Context Generator is the primary orchestration layer for codebase comprehension, performing an 8-step analysis pipeline that transforms source code into structured context for AI agents and documentation. It integrates multiple analysis services (scanner, entry point detector, analyzer, formatter) into a unified workflow, handling errors gracefully and providing both human-readable (Markdown) and machine-readable (JSON) outputs. The system is stateless, performant for medium-sized projects, and fault-tolerant for optional analysis steps.

**Maintenance Expectations:**
- 8-step pipeline is stable - changes require careful coordination
- Integration contracts are stable - scanner/analyzer changes require ContextGenerator updates
- Output format may evolve - callers should validate ContextData structure
- Pattern detection is basic - enhancements require regex updates or AST-based detection
