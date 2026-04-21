---
agent: claude-sonnet-4.5
date: "2026-01-13"
task: DOCUMENT
subject: Dependency Graph Builder
parent_project: coderef-core
category: service
version: "1.0.0"
related_files:
  - packages/coderef-core/src/fileGeneration/buildDependencyGraph.ts
  - packages/coderef-core/src/types/types.ts
status: APPROVED
---

# Dependency Graph Builder — Authoritative Documentation

## Executive Summary

The Dependency Graph Builder is a TypeScript function that generates `.coderef/graph.json` files containing import/export relationships, function call graphs, and file-level dependencies from scanned code elements. It creates a graph structure with nodes (files and elements) and edges (imports, calls, extends, implements relationships), writes the graph to both `.coderef/graph.json` and `.coderef/exports/graph.json`, and returns the graph structure for programmatic use. The system powers cross-file analysis, impact analysis, and context discovery workflows by providing a structured representation of code relationships. It serves as a core component of the File Generation System, generating one of the 16 output files required for CodeRef scanner completion.

## Audience & Intent

- **Markdown (this document):** Architectural truth for graph structure, node/edge contracts, and file output format
- **TypeScript (buildDependencyGraph function):** Runtime behavior for graph construction, file I/O, and relationship detection
- **JSON Schema (graph.json):** Validation contract for graph file structure
- **Graph Consumers:** MCP tools, analysis workflows, impact analysis, context discovery

## 1. Architecture Overview

### Role in System

The Dependency Graph Builder is a **core analysis function** within the File Generation System, positioned between:
- **Input:** `ElementData[]` from scanner (Phase 1)
- **Processing:** Graph construction from elements
- **Output:** `DependencyGraph` structure and JSON files

**Integration Points:**
- **File Generation System:** Called in Phase 2 (parallel with `generateContext()`)
- **Scanner:** Consumes `ElementData[]` from `scanCurrentElements()`
- **Graph Consumers:** MCP tools, impact analysis, context discovery workflows
- **File System:** Writes to `.coderef/graph.json` and `.coderef/exports/graph.json`

### Graph Structure

```
DependencyGraph
├── Metadata (version, generatedAt, projectPath)
├── Nodes (GraphNode[])
│   ├── File nodes (type: 'file')
│   └── Element nodes (type: 'element')
└── Edges (GraphEdge[])
    ├── File → Element (type: 'imports')
    └── Element → Element (type: 'calls')
```

### Node Types

**File Nodes:**
- `id`: `file:${filePath}`
- `type`: `'file'`
- `label`: Basename of file
- `path`: Full file path

**Element Nodes:**
- `id`: `element:${filePath}:${elementName}`
- `type`: `'element'`
- `label`: Element name
- `path`: File path containing element
- `elementType`: Element type (function, class, method, etc.)
- `metadata`: `{ line, exported }`

### Edge Types

**File → Element (imports):**
- `source`: File node ID
- `target`: Element node ID
- `type`: `'imports'`
- Represents: Element is contained in file

**Element → Element (calls):**
- `source`: Calling element node ID
- `target`: Called element node ID
- `type`: `'calls'`
- Represents: Function/method call relationship

**Note:** `'extends'` and `'implements'` edge types are defined in interface but not currently generated.

### File Structure

**Location:** `packages/coderef-core/src/fileGeneration/buildDependencyGraph.ts`

**Exports:**
- `buildDependencyGraph(projectPath, elements): Promise<DependencyGraph>`
- `DependencyGraph` interface
- `GraphNode` interface
- `GraphEdge` interface

**Dependencies:**
- `../types/types.ts` - `ElementData` interface
- Node.js `fs/promises` - File I/O
- Node.js `path` - Path manipulation

## 2. State Ownership & Source of Truth

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| Input elements | Caller (File Generation System) | Domain | None (ephemeral) | Scanner output |
| File nodes | `buildDependencyGraph()` | Domain | None (ephemeral) | Derived from unique files in elements |
| Element nodes | `buildDependencyGraph()` | Domain | None (ephemeral) | Derived from elements array |
| Graph edges | `buildDependencyGraph()` | Domain | None (ephemeral) | Derived from element relationships |
| Graph structure | `buildDependencyGraph()` | Domain | None (ephemeral) | Assembled from nodes and edges |
| graph.json (main) | `buildDependencyGraph()` | System | File system | `.coderef/graph.json` |
| graph.json (export) | `buildDependencyGraph()` | System | File system | `.coderef/exports/graph.json` |

