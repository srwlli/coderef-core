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
| <!-- coderef:uuid=1bd7cf86-33ad-546f-aa01-d1e82c4bccd0 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `1bd7cf86...` |
| <!-- coderef:uuid=67799327-dde7-5917-95ca-d2706cb36ac5 --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `67799327...` |
| <!-- coderef:uuid=77e2ed18-25f2-54ca-b271-aeeb072c37f1 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `77e2ed18...` |
| <!-- coderef:uuid=2314373f-1d26-557e-bafc-cf15000eaac4 --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `2314373f...` |
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
| <!-- coderef:uuid=2649acce-f10b-5260-9be7-9e8f08f82c74 --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `2649acce...` |
| <!-- coderef:uuid=5cc2a0f8-47ef-5755-bd1e-4d6d86b69bc0 --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `5cc2a0f8...` |
| <!-- coderef:uuid=30cbaca0-596c-55f4-bb21-f319d35d8371 --> `CallDetector` | `src/analyzer/call-detector.ts` | `30cbaca0...` |
| <!-- coderef:uuid=5a8737d6-c166-5cb6-9630-9d979aca6e06 --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `5a8737d6...` |
| <!-- coderef:uuid=0c2fb935-21c6-5c96-ae12-a846331ae4f6 --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `0c2fb935...` |
| <!-- coderef:uuid=a0d7b907-73b5-5bf7-bd09-9175f2f7510b --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `a0d7b907...` |
| <!-- coderef:uuid=1797836a-bd91-5b18-9764-751af055010f --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `1797836a...` |
| <!-- coderef:uuid=ff1bcef6-fb64-5faa-b913-7674a866ce40 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `ff1bcef6...` |
| <!-- coderef:uuid=738bd2a0-210e-5b42-956d-89752451a5d5 --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `738bd2a0...` |
| <!-- coderef:uuid=1ff50929-dc79-5b90-b4bb-30522e428970 --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `1ff50929...` |
| <!-- coderef:uuid=a5cb5d1a-6c97-5043-899a-b8707658c75d --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `a5cb5d1a...` |
| <!-- coderef:uuid=388beab4-6228-529b-9d8f-4641da34aadd --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `388beab4...` |
| <!-- coderef:uuid=e9a16158-b289-57d7-bd4e-a863d8171f5a --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `e9a16158...` |
| <!-- coderef:uuid=9347e784-eff9-549e-ab40-788ab8e02de2 --> `GraphError` | `src/analyzer/graph-error.ts` | `9347e784...` |
| <!-- coderef:uuid=5cdb42a1-cfae-52a8-bea9-a7ed61149919 --> `ImportParser` | `src/analyzer/import-parser.ts` | `5cdb42a1...` |
| <!-- coderef:uuid=5fcafd77-39c0-55a5-b7bd-2d4884abb6af --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `5fcafd77...` |
| <!-- coderef:uuid=7bee3d64-f3a6-50d9-b45b-e45e5e6f1ebe --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `7bee3d64...` |
| <!-- coderef:uuid=add697b8-dcb0-5e3c-bf7c-2b1c53f34229 --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `add697b8...` |
| <!-- coderef:uuid=5200a0e5-78a1-5a37-9093-ce847ffe88c1 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `5200a0e5...` |
| <!-- coderef:uuid=daf01cdc-8184-520e-9297-5af5fb3350d3 --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `daf01cdc...` |
| <!-- coderef:uuid=d0d50a7a-c9b7-524b-a674-82598440bf3e --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `d0d50a7a...` |
| <!-- coderef:uuid=c4d4c0b5-745d-5f4d-832a-8a8a78628781 --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `c4d4c0b5...` |
| <!-- coderef:uuid=c0a1c823-5529-5262-9929-9d4ddf8f1e4f --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `c0a1c823...` |
| <!-- coderef:uuid=4edf8900-7a4b-58f7-b40a-f852ed7d04f2 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `4edf8900...` |
| <!-- coderef:uuid=0e527b54-56bf-58e4-b972-d4693e04f8ab --> `ContextGenerator` | `src/context/context-generator.ts` | `0e527b54...` |
| <!-- coderef:uuid=c2e3af01-0dc5-583d-81d4-57398e4255a3 --> `ContextTracker` | `src/context/context-tracker.ts` | `c2e3af01...` |
| <!-- coderef:uuid=2b796a7c-0090-5ac2-b9cb-f6a68d833d3f --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `2b796a7c...` |
| <!-- coderef:uuid=773ebd01-4bb6-5e64-96aa-a20ad220520b --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `773ebd01...` |
| <!-- coderef:uuid=44498d14-0858-5a43-b28e-35a7aa487f5c --> `ExampleExtractor` | `src/context/example-extractor.ts` | `44498d14...` |
| <!-- coderef:uuid=3ad1c8ed-d398-56ab-82d1-6ad853473a3c --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `3ad1c8ed...` |
| <!-- coderef:uuid=3a5028e1-3272-587e-bb84-db491ef41d24 --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `3a5028e1...` |
| <!-- coderef:uuid=d60a040a-d92e-59ab-a972-f1d7c8df0b9b --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `d60a040a...` |
| <!-- coderef:uuid=06b828f5-bad0-56a0-9564-10eaad405438 --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `06b828f5...` |
| <!-- coderef:uuid=e953cbfd-b162-5024-bf3d-cad153b09af6 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `e953cbfd...` |
| <!-- coderef:uuid=11e2cd85-297a-580a-ba9f-50f534b50004 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `11e2cd85...` |
| <!-- coderef:uuid=add3b036-3439-5adf-96a8-a25f08362db3 --> `CodeRefError` | `src/errors/CodeRefError.ts` | `add3b036...` |
| <!-- coderef:uuid=6191aab4-1fbc-5ddb-b260-c2108b6dc713 --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `6191aab4...` |
| <!-- coderef:uuid=374426b5-4fc3-5104-9ace-0b5cf34f3077 --> `IndexError` | `src/errors/IndexError.ts` | `374426b5...` |
| <!-- coderef:uuid=5ff1014a-7bbc-55e9-9243-b98cb76190b4 --> `ParseError` | `src/errors/ParseError.ts` | `5ff1014a...` |
| <!-- coderef:uuid=ad60ca6b-078f-5ce3-87ef-9197ba20ac12 --> `ScanError` | `src/errors/ScanError.ts` | `ad60ca6b...` |
| <!-- coderef:uuid=d08a6799-34c6-5851-8f86-05f924000f3e --> `ValidationError` | `src/errors/ValidationError.ts` | `d08a6799...` |
| <!-- coderef:uuid=cd4f2def-01dc-5f0f-915d-9d2a5f843400 --> `GraphExporter` | `src/export/graph-exporter.ts` | `cd4f2def...` |
| <!-- coderef:uuid=6e422bac-1e9a-51cc-961a-549527971751 --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `6e422bac...` |
| <!-- coderef:uuid=bc149f00-48b6-5e1c-917f-aecb6b62335f --> `IndexStore` | `src/indexer/index-store.ts` | `bc149f00...` |
| <!-- coderef:uuid=9856ca45-755b-5b8f-86c6-f1d941e7a06c --> `IndexerService` | `src/indexer/indexer-service.ts` | `9856ca45...` |
| <!-- coderef:uuid=5051744c-0437-5f07-a191-c4479a313a74 --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `5051744c...` |
| <!-- coderef:uuid=9c6da8ad-cae1-5607-8f27-dc3246b5d181 --> `QueryEngine` | `src/indexer/query-engine.ts` | `9c6da8ad...` |
| <!-- coderef:uuid=b778ccb2-6b2d-551a-9b7c-04097c9a0272 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `b778ccb2...` |
| <!-- coderef:uuid=f84a7b7d-558e-5c89-828c-efe462b35885 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `f84a7b7d...` |
| <!-- coderef:uuid=bd2c7b6e-e113-5572-9b4c-5b6e0c93a8c2 --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `bd2c7b6e...` |
| <!-- coderef:uuid=b8b34074-2333-56d2-937e-7655d905b1e0 --> `LLMError` | `src/integration/llm/llm-provider.ts` | `b8b34074...` |
| <!-- coderef:uuid=7a8cba8d-5cfd-5281-9549-5beeb6d1ead5 --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `7a8cba8d...` |
| <!-- coderef:uuid=69851f9a-d0bd-53a7-ad45-b6840483ace3 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `69851f9a...` |
| <!-- coderef:uuid=c1397a5a-4ab0-5dd7-acaa-160d16cbc7a4 --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `c1397a5a...` |
| <!-- coderef:uuid=d1326d6d-b8d6-576f-98b2-7ab91a278ca9 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `d1326d6d...` |
| <!-- coderef:uuid=c42a6545-d855-5089-a0c0-4752c307acfe --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `c42a6545...` |
| <!-- coderef:uuid=bfe8850c-1f03-52b0-8d75-7fef0ac4f492 --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `bfe8850c...` |
| <!-- coderef:uuid=603ce248-a8be-516d-858f-5d68f59d6e04 --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `603ce248...` |
| <!-- coderef:uuid=d693bd20-2638-5825-8905-74b604d1e6ed --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `d693bd20...` |
| <!-- coderef:uuid=20589089-c603-51ee-ac80-543c7cca61e3 --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `20589089...` |
| <!-- coderef:uuid=8c9adc82-1098-51ec-a0af-1dc2827ea06b --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `8c9adc82...` |
| <!-- coderef:uuid=7c951496-c3de-5187-9ac9-aa0f542cc81f --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `7c951496...` |
| <!-- coderef:uuid=3741a98d-6329-5e1a-954e-07a8e0f21014 --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `3741a98d...` |
| <!-- coderef:uuid=e5bef10c-1ec9-563c-8eca-62a5526389b2 --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `e5bef10c...` |
| <!-- coderef:uuid=5fc32acc-002a-54dd-9b48-04faea420145 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `5fc32acc...` |
| <!-- coderef:uuid=4a33c4cb-9cbb-5be5-a6d9-6ab433b1188e --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `4a33c4cb...` |
| <!-- coderef:uuid=62e08254-a916-544e-9538-cbefee3f2d28 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `62e08254...` |
| <!-- coderef:uuid=b49ab075-71f0-5955-8755-041e8d39d4fa --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `b49ab075...` |
| <!-- coderef:uuid=c0b827b3-b485-5a8a-ac77-b0f45f11a034 --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `c0b827b3...` |
| <!-- coderef:uuid=f80f7807-1722-55f3-9f04-47324d21d3f2 --> `ConfigError` | `src/integration/rag/rag-config.ts` | `f80f7807...` |
| <!-- coderef:uuid=4d453bf2-a236-5c0c-a769-7bf460624da3 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `4d453bf2...` |
| <!-- coderef:uuid=cc75a0ec-ab38-5438-9857-26eca194bf26 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `cc75a0ec...` |
| <!-- coderef:uuid=9497d69d-5c1c-5e70-b9ab-edca9c4eb1ed --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `9497d69d...` |
| <!-- coderef:uuid=7eee94d1-260b-5614-a158-81a4faf6c07f --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `7eee94d1...` |
| <!-- coderef:uuid=ea1f237a-f3da-548e-ae35-2aab44598054 --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `ea1f237a...` |
| <!-- coderef:uuid=cb99a9e6-736c-53ba-a04b-ba461925f792 --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `cb99a9e6...` |
| <!-- coderef:uuid=61f6870c-7cd4-5b44-b4d2-83d1b86e8881 --> `CodeRefParser` | `src/parser/parser.ts` | `61f6870c...` |
| <!-- coderef:uuid=9bf33192-f913-5336-9f21-029c6fcf27a8 --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `9bf33192...` |
| <!-- coderef:uuid=fd1b24f7-8ba3-5d75-9253-7fc872b356a1 --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `fd1b24f7...` |
| <!-- coderef:uuid=52790421-2db7-5d62-878b-a316053692c1 --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `52790421...` |
| <!-- coderef:uuid=3baf8207-93d1-5983-a840-d9256e325cda --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `3baf8207...` |
| <!-- coderef:uuid=b78a503f-1c85-5ba9-9de1-6e11af6de94c --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `b78a503f...` |
| <!-- coderef:uuid=e63ecc36-5048-54dc-8900-dfdb739d5278 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `e63ecc36...` |
| <!-- coderef:uuid=99e2dbcb-ee27-5540-9a81-3c946e179e34 --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `99e2dbcb...` |
| <!-- coderef:uuid=219c1379-2559-5fb3-be6d-8953c09bf971 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `219c1379...` |
| <!-- coderef:uuid=c60939ba-63f9-5ff0-a60c-8c25f12fa716 --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `c60939ba...` |
| <!-- coderef:uuid=b1033912-8407-5b69-9d06-ad5b1fa3a292 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `b1033912...` |
| <!-- coderef:uuid=abd248ee-afc0-564c-83ae-844c824ff49c --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `abd248ee...` |
| <!-- coderef:uuid=8db09297-8d81-5336-9def-5566e24b7cba --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `8db09297...` |
| <!-- coderef:uuid=0a9cec2e-63f0-5635-b0e4-9e76e6bd4167 --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `0a9cec2e...` |
| <!-- coderef:uuid=1823aefb-5849-5c2a-aa5e-51931db2528c --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `1823aefb...` |
| <!-- coderef:uuid=34e1575c-742e-5b95-9217-d0759093db82 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `34e1575c...` |
| <!-- coderef:uuid=e6f650b1-1e27-5b4c-973a-5d8e81b3a14b --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `e6f650b1...` |
| <!-- coderef:uuid=49f474b8-855b-57e5-aa77-cd916a3b6de3 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `49f474b8...` |
| <!-- coderef:uuid=63701a85-24eb-5b8e-9859-b8273b96e456 --> `PluginError` | `src/plugins/plugin-registry.ts` | `63701a85...` |
| <!-- coderef:uuid=51b7ebaa-9d5e-5591-a2e9-6d1e52df3c57 --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `51b7ebaa...` |
| <!-- coderef:uuid=729e02fd-cd2a-5c3b-bd79-c2405f086b1e --> `QueryExecutor` | `src/query/query-executor.ts` | `729e02fd...` |
| <!-- coderef:uuid=26ce4371-4f72-58b7-af2d-7ffe8453be5f --> `EntityRegistry` | `src/registry/entity-registry.ts` | `26ce4371...` |
| <!-- coderef:uuid=d04780f5-9e5a-5a8f-a00e-2f45720c8640 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `d04780f5...` |
| <!-- coderef:uuid=b890f2e5-9d63-5d64-b618-89608b8dc243 --> `LRUCache` | `src/scanner/lru-cache.ts` | `b890f2e5...` |
| <!-- coderef:uuid=918519be-80f8-5b90-acf2-185f7faad1e1 --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `918519be...` |
| <!-- coderef:uuid=97594f3f-2941-5542-a893-2379779a091e --> `SearchIndex` | `src/search/search-engine.ts` | `97594f3f...` |
| <!-- coderef:uuid=f055d65d-0b8d-5d25-8033-246c58d4b1b0 --> `SearchEngine` | `src/search/search-engine.ts` | `f055d65d...` |
| <!-- coderef:uuid=c89f5672-4692-5059-80c4-5a3e777b19a1 --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `c89f5672...` |
| <!-- coderef:uuid=99bf2703-49af-5231-b058-82ae4c61893f --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `99bf2703...` |
| <!-- coderef:uuid=a43d8a3e-4a7f-5ac0-92e1-1cfd0e53fb47 --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `a43d8a3e...` |
| <!-- coderef:uuid=eb275c71-bfdf-5ef6-8edc-85831c8a82ba --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `eb275c71...` |
| <!-- coderef:uuid=a2ccf262-e8c0-522d-8c44-1adb777de787 --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `a2ccf262...` |
| <!-- coderef:uuid=216300a1-2b97-5da0-94aa-bfb258e16392 --> `OpenAI` | `src/types/external-modules.d.ts` | `216300a1...` |
| <!-- coderef:uuid=2947fe4d-312a-52ab-8e98-3eb55ccd057e --> `Anthropic` | `src/types/external-modules.d.ts` | `2947fe4d...` |
| <!-- coderef:uuid=b032bc26-3640-52cd-9970-da0a9fbc4c06 --> `ChromaClient` | `src/types/external-modules.d.ts` | `b032bc26...` |
| <!-- coderef:uuid=76ae4077-e392-55f4-a107-7191d91e187e --> `Collection` | `src/types/external-modules.d.ts` | `76ae4077...` |
| <!-- coderef:uuid=50e3a9ca-8e49-5216-aa6f-ba3800ac3bdb --> `Pinecone` | `src/types/external-modules.d.ts` | `50e3a9ca...` |
| <!-- coderef:uuid=9147e9ed-9a13-513e-ae43-9a8372d1ce78 --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `9147e9ed...` |
| <!-- coderef:uuid=33d70a50-6c62-5e00-8974-5480a4b8b11e --> `CodeRefValidator` | `src/validator/validator.ts` | `33d70a50...` |

