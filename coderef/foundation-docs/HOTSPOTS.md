# Code Hotspots

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-05-16  
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
| **Total Files** | 399 |
| **Total Elements** | 2,484 |
| **Total Lines** | 111,449 |
| **Entry Points** | 88 |
| **Critical Functions** | 20 |

---

## Critical Functions by Complexity

*Functions with highest cyclomatic complexity scores*

| Rank | Function | Complexity | File | Risk |
|------|----------|------------|------|------|
| 1 | <!-- coderef:uuid= --> `ContextGenerator.generateMarkdown` | 🔴 102 (Critical) | `src/pipeline/generators/context-generator.ts` | 0 dependents |
| 2 | <!-- coderef:uuid= --> `ASTElementScanner.visitNode` | 🔴 65 (Critical) | `src/analyzer/ast-element-scanner.ts` | 0 dependents |
| 3 | <!-- coderef:uuid= --> `currentScopeCodeRefId` | 🔴 65 (Critical) | `src/pipeline/call-resolver.ts` | 0 dependents |
| 4 | <!-- coderef:uuid= --> `extractExportsFromAST` | 🔴 55 (Critical) | `src/analyzer/js-call-detector/module-analyzer.ts` | 0 dependents |
| 5 | <!-- coderef:uuid= --> `extractElementsFromAST` | 🔴 51 (Critical) | `src/analyzer/js-call-detector/visitor.ts` | 0 dependents |
| 6 | <!-- coderef:uuid= --> `run` | 🟡 41 (High) | `src/cli/populate.ts` | 0 dependents |
| 7 | <!-- coderef:uuid= --> `buildEdges` | 🟡 41 (High) | `src/pipeline/graph-builder.ts` | 0 dependents |
| 8 | <!-- coderef:uuid= --> `main.fileToDir` | 🟡 41 (High) | `scripts/generate-intelligence.js` | 0 dependents |
| 9 | <!-- coderef:uuid= --> `scanCurrentElements` | 🟡 40 (High) | `src/scanner/scanner.ts` | 0 dependents |
| 10 | <!-- coderef:uuid= --> `EmbeddingTextGenerator.generate` | 🟡 30 (High) | `src/integration/rag/embedding-text-generator.ts` | 0 dependents |
| 11 | <!-- coderef:uuid= --> `DatabaseDetector.detect` | ⚪ 9 (Low) | `src/analyzer/database-detector.ts` | 0 dependents |
| 12 | <!-- coderef:uuid= --> `buildDependencyGraph` | ⚪ 8 (Low) | `src/fileGeneration/buildDependencyGraph.ts` | 0 dependents |
| 13 | <!-- coderef:uuid= --> `ConfigAnalyzer.analyze` | ⚪ 7 (Low) | `src/analyzer/config-analyzer.ts` | 0 dependents |
| 14 | <!-- coderef:uuid= --> `analyzeCoverage` | ⚪ 6 (Low) | `src/fileGeneration/analyzeCoverage.ts` | 0 dependents |
| 15 | <!-- coderef:uuid= --> `ComplexityGenerator.generate` | ⚪ 6 (Low) | `src/pipeline/generators/complexity-generator.ts` | 0 dependents |
| 16 | <!-- coderef:uuid= --> `AnalyzerService.analyze` | ⚪ 5 (Low) | `src/analyzer/analyzer-service.ts` | 0 dependents |
| 17 | <!-- coderef:uuid= --> `QueryExecutor.execute` | ⚪ 4 (Low) | `src/query/query-executor.ts` | 0 dependents |
| 18 | <!-- coderef:uuid= --> `FrameworkRegistry.detect` | ⚪ 3 (Low) | `src/scanner/framework-registry.ts` | 0 dependents |
| 19 | <!-- coderef:uuid= --> `DependencyAnalyzer.analyze` | ⚪ 2 (Low) | `src/analyzer/dependency-analyzer.ts` | 0 dependents |
| 20 | <!-- coderef:uuid= --> `DesignPatternDetector.analyze` | ⚪ 2 (Low) | `src/analyzer/design-pattern-detector.ts` | 0 dependents |

---

## Entry Points

*Public APIs and main execution paths that external code depends on*

| Entry Point | Type | File |
|-------------|------|------|
| <!-- coderef:uuid= --> `index.ts` | library | `examples/plugins/example-detector/src/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/frameworks/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/js-call-detector/index.ts` |
| <!-- coderef:uuid= --> `rag-index.ts` | library | `src/cli/rag-index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/context/breaking-change-detector/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/context/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/errors/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/export/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/indexer/index.ts` |
| <!-- coderef:uuid= --> `metadata-index.ts` | library | `src/indexer/metadata-index.ts` |
| <!-- coderef:uuid= --> `relationship-index.ts` | library | `src/indexer/relationship-index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/integration/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/integration/llm/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/integration/rag/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/integration/vector/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/pipeline/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/search/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/semantic/index.ts` |
| <!-- coderef:uuid= --> `detect-languages-cli.ts` | cli | `src/cli/detect-languages-cli.ts` |
| <!-- coderef:uuid= --> `semantic-integration-cli.ts` | cli | `src/cli/semantic-integration-cli.ts` |
| <!-- coderef:uuid= --> `main` | cli | `demo-all-modules.ts` |
| <!-- coderef:uuid= --> `main` | cli | `src/cli/coderef-analyze.ts` |

*... and 63 more entry points.*

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
- `ContextGenerator.generateMarkdown` (src/pipeline/generators/context-generator.ts) - complexity 102
- `ASTElementScanner.visitNode` (src/analyzer/ast-element-scanner.ts) - complexity 65
- `currentScopeCodeRefId` (src/pipeline/call-resolver.ts) - complexity 65
- `extractExportsFromAST` (src/analyzer/js-call-detector/module-analyzer.ts) - complexity 55
- `extractElementsFromAST` (src/analyzer/js-call-detector/visitor.ts) - complexity 51

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
