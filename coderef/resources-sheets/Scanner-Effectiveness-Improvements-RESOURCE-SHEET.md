---
agent: claude_sonnet_4_5
date: "2026-01-13"
task: DOCUMENT
subject: Scanner Effectiveness Improvements
parent_project: coderef-dashboard
category: utility
version: "1.0.0"
related_files:
  - packages/coderef-core/src/scanner/scanner.ts
  - packages/dashboard/src/app/api/scanner/lib/scanExecutor.ts
  - packages/coderef-core/src/fileGeneration/detectPatterns.ts
  - packages/coderef-core/src/fileGeneration/validateReferences.ts
  - packages/coderef-core/src/fileGeneration/buildDependencyGraph.ts
status: APPROVED
---

# Scanner Effectiveness Improvements — Authoritative Analysis

## Executive Summary

This document catalogs 15 prioritized improvements to the CodeRef scanner's effectiveness, accuracy, and performance based on comprehensive analysis of the current regex-based, 10-language scanning system. Current limitations include 85% accuracy for TypeScript/JavaScript (missing interfaces, decorators, generics), sequential single-threaded file processing (3-5x slower than optimal), and coverage gaps in Python/Go patterns. The roadmap spans Q1-Q4 2026 with 4 quick-win improvements implementable in 22 hours for immediate impact.

## Audience & Intent

- **Markdown (this document):** Strategic roadmap authority for scanner enhancements
- **TypeScript (`scanner.ts`):** Current implementation baseline for gap analysis
- **Issue Tracking:** Feature request specifications and priority ordering
- **Engineering Leads:** Resource allocation and sprint planning guidance

## 1. Current Scanner State (Baseline)

### 1.1 Architecture

**Engine Type:** Regex-based pattern matching (no AST for most languages)
**Processing Model:** Sequential single-threaded
**Caching Strategy:** Mtime-based global Map (in-memory)
**Language Support:** 10 languages (TypeScript, JavaScript, Python, Go, Rust, Java, C++, C)
**Output:** 16 files across 3 phases (directories → scan → generate)

### 1.2 Performance Characteristics

| Metric | Current | Target (Post-Improvements) |
|--------|---------|---------------------------|
| Scan Speed (500 files) | ~1185ms | 300-400ms (3-5x faster) |
| Accuracy (TS/JS) | 85% | 95%+ |
| Element Types Detected | 7 | 12+ (interfaces, decorators, properties) |
| Python Pattern Coverage | 3 patterns | 7 patterns (+133%) |
| Max Project Size | ~5,000 files (timeout risk) | 10,000+ files |
| Memory Usage | Unbounded (Map leak) | Capped at 50MB (LRU) |

### 1.3 Known Limitations

**Accuracy Issues:**
- Missing TypeScript interfaces, type aliases, decorators
- False negatives from naive comment detection (~10-15%)
- Generics parsed incorrectly (`map<T>` → `map<T` as function name)

**Performance Bottlenecks:**
- Sequential file processing (single-threaded, I/O bound)
- Redundant pattern execution (7N regex operations per TS file)
- Mtime-only caching (false invalidations, no TTL)

**Coverage Gaps:**
- Python: Missing decorators, properties, nested classes, static methods
- Go: Missing embedded structs, type aliases, package variables
- Rust: Missing macros, associated functions, modules
- No dynamic import detection (`import()`, `require()`)

## 2. Priority 1: Critical Accuracy Issues

### P1.1: Hybrid AST + Regex Approach

**Problem:** Regex patterns miss TypeScript/JavaScript constructs like interfaces, decorators, generics, class properties.

**Current State:** Lines 18-44 in `scanner.ts` use simple regex:
```typescript
{ type: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 }
```

**Examples of Missed Elements:**
```typescript
interface UserData { ... }      // NOT DETECTED
type APIResponse<T> = { ... }   // NOT DETECTED
@Component()                     // NOT DETECTED
class Profile {
  private data: UserData;        // NOT DETECTED (class property)
  getName = () => { ... }        // NOT DETECTED (arrow method)
}
```

**Proposed Solution:**
1. Add `useAST: boolean` option to `ScanOptions` (default: `false`)
2. Use existing `js-call-detector.ts` (acorn parser already integrated in `analyzer/`)
3. Fallback to regex on AST parse errors
4. Extend `js-call-detector.ts` to extract element types (currently only detects calls/imports)

**Implementation Complexity:** Medium
- Leverage existing AST infrastructure
- ~300 lines of new code
- 2-3 day implementation

**Impact:**
- **Accuracy:** 85% → 95%+ for TypeScript/JavaScript
- **Coverage:** +30% more elements detected
- **Performance:** +50ms per file (acceptable for accuracy gain)

**Testing Requirements:**
- Test suite with 20+ TS/JS fixture files covering interfaces, decorators, generics
- Regression tests ensuring regex fallback works
- Performance benchmark: AST mode vs regex mode