---

## Exported Interfaces (346)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=4260a791-0611-5b43-bd53-05992755b59f --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `4260a791...` |
| <!-- coderef:uuid=f94a4a41-34cc-5ffd-8ae7-c6f64abb87d7 --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `f94a4a41...` |
| <!-- coderef:uuid=de26f405-9ab8-58f6-bca5-42744c0a5e64 --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `de26f405...` |
| <!-- coderef:uuid=00b128dc-bc26-5baa-9c46-65f892ebcbd9 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `00b128dc...` |
| <!-- coderef:uuid=acf48808-bd32-5cf8-a64a-85b3c1be67af --> `CallExpression` | `src/analyzer/call-detector.ts` | `acf48808...` |
| <!-- coderef:uuid=c7dd9225-a4db-51c2-8c0a-b0f2a4adb209 --> `CallEdge` | `src/analyzer/call-detector.ts` | `c7dd9225...` |
| <!-- coderef:uuid=3034ed3f-6348-5455-9e0e-87c199f1c677 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `3034ed3f...` |
| <!-- coderef:uuid=d64b21ac-e9d6-58ad-b181-2e239ad72f7b --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `d64b21ac...` |
| <!-- coderef:uuid=1d28024d-8a07-5b11-9a9b-6bfd953fed18 --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `1d28024d...` |
| <!-- coderef:uuid=1932c71a-cafb-5526-9297-0755147f4d9e --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `1932c71a...` |
| <!-- coderef:uuid=89a4660b-4148-58e0-9fa1-88e4360e52fa --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `89a4660b...` |
| <!-- coderef:uuid=2ce70c52-27b9-5c64-98dd-1e6e7cfdde97 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `2ce70c52...` |
| <!-- coderef:uuid=32e6d48f-6f20-5381-91fe-a39ca6189130 --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `32e6d48f...` |
| <!-- coderef:uuid=b982a2eb-8489-518e-9e38-6f97985bf743 --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `b982a2eb...` |
| <!-- coderef:uuid=37382029-0863-55bd-b94c-ea7d04fd65e4 --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `37382029...` |
| <!-- coderef:uuid=a5c138d2-4be4-5723-a12f-3f83813a34f2 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `a5c138d2...` |
| <!-- coderef:uuid=68c99f98-ff69-5ab9-a93b-381aafaf8a1b --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `68c99f98...` |
| <!-- coderef:uuid=0bad1f00-9e9c-5dcc-98de-4ce0b92942b4 --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `0bad1f00...` |
| <!-- coderef:uuid=36153823-76ab-5665-a53e-c08332b37980 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `36153823...` |
| <!-- coderef:uuid=1484403a-2e8b-5699-9797-a95de0dd1e73 --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `1484403a...` |
| <!-- coderef:uuid=e4744810-2a85-5144-9faf-d8439463bcc5 --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `e4744810...` |
| <!-- coderef:uuid=09bf0b4e-9698-53ad-9e63-91a0f0a423b5 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `09bf0b4e...` |
| <!-- coderef:uuid=00930883-9c12-52dd-aea1-b2f9506ae4c4 --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `00930883...` |
| <!-- coderef:uuid=07ac89ea-b600-5623-bfd7-3b81930101e9 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `07ac89ea...` |
| <!-- coderef:uuid=b5339bab-e6d3-56e8-8ef6-b47ebc575dfc --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `b5339bab...` |
| <!-- coderef:uuid=feec9ce7-5523-5201-bfce-0d1324e57c4e --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `feec9ce7...` |
| <!-- coderef:uuid=81ad3de2-7d26-5e7b-8740-524ddca3ecb6 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `81ad3de2...` |
| <!-- coderef:uuid=25b4095d-073e-5d9b-8ec9-925579cbb2a9 --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `25b4095d...` |
| <!-- coderef:uuid=e864e55d-aa62-5d6f-8159-836fce939bfe --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `e864e55d...` |
| <!-- coderef:uuid=1f820a6e-cf95-514a-956c-2e29de001af0 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `1f820a6e...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (49)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=103c7f16-ef8a-5474-9018-a7337a7a730a --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `103c7f16...` |
| <!-- coderef:uuid=0a524fb6-00c7-5967-b152-2b45be08863d --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `0a524fb6...` |
| <!-- coderef:uuid=37f67a12-59c2-54f4-b90e-390f86469480 --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `37f67a12...` |
| <!-- coderef:uuid=abc3894c-7ae7-535e-8085-35b893ab7912 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `abc3894c...` |
| <!-- coderef:uuid=836a02d8-9aed-5451-823a-e66ccb4c3de8 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `836a02d8...` |
| <!-- coderef:uuid=2f11db9e-fc9f-5d06-ab69-6a0493e883d6 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `2f11db9e...` |
| <!-- coderef:uuid=700b4db5-5d1c-58de-b07c-0bcbfb757328 --> `ExportFormat` | `src/export/graph-exporter.ts` | `700b4db5...` |
| <!-- coderef:uuid=5fe78903-175a-57a4-9bdf-dd6de4b7a181 --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `5fe78903...` |
| <!-- coderef:uuid=c7a30a40-a016-5689-8bfc-b36455ebaa65 --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `c7a30a40...` |
| <!-- coderef:uuid=3712ae1a-7505-54b6-a76a-4f915c172472 --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `3712ae1a...` |
| <!-- coderef:uuid=868f83f2-db27-53cf-8047-344c0425f96c --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `868f83f2...` |
| <!-- coderef:uuid=e088b61a-ce9c-53b2-b450-a618b14c611e --> `IndexingStage` | `src/indexer/indexer-service.ts` | `e088b61a...` |
| <!-- coderef:uuid=506053d5-1a9b-57c8-a17d-200a980d1ed1 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `506053d5...` |
| <!-- coderef:uuid=af03fd5c-05ed-5351-b302-356668fb5c49 --> `QueryFilter` | `src/indexer/query-engine.ts` | `af03fd5c...` |
| <!-- coderef:uuid=0e5b189e-fe01-54d8-ad8f-7eb6c541bfe2 --> `RelationshipType` | `src/indexer/relationship-index.ts` | `0e5b189e...` |
| <!-- coderef:uuid=8d3343a5-9d82-5852-8b49-922f5d0ec4c3 --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `8d3343a5...` |
| <!-- coderef:uuid=4564d019-692d-5567-9a19-5ba1b62083ce --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `4564d019...` |
| <!-- coderef:uuid=0646acef-bdb6-5543-a63b-33968892c537 --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `0646acef...` |
| <!-- coderef:uuid=42c3f34e-13a2-520d-a541-57f847ebe659 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `42c3f34e...` |
| <!-- coderef:uuid=aba5f677-7d69-5d49-b5f9-06d15151deac --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `aba5f677...` |
| <!-- coderef:uuid=d2e81e87-082f-5905-9644-38d9f908b4cc --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `d2e81e87...` |
| <!-- coderef:uuid=43363d4e-d5fb-56a8-b29e-fd6841f42932 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `43363d4e...` |
| <!-- coderef:uuid=3d78e8d6-1bcd-51c0-9ad8-2d886a02a4a4 --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `3d78e8d6...` |
| <!-- coderef:uuid=fd29bfa3-a43c-5d48-a38a-f9b708717758 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `fd29bfa3...` |
| <!-- coderef:uuid=695a7174-0013-5cfc-8a86-5415746f62ff --> `RelativePath` | `src/integration/rag/path-types.ts` | `695a7174...` |
| <!-- coderef:uuid=505dee0a-f64b-516b-a13d-9305a81d75e2 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `505dee0a...` |
| <!-- coderef:uuid=0400bf8d-9487-5b4a-ab66-783a66a758eb --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `0400bf8d...` |
| <!-- coderef:uuid=e7b1ccf1-b08d-5601-84e2-858ea0de25a7 --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `e7b1ccf1...` |
| <!-- coderef:uuid=b2531482-cf93-5d47-85a8-b1b3c334c024 --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `b2531482...` |
| <!-- coderef:uuid=017eb3c3-0502-5959-b71b-2f3a61e0fe88 --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `017eb3c3...` |
| <!-- coderef:uuid=c04e9549-b82d-56f2-8c79-85b271f074ba --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `c04e9549...` |
| <!-- coderef:uuid=80802253-4fdd-5f45-a162-cc6e370102f3 --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `80802253...` |
| <!-- coderef:uuid=cda66ef8-b195-51fb-96db-139c5a63044b --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `cda66ef8...` |
| <!-- coderef:uuid=8717baa9-9763-585c-89fb-50e6e7c2c05d --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `8717baa9...` |
| <!-- coderef:uuid=64169c40-aa2b-5f33-bc86-8f5b05944e8c --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `64169c40...` |
| <!-- coderef:uuid=290ad573-b415-52cb-8337-c576a06ddb27 --> `ExportTable` | `src/pipeline/import-resolver.ts` | `290ad573...` |
| <!-- coderef:uuid=b1b9a87f-e8ac-56f1-98a2-3664e904aeb9 --> `LanguageExtension` | `src/pipeline/types.ts` | `b1b9a87f...` |
| <!-- coderef:uuid=29da8ada-adb9-50e3-9d35-8a4aa0655fea --> `RawExportKind` | `src/pipeline/types.ts` | `29da8ada...` |
| <!-- coderef:uuid=06b2fdaf-f1ef-5759-b59e-cd91dbad2186 --> `PluginSource` | `src/plugins/types.ts` | `06b2fdaf...` |
| <!-- coderef:uuid=f526984f-981b-5741-8de9-6506243faaf5 --> `QueryType` | `src/query/query-executor.ts` | `f526984f...` |
| <!-- coderef:uuid=c1484605-0802-5e3b-b12f-e215f768c7cd --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `c1484605...` |
| <!-- coderef:uuid=b20afaf8-a618-5ff0-a130-fd207bf4c15c --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `b20afaf8...` |
| <!-- coderef:uuid=ce7972c9-94f2-5a70-957e-0e6b58977e79 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `ce7972c9...` |
| <!-- coderef:uuid=57841cf1-da1c-58a6-be61-5fd9019866dc --> `LogLevel` | `src/utils/logger.ts` | `57841cf1...` |
| <!-- coderef:uuid=09d53644-5ad1-50fe-b615-21a487f5633d --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `09d53644...` |
| <!-- coderef:uuid=5e351f02-e014-5fbd-a8d7-c461a96edfe5 --> `IndexedCoderef` | `types.d.ts` | `5e351f02...` |
| <!-- coderef:uuid=3e59f0ed-4839-548e-a4a1-64f2e4945a73 --> `DriftStatus` | `types.d.ts` | `3e59f0ed...` |
| <!-- coderef:uuid=ca597d99-fca0-5512-a273-9350895565ab --> `DriftReport` | `types.d.ts` | `ca597d99...` |
| <!-- coderef:uuid=156bd613-a4dd-5aa5-90eb-e04a5b611acc --> `DriftDetectionOptions` | `types.d.ts` | `156bd613...` |

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
