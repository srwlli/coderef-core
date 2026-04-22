# @coderef/core

> Core scanning and analysis library for the CodeRef Dashboard ecosystem

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

**@coderef/core** is a powerful TypeScript library that provides code scanning, dependency analysis, and intelligent context generation for software projects. It serves as the foundational layer for the CodeRef Dashboard, enabling deep code understanding through AST-based parsing and relationship detection.

### Key Features

- **🔍 Multi-Language Scanner** - AST-based Python parsing via tree-sitter + regex-based detection for TypeScript, JavaScript, Go, Rust, Java, C#, PHP, and more
- **🛣️ API Route Detection** - Automatic detection of Flask, FastAPI, Express, and Next.js API routes with method extraction
- **📊 Dependency Analysis** - Build comprehensive dependency graphs with import/export/call relationship tracking
- **🧠 Intelligent Context** - Generate rich codebase context for AI-powered workflows and documentation
- **📁 File Generation** - Automated creation of 17 analysis files (index, routes, context, diagrams, patterns, coverage, drift)
- **🔗 Graph Queries** - Query codebase relationships (what-calls, what-imports, shortest-path, impact analysis)
- **⚡ Performance** - In-process TypeScript scanning (3-6x faster than subprocess alternatives)
- **🎯 Type-Safe** - Complete TypeScript definitions with 26 type designators and validation

### Use Cases

- **Dashboard Integration** - Powers the CodeRef Dashboard UI scanner with real-time code analysis
- **CI/CD Pipelines** - Automated code quality checks and dependency validation
- **API Documentation** - Extract and catalog API endpoints across Flask, FastAPI, Express, and Next.js projects
- **Migration Planning** - Map routes for framework migrations (e.g., Flask → Next.js)
- **AI Workflows** - Provide rich context for LLM-based code assistance (RAG, embeddings, prompts)
- **Codebase Navigation** - Fast element search and relationship traversal

---

## Installation

```bash
npm install @coderef/core
```

**Requirements:**
- Node.js 16+
- TypeScript 5.0+ (for TypeScript projects)

---

## Quick Start

### Basic Scanning

```typescript
import { scanCurrentElements } from '@coderef/core';

// Scan TypeScript files in a directory
const elements = await scanCurrentElements('./src', 'ts', {
  recursive: true,
  exclude: ['**/node_modules/**', '**/dist/**']
});

console.log(`Found ${elements.length} code elements`);
// Output: Found 541 code elements

// Access element details
elements.forEach(el => {
  console.log(`${el.type}: ${el.name} (${el.file}:${el.line})`);
});
```

### Generate Output Files

```typescript
import { saveIndex, generateContext, buildDependencyGraph } from '@coderef/core';

// Scan and save to .coderef/index.json
const elements = await scanCurrentElements('./src', ['ts', 'tsx']);
await saveIndex('./my-project', elements);

// Generate context files (.coderef/context.json + context.md)
await generateContext('./my-project', elements);

// Build dependency graph (.coderef/graph.json)
const graph = await buildDependencyGraph('./my-project', elements);
```

### Dependency Analysis

```typescript
import { AnalyzerService } from '@coderef/core';

// Create analyzer for project
const analyzer = new AnalyzerService('./my-project');

// Analyze codebase
const result = await analyzer.analyze(['src/**/*.ts']);

console.log(`Nodes: ${result.statistics.nodeCount}`);
console.log(`Edges: ${result.statistics.edgeCount}`);
console.log(`Circular dependencies: ${result.circularDependencies.length}`);

// Query relationships
const callers = await analyzer.queryRelationships('scanCurrentElements', 'calls-me');
console.log('Functions that call scanCurrentElements:', callers);
```

---

## Core Modules

### 1. Scanner (`scanner/scanner.ts`)

AST-based Python parsing (tree-sitter) + regex-based extraction for TypeScript, JavaScript, Go, Rust, Java, C#, PHP:

```typescript
import { scanCurrentElements, LANGUAGE_PATTERNS } from '@coderef/core';

// Scan multiple languages
const elements = await scanCurrentElements('./src', ['ts', 'tsx', 'js', 'jsx'], {
  recursive: true,
  exclude: ['**/*.test.ts']
});

// Access language-specific patterns
const tsPatterns = LANGUAGE_PATTERNS.ts; // TypeScript patterns
const pyPatterns = LANGUAGE_PATTERNS.py; // Python patterns
```


