# Code Hotspots

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-04-21  
<!-- coderef:uuid=hotspots-root -->

---

## Overview

This document identifies high-risk areas in the codebase based on complexity analysis and dependency density. Use this to prioritize:

- **Refactoring efforts** - Target high-complexity functions first
- **Testing focus** - Critical paths need comprehensive coverage
- **Code review attention** - Hotspots change more frequently

---

## Project Statistics

| Metric | Value |
|--------|-------|
| **Total Files** | 296 |
| **Total Elements** | 1,977 |
| **Total Lines** | 75,601 |
| **Entry Points** | 20 |
| **Critical Functions** | 20 |

---

## Critical Functions by Complexity

*Functions with highest cyclomatic complexity scores*

| Rank | Function | Complexity | File | Risk |
|------|----------|------------|------|------|
| 1 | <!-- coderef:uuid= --> `ASTElementScanner.visitNode` | 🔴 63 (Critical) | `src/analyzer/ast-element-scanner.ts` | 0 dependents |
| 2 | <!-- coderef:uuid= --> `JSCallDetector.extractExportsFromAST` | 🔴 55 (Critical) | `src/analyzer/js-call-detector.ts` | 0 dependents |
| 3 | <!-- coderef:uuid= --> `JSCallDetector.extractElementsFromAST` | 🔴 52 (Critical) | `src/analyzer/js-call-detector.ts` | 0 dependents |
| 4 | <!-- coderef:uuid= --> `scanCurrentElements` | 🟡 40 (High) | `src/scanner/scanner.ts` | 1 dependents |
| 5 | <!-- coderef:uuid= --> `EmbeddingTextGenerator.generate` | 🟢 29 (Moderate) | `src/integration/rag/embedding-text-generator.ts` | 0 dependents |
| 6 | <!-- coderef:uuid= --> `buildDependencyGraph` | ⚪ 8 (Low) | `src/fileGeneration/buildDependencyGraph.ts` | 0 dependents |
| 7 | <!-- coderef:uuid= --> `analyzeCoverage` | ⚪ 6 (Low) | `src/fileGeneration/analyzeCoverage.ts` | 0 dependents |
| 8 | <!-- coderef:uuid= --> `ComplexityGenerator.generate` | ⚪ 6 (Low) | `src/pipeline/generators/complexity-generator.ts` | 0 dependents |
| 9 | <!-- coderef:uuid= --> `AnalyzerService.analyze` | ⚪ 5 (Low) | `src/analyzer/analyzer-service.ts` | 0 dependents |
| 10 | <!-- coderef:uuid= --> `QueryExecutor.execute` | ⚪ 4 (Low) | `src/query/query-executor.ts` | 0 dependents |
| 11 | <!-- coderef:uuid= --> `IndexGenerator.generate` | ⚪ 3 (Low) | `src/pipeline/generators/index-generator.ts` | 0 dependents |
| 12 | <!-- coderef:uuid= --> `ContextGenerator.generate` | ⚪ 2 (Low) | `src/context/context-generator.ts` | 0 dependents |
| 13 | <!-- coderef:uuid= --> `CoverageGenerator.generate` | ⚪ 2 (Low) | `src/pipeline/generators/coverage-generator.ts` | 0 dependents |
| 14 | <!-- coderef:uuid= --> `DiagramGenerator.generate` | ⚪ 2 (Low) | `src/pipeline/generators/diagram-generator.ts` | 0 dependents |
| 15 | <!-- coderef:uuid= --> `DriftGenerator.generate` | ⚪ 2 (Low) | `src/pipeline/generators/drift-generator.ts` | 0 dependents |
| 16 | <!-- coderef:uuid= --> `ExportGenerator.generate` | ⚪ 2 (Low) | `src/pipeline/generators/export-generator.ts` | 0 dependents |
| 17 | <!-- coderef:uuid= --> `GraphGenerator.generate` | ⚪ 2 (Low) | `src/pipeline/generators/graph-generator.ts` | 0 dependents |
| 18 | <!-- coderef:uuid= --> `PatternGenerator.generate` | ⚪ 2 (Low) | `src/pipeline/generators/pattern-generator.ts` | 0 dependents |
| 19 | <!-- coderef:uuid= --> `RegistryGenerator.generate` | ⚪ 2 (Low) | `src/pipeline/generators/registry-generator.ts` | 0 dependents |
| 20 | <!-- coderef:uuid= --> `ValidationGenerator.generate` | ⚪ 2 (Low) | `src/pipeline/generators/validation-generator.ts` | 0 dependents |

