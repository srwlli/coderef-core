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
| <!-- coderef:uuid=1e3dd8ce-652e-59b3-9186-67d9b3229c54 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `1e3dd8ce...` |
| <!-- coderef:uuid=4d70731e-4397-54ef-ba0d-ffceae9061ad --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `4d70731e...` |
| <!-- coderef:uuid=511241c3-4119-5424-b833-282ae074844b --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `511241c3...` |
| <!-- coderef:uuid=3f40a645-b0b8-5c98-b2dc-d9dc91004030 --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `3f40a645...` |
| <!-- coderef:uuid=f701d682-0069-5728-8127-1da978e2d29b --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `f701d682...` |
| <!-- coderef:uuid=22dcb02b-cf3e-5626-9eb6-5cb12bb17d60 --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `22dcb02b...` |
| <!-- coderef:uuid=676765d3-e10a-536b-bb78-2e68413e9d1b --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `676765d3...` |
| <!-- coderef:uuid=14a5b505-8017-5905-a314-46bef04626d5 --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `14a5b505...` |
| <!-- coderef:uuid=ca01a34f-29dd-5869-b6d0-aada184ee191 --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `ca01a34f...` |
| <!-- coderef:uuid=796e2100-f41b-5cf3-90e5-4e34680f1ce8 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `796e2100...` |
| <!-- coderef:uuid=5dbd7071-1e09-55f7-951d-891b7ad25968 --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `5dbd7071...` |
| <!-- coderef:uuid=4b3b8fdd-396d-58f1-b166-cdb0733dd495 --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `4b3b8fdd...` |
| <!-- coderef:uuid=a1b1316a-bea7-5117-a520-ea50f9f9f19c --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `a1b1316a...` |
| <!-- coderef:uuid=c3f85bfc-e3a0-513e-a497-bdca6b6e27a8 --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `c3f85bfc...` |
| <!-- coderef:uuid=f4ebef84-ea2b-5c45-95af-e6a98339dd11 --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `f4ebef84...` |
| <!-- coderef:uuid=45d39f51-6d1e-5d71-8b1b-fb0923bd3726 --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `45d39f51...` |
| <!-- coderef:uuid=78919e92-e911-574f-862d-522cee2b94f7 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `78919e92...` |
| <!-- coderef:uuid=b8ae0827-79e9-5d7d-ab30-10a0505eaa53 --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `b8ae0827...` |
| <!-- coderef:uuid=0fccff67-046b-5e51-a522-2671678b2977 --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `0fccff67...` |
| <!-- coderef:uuid=cd18a964-edae-5f96-b923-06ac517d3507 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `cd18a964...` |
| <!-- coderef:uuid=d8907e88-c703-5788-8898-9ff207ba8dd0 --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `d8907e88...` |
| <!-- coderef:uuid=13626390-6217-5a45-b44b-843909dc7e96 --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `13626390...` |
| <!-- coderef:uuid=60608e0e-79d0-5587-912c-e2ae4b959679 --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `60608e0e...` |
| <!-- coderef:uuid=810c7857-0e7e-52b7-9f17-2a928595bc34 --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `810c7857...` |
| <!-- coderef:uuid=322fe2a1-79b6-5841-9153-b30a1da8a56a --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `322fe2a1...` |
| <!-- coderef:uuid=fb9ab4a3-9d7d-5efd-b3cf-f7dbbdb593dd --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `fb9ab4a3...` |
| <!-- coderef:uuid=ae3b16b5-6192-50ba-83db-5fb17efd7649 --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `ae3b16b5...` |
| <!-- coderef:uuid=c6324569-c6d5-5580-b322-f15be5d78cad --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `c6324569...` |
| <!-- coderef:uuid=3ad94f2e-bebe-50ad-90e7-b35f11528a10 --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `3ad94f2e...` |
| <!-- coderef:uuid=6f7a74ef-a4f3-5bf6-b2f7-804b735358b9 --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `6f7a74ef...` |
| <!-- coderef:uuid=f855f5ec-31d8-5668-a0e1-7f751c83c9e3 --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `f855f5ec...` |
| <!-- coderef:uuid=6453c176-87a0-56d9-9293-5daf60591830 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `6453c176...` |
| <!-- coderef:uuid=28e045c3-7331-5290-a4fc-9203efbfbcc1 --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `28e045c3...` |
| <!-- coderef:uuid=9f29fbb2-9f74-5421-9f1f-f07c1b285364 --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `9f29fbb2...` |
| <!-- coderef:uuid=2f7974fa-a783-5697-af06-25fc5b46be52 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `2f7974fa...` |
| <!-- coderef:uuid=616f7bad-9e14-5c91-a040-824296612527 --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `616f7bad...` |
| <!-- coderef:uuid=b272cc43-e0b4-55ba-a629-a26fcda64dd6 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `b272cc43...` |
| <!-- coderef:uuid=053b79eb-d875-5d8e-bbc9-e4ea426b5197 --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `053b79eb...` |
| <!-- coderef:uuid=f670139b-c33c-5888-a856-5e962691e66d --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `f670139b...` |
| <!-- coderef:uuid=7a68aaf3-19d3-52e7-bdb8-4c0b3baa4c49 --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `7a68aaf3...` |
| <!-- coderef:uuid=a66cf7a9-119e-5032-9b2c-0646b9519cea --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `a66cf7a9...` |
| <!-- coderef:uuid=694a7aab-f1dd-5365-8f3b-3223565a0dec --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `694a7aab...` |
| <!-- coderef:uuid=798fedcc-2e47-5b31-84c3-617527ba3f3d --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `798fedcc...` |
| <!-- coderef:uuid=733b5553-b074-5685-a4ef-22e8a23299c4 --> `detect_duplicate_pairs` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `733b5553...` |
| <!-- coderef:uuid=4b80f30b-752c-569e-af34-b5e9a7bfaccb --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `4b80f30b...` |
| <!-- coderef:uuid=82046b1b-f3e0-588e-a68e-5339c870dfac --> `main` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `82046b1b...` |
| <!-- coderef:uuid=18ec95cd-73ff-5f34-9023-d79259deb02e --> `log` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `18ec95cd...` |
| <!-- coderef:uuid=ecfc587d-8c3b-5db4-95f9-ec1612b105c1 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `ecfc587d...` |
| <!-- coderef:uuid=99b75f7a-aae9-5742-a4e2-1d58b1471478 --> `load_index` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `99b75f7a...` |
| <!-- coderef:uuid=be7a45b1-1c95-5f0c-9499-88d273756e5e --> `check_export_precision` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `be7a45b1...` |

