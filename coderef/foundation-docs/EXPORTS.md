# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-05-15  
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
| <!-- coderef:uuid=38c1535c-d948-5261-8ca2-4efa04e55b66 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `38c1535c...` |
| <!-- coderef:uuid=071744bc-d582-5943-af77-5045817c4585 --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `071744bc...` |
| <!-- coderef:uuid=62b32dc3-bae5-56f5-97e4-186be21c0a94 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `62b32dc3...` |
| <!-- coderef:uuid=5d89ae93-1866-5aa5-ba42-cf1ead7abff1 --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `5d89ae93...` |
| <!-- coderef:uuid=397f9ef0-dc50-5044-a1e6-479e0e06a9b4 --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `397f9ef0...` |
| <!-- coderef:uuid=d7257ca9-07c7-5d70-9e98-61466470aa8f --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `d7257ca9...` |
| <!-- coderef:uuid=2b02a0e6-04dd-5e66-a85f-b9f90714062e --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `2b02a0e6...` |
| <!-- coderef:uuid=8a364376-25bd-5d3c-af61-19f414af405e --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `8a364376...` |
| <!-- coderef:uuid=5ba92fc3-700a-51fa-961c-35c22b135dd8 --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `5ba92fc3...` |
| <!-- coderef:uuid=af684355-3dad-5cc7-afb5-dd72dd1ebe3d --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `af684355...` |
| <!-- coderef:uuid=d5edcc2d-fb3b-59b4-9f37-53eb48021ad2 --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `d5edcc2d...` |
| <!-- coderef:uuid=9f9776dc-fb19-5b86-86a5-572fb9540c81 --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `9f9776dc...` |
| <!-- coderef:uuid=f3280069-b57f-5783-b9e8-3e98c00222be --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `f3280069...` |
| <!-- coderef:uuid=d1364473-7b3c-5049-9cd2-e4d0470db5bc --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `d1364473...` |
| <!-- coderef:uuid=ab4e8cc2-66b6-5d25-ab6c-bbe526a8b65b --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `ab4e8cc2...` |
| <!-- coderef:uuid=3af84e9d-c967-5948-9c73-5d1e5a4493ef --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `3af84e9d...` |
| <!-- coderef:uuid=08875517-c724-5c93-a40d-0e0dcd7d4bcf --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `08875517...` |
| <!-- coderef:uuid=501ff457-069f-568f-9b4c-9b6efe271632 --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `501ff457...` |
| <!-- coderef:uuid=3943ed8f-4ad8-5689-99c5-ac172aa0f87a --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `3943ed8f...` |
| <!-- coderef:uuid=4a3f627b-ffbb-5427-9fa8-574e676cce38 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `4a3f627b...` |
| <!-- coderef:uuid=b0b637b7-b839-5e87-9da9-a1bc515ad6f9 --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `b0b637b7...` |
| <!-- coderef:uuid=3f475286-4bdb-5182-a174-674f808b8252 --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `3f475286...` |
| <!-- coderef:uuid=2be1f1b6-58e8-5e48-b7bd-0635f5fd7cc3 --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `2be1f1b6...` |
| <!-- coderef:uuid=0257ec4c-8129-588b-95e4-a37b1434a689 --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `0257ec4c...` |
| <!-- coderef:uuid=fae58b41-d4bf-560a-8e95-8f68b5f6f576 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `fae58b41...` |
| <!-- coderef:uuid=f74daea0-6ff6-5b11-986a-ba7713a13277 --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `f74daea0...` |
| <!-- coderef:uuid=e308b49a-8468-5663-8b46-2b3102c7e8f1 --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `e308b49a...` |
| <!-- coderef:uuid=33358d64-99b1-5087-8484-90a2195913ca --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `33358d64...` |
| <!-- coderef:uuid=63f6939d-74ba-5819-8a90-c2ff7ff9ef7d --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `63f6939d...` |
| <!-- coderef:uuid=9682e619-1241-5cda-8404-2e44e9dece2a --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `9682e619...` |
| <!-- coderef:uuid=b189ca9d-d361-5409-842f-22c317e67ad9 --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `b189ca9d...` |
| <!-- coderef:uuid=e2aa6d9c-f90d-538e-8a44-5149e9ac5e88 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `e2aa6d9c...` |
| <!-- coderef:uuid=ebed77b8-b705-5a8e-a857-6afa3cfc1d8b --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `ebed77b8...` |
| <!-- coderef:uuid=6007ae35-8719-5634-b79f-cf2659864104 --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `6007ae35...` |
| <!-- coderef:uuid=ecc03dfc-fc6c-5c73-b396-f9732eb06dc0 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `ecc03dfc...` |
| <!-- coderef:uuid=7a57f076-4711-5ca8-a447-8a8eb762bb71 --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `7a57f076...` |
| <!-- coderef:uuid=4ce60fda-0a7f-57e5-82de-87fdd410a083 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `4ce60fda...` |
| <!-- coderef:uuid=31b497c7-8199-5d0a-9c59-b8d0c6549fc3 --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `31b497c7...` |
| <!-- coderef:uuid=039fc575-3fc5-5989-b57a-55a7d9a8c842 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `039fc575...` |
| <!-- coderef:uuid=bd534ebe-ad77-55ca-b504-cba7a1ecb0a7 --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `bd534ebe...` |
| <!-- coderef:uuid=4da8162a-1981-5b36-893d-4d4ed70bc990 --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `4da8162a...` |
| <!-- coderef:uuid=ff22fc07-d87d-504f-a1fd-d80f5f1abf20 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `ff22fc07...` |
| <!-- coderef:uuid=295d6f9f-2088-5f8d-bf1d-941d13891a36 --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `295d6f9f...` |
| <!-- coderef:uuid=1435ee84-86d4-59fb-8cfa-271c9d0d26cb --> `detect_duplicate_pairs` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `1435ee84...` |
| <!-- coderef:uuid=ffc0dec9-f366-512b-bdb1-9554f52f6a67 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `ffc0dec9...` |
| <!-- coderef:uuid=5a1cf72d-bd4d-518d-9f73-8dadd805c3f4 --> `main` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `5a1cf72d...` |
| <!-- coderef:uuid=312d8607-9113-5153-a803-20439a6c2480 --> `log` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `312d8607...` |
| <!-- coderef:uuid=3a4167ac-874c-5b95-94d3-077ec757f1be --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `3a4167ac...` |
| <!-- coderef:uuid=3a14ae31-841d-563f-a778-bb69242ecbc7 --> `load_index` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `3a14ae31...` |
| <!-- coderef:uuid=1f8d5837-50b9-52df-b2df-5e8d31a8949c --> `check_export_precision` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `1f8d5837...` |