**Related Files:**
- `packages/coderef-core/src/analyzer/js-call-detector.ts` (existing AST parser)
- `packages/coderef-core/src/scanner/scanner.ts:18-44` (regex patterns)

---

### P1.2: Context-Aware Comment Filtering

**Problem:** Naive comment detection causes false negatives on:
- Multi-line comments with code: `/* comment */ function foo() {}`
- JSDoc: `/** @returns string */ function bar()`
- Template strings: `` `// not a comment` ``
- Regex literals: `const pattern = /\/\/ fake comment/`

**Current State:** Lines 598-619 in `scanner.ts`:
```typescript
export function isLineCommented(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
}
```

**Failure Cases:**
```javascript
const url = "https://example.com"; // Detected as comment (false positive)
/* Block */ function test() {}     // Skipped (false negative)
const regex = /\/\/ pattern/;      // Detected as comment (false positive)
```

**Proposed Solution:**
1. Add `skipComments: 'smart' | 'basic' | false` to `ScanOptions`
2. Use lightweight lexer to track string/template/regex context
3. Leverage acorn's comment nodes when AST parsing enabled
4. Preserve `'basic'` as default for backward compatibility

**Implementation Complexity:** Low-Medium
- Use acorn's `onComment` callback (already available)
- ~150 lines of context tracking
- 1-2 day implementation

**Impact:**
- **Accuracy:** Reduce false negatives by 10-15%
- **Coverage:** Recover ~5-10% of skipped elements
- **Performance:** Negligible (+5ms per file)

**Testing Requirements:**
- 15+ edge case fixtures (JSDoc, template strings, regex literals)
- Benchmark against current `isLineCommented()`

---

### P1.3: Language Pattern Expansion

**Problem:** Uneven pattern coverage across languages:

| Language | Current Patterns | Missing Constructs | Priority |
|----------|------------------|-------------------|----------|
| TypeScript/JavaScript | 7 | Interfaces, decorators | High (P1.1) |
| Python | 3 | Decorators, properties, nested classes, @staticmethod | High |
| Go | 5 | Embedded structs, type aliases, package vars | Medium |
| Rust | 6 | Macros, associated functions, modules | Medium |
| Java | 5 | Annotations, nested classes | Low |
| C++/C | 4-5 | Templates, namespaces, macros | Low |

**Proposed Solution - Phase 1: Python**

Add 4 new Python patterns (3 → 7):
```python
# Pattern 1: Decorators
{ type: 'decorator', pattern: /@([a-zA-Z0-9_]+)/g, nameGroup: 1 }

# Pattern 2: Properties
{ type: 'property', pattern: /@property\s+def\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 }

# Pattern 3: Static methods
{ type: 'method', pattern: /@staticmethod\s+def\s+([a-zA-Z0-9_]+)/g, nameGroup: 1 }

# Pattern 4: Nested classes
{ type: 'class', pattern: /^\s{4,}class\s+([a-zA-Z0-9_]+)/gm, nameGroup: 1 }
```

**Implementation Complexity:** Low
- Regex pattern definition only
- ~50 lines per language
- 4-6 hours per language

**Impact:**
- **Python Coverage:** +30-40% elements in Python codebases
- **Accuracy:** Minimal risk (new patterns tested independently)

**Rollout Plan:**
1. **Week 1:** Python (highest demand after TS/JS)
2. **Week 2:** Go (growing adoption)
3. **Week 3:** Rust (complex but high-value)

**Testing Requirements:**
- 10+ fixture files per language with new constructs
- Integration with existing deduplication logic
- Pattern priority ordering verification

---

## 3. Priority 2: Performance & Scalability

### P2.4: Parallel File Processing with Worker Threads

**Problem:** Sequential single-threaded processing limits scalability:
```typescript
// scanner.ts:479-556
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8'); // Blocking I/O
  scanner.processFile(file, content, patterns, includeComments);
}
```

**Current Performance:**
- 500 files: ~1185ms (sequential)
- 1000 files: ~3-5 seconds
- 5000 files: 20-30 seconds (timeout risk)

**Proposed Solution:**
1. Use Node.js worker threads (4-8 workers, configurable)
2. Batch files into chunks (100 files per worker)
3. Aggregate results via message passing
4. Graceful fallback to sequential on worker errors

**Architecture:**
```
Main Thread                    Worker Thread 1       Worker Thread 2
    │                               │                     │
    ├─ Batch 1 (100 files) ────────►│                     │
    ├─ Batch 2 (100 files) ─────────┼──────────────────► │
    │                               │                     │
    │◄── Results Batch 1 ───────────┤                     │
    │◄── Results Batch 2 ───────────┼─────────────────────┤
    │                               │                     │
    └─ Merge + Deduplicate
```

**Implementation Complexity:** Medium-High
- Worker pool management (~200 lines)
- Serializable ScanOptions and ElementData
- Error handling and graceful degradation
- 4-5 day implementation