> **Python Scanner Quality:** AST-based parsing with tree-sitter delivers 100%% accuracy across 6 quality dimensions: element classification, export detection, test coverage linkage, async pattern detection, context summary precision, and testGaps filtering. See `autoresearch/scanner-quality/BASELINES.md` for full campaign results.

**Supported Types:** functions, classes, components, hooks, methods, constants, interfaces

### 2. API Route Detection (`analyzer/route-parsers.ts`)

Multi-framework API route detection for Flask, FastAPI, Express, and Next.js:

```typescript
import { scanCurrentElements } from '@coderef/core';
import { generateRoutes } from '@coderef/core/generator';

// Scan codebase and detect routes
const elements = await scanCurrentElements('./project', ['py', 'js', 'ts']);
const routes = generateRoutes(elements, './project');

console.log(`Found ${routes.totalRoutes} API routes`);
// Output: Found 15 API routes

// Routes grouped by framework
console.log(routes.byFramework.flask);    // Flask routes
console.log(routes.byFramework.fastapi);  // FastAPI routes
console.log(routes.byFramework.express);  // Express routes
console.log(routes.byFramework.nextjs);   // Next.js App Router routes
```

**Supported Frameworks:**
- **Flask**: `@app.route()`, `@blueprint.route()`
- **FastAPI**: `@app.get()`, `@app.post()`, etc.
- **Express**: `app.get()`, `router.post()`, etc.
- **Next.js**: App Router file-based routing (`app/api/*/route.ts`)

**Output:** `.coderef/routes.json` with grouped route inventory

📖 **[Full Route Detection Guide](docs/ROUTE-DETECTION.md)**

### 3. Route Validation (`validator/`)

Validate frontend API calls against server routes to detect mismatches and prevent runtime errors:

```typescript
import {
  saveFrontendCalls,
  generateValidationReport,
  generateMarkdownReport
} from '@coderef/core';

// Step 1: Generate frontend-calls.json by scanning project
await saveFrontendCalls('./my-project');
// Creates: .coderef/frontend-calls.json

// Step 2: Validate against server routes
const report = await generateValidationReport(
  './.coderef/frontend-calls.json',
  './.coderef/routes.json'  // Generated by saveIndex()
);

console.log(`Frontend Calls: ${report.totalFrontendCalls}`);
console.log(`Server Routes: ${report.totalServerRoutes}`);
console.log(`Matched: ${report.matchedRoutes}`);
console.log(`Critical Issues: ${report.summary.critical}`);

// Generate markdown report with auto-fix suggestions
const markdown = generateMarkdownReport(report);
```

**Detection Capabilities:**
- **Missing Routes**: Frontend calls with no matching server route (404 errors)
- **Unused Routes**: Server routes never called by frontend (dead code)
- **Method Mismatches**: HTTP method conflicts (405 errors)
- **Multi-Framework**: Works across Flask, FastAPI, Express, Next.js

**CLI Usage:**
```bash
# Step 1: Scan frontend for API calls (generates .coderef/frontend-calls.json)
npx scan-frontend-calls --project-dir ./my-project

# Step 2: Validate routes (requires both frontend-calls.json and routes.json)
npx validate-routes --project-dir ./my-project

# Complete workflow in CI/CD
npx scan-frontend-calls && npx validate-routes --fail-on-critical

# Custom output paths
npx scan-frontend-calls --output ./reports/calls.json
npx validate-routes --project-dir ./my-project --output ./reports/validation.md

# Scan only specific file types
npx scan-frontend-calls --extensions .ts,.tsx
```

**Output Files:**
- `.coderef/route-validation.json` - Structured validation results
- `.coderef/route-validation-report.md` - Human-readable report with fix suggestions

📖 **[Full Route Validation Guide](docs/ROUTE-VALIDATION.md)**

---

### 4. Migration Validation (`validator/migration-mapper.ts`)

Validate API migrations (v1→v2, Flask→FastAPI, monolith→microservices) with automatic path transformation and coverage tracking:

```typescript
import { validateMigration } from '@coderef/core';

// Validate migration from old to new API
const report = await validateMigration(
  './.coderef/frontend-calls.json',
  './.coderef/routes-old.json',
  './.coderef/routes-new.json',
  './migration-config.json'
);

console.log(`Migration Coverage: ${report.migration.coverage.coverage}%`);
console.log(`Unmapped Calls: ${report.migration.unmapped.length}`);
console.log(`Deprecated Calls: ${report.migration.deprecated.length}`);
```

