---
Agent: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
Date: 2026-01-03
Task: DOCUMENT
---

# @coderef/core — Authoritative Documentation

## Executive Summary

@coderef/core is the foundational analysis library for the CodeRef System v2.0. It provides semantic code element discovery, dependency graph construction, relationship analysis, and AI-powered code intelligence for safe codebase modification. The library serves as the central analysis engine consumed by @coderef/cli, coderef-context MCP server, and coderef-workflow orchestrator to enable agents to understand code dependencies before making changes.

## Audience & Intent

- **Markdown (this document):** Architecture truth, module responsibilities, data flow contracts, integration points
- **TypeScript source code:** Runtime behavior, API contracts, type definitions
- **JSON exports:** Graph structure, analysis results, serialization format
- **Test files:** Behavioral specifications, edge cases, correctness validation

When conflicts arise between this document and code, **code is authoritative for implementation**, but this document defines **architectural intent and design decisions**.

---

## 1. Architecture Overview

### 1.1 System Role

@coderef/core is the **analysis kernel** of the CodeRef System. It sits between raw source code and higher-level tools:

```
Source Code (TypeScript/JavaScript)
    ↓
[@coderef/core] ← Analysis Engine
    ├── Scanner Module (Regex/AST)
    ├── Analyzer Module (Graph Builder)
    ├── Context Module (Impact/Complexity)
    ├── Query Module (Relationship Queries)
    ├── Parser/Validator (CodeRef2 Format)
    └── Integration Module (RAG/AI)
    ↓
Outputs: ElementData[], DependencyGraph, AnalysisResult, QueryResult
    ↓
Consumers: @coderef/cli, coderef-context MCP, coderef-workflow
```

### 1.2 Module Hierarchy

The library exports 8 core modules organized into phases:

