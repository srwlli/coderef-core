---
subject: Dependency Relationships — @coderef/core
status: generated
generator: scripts/doc-gen/generate-relationships-md.js
related_files:
  - __tests__/map/dashboard-asset.test.ts
  - src/cli/coderef-mcp-server.ts
  - src/cli/mcp-response-format.ts
  - src/map/project-map-data.ts
  - src/parser/parser.ts
  - src/pipeline/call-resolver.ts
  - src/pipeline/grammar-registry.ts
  - src/pipeline/graph-builder.ts
  - src/pipeline/import-resolver.ts
  - src/pipeline/orchestrator.ts
  - src/pipeline/output-validator.ts
  - src/query/canonical-graph.ts
  - src/query/clones.ts
  - src/scanner/lru-cache.ts
  - src/scanner/scanner.ts
  - src/utils/coderef-id.ts
  - src/utils/path-normalize.ts
---

# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-08-01  
**Nodes:** 4,925 elements  
**Edges:** 48,851 dependencies  
<!-- coderef:uuid=relationships-root -->

---

## Overview

This document visualizes the dependency graph between code elements. Understanding relationships helps with:

- **Impact analysis** - What breaks if I change X?
- **Refactoring planning** - Which dependencies to decouple?
- **Architecture reviews** - Identifying circular dependencies
- **Testing strategy** - Finding high-impact test paths

---

## Dependency Statistics

