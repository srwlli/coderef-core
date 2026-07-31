# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-07-31  
**Nodes:** 3,614 elements  
**Edges:** 41,955 dependencies  
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
| **Total Elements** | 3,614 |
| **Total Dependencies** | 41,955 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 32686 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=e343c184-4fbd-51a3-b8a7-9ec6e6865960 --> `LRUCache.has` | **275** | method | `src/scanner/lru-cache.ts` |
| 3 | <!-- coderef:uuid=7c9b7ea0-070c-5509-a24a-f12fbfb87353 --> `scanCurrentElements` | **136** | function | `src/scanner/scanner.ts` |
| 4 | <!-- coderef:uuid=974d7182-13e9-59bb-ad36-92fb29bf6599 --> `normalizeSlashes` | **134** | function | `src/utils/path-normalize.ts` |
| 5 | <!-- coderef:uuid=35214053-3730-546e-90aa-3a8a46e6fb3a --> `PipelineOrchestrator.run` | **91** | method | `src/pipeline/orchestrator.ts` |
| 6 | <!-- coderef:uuid=c9ce9b7a-50d6-590f-b659-a3f451440d57 --> `GrammarRegistry.getParser` | **86** | method | `src/pipeline/grammar-registry.ts` |
| 7 | <!-- coderef:uuid=83d416a5-ec82-56cc-bc52-fef76fccda8e --> `CodeRefParser.parse` | **64** | method | `src/parser/parser.ts` |
| 8 | <!-- coderef:uuid=5ce9ff8c-3e1e-5f30-a6b8-b8319561ab40 --> `PipelineOrchestrator` | **54** | class | `src/pipeline/orchestrator.ts` |
| 9 | <!-- coderef:uuid=74b8c20d-39d9-5a27-a13a-2b27acc3e5b3 --> `createCodeRefId` | **49** | function | `src/utils/coderef-id.ts` |
| 10 | <!-- coderef:uuid=b738b18c-e096-5182-acbb-c31fd523b354 --> `isLineCommented` | **49** | function | `src/scanner/scanner.ts` |
| 11 | <!-- coderef:uuid=7573856d-ec73-500e-9f42-25870e93f875 --> `validatePipelineState` | **47** | function | `src/pipeline/output-validator.ts` |
| 12 | <!-- coderef:uuid=2a7de8b0-d8ab-5529-be62-c38d881394c4 --> `computeCloneSurface` | **45** | function | `src/query/clones.ts` |
| 13 | <!-- coderef:uuid=fe900d90-9366-5d1b-a2b5-bfd76a1a30a2 --> `resolveCalls` | **45** | function | `src/pipeline/call-resolver.ts` |
| 14 | <!-- coderef:uuid=abd047ac-43e2-585a-81c6-5aeaa6ab9e63 --> `buildToolHandlers` | **40** | function | `src/cli/coderef-mcp-server.ts` |
| 15 | <!-- coderef:uuid=e3d1783a-5c56-5880-b541-0e7088902fdd --> `paginate` | **39** | function | `src/cli/mcp-response-format.ts` |
| 16 | <!-- coderef:uuid=25841051-3294-5338-acf9-fc867c0520d4 --> `CanonicalGraphQuery.resolve` | **37** | method | `src/query/canonical-graph.ts` |
| 17 | <!-- coderef:uuid=8dfba766-17d6-5461-9110-d738bc43a24f --> `perRepo` | **36** | function | `src/cli/coderef-mcp-server.ts` |
| 18 | <!-- coderef:uuid=ad6ce698-8098-5469-97b1-4743111af82d --> `classifyEdgeConfidence` | **34** | function | `src/pipeline/edge-confidence.ts` |
| 19 | <!-- coderef:uuid=fcf5f484-a4f8-535d-8985-558febf4f0ae --> `projectMapData` | **34** | function | `src/map/project-map-data.ts` |
| 20 | <!-- coderef:uuid=ba4fd2dc-1b4b-532a-a749-a14b95e7da82 --> `IndexingOrchestrator.indexCodebase` | **33** | method | `src/integration/rag/indexing-orchestrator.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=d065bcd4-af5d-58b5-a0d2-42b072429de6 --> `ASTElementScanner.clearCache` | method | `src/analyzer/ast-element-scanner.ts` | 1 |
| <!-- coderef:uuid=1516f911-15f7-5413-b0e4-144894870239 --> `ASTElementScanner.getCacheStats` | method | `src/analyzer/ast-element-scanner.ts` | 2 |
| <!-- coderef:uuid=7166723f-7218-59ee-a49f-900e2b74225b --> `DynamicImportDetector.clearCache` | method | `src/analyzer/dynamic-import-detector.ts` | 1 |
| <!-- coderef:uuid=8ab8c06d-0293-58ae-8250-145e3fe62b60 --> `EntryPointDetector.detect` | method | `src/analyzer/entry-detector.ts` | 7 |
| <!-- coderef:uuid=07a13823-ac53-5f41-b4bc-7bbdf904e3fd --> `JSCallDetector.clearCache` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=c6c124e2-e097-5a3f-bf5f-5a5a5d9e4591 --> `MiddlewareDetector.detect` | method | `src/analyzer/middleware-detector.ts` | 9 |
| <!-- coderef:uuid=f408aa38-6b5f-593b-bf63-2d4f907db63b --> `MigrationRouteAnalyzer.detectAffectedCallers` | method | `src/analyzer/migration-route-analyzer.ts` | 4 |
| <!-- coderef:uuid=a9eaede2-b1df-580d-a770-7cd70d9453df --> `IncrementalCache.load` | method | `src/cache/incremental-cache.ts` | 6 |
| <!-- coderef:uuid=2d54a0ab-cf6e-53dc-b2d6-63f82884c5dc --> `IncrementalCache.save` | method | `src/cache/incremental-cache.ts` | 8 |
| <!-- coderef:uuid=5bc3385d-fdf0-5ef4-891d-89062bc53730 --> `IncrementalCache.clear` | method | `src/cache/incremental-cache.ts` | 3 |
| <!-- coderef:uuid=7c582054-4237-5991-87d1-ee53879f715e --> `RootResolutionError` | class | `src/cli/coderef-mcp-server.ts` | 1 |
| <!-- coderef:uuid=6044dc26-95ed-5ead-a9cb-bee743ffa169 --> `DryRunSemanticOrchestrator.processProject` | method | `src/cli/semantic-integration.ts` | 2 |
| <!-- coderef:uuid=0e71c953-321e-54c1-be96-8e77984611c7 --> `DryRunSemanticOrchestrator.processFile` | method | `src/cli/semantic-integration.ts` | 2 |
| <!-- coderef:uuid=d56f42a0-8836-5a38-8a0c-79cb92e98fd9 --> `AgenticFormatter.formatContext` | method | `src/context/agentic-formatter.ts` | 19 |
| <!-- coderef:uuid=a6d6119a-7ade-561d-b825-376fac0336cf --> `AgenticFormatter.formatAsJSON` | method | `src/context/agentic-formatter.ts` | 1 |

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