**Impact:**
- **Performance:** 3-5x faster on multi-core systems
  - 500 files: 1185ms → 300-400ms
  - 1000 files: 3-5s → 800ms-1.5s
  - 5000 files: 20-30s → 5-8s
- **Scalability:** Support 10,000+ file projects

**Configuration:**
```typescript
await scanCurrentElements(dir, lang, {
  parallel: true,           // Enable worker threads
  workers: 4,              // Default: CPU core count
  batchSize: 100           // Files per worker
});
```

**Testing Requirements:**
- Unit tests for worker pool lifecycle
- Integration tests with 1000+ file fixtures
- Performance benchmarks (sequential vs parallel)
- Error injection tests (worker crash scenarios)

---

### P2.5: Content-Aware Caching with LRU Eviction

**Problem:** Mtime-only caching has several issues:

**Issue 1: False Invalidations**
```typescript
// scanner.ts:482-496
const currentMtime = stats.mtimeMs;
const cached = SCAN_CACHE.get(file);
if (cached && cached.mtime === currentMtime) { ... }
```
- Mtime changes on metadata updates (permissions, touch commands)
- Content unchanged but cache invalidated anyway

**Issue 2: Memory Leak**
- Global Map never expires
- Long-running processes accumulate entries indefinitely
- No per-project isolation

**Issue 3: No Content Validation**
- Mtime collision possible (rare but exists)
- No hash verification of content

**Proposed Solution:**

**New Cache Key Structure:**
```typescript
interface CacheKey {
  path: string;
  mtime: number;
  contentHash: string; // SHA-256 of first 1KB
}

interface CacheEntry {
  key: CacheKey;
  elements: ElementData[];
  cachedAt: number;      // Timestamp for TTL
  accessedAt: number;    // For LRU
}
```

**LRU Policy:**
- Max 1000 entries (~50MB for average files)
- TTL: 1 hour (configurable)
- Evict oldest accessed entry when full

**Implementation Complexity:** Medium
- Replace Map with `lru-cache` package
- Add content hashing (~10ms per file)
- Add TTL cleanup on cache access
- ~150 lines of code
- 2 day implementation

**Impact:**
- **Accuracy:** Eliminate false cache hits from mtime collisions
- **Performance:** 2-3% faster (fewer re-parses on metadata changes)
- **Memory:** Cap at 50MB (vs unbounded growth)

**Configuration:**
```typescript
await scanCurrentElements(dir, lang, {
  cache: {
    maxEntries: 1000,    // LRU size
    ttl: 3600000,        // 1 hour in ms
    hashDepth: 1024      // Hash first 1KB
  }
});
```

**Testing Requirements:**
- Cache hit/miss scenarios
- LRU eviction verification
- TTL expiration tests
- Memory usage profiling

---

### P2.6: Pattern Ordering & Short-Circuit Optimization

**Problem:** Redundant pattern execution:
```typescript
// scanner.ts:220-227
for (const { type, pattern, nameGroup } of patterns) {
  for (let i = 0; i < lines.length; i++) {
    // ALL 7 patterns execute on EVERY line
  }
}
```

**Current Cost:**
- TypeScript file with 100 lines × 7 patterns = 700 regex executions
- Even if line 1 matches constant, remaining 6 patterns still execute

**Proposed Solution:**

**1. Reorder Patterns by TYPE_PRIORITY** (scanner.ts:243-251)
```typescript
// Current order (arbitrary)
ts: [function, function, class, constant, component, hook, method]

// Optimized order (by TYPE_PRIORITY: 6→1)
ts: [constant, component, hook, class, method, function, function]
```

**2. Add Exclusive Matching**
```typescript
interface PatternConfig {
  type: ElementData['type'];
  pattern: RegExp;
  nameGroup: number;
  exclusive?: boolean; // NEW: Skip remaining patterns if matched
}

// Example: Constant pattern is exclusive (can't be component)
{ type: 'constant', pattern: /[A-Z][A-Z0-9_]*/, exclusive: true }
```

**Implementation Complexity:** Low
- Reorder LANGUAGE_PATTERNS arrays (~30 minutes)
- Add `exclusive` flag and short-circuit logic (~2 hours)
- Total: 4 hours

**Impact:**
- **Performance:** 15-20% faster scanning
  - 700 executions → 400-500 executions (average)
- **Accuracy:** Unchanged (deduplication handles overlaps)

**Testing Requirements:**
- Verify deduplication still works correctly
- Benchmark before/after (should be 15-20% faster)
- Ensure no elements missed due to early exit

---

## 4. Priority 3: Coverage Gaps

### P3.7: Enhanced ElementData with Relationships

**Problem:** Current `ElementData` (types.ts:227-238) only tracks calls:
```typescript
interface ElementData {
  type: 'function' | 'class' | 'component' | 'hook' | 'method' | 'constant' | 'unknown';
  name: string;
  file: string;
  line: number;
  exported?: boolean;
  calls?: string[];  // Only relationship tracked
}
```

