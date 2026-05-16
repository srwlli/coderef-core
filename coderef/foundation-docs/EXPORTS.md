# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-05-16  
**Total Exported:** 922 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **404** | 357 | 761 |
| interface | **346** | 54 | 400 |
| type | **49** | 11 | 60 |
| component | **2** | 0 | 2 |
| class | **115** | 5 | 120 |
| constant | **6** | 10 | 16 |

---

## Exported Functions (404)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=a5aafac6-e871-5418-9b89-48e0b6b482a3 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `a5aafac6...` |
| <!-- coderef:uuid=1114efca-3add-5a45-adfa-0717bcade86a --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `1114efca...` |
| <!-- coderef:uuid=a702f4c8-cd98-5ce2-b675-2feb2c7628d2 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `a702f4c8...` |
| <!-- coderef:uuid=8b15b7ed-dda3-5394-b6e6-25cb371ed55f --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `8b15b7ed...` |
| <!-- coderef:uuid=c2cdcbc7-7948-582e-bc33-e75f5c7a6af3 --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `c2cdcbc7...` |
| <!-- coderef:uuid=fb86bd61-1f61-58c6-8feb-19f882efc0f1 --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `fb86bd61...` |
| <!-- coderef:uuid=c5ccfe1a-4102-59a7-8b55-5d5f2de4ca68 --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `c5ccfe1a...` |
| <!-- coderef:uuid=a8317231-7ed3-5723-9ce9-e362abb3ff83 --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `a8317231...` |
| <!-- coderef:uuid=b9637f04-0dff-588f-9945-83f7bf90c32f --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `b9637f04...` |
| <!-- coderef:uuid=a5d279dd-f4e6-5ac7-9186-2267834c5c07 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `a5d279dd...` |
| <!-- coderef:uuid=e21ef475-6f9f-5683-b689-f236a086b478 --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `e21ef475...` |
| <!-- coderef:uuid=0e313fdf-e875-5bc5-aa47-c7649a998a9d --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `0e313fdf...` |
| <!-- coderef:uuid=b43db15a-cd1c-5090-a7d8-326214f46fa0 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `b43db15a...` |
| <!-- coderef:uuid=4ed25653-4fd4-5777-9518-fde202552eda --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `4ed25653...` |
| <!-- coderef:uuid=b48db808-5b88-5731-b34e-5f9177ad7171 --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `b48db808...` |
| <!-- coderef:uuid=2e286c11-0209-5359-a6c4-b59096d06518 --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `2e286c11...` |
| <!-- coderef:uuid=9e341cf9-9265-5c20-9915-4fe88f5d02bd --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `9e341cf9...` |
| <!-- coderef:uuid=d7f216be-d786-5178-be20-ed75c1c7c7ae --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `d7f216be...` |
| <!-- coderef:uuid=aa3578b1-5a03-52f0-be39-5fc8d9026322 --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `aa3578b1...` |
| <!-- coderef:uuid=3b6d15c1-cdb0-52b3-84fd-609a9e0c9873 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `3b6d15c1...` |
| <!-- coderef:uuid=d86e751b-4813-55b5-bce2-6dc51dd09d7c --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `d86e751b...` |
| <!-- coderef:uuid=d4823db7-4000-5e61-be1f-f01ca9b2f0ff --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `d4823db7...` |
| <!-- coderef:uuid=8022fa36-26b1-5837-95c0-3ce8a667f307 --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `8022fa36...` |
| <!-- coderef:uuid=11c70912-fd4e-525f-b2b2-c3e65948f6ab --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `11c70912...` |
| <!-- coderef:uuid=8324d37f-fe85-5fce-9c6d-c72a30ea7373 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `8324d37f...` |
| <!-- coderef:uuid=059a1c1a-2fa2-53c9-9c90-7a04d71fc7c1 --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `059a1c1a...` |
| <!-- coderef:uuid=9d445caf-5aa3-534d-a864-f500b8a8eff6 --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `9d445caf...` |
| <!-- coderef:uuid=cebc6b31-d411-5f38-ac4f-c6e4764238de --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `cebc6b31...` |
| <!-- coderef:uuid=fb2cef83-fefd-5d8a-96c9-4be80e8525ce --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `fb2cef83...` |
| <!-- coderef:uuid=bd1ebaf0-baa2-5d0a-bbd4-c8497cdf1f66 --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `bd1ebaf0...` |
| <!-- coderef:uuid=d34a4ea8-d332-5ebb-ad40-a15681f50c72 --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `d34a4ea8...` |
| <!-- coderef:uuid=ff7273cc-27e7-59af-b8f5-4fc1dcce1921 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `ff7273cc...` |
| <!-- coderef:uuid=72de0a80-d47a-5da1-a076-0436218cc5dc --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `72de0a80...` |
| <!-- coderef:uuid=60b3ba37-4fe1-57d6-952b-146f582ff4d7 --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `60b3ba37...` |
| <!-- coderef:uuid=7860797d-a92b-5fd2-8722-5164d6d13cb8 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `7860797d...` |
| <!-- coderef:uuid=27104bbd-46d1-5468-b2ef-96b9296d4b98 --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `27104bbd...` |
| <!-- coderef:uuid=0aa9b4bb-eb26-57e6-b500-70cdc17a8b81 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `0aa9b4bb...` |
| <!-- coderef:uuid=0ffb8ec1-248c-5ac3-985b-1dedc5ca1b4d --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `0ffb8ec1...` |
| <!-- coderef:uuid=05b9d2ea-765f-51e4-9872-57871e74bc55 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `05b9d2ea...` |
| <!-- coderef:uuid=9288a9f1-c3c8-5d48-a539-c2b237dea07a --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `9288a9f1...` |
| <!-- coderef:uuid=565528c4-9dd4-5a27-8602-3f8be922842a --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `565528c4...` |
| <!-- coderef:uuid=a921156f-97df-523b-870b-8a80bab1f633 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `a921156f...` |
| <!-- coderef:uuid=6e5ea4d3-16da-580f-9f79-42288f4a1f6a --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `6e5ea4d3...` |
| <!-- coderef:uuid=98166bd9-5fd4-592d-a83b-1041d43526f7 --> `detect_duplicate_pairs` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `98166bd9...` |
| <!-- coderef:uuid=7dbf42aa-18a9-586b-9d6b-9213ce0899a6 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `7dbf42aa...` |
| <!-- coderef:uuid=d7211693-416f-5002-add0-13283acd296a --> `main` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `d7211693...` |
| <!-- coderef:uuid=5822d2ed-f942-5cee-81ab-60e415db6bce --> `log` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `5822d2ed...` |
| <!-- coderef:uuid=956eed3f-3840-56da-b8c8-27d6f8b0d03d --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `956eed3f...` |
| <!-- coderef:uuid=0b6fe4d2-b7db-54c0-9992-739b409342ad --> `load_index` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `0b6fe4d2...` |
| <!-- coderef:uuid=7b87a618-c15d-5117-80e8-18ac3bea8db3 --> `check_export_precision` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `7b87a618...` |