**Migration Config Example** (`migration-v1-to-v2.json`):
```json
{
  "version": "1.0.0",
  "name": "API v1 to v2 Migration",
  "mappings": {
    "paths": {
      "/api/upload": "/api/v2/files/upload"
    },
    "patterns": [
      { "find": "^/api/v1/(.*)", "replace": "/api/v2/$1" }
    ],
    "deprecated": ["/api/legacy/upload"],
    "added": ["/api/v2/webhooks", "/api/v2/health"]
  },
  "metadata": {
    "source": "API v1",
    "target": "API v2",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Key Features:**
- **Path Transformation**: Map old routes to new routes (explicit + regex patterns)
- **Coverage Metrics**: Calculate migration completeness (% of routes migrated)
- **Confidence Scoring**: Track transformation quality (explicit=100%, pattern=80%)
- **Unmapped Detection**: Find frontend calls with no migration rule
- **Deprecated Tracking**: Identify calls to deprecated routes
- **Multi-Framework**: Flask, FastAPI, Express, Next.js normalization

**Common Migration Scenarios:**
- API version upgrades (`/api/v1/*` → `/api/v2/*`)
- Framework migrations (Flask → FastAPI, Express → Next.js)
- Architecture changes (Monolith → Microservices)
- Parameter syntax conversion (`/users/<int:id>` → `/users/{id}`)

📖 **[Full Migration Validation Guide](docs/MIGRATION-VALIDATION.md)**

---

### 5. Analyzer (`analyzer/analyzer-service.ts`)

AST-based dependency graph building and relationship queries:

```typescript
import { AnalyzerService } from '@coderef/core';

const analyzer = new AnalyzerService('./project-root');

// Build dependency graph
const result = await analyzer.analyze(['src/**/*.ts']);

// Find what calls a function
const callers = await analyzer.queryRelationships('myFunction', 'calls-me');

// Find what a function calls
const callees = await analyzer.queryRelationships('myFunction', 'calls');

// Find circular dependencies
console.log('Circular deps:', result.circularDependencies);
```

### 5. File Generation (`fileGeneration/`)

Generate 17 analysis files organized in 3 phases:

**Phase 1 - Core Files:**
```typescript
import { saveIndex, generateContext, buildDependencyGraph } from '@coderef/core';

await saveIndex(projectPath, elements);          // .coderef/index.json + routes.json (NEW)
await generateContext(projectPath, elements);    // .coderef/context.{json,md}
await buildDependencyGraph(projectPath, elements); // .coderef/graph.json
```

> **Note:** `saveIndex()` now automatically generates `.coderef/routes.json` with detected API routes from Flask, FastAPI, Express, and Next.js projects.

**Phase 2 - Analysis Reports:**
```typescript
import { detectPatterns, analyzeCoverage, validateReferences, detectDrift } from '@coderef/core';

await detectPatterns(projectPath, elements);     // .coderef/reports/patterns.json
await analyzeCoverage(projectPath, elements);    // .coderef/reports/coverage.json
await validateReferences(projectPath, elements); // .coderef/reports/validation.json
await detectDrift(projectPath, elements);        // .coderef/reports/drift.json
```

**Phase 3 - Diagrams:**
```typescript
import { generateDiagrams } from '@coderef/core';

await generateDiagrams(projectPath, elements);
// .coderef/diagrams/dependencies.mmd
// .coderef/diagrams/dependencies.dot
// .coderef/diagrams/calls.mmd
// .coderef/diagrams/imports.mmd
```

### 6. Query Engine (`query/query-executor.ts`)

Execute complex codebase queries:

```typescript
import { QueryExecutor } from '@coderef/core';

const executor = new QueryExecutor(elements);

// Find all functions in a file
const functions = executor.findByFile('src/scanner/scanner.ts', 'function');

// Find all React components
const components = executor.findByType('component');

// Search by name pattern
const testFiles = executor.search('*.test.ts');
```

### 7. Type System (`types/types.d.ts`)

26 type designators with validation and priorities:

```typescript
import { TypeDesignator, isValidTypeDesignator, getTypeMetadata } from '@coderef/core';

// Validate types
isValidTypeDesignator('Fn');  // true
isValidTypeDesignator('XYZ'); // false