*... and 354 more functions. See index.json for complete list.*

---

## Exported Classes (115)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=cfbe02ad-a027-5242-8921-73bf73cc859e --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `cfbe02ad...` |
| <!-- coderef:uuid=175e9329-7fde-5539-9f74-d85e93d3060d --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `175e9329...` |
| <!-- coderef:uuid=01bbe35b-eed6-5342-95ff-8c403d79c954 --> `CallDetector` | `src/analyzer/call-detector.ts` | `01bbe35b...` |
| <!-- coderef:uuid=92c88477-02a6-5574-9563-7dd6ef650a60 --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `92c88477...` |
| <!-- coderef:uuid=f1d50580-50dc-59b0-9c6e-df0e25175b63 --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `f1d50580...` |
| <!-- coderef:uuid=cc23f060-b739-5aee-b83e-f0a69855b961 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `cc23f060...` |
| <!-- coderef:uuid=92511385-0b0d-59e3-b60f-b1bf982383b3 --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `92511385...` |
| <!-- coderef:uuid=bc0616b2-5d63-5270-a7c7-a30e42df2bc8 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `bc0616b2...` |
| <!-- coderef:uuid=d00a69d7-6d57-5563-9537-a454841557ee --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `d00a69d7...` |
| <!-- coderef:uuid=988ac6f2-ac53-545b-adea-7ac96ec29351 --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `988ac6f2...` |
| <!-- coderef:uuid=74a623ec-5665-5e8a-8b5b-08a8fb1a3b68 --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `74a623ec...` |
| <!-- coderef:uuid=03c536d3-2caa-5263-b06b-de62796870f0 --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `03c536d3...` |
| <!-- coderef:uuid=968063f5-03a8-514c-a51f-af3eb7327ec3 --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `968063f5...` |
| <!-- coderef:uuid=9c377e17-56fb-57ca-9bd7-db5ea3fc446b --> `GraphError` | `src/analyzer/graph-error.ts` | `9c377e17...` |
| <!-- coderef:uuid=6a55f117-e4c0-5842-ac33-9d6dc41912be --> `ImportParser` | `src/analyzer/import-parser.ts` | `6a55f117...` |
| <!-- coderef:uuid=9262f5de-7d28-5ae8-a1a2-f4ae2714ee2d --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `9262f5de...` |
| <!-- coderef:uuid=0294150a-66d6-5b33-8969-6358c8a2d5ea --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `0294150a...` |
| <!-- coderef:uuid=33579cf9-9629-5914-94a4-abd4be533b2a --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `33579cf9...` |
| <!-- coderef:uuid=0be1efd2-2040-58c7-9565-09266f3353a2 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `0be1efd2...` |
| <!-- coderef:uuid=310d2a52-d506-5edd-8242-574062ac52db --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `310d2a52...` |
| <!-- coderef:uuid=2207bced-32ea-53d2-accb-5a08844762fb --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `2207bced...` |
| <!-- coderef:uuid=77480d73-7f03-5105-ad34-0b8b5f3e3ef7 --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `77480d73...` |
| <!-- coderef:uuid=9ae9e0f5-8fc8-5739-a1e2-8ea254335f2e --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `9ae9e0f5...` |
| <!-- coderef:uuid=dde5db5a-c15e-5db8-913a-eb703489ee3d --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `dde5db5a...` |
| <!-- coderef:uuid=dbc2e4ab-56bf-583f-b6fb-2d2b4c38747a --> `ContextGenerator` | `src/context/context-generator.ts` | `dbc2e4ab...` |
| <!-- coderef:uuid=8c49985b-a841-5083-98d0-cece43ff241e --> `ContextTracker` | `src/context/context-tracker.ts` | `8c49985b...` |
| <!-- coderef:uuid=aedb24e4-f3bb-5c09-a1ce-16854968bdfa --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `aedb24e4...` |
| <!-- coderef:uuid=774c3335-0216-50db-913c-7f60d9b1413a --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `774c3335...` |
| <!-- coderef:uuid=c2ad2ab0-b215-565f-92ae-489850829cb9 --> `ExampleExtractor` | `src/context/example-extractor.ts` | `c2ad2ab0...` |
| <!-- coderef:uuid=2a6b35c6-4b6d-5dc2-91c5-4291a278043e --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `2a6b35c6...` |
| <!-- coderef:uuid=dd900c67-0856-5754-a7fc-e037d517eb1f --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `dd900c67...` |
| <!-- coderef:uuid=c7ee8902-514b-5133-a382-23865ec9eddc --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `c7ee8902...` |
| <!-- coderef:uuid=bddf0114-8cbe-58f1-b17a-7a470a43cf18 --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `bddf0114...` |
| <!-- coderef:uuid=1780662c-28b4-5f87-8be5-1ff82ffdff08 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `1780662c...` |
| <!-- coderef:uuid=c0561a6f-2390-516a-8204-db5316c35779 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `c0561a6f...` |
| <!-- coderef:uuid=3b8a3a28-f3fc-5405-89e7-3aaea0104ec5 --> `CodeRefError` | `src/errors/CodeRefError.ts` | `3b8a3a28...` |
| <!-- coderef:uuid=6fdf5c6d-d532-598a-aaa6-b273437a68b9 --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `6fdf5c6d...` |
| <!-- coderef:uuid=98a61df4-9003-5b71-9043-a9b3b92c40ba --> `IndexError` | `src/errors/IndexError.ts` | `98a61df4...` |
| <!-- coderef:uuid=6d3db87e-c40b-58c6-ae37-6a6cfc763e35 --> `ParseError` | `src/errors/ParseError.ts` | `6d3db87e...` |
| <!-- coderef:uuid=0967cd7e-bda3-57cf-9dcc-d22ae5d24aa8 --> `ScanError` | `src/errors/ScanError.ts` | `0967cd7e...` |
| <!-- coderef:uuid=0b1c0df7-8cad-5f30-b1c7-1da0206807f5 --> `ValidationError` | `src/errors/ValidationError.ts` | `0b1c0df7...` |
| <!-- coderef:uuid=75c1e48c-d817-5d64-859d-a5841a09f8d3 --> `GraphExporter` | `src/export/graph-exporter.ts` | `75c1e48c...` |
| <!-- coderef:uuid=c6ec8dd6-90a0-558b-ac18-7de756ffcf90 --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `c6ec8dd6...` |
| <!-- coderef:uuid=4ab50cdb-6649-55b0-8b37-30cbfbd46bb6 --> `IndexStore` | `src/indexer/index-store.ts` | `4ab50cdb...` |
| <!-- coderef:uuid=b88ace60-5ede-568c-a304-e35d8ed669ac --> `IndexerService` | `src/indexer/indexer-service.ts` | `b88ace60...` |
| <!-- coderef:uuid=1e86bc4f-a382-5371-930f-0583b2126595 --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `1e86bc4f...` |
| <!-- coderef:uuid=4662516b-3ba0-51fa-a330-7f718b45f648 --> `QueryEngine` | `src/indexer/query-engine.ts` | `4662516b...` |
| <!-- coderef:uuid=5fe71978-b3ec-5279-ac16-373863d5143d --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `5fe71978...` |
| <!-- coderef:uuid=8cd4e60a-d04a-5383-bc1c-755baf4b0416 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `8cd4e60a...` |
| <!-- coderef:uuid=809bda22-8853-5b61-bde7-798d59e70fa1 --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `809bda22...` |
| <!-- coderef:uuid=2c0f7476-f33f-578a-8c9c-c380565cc302 --> `LLMError` | `src/integration/llm/llm-provider.ts` | `2c0f7476...` |
| <!-- coderef:uuid=391857ba-38ad-5807-b041-2cea0db6a6fa --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `391857ba...` |
| <!-- coderef:uuid=41552383-3267-5124-87f0-fe4e5ae46b2e --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `41552383...` |
| <!-- coderef:uuid=b2f298ed-c09c-565f-87d6-a913dbd87e2f --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `b2f298ed...` |
| <!-- coderef:uuid=d110885c-da52-5848-8adb-bb856ae4b788 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `d110885c...` |
| <!-- coderef:uuid=3476cf9c-9077-5be0-a7b0-06df234645ec --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `3476cf9c...` |
| <!-- coderef:uuid=6c4a6b36-efd4-5451-b533-5d9e564097d7 --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `6c4a6b36...` |
| <!-- coderef:uuid=df6036bc-193d-55fb-a495-f4ec1338f82d --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `df6036bc...` |
| <!-- coderef:uuid=d8904401-afe6-59a4-87a5-3ca1b376d597 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `d8904401...` |
| <!-- coderef:uuid=4550c68f-c2a2-5633-a2ff-1fedba49f84e --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `4550c68f...` |
| <!-- coderef:uuid=869e6154-5158-5cad-80d4-c2fcd6f74620 --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `869e6154...` |
| <!-- coderef:uuid=6f53d8cd-cceb-55a7-b96b-bd725cf51208 --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `6f53d8cd...` |
| <!-- coderef:uuid=12ca74a9-d8b4-5236-bb96-ddfaf5a28eba --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `12ca74a9...` |
| <!-- coderef:uuid=e30d19e0-05d8-586f-870f-74fa6c98ed5b --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `e30d19e0...` |
| <!-- coderef:uuid=58887cfa-13f7-50a8-a221-06ad4fdf3fb4 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `58887cfa...` |
| <!-- coderef:uuid=da7a8f54-fd65-5505-843e-8d66ebc7a944 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `da7a8f54...` |
| <!-- coderef:uuid=fedee113-7d58-56c0-8cb8-a58128baea63 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `fedee113...` |
| <!-- coderef:uuid=b95e0f65-9682-5fe1-9693-3ed1eba72fda --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `b95e0f65...` |
| <!-- coderef:uuid=acfc53df-9b24-5eab-8816-1f110737721e --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `acfc53df...` |
| <!-- coderef:uuid=b3cce614-cd25-55d1-ba17-9f203a8f753d --> `ConfigError` | `src/integration/rag/rag-config.ts` | `b3cce614...` |
| <!-- coderef:uuid=09a1b1fb-b2db-5806-8755-2aa53df592e7 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `09a1b1fb...` |
| <!-- coderef:uuid=b4aa9030-0fea-51e4-a222-553d605eb271 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `b4aa9030...` |
| <!-- coderef:uuid=2a081061-ff97-5dfa-80cc-186e4f116bd8 --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `2a081061...` |
| <!-- coderef:uuid=883e2b23-aa89-5822-a095-1c81180228ea --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `883e2b23...` |
| <!-- coderef:uuid=3e9ad5f5-9cd4-536e-9554-3298166342ac --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `3e9ad5f5...` |
| <!-- coderef:uuid=8ad49914-54e4-5777-a9fc-f33a50987793 --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `8ad49914...` |
| <!-- coderef:uuid=7ac90680-62df-5070-aca1-1d2a9d80fb55 --> `CodeRefParser` | `src/parser/parser.ts` | `7ac90680...` |
| <!-- coderef:uuid=37ea4e02-c2c0-56e6-ada6-e198a73caf71 --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `37ea4e02...` |
| <!-- coderef:uuid=2e4a34db-a6f7-5042-a375-5e95579af6f8 --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `2e4a34db...` |
| <!-- coderef:uuid=5d7ad3e3-3cf3-5657-accf-676a8314aff7 --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `5d7ad3e3...` |
| <!-- coderef:uuid=36740fd0-db53-570c-ab58-e8834c76d91d --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `36740fd0...` |
| <!-- coderef:uuid=df7f2377-ef0c-5f72-a50f-5c7b9b364359 --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `df7f2377...` |
| <!-- coderef:uuid=1ce81a35-dd1e-5d28-8164-bf72c90ee1f0 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `1ce81a35...` |
| <!-- coderef:uuid=0126d7e5-456c-5553-afb5-ad4828d1aad4 --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `0126d7e5...` |
| <!-- coderef:uuid=834f5cfe-d417-5b0e-a74f-867bc1909dd7 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `834f5cfe...` |
| <!-- coderef:uuid=48a1ba66-88cd-51d2-918b-c19919203f2f --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `48a1ba66...` |
| <!-- coderef:uuid=f50f192f-8f90-511c-be9a-dec761c8bba8 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `f50f192f...` |
| <!-- coderef:uuid=f14cfeb1-0ed4-540a-8a22-ac17a34012b6 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `f14cfeb1...` |
| <!-- coderef:uuid=9667909d-c476-587e-b595-fa583e491eb1 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `9667909d...` |
| <!-- coderef:uuid=208f2406-acd3-5040-a098-08997c157f83 --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `208f2406...` |
| <!-- coderef:uuid=27d27fdc-1b00-548c-8938-40d62529a65e --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `27d27fdc...` |
| <!-- coderef:uuid=8d20b15d-863f-5d31-b6c3-fe1d8faf40e9 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `8d20b15d...` |
| <!-- coderef:uuid=a0266b1d-5402-5370-97a4-5c4fabf7cb26 --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `a0266b1d...` |
| <!-- coderef:uuid=33404170-8b35-50c2-ac16-5f1c1f13577f --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `33404170...` |
| <!-- coderef:uuid=1e6e57f9-6925-5d19-ad6d-a2ee0902d062 --> `PluginError` | `src/plugins/plugin-registry.ts` | `1e6e57f9...` |
| <!-- coderef:uuid=6f4a731b-eb65-5f51-8f3f-0f311cb5fbce --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `6f4a731b...` |
| <!-- coderef:uuid=45e8eca9-8d43-56bf-97e1-d0a32e94df23 --> `QueryExecutor` | `src/query/query-executor.ts` | `45e8eca9...` |
| <!-- coderef:uuid=68cc8805-7be6-5c48-805e-de9b1dab32c7 --> `EntityRegistry` | `src/registry/entity-registry.ts` | `68cc8805...` |
| <!-- coderef:uuid=fb730693-b28c-5261-aee4-8e3edd2b6311 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `fb730693...` |
| <!-- coderef:uuid=f1dc7192-ca0c-5d3a-abff-79bd4bf3afdb --> `LRUCache` | `src/scanner/lru-cache.ts` | `f1dc7192...` |
| <!-- coderef:uuid=6ed68b49-9f11-5e35-a731-0f4872d6905c --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `6ed68b49...` |
| <!-- coderef:uuid=f68dd487-5643-5da9-b77f-4df097c48faf --> `SearchIndex` | `src/search/search-engine.ts` | `f68dd487...` |
| <!-- coderef:uuid=dc426f92-c5ab-5b40-a3b5-0610c4151469 --> `SearchEngine` | `src/search/search-engine.ts` | `dc426f92...` |
| <!-- coderef:uuid=03b4993d-e6f5-5994-a093-64756dcdecef --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `03b4993d...` |
| <!-- coderef:uuid=7417d2b3-09de-54cf-97bb-4e059dbe0fd8 --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `7417d2b3...` |
| <!-- coderef:uuid=7847d638-a9ee-5798-98e1-27d824248559 --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `7847d638...` |
| <!-- coderef:uuid=b1bd0a92-e9c4-5b70-8163-317db0beb9eb --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `b1bd0a92...` |
| <!-- coderef:uuid=9b2a3fad-3e90-5640-8a5f-82dfca2516d1 --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `9b2a3fad...` |
| <!-- coderef:uuid=40e9619c-6a6a-5cf3-a1b3-9b2ded7866b3 --> `OpenAI` | `src/types/external-modules.d.ts` | `40e9619c...` |
| <!-- coderef:uuid=987f379e-5cc9-55ae-83ef-99094b337e47 --> `Anthropic` | `src/types/external-modules.d.ts` | `987f379e...` |
| <!-- coderef:uuid=0ce1ec90-2b2e-5441-bdf5-fc24369575f4 --> `ChromaClient` | `src/types/external-modules.d.ts` | `0ce1ec90...` |
| <!-- coderef:uuid=c7a84fd3-48a6-512c-9154-b8f518b5a489 --> `Collection` | `src/types/external-modules.d.ts` | `c7a84fd3...` |
| <!-- coderef:uuid=1f9bf4af-825b-5b3a-ac70-7d057617e9f3 --> `Pinecone` | `src/types/external-modules.d.ts` | `1f9bf4af...` |
| <!-- coderef:uuid=29f73cb2-50f5-5636-a7fe-4cdf1c44e893 --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `29f73cb2...` |
| <!-- coderef:uuid=eda0ec36-e0b0-59b6-be44-167cb4b717a4 --> `CodeRefValidator` | `src/validator/validator.ts` | `eda0ec36...` |

