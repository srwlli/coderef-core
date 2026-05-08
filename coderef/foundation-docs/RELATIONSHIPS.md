# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-05-08  
**Nodes:** 2,777 elements  
**Edges:** 28,906 dependencies  
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
| **Total Elements** | 2,777 |
| **Total Dependencies** | 28,906 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 25427 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=868a63b1-05b5-5613-ad85-a7451936e6f1 --> `log` | **50** | function | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` |
| 3 | <!-- coderef:uuid=e14841ca-2093-5f77-b07d-c00a066e2359 --> `log` | **42** | function | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` |
| 4 | <!-- coderef:uuid=268f2964-85c1-5006-8439-fe9ac9d294b6 --> `info` | **41** | function | `demo-all-modules.ts` |
| 5 | <!-- coderef:uuid=edb1d9b6-a6bb-5714-9916-a022e26b551d --> `log` | **33** | function | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` |
| 6 | <!-- coderef:uuid=f02d857a-9545-573f-8045-e2e9af265e8b --> `validatePipelineState` | **31** | function | `src/pipeline/output-validator.ts` |
| 7 | <!-- coderef:uuid=e2f84f51-bf37-59f8-b8d0-744fd426f068 --> `log` | **30** | function | `autoresearch/scanner-quality/scripts/verify_test_linkage.py` |
| 8 | <!-- coderef:uuid=da20236b-578e-5de3-a020-d295c2cddc52 --> `createSearchResult` | **29** | function | `src/integration/rag/__tests__/graph-reranker.test.ts` |
| 9 | <!-- coderef:uuid=5721a01d-38ea-5c09-b801-c557c8962a97 --> `createCodeRefId` | **29** | function | `src/utils/coderef-id.ts` |
| 10 | <!-- coderef:uuid=847dd226-ec33-567b-b5bd-ecb4f2787956 --> `createSampleReferences` | **29** | function | `__tests__/indexer.test.ts` |
| 11 | <!-- coderef:uuid=f93500f7-a663-54e0-aa07-c5df2fbae9ba --> `log` | **27** | function | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` |
| 12 | <!-- coderef:uuid=9b9b0043-87e1-546e-86eb-98334c48d117 --> `createTestFile` | **26** | function | `__tests__/js-call-detector.test.ts` |
| 13 | <!-- coderef:uuid=062a666c-6286-5d75-91e4-34f55d82b71b --> `log` | **26** | function | `autoresearch/scanner-quality/scripts/verify_context_signal.py` |
| 14 | <!-- coderef:uuid=afee92f1-cbe4-5328-8581-b8cfaf62cad9 --> `success` | **25** | function | `demo-all-modules.ts` |
| 15 | <!-- coderef:uuid=39930b31-b3d1-5adb-bdc0-14ea9aa4748c --> `recordTest` | **24** | function | `__tests__/integration.test.ts` |
| 16 | <!-- coderef:uuid=6b9619d1-c763-5755-b509-9021fe2830f7 --> `log` | **24** | function | `autoresearch/scanner-quality/scripts/verify_element_classification.py` |
| 17 | <!-- coderef:uuid=99b23b68-9ba6-50b8-8624-d9125a0561c4 --> `log` | **24** | function | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` |
| 18 | <!-- coderef:uuid=c4d64d54-1437-55e1-8c7a-dca8a4630f31 --> `createMockSource` | **23** | function | `src/integration/rag/__tests__/confidence-scorer.test.ts` |
| 19 | <!-- coderef:uuid=99bead25-97e5-5ab8-8fe9-ab931636db19 --> `createSampleRef` | **23** | function | `__tests__/indexer.test.ts` |
| 20 | <!-- coderef:uuid=6c548b0a-acb3-5d7a-9cb7-e3f07ad4ec83 --> `buildDependencyGraph` | **21** | function | `src/fileGeneration/buildDependencyGraph.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=b0a5c4c4-46a5-56c7-8ce5-67bd1d3d5820 --> `convertGraphToElements` | function | `src/adapter/graph-to-elements.ts` | 22 |
| <!-- coderef:uuid=de2d81fa-1e3f-5589-9233-0b17f48b7636 --> `getConversionStats` | function | `src/adapter/graph-to-elements.ts` | 2 |
| <!-- coderef:uuid=17d5d861-61c2-5812-bb49-2f179b26d950 --> `AnalyzerService.analyze` | method | `src/analyzer/analyzer-service.ts` | 6 |
| <!-- coderef:uuid=48ca1a15-79aa-576f-8b89-d973fd7977f1 --> `AnalyzerService.getCallers` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=835e871d-5fd2-5559-8d8d-a6aba959a871 --> `AnalyzerService.getCallees` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=915d095e-b41d-527c-b83f-79f86ab8c821 --> `AnalyzerService.getDependents` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=200effa5-355d-5b50-84d2-89b3cc09fe46 --> `AnalyzerService.getDependencies` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=24e5a6f1-a5b4-59be-a304-fb01d6122ab5 --> `AnalyzerService.traverse` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=f6a6f818-eeb0-575e-a5b8-c25fa44a3cc9 --> `AnalyzerService.detectCircularDependencies` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=a261375f-093a-540d-aea2-f8710df293f5 --> `AnalyzerService.findShortestPath` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=528dabb4-6771-5c80-b7ec-a3b7cd8d2549 --> `AnalyzerService.findAllPaths` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=2161de9e-6dce-5624-855c-36a8eadc2b9e --> `AnalyzerService.clearCache` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=4b43c0ef-a7e6-5d83-b494-2b4a05d8b751 --> `AnalyzerService.exportGraphAsJSON` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=5b11245d-f4bf-576c-b5ea-0b811fa69761 --> `AnalyzerService.saveGraph` | method | `src/analyzer/analyzer-service.ts` | 6 |
| <!-- coderef:uuid=7b4ddd21-4dce-55e5-a9c1-9e5e0343f6f7 --> `AnalyzerService.loadGraph` | method | `src/analyzer/analyzer-service.ts` | 5 |

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