// Get metadata
const meta = getTypeMetadata('C'); // Component metadata
console.log(meta.priority); // "High"
console.log(meta.description); // "React/Vue component"
```

---

## API Reference

See **[API.md](coderef/foundation-docs/API.md)** for complete API documentation.

### Main Exports

| Export | Type | Description |
|--------|------|-------------|
| `scanCurrentElements` | Function | Scan code elements from directory |
| `LANGUAGE_PATTERNS` | Object | Pattern definitions by language |
| `AnalyzerService` | Class | Dependency analysis orchestrator |
| `saveIndex` | Function | Save scan results to JSON |
| `generateContext` | Function | Generate context files |
| `buildDependencyGraph` | Function | Build dependency graph |
| `detectPatterns` | Function | Detect code patterns (handlers, API, tests) |
| `analyzeCoverage` | Function | Analyze test coverage |
| `validateReferences` | Function | Validate references and imports |
| `detectDrift` | Function | Detect changes since last scan |
| `generateDiagrams` | Function | Generate Mermaid/Graphviz diagrams |
| `QueryExecutor` | Class | Execute codebase queries |
| `TypeDesignator` | Enum | 26 type designators |
| `generateValidationReport` | Function | Validate frontend calls vs server routes |
| `generateMarkdownReport` | Function | Generate validation report with fix suggestions |
| `normalizeRoutePath` | Function | Normalize routes across frameworks |
| `calculateMatchConfidence` | Function | Calculate route match confidence score |

---

## Architecture

See **[ARCHITECTURE.md](coderef/foundation-docs/ARCHITECTURE.md)** for detailed system design.

### High-Level Overview

```
┌─────────────────────────────────────────────────┐
│         CodeRef Core Library                    │
├─────────────────────────────────────────────────┤
│  Scanner Module                                 │
│  ├── AST-based Python parsing (tree-sitter)      │
│  ├── Multi-language support (8+ languages)     │
│  └── File traversal with glob patterns         │
├─────────────────────────────────────────────────┤
│  Analyzer Module                                │
│  ├── AST parsing (via acorn)                   │
│  ├── Import/export detection                   │
│  ├── Function call detection                   │
│  ├── Dependency graph building                 │
│  └── Circular dependency detection             │
├─────────────────────────────────────────────────┤
│  File Generation Module                         │
│  ├── Phase 1: Core files (index, context, graph)│
│  ├── Phase 2: Reports (patterns, coverage, etc)│
│  └── Phase 3: Diagrams (Mermaid, Graphviz)     │
├─────────────────────────────────────────────────┤
│  Query Module                                   │
│  ├── Element search and filtering              │
│  ├── Relationship queries (calls, imports)     │
│  └── Path finding (shortest-path, impact)      │
├─────────────────────────────────────────────────┤
│  Integration Module                             │
│  ├── RAG (Retrieval-Augmented Generation)      │
│  ├── Vector stores (Pinecone, Chroma, SQLite)  │
│  ├── LLM providers (OpenAI, Anthropic)         │
│  └── AI prompt generation                      │
└─────────────────────────────────────────────────┘
```

---

## Data Models

See **[SCHEMA.md](coderef/foundation-docs/SCHEMA.md)** for complete data schemas.

### Core Types

**ElementData** - Represents a code element:
```typescript
interface ElementData {
  id: string;           // Unique identifier
  name: string;         // Element name
  type: string;         // Type (function, class, component, etc)
  file: string;         // Source file path
  line: number;         // Line number
  hash: string;         // Content hash (SHA256)
  dependencies?: string[]; // Import/call dependencies
  metadata?: Record<string, any>; // Additional metadata
}
```

**DependencyGraph** - Graph structure:
```typescript
interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

interface GraphNode {
  id: string;
  type: string;
  file: string;
  line?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'import' | 'export' | 'call';
}
```

---

## Performance

### Benchmarks (541 elements, TypeScript project)

| Operation | Time | Notes |
|-----------|------|-------|
| Scan (Python AST + regex) | ~1185ms | Multi-file recursive scan |
| File generation (16 files) | ~200ms | Parallel execution |
| Dependency graph | ~150ms | AST parsing + relationship detection |
| Query (element lookup) | <1ms | In-memory map lookup |

**Performance Tips:**
- ✅ Use `recursive: true` to scan entire directories efficiently
- ✅ Exclude node_modules and dist with glob patterns
- ✅ Leverage caching via `useCache: true` in AnalyzerService
- ✅ Run file generation in parallel (Phase 2 uses Promise.all)

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

**Test Coverage:**
- Scanner: 95%+ (Python AST, regex patterns, file traversal, multi-language)
- Analyzer: 90%+ (graph building, circular deps, queries)
- File Generation: 85%+ (all 8 functions covered)
- Query Engine: 90%+ (search, filter, relationship queries)

---

## Integration Examples

### Next.js API Route

```typescript
// app/api/scanner/scan/route.ts
import { scanCurrentElements, saveIndex } from '@coderef/core';

