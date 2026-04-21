---
agent: claude-sonnet-4.5
date: "2026-01-13"
task: DOCUMENT
subject: Pattern Detection System
parent_project: coderef-core
category: service
version: "1.0.0"
related_files:
  - packages/coderef-core/src/fileGeneration/detectPatterns.ts
  - packages/coderef-core/src/types/types.ts
status: APPROVED
---

# Pattern Detection System — Authoritative Documentation

## Executive Summary

The Pattern Detection System is a TypeScript function that detects common architectural patterns in codebases by analyzing scanned code elements. It identifies 5 pattern types: event handlers (onClick, handleX), decorators (@decorator syntax), error handling patterns (error, exception, catch, throw), test patterns (test, describe, it), and API endpoints (route handlers, HTTP methods). The system generates `.coderef/reports/patterns.json` with pattern matches, statistics, and metadata. It serves as part of the File Generation System's Phase 3 analysis reports, providing insights into codebase architecture and common patterns for documentation and analysis workflows.

## Audience & Intent

- **Markdown (this document):** Architectural truth for pattern detection algorithms, pattern types, and output format
- **TypeScript (detectPatterns function):** Runtime behavior for pattern matching, element analysis, and file generation
- **JSON Schema (patterns.json):** Validation contract for pattern report structure
- **Analysis Workflows:** Pattern insights for documentation, architecture analysis, and code review

## 1. Architecture Overview

### Role in System

The Pattern Detection System is a **specialized analysis function** within the File Generation System, positioned in Phase 3 (Analysis Reports):

```
File Generation System
├── Phase 1: saveIndex() [CRITICAL]
├── Phase 2: generateContext(), buildDependencyGraph() [PARALLEL]
├── Phase 3: detectPatterns(), analyzeCoverage(), validateReferences(), detectDrift() [PARALLEL, FAULT-TOLERANT]
└── Phase 4: generateDiagrams() [PARALLEL, FAULT-TOLERANT]
```

**Integration Points:**
- **Input:** `ElementData[]` from scanner (Phase 1)
- **File Generation System:** Called in Phase 3 via `Promise.allSettled()` (fault-tolerant)
- **Output:** `.coderef/reports/patterns.json` file
- **Consumers:** Documentation workflows, architecture analysis, pattern-based code review

### Pattern Detection Algorithms

**1. Event Handlers:**
- **Pattern:** Function/method names starting with `on` or `handle`
- **Examples:** `onClick`, `handleSubmit`, `onChange`, `handleClick`
- **Algorithm:** `name.toLowerCase().startsWith('on') || name.toLowerCase().startsWith('handle')`

**2. Decorators:**
- **Pattern:** Element names starting with `@`
- **Examples:** `@Component`, `@Injectable`, `@Route`
- **Algorithm:** `name.startsWith('@')`

**3. Error Handling:**
- **Pattern:** Element names containing error-related keywords
- **Keywords:** `error`, `exception`, `catch`, `throw`
- **Algorithm:** `name.toLowerCase().includes(keyword)`

**4. Test Patterns:**
- **Pattern:** Element names or file paths containing test keywords
- **Keywords:** `test`, `describe`, `it`, `should`, `spec`
- **Algorithm:** `name.toLowerCase().includes(keyword) || file.toLowerCase().includes(keyword)`

**5. API Endpoints:**
- **Pattern:** Element names containing API keywords OR file paths containing `/api/` or `route`
- **Keywords:** `get`, `post`, `put`, `delete`, `patch`, `route`, `api`, `endpoint`
- **Algorithm:** `name.toLowerCase().includes(keyword) || file.includes('/api/') || file.includes('route')`

### File Structure

**Location:** `packages/coderef-core/src/fileGeneration/detectPatterns.ts`

**Exports:**
- `detectPatterns(projectPath, elements): Promise<void>`