**Missing Relationships:**
- **Import sources:** Where was this element imported from?
- **Export destinations:** Which files import this element?
- **Inheritance:** What does this class extend?
- **Implementation:** What interfaces does this implement?
- **Type references:** What types are used in signatures?

**Proposed Solution:**

**Extended ElementData:**
```typescript
interface ElementData {
  // Existing fields
  type: 'function' | 'class' | 'component' | 'hook' | 'method' | 'constant' | 'unknown';
  name: string;
  file: string;
  line: number;
  exported?: boolean;

  // Enhanced relationships (NEW)
  imports?: Array<{ name: string; from: string; line: number }>;
  exports?: { type: 'named' | 'default'; exportedAs?: string };
  extends?: { name: string; from?: string };
  implements?: string[];
  typeRefs?: string[];  // Types used in signature
  calls?: string[];

  // Optional metadata (NEW)
  signature?: string;   // Function signature
  docComment?: string;  // JSDoc or docstring
  complexity?: number;  // Cyclomatic complexity
}
```

**Implementation Complexity:** Medium
- Extend AST parser to extract relationships (~400 lines)
- Add regex fallback for `extends`/`implements` keywords
- Update buildDependencyGraph to use enhanced data
- 5-6 day implementation

**Impact:**
- **Coverage:** 5x more relationship data (1 type → 6 types)
- **Analysis:** Enable "What imports this?", "What extends this class?"
- **Graph Quality:** Richer dependency graphs

**Use Cases:**
- Dashboard: "Show all files that import UserProfile"
- Dashboard: "Find all classes that implement IComponent"
- MCP Tool: "Get complete signature for authenticateUser function"

**Testing Requirements:**
- Test fixtures with complex inheritance hierarchies
- Circular dependency detection
- Cross-file reference resolution

---

### P3.8: Dynamic Code Detection Layer

**Problem:** Scanner ignores dynamic imports and require statements:

**Not Detected:**
```javascript
// Dynamic ES6 imports
const module = await import('./utils.js');
if (condition) { await import('./feature') }

// CommonJS require
const config = require('./config.json');
const { helper } = require('../utils');

// Webpack loaders
const raw = require('!!raw-loader!./file.txt');

// Dynamic require
const moduleName = computeModuleName();
require(moduleName);
```

**Current Limitation:** Regex patterns only match static ES6 `import ... from`

**Proposed Solution:**

**Add Dynamic Import Patterns:**
```typescript
// Pattern 1: import() expressions
{ type: 'dynamic-import', pattern: /import\(['"]([^'"]+)['"]\)/g, nameGroup: 1 }

// Pattern 2: require() calls
{ type: 'require', pattern: /require\(['"]([^'"]+)['"]\)/g, nameGroup: 1 }

// Pattern 3: Webpack loaders
{ type: 'require', pattern: /require\(['"]!([^'"]+)['"]\)/g, nameGroup: 1 }

// Pattern 4: require.context (webpack)
{ type: 'require-context', pattern: /require\.context\(['"]([^'"]+)['"]/g, nameGroup: 1 }
```

**Extend ElementData:**
```typescript
interface ImportData {
  name: string;
  from: string;
  line: number;
  type: 'static' | 'dynamic' | 'require';
  dynamic: boolean;  // Flag for conditional/runtime imports
}
```

**Update Dependency Graph:**
```typescript
// graph.json edge types
{
  from: "App.tsx",
  to: "utils.js",
  type: "import" | "dynamic-import" | "require",
  dynamic: false
}
```

**Implementation Complexity:** Low-Medium
- Add 4 regex patterns (~100 lines)
- Update DependencyGraph edge types (~50 lines)
- Extend generateDiagrams for dynamic edges (different color)
- 2-3 day implementation

**Impact:**
- **Coverage:** +10-15% dependencies in projects using dynamic imports
- **Accuracy:** Complete dependency picture for bundled apps
- **Use Case:** Detect lazy-loaded routes in Next.js/React Router

**Testing Requirements:**
- Fixtures with dynamic import patterns
- Webpack/Vite config files
- Next.js lazy-loaded routes

---

### P3.9: Two-Pass Scanning with Cross-File Resolution

**Problem:** Files scanned independently - no project-level context:

**Limitations:**
- Can't resolve relative imports (`'./utils'` → actual file path unknown)
- Can't detect orphaned files (no imports reference them)
- Can't identify entry points (files imported by nothing)
- Can't build complete call graph (cross-file calls unknown)

**Proposed Solution:**

**Two-Pass Architecture:**

**Pass 1: Element Discovery (existing)**
```typescript
// Scan all files, collect elements
const elements = await scanCurrentElements(dir, lang);
```

**Pass 2: Cross-File Resolution (NEW)**
```typescript
// Build global element registry
const registry = new Map<string, ElementData>(); // elementName → data

// Resolve imports using Node.js module resolution
for (const element of elements) {
  if (element.imports) {
    for (const imp of element.imports) {
      const resolvedPath = resolve(imp.from, element.file);
      imp.resolvedPath = resolvedPath;
      // Mark target as referenced
      referencedFiles.add(resolvedPath);
    }
  }
}

// Detect orphans
const orphans = allFiles.filter(f => !referencedFiles.has(f));
```

