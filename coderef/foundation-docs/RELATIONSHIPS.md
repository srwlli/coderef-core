---
subject: Dependency Relationships — @coderef/core
status: generated
generator: scripts/doc-gen/generate-relationships-md.js
related_files:
  - __tests__/map/dashboard-asset.test.ts
  - dist-old/src/cli/coderef-mcp-server.js
  - src/cli/coderef-mcp-server.ts
  - src/cli/mcp-response-format.ts
  - src/map/project-map-data.ts
  - src/pipeline/call-resolver.ts
  - src/pipeline/edge-confidence.ts
  - src/pipeline/graph-builder.ts
  - src/pipeline/import-resolver.ts
  - src/pipeline/orchestrator.ts
  - src/pipeline/output-validator.ts
  - src/pipeline/semantic-header-parser.ts
  - src/query/clones.ts
  - src/scanner/scanner.ts
  - src/utils/coderef-id.ts
  - src/utils/path-normalize.ts
---

# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-08-01  
**Nodes:** 7,044 elements  
**Edges:** 62,135 dependencies  
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
| **Total Elements** | 7,044 |
| **Total Dependencies** | 62,135 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 50652 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=974d7182-13e9-59bb-ad36-92fb29bf6599 --> `normalizeSlashes` | **154** | function | `src/utils/path-normalize.ts` |
| 3 | <!-- coderef:uuid=7c9b7ea0-070c-5509-a24a-f12fbfb87353 --> `scanCurrentElements` | **134** | function | `src/scanner/scanner.ts` |
| 4 | <!-- coderef:uuid=a59261d2-ac9d-5372-ab0d-e998c54a3516 --> `buildToolHandlers` | **61** | function | `src/cli/coderef-mcp-server.ts` |
| 5 | <!-- coderef:uuid=ac3c6070-2c26-5a42-9d3d-f08685e77536 --> `PipelineOrchestrator` | **59** | class | `src/pipeline/orchestrator.ts` |
| 6 | <!-- coderef:uuid=4e6f76b2-127f-5c10-8703-9ad8a88c570e --> `resolveCalls` | **58** | function | `src/pipeline/call-resolver.ts` |
| 7 | <!-- coderef:uuid=d31bd1a8-824c-5484-81a9-6b7df74573bb --> `constructGraph` | **58** | function | `src/pipeline/graph-builder.ts` |
| 8 | <!-- coderef:uuid=74b8c20d-39d9-5a27-a13a-2b27acc3e5b3 --> `createCodeRefId` | **50** | function | `src/utils/coderef-id.ts` |
| 9 | <!-- coderef:uuid=4cbc77eb-0648-59e4-bd2b-4c82050c2d4d --> `validatePipelineState` | **49** | function | `src/pipeline/output-validator.ts` |
| 10 | <!-- coderef:uuid=b738b18c-e096-5182-acbb-c31fd523b354 --> `isLineCommented` | **49** | function | `src/scanner/scanner.ts` |
| 11 | <!-- coderef:uuid=2a7de8b0-d8ab-5529-be62-c38d881394c4 --> `computeCloneSurface` | **45** | function | `src/query/clones.ts` |
| 12 | <!-- coderef:uuid=e3d1783a-5c56-5880-b541-0e7088902fdd --> `paginate` | **41** | function | `src/cli/mcp-response-format.ts` |
| 13 | <!-- coderef:uuid=7ca2a922-3a5a-5135-82f8-2cffe26e78e7 --> `projectMapData` | **41** | function | `src/map/project-map-data.ts` |
| 14 | <!-- coderef:uuid=e861d20f-9331-557a-ab74-f2ce5e2736e5 --> `renderDashboard` | **41** | function | `__tests__/map/dashboard-asset.test.ts` |
| 15 | <!-- coderef:uuid=3aeeba8d-0e6a-59a0-88d4-bc4efb5eba85 --> `allOutput` | **40** | function | `__tests__/map/dashboard-asset.test.ts` |
| 16 | <!-- coderef:uuid=124e0e97-51e9-5d39-8009-5064ade3844e --> `perRepo` | **38** | function | `src/cli/coderef-mcp-server.ts` |
| 17 | <!-- coderef:uuid=f2b2d127-7204-5f70-9115-90882198e2ab --> `perRepo` | **38** | function | `dist-old/src/cli/coderef-mcp-server.js` |
| 18 | <!-- coderef:uuid=bc54d2b9-7442-5249-a79e-8fbbb006e1a0 --> `resolveImports` | **37** | function | `src/pipeline/import-resolver.ts` |
| 19 | <!-- coderef:uuid=ad6ce698-8098-5469-97b1-4743111af82d --> `classifyEdgeConfidence` | **34** | function | `src/pipeline/edge-confidence.ts` |
| 20 | <!-- coderef:uuid=05629e21-570c-5611-be54-019c1499ea76 --> `parseHeader` | **32** | function | `src/pipeline/semantic-header-parser.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=daf7920c-00ed-50b5-94ff-c93545face45 --> `ASTElementScanner.scanFiles` | method | `src/analyzer/ast-element-scanner.ts` | 3 |
| <!-- coderef:uuid=d065bcd4-af5d-58b5-a0d2-42b072429de6 --> `ASTElementScanner.clearCache` | method | `src/analyzer/ast-element-scanner.ts` | 1 |
| <!-- coderef:uuid=1516f911-15f7-5413-b0e4-144894870239 --> `ASTElementScanner.getCacheStats` | method | `src/analyzer/ast-element-scanner.ts` | 2 |
| <!-- coderef:uuid=1b590330-faf9-55d0-81a4-29d15133897b --> `ConfigAnalyzer.analyze` | method | `src/analyzer/config-analyzer.ts` | 12 |
| <!-- coderef:uuid=9f7ab931-0657-5009-aa51-1ce65eea6690 --> `ContractDetector.detect` | method | `src/analyzer/contract-detector.ts` | 7 |
| <!-- coderef:uuid=3028c8cb-0b72-54d3-909d-9f28a8724804 --> `DatabaseDetector.detect` | method | `src/analyzer/database-detector.ts` | 7 |
| <!-- coderef:uuid=05b64ae2-0f7a-50df-a9de-1a57ebb5ed46 --> `DependencyAnalyzer.analyze` | method | `src/analyzer/dependency-analyzer.ts` | 7 |
| <!-- coderef:uuid=191004f5-8cb2-5156-a618-e2763f494421 --> `DesignPatternDetector.analyze` | method | `src/analyzer/design-pattern-detector.ts` | 6 |
| <!-- coderef:uuid=90112e5a-4b98-53de-9d61-f1fba96a5347 --> `DocsAnalyzer.analyze` | method | `src/analyzer/docs-analyzer.ts` | 9 |
| <!-- coderef:uuid=f16c5001-3e2f-51ab-88d2-fdb51a0a7729 --> `DynamicImportDetector.buildDynamicCallEdges` | method | `src/analyzer/dynamic-import-detector.ts` | 3 |
| <!-- coderef:uuid=7166723f-7218-59ee-a49f-900e2b74225b --> `DynamicImportDetector.clearCache` | method | `src/analyzer/dynamic-import-detector.ts` | 1 |
| <!-- coderef:uuid=8ab8c06d-0293-58ae-8250-145e3fe62b60 --> `EntryPointDetector.detect` | method | `src/analyzer/entry-detector.ts` | 7 |
| <!-- coderef:uuid=88eb1b17-700c-536f-8d4d-c238f9f6e6df --> `JSCallDetector.primeContent` | method | `src/analyzer/js-call-detector/index.ts` | 3 |
| <!-- coderef:uuid=29c36cf8-ee73-504a-8297-e1da816378d0 --> `JSCallDetector.getFileParameters` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=282f1482-0903-509c-a4ea-a410f2808db2 --> `JSCallDetector.detectImports` | method | `src/analyzer/js-call-detector/index.ts` | 5 |

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