---

## Entry Points

*Public APIs and main execution paths that external code depends on*

| Entry Point | Type | File |
|-------------|------|------|
| <!-- coderef:uuid= --> `convertGraphToElements` | function | `src/adapter/graph-to-elements.ts` |
| <!-- coderef:uuid= --> `getConversionStats` | function | `src/adapter/graph-to-elements.ts` |
| <!-- coderef:uuid= --> `visit` | function | `src/analyzer/ast-element-scanner.ts` |
| <!-- coderef:uuid= --> `visit` | function | `src/analyzer/ast-element-scanner.ts` |
| <!-- coderef:uuid= --> `visit` | function | `src/analyzer/ast-element-scanner.ts` |
| <!-- coderef:uuid= --> `visit` | function | `src/analyzer/ast-element-scanner.ts` |
| <!-- coderef:uuid= --> `scanFileWithAST` | function | `src/analyzer/ast-element-scanner.ts` |
| <!-- coderef:uuid= --> `scanFilesWithAST` | function | `src/analyzer/ast-element-scanner.ts` |
| <!-- coderef:uuid= --> `parseFetchCalls` | function | `src/analyzer/frontend-call-parsers.ts` |
| <!-- coderef:uuid= --> `parseAxiosCalls` | function | `src/analyzer/frontend-call-parsers.ts` |
| <!-- coderef:uuid= --> `parseReactQueryCalls` | function | `src/analyzer/frontend-call-parsers.ts` |
| <!-- coderef:uuid= --> `parseCustomApiCalls` | function | `src/analyzer/frontend-call-parsers.ts` |
| <!-- coderef:uuid= --> `extractHttpMethod` | function | `src/analyzer/frontend-call-parsers.ts` |
| <!-- coderef:uuid= --> `extractCallLocation` | function | `src/analyzer/frontend-call-parsers.ts` |
| <!-- coderef:uuid= --> `dfs` | function | `src/analyzer/graph-analyzer.ts` |
| <!-- coderef:uuid= --> `dfs` | function | `src/analyzer/graph-analyzer.ts` |
| <!-- coderef:uuid= --> `dfs` | function | `src/analyzer/graph-analyzer.ts` |
| <!-- coderef:uuid= --> `dfs` | function | `src/analyzer/graph-analyzer.ts` |
| <!-- coderef:uuid= --> `parseNodeId` | function | `src/analyzer/graph-helpers.ts` |
| <!-- coderef:uuid= --> `getImportsForElement` | function | `src/analyzer/graph-helpers.ts` |

---

## Complexity Legend

| Badge | Score | Meaning | Action |
|-------|-------|---------|--------|
| 🔴 | ≥ 50 | Critical | Immediate refactoring required |
| 🟡 | 30-49 | High | Schedule refactoring soon |
| 🟢 | 15-29 | Moderate | Monitor during changes |
| ⚪ | < 15 | Low | Standard maintenance |

---

## Risk Factors

Functions become hotspots through:

1. **High Complexity** - Many branches, nested logic
2. **Many Dependents** - Changes impact many callers
3. **Entry Point Status** - Public APIs with external consumers
4. **Async Patterns** - Concurrency and error handling complexity
5. **File Density** - Many elements competing for maintainer attention

---

## Recommended Actions

### Immediate (This Sprint)

Focus on 🔴 Critical complexity functions:
- `ASTElementScanner.visitNode` (src/analyzer/ast-element-scanner.ts) - complexity 63
- `JSCallDetector.extractExportsFromAST` (src/analyzer/js-call-detector.ts) - complexity 55
- `JSCallDetector.extractElementsFromAST` (src/analyzer/js-call-detector.ts) - complexity 52

### Short Term (Next 2 Sprints)

Address 🟡 High complexity functions with many dependents:
- No high-risk functions requiring short-term attention

---

## Monitoring

Track hotspot evolution:

```bash
# Generate updated hotspots report
node scripts/doc-gen/generate-hotspots-md.js

# Compare with previous version
git diff coderef/foundation-docs/HOTSPOTS.md
```

Watch for:
- New functions entering 🔴 Critical range
- Complexity increases on entry points
- Functions accumulating many dependents

---

*This document is auto-generated from .coderef/context.json. Do not edit manually.*