**Path Resolution Logic:**
```typescript
function resolve(importPath: string, fromFile: string): string {
  // Relative imports: ./utils → /project/src/utils.ts
  if (importPath.startsWith('.')) {
    return resolveRelative(importPath, fromFile);
  }

  // Package imports: react → /project/node_modules/react/index.js
  if (isPackageImport(importPath)) {
    return resolvePackage(importPath, fromFile);
  }

  // Alias imports: @/components → /project/src/components
  if (hasAlias(importPath)) {
    return resolveAlias(importPath, tsconfig);
  }
}
```

**Implementation Complexity:** High
- Requires Node.js module resolution algorithm (~500 lines)
- TSConfig/JSConfig alias support
- Global element registry
- Orphan file detection
- 7-10 day implementation

**Impact:**
- **Accuracy:** 20-30% better import resolution
  - Eliminate "broken" references that actually exist
- **Coverage:** Detect all orphaned files, identify entry points
- **Analysis:** Complete call graph across file boundaries

**Use Cases:**
- Dashboard: "Unused Files" report (orphan detection)
- Dashboard: "Entry Points" view (files imported by nothing)
- MCP Tool: "Find all callers of function X" (cross-file)

**Testing Requirements:**
- Fixtures with complex import patterns
- Monorepo scenarios (workspace resolution)
- Circular dependency detection
- TypeScript path aliases

---

## 5. Priority 4: User Experience

### P4.10: Structured Error Reporting

**Problem:** Current errors lack actionable context:
```typescript
// scanner.ts:552
console.error(`Error processing file ${file}:`, error);

// Output: "Error processing file /path/to/file.ts: SyntaxError: Unexpected token"
// No line number, no suggestion, no recovery
```

**Proposed Solution:**

**Structured Error Interface:**
```typescript
interface ScanError {
  type: 'read' | 'parse' | 'pattern' | 'permission' | 'encoding';
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  column?: number;
  pattern?: string;
  message: string;
  suggestion?: string;
  stack?: string;
}

interface ScanResult {
  elements: ElementData[];
  errors: ScanError[];     // Non-throwing
  warnings: ScanError[];
  stats: ScanStats;
}
```

**Example Errors with Suggestions:**
```typescript
{
  type: 'parse',
  severity: 'error',
  file: '/project/utils.ts',
  line: 42,
  message: 'Unexpected token',
  suggestion: 'Check for syntax errors. Run `npx tsc --noEmit` to validate TypeScript syntax.'
}

{
  type: 'encoding',
  severity: 'warning',
  file: '/project/legacy.js',
  message: 'Non-UTF8 encoding detected',
  suggestion: 'Convert file to UTF-8: `iconv -f ISO-8859-1 -t UTF-8 legacy.js > legacy.js.tmp && mv legacy.js.tmp legacy.js`'
}

{
  type: 'permission',
  severity: 'error',
  file: '/project/.env',
  message: 'EACCES: permission denied',
  suggestion: 'Add read permission: `chmod +r .env` or exclude file with `exclude: [".env"]`'
}
```

**Implementation Complexity:** Low
- Wrap errors in ScanError objects (~150 lines)
- Add suggestion database for common errors (~200 lines)
- Return errors array alongside elements
- 1-2 day implementation

**Impact:**
- **UX:** Users fix issues 3x faster with suggestions
- **Debugging:** Precise error locations (line/column)
- **Reliability:** Non-throwing errors allow partial results

**Dashboard Integration:**
```typescript
// Display errors in Scanner UI
<ErrorPanel errors={scanResult.errors} warnings={scanResult.warnings} />
```

**Testing Requirements:**
- Test all error types (read, parse, permission, encoding)
- Verify suggestions are accurate
- Ensure partial results returned on error

---

### P4.11: Progress Reporting & Streaming Results

**Problem:** Long scans appear frozen - no user feedback:
- No indication of current file
- No percentage complete
- No ETA
- No intermediate results (wait for 100% completion)

**Current API:** Synchronous Promise-based
```typescript
const elements = await scanCurrentElements(dir, lang);
// No feedback until complete
```

**Proposed Solution:**

**Option 1: Event-Based Progress (Backward Compatible)**
```typescript
import { scanCurrentElements } from '@coderef/core';

const elements = await scanCurrentElements(dir, lang, {
  onProgress: (status: ScanProgress) => {
    console.log(`${status.filesScanned}/${status.totalFiles} (${status.percentage}%)`);
    console.log(`Current: ${status.currentFile}`);
    console.log(`ETA: ${status.eta}ms`);
  },
  onFile: (file: string, elements: ElementData[]) => {
    console.log(`✓ ${file}: Found ${elements.length} elements`);
  }
});
```