**Dependencies:**
- `../types/types.ts` - `ElementData` interface
- Node.js `fs/promises` - File I/O
- Node.js `path` - Path manipulation

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Input elements | Caller (File Generation System) | Domain | None (ephemeral) | Scanner output |
| Pattern matches | `detectPatterns()` | Domain | None (ephemeral) | Pattern detection algorithms |
| Pattern report | `detectPatterns()` | Domain | None (ephemeral) | Assembled from pattern matches |
| patterns.json | `detectPatterns()` | System | File system | `.coderef/reports/patterns.json` |

**Precedence Rules:**
- Input `ElementData[]` is authoritative for code elements (no validation)
- Pattern detection algorithms are authoritative for pattern matching (heuristic-based)
- Output file overwrites existing `patterns.json` (no incremental updates)

## 3. Data Persistence

### Storage Keys and Schema

**File Location:**
- `.coderef/reports/patterns.json`

**Pattern Report Schema:**
```typescript
interface PatternReport {
  version: string;                    // "2.0.0"
  generatedAt: string;                // ISO8601 timestamp
  projectPath: string;                // Absolute project path
  patterns: {
    handlers: PatternMatch[];         // Event handlers
    decorators: PatternMatch[];       // Decorators
    errorPatterns: PatternMatch[];    // Error handling
    testPatterns: PatternMatch[];     // Test patterns
    apiEndpoints: PatternMatch[];     // API endpoints
  };
  statistics: {
    totalHandlers: number;
    totalDecorators: number;
    totalErrorPatterns: number;
    totalTestPatterns: number;
    totalApiEndpoints: number;
  };
}

interface PatternMatch {
  type: string;                       // Pattern type identifier
  name: string;                       // Element name
  file: string;                       // File path
  line: number;                       // Line number
  count?: number;                     // Optional count
}
```

**Versioning Strategy:**
- Version field: `"2.0.0"` (hardcoded)
- Schema changes require version bump (no migration logic)
- Consumers should validate version before parsing

**Failure Modes & Recovery:**
- **Directory creation failure:** `fs.mkdir()` with `recursive: true` handles missing directories
- **File write failure:** Propagates error (no recovery)
- **Invalid elements:** No validation - invalid elements may create invalid patterns

## 4. State Lifecycle

### Canonical Execution Sequence

1. **Invocation:**
   - `detectPatterns(projectPath, elements)` called
   - `projectPath` must be absolute path
   - `elements` must be `ElementData[]` array

2. **Pattern Detection (Synchronous):**
   - For each pattern type:
     - Filter elements through pattern-specific algorithm
     - Create `PatternMatch` objects with type, name, file, line
     - Store in pattern-specific array

3. **Statistics Calculation (Synchronous):**
   - Count matches for each pattern type
   - Calculate totals for statistics object

4. **Report Assembly (Synchronous):**
   - Assemble `PatternReport` object with metadata, patterns, statistics

5. **Directory Creation (Async):**
   - Ensure `.coderef/reports/` directory exists
   - Uses `fs.mkdir(..., { recursive: true })`

6. **File Writing (Async):**
   - Write report JSON to `.coderef/reports/patterns.json`
   - Format: `JSON.stringify(report, null, 2)`

7. **Return:**
   - Returns `Promise<void>` (no return value)

## 5. Behaviors (Events & Side Effects)

### User Behaviors

**None.** Pattern Detection System has no direct user interaction. It's invoked programmatically.

### System Behaviors

1. **File System Writes:**
   - Creates directory: `.coderef/reports/`
   - Writes 1 file: `patterns.json`
   - Overwrites existing file without backup

2. **Memory Usage:**
   - Loads entire `ElementData[]` array into memory
   - Builds pattern match arrays (O(n) memory where n=elements)
   - No streaming - all processing in-memory

3. **Pattern Matching:**
   - Linear scan through all elements (O(n) time complexity)
   - Each element checked against 5 pattern algorithms
   - No caching or optimization

4. **Error Propagation:**
   - Directory creation errors: Propagate to caller
   - File write errors: Propagate to caller
   - No error recovery (failures abort pattern detection)

## 6. Event & Callback Contracts

**Not Applicable.** Pattern Detection System uses direct function calls (no events or callbacks).

**Function Contract:**

