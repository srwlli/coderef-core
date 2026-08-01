---
subject: Complexity & Risk Analysis — @coderef/core
status: generated
generator: scripts/doc-gen/generate-hotspots-md.js
documents:
  - dist-old/index.d.ts
  - dist-old/src/analyzer/frameworks/index.d.ts
  - dist-old/src/analyzer/index.d.ts
  - dist-old/src/analyzer/js-call-detector/index.d.ts
  - dist-old/src/cli/rag-index.d.ts
  - dist-old/src/context/breaking-change-detector/index.d.ts
  - dist-old/src/context/index.d.ts
  - dist-old/src/export/index.d.ts
  - dist-old/src/index.d.ts
  - dist-old/src/indexer/index.d.ts
  - dist-old/src/indexer/metadata-index.d.ts
  - dist-old/src/indexer/relationship-index.d.ts
  - dist-old/src/integration/index.d.ts
  - dist-old/src/integration/llm/index.d.ts
  - dist-old/src/integration/rag/index.d.ts
  - dist-old/src/integration/vector/index.d.ts
  - dist-old/src/pipeline/field-index.d.ts
  - dist-old/src/pipeline/heritage-index.d.ts
  - dist-old/src/pipeline/index.d.ts
  - dist-old/src/search/index.d.ts
documents_truncated: 20 of 45 analyzed files listed
---

# Code Hotspots

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-08-01  
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
| **Total Files** | 1,018 |
| **Total Elements** | 6,046 |
| **Total Lines** | 227,528 |
| **Entry Points** | 171 |
| **Critical Functions** | 20 |

---

## Critical Functions by Complexity

*Functions with highest cyclomatic complexity scores*

| Rank | Function | Complexity | File | Risk |
|------|----------|------------|------|------|
| 1 | <!-- coderef:uuid= --> `buildGraphTools` | 🔴 192 (Critical) | `src/cli/mcp/graph-tools.ts` | 0 dependents |
| 2 | <!-- coderef:uuid= --> `projectMapData` | 🔴 131 (Critical) | `src/map/project-map-data.ts` | 0 dependents |
| 3 | <!-- coderef:uuid= --> `buildScopeBindingMap` | 🔴 107 (Critical) | `src/pipeline/scope-binding.ts` | 0 dependents |
| 4 | <!-- coderef:uuid= --> `scanCurrentElements` | 🔴 103 (Critical) | `src/scanner/scanner.ts` | 0 dependents |
| 5 | <!-- coderef:uuid= --> `buildMapTools` | 🔴 100 (Critical) | `src/cli/mcp/map-tools.ts` | 0 dependents |
| 6 | <!-- coderef:uuid= --> `buildLookupTools` | 🔴 98 (Critical) | `src/cli/mcp/lookup-tools.ts` | 0 dependents |
| 7 | <!-- coderef:uuid= --> `PipelineContextGenerator.generateMarkdown` | 🔴 95 (Critical) | `src/pipeline/generators/context-generator.ts` | 0 dependents |
| 8 | <!-- coderef:uuid= --> `computeGraphAnalytics` | 🔴 87 (Critical) | `src/map/graph-analytics.ts` | 0 dependents |
| 9 | <!-- coderef:uuid= --> `buildVerifyTools` | 🔴 78 (Critical) | `src/cli/mcp/verify-tools.ts` | 0 dependents |
| 10 | <!-- coderef:uuid= --> `buildEdges` | 🔴 78 (Critical) | `src/pipeline/graph-builder.ts` | 0 dependents |
| 11 | <!-- coderef:uuid= --> `runRagIndex` | 🔴 73 (Critical) | `src/cli/rag-index.ts` | 0 dependents |
| 12 | <!-- coderef:uuid= --> `computeLayerDrift` | 🔴 67 (Critical) | `src/map/layer-drift.ts` | 0 dependents |
| 13 | <!-- coderef:uuid= --> `runPopulate` | 🔴 64 (Critical) | `src/cli/populate.ts` | 0 dependents |
| 14 | <!-- coderef:uuid= --> `ASTElementScanner.visitNode` | 🔴 62 (Critical) | `src/analyzer/ast-element-scanner.ts` | 0 dependents |
| 15 | <!-- coderef:uuid= --> `classifyMethodCall` | 🔴 62 (Critical) | `src/pipeline/call-resolver.ts` | 0 dependents |
| 16 | <!-- coderef:uuid= --> `computeApiSurface` | 🔴 61 (Critical) | `src/map/api-surface.ts` | 0 dependents |
| 17 | <!-- coderef:uuid= --> `computeEngineeringMetrics` | 🔴 58 (Critical) | `src/map/engineering-metrics.ts` | 0 dependents |
| 18 | <!-- coderef:uuid= --> `IndexingOrchestrator.indexCodebase` | 🔴 52 (Critical) | `src/integration/rag/indexing-orchestrator.ts` | 0 dependents |
| 19 | <!-- coderef:uuid= --> `buildRagTools` | 🔴 50 (Critical) | `src/cli/mcp/rag-tools.ts` | 0 dependents |
| 20 | <!-- coderef:uuid= --> `EmbeddingTextGenerator.generate` | 🟢 19 (Moderate) | `src/integration/rag/embedding-text-generator.ts` | 0 dependents |

