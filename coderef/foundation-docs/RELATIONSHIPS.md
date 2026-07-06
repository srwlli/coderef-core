# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-07-06  
**Nodes:** 2,807 elements  
**Edges:** 30,112 dependencies  
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
| **Total Elements** | 2,807 |
| **Total Dependencies** | 30,112 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 24832 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=7c9b7ea0-070c-5509-a24a-f12fbfb87353 --> `scanCurrentElements` | **136** | function | `src/scanner/scanner.ts` |
| 3 | <!-- coderef:uuid=eb90e629-6848-5f36-98bc-ea35b7f360f7 --> `normalizeSlashes` | **91** | function | `src/utils/path-normalize.ts` |
| 4 | <!-- coderef:uuid=8e2c4a95-d041-56b3-aecc-c42aa8da876a --> `PipelineOrchestrator` | **53** | class | `src/pipeline/orchestrator.ts` |
| 5 | <!-- coderef:uuid=b738b18c-e096-5182-acbb-c31fd523b354 --> `isLineCommented` | **49** | function | `src/scanner/scanner.ts` |
| 6 | <!-- coderef:uuid=74b8c20d-39d9-5a27-a13a-2b27acc3e5b3 --> `createCodeRefId` | **46** | function | `src/utils/coderef-id.ts` |
| 7 | <!-- coderef:uuid=b471a0df-b45d-5c88-9f91-d8e9249bfff3 --> `validatePipelineState` | **44** | function | `src/pipeline/output-validator.ts` |
| 8 | <!-- coderef:uuid=d7282a25-1191-5007-92fc-0f5e5d833e73 --> `info` | **41** | function | `demo-all-modules.ts` |
| 9 | <!-- coderef:uuid=17efe7de-e6da-51ab-ac90-ac45e5ff8911 --> `resolveCalls` | **31** | function | `src/pipeline/call-resolver.ts` |
| 10 | <!-- coderef:uuid=bc54d2b9-7442-5249-a79e-8fbbb006e1a0 --> `resolveImports` | **30** | function | `src/pipeline/import-resolver.ts` |
| 11 | <!-- coderef:uuid=f18ac834-9ed0-5182-8928-d956b215cde9 --> `createSearchResult` | **29** | function | `src/integration/rag/__tests__/graph-reranker.test.ts` |
| 12 | <!-- coderef:uuid=4fc4f0b0-83b7-5f26-be88-7f31b8dd2bf5 --> `createSampleReferences` | **29** | function | `__tests__/indexer.test.ts` |
| 13 | <!-- coderef:uuid=8ab5018f-83dc-5253-a4a4-3c1d3cafc5ef --> `createMockEnvironment` | **27** | function | `__tests__/generators/helpers.ts` |
| 14 | <!-- coderef:uuid=feda1a0b-89f7-5ffd-9a13-4ccf71a3d664 --> `parseHeader` | **26** | function | `src/pipeline/semantic-header-parser.ts` |
| 15 | <!-- coderef:uuid=800d74c5-af16-5b87-9aa4-a6868bd3833c --> `createTestFile` | **26** | function | `__tests__/js-call-detector.test.ts` |
| 16 | <!-- coderef:uuid=afb22276-5b5b-5ce7-b30f-a1daa3a977dc --> `cleanupEnvironment` | **25** | function | `__tests__/generators/helpers.ts` |
| 17 | <!-- coderef:uuid=171200d2-031d-56a5-875b-231bd173e6e0 --> `buildDependencyGraph` | **24** | function | `src/fileGeneration/buildDependencyGraph.ts` |
| 18 | <!-- coderef:uuid=641dfdb1-4d55-59db-afbc-fbec2a527318 --> `recordTest` | **24** | function | `__tests__/integration.test.ts` |
| 19 | <!-- coderef:uuid=8f8b94bc-0021-5a6d-8356-3ca66c2ad852 --> `createMockSource` | **23** | function | `src/integration/rag/__tests__/confidence-scorer.test.ts` |
| 20 | <!-- coderef:uuid=7bd2d3ad-740d-5836-9c97-c0d744214e49 --> `createSampleRef` | **23** | function | `__tests__/indexer.test.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=d065bcd4-af5d-58b5-a0d2-42b072429de6 --> `ASTElementScanner.clearCache` | method | `src/analyzer/ast-element-scanner.ts` | 1 |
| <!-- coderef:uuid=1516f911-15f7-5413-b0e4-144894870239 --> `ASTElementScanner.getCacheStats` | method | `src/analyzer/ast-element-scanner.ts` | 2 |
| <!-- coderef:uuid=f16c5001-3e2f-51ab-88d2-fdb51a0a7729 --> `DynamicImportDetector.buildDynamicCallEdges` | method | `src/analyzer/dynamic-import-detector.ts` | 3 |
| <!-- coderef:uuid=7166723f-7218-59ee-a49f-900e2b74225b --> `DynamicImportDetector.clearCache` | method | `src/analyzer/dynamic-import-detector.ts` | 1 |
| <!-- coderef:uuid=8ab8c06d-0293-58ae-8250-145e3fe62b60 --> `EntryPointDetector.detect` | method | `src/analyzer/entry-detector.ts` | 7 |
| <!-- coderef:uuid=29c36cf8-ee73-504a-8297-e1da816378d0 --> `JSCallDetector.getFileParameters` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=f75dbfb7-3738-5a5f-aca8-b55f8f6f50f8 --> `JSCallDetector.detectExports` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=6b99ba96-b67e-5076-982b-63909cb9f18a --> `JSCallDetector.buildCallEdges` | method | `src/analyzer/js-call-detector/index.ts` | 1 |
| <!-- coderef:uuid=d98600e2-73ee-595a-a7f3-dbbb0d1e0b22 --> `JSCallDetector.analyzeCallPatterns` | method | `src/analyzer/js-call-detector/index.ts` | 1 |
| <!-- coderef:uuid=84d18a4f-c1b9-57ac-90ed-849988e512b7 --> `JSCallDetector.detectElements` | method | `src/analyzer/js-call-detector/index.ts` | 2 |
| <!-- coderef:uuid=58bcd85d-2006-5657-9505-9c45e06f8f91 --> `JSCallDetector.clearCache` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=c6c124e2-e097-5a3f-bf5f-5a5a5d9e4591 --> `MiddlewareDetector.detect` | method | `src/analyzer/middleware-detector.ts` | 9 |
| <!-- coderef:uuid=105947b8-2802-5a30-9e65-e4ad82ce223b --> `MigrationRouteAnalyzer.findRoutesByFramework` | method | `src/analyzer/migration-route-analyzer.ts` | 2 |
| <!-- coderef:uuid=19581f68-824d-5a58-b86f-fb39da8af978 --> `MigrationRouteAnalyzer.exportForMigration` | method | `src/analyzer/migration-route-analyzer.ts` | 3 |
| <!-- coderef:uuid=f408aa38-6b5f-593b-bf63-2d4f907db63b --> `MigrationRouteAnalyzer.detectAffectedCallers` | method | `src/analyzer/migration-route-analyzer.ts` | 4 |

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