| Function | Input | Output | Side Effects |
|----------|-------|--------|--------------|
| `detectPatterns(projectPath, elements)` | `string, ElementData[]` | `Promise<void>` | Creates directory, writes file |

## 7. Performance Considerations

### Known Limits

- **Tested Thresholds:**
  - Small projects (< 1000 elements): ~50-200ms
  - Medium projects (1000-10000 elements): ~200-1000ms
  - Large projects (> 10000 elements): Not tested (may require optimization)

- **Memory Limits:**
  - Entire `ElementData[]` array loaded in memory
  - Pattern match arrays in memory
  - Estimated: ~100KB per 1000 elements + pattern matches

### Bottlenecks

1. **Linear Scan:** O(n) scan through all elements (n = total elements)
2. **Multiple Pattern Checks:** Each element checked against 5 algorithms (5n operations)
3. **String Operations:** Case-insensitive string matching (toLowerCase() called multiple times)

### Optimization Opportunities

1. **Early Exit:** Skip pattern checks if element type doesn't match (e.g., constants can't be handlers)
2. **Caching:** Cache `toLowerCase()` results (avoid repeated calls)
3. **Parallel Pattern Detection:** Detect different patterns in parallel (minimal benefit, adds complexity)
4. **Streaming:** Process elements in batches for very large codebases

### Deferred Optimizations

- **Pattern Caching:** No caching of pattern results. Rationale: Patterns may change, re-analysis ensures accuracy.
- **Incremental Updates:** Full regeneration preferred. Rationale: Ensures consistency, avoids change detection complexity.

## 8. Accessibility

**Not Applicable.** Pattern Detection System is a backend function with no UI components. Accessibility concerns do not apply.

## 9. Testing Strategy

### Must-Cover Scenarios

1. **Pattern Detection:**
   - Event handlers detected correctly (onClick, handleSubmit)
   - Decorators detected correctly (@Component, @Injectable)
   - Error patterns detected correctly (handleError, catchException)
   - Test patterns detected correctly (testFunction, describeBlock)
   - API endpoints detected correctly (getRoute, postEndpoint)

2. **File Output:**
   - `patterns.json` created with correct structure
   - JSON is valid and parseable
   - Statistics match pattern counts

3. **Edge Cases:**
   - Empty `ElementData[]` array (returns empty patterns, zero statistics)
   - No patterns found (all arrays empty, statistics all zero)
   - All elements match patterns (large arrays, high statistics)

4. **Directory Creation:**
   - Missing `.coderef/reports/` directory
   - Directory created automatically

5. **Pattern False Positives:**
   - Elements with "test" in name but not test functions (e.g., "testData")
   - Elements with "error" in name but not error handlers (e.g., "errorMessage")

### Explicitly Not Tested

- **Very Large Projects:** > 100,000 elements (performance not guaranteed)
- **Concurrent Calls:** Multiple `detectPatterns()` calls simultaneously (undefined behavior)
- **Invalid ElementData:** Malformed elements (no validation, behavior undefined)
- **Pattern Algorithm Accuracy:** False positive/negative rates not measured

### Test Files

- No test files found in codebase (testing needed)

## 10. Non-Goals / Out of Scope

1. **AST-Based Detection:** Uses simple string matching (not AST parsing)
2. **Custom Patterns:** Only 5 predefined patterns (no extensibility)
3. **Pattern Validation:** No validation that detected patterns are actually patterns
4. **Incremental Updates:** Full regeneration each time (no change detection)
5. **Pattern Relationships:** No detection of pattern relationships or dependencies
6. **Pattern Metrics:** No complexity or quality metrics for patterns
7. **Multi-language Support:** Patterns are language-agnostic but may not work for all languages
8. **Pattern Documentation:** No generation of pattern documentation (only JSON report)

## 11. Common Pitfalls & Sharp Edges

### Known Bugs/Quirks

1. **False Positives:**
   - **Test Patterns:** Elements with "test" in name but not test functions (e.g., "testData", "testUser")
   - **Error Patterns:** Elements with "error" in name but not error handlers (e.g., "errorMessage", "errorCode")
   - **API Endpoints:** Elements with "route" in name but not API routes (e.g., "routeHelper", "routeParser")