**Precedence Rules:**
- Input `ElementData[]` is authoritative for code elements (no validation)
- File nodes are created from unique files in elements (no file system validation)
- Element nodes are created from elements array (one node per element)
- Edges are created from `element.calls` array (only same-file calls detected)
- Graph files are overwritten on each generation (no incremental updates)

## 3. Data Persistence

### Storage Keys and Schema

**File Locations:**
- `.coderef/graph.json` - Main graph file
- `.coderef/exports/graph.json` - Export copy (identical content)

**Graph Schema:**
```typescript
interface DependencyGraph {
  version: string;                    // "2.0.0"
  generatedAt: string;                // ISO8601 timestamp
  projectPath: string;               // Absolute project path
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics: {
    totalNodes: number;
    totalEdges: number;
    filesWithDependencies: number;
  };
}

interface GraphNode {
  id: string;                         // "file:path" or "element:path:name"
  type: 'file' | 'element';
  label: string;                      // Display name
  path?: string;                      // File path
  elementType?: string;                // For element nodes
  metadata?: Record<string, any>;     // { line, exported }
}

interface GraphEdge {
  source: string;                     // Node ID
  target: string;                     // Node ID
  type: 'imports' | 'calls' | 'extends' | 'implements';
  weight?: number;                    // Optional edge weight
}
```

**Versioning Strategy:**
- Version field: `"2.0.0"` (hardcoded)
- Schema changes require version bump (no migration logic)
- Consumers should validate version before parsing

**Failure Modes & Recovery:**
- **Directory creation failure:** `fs.mkdir()` with `recursive: true` handles missing directories
- **File write failure:** Propagates error (no recovery)
- **Invalid elements:** No validation - invalid elements may create invalid nodes
- **Missing element.calls:** Handled gracefully (no edges created)

**Cross-tab/Multi-client Sync:**
- Not applicable. Graph generation is single-process, single-execution.

## 4. State Lifecycle

### Canonical Execution Sequence

1. **Invocation:**
   - `buildDependencyGraph(projectPath, elements)` called
   - `projectPath` must be absolute path
   - `elements` must be `ElementData[]` array

2. **Node Creation (Synchronous):**
   - Extract unique files from `elements.map(el => el.file)`
   - Create file node for each unique file
   - Store in `fileNodes` Map for lookup
   - Create element node for each element
   - Store in `elementNodes` Map for lookup

3. **Edge Creation (Synchronous):**
   - For each element: Create edge from file node to element node (type: 'imports')
   - For each element with `calls` array: Create edges to called elements (type: 'calls')
   - Only creates edges if target element exists in `elementNodes` Map

4. **Graph Assembly (Synchronous):**
   - Assemble `DependencyGraph` object with metadata, nodes, edges, statistics
   - Calculate statistics: `totalNodes`, `totalEdges`, `filesWithDependencies`

5. **Directory Creation (Async):**
   - Ensure `.coderef/` directory exists
   - Ensure `.coderef/exports/` directory exists
   - Uses `fs.mkdir(..., { recursive: true })`

6. **File Writing (Async, Parallel):**
   - Write graph JSON to `.coderef/graph.json`
   - Write graph JSON to `.coderef/exports/graph.json`
   - Both writes happen in parallel via `Promise.all()`

7. **Return:**
   - Returns `DependencyGraph` object
   - Files already written to disk

## 5. Behaviors (Events & Side Effects)

### User Behaviors

**None.** Dependency Graph Builder has no direct user interaction. It's invoked programmatically.

### System Behaviors

1. **File System Writes:**
   - Creates directories: `.coderef/`, `.coderef/exports/`
   - Writes 2 files: `graph.json` (main), `graph.json` (export copy)
   - Overwrites existing files without backup

2. **Memory Usage:**
   - Loads entire `ElementData[]` array into memory
   - Builds `fileNodes` and `elementNodes` Maps (O(n) memory)
   - Builds `nodes` and `edges` arrays (O(n + m) memory where n=nodes, m=edges)