| Module | Phase | Entry Point | Purpose |
|--------|-------|-------------|---------|
| **Scanner** | N/A | `../scanner.js` | Regex-based element discovery (85% accuracy, <1s) |
| **Analyzer** | Phase 3 | `./analyzer/index.ts` | AST-based graph construction (99% accuracy, 1-3s) |
| **Context** | Phase 5 | `./context/index.ts` | Impact simulation, complexity scoring, test analysis |
| **Query** | Phase 4 | `./query/query-executor.ts` | Relationship queries (calls, imports, depends-on) |
| **Export** | Phase 5 | `./export/index.ts` | Graph serialization (JSON, GraphQL, JSON-LD, Protobuf) |
| **Integration** | Phase 5 | `./integration/index.ts` | AI prompt generation, RAG system, embeddings |
| **Parser** | N/A | `./parser/parser.ts` | CodeRef2 reference parsing (@Type/path#element) |
| **Validator** | N/A | `./validator/validator.ts` | CodeRef2 format validation and suggestions |

### 1.3 Key Design Principles

1. **Dual-mode analysis:** Fast regex scanning (development) + Precise AST parsing (production)
2. **Incremental caching:** Graph results cached to avoid re-analysis
3. **Lazy evaluation:** Analysis only runs when explicitly requested
4. **Stateless APIs:** All methods are pure functions (except caching)
5. **Graph-first architecture:** Dependency graph is the central data structure

---

## 2. State Ownership & Source of Truth (Canonical)

| State | Owner | Type | Persistence | Source of Truth |
|-------|-------|------|-------------|-----------------|
| **Scanned Elements** | Scanner Module | Domain | None (ephemeral) | `ElementData[]` returned from `scanCurrentElements()` |
| **Dependency Graph** | AnalyzerService | Domain | File-based (.coderef/exports/graph.json) | `DependencyGraph` in memory, serialized via GraphExporter |
| **Element Map** | AnalyzerService | Domain | None (derived from scan) | `Map<string, {id, type, file, line}>` |
| **Query Results** | QueryExecutor | Domain | In-memory cache (5 min TTL) | `QueryResult` with cache metadata |
| **Impact Analysis** | ImpactSimulator | Domain | In-memory cache (no expiry) | `BlastRadius` with risk scoring |
| **Complexity Metrics** | ComplexityScorer | Domain | None (computed on-demand) | `ElementComplexity` with LOC/cyclomatic data |
| **Graph Edges** | GraphBuilder | Domain | Part of DependencyGraph | `GraphEdge[]` with bidirectional indexes |
| **RAG Embeddings** | EmbeddingService | System | Vector store (Pinecone/Chroma/SQLite) | Vector database is source of truth |
| **Conversation History** | ConversationManager | Domain | In-memory (session-scoped) | Message array, cleared on reset |
| **Source Code Cache** | ComplexityScorer | System | In-memory Map | `Map<filePath, sourceCode>` |

### State Precedence Rules

1. **Graph conflicts:** If graph and element map disagree, element map wins (it's fresher from scanner)
2. **Cache staleness:** Cached results include timestamp; consumers must decide freshness policy
3. **File-based vs in-memory:** Serialized graph files are snapshots; in-memory graph is current truth
4. **Parser vs validator:** Parser errors always take precedence over validator warnings

---

## 3. Data Persistence

### 3.1 Graph Export Persistence

**Storage Location:** `.coderef/exports/`

**File Formats:**
- `graph.json` — Primary format (JSON with full metadata)
- `graph.graphql` — GraphQL schema export
- `graph.jsonld` — Linked Data format (RDF-compatible)
- `graph.proto` — Protocol Buffers binary (compact, fast)

**Schema (JSON format):**
```typescript
{
  "nodes": [
    {
      "id": "file:elementName",
      "name": "elementName",
      "type": "function" | "class" | "component" | "file",
      "file": "/absolute/path/to/file.ts",
      "line": 42,
      "metadata": { /* optional */ }
    }
  ],
  "edges": [
    {
      "source": "sourceNodeId",
      "target": "targetNodeId",
      "type": "imports" | "calls" | "depends-on" | "implements" | "tests" | "reexports",
      "weight": 1,
      "metadata": { "statements": [...] }
    }
  ]
}
```

**Versioning Strategy:** None currently. Breaking changes require manual migration.

**Failure Modes:**
- **Missing .coderef/ directory:** GraphExporter creates it automatically
- **Corrupt JSON:** Parser throws, no auto-recovery (consumer must handle)
- **Large graphs (>10MB):** Use Protobuf format for 3-5x compression

**Cross-Tab Sync:** Not applicable (CLI/MCP server are single-process)

### 3.2 RAG Vector Store Persistence

**Storage Options:**
- **Pinecone:** Cloud vector store (API-based)
- **Chroma:** Local vector store (HTTP server)
- **SQLite:** Embedded vector store (better-sqlite3)

**Schema (Pinecone example):**
```typescript
{
  "id": "chunk-file-line",
  "values": [0.1, 0.2, ...], // 1536-dim embedding
  "metadata": {
    "file": "/path/to/file.ts",
    "element": "functionName",
    "type": "function",
    "line": 42,
    "text": "source code snippet"
  }
}
```

**Failure Recovery:**
- **Index not found:** IncrementalIndexer rebuilds from scratch
- **Stale embeddings:** Drift detector flags for re-indexing
- **API errors:** Retry with exponential backoff (3 attempts)

---

## 4. State Lifecycle

### 4.1 Analysis Lifecycle (Primary Workflow)

```
1. INITIALIZATION
   AnalyzerService.constructor(basePath)
     ↓
   GraphBuilder + GraphAnalyzer instantiated
   Cache initialized (empty)

2. ELEMENT DISCOVERY
   scanCurrentElements(path, languages) [Scanner Module]
     ↓
   Returns ElementData[]
   Builds element map: Map<name, {id, type, file, line}>

3. GRAPH CONSTRUCTION
   AnalyzerService.analyze(patterns)
     ↓
   ImportParser.buildImportEdges(files) → ImportEdge[]
   CallDetector.buildCallEdges(files, elementMap) → CallEdge[]
     ↓
   GraphBuilder.buildGraph() → DependencyGraph
     ↓
   GraphAnalyzer.detectCircularDependencies()
   GraphAnalyzer.findIsolatedNodes()
     ↓
   Returns AnalysisResult (cached)

4. QUERY EXECUTION
   QueryExecutor.execute(request)
     ↓
   Check cache (5 min TTL)
   If miss: GraphAnalyzer.traverse(type, target, maxDepth)
     ↓
   Returns QueryResult

5. IMPACT ANALYSIS
   ImpactSimulator.calculateBlastRadius(elementId)
     ↓
   BFS traversal of graph.edgesByTarget
   Categorize: direct (depth 1), transitive (2-3), secondary (4+)
     ↓
   Risk scoring: critical (>50 deps), high (>20), medium (>5), low
     ↓
   Returns BlastRadius (cached permanently)

6. PERSISTENCE (Optional)
   GraphExporter.export(graph, format)
     ↓
   Serialize to .coderef/exports/graph.{format}
```

### 4.2 RAG Indexing Lifecycle

```
1. CONFIGURATION
   RAGConfig.validate() → Check LLM/VectorStore credentials

2. CODE CHUNKING
   ChunkConverter.convertElementToChunk(element)
     ↓
   EmbeddingTextGenerator.generate(element) → markdown snippet
     ↓
   Returns CodeChunk

3. EMBEDDING GENERATION
   EmbeddingService.embed(text)
     ↓
   LLM API call (OpenAI/Anthropic)
     ↓
   Returns float[] (1536-dim for OpenAI)

4. INCREMENTAL INDEXING
   IncrementalIndexer.indexChanges(files)
     ↓
   Git diff detection
   Chunk only changed elements
     ↓
   VectorStore.upsert(chunks)

5. SEMANTIC SEARCH
   SemanticSearch.search(query, strategy)
     ↓
   EmbeddingService.embed(query)
   VectorStore.query(embedding, topK)
     ↓
   GraphReRanker.rerank(results) [boost important nodes]
     ↓
   Returns ranked results

6. ANSWER GENERATION
   ContextBuilder.build(results) → markdown context
   AnswerGenerationService.generate(question, context)
     ↓
   LLM API call with prompt template
     ↓
   ConfidenceScorer.score(answer) → 0-100
     ↓
   Returns answer + citations
```

---

## 5. Behaviors (Events & Side Effects)

### 5.1 Scanner Module Behaviors

| Trigger | Behavior | Side Effects |
|---------|----------|--------------|
| `scanCurrentElements(path)` called | File system traversal via glob | Disk I/O, blocks until complete |
| Regex match found | Create ElementData object | None (pure function) |
| File read error | Skip file, log warning | Continue scanning remaining files |
| Large file (>1MB) | No special handling | May cause memory spike |

### 5.2 Analyzer Module Behaviors

| Trigger | Behavior | Side Effects |
|---------|----------|--------------|
| `analyze()` called with cache hit | Return cached graph immediately | None |
| `analyze()` called with cache miss | Build graph from scratch | CPU-intensive (1-3s), blocks |
| Circular dependency detected | Add to `circularDependencies[]` | Graph still built, warning emitted |
| Import resolution fails | Create edge with unresolved target | Target node may be placeholder |
| TypeScript parse error | Skip file, add to error log | Graph incomplete for that file |

### 5.3 Query Executor Behaviors

| Trigger | Behavior | Side Effects |
|---------|----------|--------------|
| `execute()` with cached result | Return cached + set `cached: true` | None |
| `execute()` with cache miss | Graph traversal (BFS/DFS) | CPU usage proportional to depth |
| Cache entry expires (5 min) | Evict from cache | Next query rebuilds |
| `clearCache()` called | Empty cache map | All queries re-compute |
| Unknown element queried | Return empty results | No error thrown (graceful) |

### 5.4 Impact Simulator Behaviors

| Trigger | Behavior | Side Effects |
|---------|----------|--------------|
| `calculateBlastRadius()` | BFS traversal up to maxDepth | Cache grows unbounded (no expiry) |
| Risk score > 50 | Set severity = 'critical' | Consumer must handle |
| No dependents found | Return severity = 'low' | Risk score = 0 |
| Circular dependency in chain | Track visited set, break cycle | Prevents infinite loop |

### 5.5 RAG System Behaviors

| Trigger | Behavior | Side Effects |
|---------|----------|--------------|
| `indexCodebase()` | Batch embedding API calls | Cost scales with codebase size ($0.01-1 typically) |
| Embedding API failure | Retry 3x with exponential backoff | May block 10-30s |
| Vector store connection lost | Throw error, no auto-reconnect | Consumer must reinitialize |
| `ask()` with no indexed data | Return error: "No index found" | No LLM call made |
| Conversation history > 10 messages | Summarize old messages | Reduces context size |

---

## 6. Event & Callback Contracts

@coderef/core is **primarily synchronous and callback-free**. All APIs use async/await. No event emitters.

**Exception:** RAG module uses callbacks for progress tracking:

| Event | Trigger | Payload | Side Effects |
|-------|---------|---------|--------------|
| `onIndexProgress` | Every 10 chunks indexed | `{ processed: number, total: number }` | Consumer can update UI |
| `onIndexComplete` | Indexing finished | `{ totalChunks: number, cost: number }` | None |
| `onIndexError` | API error during indexing | `{ error: Error, chunk: CodeChunk }` | Indexing continues |

**Usage:**
```typescript
indexer.on('progress', ({ processed, total }) => {
  console.log(`Indexed ${processed}/${total}`);
});
```

---

## 7. Performance Considerations

### 7.1 Known Limits (Tested Thresholds)

| Operation | Tested Size | Time | Memory | Bottleneck |
|-----------|-------------|------|--------|------------|
| **Regex scan** | 1000 files | <1s | <100MB | File I/O |
| **AST scan** | 1000 files | 1-3s | <200MB | TypeScript Compiler API |
| **Graph build** | 10,000 nodes | <500ms | <300MB | Edge indexing (Map construction) |
| **BFS traversal** | 10,000 nodes, depth 5 | <100ms | <50MB | Queue operations |
| **Impact analysis** | 1000 dependents | <200ms | <100MB | Visited set checks |
| **RAG indexing** | 500 elements | 30-60s | <500MB | LLM API latency |
| **Vector search** | 10,000 vectors | <1s | N/A (external store) | Network + vector similarity |

### 7.2 Bottlenecks

1. **Scanner I/O:** Reading 1000+ files blocks main thread. No parallelization.
2. **Graph edge indexing:** Building `edgesBySource` and `edgesByTarget` maps is O(E) with memory overhead.
3. **RAG embedding costs:** OpenAI charges $0.0001/1K tokens. 500-element codebase ≈ $0.50.
4. **Cache memory growth:** ImpactSimulator cache never expires, can grow to 100s of MB.

### 7.3 Optimization Opportunities

- **Scanner:** Use worker threads for parallel file reading (5-10x speedup)
- **Graph builder:** Use adjacency list instead of bidirectional maps (50% memory reduction)
- **Query cache:** Implement LRU eviction policy (cap at 100 entries)
- **RAG:** Batch embed API calls (10x cost reduction)

### 7.4 Deferred Optimizations (with Rationale)

- **Stream-based scanning:** Complexity not justified until codebases >10K files
- **Incremental graph updates:** Requires git integration and change tracking (Phase 6 work)
- **GPU-accelerated embeddings:** Only relevant for >100K elements (not current use case)

---

## 8. Accessibility

**Not applicable.** @coderef/core is a backend library with no UI.

---

## 9. Testing Strategy

### 9.1 Must-Cover Scenarios

| Scenario | Test Location | Coverage |
|----------|---------------|----------|
| **Regex scanner accuracy** | `packages/scanner.test.ts` | 85% baseline on realistic codebases |
| **AST scanner accuracy** | `packages/core/src/analyzer/__tests__/ast-scanner.test.ts` | 99% on TypeScript/JavaScript |
| **Circular dependency detection** | `packages/core/src/analyzer/__tests__/graph-analyzer.test.ts` | All cycle types (self, 2-node, N-node) |
| **Import resolution (relative, alias, barrel)** | `packages/core/src/analyzer/__tests__/import-parser.test.ts` | Path normalization correctness |
| **Call detection edge cases** | `packages/core/src/analyzer/__tests__/call-detector.test.ts` | Dynamic imports, method chaining |
| **Blast radius calculation** | `packages/core/src/context/__tests__/impact-simulator.test.ts` | Direct, transitive, secondary categorization |
| **Complexity scoring accuracy** | `packages/core/src/context/__tests__/complexity-scorer.test.ts` | LOC, cyclomatic, parameter count |
| **Query cache behavior** | `packages/core/src/query/__tests__/query-executor.test.ts` | TTL expiry, invalidation |
| **RAG Q&A pipeline** | `packages/core/src/integration/rag/__tests__/integration/qa-pipeline.test.ts` | End-to-end answer generation |
| **Graph export formats** | `packages/core/src/export/__tests__/graph-exporter.test.ts` | JSON, GraphQL, JSON-LD, Protobuf |

### 9.2 Explicitly Not Tested

- **LLM hallucination quality:** Out of scope (model-dependent)
- **Vector store performance:** External service responsibility
- **File system errors (disk full, permissions):** Assumed infrastructure handles
- **Large file edge cases (>10MB):** No current use case

---

## 10. Non-Goals / Out of Scope

The following are **explicitly rejected** to prevent feature creep:

1. **Code transformation/refactoring:** Use AST libraries (jscodeshift, ts-morph) instead
2. **Multi-language support (Python, Go, Rust):** Core is TypeScript/JavaScript only
3. **Real-time file watching:** Use @coderef/cli `watch` command instead
4. **Git integration for change tracking:** Phase 6 feature, not in core
5. **Security vulnerability scanning:** Integrate Bandit/Snyk externally
6. **Performance profiling/runtime metrics:** Separate tooling required
7. **Code formatting/linting:** Use Prettier/ESLint
8. **Distributed graph storage:** Single-process in-memory only

---

## 11. Common Pitfalls & Sharp Edges

### 11.1 Known Bugs/Quirks

| Issue | Impact | Workaround |
|-------|--------|------------|
| **Dynamic imports not always detected** | Call edges missing | Use static imports where possible |
| **Barrel exports flatten namespaces** | Node IDs may collide | Avoid re-exporting with same name |
| **Cache never invalidates on file changes** | Stale results after edits | Call `analyze(patterns, useCache=false)` |
| **Large graphs (>50MB) crash JSON.stringify** | Export fails | Use Protobuf format instead |
| **Cyclomatic complexity overestimates** | Scores inflated 10-20% | Use as relative metric only |

### 11.2 Integration Gotchas

- **Element map must match file paths:** Absolute vs relative paths cause lookup failures. Always normalize.
- **Query types case-sensitive:** `what-calls` works, `whatCalls` fails silently.
- **RAG requires API keys in env:** `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` must be set before initialization.
- **Graph builder assumes .ts/.tsx/.js/.jsx only:** Other extensions ignored without warning.

### 11.3 Configuration Mistakes

- **Scanner exclude patterns:** Must use `**/` prefix for directory matches (e.g., `**/node_modules/**`)
- **Analyzer maxDepth:** Default is 5. Setting >10 causes exponential slowdown.
- **RAG topK too high:** >50 results cause context overflow for LLMs (8K token limit)

### 11.4 Edge Cases

- **Empty codebases:** `analyze()` throws if no files match patterns (intentional)
- **Self-loops in graph:** Function calling itself creates `source === target` edge (allowed)
- **Orphaned nodes:** Files with no imports/exports show as isolated (expected behavior)
- **Metadata key collisions:** Parser allows duplicate keys; last one wins (should be array instead)

---

## 12. API Reference (Public Contracts)

### 12.1 Scanner Module

**Function:** `scanCurrentElements(path: string, languages: string | string[], options?: ScanOptions): Promise<ElementData[]>`

**Contract:**
- **Input:** Absolute path, language codes ('ts', 'tsx', 'js', 'jsx'), optional exclude patterns
- **Output:** Array of discovered elements with type, name, file, line, exported status
- **Guarantees:** 85% accuracy on real codebases, <1s execution time
- **Errors:** Throws if path not found, logs warnings for parse failures

**Example:**
```typescript
const elements = await scanCurrentElements('./src', ['ts', 'tsx'], {
  recursive: true,
  exclude: ['**/__tests__/**']
});
// Returns: [{ name: 'foo', type: 'function', file: './src/utils.ts', line: 12, exported: true }, ...]
```

### 12.2 Analyzer Module

**Class:** `AnalyzerService`

**Constructor:** `new AnalyzerService(basePath?: string)`
- `basePath` defaults to `process.cwd()`

**Method:** `analyze(patterns?: string[], useCache?: boolean): Promise<AnalysisResult>`

**Contract:**
- **Input:** Glob patterns for files (default: `['packages/**/*.ts']`), cache flag (default: true)
- **Output:** `AnalysisResult` with graph, statistics, circular dependencies, isolated nodes
- **Guarantees:** 99% accuracy with AST mode, <500ms for 100-file projects
- **Caching:** Results cached indefinitely, cleared only by `useCache=false`
- **Errors:** Throws if no files match patterns

**Method:** `loadGraph(filePath: string): Promise<void>`
- Loads pre-built graph from JSON file
- **Contract:** Must be valid graph JSON, throws on parse error

**Method:** `getGraph(): DependencyGraph`
- Returns cached graph (throws if not analyzed yet)

**Example:**
```typescript
const analyzer = new AnalyzerService('/path/to/project');
const result = await analyzer.analyze();
console.log(result.statistics.nodeCount); // 150
console.log(result.circularDependencies); // [{ path: ['a.ts', 'b.ts', 'a.ts'] }]
```

### 12.3 Context Module

**Class:** `ImpactSimulator`

**Constructor:** `new ImpactSimulator(graph: DependencyGraph)`

**Method:** `calculateBlastRadius(elementId: string, maxDepth?: number): BlastRadius`

**Contract:**
- **Input:** Node ID from graph (`file:elementName`), max traversal depth (default: 5)
- **Output:** `BlastRadius` with direct/transitive/secondary impacts, risk score (0-100), severity
- **Guarantees:** BFS traversal, no infinite loops (visited set prevents cycles)
- **Caching:** Permanent cache, never expires
- **Risk Levels:**
  - critical: >50 dependents OR no tests
  - high: 20-50 dependents
  - medium: 5-20 dependents
  - low: <5 dependents

**Example:**
```typescript
const simulator = new ImpactSimulator(graph);
const blast = simulator.calculateBlastRadius('utils.ts:formatDate');
console.log(blast.severity); // 'high'
console.log(blast.totalImpactedElements); // 32
```

**Class:** `ComplexityScorer`

**Method:** `scoreElement(element: ElementData): ElementComplexity`

**Contract:**
- **Input:** ElementData from scanner
- **Output:** Complexity metrics (LOC, cyclomatic, parameters, overall score 0-10)
- **Guarantees:** LOC accurate if source added via `addSource()`, estimated otherwise
- **Cyclomatic complexity:** Approximation (counts if/for/while/switch), ±20% variance

**Example:**
```typescript
const scorer = new ComplexityScorer();
scorer.addSource('./utils.ts', fs.readFileSync('./utils.ts', 'utf-8'));
const complexity = scorer.scoreElement(element);
console.log(complexity.metrics.loc); // 45
console.log(complexity.riskLevel); // 'medium'
```

### 12.4 Query Module

**Class:** `QueryExecutor`

**Constructor:** `new QueryExecutor(analyzer: AnalyzerService, cacheExpiryMs?: number)`
- `cacheExpiryMs` defaults to 300000 (5 minutes)

**Method:** `execute(request: QueryRequest): Promise<QueryResult>`

**Contract:**
- **Input:** Query type (8 types supported), target element, optional source/maxDepth
- **Output:** `QueryResult` with matched nodes, count, execution time, cache status
- **Guarantees:** <100ms for depth ≤5, cache hit returns immediately
- **Query Types:**
  - `what-calls`: What does this element call?
  - `what-calls-me`: What calls this element?
  - `what-imports`: What does this import?
  - `what-imports-me`: What imports this?
  - `what-depends-on`: Transitive dependencies
  - `what-depends-on-me`: Transitive dependents
  - `shortest-path`: Shortest path between two elements
  - `all-paths`: All paths between two elements

**Example:**
```typescript
const executor = new QueryExecutor(analyzer);
const result = await executor.execute({
  type: 'what-calls-me',
  target: 'authenticate',
  maxDepth: 3
});
console.log(result.count); // 5
console.log(result.results[0].name); // 'login'
```

### 12.5 Parser Module

**Class:** `CodeRefParser`

**Method:** `parse(reference: string): ParsedCodeRef`

**Contract:**
- **Input:** CodeRef2 string (e.g., `@Fn/utils/logger#logInfo:42{status=active}`)
- **Output:** Parsed object with type, path, element, line, metadata, validation errors
- **Guarantees:** All 26 type designators supported, metadata parsed as key-value pairs
- **Errors:** Returns `isValid: false` with error array (never throws)

**Example:**
```typescript
const parser = new CodeRefParser();
const parsed = parser.parse('@Fn/auth/login#authenticate:15{status=active}');
console.log(parsed.type); // 'Fn'
console.log(parsed.element); // 'authenticate'
console.log(parsed.metadata?.status); // 'active'
```

### 12.6 Validator Module

**Class:** `CodeRefValidator`

**Method:** `validate(parsed: ParsedCodeRef): ValidationResult`

**Contract:**
- **Input:** Parsed CodeRef from parser
- **Output:** Validation result with errors, warnings, suggestions
- **Guarantees:** Checks type designator validity, metadata categories, suggests fixes for typos
- **Errors vs Warnings:**
  - errors: Invalid type, malformed metadata
  - warnings: Unknown metadata category, deprecated type

**Example:**
```typescript
const validator = new CodeRefValidator();
const result = validator.validate(parsed);
console.log(result.isValid); // true
console.log(result.warnings); // ['Unknown metadata key: custom']
```

### 12.7 Export Module

**Class:** `GraphExporter`

**Method:** `export(graph: DependencyGraph, format: ExportFormat, outputPath?: string): Promise<string>`

**Contract:**
- **Input:** Graph, format ('json' | 'graphql' | 'jsonld' | 'protobuf'), optional output path
- **Output:** Serialized graph string (or writes to file if outputPath provided)
- **Guarantees:** JSON format always succeeds, Protobuf reduces size 60-70%
- **Errors:** Throws if graph >50MB and format is JSON (use Protobuf)

**Example:**
```typescript
const exporter = new GraphExporter();
await exporter.export(graph, 'json', '.coderef/exports/graph.json');
// Creates .coderef/exports/graph.json with full graph
```

### 12.8 Integration Module (RAG)

**Class:** `SemanticSearch`

**Method:** `search(query: string, strategy?: SearchStrategy, topK?: number): Promise<SearchResult[]>`

**Contract:**
- **Input:** Natural language query, strategy ('semantic' | 'centrality' | 'quality' | 'usage' | 'public'), result limit (default: 10)
- **Output:** Ranked code chunks with similarity scores
- **Guarantees:** Returns results in <3s, re-ranks by graph importance
- **Strategies:**
  - semantic: Pure vector similarity
  - centrality: Boost high-degree nodes
  - quality: Boost documented/tested code
  - usage: Boost frequently imported elements
  - public: Boost exported APIs

**Example:**
```typescript
const search = new SemanticSearch(embeddingService, vectorStore, graph);
const results = await search.search('How does authentication work?', 'centrality', 5);
console.log(results[0].element); // 'authenticate'
console.log(results[0].similarity); // 0.87
```

**Class:** `AnswerGenerationService`

**Method:** `generate(question: string, context: string): Promise<{ answer: string, confidence: number }>`

**Contract:**
- **Input:** User question, markdown context from ContextBuilder
- **Output:** LLM-generated answer with confidence score (0-100)
- **Guarantees:** Includes code citations in answer, confidence ≥70 considered reliable
- **Errors:** Throws if LLM API fails (no retry logic here)

**Example:**
```typescript
const generator = new AnswerGenerationService(llmProvider);
const { answer, confidence } = await generator.generate(
  'How does login work?',
  '### authenticate\n```typescript\nexport function authenticate() {...}\n```'
);
console.log(answer); // "The login process uses the `authenticate` function..."
console.log(confidence); // 85
```

---

## 13. Integration Points & Dependencies

### 13.1 External Dependencies

| Package | Purpose | Critical? | Fallback |
|---------|---------|-----------|----------|
| **typescript** | AST parsing via Compiler API | Yes | None (regex scanner is fallback for speed, not replacement) |
| **glob** | File pattern matching | Yes | None |
| **minimatch** | Exclude pattern matching | Yes | None |
| **zod** | Runtime type validation | No | Manual validation |
| **acorn** | JavaScript AST parsing | Yes | None |

### 13.2 Consumer Integration Points

**@coderef/cli**
- Imports: `scanCurrentElements`, `AnalyzerService`, `QueryExecutor`, `ImpactSimulator`, `GraphExporter`
- Usage: Command handlers wrap core APIs with CLI flags
- Data flow: CLI → Core → JSON/text output

**coderef-context MCP Server**
- Imports: All core modules via subprocess wrapper
- Usage: MCP tools invoke CLI commands which call core
- Data flow: MCP → CLI subprocess → Core → JSON response

**coderef-workflow MCP Server**
- Imports: `ContextGenerator`, `TestPatternAnalyzer`, `BreakingChangeDetector`
- Usage: Workflow steps call context APIs for planning
- Data flow: Workflow → Core → Structured context for agents

### 13.3 Data Contracts

**ElementData (Scanner Output):**
```typescript
{
  name: string;          // 'authenticate'
  type: string;          // 'function'
  file: string;          // '/absolute/path/to/auth.ts'
  line: number;          // 42
  exported: boolean;     // true
  parameters?: string;   // '(user: User, password: string)'
  metadata?: Record<string, unknown>;
}
```

**DependencyGraph (Analyzer Output):**
```typescript
{
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  edgesBySource: Map<string, GraphEdge[]>;
  edgesByTarget: Map<string, GraphEdge[]>;
}
```

**AnalysisResult (Full Analysis Output):**
```typescript
{
  graph: DependencyGraph;
  statistics: {
    nodeCount: number;
    edgeCount: number;
    edgesByType: Record<string, number>;
    densityRatio: number;
    avgInDegree: number;
    avgOutDegree: number;
    circularity: number;
  };
  circularDependencies: CircularDependency[];
  isolatedNodes: GraphNode[];
  analysisTime: number;
}
```

---

## 14. Diagrams (Illustrative)

**Architecture Diagram:**

```
┌─────────────────────────────────────────────┐
│          @coderef/core Package              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐      ┌─────────────┐      │
│  │   Scanner   │──┬──▶│  Analyzer   │      │
│  └─────────────┘  │   └─────────────┘      │
│       │           │         │               │
│       │           │         ▼               │
│       │           │   ┌─────────────┐       │
│       │           └──▶│   Context   │       │
│       │               └─────────────┘       │
│       │                     │               │
│       ▼                     ▼               │
│  ┌─────────────┐      ┌─────────────┐      │
│  │   Parser    │      │    Query    │      │
│  └─────────────┘      └─────────────┘      │
│       │                     │               │
│       ▼                     ▼               │
│  ┌─────────────┐      ┌─────────────┐      │
│  │  Validator  │      │   Export    │      │
│  └─────────────┘      └─────────────┘      │
│                                             │
│            ┌─────────────┐                  │
│            │ Integration │                  │
│            │  (RAG/AI)   │                  │
│            └─────────────┘                  │
└─────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
   @coderef/cli    coderef-context  coderef-workflow
                      MCP Server      MCP Server
```

**Data Flow Diagram:**

```
Source Files
    │
    ├─ Regex Scan ──────▶ ElementData[]
    │
    ├─ AST Scan ────────▶ ElementData[] + ElementMap
    │                           │
    │                           ▼
    │                     GraphBuilder
    │                           │
    │                           ├─ ImportParser ──▶ ImportEdge[]
    │                           ├─ CallDetector ──▶ CallEdge[]
    │                           │
    │                           ▼
    │                     DependencyGraph
    │                           │
    │                           ├─▶ QueryExecutor ──▶ QueryResult
    │                           ├─▶ ImpactSimulator ▶ BlastRadius
    │                           ├─▶ GraphExporter ──▶ JSON/Protobuf
    │                           │
    └───────────────────────────┴─▶ ContextGenerator ▶ Markdown/JSON
```

> **Note:** Diagrams are **illustrative** and simplified. State tables and API contracts in sections 2-6 define authoritative behavior.

---

## 15. Versioning & Breaking Changes

**Current Version:** 2.0.0

**Semantic Versioning Policy:**
- **Major (x.0.0):** Breaking API changes, graph format changes
- **Minor (0.x.0):** New features, backward-compatible
- **Patch (0.0.x):** Bug fixes only

**Breaking Changes in 2.0.0 (from 1.x):**
1. AST scanner now default (was regex)
2. GraphNode.id format changed from `elementName` to `file:elementName`
3. QueryType enum renamed (e.g., `calls` → `what-calls`)
4. ImpactSimulator cache never expires (was 10 min TTL)

**Migration Guide:** See `MIGRATION.md` (if exists) or commit history at `5545675`

---

## Conclusion

This document defines the **architectural contracts** and **behavioral specifications** for @coderef/core. Use this as the authoritative reference when:

- **Refactoring modules:** Ensure you don't break state ownership contracts (Section 2)
- **Adding features:** Verify they align with non-goals (Section 10)
- **Debugging issues:** Check common pitfalls (Section 11)
- **Integrating externally:** Follow data contracts (Section 13.3)

**Maintenance Expectations:**
- Update Section 2 when state ownership changes
- Update Section 6 if events/callbacks added
- Update Section 11 when new pitfalls discovered
- Increment version in Section 15 on breaking changes

**For Agents:** This resource sheet provides complete context for safe modification of @coderef/core. Always consult state ownership (Section 2) and API contracts (Section 12) before proposing changes.

---

**Document Maintained By:** CodeRef System v2.0
**Last Verified:** 2026-01-03
**Source of Truth:** This markdown file + TypeScript source code
**Contact:** See CLAUDE.md for context or raise issue in codebase