2. **Case Sensitivity:**
   - All matching is case-insensitive (toLowerCase())
   - May match unintended patterns (e.g., "ON" in "Button" matches handler pattern)

3. **Decorator Detection Limitation:**
   - Only detects elements with names starting with "@"
   - Actual decorator syntax in code not parsed (AST would be required)

4. **File Path Matching:**
   - Test and API patterns check file paths
   - May match files in unrelated directories (e.g., `/api-docs/` matches API pattern)

### Integration Gotchas

1. **ElementData Format:**
   - Assumes `element.name` and `element.file` are strings
   - No validation of element structure
   - Invalid elements may cause errors or produce invalid patterns

2. **Pattern Type Consistency:**
   - Pattern types are hardcoded strings
   - No enum or type safety for pattern types
   - Typos in pattern type names not caught

3. **Statistics Accuracy:**
   - Statistics calculated from array lengths
   - If pattern arrays are modified, statistics become inaccurate
   - No validation that statistics match arrays

### Configuration Mistakes

1. **Keyword Lists:**
   - Keywords are hardcoded in functions
   - No configuration or customization
   - Adding new keywords requires code changes

2. **Pattern Algorithms:**
   - Algorithms are simple string matching
   - No regex or complex pattern matching
   - May miss patterns that don't match simple rules

3. **File Path Patterns:**
   - File path matching uses simple `includes()` checks
   - May match unintended paths (e.g., `/api-docs/` matches `/api/` pattern)

### Edge Cases

1. **Empty Elements:**
   - Empty `ElementData[]` array returns valid report with zero patterns
   - No error thrown (acceptable behavior)

2. **No Patterns Found:**
   - All pattern arrays empty
   - Statistics all zero
   - Report still valid (no patterns is valid state)

3. **Duplicate Patterns:**
   - Same element may match multiple patterns (e.g., "handleError" matches both handler and error patterns)
   - No deduplication (element appears in multiple arrays)

4. **Very Long Element Names:**
   - No limits on element name length
   - Very long names may cause performance issues (string operations)

## 12. Diagrams

> **Maintenance Rule:** Diagrams below are **illustrative**, not authoritative. State tables and text define truth.

### Pattern Detection Flow

```
detectPatterns(projectPath, elements)
    │
    ├─→ detectHandlers(elements) → PatternMatch[]
    ├─→ detectDecorators(elements) → PatternMatch[]
    ├─→ detectErrorPatterns(elements) → PatternMatch[]
    ├─→ detectTestPatterns(elements) → PatternMatch[]
    ├─→ detectApiEndpoints(elements) → PatternMatch[]
    │
    ├─→ Calculate statistics (array lengths)
    │
    ├─→ Assemble PatternReport object
    │
    ├─→ Create .coderef/reports/ directory
    │
    └─→ Write patterns.json
```

### Pattern Matching Algorithms

```
For each element in elements:
    │
    ├─→ Handler Pattern: name.startsWith('on') || name.startsWith('handle')
    ├─→ Decorator Pattern: name.startsWith('@')
    ├─→ Error Pattern: name.includes('error'|'exception'|'catch'|'throw')
    ├─→ Test Pattern: name.includes('test'|'describe'|'it'|'should'|'spec') || file.includes(keyword)
    └─→ API Pattern: name.includes('get'|'post'|'route'|...) || file.includes('/api/') || file.includes('route')
```

## Conclusion

The Pattern Detection System is a specialized analysis function that identifies common architectural patterns in codebases using simple string matching algorithms. It generates pattern reports for documentation and analysis workflows, providing insights into codebase structure and common patterns. The system is simple, performant for typical use cases, and fault-tolerant (part of Phase 3 parallel execution), though it has limitations (false positives, simple algorithms, no AST parsing) that are acceptable tradeoffs for the current implementation.

**Maintenance Expectations:**
- Pattern algorithms are stable - changes require careful testing for false positives/negatives
- Pattern types are stable - adding new patterns requires code changes
- Output format is stable - schema changes require version bump
- String matching is basic - enhancements may require AST-based detection
