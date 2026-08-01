---
subject: Complexity & Risk Analysis — @coderef/core
status: generated
generator: scripts/doc-gen/generate-hotspots-md.js
documents:
  - index.ts
  - src/analyzer/ast-element-scanner.ts
  - src/analyzer/frameworks/index.ts
  - src/analyzer/index.ts
  - src/analyzer/js-call-detector/index.ts
  - src/cli/coderef-analyze.ts
  - src/cli/coderef-map.ts
  - src/cli/coderef-mcp-server.ts
  - src/cli/detect-languages-cli.ts
  - src/cli/mcp/graph-tools.ts
  - src/cli/mcp/lookup-tools.ts
  - src/cli/mcp/map-tools.ts
  - src/cli/mcp/rag-tools.ts
  - src/cli/mcp/verify-tools.ts
  - src/cli/populate.ts
  - src/cli/rag-index.ts
  - src/cli/semantic-integration-cli.ts
  - src/context/breaking-change-detector/index.ts
  - src/context/index.ts
  - src/export/index.ts
documents_truncated: 20 of 44 analyzed files listed
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
| **Total Files** | 495 |
| **Total Elements** | 3,221 |
| **Total Lines** | 135,777 |
| **Entry Points** | 74 |
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
| 9 | <!-- coderef:uuid= --> `buildEdges` | 🔴 79 (Critical) | `src/pipeline/graph-builder.ts` | 0 dependents |
| 10 | <!-- coderef:uuid= --> `buildVerifyTools` | 🔴 78 (Critical) | `src/cli/mcp/verify-tools.ts` | 0 dependents |
| 11 | <!-- coderef:uuid= --> `runRagIndex` | 🔴 73 (Critical) | `src/cli/rag-index.ts` | 0 dependents |
| 12 | <!-- coderef:uuid= --> `computeLayerDrift` | 🔴 67 (Critical) | `src/map/layer-drift.ts` | 0 dependents |
| 13 | <!-- coderef:uuid= --> `runPopulate` | 🔴 64 (Critical) | `src/cli/populate.ts` | 0 dependents |
| 14 | <!-- coderef:uuid= --> `ASTElementScanner.visitNode` | 🔴 62 (Critical) | `src/analyzer/ast-element-scanner.ts` | 0 dependents |
| 15 | <!-- coderef:uuid= --> `computeApiSurface` | 🔴 61 (Critical) | `src/map/api-surface.ts` | 0 dependents |
| 16 | <!-- coderef:uuid= --> `computeEngineeringMetrics` | 🔴 58 (Critical) | `src/map/engineering-metrics.ts` | 0 dependents |
| 17 | <!-- coderef:uuid= --> `IndexingOrchestrator.indexCodebase` | 🔴 52 (Critical) | `src/integration/rag/indexing-orchestrator.ts` | 0 dependents |
| 18 | <!-- coderef:uuid= --> `buildRagTools` | 🔴 50 (Critical) | `src/cli/mcp/rag-tools.ts` | 0 dependents |
| 19 | <!-- coderef:uuid= --> `renderSkeletonMap` | 🟡 46 (High) | `src/map/skeleton-map.ts` | 0 dependents |
| 20 | <!-- coderef:uuid= --> `EmbeddingTextGenerator.generate` | 🟢 19 (Moderate) | `src/integration/rag/embedding-text-generator.ts` | 0 dependents |

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
| <!-- coderef:uuid= --> `main` | cli | `src/cli/coderef-analyze.ts` |
| <!-- coderef:uuid= --> `main` | cli | `src/cli/coderef-map.ts` |
| <!-- coderef:uuid= --> `main` | cli | `src/cli/coderef-mcp-server.ts` |

*... and 49 more entry points.*

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
- `buildEdges` (src/pipeline/graph-builder.ts) - complexity 79
- `buildVerifyTools` (src/cli/mcp/verify-tools.ts) - complexity 78
- `runRagIndex` (src/cli/rag-index.ts) - complexity 73
- `computeLayerDrift` (src/map/layer-drift.ts) - complexity 67
- `runPopulate` (src/cli/populate.ts) - complexity 64
- `ASTElementScanner.visitNode` (src/analyzer/ast-element-scanner.ts) - complexity 62
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
