# Schema Reference

**Project:** @coderef/core
**Version:** 2.0.0
**Last Updated:** 2026-05-12 (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced) (auto-enhanced)

---

## Statistics

- **Total Files:** 296
- **Total Elements:** 1,977
- **Graph Nodes:** 1,977
- **Graph Edges:** 8,873

---



---

## Element Type Distribution

*Auto-generated from .coderef/index.json*

| Type | Count | Percentage |
|------|-------|------------|
| method | 955 | 49.7% |
| function | 508 | 26.4% |
| interface | 313 | 16.3% |
| class | 105 | 5.5% |
| type | 36 | 1.9% |
| component | 2 | 0.1% |
| constant | 2 | 0.1% |

## Table of Contents

1. [Overview](#overview)
2. [Core Data Models](#core-data-models)
3. [Analyzer Models](#analyzer-models)
4. [File Generation Models](#file-generation-models)
5. [Query Models](#query-models)
6. [Type System Models](#type-system-models)
7. [Integration Models](#integration-models)
8. [Configuration Models](#configuration-models)
9. [Schema Validation](#schema-validation)

---

## Overview

This document defines all data structures, interfaces, and type definitions used in @coderef/core. All schemas are TypeScript interfaces with JSON-serializable output.

**Naming Conventions:**
- Interfaces: PascalCase (e.g., `ElementData`)
- Types: PascalCase for unions (e.g., `QueryType`)
- Enums: PascalCase (e.g., `TypeDesignator`)

---

## Core Data Models

### `ElementData`

Represents a single code element extracted during scanning.

**Schema:**

```typescript
interface ElementData {
  id: string;               // Unique identifier (UUID v4)
  name: string;             // Element name (e.g., "scanCurrentElements")
  type: string;             // Element type (e.g., "function", "class")
  file: string;             // Relative or absolute file path
  line: number;             // Line number in source file (1-indexed)
  hash: string;             // SHA256 hash of element content
  dependencies?: string[];  // Array of element IDs this depends on
  metadata?: Record<string, any>; // Additional metadata (extensible)
}
```

**Field Details:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | `string` | ✅ | Unique identifier | `"550e8400-e29b-41d4-a716-446655440000"` |
| `name` | `string` | ✅ | Element name | `"scanCurrentElements"` |
| `type` | `string` | ✅ | Element type | `"function"`, `"class"`, `"component"` |
| `file` | `string` | ✅ | File path | `"src/scanner/scanner.ts"` |
| `line` | `number` | ✅ | Line number | `42` |
| `hash` | `string` | ✅ | Content hash | `"a7b3c9d..."` (SHA256 hex) |
| `dependencies` | `string[]` | ❌ | Dependency IDs | `["uuid1", "uuid2"]` |
| `metadata` | `object` | ❌ | Custom metadata | `{ exported: true, async: false }` |

**Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "scanCurrentElements",
  "type": "function",
  "file": "src/scanner/scanner.ts",
  "line": 42,
  "hash": "a7b3c9d1e5f7...",
  "dependencies": ["uuid-of-glob", "uuid-of-minimatch"],
  "metadata": {
    "exported": true,
    "async": true,
    "parameters": ["basePath", "languages", "options"]
  }
}
```

---

### `ScanOptions`

Configuration options for the scanner.

**Schema:**

```typescript
interface ScanOptions {
  recursive?: boolean;        // Traverse subdirectories
  exclude?: string[];         // Glob patterns to exclude
  include?: string[];         // Glob patterns to include (override exclude)
  maxDepth?: number;          // Maximum directory depth
  followSymlinks?: boolean;   // Follow symbolic links
}
```

**Defaults:**

```json
{
  "recursive": true,
  "exclude": [],
  "include": [],
  "maxDepth": Infinity,
  "followSymlinks": false
}
```

**Example:**

```json
{
  "recursive": true,
  "exclude": ["**/node_modules/**", "**/*.test.ts"],
  "maxDepth": 10,
  "followSymlinks": false
}
```

---

## Analyzer Models

### `DependencyGraph`

Graph representation of code dependencies.

**Schema:**

```typescript
interface DependencyGraph {
  nodes: Map<string, GraphNode>;  // Map of node ID to GraphNode
  edges: GraphEdge[];             // Array of directed edges
}
```

**Storage Format (JSON):**

Since `Map` is not JSON-serializable, graphs are serialized as:

```json
{
  "nodes": [
    { "id": "...", "type": "...", "file": "...", "line": 42 }
  ],
  "edges": [
    { "source": "...", "target": "...", "type": "import" }
  ]
}
```

---

### `GraphNode`

Represents a node in the dependency graph.

**Schema:**

```typescript
interface GraphNode {
  id: string;        // Unique node identifier (element ID)
  type: string;      // Element type (function, class, etc)
  file: string;      // Source file path
  line?: number;     // Line number (optional)
}
```

**Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "function",
  "file": "src/scanner/scanner.ts",
  "line": 42
}
```

---

### `GraphEdge`

Represents an edge (relationship) in the dependency graph.

**Schema:**

```typescript
interface GraphEdge {
  source: string;  // Source node ID
  target: string;  // Target node ID
  type: EdgeType;  // Edge type (import, export, call)
}

type EdgeType = 'import' | 'export' | 'call';
```

**Edge Types:**

| Type | Description | Example |
|------|-------------|---------|
| `import` | Source imports target | `import { foo } from './bar'` |
| `export` | Source exports target | `export { foo }` |
| `call` | Source calls target | `foo()` |

**Example:**

```json
{
  "source": "uuid-of-scanCurrentElements",
  "target": "uuid-of-glob",
  "type": "import"
}
```

---

### `AnalysisResult`

Complete result of dependency analysis.

**Schema:**

```typescript
interface AnalysisResult {
  graph: DependencyGraph;
  statistics: GraphStatistics;
  circularDependencies: CircularDependency[];
  isolatedNodes: GraphNode[];
  analysisTime: number;  // Milliseconds
}
```

---

### `GraphStatistics`

Statistical analysis of the dependency graph.

**Schema:**

```typescript
interface GraphStatistics {
  nodeCount: number;           // Total number of nodes
  edgeCount: number;           // Total number of edges
  edgesByType: Record<EdgeType, number>; // Edges grouped by type
  densityRatio: number;        // Edge density (0-1)
  avgInDegree: number;         // Average incoming edges per node
  avgOutDegree: number;        // Average outgoing edges per node
  circularity: number;         // Percentage of nodes in cycles
}
```

**Calculations:**

- **Density Ratio:** `edgeCount / (nodeCount * (nodeCount - 1))`
- **Avg In-Degree:** `sum(inDegree) / nodeCount`
- **Avg Out-Degree:** `sum(outDegree) / nodeCount`
- **Circularity:** `nodesInCycles / nodeCount`

**Example:**

```json
{
  "nodeCount": 541,
  "edgeCount": 1234,
  "edgesByType": {
    "import": 800,
    "export": 234,
    "call": 200
  },
  "densityRatio": 0.0042,
  "avgInDegree": 2.28,
  "avgOutDegree": 2.28,
  "circularity": 0.05
}
```

---

### `CircularDependency`

Represents a circular dependency cycle.

**Schema:**

```typescript
interface CircularDependency {
  cycle: string[];  // Array of node IDs forming the cycle
  length: number;   // Cycle length
}
```

**Example:**

```json
{
  "cycle": [
    "uuid-A",
    "uuid-B",
    "uuid-C",
    "uuid-A"
  ],
  "length": 3
}
```

---

### `TraversalPath`

Represents a path between two nodes.

**Schema:**

```typescript
interface TraversalPath {
  nodes: string[];  // Array of node IDs
  length: number;   // Path length (number of edges)
}
```

**Example:**

```json
{
  "nodes": [
    "uuid-start",
    "uuid-intermediate",
    "uuid-end"
  ],
  "length": 2
}
```

---

## File Generation Models

### Index File (`index.json`)

**Schema:**

```typescript
interface IndexFile {
  version: string;           // CodeRef version
  generatedAt: string;       // ISO 8601 timestamp
  projectPath: string;       // Absolute project path
  totalElements: number;     // Total element count
  elementsByType: Record<string, number>; // Count by type
  elements: ElementData[];   // All scanned elements
}
```

**Example:**

```json
{
  "version": "2.0.0",
  "generatedAt": "2026-01-09T12:00:00.000Z",
  "projectPath": "/path/to/project",
  "totalElements": 541,
  "elementsByType": {
    "function": 234,
    "class": 67,
    "component": 45,
    "hook": 23,
    "method": 172
  },
  "elements": [...]
}
```

---

### Context File (`context.json`)

**Schema:**

```typescript
interface ProjectContext {
  version: string;
  generatedAt: string;
  projectPath: string;
  statistics: {
    totalElements: number;
    totalFiles: number;
    elementsByType: Record<string, number>;
    filesByExtension: Record<string, number>;
  };
  topFiles: Array<{
    file: string;
    elementCount: number;
  }>;
}
```

**Example:**

```json
{
  "version": "2.0.0",
  "generatedAt": "2026-01-09T12:00:00.000Z",
  "projectPath": "/path/to/project",
  "statistics": {
    "totalElements": 541,
    "totalFiles": 89,
    "elementsByType": {
      "function": 234,
      "class": 67
    },
    "filesByExtension": {
      "ts": 67,
      "tsx": 22
    }
  },
  "topFiles": [
    { "file": "scanner.ts", "elementCount": 12 },
    { "file": "analyzer-service.ts", "elementCount": 10 }
  ]
}
```

---

### Pattern Report (`reports/patterns.json`)

**Schema:**

```typescript
interface PatternReport {
  version: string;
  generatedAt: string;
  projectPath: string;
  patterns: {
    handlers: PatternMatch[];
    decorators: PatternMatch[];
    errorPatterns: PatternMatch[];
    testPatterns: PatternMatch[];
    apiEndpoints: PatternMatch[];
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
  type: string;      // Pattern type (e.g., "event-handler", "decorator")
  name: string;      // Element name
  file: string;      // File path
  line: number;      // Line number
  count?: number;    // Occurrence count (optional)
}
```

**Example:**

```json
{
  "version": "2.0.0",
  "generatedAt": "2026-01-09T12:00:00.000Z",
  "projectPath": "/path/to/project",
  "patterns": {
    "handlers": [
      {
        "type": "event-handler",
        "name": "handleClick",
        "file": "src/Button.tsx",
        "line": 42
      }
    ],
    "decorators": [
      {
        "type": "decorator",
        "name": "@Component",
        "file": "src/Header.tsx",
        "line": 10
      }
    ],
    "errorPatterns": [
      {
        "type": "try-catch",
        "name": "fetchData",
        "file": "src/api.ts",
        "line": 20
      }
    ],
    "testPatterns": [
      {
        "type": "test-suite",
        "name": "describe('Scanner')",
        "file": "__tests__/scanner.test.ts",
        "line": 5
      }
    ],
    "apiEndpoints": [
      {
        "type": "api-route",
        "name": "GET /api/users",
        "file": "src/app/api/users/route.ts",
        "line": 8
      }
    ]
  },
  "statistics": {
    "totalHandlers": 45,
    "totalDecorators": 12,
    "totalErrorPatterns": 67,
    "totalTestPatterns": 89,
    "totalApiEndpoints": 23
  }
}
```

---

### Coverage Report (`reports/coverage.json`)

**Schema:**

```typescript
interface CoverageReport {
  version: string;
  generatedAt: string;
  projectPath: string;
  coverage: {
    totalFiles: number;
    testFiles: number;
    sourceFiles: number;
    uncoveredFiles: string[];
    coveragePercentage: number;
  };
  details: {
    coveredByType: Record<string, number>;
    uncoveredByType: Record<string, number>;
  };
}
```

---

### Validation Report (`reports/validation.json`)

**Schema:**

```typescript
interface ValidationReport {
  version: string;
  generatedAt: string;
  projectPath: string;
  validation: {
    totalReferences: number;
    brokenReferences: BrokenReference[];
    missingImports: MissingImport[];
    validationErrors: ValidationError[];
  };
  summary: {
    totalErrors: number;
    errorsByType: Record<string, number>;
  };
}

interface BrokenReference {
  source: string;      // File with broken reference
  target: string;      // Missing reference target
  line: number;        // Line number
  type: string;        // Reference type (import, call, etc)
}

interface MissingImport {
  file: string;        // File with missing import
  missing: string;     // Missing module/file
  line: number;
}

interface ValidationError {
  file: string;
  line: number;
  type: string;
  message: string;
}
```

---

### Drift Report (`reports/drift.json`)

**Schema:**

```typescript
interface DriftReport {
  version: string;
  generatedAt: string;
  projectPath: string;
  drift: {
    newElements: ElementData[];       // Added since last scan
    deletedElements: ElementData[];   // Removed since last scan
    modifiedElements: ModifiedElement[]; // Changed since last scan
  };
  summary: {
    totalNew: number;
    totalDeleted: number;
    totalModified: number;
    changePercentage: number;
  };
}

interface ModifiedElement {
  current: ElementData;   // Current state
  previous: ElementData;  // Previous state
  changes: string[];      // List of changed fields
}
```

---

## Query Models

### `QueryRequest`

Request parameters for query execution.

**Schema:**

```typescript
interface QueryRequest {
  type: QueryType;
  target: string;       // Element to query
  source?: string;      // For path queries
  maxDepth?: number;    // Max traversal depth (default: 3)
  format?: 'raw' | 'summary' | 'full'; // Output format
}

type QueryType =
  | 'what-calls'
  | 'what-calls-me'
  | 'what-imports'
  | 'what-imports-me'
  | 'what-depends-on'
  | 'what-depends-on-me'
  | 'shortest-path'
  | 'all-paths';
```

**Example:**

```json
{
  "type": "what-calls-me",
  "target": "scanCurrentElements",
  "maxDepth": 5,
  "format": "full"
}
```

---

### `QueryResult`

Result of query execution.

**Schema:**

```typescript
interface QueryResult {
  query: QueryRequest;     // Original query
  results: GraphNode[];    // Found nodes
  count: number;           // Result count
  executionTime: number;   // Milliseconds
  cached: boolean;         // Whether from cache
  timestamp: number;       // Execution timestamp (Unix ms)
  error?: string;          // Error message if failed
}
```

**Example:**

```json
{
  "query": {
    "type": "what-calls-me",
    "target": "scanCurrentElements"
  },
  "results": [
    {
      "id": "uuid1",
      "type": "function",
      "file": "src/api/route.ts",
      "line": 42
    }
  ],
  "count": 1,
  "executionTime": 12,
  "cached": false,
  "timestamp": 1704801600000
}
```

---

## Type System Models

### `TypeDesignator` (Enum)

26 type designators for code elements.

**Schema:**

```typescript
enum TypeDesignator {
  F = 'F',        // File
  D = 'D',        // Directory
  C = 'C',        // Component
  Fn = 'Fn',      // Function
  Cl = 'Cl',      // Class
  M = 'M',        // Method
  V = 'V',        // Variable
  S = 'S',        // Style
  T = 'T',        // Test
  A = 'A',        // API Route
  Cfg = 'Cfg',    // Config
  H = 'H',        // Hook
  Ctx = 'Ctx',    // Context
  R = 'R',        // Redux
  Q = 'Q',        // Query
  I = 'I',        // Interface/Type
  Doc = 'Doc',    // Documentation
  Gen = 'Gen',    // Generated
  Dep = 'Dep',    // Dependency
  E = 'E',        // Event
  WIP = 'WIP',    // Work in Progress
  AST = 'AST'     // Abstract Syntax Tree
}
```

---

### `TypeMetadata`

Metadata for a type designator.

**Schema:**

```typescript
interface TypeMetadata {
  name: string;              // Human-readable name
  description: string;       // Type description
  priority: TypePriority;    // Priority level
  examples: string[];        // Code examples
}

enum TypePriority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low'
}
```

**Example:**

```json
{
  "name": "Function",
  "description": "Standalone function or arrow function",
  "priority": "High",
  "examples": [
    "function foo() {}",
    "const bar = () => {}",
    "export async function baz() {}"
  ]
}
```

---

## Integration Models

**Note:** Integration models are currently disabled. Documentation will be added when the module is enabled.

---

## Configuration Models

### Language Patterns

**Schema:**

```typescript
interface LanguagePattern {
  type: ElementData['type'];  // Element type to extract
  pattern: RegExp;            // Regex pattern
  nameGroup: number;          // Capture group for name (1-indexed)
}

type LanguagePatterns = Record<string, LanguagePattern[]>;
```

**Example:**

```typescript
const LANGUAGE_PATTERNS: LanguagePatterns = {
  ts: [
    {
      type: 'function',
      pattern: /function\s+([a-zA-Z0-9_$]+)/g,
      nameGroup: 1
    },
    {
      type: 'class',
      pattern: /class\s+([a-zA-Z0-9_$]+)/g,
      nameGroup: 1
    }
  ]
};
```

---

## Schema Validation

### Validation Rules

**ElementData Validation:**

```typescript
function validateElementData(element: any): element is ElementData {
  return (
    typeof element.id === 'string' &&
    typeof element.name === 'string' &&
    typeof element.type === 'string' &&
    typeof element.file === 'string' &&
    typeof element.line === 'number' &&
    element.line > 0 &&
    typeof element.hash === 'string' &&
    element.hash.length === 64 // SHA256 hex
  );
}
```

**DependencyGraph Validation:**

```typescript
function validateGraph(graph: any): graph is DependencyGraph {
  return (
    graph.nodes instanceof Map &&
    Array.isArray(graph.edges) &&
    graph.edges.every(edge =>
      typeof edge.source === 'string' &&
      typeof edge.target === 'string' &&
      ['import', 'export', 'call'].includes(edge.type)
    )
  );
}
```

---

## JSON Schema Definitions

### ElementData JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "name", "type", "file", "line", "hash"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid"
    },
    "name": {
      "type": "string",
      "minLength": 1
    },
    "type": {
      "type": "string",
      "enum": ["function", "class", "component", "hook", "method", "constant"]
    },
    "file": {
      "type": "string",
      "minLength": 1
    },
    "line": {
      "type": "integer",
      "minimum": 1
    },
    "hash": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$"
    },
    "dependencies": {
      "type": "array",
      "items": { "type": "string", "format": "uuid" }
    },
    "metadata": {
      "type": "object"
    }
  }
}
```

---

## Version History

### v2.0.0 (Current)

- Complete TypeScript type definitions
- 26 type designators
- Enhanced graph models
- File generation schemas

### v1.0.0 (Legacy)

- Basic element data
- Simple graph structure
- Limited type system

---

**Last Updated:** 2026-01-09
