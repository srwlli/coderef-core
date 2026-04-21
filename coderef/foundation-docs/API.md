# API Reference

**Project:** @coderef/core
**Version:** 2.0.0
**Last Updated:** 2026-04-21 (auto-enhanced) (auto-enhanced)

---

## Table of Contents

1. [Scanner API](#scanner-api)
2. [Analyzer API](#analyzer-api)
3. [File Generation API](#file-generation-api)
4. [Query API](#query-api)
5. [Type System API](#type-system-api)
6. [Integration API](#integration-api)
7. [Utility APIs](#utility-apis)
8. [Error Handling](#error-handling)
9. [TypeScript Types](#typescript-types)

---

## Statistics

- **Total Files:** 296
- **Total Elements:** 1977
- **Total Lines:** 75,601
- **Languages:** TypeScript, JavaScript, Python

---

## Scanner API

<!-- coderef:uuid=23d01bc8-2217-52d2-a80a-fd5574eb3b75 -->
### `scanCurrentElements()`

Scan code elements from a directory using regex patterns.

**Signature:**
```typescript
function scanCurrentElements(
  basePath: string,
  languages: string | string[],
  options?: ScanOptions
): Promise<ElementData[]>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `basePath` | `string` | ✅ | Absolute or relative path to directory |
| `languages` | `string \| string[]` | ✅ | Language extensions (e.g., 'ts', ['ts', 'tsx']) |
| `options` | `ScanOptions` | ❌ | Scan configuration options |

**Options:**

```typescript
interface ScanOptions {
  recursive?: boolean;        // Traverse subdirectories (default: true)
  includePatterns?: string[]; // File patterns to include
  excludePatterns?: string[]; // File patterns to exclude
  includeNodeModules?: boolean; // Include node_modules (default: false)
}
```

**Returns:** `Promise<ElementData[]>` - Array of scanned code elements

---

<!-- coderef:uuid=5e396d0c-4eec-5e7b-a73f-7a9d08af021c -->
### `scanFilesWithAST()`

Scan files using AST-based analysis for accurate element detection.

**File:** `src/analyzer/ast-element-scanner.ts`

**Signature:**
```typescript
function scanFilesWithAST(
  filePaths: string[],
  options?: ASTScanOptions
): Promise<ASTScanResult>
```

---

## Analyzer API

### `AnalyzerService`

Core analysis service for dependency graphs and code relationships.

**File:** `src/analyzer/analyzer-service.ts`

### Methods

#### `analyze(paths, options)`
Analyze code files and build dependency graph.

```typescript
async analyze(
  paths: string[],
  options?: AnalysisOptions
): Promise<AnalysisResult>
```

#### `getCallers(elementId)`
Get all functions that call the specified element.

```typescript
getCallers(elementId: string): string[]
```

#### `getCallees(elementId)`
Get all functions called by the specified element.

```typescript
getCallees(elementId: string): string[]
```

#### `getDependents(elementId)`
Get all elements that depend on the specified element.

```typescript
getDependents(elementId: string): string[]
```

#### `getDependencies(elementId)`
Get all dependencies of the specified element.

```typescript
getDependencies(elementId: string): string[]
```

#### `detectCircularDependencies()`
Detect circular dependencies in the codebase.

```typescript
detectCircularDependencies(): CircularDependency[]
```

---

## File Generation API

### Pipeline Generators

The file generation system produces 16 different output files:

| Generator | Output File | Description |
|-----------|-------------|-------------|
| `IndexGenerator` | `index.json` | Element registry with UUIDs |
| `GraphGenerator` | `graph.json` | Dependency graph with relationships |
| `ContextGenerator` | `context.json` | AI-friendly codebase context |
| `ComplexityGenerator` | `complexity.json` | Complexity metrics per element |
| `CoverageGenerator` | `coverage.json` | Test coverage analysis |
| `DriftGenerator` | `drift.json` | Code drift detection |
| `PatternGenerator` | `patterns.json` | Detected code patterns |
| `ValidationGenerator` | `validation.json` | Reference validation results |
| `DiagramGenerator` | `diagrams/` | Mermaid dependency diagrams |
| `ExportGenerator` | `exports/` | Multiple export formats |
| `RegistryGenerator` | `registry/` | Element registries by type |

---

## Query API

### `QueryExecutor`

Execute structured queries against the codebase graph.

**File:** `src/query/query-executor.ts`

```typescript
class QueryExecutor {
  execute(query: Query): QueryResult
  findByType(type: ElementType): Element[]
  findByName(name: string): Element[]
  findByFile(file: string): Element[]
}
```

---

## Type System API

### Core Types

```typescript
// Element Types
interface CodeElement {
  id: string;
  uuid: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'method' | 'component';
  name: string;
  file: string;
  line: number;
  column?: number;
  signature?: string;
  documentation?: string;
  complexity?: number;
}

// Graph Types
interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}

interface GraphNode {
  id: string;
  elementId: string;
  type: string;
  metadata: Record<string, unknown>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'calls' | 'imports' | 'extends' | 'implements';
}

// Scanner Types
interface ElementData {
  id: string;
  type: ElementType;
  name: string;
  file: string;
  location: SourceLocation;
  metadata: ElementMetadata;
}

type ElementType = 
  | 'function' 
  | 'class' 
  | 'interface' 
  | 'type' 
  | 'method' 
  | 'property'
  | 'variable'
  | 'component'
  | 'hook';

interface SourceLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}
```

---

## Integration API

### RAG Integration

**File:** `src/integration/rag/embedding-text-generator.ts`

```typescript
class EmbeddingTextGenerator {
  generate(element: CodeElement): string
  generateBatch(elements: CodeElement[]): string[]
}
```

### LLM Integration

**File:** `src/context/agentic-formatter.ts`

```typescript
function formatForLLM(context: CodeContext): LLMContext
function generatePrompt(context: CodeContext): string
```

---

## Utility APIs

### Graph Helpers

**File:** `src/analyzer/graph-helpers.ts`

```typescript
function parseNodeId(nodeId: string): ParsedNodeId
function getImportsForElement(elementId: string): Import[]
function resolvePath(relativePath: string, basePath: string): string
```

### CLI Utilities

**File:** `src/cli/detect-languages.ts`

```typescript
async function detectProjectLanguages(projectPath: string): Promise<LanguageInfo[]>
async function scanDirectory(dir: string, patterns: string[]): Promise<string[]>
```

---

## Error Handling

### GraphError

**File:** `src/analyzer/graph-error.ts`

```typescript
class GraphError extends Error {
  code: ErrorCode;
  elementId?: string;
  file?: string;
  line?: number;
}

type ErrorCode =
  | 'ELEMENT_NOT_FOUND'
  | 'CIRCULAR_DEPENDENCY'
  | 'INVALID_GRAPH'
  | 'PARSE_ERROR'
  | 'FILE_NOT_FOUND';
```

---

## TypeScript Types

### Complete Type Definitions

All types are exported from the main entry point:

```typescript
// index.ts
export type {
  CodeElement,
  ElementType,
  ElementData,
  DependencyGraph,
  GraphNode,
  GraphEdge,
  AnalysisResult,
  ScanOptions,
  ASTScanOptions,
  Query,
  QueryResult,
  LanguageInfo,
  GraphError,
  ErrorCode,
} from './types';

export {
  AnalyzerService,
  QueryExecutor,
  scanCurrentElements,
  scanFilesWithAST,
  detectProjectLanguages,
} from './src';
```

---

## Entry Points

### Main Exports

**File:** `index.ts`

| Export | Type | Description |
|--------|------|-------------|
| `scanCurrentElements` | Function | Regex-based scanner |
| `AnalyzerService` | Class | AST-based analyzer |
| `QueryExecutor` | Class | Query execution |
| `EmbeddingTextGenerator` | Class | RAG integration |
| `detectProjectLanguages` | Function | Language detection |

---

## Async Patterns

The following functions are async and return Promises:

- `AnalyzerService.analyze()`
- `scanCurrentElements()`
- `scanFilesWithAST()`
- `detectProjectLanguages()`
- `ContextGenerator.generate()`
- `BreakingChangeDetector.detectChanges()`

---

*Generated from coderef scan: 2026-04-21*