*... and 354 more functions. See index.json for complete list.*

---

## Exported Classes (115)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=ec54cd94-2550-5a05-aa30-78d3eb8720c4 --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `ec54cd94...` |
| <!-- coderef:uuid=c7891b8f-f49d-5783-bdfd-d75fa06bf2a5 --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `c7891b8f...` |
| <!-- coderef:uuid=1a96896e-8741-556c-8da1-f8524a886a40 --> `CallDetector` | `src/analyzer/call-detector.ts` | `1a96896e...` |
| <!-- coderef:uuid=1fecb925-1728-56e1-818f-afae61231424 --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `1fecb925...` |
| <!-- coderef:uuid=d66b4a9c-8d84-5bf3-bf41-a9684570b654 --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `d66b4a9c...` |
| <!-- coderef:uuid=ade8da19-1c9c-5ffd-b5e5-437ba43b6588 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `ade8da19...` |
| <!-- coderef:uuid=738e5ca1-b1ea-5b3b-a14b-4ce9f07f0314 --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `738e5ca1...` |
| <!-- coderef:uuid=e77fd743-743b-5ea3-a3b5-0c15e752a9b6 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `e77fd743...` |
| <!-- coderef:uuid=e37c146e-bba7-5156-8154-57205676cb4c --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `e37c146e...` |
| <!-- coderef:uuid=98eaa9c5-4ce3-5365-9efe-eb23dccffe9c --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `98eaa9c5...` |
| <!-- coderef:uuid=ec69088f-1968-5126-a61c-aea81057f45e --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `ec69088f...` |
| <!-- coderef:uuid=4d5e1e88-cc47-5bbb-a8b3-11a992890f0e --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `4d5e1e88...` |
| <!-- coderef:uuid=b4969e97-c9a3-5971-89a5-79da5fbffaba --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `b4969e97...` |
| <!-- coderef:uuid=d2348512-4e68-5af9-bf8d-d3d57a80fe59 --> `GraphError` | `src/analyzer/graph-error.ts` | `d2348512...` |
| <!-- coderef:uuid=eac432f3-c261-5f60-b8af-b61a74b7a814 --> `ImportParser` | `src/analyzer/import-parser.ts` | `eac432f3...` |
| <!-- coderef:uuid=870f5be1-dc18-5cfe-bdee-9af91d2eccf8 --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `870f5be1...` |
| <!-- coderef:uuid=877ed87f-3d61-5aa8-95b5-d9dbaf5d18e8 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `877ed87f...` |
| <!-- coderef:uuid=5feae0c0-1032-55f2-8cf4-bc37f082c0a0 --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `5feae0c0...` |
| <!-- coderef:uuid=5d557edf-77b9-5009-b9a6-72e43afe6ebd --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `5d557edf...` |
| <!-- coderef:uuid=a4b1a881-33c6-54f6-a025-6c63d2d5442b --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `a4b1a881...` |
| <!-- coderef:uuid=0e3e9ffa-6dc3-5a4b-a15e-b209a1225281 --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `0e3e9ffa...` |
| <!-- coderef:uuid=6cbd4344-d319-5c3c-a325-2f46753ae4ef --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `6cbd4344...` |
| <!-- coderef:uuid=90b473bb-e11f-5dc2-8484-1d285191a973 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `90b473bb...` |
| <!-- coderef:uuid=21a377bb-4a9f-5222-b37c-72fcd8c23c50 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `21a377bb...` |
| <!-- coderef:uuid=a399c40b-6026-50b7-9fee-1d9fbd04051f --> `ContextGenerator` | `src/context/context-generator.ts` | `a399c40b...` |
| <!-- coderef:uuid=ac4a37c7-a074-5a8a-b289-45f9a2930e41 --> `ContextTracker` | `src/context/context-tracker.ts` | `ac4a37c7...` |
| <!-- coderef:uuid=2d9e886a-5341-501e-97ad-47eb1baa4105 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `2d9e886a...` |
| <!-- coderef:uuid=4d6ab682-fcc1-5439-b130-bb6ceb1f295d --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `4d6ab682...` |
| <!-- coderef:uuid=957adf01-8403-56da-97e2-d36f26a09682 --> `ExampleExtractor` | `src/context/example-extractor.ts` | `957adf01...` |
| <!-- coderef:uuid=fbd5232c-798a-5e41-9cf5-dc7af03de308 --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `fbd5232c...` |
| <!-- coderef:uuid=392b5f52-5838-5576-aa72-7ffa02c4d9cd --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `392b5f52...` |
| <!-- coderef:uuid=e394a33b-f7bc-5666-b8a6-b3d3aa37032e --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `e394a33b...` |
| <!-- coderef:uuid=e97a0663-05a9-5087-b5f6-2707b96de4f8 --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `e97a0663...` |
| <!-- coderef:uuid=79a6cd1b-5ce1-5142-9fc3-32e84df90c65 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `79a6cd1b...` |
| <!-- coderef:uuid=25f1a6b6-e793-5d0f-9531-6b5aa0b81422 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `25f1a6b6...` |
| <!-- coderef:uuid=03b82536-6228-55ac-96db-c824c4c00b6c --> `CodeRefError` | `src/errors/CodeRefError.ts` | `03b82536...` |
| <!-- coderef:uuid=35513f34-f153-536f-a7ab-0ef3f42bb2e6 --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `35513f34...` |
| <!-- coderef:uuid=87f31d87-db19-5008-9d3a-3c16bd9f2927 --> `IndexError` | `src/errors/IndexError.ts` | `87f31d87...` |
| <!-- coderef:uuid=e225256f-a305-5ce3-b8fd-476f4d2e8d0e --> `ParseError` | `src/errors/ParseError.ts` | `e225256f...` |
| <!-- coderef:uuid=253ed618-76ea-5501-87d9-c6610ee534ad --> `ScanError` | `src/errors/ScanError.ts` | `253ed618...` |
| <!-- coderef:uuid=ba19f88d-2dcf-529b-8460-01183b2542d1 --> `ValidationError` | `src/errors/ValidationError.ts` | `ba19f88d...` |
| <!-- coderef:uuid=b2d1c4be-9003-5ce5-9bc5-33674f21042d --> `GraphExporter` | `src/export/graph-exporter.ts` | `b2d1c4be...` |
| <!-- coderef:uuid=da763014-e61e-512b-93cd-902287f26935 --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `da763014...` |
| <!-- coderef:uuid=cff7253d-f514-55cb-9092-8a58c0a81efe --> `IndexStore` | `src/indexer/index-store.ts` | `cff7253d...` |
| <!-- coderef:uuid=093ad7fe-0077-5fe7-84ba-c27b40318bcf --> `IndexerService` | `src/indexer/indexer-service.ts` | `093ad7fe...` |
| <!-- coderef:uuid=f04a3c61-b267-5968-b7b2-3bb9deae53b6 --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `f04a3c61...` |
| <!-- coderef:uuid=5f717ea0-d225-5613-86a6-013fa3253cad --> `QueryEngine` | `src/indexer/query-engine.ts` | `5f717ea0...` |
| <!-- coderef:uuid=7e07abb3-466f-5508-8ab3-1e5049e383fd --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `7e07abb3...` |
| <!-- coderef:uuid=d29ad44e-fce0-527c-be3d-a36f1b6b618f --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `d29ad44e...` |
| <!-- coderef:uuid=127696d9-fffb-54da-81af-baf762a46382 --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `127696d9...` |
| <!-- coderef:uuid=bec60342-5fb8-5c3a-aa83-a24bdc7e98c3 --> `LLMError` | `src/integration/llm/llm-provider.ts` | `bec60342...` |
| <!-- coderef:uuid=16a93a1f-167c-55a9-94eb-53e188a9340c --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `16a93a1f...` |
| <!-- coderef:uuid=8793629b-d5fd-5f2e-9d0d-84264d9df988 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `8793629b...` |
| <!-- coderef:uuid=553c91b2-55ae-541f-b273-5f541ccd2697 --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `553c91b2...` |
| <!-- coderef:uuid=6cba87d9-0f0a-5b6f-8e25-eace7b884b8a --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `6cba87d9...` |
| <!-- coderef:uuid=588ce7d9-650c-5c38-a224-ce5e831e2ca1 --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `588ce7d9...` |
| <!-- coderef:uuid=5b94f7fc-c0ba-5b2e-b8e1-c151342d8725 --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `5b94f7fc...` |
| <!-- coderef:uuid=08a7140f-8cb6-53f0-a204-105ddda819cd --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `08a7140f...` |
| <!-- coderef:uuid=72817eb3-e52b-5d1b-be35-e621f1f1f551 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `72817eb3...` |
| <!-- coderef:uuid=829d3248-0d89-567b-bf33-c3426f226181 --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `829d3248...` |
| <!-- coderef:uuid=b7946bc1-8431-5b32-af8a-4cb25741c9f5 --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `b7946bc1...` |
| <!-- coderef:uuid=038d59fd-16d3-50c4-a4d1-ebdb4f497260 --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `038d59fd...` |
| <!-- coderef:uuid=8820ed4a-1204-5da0-9e74-f298962d6737 --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `8820ed4a...` |
| <!-- coderef:uuid=fd2fde8a-3c37-526e-9403-fa0c2b8de911 --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `fd2fde8a...` |
| <!-- coderef:uuid=c5051ded-dd9a-50ec-a1b1-722c3de45fad --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `c5051ded...` |
| <!-- coderef:uuid=e24cf2a3-073d-5341-b7d3-bfe093727fbd --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `e24cf2a3...` |
| <!-- coderef:uuid=faae099c-f52f-57c9-9b66-8b488336d4a7 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `faae099c...` |
| <!-- coderef:uuid=563601ae-3e19-53f6-992f-949f785f14af --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `563601ae...` |
| <!-- coderef:uuid=60b58eaa-15db-558b-a7c5-25f5c40fc09e --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `60b58eaa...` |
| <!-- coderef:uuid=a9e71026-b53d-5483-b8a4-a96c8461b7e9 --> `ConfigError` | `src/integration/rag/rag-config.ts` | `a9e71026...` |
| <!-- coderef:uuid=68d907c8-5c41-5059-b383-2bdf936ffcc2 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `68d907c8...` |
| <!-- coderef:uuid=82eb94bb-3209-59c9-b9eb-0ddb06f114e7 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `82eb94bb...` |
| <!-- coderef:uuid=61b5c44f-7325-5a98-b140-d8db62787511 --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `61b5c44f...` |
| <!-- coderef:uuid=24dbe260-eb0d-5a52-8be8-7445dfcfea44 --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `24dbe260...` |
| <!-- coderef:uuid=b967b00c-70a7-51c9-ad47-7fe7770a1492 --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `b967b00c...` |
| <!-- coderef:uuid=3af4d869-55c1-5f58-8414-45c1ee88fff6 --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `3af4d869...` |
| <!-- coderef:uuid=842e3902-c913-52c1-af29-17efac9e572e --> `CodeRefParser` | `src/parser/parser.ts` | `842e3902...` |
| <!-- coderef:uuid=0bb28957-e35d-503e-b1bd-4e7e1f64a53c --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `0bb28957...` |
| <!-- coderef:uuid=cf2552f6-ee82-51c8-b317-7dd8386243ad --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `cf2552f6...` |
| <!-- coderef:uuid=31b2a749-fad5-5abd-af91-277a05903f5c --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `31b2a749...` |
| <!-- coderef:uuid=ec562d24-b793-59ae-8365-c5f20c09fb04 --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `ec562d24...` |
| <!-- coderef:uuid=664dc1b2-aed3-5442-8276-61611b2e708a --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `664dc1b2...` |
| <!-- coderef:uuid=f26c46b5-4ed1-5606-b0a2-5aa3976dd35c --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `f26c46b5...` |
| <!-- coderef:uuid=c0ca2cbf-2744-5929-8ccd-38c98b77cf14 --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `c0ca2cbf...` |
| <!-- coderef:uuid=83be9b9d-a66f-51d3-9e04-a81307ab2234 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `83be9b9d...` |
| <!-- coderef:uuid=27188dc7-e0f4-55d3-b903-70a6b17cf4f8 --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `27188dc7...` |
| <!-- coderef:uuid=ac7c62b6-3e4a-5763-a352-4d4e0a0d8910 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `ac7c62b6...` |
| <!-- coderef:uuid=943fadba-188d-55b8-baf7-886d7bcb56a4 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `943fadba...` |
| <!-- coderef:uuid=d6eab6c2-9ff3-5ee7-8a17-80218d585387 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `d6eab6c2...` |
| <!-- coderef:uuid=d1c4e2aa-996b-51aa-a174-b8a3e76c6c59 --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `d1c4e2aa...` |
| <!-- coderef:uuid=854599bb-a453-56c4-a333-c9c11f1dc300 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `854599bb...` |
| <!-- coderef:uuid=93ac60a4-68c7-5ac9-8ec8-c9e4a36c2033 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `93ac60a4...` |
| <!-- coderef:uuid=2d85b34d-406c-5a5a-94f8-2a3bc2cff139 --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `2d85b34d...` |
| <!-- coderef:uuid=74150a20-cdca-55f6-ac9d-6b36400d140d --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `74150a20...` |
| <!-- coderef:uuid=c70ec73d-b909-5361-a9c0-87df20cbf7d6 --> `PluginError` | `src/plugins/plugin-registry.ts` | `c70ec73d...` |
| <!-- coderef:uuid=dc97a30f-8761-5c9c-91fc-b454f63cde2e --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `dc97a30f...` |
| <!-- coderef:uuid=b8fffb38-6915-5b8b-9481-22db24b1bbeb --> `QueryExecutor` | `src/query/query-executor.ts` | `b8fffb38...` |
| <!-- coderef:uuid=c2d453e5-6f41-509e-bb43-73ebbe6749ad --> `EntityRegistry` | `src/registry/entity-registry.ts` | `c2d453e5...` |
| <!-- coderef:uuid=e8b408a4-5543-52b4-a1dc-05c58f9c7d84 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `e8b408a4...` |
| <!-- coderef:uuid=e7e44817-bd04-55b4-ae68-085dac2c175b --> `LRUCache` | `src/scanner/lru-cache.ts` | `e7e44817...` |
| <!-- coderef:uuid=23565370-80d2-5a3d-a534-3524f244874d --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `23565370...` |
| <!-- coderef:uuid=bad764d6-b8e3-5d88-a89d-de8c296434c3 --> `SearchIndex` | `src/search/search-engine.ts` | `bad764d6...` |
| <!-- coderef:uuid=8faa9b5b-9f04-5599-894b-384df400f846 --> `SearchEngine` | `src/search/search-engine.ts` | `8faa9b5b...` |
| <!-- coderef:uuid=9ccbbdc7-a8e8-59e2-a133-54b87a64d8d0 --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `9ccbbdc7...` |
| <!-- coderef:uuid=3886a405-68ea-580a-ba6e-4b5cc03f3f75 --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `3886a405...` |
| <!-- coderef:uuid=6f6b254c-40bf-5331-a271-31147fb7e0da --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `6f6b254c...` |
| <!-- coderef:uuid=50eb0651-9ab8-5321-8ef9-452e1c944f23 --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `50eb0651...` |
| <!-- coderef:uuid=20dbf86d-aa00-587a-90c1-c183a46ccbbe --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `20dbf86d...` |
| <!-- coderef:uuid=1053579d-b00b-51a7-bbb8-509fd62a7040 --> `OpenAI` | `src/types/external-modules.d.ts` | `1053579d...` |
| <!-- coderef:uuid=3db71f0d-94e1-546b-89ad-6d404e7e443f --> `Anthropic` | `src/types/external-modules.d.ts` | `3db71f0d...` |
| <!-- coderef:uuid=8ef84560-a5c4-560f-92a1-85a57ac523da --> `ChromaClient` | `src/types/external-modules.d.ts` | `8ef84560...` |
| <!-- coderef:uuid=3a52fd5c-2662-5b48-9c9b-566291c3b80e --> `Collection` | `src/types/external-modules.d.ts` | `3a52fd5c...` |
| <!-- coderef:uuid=96c1a398-2cbc-5bf4-8696-365288a29ab3 --> `Pinecone` | `src/types/external-modules.d.ts` | `96c1a398...` |
| <!-- coderef:uuid=58c2c5d4-b6a7-5a99-a654-9aab804c89fe --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `58c2c5d4...` |
| <!-- coderef:uuid=ef70b124-f01c-57c9-a76c-b34dca73f04a --> `CodeRefValidator` | `src/validator/validator.ts` | `ef70b124...` |

