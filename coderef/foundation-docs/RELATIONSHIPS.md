# Component Relationships

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-07-17  
**Nodes:** 3,073 elements  
**Edges:** 34,030 dependencies  
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
| **Total Elements** | 3,073 |
| **Total Dependencies** | 34,030 |
| **Avg Dependencies/Element** | (edges.length / nodes.length).toFixed(2) |
| **Entry Points** | 15 |
| **Most Referenced** | 26208 refs |

---

## Most Referenced Components

*Elements with the highest number of incoming dependencies*

| Rank | Element | References | Type | File |
|------|---------|------------|------|------|
| 2 | <!-- coderef:uuid=8fb3f6c4-9268-59b9-935e-fc9d19ddb092 --> `LRUCache.get` | **476** | method | `src/scanner/lru-cache.ts` |
| 3 | <!-- coderef:uuid=e798246a-5458-58b6-886e-665bcb1a9662 --> `LRUCache.set` | **326** | method | `src/scanner/lru-cache.ts` |
| 4 | <!-- coderef:uuid=c49cb7d2-c4a8-5d2e-8606-0623263aa1df --> `LRUCache.has` | **241** | method | `src/scanner/lru-cache.ts` |
| 5 | <!-- coderef:uuid=ec329b04-7830-5162-b84f-fccf7cdcf863 --> `scanCurrentElements` | **136** | function | `src/scanner/scanner.ts` |
| 6 | <!-- coderef:uuid=a0253d1b-90c1-5017-b2da-13251a227d7f --> `normalizeSlashes` | **102** | function | `src/utils/path-normalize.ts` |
| 7 | <!-- coderef:uuid=30c8c824-3ac5-5054-a68d-a89011ec3b00 --> `PipelineOrchestrator.run` | **87** | method | `src/pipeline/orchestrator.ts` |
| 8 | <!-- coderef:uuid=68ac8c54-9ac0-5824-b4d0-34eff251ffa8 --> `GrammarRegistry.getParser` | **73** | method | `src/pipeline/grammar-registry.ts` |
| 9 | <!-- coderef:uuid=21fa4531-1341-5ae4-bf29-ddcb5836af48 --> `CodeRefParser.parse` | **56** | method | `src/parser/parser.ts` |
| 10 | <!-- coderef:uuid=18ee093f-bc5e-5b54-a731-7a6d23bf9572 --> `PipelineOrchestrator` | **53** | class | `src/pipeline/orchestrator.ts` |
| 11 | <!-- coderef:uuid=23c374e5-af97-5020-b41d-fc475c587b14 --> `isLineCommented` | **49** | function | `src/scanner/scanner.ts` |
| 12 | <!-- coderef:uuid=45dafac7-46aa-5c3e-a398-0e16469660e2 --> `validatePipelineState` | **47** | function | `src/pipeline/output-validator.ts` |
| 13 | <!-- coderef:uuid=c49914c7-5e1e-5b8f-b679-5e7f2337dd15 --> `createCodeRefId` | **46** | function | `src/utils/coderef-id.ts` |
| 14 | <!-- coderef:uuid=90c7e14d-350e-50a0-8dff-45ad7d746870 --> `info` | **41** | function | `demo-all-modules.ts` |
| 15 | <!-- coderef:uuid=d6e69c37-3d97-52d4-b515-7f0b03ff5a82 --> `resolveCalls` | **38** | function | `src/pipeline/call-resolver.ts` |
| 16 | <!-- coderef:uuid=87237394-61bd-5302-b751-956a75a84840 --> `parseHeader` | **32** | function | `src/pipeline/semantic-header-parser.ts` |
| 17 | <!-- coderef:uuid=274a5a75-6aeb-5d30-a5e0-2e29d427885b --> `resolveImports` | **32** | function | `src/pipeline/import-resolver.ts` |
| 18 | <!-- coderef:uuid=3fc3d1c4-3711-5481-986f-395ddf422fa0 --> `CanonicalGraphQuery.resolve` | **30** | method | `src/query/canonical-graph.ts` |
| 19 | <!-- coderef:uuid=88ad018a-f3a0-5853-88cc-d2fd2a9eb73c --> `IndexingOrchestrator.indexCodebase` | **30** | method | `src/integration/rag/indexing-orchestrator.ts` |
| 20 | <!-- coderef:uuid=203bdafe-6cc9-5d73-98b8-a221ff6eb484 --> `ComplexityScorer.scoreElement` | **29** | method | `src/context/complexity-scorer.ts` |

