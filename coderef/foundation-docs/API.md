# API Reference

**Project:** @coderef/core
**Version:** 2.0.0
**Last Updated:** 2026-07-17 (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced)

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
<!-- coderef:uuid=39693cc3-b2c1-5b99-a14d-ead77728400e -->
<!-- coderef:uuid=29f5b689-2f41-5bc4-a742-f93f6f7e4989 -->
<!-- coderef:uuid=9fb0c439-8d89-5ba9-b278-e627fafc3163 -->
<!-- coderef:uuid=d16bafa3-0444-516b-b2de-828655f713f4 -->
<!-- coderef:uuid=fdcbd632-a27a-5fb7-8884-9e54d53e5d43 -->
<!-- coderef:uuid=0435c371-f26c-5684-ab12-c2a77893642e -->
<!-- coderef:uuid=c7af62fe-4fb5-54e5-8dcb-030d919f2cae -->
<!-- coderef:uuid=135ed5b6-87fb-50ac-b5f1-0457d2bbd585 -->
<!-- coderef:uuid=8989852d-ebaa-52b4-852d-813d2a6d33be -->
<!-- coderef:uuid=ec329b04-7830-5162-b84f-fccf7cdcf863 -->
<!-- coderef:uuid=7c9b7ea0-070c-5509-a24a-f12fbfb87353 -->
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
<!-- coderef:uuid=483d35de-3418-5427-9349-8cbe2d195d57 -->
<!-- coderef:uuid=b61231c5-e14b-55fc-821c-40005cba575e -->
<!-- coderef:uuid=7f7af160-8738-5c55-9104-4c7ee251185d -->
<!-- coderef:uuid=afdd1859-f88f-52a6-b820-681af07fd9e9 -->
<!-- coderef:uuid=a45c84a8-0668-55bf-abca-eae95d49b663 -->
<!-- coderef:uuid=fb5e9f98-aea9-5a24-8dfc-3956e7091ac5 -->
<!-- coderef:uuid=2c2d5e4a-3bf8-5e1e-9569-0e12ca3cf703 -->
<!-- coderef:uuid=c0bd137a-1155-5fb8-a62d-e6fcb184a562 -->
<!-- coderef:uuid=e7fe444a-67bb-5ba7-9a53-592f4d6abaa7 -->
<!-- coderef:uuid=c1cd9634-498b-583f-a1b9-6e97967397b5 -->
<!-- coderef:uuid=815dc249-b434-5924-9b3b-2d854d74c4da -->
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

## Relationship Query API

Relationship analysis runs over the persisted canonical graph (`.coderef/graph.json`),
not an in-memory analyzer service. The pre-rebuild `AnalyzerService` was removed.

### `CanonicalGraphQuery`

**File:** `src/query/canonical-graph.ts`

Load the canonical graph with `loadCanonicalGraph(projectDir)`, then query relationships.

### Methods

#### `resolve(query)`
Resolve a symbol string to its graph node(s) — matches by exact CodeRef id, by name, or by file.

```typescript
resolve(query: string): NodeResolution
```

#### `callersOf(resolution)`
Get the elements that call the resolved element (inbound call edges).

```typescript
callersOf(resolution: NodeResolution): CanonicalNode[]
```

#### `calleesOf(resolution)`
Get the elements called by the resolved element (outbound call edges).

```typescript
calleesOf(resolution: NodeResolution): CanonicalNode[]
```

Import relationships are traversed over the same resolved edge set. For cycle detection,
use the `cycles` MCP tool / `coderef-query --type=cycles` over the canonical graph.

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

## Loading the Graph

### `loadCanonicalGraph(projectDir)`

Load the persisted canonical graph for querying. The pre-rebuild `QueryExecutor` class was removed.

**File:** `src/query/canonical-graph.ts`

```typescript
function loadCanonicalGraph(projectDir: string): CanonicalGraphQuery
```

```typescript
import { loadCanonicalGraph } from '@coderef/core';

const query = loadCanonicalGraph('./');
const resolution = query.resolve('deduplicateElements');
const callers = query.callersOf(resolution);
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

Scan-time failures are reported as structured `ScanError` records via the scanner
error-reporting module (the pre-rebuild `GraphError` / `src/analyzer/graph-error.ts` class
was removed). Canonical-graph loading throws `CanonicalGraphError` on malformed graph data.

### ScanError

**File:** `src/scanner/error-reporter.ts`

```typescript
interface ScanError {
  type: ScanErrorType;         // 'read' | 'parse' | 'pattern' | ...
  severity: ScanErrorSeverity; // 'error' | 'warning' | 'info'
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;         // auto-derived for ENOENT / EACCES / SyntaxError
  stack?: string;
}

// Build from a caught cause; collected on ScanResult rather than thrown:
function createScanError(error: unknown, file: string, type: ScanErrorType, severity?: ScanErrorSeverity): ScanError
function formatScanError(error: ScanError): string
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
} from './types';

export {
  CanonicalGraphQuery,
  loadCanonicalGraph,
  scanCurrentElements,
  scanFilesWithAST,
} from './src';
```

---

## Entry Points

### Main Exports

**File:** `index.ts`

| Export | Type | Description |
|--------|------|-------------|
| `scanCurrentElements` | Function | Element scanner |
| `scanFilesWithAST` | Function | AST-based element scanner |
| `CanonicalGraphQuery` / `loadCanonicalGraph` | Class / Function | Relationship queries over `.coderef/graph.json` |
| `EmbeddingTextGenerator` | Class | RAG integration |
| `saveIndex` | Function | Persist scan results |

---

## Async Patterns

The following functions are async and return Promises:

- `scanCurrentElements()`
- `ContextGenerator.generate()`
- `BreakingChangeDetector.detectChanges()`

---

*Generated from coderef scan: 2026-04-21*
