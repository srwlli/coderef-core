# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-07-20  
**Nodes:** 3,613 elements  
**Edges:** 41,011 dependencies  
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
| **Total Elements** | 3,613 |
| **Total Dependencies** | 41,011 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 32042 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=e343c184-4fbd-51a3-b8a7-9ec6e6865960 --> `LRUCache.has` | **272** | method | `src/scanner/lru-cache.ts` |
| 3 | <!-- coderef:uuid=7c9b7ea0-070c-5509-a24a-f12fbfb87353 --> `scanCurrentElements` | **136** | function | `src/scanner/scanner.ts` |
| 4 | <!-- coderef:uuid=eb90e629-6848-5f36-98bc-ea35b7f360f7 --> `normalizeSlashes` | **124** | function | `src/utils/path-normalize.ts` |
| 5 | <!-- coderef:uuid=72ab7960-d8ab-583c-adab-9d2b68c634db --> `PipelineOrchestrator.run` | **87** | method | `src/pipeline/orchestrator.ts` |
| 6 | <!-- coderef:uuid=c9ce9b7a-50d6-590f-b659-a3f451440d57 --> `GrammarRegistry.getParser` | **82** | method | `src/pipeline/grammar-registry.ts` |
| 7 | <!-- coderef:uuid=83d416a5-ec82-56cc-bc52-fef76fccda8e --> `CodeRefParser.parse` | **63** | method | `src/parser/parser.ts` |
| 8 | <!-- coderef:uuid=429df1ad-c667-5341-9dc8-e5759fb8c61b --> `PipelineOrchestrator` | **53** | class | `src/pipeline/orchestrator.ts` |
| 9 | <!-- coderef:uuid=74b8c20d-39d9-5a27-a13a-2b27acc3e5b3 --> `createCodeRefId` | **49** | function | `src/utils/coderef-id.ts` |
| 10 | <!-- coderef:uuid=b738b18c-e096-5182-acbb-c31fd523b354 --> `isLineCommented` | **49** | function | `src/scanner/scanner.ts` |
| 11 | <!-- coderef:uuid=7573856d-ec73-500e-9f42-25870e93f875 --> `validatePipelineState` | **47** | function | `src/pipeline/output-validator.ts` |
| 12 | <!-- coderef:uuid=fe900d90-9366-5d1b-a2b5-bfd76a1a30a2 --> `resolveCalls` | **45** | function | `src/pipeline/call-resolver.ts` |
| 13 | <!-- coderef:uuid=25841051-3294-5338-acf9-fc867c0520d4 --> `CanonicalGraphQuery.resolve` | **42** | method | `src/query/canonical-graph.ts` |
| 14 | <!-- coderef:uuid=d7282a25-1191-5007-92fc-0f5e5d833e73 --> `info` | **41** | function | `demo-all-modules.ts` |
| 15 | <!-- coderef:uuid=be01ff49-2bc6-5cf4-870a-b2f67217c4eb --> `paginate` | **39** | function | `src/cli/mcp-response-format.ts` |
| 16 | <!-- coderef:uuid=f3051231-8adc-55b8-8430-5d9b96e1ef6f --> `buildToolHandlers` | **36** | function | `src/cli/coderef-mcp-server.ts` |
| 17 | <!-- coderef:uuid=5a2d04ee-07fb-585b-8eee-5f1d871bc806 --> `perRepo` | **36** | function | `src/cli/coderef-mcp-server.ts` |
| 18 | <!-- coderef:uuid=147c2070-901e-55b6-bb16-bfe4b8853a3b --> `projectMapData` | **34** | function | `src/map/project-map-data.ts` |
| 19 | <!-- coderef:uuid=ba4fd2dc-1b4b-532a-a749-a14b95e7da82 --> `IndexingOrchestrator.indexCodebase` | **33** | method | `src/integration/rag/indexing-orchestrator.ts` |
| 20 | <!-- coderef:uuid=ad6ce698-8098-5469-97b1-4743111af82d --> `classifyEdgeConfidence` | **32** | function | `src/pipeline/edge-confidence.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=d065bcd4-af5d-58b5-a0d2-42b072429de6 --> `ASTElementScanner.clearCache` | method | `src/analyzer/ast-element-scanner.ts` | 1 |
| <!-- coderef:uuid=1516f911-15f7-5413-b0e4-144894870239 --> `ASTElementScanner.getCacheStats` | method | `src/analyzer/ast-element-scanner.ts` | 2 |
| <!-- coderef:uuid=7166723f-7218-59ee-a49f-900e2b74225b --> `DynamicImportDetector.clearCache` | method | `src/analyzer/dynamic-import-detector.ts` | 1 |
| <!-- coderef:uuid=8ab8c06d-0293-58ae-8250-145e3fe62b60 --> `EntryPointDetector.detect` | method | `src/analyzer/entry-detector.ts` | 7 |
| <!-- coderef:uuid=58bcd85d-2006-5657-9505-9c45e06f8f91 --> `JSCallDetector.clearCache` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=c6c124e2-e097-5a3f-bf5f-5a5a5d9e4591 --> `MiddlewareDetector.detect` | method | `src/analyzer/middleware-detector.ts` | 9 |
| <!-- coderef:uuid=f408aa38-6b5f-593b-bf63-2d4f907db63b --> `MigrationRouteAnalyzer.detectAffectedCallers` | method | `src/analyzer/migration-route-analyzer.ts` | 4 |
| <!-- coderef:uuid=a9eaede2-b1df-580d-a770-7cd70d9453df --> `IncrementalCache.load` | method | `src/cache/incremental-cache.ts` | 6 |
| <!-- coderef:uuid=2d54a0ab-cf6e-53dc-b2d6-63f82884c5dc --> `IncrementalCache.save` | method | `src/cache/incremental-cache.ts` | 8 |
| <!-- coderef:uuid=5bc3385d-fdf0-5ef4-891d-89062bc53730 --> `IncrementalCache.clear` | method | `src/cache/incremental-cache.ts` | 3 |
| <!-- coderef:uuid=1cc70c5f-a36d-51ef-9620-b24870e33d6c --> `RootResolutionError` | class | `src/cli/coderef-mcp-server.ts` | 1 |
| <!-- coderef:uuid=0cce8982-c8dc-5803-bfa8-50500c55c2d6 --> `DryRunSemanticOrchestrator.processProject` | method | `src/cli/semantic-integration.ts` | 2 |
| <!-- coderef:uuid=7d000b4c-2792-5edc-814e-82074f0d9c60 --> `DryRunSemanticOrchestrator.processFile` | method | `src/cli/semantic-integration.ts` | 2 |
| <!-- coderef:uuid=0fcada70-9c68-5d06-9fd0-42918191b719 --> `AgenticFormatter.formatAsSummary` | method | `src/context/agentic-formatter.ts` | 5 |
| <!-- coderef:uuid=6cc35644-ceae-566c-9ac4-37c129a84235 --> `BreakingChangeDetector.compareSignatures` | method | `src/context/breaking-change-detector/index.ts` | 1 |

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