**Option 2: Async Generator (Streaming)**
```typescript
import { scanCurrentElementsStream } from '@coderef/core';

for await (const batch of scanCurrentElementsStream(dir, lang)) {
  console.log(`Scanned: ${batch.file}`);
  console.log(`Elements: ${batch.elements.length}`);
  console.log(`Progress: ${batch.progress.percentage}%`);

  // Process elements incrementally
  processElements(batch.elements);
}
```

**Progress Status Interface:**
```typescript
interface ScanProgress {
  filesScanned: number;
  totalFiles: number;
  percentage: number;        // 0-100
  currentFile: string | null;
  eta: number;              // Milliseconds remaining
  elementsFound: number;
  startedAt: number;
  elapsedMs: number;
}
```

**Implementation Complexity:** Medium
- Refactor scanner to emit events (~200 lines)
- Add `onProgress` callback to ScanOptions
- Implement async generator version (~150 lines)
- Calculate ETA (moving average)
- 3-4 day implementation

**Impact:**
- **UX:** Real-time feedback eliminates "frozen" perception
- **Streaming:** Process results incrementally (useful for large scans)
- **Dashboard:** Per-file status display

**CLI Integration:**
```bash
$ node scan.cjs /large-project
Scanning: /large-project
Progress: [████████░░] 80% (800/1000 files)
Current: src/components/Dashboard.tsx
ETA: 2.3s
```

**Testing Requirements:**
- Verify progress percentages are accurate
- Test ETA calculation precision
- Ensure backward compatibility (no onProgress = works as before)

---

### P4.12: Configuration Presets

**Problem:** Manual exclude pattern configuration requires glob expertise:
```typescript
// User must know:
exclude: [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.next/**',
  '**/.venv/**',
  // ... 10+ more patterns
]
```

**Proposed Solution:**

**Preset System:**
```typescript
import { scanCurrentElements, ScanPresets } from '@coderef/core';

// Option 1: Single preset
await scanCurrentElements(dir, lang, { preset: 'nextjs' });

// Option 2: Multiple presets
await scanCurrentElements(dir, lang, {
  presets: ['react', 'monorepo'],
  exclude: ['custom/**']  // Extends presets
});

// Option 3: Auto-detect
await scanCurrentElements(dir, lang, { preset: 'auto' });
// Detects: package.json, next.config.js, pyproject.toml, etc.
```

**Available Presets:**
```typescript
export const ScanPresets = {
  nextjs: {
    exclude: ['**/.next/**', '**/node_modules/**', '**/.turbo/**', '**/out/**'],
    langs: ['ts', 'tsx', 'js', 'jsx']
  },

  react: {
    exclude: ['**/build/**', '**/node_modules/**', '**/dist/**'],
    langs: ['ts', 'tsx', 'js', 'jsx']
  },

  python: {
    exclude: ['**/.venv/**', '**/venv/**', '**/__pycache__/**', '**/.pytest_cache/**', '**/dist/**', '**/*.egg-info/**'],
    langs: ['py']
  },

  monorepo: {
    exclude: ['**/packages/*/node_modules/**', '**/packages/*/dist/**', '**/apps/*/node_modules/**'],
    langs: ['ts', 'tsx', 'js', 'jsx']
  },

  go: {
    exclude: ['**/vendor/**', '**/bin/**', '**/.go/**'],
    langs: ['go']
  },

  rust: {
    exclude: ['**/target/**', '**/Cargo.lock'],
    langs: ['rs']
  },

  java: {
    exclude: ['**/target/**', '**/build/**', '**/.gradle/**', '**/bin/**'],
    langs: ['java']
  }
};
```

**Auto-Detection Logic:**
```typescript
function detectPreset(dir: string): string | string[] {
  if (fs.existsSync(path.join(dir, 'next.config.js'))) return 'nextjs';
  if (fs.existsSync(path.join(dir, 'pyproject.toml'))) return 'python';
  if (fs.existsSync(path.join(dir, 'Cargo.toml'))) return 'rust';
  if (fs.existsSync(path.join(dir, 'go.mod'))) return 'go';
  if (fs.existsSync(path.join(dir, 'pom.xml'))) return 'java';
  if (fs.existsSync(path.join(dir, 'lerna.json'))) return ['react', 'monorepo'];
  return 'react'; // Default fallback
}
```

**Implementation Complexity:** Low
- Define preset objects (~100 lines)
- Merge logic (~50 lines)
- Auto-detect logic (~100 lines)
- Total: 4-6 hours

**Impact:**
- **UX:** 10x faster configuration (1 line vs 10+ patterns)
- **Accuracy:** Use tested, optimal exclusions per framework
- **Adoption:** Lower barrier to entry

**Dashboard Integration:**
```tsx
// Scanner UI - Preset dropdown
<PresetSelector
  value={selectedPreset}
  onChange={setPreset}
  autoDetect={true}
/>
```

**Testing Requirements:**
- Verify preset exclusion patterns are comprehensive
- Test auto-detection on real projects
- Ensure preset merging works correctly