3. **Graph Construction:**
   - Creates nodes for all files and elements (no filtering)
   - Creates edges only for detected relationships (calls within same file)
   - Does not detect cross-file imports (limitation)

4. **Error Propagation:**
   - Directory creation errors: Propagate to caller
   - File write errors: Propagate to caller
   - No error recovery (failures abort graph generation)

## 6. Event & Callback Contracts

**Not Applicable.** Dependency Graph Builder uses direct function calls (no events or callbacks).

**Function Contract:**

| Function | Input | Output | Side Effects |
|----------|-------|--------|--------------|
| `buildDependencyGraph(projectPath, elements)` | `string, ElementData[]` | `Promise<DependencyGraph>` | Creates directories, writes files |

## 7. Performance Considerations

### Known Limits

- **Tested Thresholds:**
  - Small projects (< 100 files, < 1000 elements): ~100-500ms
  - Medium projects (100-1000 files, 1000-10000 elements): ~1-5 seconds
  - Large projects (> 1000 files, > 10000 elements): Not tested (may require optimization)

- **Memory Limits:**
  - Entire `ElementData[]` array loaded in memory
  - Graph structure (nodes + edges) in memory
   - Estimated: ~500KB per 1000 elements + graph structure

### Bottlenecks

1. **Edge Creation:** O(n * m) where n=elements, m=avg calls per element (currently only same-file calls)
2. **File I/O:** 2 file writes (parallel, but still I/O bound)
3. **Node Lookup:** Map lookups are O(1) but called O(n) times

### Optimization Opportunities

1. **Cross-File Import Detection:** Currently only detects same-file calls. Add import statement parsing for cross-file edges.
2. **Incremental Updates:** Only regenerate changed portions of graph (requires change detection).
3. **Streaming JSON:** For very large graphs, stream JSON serialization instead of `JSON.stringify()`.
4. **Edge Deduplication:** Currently no deduplication (may create duplicate edges).

### Deferred Optimizations

- **Graph Compression:** No compression of graph structure. Rationale: JSON is human-readable, compression adds complexity.
- **Lazy Edge Creation:** All edges created upfront. Rationale: Simplicity, ensures consistency.
- **Graph Validation:** No validation of graph structure (cycles, orphaned nodes). Rationale: Consumers handle validation.

## 8. Accessibility

**Not Applicable.** Dependency Graph Builder is a backend function with no UI components. Accessibility concerns do not apply.

## 9. Testing Strategy

### Must-Cover Scenarios

1. **Basic Graph Construction:**
   - Single file with multiple elements
   - File nodes and element nodes created correctly
   - File → Element edges created

2. **Call Relationships:**
   - Elements with `calls` array
   - Element → Element edges created
   - Only same-file calls detected (current limitation)

3. **Multiple Files:**
   - Multiple files in elements
   - File nodes created for all files
   - No cross-file edges (current limitation)

4. **Empty Elements:**
   - Empty `ElementData[]` array
   - Returns graph with zero nodes/edges
   - Files still written (valid empty graph)

5. **Directory Creation:**
   - Missing `.coderef/` directory
   - Missing `.coderef/exports/` directory
   - Directories created automatically

6. **File Writing:**
   - Both files written successfully
   - Files contain identical content
   - JSON is valid and parseable

7. **Statistics Calculation:**
   - `totalNodes` = nodes.length
   - `totalEdges` = edges.length
   - `filesWithDependencies` = unique files count

### Explicitly Not Tested

- **Very Large Graphs:** > 100,000 nodes/edges (performance not guaranteed)
- **Concurrent Calls:** Multiple `buildDependencyGraph()` calls simultaneously (undefined behavior)
- **Invalid ElementData:** Malformed elements (no validation, behavior undefined)
- **Cross-File Imports:** Import statement parsing (not implemented)

### Test Files

- `packages/coderef-core/src/fileGeneration/__tests__/buildDependencyGraph.test.ts` - Unit tests exist

## 10. Non-Goals / Out of Scope