---

## Entry Points

*Public APIs and main execution paths that external code depends on*

| Entry Point | Type | File |
|-------------|------|------|
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/analyzer/frameworks/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/analyzer/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/analyzer/js-call-detector/index.d.ts` |
| <!-- coderef:uuid= --> `rag-index.d.ts` | library | `dist-old/src/cli/rag-index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/context/breaking-change-detector/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/context/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/export/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/indexer/index.d.ts` |
| <!-- coderef:uuid= --> `metadata-index.d.ts` | library | `dist-old/src/indexer/metadata-index.d.ts` |
| <!-- coderef:uuid= --> `relationship-index.d.ts` | library | `dist-old/src/indexer/relationship-index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/integration/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/integration/llm/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/integration/rag/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/integration/vector/index.d.ts` |
| <!-- coderef:uuid= --> `field-index.d.ts` | library | `dist-old/src/pipeline/field-index.d.ts` |
| <!-- coderef:uuid= --> `heritage-index.d.ts` | library | `dist-old/src/pipeline/heritage-index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/pipeline/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/search/index.d.ts` |
| <!-- coderef:uuid= --> `index.d.ts` | library | `dist-old/src/semantic/index.d.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/frameworks/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/index.ts` |
| <!-- coderef:uuid= --> `index.ts` | library | `src/analyzer/js-call-detector/index.ts` |

*... and 146 more entry points.*

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
- `buildGraphTools` (src/cli/mcp/graph-tools.ts) - complexity 192
- `projectMapData` (src/map/project-map-data.ts) - complexity 131
- `buildScopeBindingMap` (src/pipeline/scope-binding.ts) - complexity 107
- `scanCurrentElements` (src/scanner/scanner.ts) - complexity 103
- `buildMapTools` (src/cli/mcp/map-tools.ts) - complexity 100
- `buildLookupTools` (src/cli/mcp/lookup-tools.ts) - complexity 98
- `PipelineContextGenerator.generateMarkdown` (src/pipeline/generators/context-generator.ts) - complexity 95
- `computeGraphAnalytics` (src/map/graph-analytics.ts) - complexity 87
- `buildVerifyTools` (src/cli/mcp/verify-tools.ts) - complexity 78
- `buildEdges` (src/pipeline/graph-builder.ts) - complexity 78
- `runRagIndex` (src/cli/rag-index.ts) - complexity 73
- `computeLayerDrift` (src/map/layer-drift.ts) - complexity 67
- `runPopulate` (src/cli/populate.ts) - complexity 64
- `ASTElementScanner.visitNode` (src/analyzer/ast-element-scanner.ts) - complexity 62
- `classifyMethodCall` (src/pipeline/call-resolver.ts) - complexity 62
- `computeApiSurface` (src/map/api-surface.ts) - complexity 61
- `computeEngineeringMetrics` (src/map/engineering-metrics.ts) - complexity 58
- `IndexingOrchestrator.indexCodebase` (src/integration/rag/indexing-orchestrator.ts) - complexity 52
- `buildRagTools` (src/cli/mcp/rag-tools.ts) - complexity 50

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