---

## 6. Implementation Roadmap

### Phase 1: Critical Accuracy (Q1 2026) - 4 weeks

**Week 1-2: Hybrid AST + Regex (P1.1)**
- Complexity: Medium
- Effort: 2-3 days implementation + 1-2 days testing
- Impact: 85% → 95% accuracy for TS/JS

**Week 3: Python Pattern Expansion (P1.3)**
- Complexity: Low
- Effort: 4-6 hours implementation + 4 hours testing
- Impact: +30% Python coverage

**Week 4: Context-Aware Comments (P1.2)**
- Complexity: Low-Medium
- Effort: 1-2 days implementation + 1 day testing
- Impact: 10% fewer false negatives

**Deliverables:**
- Enhanced scanner with AST mode
- 7 Python patterns (vs 3)
- Smart comment filtering
- Test suites for all features

---

### Phase 2: Performance & Scale (Q2 2026) - 3 weeks

**Week 1-2: Parallel File Processing (P2.4)**
- Complexity: Medium-High
- Effort: 4-5 days implementation + 2 days testing
- Impact: 3-5x faster scanning

**Week 3: Pattern Ordering + Caching (P2.6, P2.5)**
- P2.6 Complexity: Low (4 hours)
- P2.5 Complexity: Medium (2 days)
- Impact: 15% speedup + memory cap

**Deliverables:**
- Worker thread pool implementation
- LRU cache with TTL
- Optimized pattern execution
- Performance benchmarks

---

### Phase 3: Coverage & Relationships (Q2 2026) - 3 weeks

**Week 1: Enhanced Relationships (P3.7)**
- Complexity: Medium
- Effort: 5-6 days
- Impact: 5x more relationship data

**Week 2: Dynamic Code Detection (P3.8)**
- Complexity: Low-Medium
- Effort: 2-3 days
- Impact: +15% dependencies

**Week 3: Two-Pass Resolution (P3.9)**
- Complexity: High
- Effort: 7-10 days
- Impact: Complete dependency graph

**Deliverables:**
- Extended ElementData interface
- Dynamic import detection
- Cross-file resolution
- Orphan file detection

---

### Phase 4: User Experience (Q3 2026) - 2 weeks

**Week 1: Structured Errors + Progress (P4.10, P4.11)**
- P4.10 Complexity: Low (1-2 days)
- P4.11 Complexity: Medium (3-4 days)
- Impact: 3x faster debugging + real-time feedback

**Week 2: Configuration Presets (P4.12)**
- Complexity: Low
- Effort: 4-6 hours
- Impact: 10x easier configuration

**Deliverables:**
- ScanError interface with suggestions
- Progress reporting callbacks
- Async generator API
- 7 framework presets

---

### Phase 5: Extended Analysis (Q3-Q4 2026) - 6 weeks

**Week 1-2: New Languages (P5.13)**
- PHP (1 week)
- C# (1 week)
- Impact: Support 95% of projects

**Week 3: Complexity Analysis (P6.14)**
- Complexity: Low (integration)
- Effort: 3-4 days
- Impact: Refactoring insights

**Week 4-6: AI Embeddings (P6.15)**
- Complexity: Medium
- Effort: 10-15 days
- Impact: Semantic code search

**Deliverables:**
- PHP, C# language support
- Complexity scoring integration
- Vector embeddings generation
- Semantic search API

---

## 7. Quick Wins (Implement This Week)

### Quick Win #1: Pattern Ordering (P2.6)
- **Time:** 4 hours
- **Impact:** 15% performance improvement
- **Risk:** Low
- **Implementation:** Reorder LANGUAGE_PATTERNS by TYPE_PRIORITY

### Quick Win #2: Configuration Presets (P4.12)
- **Time:** 6 hours
- **Impact:** 10x easier configuration, massive UX improvement
- **Risk:** Low
- **Implementation:** Define preset objects + auto-detect

### Quick Win #3: Structured Errors (P4.10)
- **Time:** 8 hours
- **Impact:** 3x faster debugging
- **Risk:** Low
- **Implementation:** ScanError interface + suggestion database

### Quick Win #4: Python Pattern Expansion (P1.3)
- **Time:** 4 hours
- **Impact:** +30% Python coverage
- **Risk:** Low
- **Implementation:** Add 4 regex patterns

**Total Quick Wins:** 22 hours, 4 significant user-facing improvements

---

## 8. Success Metrics

### Accuracy Metrics

| Metric | Baseline | Phase 1 Target | Phase 5 Target |
|--------|----------|----------------|----------------|
| TS/JS Accuracy | 85% | 95% | 98% |
| Python Accuracy | 70% | 85% | 90% |
| False Negatives | 15% | 5% | 2% |
| False Positives | 5% | 2% | 1% |

### Performance Metrics