---

## Entry Points (Source Dependencies)

*Elements that depend on others but have no dependents (roots of dependency trees)*

| Element | Type | File | Outgoing Dependencies |
|---------|------|------|----------------------|
| <!-- coderef:uuid=a3c3c737-2722-5318-8dfd-cc5b0663e5af --> `ASTElementScanner.clearCache` | method | `src/analyzer/ast-element-scanner.ts` | 1 |
| <!-- coderef:uuid=577a95f7-ecd1-5cba-a504-f2293840e160 --> `ASTElementScanner.getCacheStats` | method | `src/analyzer/ast-element-scanner.ts` | 2 |
| <!-- coderef:uuid=22c5e548-667a-57c8-9afa-6f47bae198c5 --> `DynamicImportDetector.clearCache` | method | `src/analyzer/dynamic-import-detector.ts` | 1 |
| <!-- coderef:uuid=522aebd7-20da-54ca-aa2b-06beebec90fb --> `EntryPointDetector.detect` | method | `src/analyzer/entry-detector.ts` | 7 |
| <!-- coderef:uuid=0ab07ce7-947e-5180-9bb1-27029b9d80bf --> `JSCallDetector.clearCache` | method | `src/analyzer/js-call-detector/index.ts` | 5 |
| <!-- coderef:uuid=59201e93-8f74-5121-a92d-26752498cfd9 --> `MiddlewareDetector.detect` | method | `src/analyzer/middleware-detector.ts` | 9 |
| <!-- coderef:uuid=3d538ad2-5810-5cc8-a859-8bab4e06efbe --> `MigrationRouteAnalyzer.detectAffectedCallers` | method | `src/analyzer/migration-route-analyzer.ts` | 4 |
| <!-- coderef:uuid=bb3b6c82-9d1c-5476-b75f-5e198ddb285f --> `IncrementalCache.save` | method | `src/cache/incremental-cache.ts` | 8 |
| <!-- coderef:uuid=0d6be37b-8fd6-59c2-912e-4e966c5ea836 --> `IncrementalCache.clear` | method | `src/cache/incremental-cache.ts` | 3 |
| <!-- coderef:uuid=1c8ceb43-3964-553f-bc30-0d18bc701dc4 --> `DryRunSemanticOrchestrator.processProject` | method | `src/cli/semantic-integration.ts` | 2 |
| <!-- coderef:uuid=ebde29b2-8add-5b1f-a36b-76e7a1fb7002 --> `DryRunSemanticOrchestrator.processFile` | method | `src/cli/semantic-integration.ts` | 2 |
| <!-- coderef:uuid=bba9dc1b-cafe-56e7-852f-5f65011a28bb --> `AgenticFormatter.formatAsSummary` | method | `src/context/agentic-formatter.ts` | 5 |
| <!-- coderef:uuid=b1fdad82-752f-59a0-9727-d683f70d8c31 --> `BreakingChangeDetector.compareSignatures` | method | `src/context/breaking-change-detector/index.ts` | 1 |
| <!-- coderef:uuid=5fd939bd-d568-5e45-9a05-3863c70d521b --> `BreakingChangeDetector.extractCallContext` | method | `src/context/breaking-change-detector/index.ts` | 1 |
| <!-- coderef:uuid=601fedf2-0009-566c-b6eb-991df73ff746 --> `BreakingChangeDetector.isCompatibleCall` | method | `src/context/breaking-change-detector/index.ts` | 1 |

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