*... and 354 more functions. See index.json for complete list.*

---

## Exported Classes (115)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=a4196e89-1a87-52d5-b38e-b4378cab617b --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `a4196e89...` |
| <!-- coderef:uuid=29171fe2-a5a8-5b6d-84de-0fe0316b91c3 --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `29171fe2...` |
| <!-- coderef:uuid=c305f11b-dd39-5abc-8d16-5e8f0b91b331 --> `CallDetector` | `src/analyzer/call-detector.ts` | `c305f11b...` |
| <!-- coderef:uuid=941e51e4-783b-53b2-99a9-196da9a805a4 --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `941e51e4...` |
| <!-- coderef:uuid=2a4aca13-cec7-577c-acd6-cdc4a035aa97 --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `2a4aca13...` |
| <!-- coderef:uuid=3483ee17-af4b-5910-a132-6ca779e3a558 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `3483ee17...` |
| <!-- coderef:uuid=8b879d23-b5ef-5d8e-b327-85d069ada805 --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `8b879d23...` |
| <!-- coderef:uuid=5e4295b1-c472-5fb0-8f1a-b5a93473e5f9 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `5e4295b1...` |
| <!-- coderef:uuid=a5dcf62d-d3b5-5773-9710-14be91984cd0 --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `a5dcf62d...` |
| <!-- coderef:uuid=a306ab3e-0646-5369-8ccc-6d1fdabc3c9d --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `a306ab3e...` |
| <!-- coderef:uuid=0865b28a-624f-50a6-b5a5-827caf1425d8 --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `0865b28a...` |
| <!-- coderef:uuid=405f817e-99a4-5444-9b0e-92794c49f5ca --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `405f817e...` |
| <!-- coderef:uuid=6f5a6be3-d356-5e49-aeaf-8cb946493a6e --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `6f5a6be3...` |
| <!-- coderef:uuid=b8df9d7d-3946-5b3a-b551-0773533b4dec --> `GraphError` | `src/analyzer/graph-error.ts` | `b8df9d7d...` |
| <!-- coderef:uuid=08424529-0686-5fa8-a6a1-5d4e8b4cd4e5 --> `ImportParser` | `src/analyzer/import-parser.ts` | `08424529...` |
| <!-- coderef:uuid=fdc9947e-41c4-533b-979e-f3882e120b59 --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `fdc9947e...` |
| <!-- coderef:uuid=5576124a-7863-5afa-be23-37719da68b67 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `5576124a...` |
| <!-- coderef:uuid=2e5bb0dc-3690-5f90-92c5-a0367df36010 --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `2e5bb0dc...` |
| <!-- coderef:uuid=b3c441c5-05ed-5e9c-83dd-8d3c8b4a8684 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `b3c441c5...` |
| <!-- coderef:uuid=b2ad3496-b444-5b6f-915e-bb81cc5934b1 --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `b2ad3496...` |
| <!-- coderef:uuid=c68cb6aa-ce6b-56cc-8f99-965f434f5960 --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `c68cb6aa...` |
| <!-- coderef:uuid=036759e0-345d-5136-b2ec-ca35f3a2160a --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `036759e0...` |
| <!-- coderef:uuid=9ecba2a4-c7de-5c66-95a8-4cce3cd19a98 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `9ecba2a4...` |
| <!-- coderef:uuid=ef95a8e4-cfdd-5228-99ef-d827eaa61c92 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `ef95a8e4...` |
| <!-- coderef:uuid=caff0e76-94d1-5686-bc85-daea486faeb7 --> `ContextGenerator` | `src/context/context-generator.ts` | `caff0e76...` |
| <!-- coderef:uuid=1cddc09a-407c-5059-9359-256834221d64 --> `ContextTracker` | `src/context/context-tracker.ts` | `1cddc09a...` |
| <!-- coderef:uuid=8c3737a2-0f93-5e79-9a82-6ee16eea0083 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `8c3737a2...` |
| <!-- coderef:uuid=673aa147-11ee-530c-be1f-08d21612376e --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `673aa147...` |
| <!-- coderef:uuid=32543dc1-130e-5734-9c1a-8dbd659f59de --> `ExampleExtractor` | `src/context/example-extractor.ts` | `32543dc1...` |
| <!-- coderef:uuid=1e89942c-4275-52fe-96ff-eae6c25facde --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `1e89942c...` |
| <!-- coderef:uuid=dc467c15-02be-543b-85a1-97fe63e83fef --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `dc467c15...` |
| <!-- coderef:uuid=7f9981a2-bbc2-561b-a12c-049ccf32dfcb --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `7f9981a2...` |
| <!-- coderef:uuid=b7a0db6f-92fd-58aa-855f-f9e92c3b26bf --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `b7a0db6f...` |
| <!-- coderef:uuid=a14dc85b-680d-5be7-8a1d-6b96ef5c9e2d --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `a14dc85b...` |
| <!-- coderef:uuid=f08447ac-a93c-5818-88d9-ab86f107de05 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `f08447ac...` |
| <!-- coderef:uuid=fbb01170-9984-5ae0-bdb6-89a0f5b104cc --> `CodeRefError` | `src/errors/CodeRefError.ts` | `fbb01170...` |
| <!-- coderef:uuid=2d74f1b6-89aa-541f-bdcc-9aff67c57352 --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `2d74f1b6...` |
| <!-- coderef:uuid=0cc3a9ea-771b-5fdb-bc0c-a13b0b8205ec --> `IndexError` | `src/errors/IndexError.ts` | `0cc3a9ea...` |
| <!-- coderef:uuid=442bab8f-3070-5849-a713-c93c37fb6446 --> `ParseError` | `src/errors/ParseError.ts` | `442bab8f...` |
| <!-- coderef:uuid=777a376f-0cf6-57bf-b16b-33bac04b0cab --> `ScanError` | `src/errors/ScanError.ts` | `777a376f...` |
| <!-- coderef:uuid=220b8fee-8d72-57d0-9c60-293b8dcca4d1 --> `ValidationError` | `src/errors/ValidationError.ts` | `220b8fee...` |
| <!-- coderef:uuid=09ea9a1c-3e2b-5a8c-957a-dde2b9304f31 --> `GraphExporter` | `src/export/graph-exporter.ts` | `09ea9a1c...` |
| <!-- coderef:uuid=525c6855-6b32-515a-a3d5-7ce2afdbd7d2 --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `525c6855...` |
| <!-- coderef:uuid=ee6a168f-9b49-5ff6-b7db-33014a20409d --> `IndexStore` | `src/indexer/index-store.ts` | `ee6a168f...` |
| <!-- coderef:uuid=13821033-2546-585b-a98c-77d1b742dcea --> `IndexerService` | `src/indexer/indexer-service.ts` | `13821033...` |
| <!-- coderef:uuid=5535d134-786d-5f5f-9e50-fa3fc36f45ae --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `5535d134...` |
| <!-- coderef:uuid=82d2c155-3bd0-51a2-ac59-e36c67394abe --> `QueryEngine` | `src/indexer/query-engine.ts` | `82d2c155...` |
| <!-- coderef:uuid=1b723028-57ca-5b10-9348-bdd455524cd9 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `1b723028...` |
| <!-- coderef:uuid=5c32bcbe-5419-5ed6-84c9-d014e4ef9df0 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `5c32bcbe...` |
| <!-- coderef:uuid=4e1b830c-f75e-5038-8c5c-4eea7c6e5820 --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `4e1b830c...` |
| <!-- coderef:uuid=0ec5c8b8-14ea-572d-b972-adfb8226136c --> `LLMError` | `src/integration/llm/llm-provider.ts` | `0ec5c8b8...` |
| <!-- coderef:uuid=fa54c473-9c89-5233-b447-98b35bc94c2e --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `fa54c473...` |
| <!-- coderef:uuid=09167537-040a-584e-9235-b77cabbc8d27 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `09167537...` |
| <!-- coderef:uuid=84d07e3f-a065-566e-91ab-464edf9503ff --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `84d07e3f...` |
| <!-- coderef:uuid=23b8e938-d20c-565f-9788-30c5e436e1b4 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `23b8e938...` |
| <!-- coderef:uuid=01f2130e-3437-5228-99e9-f9028b7bfd1d --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `01f2130e...` |
| <!-- coderef:uuid=20ae0dea-519e-5609-911d-ab7f31f49e2b --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `20ae0dea...` |
| <!-- coderef:uuid=d4ba5dd0-733b-52c1-8702-42711b101b86 --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `d4ba5dd0...` |
| <!-- coderef:uuid=54200e23-169f-5a5f-869b-10cc4e8034b6 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `54200e23...` |
| <!-- coderef:uuid=b30a5484-1826-5e6f-b99f-d38963bbe324 --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `b30a5484...` |
| <!-- coderef:uuid=8db0b9dc-1966-5999-b36e-c05b6086152f --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `8db0b9dc...` |
| <!-- coderef:uuid=3e5b9359-fb63-5cdd-a1f2-cdbd5ecd2375 --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `3e5b9359...` |
| <!-- coderef:uuid=ecc7ce94-ebf0-5b94-a070-eb88ba296d82 --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `ecc7ce94...` |
| <!-- coderef:uuid=4692926b-ec4d-58d7-b7e7-36fd77a872cf --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `4692926b...` |
| <!-- coderef:uuid=6f0ca081-de87-570f-8c70-1f7cbe9debf5 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `6f0ca081...` |
| <!-- coderef:uuid=9bcc8847-8654-58a1-a6ea-2981ca4d4e30 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `9bcc8847...` |
| <!-- coderef:uuid=7e3fa34d-6162-52ab-984b-3ee74a4d8641 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `7e3fa34d...` |
| <!-- coderef:uuid=ad569c92-8071-5c2d-af98-28df6cc96e60 --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `ad569c92...` |
| <!-- coderef:uuid=595deecd-c4d9-5f5e-9055-65f2423c65fe --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `595deecd...` |
| <!-- coderef:uuid=34c825bb-e886-5512-8618-27af149d59d3 --> `ConfigError` | `src/integration/rag/rag-config.ts` | `34c825bb...` |
| <!-- coderef:uuid=941d4579-533a-59e4-aad4-a9a443d874ea --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `941d4579...` |
| <!-- coderef:uuid=8586d364-e80e-5102-b54c-58247027716c --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `8586d364...` |
| <!-- coderef:uuid=951cbcb9-ac9e-5714-b96d-1764a7f6c480 --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `951cbcb9...` |
| <!-- coderef:uuid=bc41ac8f-9021-5901-bc41-07ef9390bf8a --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `bc41ac8f...` |
| <!-- coderef:uuid=921dcdb7-b4a8-58c9-aecf-dfd281c0c2e0 --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `921dcdb7...` |
| <!-- coderef:uuid=738c2229-d4b7-551e-9e65-d32b39a1609e --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `738c2229...` |
| <!-- coderef:uuid=5ef466ac-7e87-5566-b717-42c1e215df56 --> `CodeRefParser` | `src/parser/parser.ts` | `5ef466ac...` |
| <!-- coderef:uuid=fc87bbc1-2619-5de8-8fb1-7d93b697a056 --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `fc87bbc1...` |
| <!-- coderef:uuid=cf2552f6-ee82-51c8-b317-7dd8386243ad --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `cf2552f6...` |
| <!-- coderef:uuid=9b7ab301-678c-584f-ad9d-8cd2ab54bed0 --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `9b7ab301...` |
| <!-- coderef:uuid=22a1a29e-29a7-5ba5-afe4-a96b65368562 --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `22a1a29e...` |
| <!-- coderef:uuid=a1456a4c-4b1b-5d1d-9663-1f48b0a42814 --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `a1456a4c...` |
| <!-- coderef:uuid=91614aa4-3e1f-5581-a1b8-d33fc9ca4ff6 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `91614aa4...` |
| <!-- coderef:uuid=8ccab68c-b6bf-5d14-bcc4-f076698d66ae --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `8ccab68c...` |
| <!-- coderef:uuid=636b36e7-38f8-512b-8111-ce6bcd7eaeb0 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `636b36e7...` |
| <!-- coderef:uuid=27794d4f-f61a-56a5-b214-aac29736c6e3 --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `27794d4f...` |
| <!-- coderef:uuid=f50ccd78-456b-5c90-90b1-acd272e82839 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `f50ccd78...` |
| <!-- coderef:uuid=ac191bef-9c54-5e12-b468-2e9de758b693 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `ac191bef...` |
| <!-- coderef:uuid=c2de57b5-efa9-54fd-9a16-6091735ebb30 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `c2de57b5...` |
| <!-- coderef:uuid=4caec01c-2250-5d02-a199-91ec0dac3c6f --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `4caec01c...` |
| <!-- coderef:uuid=ce04be67-8c36-5103-8987-afd35f21d435 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `ce04be67...` |
| <!-- coderef:uuid=41cbf893-f615-5114-aa98-ca72cf302118 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `41cbf893...` |
| <!-- coderef:uuid=f7f37b1d-4744-55c0-8682-42db9c106b0f --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `f7f37b1d...` |
| <!-- coderef:uuid=49f474b8-855b-57e5-aa77-cd916a3b6de3 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `49f474b8...` |
| <!-- coderef:uuid=f9cb47d2-3fac-5323-8d74-6c5ea408a5fa --> `PluginError` | `src/plugins/plugin-registry.ts` | `f9cb47d2...` |
| <!-- coderef:uuid=3e6a730e-e87f-5cdd-8084-a0d3104d69a8 --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `3e6a730e...` |
| <!-- coderef:uuid=24a2bbf9-555a-5ade-aff8-b2563093a9ef --> `QueryExecutor` | `src/query/query-executor.ts` | `24a2bbf9...` |
| <!-- coderef:uuid=bccdf232-88c6-5da4-9d0a-0a4504de0436 --> `EntityRegistry` | `src/registry/entity-registry.ts` | `bccdf232...` |
| <!-- coderef:uuid=2a747b01-f1d8-539b-9935-f7d4987ef0f7 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `2a747b01...` |
| <!-- coderef:uuid=ecc81626-85f2-5a45-bfaf-9202bd9b82e2 --> `LRUCache` | `src/scanner/lru-cache.ts` | `ecc81626...` |
| <!-- coderef:uuid=de9262ec-076f-5f65-90fa-753944e77bdb --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `de9262ec...` |
| <!-- coderef:uuid=a6e34241-2d53-523c-91b6-4899bf167b64 --> `SearchIndex` | `src/search/search-engine.ts` | `a6e34241...` |
| <!-- coderef:uuid=a16b018f-c2da-5f49-adb7-68f5c3a368b7 --> `SearchEngine` | `src/search/search-engine.ts` | `a16b018f...` |
| <!-- coderef:uuid=8e5acb6a-5208-51bc-a77c-7d492b2b9008 --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `8e5acb6a...` |
| <!-- coderef:uuid=3886a405-68ea-580a-ba6e-4b5cc03f3f75 --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `3886a405...` |
| <!-- coderef:uuid=594efc95-7b5a-5a02-8ed0-1fe0c73a9b4e --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `594efc95...` |
| <!-- coderef:uuid=bb2190d1-7cde-5e59-a9c5-d278e1718270 --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `bb2190d1...` |
| <!-- coderef:uuid=e7535c25-0dfa-5c6e-a3f5-23af9f8d47f6 --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `e7535c25...` |
| <!-- coderef:uuid=739a7222-c658-5bf2-b39e-ef0a0a1e5604 --> `OpenAI` | `src/types/external-modules.d.ts` | `739a7222...` |
| <!-- coderef:uuid=7d8e4a2b-6948-530d-aa7e-3c83c405cee8 --> `Anthropic` | `src/types/external-modules.d.ts` | `7d8e4a2b...` |
| <!-- coderef:uuid=519dcb51-904f-524a-8c3a-c034bc6bfa5e --> `ChromaClient` | `src/types/external-modules.d.ts` | `519dcb51...` |
| <!-- coderef:uuid=44375692-7596-57f5-a441-e2d6992c9cce --> `Collection` | `src/types/external-modules.d.ts` | `44375692...` |
| <!-- coderef:uuid=ce9256f6-c004-5894-8032-2716feee0067 --> `Pinecone` | `src/types/external-modules.d.ts` | `ce9256f6...` |
| <!-- coderef:uuid=ec196a58-2b50-5231-8eac-b565ea099c1d --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `ec196a58...` |
| <!-- coderef:uuid=70a4faf2-b504-57b8-b32c-b42dad52dd4f --> `CodeRefValidator` | `src/validator/validator.ts` | `70a4faf2...` |