export async function POST(request: Request) {
  const { projectPath } = await request.json();

  // Scan project
  const elements = await scanCurrentElements(projectPath, ['ts', 'tsx'], {
    recursive: true,
    exclude: ['**/node_modules/**']
  });

  // Save to .coderef/index.json
  await saveIndex(projectPath, elements);

  return Response.json({
    success: true,
    count: elements.length
  });
}
```

### CLI Tool

```typescript
#!/usr/bin/env node
import { scanCurrentElements, generateContext } from '@coderef/core';

const projectPath = process.argv[2] || process.cwd();

console.log(`Scanning ${projectPath}...`);

const elements = await scanCurrentElements(projectPath, ['ts', 'tsx', 'js', 'jsx']);
await generateContext(projectPath, elements);

console.log(`✓ Generated context for ${elements.length} elements`);
```

### Dashboard Integration

```typescript
// Dashboard UI component
import { scanCurrentElements } from '@coderef/core';

async function handleScan(projectPath: string) {
  const elements = await scanCurrentElements(projectPath, ['ts', 'tsx']);

  console.log(`Scanned ${elements.length} elements`);

  // Display in UI
  setElements(elements);
}
```

---

## Configuration

### Scan Options

```typescript
interface ScanOptions {
  recursive?: boolean;          // Traverse subdirectories (default: true)
  exclude?: string[];           // Exclude patterns (glob)
  include?: string[];           // Include patterns (glob)
  maxDepth?: number;            // Max directory depth
  followSymlinks?: boolean;     // Follow symbolic links (default: false)
}
```

### Example Configuration

```typescript
const options: ScanOptions = {
  recursive: true,
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  maxDepth: 10
};

