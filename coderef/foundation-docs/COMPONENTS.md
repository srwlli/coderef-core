# Component Catalog

**Project:** @coderef/core
**Version:** 2.0.0
**Last Updated:** 2026-04-26 (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced)

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

## Analyzer Components

### `AnalyzerService` (Class)

**Location:** `src/analyzer/analyzer-service.ts:43`

**Purpose:** Orchestrates relationship analysis and dependency graph building

**Type:** Service Class (stateful)

**State:**
- `graphBuilder: GraphBuilder` - Builds dependency graphs
- `graphAnalyzer?: GraphAnalyzer` - Analyzes graphs
- `cachedGraph?: DependencyGraph` - Cached graph for performance
- `basePath: string` - Project root path
- `elementMap?: Map<string, ElementInfo>` - Enhanced element mapping

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `analyze(patterns, useCache)` | Analyze codebase and build graph | `Promise<AnalysisResult>` |
| `queryRelationships(target, type)` | Query specific relationships | `Promise<GraphNode[]>` |
| `setElementMap(map)` | Set element mapping for enhanced analysis | `void` |

**Dependencies:**
- `GraphBuilder` - Constructs dependency graphs
- `GraphAnalyzer` - Analyzes graph properties
- `glob` - File pattern matching

**Usage:**
```typescript
import { AnalyzerService } from '@coderef/core';

const analyzer = new AnalyzerService('./project-root');
const result = await analyzer.analyze(['src/**/*.ts']);
```

**Characteristics:**
- ✅ Stateful (caches graph)
- ✅ Lazy initialization (builds graph on first analyze())
- ⚡ Performance: ~150ms for 500 files

---

### `GraphBuilder` (Class)

**Location:** `src/analyzer/graph-builder.ts:14`

**Purpose:** Constructs dependency graphs from source files

**Type:** Builder Class

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `buildGraph(files, elementMap)` | Build graph from files | `DependencyGraph` |
| `addNode(node)` | Add node to graph | `void` |
| `addEdge(source, target, type)` | Add edge to graph | `void` |

**Dependencies:**
- `ImportParser` - Parse import/export statements
- `CallDetector` - Detect function calls
- `acorn` - JavaScript/TypeScript AST parser

**Usage:**
```typescript
import GraphBuilder from '@coderef/core';

const builder = new GraphBuilder('./project-root');
const graph = builder.buildGraph(['file1.ts', 'file2.ts']);
```

**Characteristics:**
- ✅ Incremental building (add nodes/edges one at a time)
- ✅ AST-based parsing (99% accuracy)
- ⚡ Performance: ~100ms for 500 files

---

### `GraphAnalyzer` (Class)

**Location:** `src/analyzer/graph-analyzer.ts:18`

**Purpose:** Analyzes dependency graphs for patterns and issues

**Type:** Analyzer Class

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `detectCircularDependencies()` | Find circular dependency cycles | `CircularDependency[]` |
| `findIsolatedNodes()` | Find nodes with no connections | `GraphNode[]` |
| `getStatistics()` | Compute graph statistics | `GraphStatistics` |
| `findShortestPath(source, target)` | Find shortest path between nodes | `TraversalPath \| null` |
| `traverseFrom(start, maxDepth)` | Traverse graph from node | `GraphNode[]` |

**Algorithms:**
- **Cycle Detection:** Depth-First Search (DFS) with recursion tracking
- **Shortest Path:** Breadth-First Search (BFS)
- **Statistics:** O(V+E) traversal

**Usage:**
```typescript
import { GraphAnalyzer } from '@coderef/core';

const analyzer = new GraphAnalyzer(graph);
const cycles = analyzer.detectCircularDependencies();
console.log(`Found ${cycles.length} circular dependencies`);
```

**Characteristics:**
- ✅ Stateless (operates on provided graph)
- ✅ Multiple algorithms (DFS, BFS)
- ⚡ Performance: ~20ms for cycle detection (500 nodes)

---

### `ImportParser` (Class)

**Location:** `src/analyzer/import-parser.ts:12`

**Purpose:** Parse import/export statements from source files

