# Code Hotspots

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-07-20  
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
| **Total Files** | 487 |
| **Total Elements** | 3,156 |
| **Total Lines** | 130,760 |
| **Entry Points** | 82 |
| **Critical Functions** | 20 |

---

## Critical Functions by Complexity

*Functions with highest cyclomatic complexity scores*

| Rank | Function | Complexity | File | Risk |
|------|----------|------------|------|------|
| 1 | <!-- coderef:uuid= --> `buildLookupTools` | 🔴 143 (Critical) | `src/cli/mcp/lookup-tools.ts` | 0 dependents |
| 2 | <!-- coderef:uuid= --> `projectMapData` | 🔴 121 (Critical) | `src/map/project-map-data.ts` | 0 dependents |
| 3 | <!-- coderef:uuid= --> `buildGraphTools.outboundByKind` | 🔴 118 (Critical) | `src/cli/mcp/graph-tools.ts` | 0 dependents |
| 4 | <!-- coderef:uuid= --> `buildMapTools` | 🔴 106 (Critical) | `src/cli/mcp/map-tools.ts` | 0 dependents |
| 5 | <!-- coderef:uuid= --> `scanCurrentElements` | 🔴 104 (Critical) | `src/scanner/scanner.ts` | 0 dependents |
| 6 | <!-- coderef:uuid= --> `ContextGenerator.generateMarkdown` | 🔴 97 (Critical) | `src/pipeline/generators/context-generator.ts` | 0 dependents |
| 7 | <!-- coderef:uuid= --> `computeGraphAnalytics` | 🔴 95 (Critical) | `src/map/graph-analytics.ts` | 0 dependents |
| 8 | <!-- coderef:uuid= --> `runLexical` | 🔴 68 (Critical) | `src/cli/mcp/rag-tools.ts` | 0 dependents |
| 9 | <!-- coderef:uuid= --> `computeLayerDrift` | 🔴 66 (Critical) | `src/map/layer-drift.ts` | 0 dependents |
| 10 | <!-- coderef:uuid= --> `ASTElementScanner.visitNode` | 🔴 65 (Critical) | `src/analyzer/ast-element-scanner.ts` | 0 dependents |
| 11 | <!-- coderef:uuid= --> `currentScopeCodeRefId` | 🔴 65 (Critical) | `src/pipeline/call-resolver.ts` | 0 dependents |
| 12 | <!-- coderef:uuid= --> `toAbs` | 🔴 61 (Critical) | `src/cli/populate.ts` | 0 dependents |
| 13 | <!-- coderef:uuid= --> `computeEngineeringMetrics` | 🔴 58 (Critical) | `src/map/engineering-metrics.ts` | 0 dependents |
| 14 | <!-- coderef:uuid= --> `extractExportsFromAST` | 🔴 55 (Critical) | `src/analyzer/js-call-detector/module-analyzer.ts` | 0 dependents |
| 15 | <!-- coderef:uuid= --> `buildEdges` | 🔴 55 (Critical) | `src/pipeline/graph-builder.ts` | 0 dependents |
| 16 | <!-- coderef:uuid= --> `reportProgress` | 🔴 52 (Critical) | `src/integration/rag/indexing-orchestrator.ts` | 0 dependents |
| 17 | <!-- coderef:uuid= --> `extractElementsFromAST` | 🔴 51 (Critical) | `src/analyzer/js-call-detector/visitor.ts` | 0 dependents |
| 18 | <!-- coderef:uuid= --> `diffMapMetrics` | 🔴 51 (Critical) | `src/map/metrics-delta.ts` | 0 dependents |
| 19 | <!-- coderef:uuid= --> `SemanticSearchService.search` | 🟡 43 (High) | `src/integration/rag/semantic-search.ts` | 0 dependents |
| 20 | <!-- coderef:uuid= --> `EmbeddingTextGenerator.generate` | 🟡 30 (High) | `src/integration/rag/embedding-text-generator.ts` | 0 dependents |

---

## Entry Points

*Public APIs and main execution paths that external code depends on*

| Entry Point | Type | File |
|-------------|------|------|
| <!-- coderef:uuid= --> `index.ts` | library | `index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/frameworks/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/js-call-detector/index.ts` |
| <!-- coderef:uuid= --> `rag-index.ts` | library | `src/cli/rag-index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/context/breaking-change-detector/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/context/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/export/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/indexer/index.ts` |
| <!-- coderef:uuid= --> `metadata-index.ts` | library | `src/indexer/metadata-index.ts` |
| <!-- coderef:uuid= --> `relationship-index.ts` | library | `src/indexer/relationship-index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/integration/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/integration/llm/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/integration/rag/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/integration/vector/index.ts` |
| <!-- coderef:uuid= --> `field-index.ts` | library | `src/pipeline/field-index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/pipeline/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/search/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/semantic/index.ts` |
| <!-- coderef:uuid= --> `detect-languages-cli.ts` | cli | `src/cli/detect-languages-cli.ts` |
| <!-- coderef:uuid= --> `semantic-integration-cli.ts` | cli | `src/cli/semantic-integration-cli.ts` |
| <!-- coderef:uuid= --> `main` | cli | `demo-all-modules.ts` |
| <!-- coderef:uuid= --> `main` | cli | `src/cli/coderef-analyze.ts` |
| <!-- coderef:uuid= --> `main` | cli | `src/cli/coderef-map.ts` |

*... and 57 more entry points.*

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
- `buildLookupTools` (src/cli/mcp/lookup-tools.ts) - complexity 143
- `projectMapData` (src/map/project-map-data.ts) - complexity 121
- `buildGraphTools.outboundByKind` (src/cli/mcp/graph-tools.ts) - complexity 118
- `buildMapTools` (src/cli/mcp/map-tools.ts) - complexity 106
- `scanCurrentElements` (src/scanner/scanner.ts) - complexity 104
- `ContextGenerator.generateMarkdown` (src/pipeline/generators/context-generator.ts) - complexity 97
- `computeGraphAnalytics` (src/map/graph-analytics.ts) - complexity 95
- `runLexical` (src/cli/mcp/rag-tools.ts) - complexity 68
- `computeLayerDrift` (src/map/layer-drift.ts) - complexity 66
- `ASTElementScanner.visitNode` (src/analyzer/ast-element-scanner.ts) - complexity 65
- `currentScopeCodeRefId` (src/pipeline/call-resolver.ts) - complexity 65
- `toAbs` (src/cli/populate.ts) - complexity 61
- `computeEngineeringMetrics` (src/map/engineering-metrics.ts) - complexity 58
- `extractExportsFromAST` (src/analyzer/js-call-detector/module-analyzer.ts) - complexity 55
- `buildEdges` (src/pipeline/graph-builder.ts) - complexity 55
- `reportProgress` (src/integration/rag/indexing-orchestrator.ts) - complexity 52
- `extractElementsFromAST` (src/analyzer/js-call-detector/visitor.ts) - complexity 51
- `diffMapMetrics` (src/map/metrics-delta.ts) - complexity 51

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