const elements = await scanCurrentElements('./src', 'ts', options);
```

---

## Troubleshooting

### Common Issues

**Q: Scanning returns 0 elements**
- ✅ Check file extensions match language patterns
- ✅ Verify directory path is correct (absolute vs relative)
- ✅ Review exclude patterns (might be too aggressive)

**Q: File generation fails with ENOENT**
- ✅ Ensure `.coderef/` directory exists (run `mkdir -p .coderef`)
- ✅ Check write permissions on project directory
- ✅ Verify projectPath is absolute path

**Q: Dependency graph has missing edges**
- ✅ Ensure all source files are included in scan
- ✅ Check import/export syntax is standard (no dynamic requires)
- ✅ Verify TypeScript/JavaScript parser can handle syntax

**Q: Performance is slow**
- ✅ Exclude large directories (node_modules, dist, build)
- ✅ Use caching (`useCache: true`)
- ✅ Limit file patterns to relevant extensions

**Q: MCP tools timeout or hang**
- ✅ Check file sizes in `.coderef/` (50MB limit enforced)
- ✅ Verify JSON files are valid (not corrupted)
- ✅ Ensure network filesystems are responsive
- ✅ File reads timeout after 30s, JSON parse after 30s

---

## Roadmap

### v2.1.0 (Q1 2026)
- [ ] Add C++ and Ruby language support
- [ ] Incremental scanning (track file changes)
- [ ] Performance optimizations (parallel file reading)
- [ ] Enhanced TypeScript AST parsing (decorators, generics)

### v2.2.0 (Q2 2026)
- [ ] Real-time watch mode (auto-rescan on file changes)
- [ ] Plugin system for custom analyzers
- [ ] Web worker support for browser environments
- [ ] Enhanced diagram generation (D3.js, PlantUML)

### v3.0.0 (Q3 2026) ✅ RELEASED
- [x] Enhanced Python AST parsing (tree-sitter) + 6-loop quality campaign (element classification, export accuracy, test coverage, async detection, context precision, testGaps filtering)
- [x] **Timeout Protection** - File I/O timeout guards (30s) and file size limits (50MB) prevent MCP tool hanging
- [ ] Enhanced RAG integration (embeddings, semantic search)
- [ ] Multi-repo analysis (monorepo support)
- [ ] GraphQL API for remote scanning

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Areas for Contribution:**
- 🌐 Add new language patterns (C++, Ruby, Swift, Kotlin)
- 🧪 Improve test coverage (integration tests, edge cases)
- 📚 Enhance documentation (examples, tutorials)
- ⚡ Performance optimizations (parallel scanning, caching)
- 🐛 Bug fixes and edge case handling

---

## License

MIT © CodeRef Team

---

## Comparables

How @coderef/core compares to existing code intelligence tools:

### CodeQL
**Graph-based semantic analysis (GitHub)**
- Builds deep code graphs with type-flow and data-flow
- Used for security auditing and large-scale refactors
- Comparison: CodeQL is deeper and more precise; @coderef/core is faster and more practical for AI workflows
- Think: *"CodeQL Lite + AI layer"*

### Semgrep
**Pattern-based static analysis**
- Fast, CI-friendly, multi-language rule engine
- Mature ecosystem with registry of rules
- Comparison: Semgrep has better rule engine; @coderef/core wins on relationship graphs + AI context generation

### Sourcegraph
**Code search and navigation platform**
- Polished UI with Cody AI integration
- Strong cross-repository search
- Comparison: Sourcegraph is a UI platform; @coderef/core is a backend engine with deeper structural outputs

### tree-sitter
**Parser generator for ASTs**
- Precise incremental parsing across languages
- Used by GitHub, Neovim, and others
- Comparison: @coderef/core uses tree-sitter for Python; expanding to all languages (see IMP-CORE-052)

### LangChain / RAG Tools
**AI orchestration frameworks**
- Handle embeddings, retrieval, prompt chains
- Comparison: LangChain is downstream orchestration; @coderef/core is upstream structured context/data source

### CodeSee
**Codebase mapping and visualization**
- Visualizes dependencies, maps routes, impact analysis
- Platform-based solution with web UI
- Comparison: Similar codebase mapping goals; @coderef/core is programmatic library vs platform

### Dependency-Cruiser
**Dependency graph visualization**
- Excellent for circular dependency detection
- Enforces architectural rules via regex/JS
- Comparison: Strong dependency analysis; @coderef/core adds AI-context generation and cross-language API route parsing

### Sourcery
**Code quality and AI-driven refactoring**
- Focuses on code quality, refactoring suggestions
- Handles intelligent context for code improvements
- Comparison: Similar AI-context focus; @coderef/core emphasizes structural repo scanning vs individual code suggestions

### ts-morph
**TypeScript AST manipulation library**
- Full TypeScript compiler API access for refactoring and analysis
- Accurate type information and symbol resolution
- Comparison: ts-morph has deeper TypeScript AST access; @coderef/core uses regex for TS/JS (faster but less accurate for complex patterns)
- See: IMP-CORE-052 for planned tree-sitter expansion to match ts-morph depth

### madge
**Dependency graph generator for JavaScript/TypeScript**
- Circular dependency detection
- AMD, CommonJS, ES6 module support
- Comparison: Madge focuses on import graphs; @coderef/core adds cross-language support, route detection, and AI context generation

### ESLint + OpenAPI Diff
**Linting + API contract validation**
- ESLint: static analysis for code quality
- OpenAPI Diff: API contract change detection
- Comparison: Fragmented toolchain (ESLint for code, OpenAPI for contracts); @coderef/core provides unified analysis with relationship mapping

### When to Choose @coderef/core
- Need **API route validation** (frontend ↔ backend) - rare in other tools
- Building **migration tooling** with automated validation
- Creating **AI-native developer workflows** with structured context
- Want **fast, in-process analysis** without heavy infrastructure

---

## Resources

- **[API Documentation](coderef/foundation-docs/API.md)** - Complete API reference
- **[Architecture Guide](coderef/foundation-docs/ARCHITECTURE.md)** - System design and patterns
- **[Schema Reference](coderef/foundation-docs/SCHEMA.md)** - Data models and types
- **[CLAUDE.md](CLAUDE.md)** - AI development context
- **[Dashboard Integration](../../README.md)** - CodeRef Dashboard documentation

---

## Support

- 📧 Email: support@coderef.dev
- 💬 Discord: [Join our community](https://discord.gg/coderef)
- 🐛 Issues: [GitHub Issues](https://github.com/coderef/core/issues)
- 📖 Docs: [Official Documentation](https://docs.coderef.dev)

---

**Built with ❤️ by the CodeRef Team**