| Metric | Value |
|--------|-------|
| **Total Elements** | 4,925 |
| **Total Dependencies** | 48,851 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 36126 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=e343c184-4fbd-51a3-b8a7-9ec6e6865960 --> `LRUCache.has` | **323** | method | `src/scanner/lru-cache.ts` |
| 3 | <!-- coderef:uuid=974d7182-13e9-59bb-ad36-92fb29bf6599 --> `normalizeSlashes` | **166** | function | `src/utils/path-normalize.ts` |
| 4 | <!-- coderef:uuid=7c9b7ea0-070c-5509-a24a-f12fbfb87353 --> `scanCurrentElements` | **157** | function | `src/scanner/scanner.ts` |
| 5 | <!-- coderef:uuid=8a44c798-3f40-589a-9ab3-3a4d1f50c401 --> `PipelineOrchestrator.run` | **105** | method | `src/pipeline/orchestrator.ts` |
| 6 | <!-- coderef:uuid=c9ce9b7a-50d6-590f-b659-a3f451440d57 --> `GrammarRegistry.getParser` | **86** | method | `src/pipeline/grammar-registry.ts` |
| 7 | <!-- coderef:uuid=ac3c6070-2c26-5a42-9d3d-f08685e77536 --> `PipelineOrchestrator` | **73** | class | `src/pipeline/orchestrator.ts` |
| 8 | <!-- coderef:uuid=eb0ae620-998e-5539-8d6d-165f16d60ad6 --> `constructGraph` | **72** | function | `src/pipeline/graph-builder.ts` |
| 9 | <!-- coderef:uuid=4e6f76b2-127f-5c10-8703-9ad8a88c570e --> `resolveCalls` | **67** | function | `src/pipeline/call-resolver.ts` |
| 10 | <!-- coderef:uuid=a59261d2-ac9d-5372-ab0d-e998c54a3516 --> `buildToolHandlers` | **64** | function | `src/cli/coderef-mcp-server.ts` |
| 11 | <!-- coderef:uuid=83d416a5-ec82-56cc-bc52-fef76fccda8e --> `CodeRefParser.parse` | **62** | method | `src/parser/parser.ts` |
| 12 | <!-- coderef:uuid=74b8c20d-39d9-5a27-a13a-2b27acc3e5b3 --> `createCodeRefId` | **55** | function | `src/utils/coderef-id.ts` |
| 13 | <!-- coderef:uuid=b738b18c-e096-5182-acbb-c31fd523b354 --> `isLineCommented` | **52** | function | `src/scanner/scanner.ts` |
| 14 | <!-- coderef:uuid=900f8e6b-37b8-5df8-954b-08ee627dce17 --> `validatePipelineState` | **51** | function | `src/pipeline/output-validator.ts` |
| 15 | <!-- coderef:uuid=25841051-3294-5338-acf9-fc867c0520d4 --> `CanonicalGraphQuery.resolve` | **50** | method | `src/query/canonical-graph.ts` |
| 16 | <!-- coderef:uuid=7ca2a922-3a5a-5135-82f8-2cffe26e78e7 --> `projectMapData` | **47** | function | `src/map/project-map-data.ts` |
| 17 | <!-- coderef:uuid=951b3121-ba20-5c7e-aeac-3b5cba73705b --> `resolveImports` | **47** | function | `src/pipeline/import-resolver.ts` |
| 18 | <!-- coderef:uuid=2a7de8b0-d8ab-5529-be62-c38d881394c4 --> `computeCloneSurface` | **46** | function | `src/query/clones.ts` |
| 19 | <!-- coderef:uuid=e3d1783a-5c56-5880-b541-0e7088902fdd --> `paginate` | **44** | function | `src/cli/mcp-response-format.ts` |
| 20 | <!-- coderef:uuid=e861d20f-9331-557a-ab74-f2ce5e2736e5 --> `renderDashboard` | **42** | function | `__tests__/map/dashboard-asset.test.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=d065bcd4-af5d-58b5-a0d2-42b072429de6 --> `ASTElementScanner.clearCache` | method | `src/analyzer/ast-element-scanner.ts` | 1 |
| <!-- coderef:uuid=1516f911-15f7-5413-b0e4-144894870239 --> `ASTElementScanner.getCacheStats` | method | `src/analyzer/ast-element-scanner.ts` | 2 |
| <!-- coderef:uuid=7166723f-7218-59ee-a49f-900e2b74225b --> `DynamicImportDetector.clearCache` | method | `src/analyzer/dynamic-import-detector.ts` | 1 |
| <!-- coderef:uuid=07a13823-ac53-5f41-b4bc-7bbdf904e3fd --> `JSCallDetector.clearCache` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=c6c124e2-e097-5a3f-bf5f-5a5a5d9e4591 --> `MiddlewareDetector.detect` | method | `src/analyzer/middleware-detector.ts` | 9 |
| <!-- coderef:uuid=f408aa38-6b5f-593b-bf63-2d4f907db63b --> `MigrationRouteAnalyzer.detectAffectedCallers` | method | `src/analyzer/migration-route-analyzer.ts` | 4 |
| <!-- coderef:uuid=2d54a0ab-cf6e-53dc-b2d6-63f82884c5dc --> `IncrementalCache.save` | method | `src/cache/incremental-cache.ts` | 8 |
| <!-- coderef:uuid=5bc3385d-fdf0-5ef4-891d-89062bc53730 --> `IncrementalCache.clear` | method | `src/cache/incremental-cache.ts` | 3 |
| <!-- coderef:uuid=6044dc26-95ed-5ead-a9cb-bee743ffa169 --> `DryRunSemanticOrchestrator.processProject` | method | `src/cli/semantic-integration.ts` | 2 |
| <!-- coderef:uuid=0e71c953-321e-54c1-be96-8e77984611c7 --> `DryRunSemanticOrchestrator.processFile` | method | `src/cli/semantic-integration.ts` | 2 |
| <!-- coderef:uuid=d56f42a0-8836-5a38-8a0c-79cb92e98fd9 --> `AgenticFormatter.formatContext` | method | `src/context/agentic-formatter.ts` | 19 |
| <!-- coderef:uuid=a6d6119a-7ade-561d-b825-376fac0336cf --> `AgenticFormatter.formatAsJSON` | method | `src/context/agentic-formatter.ts` | 1 |
| <!-- coderef:uuid=0fcada70-9c68-5d06-9fd0-42918191b719 --> `AgenticFormatter.formatAsSummary` | method | `src/context/agentic-formatter.ts` | 5 |
| <!-- coderef:uuid=6cc35644-ceae-566c-9ac4-37c129a84235 --> `BreakingChangeDetector.compareSignatures` | method | `src/context/breaking-change-detector/index.ts` | 1 |
| <!-- coderef:uuid=b8b3b779-1f79-581c-9ec5-dabb1c9d85d1 --> `BreakingChangeDetector.extractCallContext` | method | `src/context/breaking-change-detector/index.ts` | 1 |

---

## Module Relationship Diagram

*High-level dependency flow between major modules*

```mermaid
graph TD
    A[Scanner Module] --> B[Analyzer Module]
    B --> C[Generator Module]
    C --> D[Output Files]
    B --> E[Query Engine]
    E --> F[Search Results]
    
    style A fill:#f9f,stroke:#333
    style B fill:#bbf,stroke:#333
    style C fill:#bfb,stroke:#333
```

*Note: For full interactive dependency visualization, use the .coderef/graph.json file with graph visualization tools like Cytoscape, Gephi, or D3.js.*

---

## Sample Dependency Chains

### Example: Scanner → Output Flow

```
scanCurrentElements() 
  → scanFilesWithAST()
    → typescript.parse()
      → ASTElementScanner.visit()
        → element extraction
          → context-generator.ts
            → context.json
```

### Example: API Route Detection

```
Next.js Route File
  → processNextJsRoute()
    → extractRouteConfig()
      → validateRoute()
        → route-normalizer.ts
          → normalized output
```

---

## Using This Data

### For Refactoring

1. Identify the element you want to refactor
2. Check its dependents in this document
3. Plan migration strategy for each dependent
4. Update tests that mock the element

### For Debugging

1. Find the failing function in the graph
2. Trace its dependencies backward
3. Check if any upstream dependency changed
4. Validate data flow through the chain

### For Architecture Reviews

1. Look for circular dependency patterns
2. Identify modules with excessive coupling
3. Find orphaned code (no references)
4. Spot missing abstraction layers

---

## Circular Dependency Detection

To check for circular dependencies:

```bash
# Using graph.json with a cycle detection script
node scripts/analyze-cycles.js
```

Current status: No cycles detected in core modules.

---

*This document is auto-generated from .coderef/graph.json. Do not edit manually.*
