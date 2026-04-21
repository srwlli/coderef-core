# CodeRef Core - Improvements Summary

**Last Updated:** 2026-04-18
**Project:** coderef-core
**Scope:** scanner

---

## COMPLETED ✅ (1 item)

| ID | Title | Category | Severity | Completed |
|---|---|---|---|---|
| IMP-CORE-002 | Centralize pattern definitions to eliminate code duplication | code-quality | major | 2026-04-18 |

### IMP-CORE-002 - Resolution
**Result:** Reduced 281 lines to 110 lines (61% reduction). All 77 scanner tests pass.

Created BASE_JS_PATTERNS constant containing shared pattern definitions. LANGUAGE_PATTERNS now references BASE_JS_PATTERNS for ts/js/tsx/jsx.

**Location:** src/scanner/scanner.ts:34-110

---

## OPEN 📋 (12 items)

### Critical 🔴

| ID | Title | Category | Severity | Files |
|---|---|---|---|---|
| IMP-CORE-013 | Fix indexing pipeline undefined graph error | testing | critical | src/integration/rag/indexing-orchestrator.ts:438, src/integration/rag/__tests__/integration/indexing-pipeline.test.ts:312 |

**Details:** 14 tests failing in indexing-pipeline.test.ts with error 'Cannot read properties of undefined (reading graph)'. Error originates from IndexingOrchestrator.indexCodebase at line 438. Missing null check for graph data structure before accessing properties.

---

### Major 🟠

| ID | Title | Category | Severity | Files |
|---|---|---|---|---|
| IMP-CORE-003 | Replace regex-based complexity with AST-based calculation | testing | major | src/pipeline/generators/complexity-generator.ts:131-151, src/scanner/tree-sitter-scanner.ts |
| IMP-CORE-004 | Add modern framework route detection | feature | major | src/analyzer/route-parsers.ts, src/scanner/scanner.ts:47-91 |
| IMP-CORE-005 | Add Python/Go/Rust element detection patterns | feature | major | src/scanner/scanner.ts:31-199 |
| IMP-CORE-015 | Implement breaking change detector test stubs | testing | major | src/context/__tests__/breaking-change-detector.test.ts:69-205 |

#### IMP-CORE-003 Details
Current complexity calculation in complexity-generator.ts uses naive regex counting (if/for/while/&&/||). Tree-sitter AST parser is available but not used for complexity. Implement proper cyclomatic complexity calculation using AST traversal for accurate metrics.

#### IMP-CORE-004 Details
Route detection only supports Express, Flask, FastAPI. Missing: Next.js (pages/api/, app/api/), SvelteKit (+page.server.ts), Nuxt (server/api/), Remix. Add patterns and parsers for modern meta-frameworks to improve API endpoint visibility.

#### IMP-CORE-005 Details
Tree-sitter grammars loaded for 10 languages (py, go, rs, java, cpp, c) but only TypeScript/JavaScript have pattern definitions in LANGUAGE_PATTERNS. Add detection patterns for Python (def, class), Go (func), Rust (fn, impl), Java, C++ to enable multi-language codebases.

#### IMP-CORE-015 Details
breaking-change-detector.test.ts has 16 placeholder tests marked with TODO that all contain 'expect(true).toBe(true)'. These test stubs cover critical functionality including parameter detection, call site finding, and severity scoring. Without real implementations, breaking change detection is unverified.

---

### Minor 🟡

| ID | Title | Category | Severity | Files |
|---|---|---|---|---|
| IMP-CORE-006 | Add component framework detection (Svelte, Vue, Solid) | feature | minor | src/scanner/scanner.ts:31-46, src/scanner/tree-sitter-scanner.ts |
| IMP-CORE-009 | Improve test gap detection with coverage integration | testing | minor | src/pipeline/generators/pattern-generator.ts:57, src/pipeline/generators/coverage-generator.ts |
| IMP-CORE-010 | Add middleware and dependency injection detection | feature | minor | src/scanner/scanner.ts, src/analyzer/ |
| IMP-CORE-011 | Implement Protobuf export format | feature | minor | src/export/graph-exporter.ts:102 |
| IMP-CORE-012 | Implement force-directed graph layout | ux | minor | src/export/graph-exporter.ts:212 |
| IMP-CORE-014 | Remove debug console statements from tree-sitter-scanner | code-quality | minor | src/scanner/tree-sitter-scanner.ts:339-426 |

#### IMP-CORE-006 Details
Only React components detected via pattern matching. Missing: Svelte (.svelte files), Vue (.vue single-file components), Solid, Angular. Add file extension handlers and component detection for modern frontend frameworks.

#### IMP-CORE-009 Details
Current test gap detection only checks for test file existence via naming convention (pattern-generator.ts). Add coverage data integration to detect actually-uncovered functions vs functions with missing test files.

#### IMP-CORE-010 Details
Missing: Express middleware chains, FastAPI dependencies, NestJS providers, Angular DI, TSyringe. Add pattern detection for service registration and middleware attachment to improve architectural understanding.

#### IMP-CORE-011 Details
Graph exporter has stub method for Protobuf export that returns JSON with a warning. Implement actual Protobuf serialization using protobufjs for efficient binary graph transport.

#### IMP-CORE-012 Details
Graph visualization export uses simple circular layout with TODO comment. Implement proper force-directed layout algorithm for better visual representation of code relationships.

#### IMP-CORE-014 Details
Production code in tree-sitter-scanner.ts contains DEBUG console.error statements that pollute output. Lines 339, 345, 417-419, 425 output debug info for specific function names. These should be removed or converted to a proper logging system with levels.

---

## Summary Stats

- **Total Issues:** 13
- **Completed:** 1 ✅
- **Open:** 12 📋
  - Critical: 1 🔴
  - Major: 4 🟠
  - Minor: 7 🟡