**Type:** Parser Class

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `parseImports(file)` | Extract imports from file | `ImportStatement[]` |
| `parseExports(file)` | Extract exports from file | `ExportStatement[]` |

**Dependencies:**
- `acorn` - JavaScript/TypeScript AST parser

**Usage:**
```typescript
import { ImportParser } from '@coderef/core';

const parser = new ImportParser();
const imports = parser.parseImports('src/file.ts');
```

**Characteristics:**
- ✅ AST-based parsing (not regex)
- ✅ Handles ES6 imports and CommonJS requires
- ⚡ Performance: ~5ms per file

---

### `CallDetector` (Class)

**Location:** `src/analyzer/call-detector.ts:10`

**Purpose:** Detect function calls and method invocations

**Type:** Detector Class

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `detectCalls(file)` | Extract function calls from file | `CallExpression[]` |

**Dependencies:**
- `acorn` - JavaScript/TypeScript AST parser

**Usage:**
```typescript
import { CallDetector } from '@coderef/core';

const detector = new CallDetector();
const calls = detector.detectCalls('src/file.ts');
```

**Characteristics:**
- ✅ Detects direct calls (`foo()`)
- ✅ Detects method calls (`obj.method()`)
- ✅ Detects chained calls (`obj.method1().method2()`)
- ⚡ Performance: ~5ms per file

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
- `GraphBuilder` - Build graph structure
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

### `QueryExecutor` (Class)

**Location:** `src/query/query-executor.ts:55`

**Purpose:** Execute complex queries on relationship graph

**Type:** Query Engine Class

**State:**
- `analyzer: AnalyzerService` - Analyzer instance
- `resultCache: Map<string, CachedResult>` - Query result cache
- `cacheExpiryMs: number` - Cache expiry time (default: 5 minutes)
- `performanceMetrics: Map<QueryType, Metrics>` - Performance tracking

**Key Methods:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `execute(request)` | Execute query | `Promise<QueryResult>` |
| `clearCache()` | Clear query cache | `void` |
| `getPerformanceMetrics()` | Get query statistics | `Map<QueryType, Metrics>` |

**Query Types:**
- `what-calls` - What calls this element?
- `what-calls-me` - What does this element call?
- `what-imports` - What does this element import?
- `what-imports-me` - What imports this element?
- `what-depends-on` - What does this depend on?
- `what-depends-on-me` - What depends on this?
- `shortest-path` - Shortest path between elements
- `all-paths` - All paths between elements

**Usage:**
```typescript
import { QueryExecutor, AnalyzerService } from '@coderef/core';

const analyzer = new AnalyzerService('./project');
await analyzer.analyze();

const executor = new QueryExecutor(analyzer);
const result = await executor.execute({
  type: 'what-calls-me',
  target: 'scanCurrentElements'
});
```

**Characteristics:**
- ✅ Result caching (5 minute TTL)
- ✅ Performance tracking per query type
- ✅ Automatic cache invalidation
- ⚡ Performance: <1ms for cached queries, ~10ms for new queries

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
┌────────┐   ┌─────────┐   ┌──────────┐
│Scanner │   │Analyzer │   │FileGen   │
│        │   │Service  │   │Functions │
└────┬───┘   └────┬────┘   └────┬─────┘
     │            │              │
     │            ├──► GraphBuilder
     │            ├──► GraphAnalyzer
     │            ├──► ImportParser
     │            └──► CallDetector
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

### 1. **Service Pattern**

Used in: `AnalyzerService`, `IndexerService`

```typescript
class XyzService {
  private state: State;

  constructor(config: Config) {
    this.state = initializeState(config);
  }

  async performAction(): Promise<Result> {
    // Orchestrate multiple components
    const step1 = await this.component1.execute();
    const step2 = await this.component2.execute(step1);
    return this.combineResults(step1, step2);
  }
}
```

### 2. **Builder Pattern**

Used in: `GraphBuilder`

```typescript
class GraphBuilder {
  private graph: Graph = createEmptyGraph();

  addNode(node: Node): this {
    this.graph.nodes.set(node.id, node);
    return this;
  }

  addEdge(edge: Edge): this {
    this.graph.edges.push(edge);
    return this;
  }

  build(): Graph {
    return this.graph;
  }
}
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