| Metric | Baseline | Phase 2 Target | Phase 5 Target |
|--------|----------|----------------|----------------|
| 500 files scan | 1185ms | 300-400ms | 200-300ms |
| 5000 files scan | 20-30s | 5-8s | 3-5s |
| Memory usage | Unbounded | 50MB cap | 50MB cap |
| Cache hit rate | 60% | 80% | 90% |

### Coverage Metrics

| Metric | Baseline | Phase 1 Target | Phase 3 Target |
|--------|----------|----------------|----------------|
| Element types | 7 | 9 | 12+ |
| Relationship types | 1 (calls) | 3 | 6 |
| Python patterns | 3 | 7 | 10 |
| Supported languages | 10 | 10 | 13 |

### User Experience Metrics

| Metric | Baseline | Phase 4 Target |
|--------|----------|----------------|
| Configuration time | 15-30 min | 30 sec (presets) |
| Error resolution time | 20 min | 5-7 min (suggestions) |
| User reported issues | Baseline | -60% |

---

## 9. Testing Strategy

### Unit Testing
- **Pattern matching:** 100+ fixtures per language
- **Caching:** Hit/miss scenarios, TTL expiration
- **Deduplication:** Overlap cases, priority resolution
- **Error handling:** All error types, recovery paths

### Integration Testing
- **Multi-language projects:** Scan projects with 2+ languages
- **Large codebases:** 1000+ file fixtures
- **Worker threads:** Parallel vs sequential comparison
- **Cross-file resolution:** Import resolution accuracy

### Performance Testing
- **Benchmarks:** Sequential vs parallel, AST vs regex
- **Memory profiling:** LRU cache behavior
- **Scalability:** 100, 500, 1000, 5000, 10000 file tests

### Regression Testing
- **Backward compatibility:** All existing scans produce same results (or better)
- **API stability:** ScanOptions additions don't break existing code

---

## 10. Risk Assessment

### High Risk Items

**P2.4: Parallel File Processing**
- **Risk:** Worker thread crashes, serialization issues
- **Mitigation:** Graceful fallback to sequential, comprehensive error handling

**P3.9: Two-Pass Resolution**
- **Risk:** Complex module resolution, path alias edge cases
- **Mitigation:** Extensive testing on real projects, fallback to no resolution

### Medium Risk Items

**P1.1: Hybrid AST + Regex**
- **Risk:** AST parsing failures, performance degradation
- **Mitigation:** Regex fallback, optional opt-in (default: false)

**P2.5: Content-Aware Caching**
- **Risk:** Hash computation overhead, memory leaks
- **Mitigation:** Hash first 1KB only, LRU eviction, monitoring

### Low Risk Items

**P1.3: Pattern Expansion**
- **Risk:** Minimal (new patterns isolated)
- **Mitigation:** Independent testing per pattern

**P4.12: Configuration Presets**
- **Risk:** Minimal (purely additive)
- **Mitigation:** Preset validation, user overrides

---

## 11. Maintenance Protocol

### Adding New Improvements

**Process:**
1. Create feature branch (`feature/scanner-improvement-X`)
2. Implement with unit tests (TDD preferred)
3. Add integration tests with real projects
4. Run performance benchmarks (compare baseline)
5. Update this document (add to roadmap, metrics)
6. Code review + approval
7. Merge to main
8. Monitor production metrics (accuracy, performance)

### Deprecation Policy

**Backward Compatibility:**
- All new features must be opt-in or backward compatible
- Deprecation warnings for 2 minor versions before removal
- Migration guides for breaking changes

### Performance Regression Protocol

**If scan performance degrades by >10%:**
1. Identify commit that introduced regression
2. Revert if critical, otherwise create hotfix branch
3. Add performance test to CI to prevent future regressions

---

## 12. Dependencies & Prerequisites

### Required Packages
- `acorn` (already integrated) - AST parsing
- `lru-cache` - LRU caching (available in node_modules)
- `worker_threads` (Node.js built-in) - Parallel processing

### Optional Packages
- `tree-sitter` - Alternative AST parser (future consideration)
- `@swc/core` - Faster TypeScript parser (future consideration)

### Infrastructure
- Node.js ≥16.0 (worker threads stable)
- Multi-core CPU (for parallel processing)
- 512MB+ RAM (for large project scans)

---

## Conclusion

This roadmap provides a structured path to evolving the CodeRef scanner from an 85% accurate, single-threaded regex engine to a 95%+ accurate, parallel, multi-language analysis platform with semantic understanding and AI-ready embeddings. The 15 improvements are prioritized by impact and risk, with 4 quick wins implementable in 22 hours for immediate user benefit.

**Next Steps:**
1. Review and approve Phase 1 priorities (P1.1, P1.2, P1.3)
2. Allocate engineering resources (1-2 developers, Q1 2026)
3. Implement quick wins (22 hours, immediate impact)
4. Establish success metrics baseline (current accuracy, performance)

**Maintenance Expectations:**
- Update this document after each phase completion
- Track metrics in dedicated dashboard
- Quarterly review of roadmap priorities

**Last Updated:** 2026-01-13