---

## Exported Interfaces (346)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=8e129c21-e0d0-527e-9351-650ffd901146 --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `8e129c21...` |
| <!-- coderef:uuid=ac3adec8-f9f5-5596-8f4d-c0b588ae43c4 --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `ac3adec8...` |
| <!-- coderef:uuid=ea182d26-00ef-5e42-a899-079a3866bd5f --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `ea182d26...` |
| <!-- coderef:uuid=6cc25718-4fd3-5fe3-b40d-e2b62af90b8c --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `6cc25718...` |
| <!-- coderef:uuid=8447cddf-6641-5094-8e97-06a697d72727 --> `CallExpression` | `src/analyzer/call-detector.ts` | `8447cddf...` |
| <!-- coderef:uuid=8a69e1f2-6e81-5c47-83fd-d3aa09723438 --> `CallEdge` | `src/analyzer/call-detector.ts` | `8a69e1f2...` |
| <!-- coderef:uuid=54b00c8a-af02-5fa2-bdef-082c569f2ec1 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `54b00c8a...` |
| <!-- coderef:uuid=e9e662b8-a763-5f46-9984-97dd0eb1e0ef --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `e9e662b8...` |
| <!-- coderef:uuid=2eceadff-0889-5b19-b53a-95418eb55122 --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `2eceadff...` |
| <!-- coderef:uuid=a0ecfe64-7996-5fda-aeb2-6b8403c52cec --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `a0ecfe64...` |
| <!-- coderef:uuid=e232e50b-e06d-5925-b067-eb2573cf6b38 --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `e232e50b...` |
| <!-- coderef:uuid=027aa090-dc12-5dc7-b6af-ec9bb0d0d433 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `027aa090...` |
| <!-- coderef:uuid=63a8b75b-9b62-52cd-ab33-113bcdd15d39 --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `63a8b75b...` |
| <!-- coderef:uuid=873f5e2d-8396-524c-a04b-4c9384c9e920 --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `873f5e2d...` |
| <!-- coderef:uuid=56da03d9-afad-5c45-a91d-446d86c8e08e --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `56da03d9...` |
| <!-- coderef:uuid=739bb626-bd15-5230-aa63-1070c96abd71 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `739bb626...` |
| <!-- coderef:uuid=96b67211-6bcc-5241-b1c9-abf92a5c2cdb --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `96b67211...` |
| <!-- coderef:uuid=61e95126-c2dd-5641-92ec-0eda682fac0d --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `61e95126...` |
| <!-- coderef:uuid=d369d58c-4c3b-5074-8c67-98d054c2cff9 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `d369d58c...` |
| <!-- coderef:uuid=b46d189b-975b-564c-b74f-1c01894ba59c --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `b46d189b...` |
| <!-- coderef:uuid=82a1418a-f5f4-5f72-9373-ef5e302c4343 --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `82a1418a...` |
| <!-- coderef:uuid=01086dc4-36c7-537f-a8da-7f6feed9cdb3 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `01086dc4...` |
| <!-- coderef:uuid=83ca154d-f253-55fc-bab8-d7c6ae3fe8bb --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `83ca154d...` |
| <!-- coderef:uuid=a583be49-c462-58b8-abe2-c5edaef0903b --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `a583be49...` |
| <!-- coderef:uuid=349408e5-bb35-550f-876b-9e700ea9247d --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `349408e5...` |
| <!-- coderef:uuid=6df1f62d-de27-57e4-8ad9-3ca526756c90 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `6df1f62d...` |
| <!-- coderef:uuid=6754a545-d6a4-5958-b028-49435ec8d694 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `6754a545...` |
| <!-- coderef:uuid=512a7bf0-9e60-5763-8515-3b8db466c85d --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `512a7bf0...` |
| <!-- coderef:uuid=09387cd0-f763-5818-955c-c0a74529ed0e --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `09387cd0...` |
| <!-- coderef:uuid=10a3ac64-2e62-5fa7-9f23-72f579f24c10 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `10a3ac64...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (49)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=e7dc8bbe-5f9a-5461-a2db-2f17df3195c7 --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `e7dc8bbe...` |
| <!-- coderef:uuid=331ad05b-9e4a-53b0-8f8d-77f2931e3e5e --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `331ad05b...` |
| <!-- coderef:uuid=007ee86d-cc12-529f-96e5-856b05a18e3f --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `007ee86d...` |
| <!-- coderef:uuid=d10ab9ba-4bfe-5ced-84a0-60684c0a3822 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `d10ab9ba...` |
| <!-- coderef:uuid=c1db0e1c-35fe-5156-8543-618baf6e57a7 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `c1db0e1c...` |
| <!-- coderef:uuid=ef30298f-dd42-5337-81fc-310a065e8185 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `ef30298f...` |
| <!-- coderef:uuid=8a7211f7-27bb-5973-8376-c0f40eec6159 --> `ExportFormat` | `src/export/graph-exporter.ts` | `8a7211f7...` |
| <!-- coderef:uuid=e3929f85-a47d-52b5-b49e-2dc2fbf82773 --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `e3929f85...` |
| <!-- coderef:uuid=eee6c1ef-233d-5dd7-b153-4d980294836f --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `eee6c1ef...` |
| <!-- coderef:uuid=32877b2e-2ad5-5d5f-b402-c2a7e633c8e9 --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `32877b2e...` |
| <!-- coderef:uuid=3db37693-e0c2-509a-b420-775610207b4d --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `3db37693...` |
| <!-- coderef:uuid=d8bee2a0-9c4c-5148-8774-33c468c86a3d --> `IndexingStage` | `src/indexer/indexer-service.ts` | `d8bee2a0...` |
| <!-- coderef:uuid=f310e851-1860-55f9-a42a-c4ecf28bab77 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `f310e851...` |
| <!-- coderef:uuid=ce244a78-40ed-5ab1-ac30-2d41625d59e1 --> `QueryFilter` | `src/indexer/query-engine.ts` | `ce244a78...` |
| <!-- coderef:uuid=7652517c-27c8-51f3-946d-fb28fa638b13 --> `RelationshipType` | `src/indexer/relationship-index.ts` | `7652517c...` |
| <!-- coderef:uuid=a4fa9f60-f3f5-59d4-9e61-4914976529d6 --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `a4fa9f60...` |
| <!-- coderef:uuid=7c8fdf94-17b3-58b4-af0d-c2fe893589ec --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `7c8fdf94...` |
| <!-- coderef:uuid=99c3f9d6-a845-545b-9e05-af56403b1fbd --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `99c3f9d6...` |
| <!-- coderef:uuid=892082da-f486-5fa8-9071-c4517089aade --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `892082da...` |
| <!-- coderef:uuid=84be7bf6-80f1-5178-b71e-a69fd107e163 --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `84be7bf6...` |
| <!-- coderef:uuid=78e245b8-2387-52bb-b7a9-ca6769ec1867 --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `78e245b8...` |
| <!-- coderef:uuid=4a74fac6-48aa-5480-8320-d06139e0fd0b --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `4a74fac6...` |
| <!-- coderef:uuid=25d663f2-4eba-5a34-892e-39076fdf93ea --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `25d663f2...` |
| <!-- coderef:uuid=007c28ec-418f-5491-b9d2-1632ddfe84e3 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `007c28ec...` |
| <!-- coderef:uuid=459d6988-6691-59ed-a0a7-c89a5805e6bc --> `RelativePath` | `src/integration/rag/path-types.ts` | `459d6988...` |
| <!-- coderef:uuid=8b5c41ba-c942-52c8-97e9-f6c10316f8f7 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `8b5c41ba...` |
| <!-- coderef:uuid=d949588b-339a-5f7f-8386-b59c46948f31 --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `d949588b...` |
| <!-- coderef:uuid=2fd54140-5328-5b78-afe2-265ca3106c04 --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `2fd54140...` |
| <!-- coderef:uuid=5c691a1e-b9e1-5b1a-b1cb-5aeefb031535 --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `5c691a1e...` |
| <!-- coderef:uuid=ad36af21-61e1-5a92-b0bf-c00c9eb95304 --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `ad36af21...` |
| <!-- coderef:uuid=3e056bcc-664a-5a3f-9ff0-7e32fb6c7c00 --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `3e056bcc...` |
| <!-- coderef:uuid=54fe8f5c-8a57-5ff2-82a2-6c0dc9acb183 --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `54fe8f5c...` |
| <!-- coderef:uuid=c01d9666-38db-58c3-8e73-57c4ba87cc95 --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `c01d9666...` |
| <!-- coderef:uuid=22c3c1d9-3e66-57ca-8a01-14e3dd39b05d --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `22c3c1d9...` |
| <!-- coderef:uuid=bf98b314-04e5-5b0b-b43c-e0b82c9b27d6 --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `bf98b314...` |
| <!-- coderef:uuid=169fe555-568f-5ada-85d0-5fdbc97020ec --> `ExportTable` | `src/pipeline/import-resolver.ts` | `169fe555...` |
| <!-- coderef:uuid=eb5234cc-98a8-5d4d-8ba2-89f8853a92c9 --> `LanguageExtension` | `src/pipeline/types.ts` | `eb5234cc...` |
| <!-- coderef:uuid=76da55c7-de10-5cae-9133-2962ff16e5a0 --> `RawExportKind` | `src/pipeline/types.ts` | `76da55c7...` |
| <!-- coderef:uuid=be35d197-fd80-524e-81ae-57f8bb4a782b --> `PluginSource` | `src/plugins/types.ts` | `be35d197...` |
| <!-- coderef:uuid=fb422ebd-a567-52b9-9d43-40858b662812 --> `QueryType` | `src/query/query-executor.ts` | `fb422ebd...` |
| <!-- coderef:uuid=d9e3eda0-5d63-59e9-9c18-e1b4b2d3c9de --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `d9e3eda0...` |
| <!-- coderef:uuid=28acebee-e507-5fea-ac40-19aaf6e91c74 --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `28acebee...` |
| <!-- coderef:uuid=f0d6a319-ee13-5249-8084-608f47d8a28f --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `f0d6a319...` |
| <!-- coderef:uuid=aa0364a1-c18e-517f-bdfa-fa568857a5b3 --> `LogLevel` | `src/utils/logger.ts` | `aa0364a1...` |
| <!-- coderef:uuid=0943d6d1-4009-59aa-adf4-dd2dcf87d348 --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `0943d6d1...` |
| <!-- coderef:uuid=ea848f8f-cac4-5d75-8101-f960b88614a1 --> `IndexedCoderef` | `types.d.ts` | `ea848f8f...` |
| <!-- coderef:uuid=037ab904-952d-5bb0-a7d1-a79b077aa274 --> `DriftStatus` | `types.d.ts` | `037ab904...` |
| <!-- coderef:uuid=18477160-0312-5968-be1c-a7dcf7411fb2 --> `DriftReport` | `types.d.ts` | `18477160...` |
| <!-- coderef:uuid=a1b067d0-95cc-5359-b09c-6927c0cd127a --> `DriftDetectionOptions` | `types.d.ts` | `a1b067d0...` |

---

## Using UUIDs for Traceability

Every exported API has a UUID anchor comment in the source documentation:

```markdown
<!-- coderef:uuid=a13dbe09-a3c4-53b0-99a1-4b0630dfe3c6 -->
### `createTestFile(filename, content)`
```

This enables:
- Precise code references across documentation
- Automated validation that docs match code
- Refactoring support (UUIDs persist across moves)

---

## Semver Considerations

When modifying exported APIs:

- **Major (breaking)**: Removing exports, changing signatures
- **Minor (additive)**: Adding new exports, extending interfaces  
- **Patch (fix)**: Documentation updates, internal fixes

See IMP-CORE-041 for planned breaking change tracking.

---

*This document is auto-generated from .coderef/index.json. Do not edit manually.*