---

## Exported Interfaces (346)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=1b89c4b3-3967-52fe-bd37-cc87f55a49be --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `1b89c4b3...` |
| <!-- coderef:uuid=53d43564-8ccf-5d1c-b21b-61990b69bbbd --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `53d43564...` |
| <!-- coderef:uuid=d5e71e2d-d3e0-5fc0-9ca7-d4fe671d80e8 --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `d5e71e2d...` |
| <!-- coderef:uuid=572ea20a-81c1-5b3f-bd47-dd129ced6831 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `572ea20a...` |
| <!-- coderef:uuid=462d7a8b-eeeb-5a18-8a92-763ab0f4bf61 --> `CallExpression` | `src/analyzer/call-detector.ts` | `462d7a8b...` |
| <!-- coderef:uuid=ed989709-4dc0-5ee2-8320-2338cee74bec --> `CallEdge` | `src/analyzer/call-detector.ts` | `ed989709...` |
| <!-- coderef:uuid=9b0b8eba-965f-575d-ade0-f5dc5c0c2a25 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `9b0b8eba...` |
| <!-- coderef:uuid=0899b662-f4e1-5483-ae2c-1edf47d85ac4 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `0899b662...` |
| <!-- coderef:uuid=0f70cbe7-ed90-5f25-9e16-b536a9352764 --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `0f70cbe7...` |
| <!-- coderef:uuid=68786167-ebf6-5e33-b18e-149112332cc4 --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `68786167...` |
| <!-- coderef:uuid=78fe7f1d-7f19-5b25-84be-02ce3081f020 --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `78fe7f1d...` |
| <!-- coderef:uuid=69f23ac2-cdb2-5710-bc5e-bafb46f388f3 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `69f23ac2...` |
| <!-- coderef:uuid=06e9fafc-b5ca-54f1-8c92-7fe2c5bf6e6c --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `06e9fafc...` |
| <!-- coderef:uuid=9b6a0cc0-e5d4-564f-97f4-105403ebd52a --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `9b6a0cc0...` |
| <!-- coderef:uuid=9f7784ba-1c42-5f65-85e1-c1e7ce3a37c6 --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `9f7784ba...` |
| <!-- coderef:uuid=cb5ac1ba-a3f7-5742-bb7c-fd805ce99394 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `cb5ac1ba...` |
| <!-- coderef:uuid=bca17861-e3c9-518f-8817-769d1a97fe59 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `bca17861...` |
| <!-- coderef:uuid=f1898393-b89a-5d09-9d98-f53a0e15497b --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `f1898393...` |
| <!-- coderef:uuid=58fbf6e9-102e-5df8-86c5-5b4615b44ebf --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `58fbf6e9...` |
| <!-- coderef:uuid=cfec8929-cda9-5e7b-a64a-25404cddd0e5 --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `cfec8929...` |
| <!-- coderef:uuid=efd4583c-f954-5004-877c-d339def433ac --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `efd4583c...` |
| <!-- coderef:uuid=e58f6c52-707a-5686-a876-a162b854f550 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `e58f6c52...` |
| <!-- coderef:uuid=985086d2-e886-5179-b067-7e789227d382 --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `985086d2...` |
| <!-- coderef:uuid=3b529d2e-d435-50f9-8ed4-ad2a7b9003d0 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `3b529d2e...` |
| <!-- coderef:uuid=e2e78d69-1593-566a-8fa8-36b0fe8a5534 --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `e2e78d69...` |
| <!-- coderef:uuid=47ad0e2f-7ab6-5f69-a13e-59a5c925bcb4 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `47ad0e2f...` |
| <!-- coderef:uuid=1140fd1b-308b-5dca-829e-c811b254a5e2 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `1140fd1b...` |
| <!-- coderef:uuid=b77ac08f-1a93-5e63-bf3f-cbcd38bd6cb8 --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `b77ac08f...` |
| <!-- coderef:uuid=3df6340d-683e-5e41-957d-a863176ae39e --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `3df6340d...` |
| <!-- coderef:uuid=acd5d182-bbc2-52e1-a63e-092db66d504e --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `acd5d182...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (49)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=c7918752-084e-522c-91d8-937b8e75e660 --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `c7918752...` |
| <!-- coderef:uuid=20695cb0-b697-5f40-bb4a-b41b76df556c --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `20695cb0...` |
| <!-- coderef:uuid=eb09d99f-de20-50e1-9299-3288964cf5b5 --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `eb09d99f...` |
| <!-- coderef:uuid=00913dda-0d63-5784-a08b-8f6e9bbab0de --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `00913dda...` |
| <!-- coderef:uuid=26f203d4-78ac-51dd-9c15-0f47737b4bd6 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `26f203d4...` |
| <!-- coderef:uuid=fd7e1e46-8660-5ef2-82fa-92ff48554693 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `fd7e1e46...` |
| <!-- coderef:uuid=6b6a4c36-2556-5ac8-baaf-cc24bf7a2f4d --> `ExportFormat` | `src/export/graph-exporter.ts` | `6b6a4c36...` |
| <!-- coderef:uuid=7a244508-23ad-50ed-bf1d-20c3d05dd2e8 --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `7a244508...` |
| <!-- coderef:uuid=639110cf-9ed6-5cc7-932a-8f30bfcba8dd --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `639110cf...` |
| <!-- coderef:uuid=ea6e136d-f347-5d4e-8a6c-4f88f7c45fcf --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `ea6e136d...` |
| <!-- coderef:uuid=f1af54ab-7843-57f7-a2b8-d31cb54cbab5 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `f1af54ab...` |
| <!-- coderef:uuid=a2f1b1ad-8676-5693-b16b-a3c26bb942d6 --> `IndexingStage` | `src/indexer/indexer-service.ts` | `a2f1b1ad...` |
| <!-- coderef:uuid=0cb8e754-9ee4-5730-b247-efd9ae177c7e --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `0cb8e754...` |
| <!-- coderef:uuid=2e8f9dd0-a42e-5421-b940-c36bc0987220 --> `QueryFilter` | `src/indexer/query-engine.ts` | `2e8f9dd0...` |
| <!-- coderef:uuid=f76809e1-a3fc-55d3-a575-299f48d5022e --> `RelationshipType` | `src/indexer/relationship-index.ts` | `f76809e1...` |
| <!-- coderef:uuid=938e3f99-6dd9-5c77-a4ab-3ecd7f4a97de --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `938e3f99...` |
| <!-- coderef:uuid=43f394aa-b92d-52be-a2a3-61960c11a09b --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `43f394aa...` |
| <!-- coderef:uuid=d5a55506-b54b-5c17-a4e3-e3ea7657cd4b --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `d5a55506...` |
| <!-- coderef:uuid=9bcad1e4-feb8-555e-a685-d617ce20488b --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `9bcad1e4...` |
| <!-- coderef:uuid=38a607bc-b14f-5ca8-81e7-d48747f8c97e --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `38a607bc...` |
| <!-- coderef:uuid=052b559e-5d79-5e56-b481-d4d889764805 --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `052b559e...` |
| <!-- coderef:uuid=2248cff1-6dc2-50e9-91ca-9ecea74cfa12 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `2248cff1...` |
| <!-- coderef:uuid=5e6251f2-2096-54cf-a33e-12ae5c226252 --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `5e6251f2...` |
| <!-- coderef:uuid=f09f4168-4290-5686-bc8f-e03038e18447 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `f09f4168...` |
| <!-- coderef:uuid=61e71f38-0e53-51f6-8d0b-e43f401e220b --> `RelativePath` | `src/integration/rag/path-types.ts` | `61e71f38...` |
| <!-- coderef:uuid=05b9ca5c-405e-5437-8ca6-299fba5356c8 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `05b9ca5c...` |
| <!-- coderef:uuid=0f390231-7ace-5ccb-9086-cdfdc035a92b --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `0f390231...` |
| <!-- coderef:uuid=9ee2fc65-fe36-56af-b596-369aea3b370f --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `9ee2fc65...` |
| <!-- coderef:uuid=fe83aae7-f5f1-5597-8ac1-640865582f80 --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `fe83aae7...` |
| <!-- coderef:uuid=0da232eb-513c-58b1-9838-e5d79d4c5378 --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `0da232eb...` |
| <!-- coderef:uuid=bb3823a6-40f2-528e-8903-63ae92542d28 --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `bb3823a6...` |
| <!-- coderef:uuid=0c5f83ea-8509-5fd4-b573-0165ee1575fa --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `0c5f83ea...` |
| <!-- coderef:uuid=aa275f6e-a53e-54d7-980a-5586666ea3b4 --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `aa275f6e...` |
| <!-- coderef:uuid=8f8bdf0c-f60a-548d-a8b2-a3e40117fb47 --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `8f8bdf0c...` |
| <!-- coderef:uuid=66dea23a-765c-5fcd-800a-26966914fbec --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `66dea23a...` |
| <!-- coderef:uuid=1259dde3-efe2-5582-a5f8-0087ed2b3783 --> `ExportTable` | `src/pipeline/import-resolver.ts` | `1259dde3...` |
| <!-- coderef:uuid=1143eec1-c709-5a7a-9e5f-a27b2bab2679 --> `LanguageExtension` | `src/pipeline/types.ts` | `1143eec1...` |
| <!-- coderef:uuid=e9d9dd51-614d-57c7-8bac-32e28788595c --> `RawExportKind` | `src/pipeline/types.ts` | `e9d9dd51...` |
| <!-- coderef:uuid=405f6560-5da7-558e-99f7-0c2888e59d89 --> `PluginSource` | `src/plugins/types.ts` | `405f6560...` |
| <!-- coderef:uuid=a87cde2b-8115-57b6-b6ad-a028fe9c97e3 --> `QueryType` | `src/query/query-executor.ts` | `a87cde2b...` |
| <!-- coderef:uuid=9d1c360e-7fb7-5bb3-b522-2c14ad7929a4 --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `9d1c360e...` |
| <!-- coderef:uuid=45fd5141-442f-59f0-b9d8-7c12a5d851cc --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `45fd5141...` |
| <!-- coderef:uuid=b44a721a-b1a4-560a-887d-fb2f7d167e67 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `b44a721a...` |
| <!-- coderef:uuid=0d9dc9f5-9c76-5ad2-828c-012d5517c7a5 --> `LogLevel` | `src/utils/logger.ts` | `0d9dc9f5...` |
| <!-- coderef:uuid=b3f46643-3ce5-5603-b64d-6f1476d73f94 --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `b3f46643...` |
| <!-- coderef:uuid=b036876d-019d-53b8-bef1-3d341fb3f8f1 --> `IndexedCoderef` | `types.d.ts` | `b036876d...` |
| <!-- coderef:uuid=4a50f705-38d0-57ca-bde4-2b7737b07637 --> `DriftStatus` | `types.d.ts` | `4a50f705...` |
| <!-- coderef:uuid=11b1b25b-ffbd-54d3-94b2-3d75a457d9f0 --> `DriftReport` | `types.d.ts` | `11b1b25b...` |
| <!-- coderef:uuid=970c3888-1815-536f-8db3-12bec6180bda --> `DriftDetectionOptions` | `types.d.ts` | `970c3888...` |

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