---

## Exported Interfaces (346)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=a9e86575-4110-58a1-a737-245069603802 --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `a9e86575...` |
| <!-- coderef:uuid=6e9b1f3f-b67e-54f9-8e91-7b987873c93a --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `6e9b1f3f...` |
| <!-- coderef:uuid=f85531bc-58ea-5b90-81cd-9d1d3372c55f --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `f85531bc...` |
| <!-- coderef:uuid=07626779-1b46-5cda-898b-bacb6dc9a131 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `07626779...` |
| <!-- coderef:uuid=0c8af5bc-91d8-5c02-98ad-04cd6116037c --> `CallExpression` | `src/analyzer/call-detector.ts` | `0c8af5bc...` |
| <!-- coderef:uuid=726ab36e-b0c2-5840-87f1-2676c349cbc7 --> `CallEdge` | `src/analyzer/call-detector.ts` | `726ab36e...` |
| <!-- coderef:uuid=7ed39358-061c-52da-93a0-b82c0bbca47b --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `7ed39358...` |
| <!-- coderef:uuid=b7eb5f63-efe4-5ef0-8415-a56eec7f0690 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `b7eb5f63...` |
| <!-- coderef:uuid=652a7724-6a50-599a-9942-e787db8b8afe --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `652a7724...` |
| <!-- coderef:uuid=763e0ab1-3f0f-52fe-a5ee-7cdcf425ec29 --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `763e0ab1...` |
| <!-- coderef:uuid=077d679c-4b91-5c10-84d6-599e073b020b --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `077d679c...` |
| <!-- coderef:uuid=6f5f5f4d-72cb-5e0d-9114-4b5de35b76e9 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `6f5f5f4d...` |
| <!-- coderef:uuid=7593d6a8-81df-5131-b0bd-fa95486a635d --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `7593d6a8...` |
| <!-- coderef:uuid=ab7e2e04-b0eb-513e-8d6c-5ec0c24951ae --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `ab7e2e04...` |
| <!-- coderef:uuid=ece6a25f-c90f-5859-af67-50ce5c10b718 --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `ece6a25f...` |
| <!-- coderef:uuid=19b43c11-8185-5676-ac85-ba94e495a530 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `19b43c11...` |
| <!-- coderef:uuid=62daa7c5-8a98-57a4-b270-6a1947d10152 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `62daa7c5...` |
| <!-- coderef:uuid=3afd629f-0bbf-5316-af0c-e5741127bbb0 --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `3afd629f...` |
| <!-- coderef:uuid=c1014411-bda7-592a-b6c2-3272003a59fc --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `c1014411...` |
| <!-- coderef:uuid=c171de45-77eb-59bf-b3f3-e11990ec6fca --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `c171de45...` |
| <!-- coderef:uuid=73ba7332-5d4f-5880-b8c3-80912a831147 --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `73ba7332...` |
| <!-- coderef:uuid=9b9f8434-b8ef-5b7e-a0b0-d164cdc27709 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `9b9f8434...` |
| <!-- coderef:uuid=21b25ff4-7114-5a00-9389-07e13edce5d1 --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `21b25ff4...` |
| <!-- coderef:uuid=f3d79b8b-bef5-5b68-8970-33e7cfcae766 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `f3d79b8b...` |
| <!-- coderef:uuid=c3dd07b5-0c6e-5069-82c6-83249403026b --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `c3dd07b5...` |
| <!-- coderef:uuid=fff7749d-7788-5859-9572-6d53bba0e5b1 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `fff7749d...` |
| <!-- coderef:uuid=9ea15d03-4936-5151-ab8a-ddc6a7d12bd8 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `9ea15d03...` |
| <!-- coderef:uuid=c172aa71-6225-57a6-a305-cd0a977289ba --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `c172aa71...` |
| <!-- coderef:uuid=2c5b4873-8ea8-5002-92cd-0b7212037a32 --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `2c5b4873...` |
| <!-- coderef:uuid=a0b650c9-963d-5283-ae15-ad9477e29dc2 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `a0b650c9...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (49)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=6f92f35d-fa43-5471-996c-5e89b6ae6cea --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `6f92f35d...` |
| <!-- coderef:uuid=1081abc0-3598-519b-b14d-76fd27c17e24 --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `1081abc0...` |
| <!-- coderef:uuid=9065a071-a134-5933-8b48-6b173dcb3f25 --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `9065a071...` |
| <!-- coderef:uuid=a7670f2b-fc57-50a9-9ab4-c39d13c6c99c --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `a7670f2b...` |
| <!-- coderef:uuid=0a01f805-6f55-5def-b20d-6a297eab47f9 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `0a01f805...` |
| <!-- coderef:uuid=b52d07f8-9166-5c39-8065-2642352856f2 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `b52d07f8...` |
| <!-- coderef:uuid=10930a3c-e7cf-5d54-9928-6dd8134bcc1f --> `ExportFormat` | `src/export/graph-exporter.ts` | `10930a3c...` |
| <!-- coderef:uuid=10cdacb9-2a7a-5cea-996d-7e14f7386143 --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `10cdacb9...` |
| <!-- coderef:uuid=a2d184c5-bd25-5cee-bb63-9c9dc5897f02 --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `a2d184c5...` |
| <!-- coderef:uuid=49e9f7f8-3caa-545d-8182-7925d8531d0b --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `49e9f7f8...` |
| <!-- coderef:uuid=ff0618e1-4dcd-594e-80c8-456f54fd2ace --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `ff0618e1...` |
| <!-- coderef:uuid=db484601-80b0-5917-a330-2aca356bffcd --> `IndexingStage` | `src/indexer/indexer-service.ts` | `db484601...` |
| <!-- coderef:uuid=6c4fdb06-14da-5326-9a3f-0e2c62a2ee63 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `6c4fdb06...` |
| <!-- coderef:uuid=0eae76c3-d5eb-517b-a8d2-c7d62d173189 --> `QueryFilter` | `src/indexer/query-engine.ts` | `0eae76c3...` |
| <!-- coderef:uuid=d7d84b39-426b-5bfe-bd69-141d061f0baf --> `RelationshipType` | `src/indexer/relationship-index.ts` | `d7d84b39...` |
| <!-- coderef:uuid=df8982e9-fa56-57ab-b8ce-5e28e75968ff --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `df8982e9...` |
| <!-- coderef:uuid=73349089-16fa-5cb1-9db9-ff62a95c0178 --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `73349089...` |
| <!-- coderef:uuid=805f4bc4-d720-5f4d-b450-a8d0b2324b86 --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `805f4bc4...` |
| <!-- coderef:uuid=02b65436-ad46-5c75-842c-78dd34c2154b --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `02b65436...` |
| <!-- coderef:uuid=96a2856f-d8e6-515f-beec-c03cbbe97ae8 --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `96a2856f...` |
| <!-- coderef:uuid=b63df50d-48d9-5615-9bd8-c3463a05055c --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `b63df50d...` |
| <!-- coderef:uuid=2e368976-b7b8-54c0-96af-2523387e42bc --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `2e368976...` |
| <!-- coderef:uuid=900f6bbd-1353-5f61-afd1-704d0dbcaa46 --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `900f6bbd...` |
| <!-- coderef:uuid=cd126bc8-32b8-50b2-b07c-8d7f8bf1e781 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `cd126bc8...` |
| <!-- coderef:uuid=5ea35fdc-f8ea-5be5-be2f-c84dc231138d --> `RelativePath` | `src/integration/rag/path-types.ts` | `5ea35fdc...` |
| <!-- coderef:uuid=f5524539-ddd1-53ce-9fdb-0ec0f5ec15bd --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `f5524539...` |
| <!-- coderef:uuid=2c50650f-3fa5-5f23-b2e9-18248f66e87d --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `2c50650f...` |
| <!-- coderef:uuid=a4871c6a-8ec6-5a88-8c73-a8a424a22bbd --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `a4871c6a...` |
| <!-- coderef:uuid=4cb34200-0e85-5372-8da8-346808ebee01 --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `4cb34200...` |
| <!-- coderef:uuid=75b5e04a-5e51-5a5a-b29a-43650e34498d --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `75b5e04a...` |
| <!-- coderef:uuid=9e45fc57-9b35-5f2e-b53a-1e52de646417 --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `9e45fc57...` |
| <!-- coderef:uuid=64d02424-61ba-5657-8a56-54dedccb0680 --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `64d02424...` |
| <!-- coderef:uuid=56512588-d8b7-56ad-a9ab-210496d5b6a9 --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `56512588...` |
| <!-- coderef:uuid=41dbb31d-05f8-518d-bfad-7e1378111071 --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `41dbb31d...` |
| <!-- coderef:uuid=5353441f-12b2-5a5d-9586-bbc666a45ff0 --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `5353441f...` |
| <!-- coderef:uuid=4fe1930e-f6fe-58e9-9a9a-b573f41d3f30 --> `ExportTable` | `src/pipeline/import-resolver.ts` | `4fe1930e...` |
| <!-- coderef:uuid=5e2821a6-79cb-5aa2-adaa-2eb70bf322dd --> `LanguageExtension` | `src/pipeline/types.ts` | `5e2821a6...` |
| <!-- coderef:uuid=6c45267d-0822-5c9c-bc2f-e0de577a7b9b --> `RawExportKind` | `src/pipeline/types.ts` | `6c45267d...` |
| <!-- coderef:uuid=cfedab55-9eb6-5e0b-ae89-017a765bb0ee --> `PluginSource` | `src/plugins/types.ts` | `cfedab55...` |
| <!-- coderef:uuid=594a874f-3596-5404-b71a-35a85e971d5f --> `QueryType` | `src/query/query-executor.ts` | `594a874f...` |
| <!-- coderef:uuid=397e815e-cfb6-52e9-a327-377f287cf2e4 --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `397e815e...` |
| <!-- coderef:uuid=696dc128-3a3a-5154-8380-1e76b5b1ff8e --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `696dc128...` |
| <!-- coderef:uuid=5625e2bb-01be-5277-b17d-afc4f6272989 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `5625e2bb...` |
| <!-- coderef:uuid=73d4f617-88f5-576e-8fd2-be6da9a66710 --> `LogLevel` | `src/utils/logger.ts` | `73d4f617...` |
| <!-- coderef:uuid=284cab45-4e73-5814-99ea-d32ec492c2ea --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `284cab45...` |
| <!-- coderef:uuid=1160f85d-e821-5a88-af51-a17e8ec60461 --> `IndexedCoderef` | `types.d.ts` | `1160f85d...` |
| <!-- coderef:uuid=27512d87-0685-544e-9830-5b8be2b53b64 --> `DriftStatus` | `types.d.ts` | `27512d87...` |
| <!-- coderef:uuid=00c7b8f7-4387-5144-9c3c-912227f85d3f --> `DriftReport` | `types.d.ts` | `00c7b8f7...` |
| <!-- coderef:uuid=31549072-1c7e-5d3b-b78b-9fbb6eba84aa --> `DriftDetectionOptions` | `types.d.ts` | `31549072...` |

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