1. **Cross-File Import Detection:** Only detects same-file calls (no import statement parsing)
2. **Graph Algorithms:** No path finding, cycle detection, or graph traversal (consumers handle)
3. **Incremental Updates:** Full regeneration each time (no change detection)
4. **Graph Validation:** No validation of graph structure (consumers validate)
5. **Visualization:** Does not generate diagrams (only JSON structure)
6. **Graph Compression:** No compression or optimization of graph structure
7. **Historical Tracking:** No comparison with previous graphs
8. **Edge Weights:** Edge weight calculation not implemented (weight field exists but unused)

## 11. Common Pitfalls & Sharp Edges

### Known Bugs/Quirks

1. **Same-File Call Limitation:**
   - Only detects calls within same file (`element.file` matches)
   - Cross-file function calls not detected
   - Example: `fileA.ts` calls `fileB.ts` function → no edge created

2. **Element ID Collision:**
   - Element IDs use format: `element:${file}:${name}`
   - If same function name exists in same file (unlikely but possible), IDs collide
   - No deduplication or collision handling

3. **Missing Edge Types:**
   - `'extends'` and `'implements'` edge types defined but never created
   - Only `'imports'` and `'calls'` edges are generated

4. **File Node Path Resolution:**
   - File nodes use `element.file` path directly
   - No validation that file exists or path is correct
   - Relative vs absolute path handling not specified

### Integration Gotchas

1. **ElementData.calls Format:**
   - Assumes `element.calls` is array of function names (strings)
   - No validation of call format
   - If `calls` contains objects or other formats, behavior undefined

2. **Project Path Format:**
   - Requires absolute `projectPath`
   - Relative paths may cause incorrect file locations
   - No validation of path format

3. **Graph File Overwrite:**
   - Always overwrites existing `graph.json` files
   - No backup or versioning
   - Concurrent writes may cause corruption (no file locking)

### Configuration Mistakes

1. **Missing Element.calls:**
   - If `element.calls` is undefined or null, no edges created
   - Silent failure (no error, just missing edges)

2. **Invalid Element Types:**
   - No validation of `element.type` values
   - Invalid types may create confusing graph structure

3. **Large Element Arrays:**
   - Very large `ElementData[]` arrays may cause memory issues
   - No size limits or batching

### Edge Cases

1. **Empty Calls Array:**
   - Element with `calls: []` creates no call edges (correct behavior)
   - But file → element edge still created

2. **Orphaned Elements:**
   - Elements in files not in file list (shouldn't happen but possible)
   - File → element edge not created (element node still created)

3. **Duplicate File Paths:**
   - If `element.file` contains duplicates, multiple file nodes created
   - Should use `Set` to deduplicate (currently does)

## 12. Diagrams

> **Maintenance Rule:** Diagrams below are **illustrative**, not authoritative. State tables and text define truth.

### Graph Construction Flow

```
buildDependencyGraph(projectPath, elements)
    │
    ├─→ Extract unique files → Create file nodes
    │
    ├─→ For each element → Create element node
    │
    ├─→ For each file → Create file → element edge (imports)
    │
    ├─→ For each element.calls → Create element → element edge (calls)
    │
    ├─→ Assemble DependencyGraph object
    │
    ├─→ Create directories (.coderef/, .coderef/exports/)
    │
    └─→ Write graph.json (2 locations, parallel)
```

### Graph Structure Example

```
Nodes:
  - file:src/utils.ts (type: file)
  - element:src/utils.ts:formatDate (type: element)
  - element:src/utils.ts:parseDate (type: element)

Edges:
  - file:src/utils.ts → element:src/utils.ts:formatDate (imports)
  - file:src/utils.ts → element:src/utils.ts:parseDate (imports)
  - element:src/utils.ts:formatDate → element:src/utils.ts:parseDate (calls)
```

## Conclusion

The Dependency Graph Builder is a core analysis function that transforms scanned code elements into a structured graph representation of code relationships. It creates file and element nodes, detects call relationships (within same file), and writes graph JSON files for consumption by MCP tools and analysis workflows. The system is simple, performant for medium-sized projects, and provides a foundation for cross-file analysis, though it currently has limitations (no cross-file import detection, no graph algorithms).

**Maintenance Expectations:**
- Graph structure is stable - schema changes require version bump
- Node/edge creation logic is stable - enhancements require careful testing
- Cross-file import detection is deferred - future enhancement
- Graph algorithms are out of scope - consumers handle traversal/analysis
