# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-07-03  
**Nodes:** 2,771 elements  
**Edges:** 29,123 dependencies  
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
| **Total Elements** | 2,771 |
| **Total Dependencies** | 29,123 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 23969 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=ec329b04-7830-5162-b84f-fccf7cdcf863 --> `scanCurrentElements` | **136** | function | `src/scanner/scanner.ts` |
| 3 | <!-- coderef:uuid=a0253d1b-90c1-5017-b2da-13251a227d7f --> `normalizeSlashes` | **86** | function | `src/utils/path-normalize.ts` |
| 4 | <!-- coderef:uuid=1a648c34-3392-56cc-a393-89f0709234a2 --> `PipelineOrchestrator` | **51** | class | `src/pipeline/orchestrator.ts` |
| 5 | <!-- coderef:uuid=23c374e5-af97-5020-b41d-fc475c587b14 --> `isLineCommented` | **49** | function | `src/scanner/scanner.ts` |
| 6 | <!-- coderef:uuid=c49914c7-5e1e-5b8f-b679-5e7f2337dd15 --> `createCodeRefId` | **46** | function | `src/utils/coderef-id.ts` |
| 7 | <!-- coderef:uuid=95700825-12ef-59b5-9d78-faf1c3627d0e --> `validatePipelineState` | **44** | function | `src/pipeline/output-validator.ts` |
| 8 | <!-- coderef:uuid=90c7e14d-350e-50a0-8dff-45ad7d746870 --> `info` | **41** | function | `demo-all-modules.ts` |
| 9 | <!-- coderef:uuid=2693449a-b8ad-526d-b42b-23955d809203 --> `resolveCalls` | **30** | function | `src/pipeline/call-resolver.ts` |
| 10 | <!-- coderef:uuid=274a5a75-6aeb-5d30-a5e0-2e29d427885b --> `resolveImports` | **29** | function | `src/pipeline/import-resolver.ts` |
| 11 | <!-- coderef:uuid=cff5bd37-e122-5c29-8b73-2760959d3367 --> `createSearchResult` | **29** | function | `src/integration/rag/__tests__/graph-reranker.test.ts` |
| 12 | <!-- coderef:uuid=14b8962e-1ffb-5d14-85ff-4bb3f2b784c4 --> `createSampleReferences` | **29** | function | `__tests__/indexer.test.ts` |
| 13 | <!-- coderef:uuid=8b715f0e-d5ba-5336-b4b4-2242465d299d --> `createMockEnvironment` | **27** | function | `__tests__/generators/helpers.ts` |
| 14 | <!-- coderef:uuid=04e18053-1600-56fc-9dcd-e699a1bbf607 --> `parseHeader` | **26** | function | `src/pipeline/semantic-header-parser.ts` |
| 15 | <!-- coderef:uuid=0997f717-4d36-5e1a-81aa-17d33b4d4c1e --> `createTestFile` | **26** | function | `__tests__/js-call-detector.test.ts` |
| 16 | <!-- coderef:uuid=301fa8b3-1275-5c74-a128-ba1f2d655563 --> `cleanupEnvironment` | **25** | function | `__tests__/generators/helpers.ts` |
| 17 | <!-- coderef:uuid=dfa22ade-dbc6-5686-88e3-7bdb7c42a786 --> `buildDependencyGraph` | **24** | function | `src/fileGeneration/buildDependencyGraph.ts` |
| 18 | <!-- coderef:uuid=2b437274-d9d2-5e50-893b-5616296c8e28 --> `recordTest` | **24** | function | `__tests__/integration.test.ts` |
| 19 | <!-- coderef:uuid=d7daa7ae-d748-50d6-b6c7-acfbbe41787a --> `createMockSource` | **23** | function | `src/integration/rag/__tests__/confidence-scorer.test.ts` |
| 20 | <!-- coderef:uuid=4ad42708-6dea-5f87-bdf9-b73ec800dd1d --> `createSampleRef` | **23** | function | `__tests__/indexer.test.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=a3c3c737-2722-5318-8dfd-cc5b0663e5af --> `ASTElementScanner.clearCache` | method | `src/analyzer/ast-element-scanner.ts` | 1 |
| <!-- coderef:uuid=577a95f7-ecd1-5cba-a504-f2293840e160 --> `ASTElementScanner.getCacheStats` | method | `src/analyzer/ast-element-scanner.ts` | 2 |
| <!-- coderef:uuid=7a2b3017-b073-54ae-9f5c-95d6a50f18ec --> `DynamicImportDetector.buildDynamicCallEdges` | method | `src/analyzer/dynamic-import-detector.ts` | 3 |
| <!-- coderef:uuid=22c5e548-667a-57c8-9afa-6f47bae198c5 --> `DynamicImportDetector.clearCache` | method | `src/analyzer/dynamic-import-detector.ts` | 1 |
| <!-- coderef:uuid=522aebd7-20da-54ca-aa2b-06beebec90fb --> `EntryPointDetector.detect` | method | `src/analyzer/entry-detector.ts` | 7 |
| <!-- coderef:uuid=a93707b7-4e6d-50d7-b212-5c1a64b8865b --> `JSCallDetector.getFileParameters` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=f0db6193-dc3a-51a4-b9a9-6a0c3133f923 --> `JSCallDetector.detectExports` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=8f502264-51ff-5a2a-ae66-3c36b18e3df1 --> `JSCallDetector.buildCallEdges` | method | `src/analyzer/js-call-detector/index.ts` | 1 |
| <!-- coderef:uuid=0d11be65-5200-570a-9918-cc3343340286 --> `JSCallDetector.analyzeCallPatterns` | method | `src/analyzer/js-call-detector/index.ts` | 1 |
| <!-- coderef:uuid=eca24071-8071-58f3-a3af-83cf71505c71 --> `JSCallDetector.detectElements` | method | `src/analyzer/js-call-detector/index.ts` | 2 |
| <!-- coderef:uuid=0ab07ce7-947e-5180-9bb1-27029b9d80bf --> `JSCallDetector.clearCache` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=59201e93-8f74-5121-a92d-26752498cfd9 --> `MiddlewareDetector.detect` | method | `src/analyzer/middleware-detector.ts` | 9 |
| <!-- coderef:uuid=f2df7d51-4ef0-5046-ab4e-2f68d20002ba --> `MigrationRouteAnalyzer.findRoutesByFramework` | method | `src/analyzer/migration-route-analyzer.ts` | 2 |
| <!-- coderef:uuid=dc7a5350-a03c-52e2-93c8-c2c3d8558554 --> `MigrationRouteAnalyzer.exportForMigration` | method | `src/analyzer/migration-route-analyzer.ts` | 3 |
| <!-- coderef:uuid=3d538ad2-5810-5cc8-a859-8bab4e06efbe --> `MigrationRouteAnalyzer.detectAffectedCallers` | method | `src/analyzer/migration-route-analyzer.ts` | 4 |

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
