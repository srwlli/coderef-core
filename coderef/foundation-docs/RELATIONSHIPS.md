# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-06-12  
**Nodes:** 2,834 elements  
**Edges:** 30,517 dependencies  
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
| **Total Elements** | 2,834 |
| **Total Dependencies** | 30,517 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 26224 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=0db07e0a-fca0-54f7-9b92-6f3ce8a91373 --> `info` | **41** | function | `demo-all-modules.ts` |
| 3 | <!-- coderef:uuid=a7892a5a-b870-552d-8d1e-177669e2129d --> `validatePipelineState` | **37** | function | `src/pipeline/output-validator.ts` |
| 4 | <!-- coderef:uuid=d4ecbbdd-eaf5-5039-be19-ebb3520b9bbf --> `createCodeRefId` | **31** | function | `src/utils/coderef-id.ts` |
| 5 | <!-- coderef:uuid=850a9178-4970-5168-9963-efc0ac4d5c42 --> `createSearchResult` | **29** | function | `src/integration/rag/__tests__/graph-reranker.test.ts` |
| 6 | <!-- coderef:uuid=4da7909d-dd01-52b6-aa4d-d2ce235a7bc3 --> `createSampleReferences` | **29** | function | `__tests__/indexer.test.ts` |
| 7 | <!-- coderef:uuid=06d11b18-777d-50e1-b53b-12708071c32f --> `createTestFile` | **26** | function | `__tests__/js-call-detector.test.ts` |
| 8 | <!-- coderef:uuid=5de579af-1612-5a5f-9d8f-b04bb3614f4e --> `success` | **25** | function | `demo-all-modules.ts` |
| 9 | <!-- coderef:uuid=84853cc1-72c1-50f4-a2b0-d35c5af7d591 --> `recordTest` | **24** | function | `__tests__/integration.test.ts` |
| 10 | <!-- coderef:uuid=c916a914-d126-57d9-b078-af8f1d2ea754 --> `createMockSource` | **23** | function | `src/integration/rag/__tests__/confidence-scorer.test.ts` |
| 11 | <!-- coderef:uuid=31aa0963-955e-5f6c-b0e3-621cda88b8ee --> `createSampleRef` | **23** | function | `__tests__/indexer.test.ts` |
| 12 | <!-- coderef:uuid=c27fbfa4-f980-5d28-bbd9-20d6241abcae --> `inferLayerFromPath` | **22** | function | `src/semantic/header-generator.ts` |
| 13 | <!-- coderef:uuid=65fa6055-a404-5ad6-81b2-93156e1d4c4c --> `buildDependencyGraph` | **22** | function | `src/fileGeneration/buildDependencyGraph.ts` |
| 14 | <!-- coderef:uuid=bc248fbf-a492-5184-b31d-a847ad606e6e --> `parseHeader` | **20** | function | `src/pipeline/semantic-header-parser.ts` |
| 15 | <!-- coderef:uuid=812adc4c-e3db-5cbb-ab32-04cdbd22ad0b --> `stampedElement` | **20** | function | `__tests__/pipeline/output-validation-semantic-headers.test.ts` |
| 16 | <!-- coderef:uuid=154f26e4-80a6-5d5e-9201-a30b65ccfaac --> `parseArgs` | **20** | function | `__tests__/rag-index-cli.test.ts` |
| 17 | <!-- coderef:uuid=9ac45fc8-190b-5a19-a448-29abfd499d4e --> `escapeMarkdown` | **20** | function | `scripts/doc-gen/utils.js` |
| 18 | <!-- coderef:uuid=761dea85-91ce-5553-8784-0fe4350ed985 --> `parseFetchCalls` | **19** | function | `src/analyzer/frontend-call-parsers.ts` |
| 19 | <!-- coderef:uuid=d5a9a957-9f1f-573d-80e9-10070b64f5c3 --> `parseExpressRoute` | **19** | function | `src/analyzer/route-parsers.ts` |
| 20 | <!-- coderef:uuid=d0f78d00-899c-5c40-b456-3f5ffc65b61a --> `generateContext` | **19** | function | `src/fileGeneration/generateContext.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=934ef084-bf96-5b0c-a97d-5f93e65ab6f8 --> `AnalyzerService.getCallers` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=0bbc6712-aa0a-5ecf-a33b-a74d8fbdb202 --> `AnalyzerService.getCallees` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=3bb03b14-7962-5cab-8840-1a89b1124d0b --> `AnalyzerService.getDependents` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=0ee62bba-c18c-5548-b4da-826b9535cd9a --> `AnalyzerService.getDependencies` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=3a452ac9-c435-5c7b-87b1-e1b4d6398033 --> `AnalyzerService.traverse` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=599e57ee-e0c5-5fca-9e02-fe1b68488ac3 --> `AnalyzerService.detectCircularDependencies` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=698412d9-fc2e-5f22-9326-f5e8b42de05d --> `AnalyzerService.findShortestPath` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=0e6a5b89-e78f-592b-b952-e4cfcf716c58 --> `AnalyzerService.findAllPaths` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=31cfdf80-1d6b-57a8-9841-dda2ccd372c7 --> `AnalyzerService.clearCache` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=1ac305d2-15dc-55d7-9cb0-3c57bdd17aa0 --> `AnalyzerService.exportGraphAsJSON` | method | `src/analyzer/analyzer-service.ts` | 1 |
| <!-- coderef:uuid=6b565b42-932b-5e56-8044-6788cf5fe75e --> `AnalyzerService.saveGraph` | method | `src/analyzer/analyzer-service.ts` | 6 |
| <!-- coderef:uuid=af1cebe8-cf30-58f1-b06c-186a3e6ac597 --> `AnalyzerService.loadGraph` | method | `src/analyzer/analyzer-service.ts` | 5 |
| <!-- coderef:uuid=8e685d39-a692-53c1-ba1d-ea0fbfc1b436 --> `ASTElementScanner.clearCache` | method | `src/analyzer/ast-element-scanner.ts` | 1 |
| <!-- coderef:uuid=c0f97398-c5d9-5555-8ded-022857405aac --> `ASTElementScanner.getCacheStats` | method | `src/analyzer/ast-element-scanner.ts` | 2 |
| <!-- coderef:uuid=db191b13-3613-521d-a52b-05e5d2352b0e --> `CallDetector.buildCallEdges` | method | `src/analyzer/call-detector.ts` | 8 |

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
