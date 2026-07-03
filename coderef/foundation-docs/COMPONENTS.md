# Component Catalog

**Project:** @coderef/core
**Version:** 2.0.0
**Last Updated:** 2026-07-03 (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced)

---

## Statistics

- **Total Files:** 296
- **Total Elements:** 1,977
- **Languages:** TypeScript, JavaScript, Python
- **Total Lines of Code:** 75,601

---

## Table of Contents

1. [Overview](#overview)
2. [Scanner Components](#scanner-components)
3. [Analyzer Components](#analyzer-components)
4. [File Generation Components](#file-generation-components)
5. [Query Components](#query-components)
6. [Type System Components](#type-system-components)
7. [Indexer Components](#indexer-components)
8. [Integration Components](#integration-components)
9. [Utility Components](#utility-components)
10. [Component Dependencies](#component-dependencies)

---

## Overview

**@coderef/core** is a functional library composed of classes, services, and utility functions. This document catalogs all major components organized by module.

**Component Types:**
- **Classes:** Object-oriented components with state and methods
- **Services:** Stateless orchestrators that coordinate multiple components
- **Functions:** Pure utility functions
- **Constants:** Static configuration data

---

## Scanner Components

### `scanCurrentElements()` (Function)

**Location:** `src/scanner/scanner.ts`

**Exported:** Yes

**Purpose:** Main scanning function that extracts code elements from source files

**Type:** Async Function

**Dependencies:**
- `glob` - File pattern matching
- `minimatch` - Glob pattern filtering
- `fs` - File system access
- `crypto` - SHA256 hash generation

**Signature:**
```typescript
async function scanCurrentElements(
  basePath: string,
  languages: string | string[],
  options?: ScanOptions
): Promise<ElementData[]>
```

**Usage:**
```typescript
import { scanCurrentElements } from '@coderef/core';

const elements = await scanCurrentElements('./src', ['ts', 'tsx']);
```

**Characteristics:**
- ✅ Pure function (no side effects except file I/O)
- ✅ Parallel file processing (Promise.all)
- ✅ Deduplication by hash
- ⚡ Performance: ~1200ms for 500 files

---

### `LANGUAGE_PATTERNS` (Constant)

**Location:** `src/scanner/scanner.ts:12`

**Purpose:** Pattern library defining regex patterns for 8+ languages

**Type:** Constant Object

**Structure:**
```typescript
const LANGUAGE_PATTERNS: Record<string, Array<{
  type: ElementData['type'];
  pattern: RegExp;
  nameGroup: number;
}>>
```

**Supported Languages:**
- TypeScript (`ts`, `tsx`)
- JavaScript (`js`, `jsx`)
- Python (`py`)
- Go (`go`)
- Rust (`rs`)
- Java (`java`)
- C# (`cs`)
- PHP (`php`)

**Usage:**
```typescript
import { LANGUAGE_PATTERNS } from '@coderef/core';

const tsPatterns = LANGUAGE_PATTERNS.ts;
console.log(`TypeScript has ${tsPatterns.length} patterns`);
```

---

## Relationship Query Components

> **Rebuild note:** the pre-rebuild in-memory analyzer family — `AnalyzerService`,
> `GraphBuilder`, `GraphAnalyzer`, `ImportParser`, `CallDetector`, `QueryExecutor` — was
> removed. Relationships are now built by the pipeline into the canonical
> `.coderef/graph.json` and queried through `CanonicalGraphQuery` (or the `coderef-query`
> CLI / MCP tools). Import- and call-edge detection lives inside the pipeline generators.

### `CanonicalGraphQuery` (Class)

**Location:** `src/query/canonical-graph.ts`

**Purpose:** Query relationships over the persisted canonical graph (`.coderef/graph.json`)

**Type:** Query Class (loaded from a persisted graph)

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `resolve(query)` | Resolve a symbol to graph node(s) (by id, name, or file) | `NodeResolution` |
| `callersOf(resolution)` | Elements that call the resolved element (inbound) | `CanonicalNode[]` |
| `calleesOf(resolution)` | Elements called by the resolved element (outbound) | `CanonicalNode[]` |

**Usage:**
```typescript
import { loadCanonicalGraph } from '@coderef/core';

const query = loadCanonicalGraph('./');
const resolution = query.resolve('deduplicateElements');
const callers = query.callersOf(resolution);   // inbound call edges
const callees = query.calleesOf(resolution);   // outbound call edges
```

**Characteristics:**
- ✅ Reads the persisted `.coderef/graph.json` — no in-memory rebuild
- ✅ Typed against `ExportedGraph` (schema drift is a compile error)
- ⚡ Cycle detection / statistics: use the `cycles` / `codebase_summary` MCP tools or `coderef-query`

---

## File Generation Components

### `saveIndex()` (Function)

**Location:** `src/fileGeneration/saveIndex.ts:27`

**Purpose:** Save scan results to `.coderef/index.json`

**Type:** Async Function

**Signature:**
```typescript
async function saveIndex(
  projectPath: string,
  elements: ElementData[]
): Promise<void>
```

**Output:** `.coderef/index.json` (JSON file with metadata)

**Dependencies:**
- `fs/promises` - File system access

**Usage:**
```typescript
import { saveIndex } from '@coderef/core';

await saveIndex('./my-project', elements);
```

**Characteristics:**
- ✅ Creates `.coderef/` directory if missing
- ✅ Adds metadata (version, timestamp, statistics)
- ⚡ Performance: ~10ms for 541 elements

---

### `generateContext()` (Function)

**Location:** `src/fileGeneration/generateContext.ts:43`

**Purpose:** Generate AI-readable context files (JSON + Markdown)

**Type:** Async Function

**Signature:**
```typescript
async function generateContext(
  projectPath: string,
  elements: ElementData[]
): Promise<void>
```

**Outputs:**
- `.coderef/context.json` - Structured data
- `.coderef/context.md` - Human-readable summary

**Dependencies:**
- `fs/promises` - File system access

**Usage:**
```typescript
import { generateContext } from '@coderef/core';

await generateContext('./my-project', elements);
```

**Characteristics:**
- ✅ Generates statistics (elements by type, files by extension)
- ✅ Ranks top files by element count
- ⚡ Performance: ~20ms for 541 elements

---

### `buildDependencyGraph()` (Function)

**Location:** `src/fileGeneration/buildDependencyGraph.ts:45`

**Purpose:** Build and save dependency graph

**Type:** Async Function

**Signature:**
```typescript
async function buildDependencyGraph(
  projectPath: string,
  elements: ElementData[]
): Promise<DependencyGraph>
```

**Output:** `.coderef/graph.json`

**Returns:** `DependencyGraph` object

**Dependencies:**
- Pipeline graph generator (`src/pipeline/generators/graph-generator.ts`) - builds nodes + edges
- `fs/promises` - File system access

**Usage:**
```typescript
import { buildDependencyGraph } from '@coderef/core';

const graph = await buildDependencyGraph('./my-project', elements);
```

**Characteristics:**
- ✅ Returns graph object (not just file I/O)
- ✅ Serializes Map to JSON array
- ⚡ Performance: ~50ms for 541 elements

---

### `detectPatterns()` (Function)

**Location:** `src/fileGeneration/detectPatterns.ts:48`

**Purpose:** Detect common code patterns (handlers, decorators, etc)

**Type:** Async Function

**Output:** `.coderef/reports/patterns.json`

**Detects:**
- Event handlers (onClick, handleX)
- Decorators (@Component, @Injectable)
- Error patterns (try/catch, error classes)
- Test patterns (describe, it, test)
- API endpoints (GET, POST routes)

**Usage:**
```typescript
import { detectPatterns } from '@coderef/core';

await detectPatterns('./my-project', elements);
```

**Characteristics:**
- ✅ Regex-based pattern matching
- ✅ Categorizes patterns by type
- ⚡ Performance: ~30ms for 541 elements

---

### `analyzeCoverage()` (Function)

**Location:** `src/fileGeneration/analyzeCoverage.ts:45`

**Purpose:** Analyze test coverage

**Type:** Async Function

**Output:** `.coderef/reports/coverage.json`

**Analyzes:**
- Test files vs source files ratio
- Uncovered files (no corresponding test)
- Coverage percentage by element type

**Usage:**
```typescript
import { analyzeCoverage } from '@coderef/core';

await analyzeCoverage('./my-project', elements);
```

**Characteristics:**
- ✅ Heuristic-based (matches `*.test.ts` to `*.ts`)
- ✅ Reports uncovered files
- ⚡ Performance: ~20ms for 541 elements

---

### `validateReferences()` (Function)

**Location:** `src/fileGeneration/validateReferences.ts:42`

**Purpose:** Validate imports and references

**Type:** Async Function

**Output:** `.coderef/reports/validation.json`

**Validates:**
- Broken imports (file not found)
- Missing dependencies (module not installed)
- Undefined references

**Usage:**
```typescript
import { validateReferences } from '@coderef/core';

await validateReferences('./my-project', elements);
```

**Characteristics:**
- ✅ Checks file system for imported files
- ✅ Reports line numbers for errors
- ⚡ Performance: ~40ms for 541 elements

---

### `detectDrift()` (Function)

**Location:** `src/fileGeneration/detectDrift.ts:38`

**Purpose:** Detect changes since last scan

**Type:** Async Function

**Output:** `.coderef/reports/drift.json`

**Detects:**
- New elements (added)
- Deleted elements (removed)
- Modified elements (hash changed)

**Dependencies:**
- Requires previous `.coderef/index.json`

**Usage:**
```typescript
import { detectDrift } from '@coderef/core';

await detectDrift('./my-project', elements);
```

**Characteristics:**
- ✅ Compares current vs previous index
- ✅ Uses hash for modification detection
- ⚡ Performance: ~15ms for 541 elements

---

### `generateDiagrams()` (Function)

**Location:** `src/fileGeneration/generateDiagrams.ts:52`

**Purpose:** Generate visual dependency diagrams

**Type:** Async Function

**Outputs:**
- `.coderef/diagrams/dependencies.mmd` - Mermaid diagram
- `.coderef/diagrams/dependencies.dot` - Graphviz diagram
- `.coderef/diagrams/calls.mmd` - Call graph
- `.coderef/diagrams/imports.mmd` - Import graph

**Usage:**
```typescript
import { generateDiagrams } from '@coderef/core';

await generateDiagrams('./my-project', elements);
```

**Characteristics:**
- ✅ Generates both Mermaid and Graphviz formats
- ✅ Creates separate diagrams for calls and imports
- ⚡ Performance: ~30ms for 541 elements

---

## Query Components

### `CanonicalGraphQuery` (Class)

**Location:** `src/query/canonical-graph.ts`

**Purpose:** Execute relationship queries over the persisted canonical graph. Replaces the
removed `QueryExecutor` (which orchestrated an in-memory `AnalyzerService`).

**Type:** Query Class (loaded from `.coderef/graph.json`)

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `resolve(query)` | Resolve a symbol to graph node(s) | `NodeResolution` |
| `callersOf(resolution)` | What calls this element (inbound) | `CanonicalNode[]` |
| `calleesOf(resolution)` | What this element calls (outbound) | `CanonicalNode[]` |

**Query concepts (served via `coderef-query` CLI / MCP tools over the same graph):**
- `what-calls` / `what-calls-me` - inbound / outbound call edges (`what_calls` MCP tool)
- `what-imports` / `what-imports-me` - import relationships (`what_imports` MCP tool)
- `impact-of` - transitive dependents (`impact_of` MCP tool)
- `cycles` - dependency cycles (`cycles` MCP tool)

**Usage:**
```typescript
import { loadCanonicalGraph } from '@coderef/core';

const query = loadCanonicalGraph('./');
const result = query.callersOf(query.resolve('scanCurrentElements'));
```

**Characteristics:**
- ✅ Reads the persisted `.coderef/graph.json` — no in-memory analyze pass
- ✅ Typed against `ExportedGraph` (schema drift is a compile error)
- ⚡ The same graph backs the `coderef-query` CLI and the MCP intelligence tools

---

## Type System Components

### Type Validation Functions

**Location:** `src/types/types.ts`

**Functions:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `isValidTypeDesignator(type)` | Check if type is valid | `boolean` |
| `getTypeMetadata(type)` | Get type metadata | `TypeMetadata \| null` |
| `getTypePriority(type)` | Get type priority | `TypePriority` |
| `getHighPriorityTypes()` | Get all high-priority types | `string[]` |
| `getTypesByPriority(priority)` | Get types by priority level | `string[]` |

**Usage:**
```typescript
import {
  isValidTypeDesignator,
  getTypeMetadata,
  TypePriority
} from '@coderef/core';

if (isValidTypeDesignator('Fn')) {
  const meta = getTypeMetadata('Fn');
  console.log(meta.priority); // TypePriority.High
}
```

**Characteristics:**
- ✅ Compile-time type checking (TypeScript)
- ✅ Runtime validation
- ⚡ Performance: O(1) lookups

---

## Indexer Components

### `IndexerService` (Class)

**Location:** `src/indexer/indexer-service.ts:20`

**Purpose:** Build and manage searchable indexes

**Type:** Indexer Service

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `buildIndex(elements)` | Build searchable index | `void` |
| `search(query)` | Search index | `ElementData[]` |
| `update(element)` | Update single element | `void` |

**Usage:**
```typescript
import { IndexerService } from '@coderef/core';

const indexer = new IndexerService();
indexer.buildIndex(elements);

const results = indexer.search('scanCurrent');
```

---

### `MetadataIndex` (Class)

**Location:** `src/indexer/metadata-index.ts:15`

**Purpose:** Index elements by metadata fields

**Type:** Index Structure

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `indexByFile(elements)` | Index by file path | `Map<string, string[]>` |
| `indexByType(elements)` | Index by element type | `Map<string, string[]>` |

---

### `RelationshipIndex` (Class)

**Location:** `src/indexer/relationship-index.ts:18`

**Purpose:** Index element relationships

**Type:** Index Structure

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `indexImports(graph)` | Index import relationships | `Map<string, string[]>` |
| `indexCalls(graph)` | Index call relationships | `Map<string, string[]>` |

---

## Integration Components

**Note:** Integration components are currently disabled due to missing AI dependencies.

### RAG Components (Disabled)

- `SemanticSearch` - Semantic code search
- `EmbeddingService` - Generate code embeddings
- `ContextBuilder` - Build context for LLMs
- `IndexingOrchestrator` - Orchestrate indexing pipeline

### LLM Providers (Disabled)

- `OpenAIProvider` - OpenAI API integration
- `AnthropicProvider` - Anthropic API integration

### Vector Stores (Disabled)

- `PineconeStore` - Pinecone vector database
- `ChromaStore` - Chroma vector database
- `SQLiteStore` - SQLite vector storage

---

## Utility Components

### `Logger` (Class)

**Location:** `src/utils/logger.ts:8`

**Purpose:** Logging utility

**Type:** Singleton Logger

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `debug(message)` | Log debug message |
| `info(message)` | Log info message |
| `warn(message)` | Log warning |
| `error(message, error)` | Log error |

**Usage:**
```typescript
import { Logger } from '@coderef/core';

Logger.info('Scanning started');
Logger.error('Scan failed', error);
```

---

## Component Dependencies

### Dependency Graph

```
┌─────────────────────────────────────────────────┐
│ Public API (index.ts)                           │
└──────────────────┬──────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌────────┐   ┌─────────────┐   ┌──────────┐
│Scanner │   │Pipeline +   │   │FileGen   │
│        │   │Graph Query  │   │Functions │
└────┬───┘   └──────┬──────┘   └────┬─────┘
     │              │               │
     │              ├──► pipeline/generators/graph-generator.ts
     │              ├──► query/canonical-graph.ts (CanonicalGraphQuery)
     │              └──► scanner/error-reporter.ts (ScanError)
     │
     └──► LANGUAGE_PATTERNS
          types/types.ts
```

### External Dependencies

| Package | Version | Used By | Purpose |
|---------|---------|---------|---------|
| `acorn` | 8.15.0 | Analyzer | AST parsing |
| `glob` | 11.0.3 | Scanner | File pattern matching |
| `minimatch` | 10.0.3 | Scanner | Glob filtering |
| `zod` | 4.1.12 | Validator | Schema validation |

---

## Component Metrics

### By Module

| Module | Components | Lines of Code | Test Coverage |
|--------|-----------|---------------|---------------|
| Scanner | 2 | ~350 | 95% |
| Analyzer | 6 | ~800 | 90% |
| File Generation | 8 | ~600 | 85% |
| Query | 1 | ~200 | 90% |
| Type System | 5 functions | ~150 | 100% |
| Indexer | 4 | ~400 | 90% |
| Integration | 10+ (disabled) | ~2000 | N/A |
| Utilities | 2 | ~100 | 85% |

**Total:** ~40 components, ~4600 lines of code

---

## Component Patterns

### 1. **Pipeline Orchestrator Pattern**

Used in: `PipelineOrchestrator` (single-pass phase sequencing)

```typescript
class PipelineOrchestrator {
  async run(projectDir: string): Promise<PipelineState> {
    // Deterministic phase ordering: discovery → scanner → raw facts →
    // semantic header parser → import resolution → call resolution → graph construction
    const state = await this.runPhases(projectDir);
    return state;
  }
}
```

### 2. **Graph Query Pattern**

Used in: `CanonicalGraphQuery` (load persisted graph, then query)

```typescript
import { loadCanonicalGraph } from '@coderef/core';

const query = loadCanonicalGraph('./');          // read .coderef/graph.json
const callers = query.callersOf(query.resolve('scanCurrentElements'));
```

### 3. **Functional Composition**

Used in: File Generation functions

```typescript
const pipeline = async (projectPath: string, elements: ElementData[]) => {
  await saveIndex(projectPath, elements);
  await generateContext(projectPath, elements);
  await buildDependencyGraph(projectPath, elements);
};
```

---

**Last Updated:** 2026-01-09
