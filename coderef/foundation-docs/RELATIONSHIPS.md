# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-05-12  
**Nodes:** 2,791 elements  
**Edges:** 28,872 dependencies  
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
| **Total Elements** | 2,791 |
| **Total Dependencies** | 28,872 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 25380 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=65af4473-39e4-5a69-beb4-cf8820319c6e --> `log` | **50** | function | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` |
| 3 | <!-- coderef:uuid=204bf501-660f-5945-8111-823b13fc4f3a --> `log` | **42** | function | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` |
| 4 | <!-- coderef:uuid=268f2964-85c1-5006-8439-fe9ac9d294b6 --> `info` | **41** | function | `demo-all-modules.ts` |
| 5 | <!-- coderef:uuid=6ee0ce8b-b1bc-514a-a1a1-d54e5059bbd1 --> `log` | **33** | function | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` |
| 6 | <!-- coderef:uuid=288a65d9-ed12-575a-b921-931ad168acdf --> `validatePipelineState` | **31** | function | `src/pipeline/output-validator.ts` |
| 7 | <!-- coderef:uuid=5430c0c9-99c8-5826-baf8-5e395dc43866 --> `log` | **30** | function | `autoresearch/scanner-quality/scripts/verify_test_linkage.py` |
| 8 | <!-- coderef:uuid=da20236b-578e-5de3-a020-d295c2cddc52 --> `createSearchResult` | **29** | function | `src/integration/rag/__tests__/graph-reranker.test.ts` |
| 9 | <!-- coderef:uuid=d3637116-82ff-5bf5-89d4-1377140abb71 --> `createCodeRefId` | **29** | function | `src/utils/coderef-id.ts` |
| 10 | <!-- coderef:uuid=847dd226-ec33-567b-b5bd-ecb4f2787956 --> `createSampleReferences` | **29** | function | `__tests__/indexer.test.ts` |
| 11 | <!-- coderef:uuid=c08869e6-da17-57cc-aaa0-412fa871bde8 --> `log` | **27** | function | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` |
| 12 | <!-- coderef:uuid=9b9b0043-87e1-546e-86eb-98334c48d117 --> `createTestFile` | **26** | function | `__tests__/js-call-detector.test.ts` |
| 13 | <!-- coderef:uuid=8cdc444c-6d88-5bd6-a67b-dc7254a14d33 --> `log` | **26** | function | `autoresearch/scanner-quality/scripts/verify_context_signal.py` |
| 14 | <!-- coderef:uuid=afee92f1-cbe4-5328-8581-b8cfaf62cad9 --> `success` | **25** | function | `demo-all-modules.ts` |
| 15 | <!-- coderef:uuid=39930b31-b3d1-5adb-bdc0-14ea9aa4748c --> `recordTest` | **24** | function | `__tests__/integration.test.ts` |
| 16 | <!-- coderef:uuid=9716b53a-24fd-5a32-be48-3b08eefccce7 --> `log` | **24** | function | `autoresearch/scanner-quality/scripts/verify_element_classification.py` |
| 17 | <!-- coderef:uuid=83c61037-83e1-5de3-acfd-e5790723d0f1 --> `log` | **24** | function | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` |
| 18 | <!-- coderef:uuid=c4d64d54-1437-55e1-8c7a-dca8a4630f31 --> `createMockSource` | **23** | function | `src/integration/rag/__tests__/confidence-scorer.test.ts` |
| 19 | <!-- coderef:uuid=99bead25-97e5-5ab8-8fe9-ab931636db19 --> `createSampleRef` | **23** | function | `__tests__/indexer.test.ts` |
| 20 | <!-- coderef:uuid=56caa3c4-7dba-5ec5-977f-437fc88a3889 --> `buildDependencyGraph` | **21** | function | `src/fileGeneration/buildDependencyGraph.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=049c6ede-6f66-5cb6-a358-2d5a60b40811 --> `convertGraphToElements` | function | `src/adapter/graph-to-elements.ts` | 22 |
| <!-- coderef:uuid=62b10327-7a94-5465-857c-98e56ed9ac2f --> `getConversionStats` | function | `src/adapter/graph-to-elements.ts` | 2 |
| <!-- coderef:uuid=46c34d4d-7bd2-51c2-95dd-f4fd5f947d9f --> `AnalyzerService.analyze` | method | `src/analyzer/analyzer-service.ts` | 6 |
| <!-- coderef:uuid=f376550a-1929-53ba-8db7-7f0a6981b8d2 --> `AnalyzerService.getCallers` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=f4bf65de-630f-57f0-afdd-ad11ee732a38 --> `AnalyzerService.getCallees` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=f6399034-2889-5f90-bffa-a93bb383874e --> `AnalyzerService.getDependents` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=110306fc-edc4-57db-8207-2e38ca8d2510 --> `AnalyzerService.getDependencies` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=851bf8f4-a85a-5e9e-8d8e-7986f5bd5df5 --> `AnalyzerService.traverse` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=05e45df4-5b95-58fd-8d58-531ae0f2915a --> `AnalyzerService.detectCircularDependencies` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=6279bb7a-076e-5f0f-b43c-d6850898f3e8 --> `AnalyzerService.findShortestPath` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=08b1fd71-dd27-5219-a5aa-70f808fc4870 --> `AnalyzerService.findAllPaths` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=bf0277cc-5749-523f-82d0-b1ff1f4e4f3b --> `AnalyzerService.clearCache` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=3d0f1627-1abe-5787-a522-3c28697c1519 --> `AnalyzerService.exportGraphAsJSON` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=ad40ce7b-b3db-57fe-b6e0-bb684fba57de --> `AnalyzerService.saveGraph` | method | `src/analyzer/analyzer-service.ts` | 6 |
| <!-- coderef:uuid=9dc273ee-925c-51fe-a7ef-78274a6d9d4f --> `AnalyzerService.loadGraph` | method | `src/analyzer/analyzer-service.ts` | 5 |

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
