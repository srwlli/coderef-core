# Architecture Documentation

**Project:** @coderef/core
**Version:** 2.0.0
**Last Updated:** 2026-04-26 (auto-enhanced) (auto-enhanced) (auto-enhanced)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Module Organization](#module-organization)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [Integration Points](#integration-points)
7. [Performance & Scalability](#performance--scalability)
8. [Security](#security)
9. [Deployment](#deployment)
10. [Future Architecture](#future-architecture)

---

## System Overview

### Purpose

**@coderef/core** is a TypeScript library that provides deep code analysis capabilities for the CodeRef Dashboard ecosystem. It combines regex-based scanning, AST parsing, and graph analysis to extract meaningful insights from codebases across multiple programming languages.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       @coderef/core Library                     │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  Scanner       │  │  Analyzer      │  │  File Generation │ │
│  │  Module        │  │  Module        │  │  Module          │ │
│  │  (Regex+AST)   │  │  (Graph-based) │  │  (16 outputs)    │ │
│  └────────────────┘  └────────────────┘  └──────────────────┘ │
│          │                   │                    │            │
│          └───────────────────┴────────────────────┘            │
│                              │                                 │
│  ┌────────────────┐  ┌───────┴──────┐  ┌──────────────────┐  │
│  │  Query         │  │  Type System │  │  Context         │  │
│  │  Engine        │  │  (26 types)  │  │  Generator       │  │
│  └────────────────┘  └──────────────┘  └──────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
          ┌──────▼──────┐          ┌──────▼──────┐
          │  Dashboard  │          │  CLI Tools  │
          │  UI (Next.js)│         │  (Scripts)  │
          └─────────────┘          └─────────────┘
```

### Key Characteristics

- **Stateless:** No persistent state - all operations read from filesystem
- **Type-Safe:** Full TypeScript coverage with exported type definitions
- **Modular:** Each module is independently usable and tested
- **Performance-Focused:** In-process operations avoid subprocess overhead
- **Multi-Language:** Supports 8+ programming languages via pattern library

---

## Architecture Principles

### 1. **Separation of Concerns**

Each module has a single, well-defined responsibility:

- **Scanner:** Extract code elements using regex patterns
- **Analyzer:** Build dependency graphs using AST parsing
- **File Generation:** Create output files from scan results
- **Query Engine:** Execute searches and relationship queries
- **Integration:** Bridge with external systems (AI, databases, vector stores)

### 2. **Pure Functions**

Core functions are pure (no side effects except file I/O):

```typescript
// Pure: deterministic output for same inputs
function scanFile(filePath: string, patterns: RegexPattern[]): ElementData[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return patterns.flatMap(p => extractElements(content, p));
}

// Side effects isolated to I/O functions
async function saveIndex(projectPath: string, elements: ElementData[]): Promise<void> {
  await fs.writeFile(path.join(projectPath, '.coderef/index.json'), JSON.stringify(elements));
}
```

### 3. **Composition Over Inheritance**

Use function composition and interfaces instead of class hierarchies:

```typescript
// Composable pattern: small functions combined into pipelines
const pipeline = compose(
  scanCurrentElements,
  buildDependencyGraph,
  generateContext
);

const result = await pipeline(projectPath, ['ts', 'tsx']);
```

### 4. **Progressive Enhancement**

Start with simple regex scanning, enhance with AST analysis when needed:

```
Level 1: Regex Scanning → Fast, 85% accuracy
         ↓
Level 2: AST Parsing → Slower, 99% accuracy for relationships
         ↓
Level 3: Semantic Analysis → Full context understanding
```

### 5. **Fail Fast, Fail Loudly**

Validate inputs early and throw descriptive errors:

```typescript
export async function scanCurrentElements(
  basePath: string,
  languages: string | string[],
  options: ScanOptions = {}
): Promise<ElementData[]> {
  // Validate inputs immediately
  if (!fs.existsSync(basePath)) {
    throw new Error(`Directory not found: ${basePath}`);
  }

  const langArray = Array.isArray(languages) ? languages : [languages];
  const unsupported = langArray.filter(lang => !LANGUAGE_PATTERNS[lang]);
  if (unsupported.length > 0) {
    throw new Error(`Unsupported languages: ${unsupported.join(', ')}`);
  }

  // Continue with validated inputs...
}
```

---

## Module Organization

### Directory Structure

```
src/
├── scanner/                    # Regex-based code scanning
│   └── scanner.ts             # Main scanner + language patterns
│
├── analyzer/                   # AST-based dependency analysis
│   ├── analyzer-service.ts    # Orchestrator (P3-T5)
│   ├── import-parser.ts       # Import/export detection (P3-T1)
│   ├── call-detector.ts       # Function call detection (P3-T2)
│   ├── graph-builder.ts       # Build dependency graph (P3-T3)
│   ├── graph-analyzer.ts      # Analyze graph (P3-T4)
│   ├── graph-helpers.ts       # Utility functions
│   ├── js-parser.ts           # JavaScript AST parsing
│   ├── js-call-detector.ts    # JavaScript call detection
│   ├── dynamic-import-detector.ts # Dynamic import detection
│   └── graph-error.ts         # Error types
│
├── fileGeneration/             # Generate output files
│   ├── saveIndex.ts           # Phase 1: index.json
│   ├── generateContext.ts     # Phase 1: context.{json,md}
│   ├── buildDependencyGraph.ts # Phase 1: graph.json
│   ├── detectPatterns.ts      # Phase 2: patterns.json
│   ├── analyzeCoverage.ts     # Phase 2: coverage.json
│   ├── validateReferences.ts  # Phase 2: validation.json
│   ├── detectDrift.ts         # Phase 2: drift.json
│   └── generateDiagrams.ts    # Phase 3: diagrams (mmd, dot)
│
├── query/                      # Query execution
│   └── query-executor.ts      # Element search and filtering
│
├── types/                      # Type system
│   └── types.d.ts             # 26 type designators + validation
│
├── integration/                # External integrations
│   ├── rag/                   # RAG (Retrieval-Augmented Generation)
│   │   ├── semantic-search.ts
│   │   ├── embedding-service.ts
│   │   ├── code-chunk.ts
│   │   ├── context-builder.ts
│   │   └── indexing-orchestrator.ts
│   ├── llm/                   # LLM providers
│   │   ├── openai-provider.ts
├── context/                    # Context analysis
│   └── file-impact-analyzer.ts
│
├── adapter/                    # Format conversion
│   └── graph-to-elements.ts
│
├── utils/                      # Utilities
│   └── logger.ts
│
└── index.ts                    # Main export index
```

### Module Dependencies

```
┌──────────────────────────────────────────────────────────────┐
│  Public API (index.ts)                                       │
└──────────────────────────────────────────────────────────────┘
         │
         ├─► scanner/scanner.ts
         │        │
         │        └─► types/types.d.ts
         │
         ├─► analyzer/analyzer-service.ts
         │        │
         │        ├─► analyzer/import-parser.ts → acorn
         │        ├─► analyzer/call-detector.ts → acorn
         │        ├─► analyzer/graph-builder.ts
         │        └─► analyzer/graph-analyzer.ts
         │
         ├─► fileGeneration/*
         │        │
         │        └─► types/types.d.ts
         │
         ├─► query/query-executor.ts
         │        │
         │        └─► types/types.d.ts
         │
         └─► integration/*
                  │
                  ├─► llm/openai-provider.ts → openai
                  ├─► llm/anthropic-provider.ts → @anthropic-ai/sdk
                  ├─► vector/pinecone-store.ts → @pinecone-database/pinecone
                  └─► vector/chroma-store.ts → chromadb
```

**Dependency Boundaries:**

- ✅ `scanner/` has NO dependencies on `analyzer/` (can be used standalone)
- ✅ `analyzer/` has NO dependencies on `fileGeneration/` (decoupled)
- ✅ `integration/` is isolated (optional AI dependencies)
- ✅ All modules depend on `types/` for shared type definitions

---

## Core Components

### 1. Scanner Module

**Purpose:** Extract code elements from source files using regex patterns

**Architecture:**

```typescript
// Pattern library (language-specific regex)
export const LANGUAGE_PATTERNS: Record<string, RegexPattern[]> = {
  ts: [
    { type: 'function', pattern: /function\s+([a-zA-Z0-9_$]+)/g },
    { type: 'class', pattern: /class\s+([a-zA-Z0-9_$]+)/g },
    // ... more patterns
  ],
  py: [/* Python patterns */],
  go: [/* Go patterns */],
  // ... 8+ languages
};

// Main scanning function
export async function scanCurrentElements(
  basePath: string,
  languages: string | string[],
  options: ScanOptions = {}
): Promise<ElementData[]> {
  // 1. Resolve file paths using glob
  const files = await resolveFiles(basePath, languages, options);

  // 2. Read and parse each file
  const elements = await Promise.all(
    files.map(file => scanFile(file, languages))
  );

  // 3. Flatten and deduplicate
  return deduplicateElements(elements.flat());
}
```

**Design Decisions:**

- ✅ **Regex over AST:** 10-100x faster for simple element extraction
- ✅ **Pattern Library:** Centralized patterns make adding languages easy
- ✅ **Parallel Processing:** Each file scanned independently for speed
- ✅ **Deduplication:** SHA256 hash prevents duplicate elements

**Performance:**
- Scan 500 files (~50K LOC): **~1200ms**
- Memory: **~50MB** for 541 elements

### 2. Analyzer Module

**Purpose:** Build dependency graphs and detect relationships using AST parsing

**Architecture:**

```typescript
// Orchestrator service (P3-T5)
export class AnalyzerService {
  private graphBuilder: GraphBuilder;
  private graphAnalyzer?: GraphAnalyzer;

  async analyze(patterns: string[]): Promise<AnalysisResult> {
    // 1. Find files
    const files = await this.findFiles(patterns);

    // 2. Build graph (uses import-parser + call-detector)
    const graph = this.graphBuilder.buildGraph(files);

    // 3. Analyze graph (detect circular deps, etc)
    const analyzer = new GraphAnalyzer(graph);

    // 4. Return results
    return {
      graph,
      statistics: analyzer.getStatistics(),
      circularDependencies: analyzer.detectCircularDependencies(),
      isolatedNodes: analyzer.findIsolatedNodes()
    };
  }
}
```

**Component Breakdown:**

1. **ImportParser (P3-T1):** Parse import/export statements using acorn
2. **CallDetector (P3-T2):** Detect function calls and method invocations
3. **GraphBuilder (P3-T3):** Combine imports + calls into dependency graph
4. **GraphAnalyzer (P3-T4):** Analyze graph for cycles, paths, orphans
5. **AnalyzerService (P3-T5):** Orchestrate the full pipeline

**Data Structures:**

```typescript
// Graph representation
interface DependencyGraph {
  nodes: Map<string, GraphNode>;  // Indexed by element ID
  edges: GraphEdge[];              // Array of directed edges
}

interface GraphNode {
  id: string;           // Unique identifier
  type: string;         // function, class, component, etc
  file: string;         // Source file path
  line?: number;        // Line number
}

interface GraphEdge {
  source: string;       // Source node ID
  target: string;       // Target node ID
  type: 'import' | 'export' | 'call'; // Edge type
}
```

**Performance:**
- Build graph for 500 files: **~150ms**
- Detect circular dependencies: **~20ms**
- Memory: **~100MB** for 500 nodes + 2000 edges

### 3. File Generation Module

**Purpose:** Generate 16 output files from scan results in 3 phases

**Architecture:**

```typescript
// Phase 1: Core files (required)
export async function saveIndex(projectPath, elements) { /* ... */ }
export async function generateContext(projectPath, elements) { /* ... */ }
export async function buildDependencyGraph(projectPath, elements) { /* ... */ }

// Phase 2: Analysis reports (optional)
export async function detectPatterns(projectPath, elements) { /* ... */ }
export async function analyzeCoverage(projectPath, elements) { /* ... */ }
export async function validateReferences(projectPath, elements) { /* ... */ }
export async function detectDrift(projectPath, elements) { /* ... */ }

// Phase 3: Diagrams (optional)
export async function generateDiagrams(projectPath, elements) { /* ... */ }
```

**Output File Structure:**

```
.coderef/
├── index.json                  # Phase 1: Scan results
├── context.json                # Phase 1: AI-readable context
├── context.md                  # Phase 1: Human-readable summary
├── graph.json                  # Phase 1: Dependency graph
├── reports/
│   ├── patterns.json          # Phase 2: Code patterns
│   ├── coverage.json          # Phase 2: Test coverage
│   ├── validation.json        # Phase 2: Reference validation
│   └── drift.json             # Phase 2: Change detection
├── diagrams/
│   ├── dependencies.mmd       # Phase 3: Mermaid diagram
│   ├── dependencies.dot       # Phase 3: Graphviz diagram
│   ├── calls.mmd              # Phase 3: Call graph
│   └── imports.mmd            # Phase 3: Import graph
└── exports/
    └── graph.json             # Duplicate for compatibility
```

**Execution Strategy:**

```typescript
// Sequential: Phase 1 → Phase 2 → Phase 3
async function generateAllFiles(projectPath, elements) {
  // Phase 1: Core files (sequential)
  await saveIndex(projectPath, elements);
  await generateContext(projectPath, elements);
  await buildDependencyGraph(projectPath, elements);

  // Phase 2: Analysis reports (parallel)
  await Promise.all([
    detectPatterns(projectPath, elements),
    analyzeCoverage(projectPath, elements),
    validateReferences(projectPath, elements),
    detectDrift(projectPath, elements)
  ]);

  // Phase 3: Diagrams (parallel)
  await generateDiagrams(projectPath, elements);
}
```

**Performance:**
- Phase 1 (3 files): **~50ms**
- Phase 2 (4 files, parallel): **~100ms**
- Phase 3 (4 files, parallel): **~50ms**
- **Total: ~200ms** (vs ~800ms with Python subprocess)

### 4. Query Engine

**Purpose:** Fast in-memory element search and filtering

**Architecture:**

```typescript
export class QueryExecutor {
  private elementMap: Map<string, ElementData>;
  private fileIndex: Map<string, string[]>;
  private typeIndex: Map<string, string[]>;

  constructor(elements: ElementData[]) {
    // Build indexes for O(1) lookups
    this.elementMap = new Map(elements.map(e => [e.id, e]));
    this.fileIndex = this.buildFileIndex(elements);
    this.typeIndex = this.buildTypeIndex(elements);
  }

  findByFile(file: string, type?: string): ElementData[] {
    const ids = this.fileIndex.get(file) || [];
    let results = ids.map(id => this.elementMap.get(id)!);
    if (type) {
      results = results.filter(e => e.type === type);
    }
    return results;
  }

  findByType(type: string): ElementData[] {
    const ids = this.typeIndex.get(type) || [];
    return ids.map(id => this.elementMap.get(id)!);
  }
}
```

**Performance:**
- Lookup by ID: **O(1)** (Map access)
- Lookup by file: **O(k)** where k = elements in file
- Lookup by type: **O(n)** where n = elements of that type

### 5. Type System

**Purpose:** Provide 26 type designators with validation and priorities

**Architecture:**

```typescript
export enum TypeDesignator {
  F = 'F',      // File
  Fn = 'Fn',    // Function
  C = 'C',      // Component
  Cl = 'Cl',    // Class
  M = 'M',      // Method
  H = 'H',      // Hook
  // ... 20 more types
}

export const TYPE_METADATA: Record<TypeDesignator, TypeMetadata> = {
  [TypeDesignator.Fn]: {
    name: 'Function',
    description: 'Standalone function or arrow function',
    priority: TypePriority.High,
    examples: ['function foo()', 'const bar = () => {}']
  },
  // ... metadata for all 26 types
};

export function isValidTypeDesignator(type: string): boolean {
  return Object.values(TypeDesignator).includes(type as TypeDesignator);
}
```

**Priority System:**

- **High:** Function, Class, Component, Hook, API Route
- **Medium:** Method, Variable, Interface, Test
- **Low:** Style, Documentation, Generated, Work in Progress

---

## Data Flow

### Scanning Pipeline

```
┌──────────────┐
│ User Request │ (projectPath, languages, options)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ scanCurrentElements() │
└──────┬───────┘
       │
       ├─► resolveFiles() ─► glob ─► ['file1.ts', 'file2.ts', ...]
       │
       ├─► scanFile() (for each file in parallel)
       │    │
       │    ├─► fs.readFileSync(file)
       │    │
       │    ├─► LANGUAGE_PATTERNS[lang].forEach(pattern =>
       │    │      pattern.regex.exec(content)
       │    │   )
       │    │
       │    └─► [{id, name, type, file, line, hash}, ...]
       │
       ├─► Flatten arrays
       │
       ├─► deduplicateElements() ─► Filter by unique hash
       │
       ▼
┌──────────────┐
│ ElementData[] │ (541 elements)
└──────────────┘
```

### Analysis Pipeline

```
┌──────────────┐
│ ElementData[] │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ AnalyzerService.analyze() │
└──────┬───────┘
       │
       ├─► ImportParser.parseImports(files)
       │    │
       │    └─► acorn.parse() ─► AST ─► ImportDeclarations
       │
       ├─► CallDetector.detectCalls(files)
       │    │
       │    └─► acorn.parse() ─► AST ─► CallExpressions
       │
       ├─► GraphBuilder.buildGraph()
       │    │
       │    └─► { nodes: Map, edges: [] }
       │
       ├─► GraphAnalyzer.analyze()
       │    │
       │    ├─► detectCircularDependencies() ─► DFS cycle detection
       │    ├─► findIsolatedNodes() ─► Nodes with degree = 0
       │    └─► getStatistics() ─► Count nodes/edges, compute metrics
       │
       ▼
┌──────────────┐
│ AnalysisResult │ (graph, stats, circular deps, orphans)
└──────────────┘
```

### File Generation Pipeline

```
┌──────────────┐
│ ElementData[] │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Phase 1: Core    │
├──────────────────┤
│ saveIndex()      │ ─► .coderef/index.json
│ generateContext()│ ─► .coderef/context.{json,md}
│ buildDependencyGraph() │ ─► .coderef/graph.json
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Phase 2: Reports │ (parallel execution)
├──────────────────┤
│ detectPatterns() │ ─► .coderef/reports/patterns.json
│ analyzeCoverage()│ ─► .coderef/reports/coverage.json
│ validateReferences() │ ─► .coderef/reports/validation.json
│ detectDrift()    │ ─► .coderef/reports/drift.json
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Phase 3: Diagrams│ (parallel execution)
├──────────────────┤
│ generateDiagrams()│ ─► .coderef/diagrams/*.{mmd,dot}
└──────────────────┘
```

---

## Integration Points

### 1. Dashboard UI (Next.js)

```typescript
// packages/dashboard/src/app/api/scanner/scan/route.ts
import { scanCurrentElements, saveIndex } from '@coderef/core';

export async function POST(request: Request) {
  const { projectPath } = await request.json();

  // Scan using @coderef/core
  const elements = await scanCurrentElements(projectPath, ['ts', 'tsx']);

  // Save to .coderef/
  await saveIndex(projectPath, elements);

  return Response.json({ success: true, count: elements.length });
}
```

### 2. CLI Scripts

```typescript
#!/usr/bin/env node
import { scanCurrentElements, generateContext } from '@coderef/core';

const projectPath = process.argv[2] || process.cwd();
const elements = await scanCurrentElements(projectPath, ['ts', 'tsx']);
await generateContext(projectPath, elements);

console.log(`Generated context for ${elements.length} elements`);
```

### 3. RAG Pipeline (AI Integration)

```typescript
import { SemanticSearch, EmbeddingService } from '@coderef/core';

// Initialize RAG components
const embedder = new EmbeddingService(openAIProvider);
const search = new SemanticSearch(vectorStore, embedder);

// Index codebase
await search.indexElements(elements);

// Query with natural language
const results = await search.search('authentication functions', { limit: 5 });
```

### 4. External Tools

- **Git Hooks:** Run `validateReferences()` on pre-commit
- **CI/CD:** Run `analyzeCoverage()` and fail if below threshold
- **Documentation:** Auto-generate API docs from scanned elements
- **Monitoring:** Track drift over time with `detectDrift()`

---

## Performance & Scalability

### Performance Benchmarks

| Operation | Input Size | Time | Memory |
|-----------|------------|------|--------|
| Scan (regex) | 500 files, 50K LOC | ~1200ms | ~50MB |
| Build graph (AST) | 500 files | ~150ms | ~100MB |
| File generation | 16 files | ~200ms | ~20MB |
| Query (lookup) | 541 elements | <1ms | ~10MB |

### Scalability Strategies

**1. Incremental Scanning**
- Only scan changed files (detect via git status)
- Merge new elements with existing index

**2. Parallel Processing**
- File scanning uses Promise.all (parallel per file)
- File generation Phase 2/3 uses Promise.all (parallel output)

**3. Caching**
- AnalyzerService caches graph in memory (useCache: true)
- File generation reads from cached scan results

**4. Lazy Loading**
- Integration module (AI, RAG) is commented out in index.ts
- Only load when needed to reduce bundle size

**5. Memory Management**
- Use streams for large file generation (future)
- Clear element arrays after file write

### Bottlenecks

| Bottleneck | Impact | Mitigation |
|------------|--------|------------|
| Regex scanning large files | O(n) per file | Exclude large generated files |
| AST parsing for JS | Slower than TS | Use acorn with caching |
| File I/O for index.json | Disk write latency | Use async fs.writeFile |
| Graph traversal for cycles | O(V+E) DFS | Limit max depth |

---

## Security

### Input Validation

```typescript
// Validate projectPath is within allowed directory
function validateProjectPath(projectPath: string): void {
  const resolved = path.resolve(projectPath);
  const allowed = path.resolve(process.cwd());

  if (!resolved.startsWith(allowed)) {
    throw new Error('Project path outside allowed directory');
  }
}
```

### Path Traversal Prevention

```typescript
// Prevent ../../../etc/passwd attacks
function sanitizePath(userPath: string): string {
  const normalized = path.normalize(userPath);
  if (normalized.includes('..')) {
    throw new Error('Path traversal detected');
  }
  return normalized;
}
```

### File Size Limits

```typescript
// Prevent DoS from scanning 10GB files
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function scanFile(file: string): ElementData[] {
  const stats = fs.statSync(file);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file} (${stats.size} bytes)`);
  }
  // ... continue scanning
}
```

### Code Injection Prevention

- ❌ **NO eval() or new Function()** - All parsing uses acorn AST
- ❌ **NO child_process.exec()** - No shell command execution
- ✅ **Regex patterns are static** - No user-defined regex

---

## Deployment

### Build Process

```bash
# 1. Clean previous build
npm run clean

# 2. Compile TypeScript
npm run build  # tsc

# 3. Run tests
npm test

# 4. Generate types
# (included in tsc build)
```

**Output:**
- `dist/` directory with compiled JS + .d.ts files
- `dist/index.js` - Main entry point
- `dist/index.d.ts` - Type definitions

### Package Distribution

```json
{
  "name": "@coderef/core",
  "version": "2.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/**/*", "README.md", "LICENSE"]
}
```

**Consumers:**
```bash
npm install @coderef/core
```

```typescript
import { scanCurrentElements } from '@coderef/core';
```

### Environment Requirements

- **Node.js:** 16+ (uses fs/promises, native ESM)
- **TypeScript:** 5.0+ (for TypeScript consumers)
- **Disk Space:** ~20MB for node_modules
- **Memory:** ~100MB typical usage

---

## Future Architecture

### v2.1.0 - Incremental Scanning (Q1 2026)

```typescript
// Track file changes via git
interface IncrementalScanOptions {
  previousIndex: string; // Path to .coderef/index.json
  gitStatus?: string;    // Output of 'git status --porcelain'
}

export async function incrementalScan(
  projectPath: string,
  options: IncrementalScanOptions
): Promise<ElementData[]> {
  // 1. Load previous index
  const prevElements = JSON.parse(fs.readFileSync(options.previousIndex, 'utf-8'));

  // 2. Detect changed files
  const changedFiles = parseGitStatus(options.gitStatus);

  // 3. Scan only changed files
  const newElements = await scanCurrentElements(projectPath, ['ts', 'tsx'], {
    include: changedFiles
  });

  // 4. Merge with previous index
  return mergeElements(prevElements, newElements);
}
```

### v2.2.0 - Watch Mode (Q2 2026)

```typescript
// Real-time scanning on file changes
export function watchAndScan(
  projectPath: string,
  callback: (elements: ElementData[]) => void
): () => void {
  const watcher = fs.watch(projectPath, { recursive: true });

  watcher.on('change', async (eventType, filename) => {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
      const elements = await incrementalScan(projectPath, { /* ... */ });
      callback(elements);
    }
  });

  // Return cleanup function
  return () => watcher.close();
}
```

### v3.0.0 - Unified AST Parsing (Q3 2026)

**Goal:** Replace regex scanning with AST-based extraction for 99% accuracy

```typescript
// New architecture: AST-first
export async function scanCurrentElements(
  projectPath: string,
  languages: string[]
): Promise<ElementData[]> {
  // Use language-specific parsers
  const parsers = {
    ts: acorn,
    py: pythonParser,
    go: goParser
  };

  // Parse all files
  const asts = await Promise.all(
    files.map(file => parsers[lang].parse(file))
  );

  // Extract elements from AST
  return asts.flatMap(ast => extractElementsFromAST(ast));
}
```

**Benefits:**
- ✅ 99% accuracy (vs 85% with regex)
- ✅ Extract exact source locations
- ✅ Handle complex syntax (generics, decorators)
- ❌ 10-100x slower (acceptable tradeoff)

---

## Appendix

### Glossary

- **AST:** Abstract Syntax Tree - structured representation of code
- **Acorn:** Fast JavaScript parser producing ESTree-compatible AST
- **DFS:** Depth-First Search - graph traversal algorithm
- **Element:** Code artifact (function, class, component, etc)
- **Graph:** Data structure with nodes (elements) and edges (relationships)
- **RAG:** Retrieval-Augmented Generation - AI technique combining search + generation

### References

- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Acorn Parser](https://github.com/acornjs/acorn)
- [ESTree Spec](https://github.com/estree/estree)
- [Graph Algorithms](https://en.wikipedia.org/wiki/Graph_theory)

---

**Last Reviewed:** 2026-01-09
**Next Review:** 2026-04-09
