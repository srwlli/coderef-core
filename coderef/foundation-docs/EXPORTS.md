# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-04-26  
**Total Exported:** 843 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **392** | 244 | 636 |
| class | **110** | 5 | 115 |
| interface | **304** | 53 | 357 |
| type | **32** | 7 | 39 |
| component | **2** | 0 | 2 |
| constant | **3** | 9 | 12 |

---

## Exported Functions (392)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=9eb4e2a7-0131-5c4b-951e-5bd02d39a9da --> `authenticateUser` | `__tests__/.test-integration-project/src/auth.ts` | ❌ | username, password | `9eb4e2a7...` |
| <!-- coderef:uuid=c9df549b-f517-51e8-9727-ef02bb523eba --> `main` | `__tests__/.test-venv-fixtures/src/app.py` | ❌ |  | `c9df549b...` |
| <!-- coderef:uuid=2bb2b027-5887-5711-ac5d-c7ae723668a3 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `2bb2b027...` |
| <!-- coderef:uuid=c4c30af7-c276-5e92-a3aa-412b8a6030ee --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `c4c30af7...` |
| <!-- coderef:uuid=27c53b91-641b-578e-990f-9b3e52676f26 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `27c53b91...` |
| <!-- coderef:uuid=1bbd2c98-63fd-5ae6-a280-0f0a5cb1f92d --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `1bbd2c98...` |
| <!-- coderef:uuid=337187c9-b5dc-5c0f-baf0-6f9c08e234a5 --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `337187c9...` |
| <!-- coderef:uuid=4b254a45-cf60-57a7-af4c-8201cf68ba1a --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `4b254a45...` |
| <!-- coderef:uuid=1f9ceb19-aef2-53be-8895-408190809333 --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `1f9ceb19...` |
| <!-- coderef:uuid=140842fe-2b07-59e2-b7a4-0f5ca5463597 --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `140842fe...` |
| <!-- coderef:uuid=08a9270a-e2c9-534a-88d0-6fe35991c6a0 --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `08a9270a...` |
| <!-- coderef:uuid=636b0820-05dc-5c7b-bddd-34a843c477bd --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `636b0820...` |
| <!-- coderef:uuid=45c3dd58-ef0e-51bc-affe-8007e3d6237d --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `45c3dd58...` |
| <!-- coderef:uuid=46ed749e-c566-5380-aeea-b79c79a3fc43 --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `46ed749e...` |
| <!-- coderef:uuid=a408dcd6-fab1-54fe-b18d-fb4e3aabeae9 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `a408dcd6...` |
| <!-- coderef:uuid=6dfbc9bb-7f86-5ad9-8206-316078c1f423 --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `6dfbc9bb...` |
| <!-- coderef:uuid=1807192c-b1f2-5232-a045-190cfe942966 --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `1807192c...` |
| <!-- coderef:uuid=6fc09f38-de1d-5e26-a085-114eb7bbee00 --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `6fc09f38...` |
| <!-- coderef:uuid=030fe0e8-aa43-5f47-a21c-6ce26993963d --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `030fe0e8...` |
| <!-- coderef:uuid=d7a50512-b548-5632-927e-71708d608c6e --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `d7a50512...` |
| <!-- coderef:uuid=862b4769-c028-582d-9c35-166d560df0c6 --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `862b4769...` |
| <!-- coderef:uuid=f3579bcc-01ef-5487-8cf8-a9575ab1c037 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `f3579bcc...` |
| <!-- coderef:uuid=7d985669-6fec-5698-942c-8aa963d9aee3 --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `7d985669...` |
| <!-- coderef:uuid=9acd6b4b-c3ae-5d69-831b-dfe55530baa9 --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `9acd6b4b...` |
| <!-- coderef:uuid=64f77194-2766-5bed-8b59-11ac6fa647c1 --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `64f77194...` |
| <!-- coderef:uuid=24d9650e-3147-5036-acd4-d6bdc0fabf44 --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `24d9650e...` |
| <!-- coderef:uuid=06c82d23-fbfc-563a-ba71-dfbb1771d5ce --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `06c82d23...` |
| <!-- coderef:uuid=c4eeda01-1506-53a1-b93a-4999f2511b88 --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `c4eeda01...` |
| <!-- coderef:uuid=edb34a4b-f619-5bf8-a132-9dcb76fa9d49 --> `main` | `autoresearch/scanner-quality/01-element-classification/apply_iteration_5.py` | ❌ |  | `edb34a4b...` |
| <!-- coderef:uuid=19ad249e-5dc9-574f-ba73-f18226976d63 --> `main` | `autoresearch/scanner-quality/03-test-coverage-linkage/apply_iteration_1.py` | ❌ |  | `19ad249e...` |
| <!-- coderef:uuid=8ee1327b-c67c-5be9-b14f-0f7bc8928de9 --> `main` | `autoresearch/scanner-quality/04-async-pattern-detection/apply_iteration_1.py` | ❌ |  | `8ee1327b...` |
| <!-- coderef:uuid=ddbe34b1-8bc9-5974-ba5e-aed8111fb81a --> `main` | `autoresearch/scanner-quality/05-context-summary-signal/apply_iteration_1.py` | ❌ |  | `ddbe34b1...` |
| <!-- coderef:uuid=562e5fdf-abfd-5771-8259-e6624a05af54 --> `main` | `autoresearch/scanner-quality/06-test-gap-precision/apply_iteration_1.py` | ❌ |  | `562e5fdf...` |
| <!-- coderef:uuid=cb7bfa44-7f19-51d3-a205-43975166048f --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `cb7bfa44...` |
| <!-- coderef:uuid=c7807f93-dbc3-5e32-822b-017d6f56445c --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `c7807f93...` |
| <!-- coderef:uuid=58b22957-eb07-5fa6-bd8d-14eb87f34dbb --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `58b22957...` |
| <!-- coderef:uuid=d99f135d-97ac-5a4a-9682-25a02b9ac264 --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `d99f135d...` |
| <!-- coderef:uuid=37c1686e-53af-5e1c-b720-7dde3d133f24 --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `37c1686e...` |
| <!-- coderef:uuid=e619e59e-8b14-5be5-8ff6-858f267de7ac --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `e619e59e...` |
| <!-- coderef:uuid=3a938fe4-26ee-5624-87b6-af7a2b24bdef --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `3a938fe4...` |
| <!-- coderef:uuid=c009dc8c-dcb4-5089-a78e-848a9931bbf9 --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `c009dc8c...` |
| <!-- coderef:uuid=560b85b2-cc3b-545b-bf8b-cb2ae0861a07 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `560b85b2...` |
| <!-- coderef:uuid=571e401d-17fe-5677-a980-7aa958cbef1a --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `571e401d...` |
| <!-- coderef:uuid=2bb91a56-5f19-53c5-87f6-3ad492d06677 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `2bb91a56...` |
| <!-- coderef:uuid=73052482-fb3f-53b2-a3cb-bcfe6784ab78 --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `73052482...` |
| <!-- coderef:uuid=9c213fed-633e-5908-9c92-028e5dad5bbc --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `9c213fed...` |
| <!-- coderef:uuid=1c9e3fc2-05ff-576a-b1e0-2db345cfed4a --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `1c9e3fc2...` |
| <!-- coderef:uuid=c2d9a9b2-09fe-51de-b8aa-3728c3bfae2e --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `c2d9a9b2...` |
| <!-- coderef:uuid=97e41c20-3ba9-5caa-bb46-0f8b53a26439 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `97e41c20...` |
| <!-- coderef:uuid=f718012f-6557-5583-96e1-94f9e8c984d1 --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `f718012f...` |

*... and 342 more functions. See index.json for complete list.*

---

## Exported Classes (110)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=4e728460-ce7f-5435-bb91-3665b796c7d2 --> `AuthService` | `__tests__/.test-integration-project/src/auth.ts` | `4e728460...` |
| <!-- coderef:uuid=435b7810-f445-500f-898f-7eb8c3a707c1 --> `UserService` | `__tests__/.test-integration-project/src/user.ts` | `435b7810...` |
| <!-- coderef:uuid=88d1c50f-0eaa-5139-9258-ca396036c1cf --> `Application` | `__tests__/.test-venv-fixtures/src/app.py` | `88d1c50f...` |
| <!-- coderef:uuid=397b729e-8477-5687-80df-3f22bb4a2b90 --> `TestSetupCoderefDirs` | `scripts/setup-coderef-dir/test_setup_coderef_dirs.py` | `397b729e...` |
| <!-- coderef:uuid=ba36c834-9eec-5e15-94c5-d818909a9654 --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `ba36c834...` |
| <!-- coderef:uuid=99e529cc-f60a-5245-a324-b121f5099fbe --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `99e529cc...` |
| <!-- coderef:uuid=6c10867d-445c-5b93-8d1d-782cccc1cb04 --> `CallDetector` | `src/analyzer/call-detector.ts` | `6c10867d...` |
| <!-- coderef:uuid=49e17d19-2e22-5ac5-bbee-a6aa0403f43d --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `49e17d19...` |
| <!-- coderef:uuid=694ad174-9b96-576c-8f27-f9b8f5b9b0dc --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `694ad174...` |
| <!-- coderef:uuid=684b35af-0da3-5602-96f6-3936bfe16495 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `684b35af...` |
| <!-- coderef:uuid=e2b76a9b-556c-5e4a-bfaf-ce3f5046a449 --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `e2b76a9b...` |
| <!-- coderef:uuid=0929925f-3539-539f-a6e1-77c4760cec50 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `0929925f...` |
| <!-- coderef:uuid=a3e60328-ce45-5ea9-b60d-7558e7d2c24c --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `a3e60328...` |
| <!-- coderef:uuid=69ae5fbb-f04b-5fee-a408-22536f978b2b --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `69ae5fbb...` |
| <!-- coderef:uuid=e4c5d4e9-0c80-5920-93ec-bb03973ff169 --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `e4c5d4e9...` |
| <!-- coderef:uuid=83a377f4-c519-5161-aa45-1784f68ce279 --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `83a377f4...` |
| <!-- coderef:uuid=d123f0aa-c00d-5bae-a79e-425ae3eb3b56 --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `d123f0aa...` |
| <!-- coderef:uuid=f91b624d-5d2f-5272-88ea-dce50d57a30b --> `GraphError` | `src/analyzer/graph-error.ts` | `f91b624d...` |
| <!-- coderef:uuid=57097cd6-bf31-57f5-8f82-59a51d45b240 --> `ImportParser` | `src/analyzer/import-parser.ts` | `57097cd6...` |
| <!-- coderef:uuid=98579329-05fd-568e-985e-9f6fb3d9f092 --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `98579329...` |
| <!-- coderef:uuid=4c5f20ab-a0a8-5054-be81-ddcb5e0b6c80 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `4c5f20ab...` |
| <!-- coderef:uuid=e4ad5cf3-06a2-5bda-a106-753cd51ea31e --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `e4ad5cf3...` |
| <!-- coderef:uuid=6583091d-1d4e-5a83-8a48-c9b58f3befce --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `6583091d...` |
| <!-- coderef:uuid=32ed8729-f029-58d2-9c44-dbb5f80b9aed --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `32ed8729...` |
| <!-- coderef:uuid=490a7210-9387-53dd-93b4-e1cb320f7fff --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `490a7210...` |
| <!-- coderef:uuid=9c1f3177-8b6a-5017-9d86-083f5fa500fb --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `9c1f3177...` |
| <!-- coderef:uuid=aabfca9b-01f7-5f7c-96a8-33cf308e8a30 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `aabfca9b...` |
| <!-- coderef:uuid=c6c17f96-1ced-5bb0-a2cf-e0c00ab91fcf --> `ContextGenerator` | `src/context/context-generator.ts` | `c6c17f96...` |
| <!-- coderef:uuid=f97b30c7-46d9-58eb-bdac-f1cf3ecddd7e --> `ContextTracker` | `src/context/context-tracker.ts` | `f97b30c7...` |
| <!-- coderef:uuid=aee09a2f-3e1e-57d0-b326-c56dd7cf7863 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `aee09a2f...` |
| <!-- coderef:uuid=fcf67c12-70d3-562b-b717-c65f97a19539 --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `fcf67c12...` |
| <!-- coderef:uuid=be91fd16-9aea-5c1f-9065-8d732874eb4b --> `ExampleExtractor` | `src/context/example-extractor.ts` | `be91fd16...` |
| <!-- coderef:uuid=12b001a4-027d-5c9a-aeb8-a81781801e84 --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `12b001a4...` |
| <!-- coderef:uuid=8932a24e-ab3b-594c-b467-6359611bc869 --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `8932a24e...` |
| <!-- coderef:uuid=5d83a292-bbfe-5921-a56f-81fd9a6ea52d --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `5d83a292...` |
| <!-- coderef:uuid=54a01159-7e8b-5f81-818e-820b8ec7efce --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `54a01159...` |
| <!-- coderef:uuid=ae3993d1-e7a7-5d0c-8676-4f2b11476521 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `ae3993d1...` |
| <!-- coderef:uuid=7d340246-8a7c-5410-941a-3b9c4fb93870 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `7d340246...` |
| <!-- coderef:uuid=2697bd68-b74c-5912-9d18-415857799e9b --> `CodeRefError` | `src/errors/CodeRefError.ts` | `2697bd68...` |
| <!-- coderef:uuid=6d46948b-4d8a-5466-b029-26d515d3d9fd --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `6d46948b...` |
| <!-- coderef:uuid=89af8ae4-af62-553c-b806-cb78de2bf66a --> `IndexError` | `src/errors/IndexError.ts` | `89af8ae4...` |
| <!-- coderef:uuid=4e9d4fa1-8866-5c37-84fc-4f703578ef5e --> `ParseError` | `src/errors/ParseError.ts` | `4e9d4fa1...` |
| <!-- coderef:uuid=464b68e7-9ca6-51a8-a7f1-602fddce523b --> `ScanError` | `src/errors/ScanError.ts` | `464b68e7...` |
| <!-- coderef:uuid=33e55ef5-e7b4-5f76-a097-47f7dc9b7519 --> `ValidationError` | `src/errors/ValidationError.ts` | `33e55ef5...` |
| <!-- coderef:uuid=5dc917bb-5b0c-5a7c-acf7-a67377881b57 --> `GraphExporter` | `src/export/graph-exporter.ts` | `5dc917bb...` |
| <!-- coderef:uuid=804fd2f4-b0fc-598f-ad26-f43cce87770e --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `804fd2f4...` |
| <!-- coderef:uuid=756f6d3f-32d0-5f78-9ce0-4d014b4a73cd --> `IndexStore` | `src/indexer/index-store.ts` | `756f6d3f...` |
| <!-- coderef:uuid=d5c70257-5773-5d60-a79a-353b861aec1e --> `IndexerService` | `src/indexer/indexer-service.ts` | `d5c70257...` |
| <!-- coderef:uuid=35428e04-ca32-524b-a0a5-4d74e3c04e40 --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `35428e04...` |
| <!-- coderef:uuid=ec6020c7-2c05-5b95-90b4-6417b7593421 --> `QueryEngine` | `src/indexer/query-engine.ts` | `ec6020c7...` |
| <!-- coderef:uuid=3628d0a9-d1d2-5b2a-ab99-528979147ad3 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `3628d0a9...` |
| <!-- coderef:uuid=125774b3-dbf0-52af-b0f4-bcba45e72f67 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `125774b3...` |
| <!-- coderef:uuid=1434181b-e940-5702-b63a-e02024407792 --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `1434181b...` |
| <!-- coderef:uuid=29aa5b2f-4963-5ef8-bc98-a365633f59c6 --> `LLMError` | `src/integration/llm/llm-provider.ts` | `29aa5b2f...` |
| <!-- coderef:uuid=f3511265-0108-5fe7-90a7-6497427631b9 --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `f3511265...` |
| <!-- coderef:uuid=aa893756-e2bb-5d1e-a474-282f171339b5 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `aa893756...` |
| <!-- coderef:uuid=49ba3731-d045-5ff3-9415-ad0e0d1d59cd --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `49ba3731...` |
| <!-- coderef:uuid=f05031ab-5c71-591f-9c74-87124d675bb5 --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `f05031ab...` |
| <!-- coderef:uuid=c6de7638-dade-5ebc-95dd-40621243a160 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `c6de7638...` |
| <!-- coderef:uuid=0b2afd1f-b7be-54b1-ac65-4522a603c63e --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `0b2afd1f...` |
| <!-- coderef:uuid=aa0864fc-ff10-5af2-bdae-169df4f1f5f6 --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `aa0864fc...` |
| <!-- coderef:uuid=af544329-cb6d-55c1-ba5c-ecedc4baa82e --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `af544329...` |
| <!-- coderef:uuid=8ce41faa-b927-5ef2-958c-3aaa5d937ed4 --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `8ce41faa...` |
| <!-- coderef:uuid=06036149-7a74-535e-b8f5-e7834ea8a017 --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `06036149...` |
| <!-- coderef:uuid=07095829-0181-5992-b78d-499d624fd9e8 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `07095829...` |
| <!-- coderef:uuid=6fafb253-fc8c-5370-8e85-c949f099b2b3 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `6fafb253...` |
| <!-- coderef:uuid=7ddee884-6230-51fe-ace5-8c9c35a65746 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `7ddee884...` |
| <!-- coderef:uuid=c5b63b67-0e28-5e1a-b5d3-99a94f2a1f6f --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `c5b63b67...` |
| <!-- coderef:uuid=3265ff59-4eb1-5195-9b5a-21f7c78d6d9e --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `3265ff59...` |
| <!-- coderef:uuid=9164c344-8c05-5cfb-bb89-cbb0add550b9 --> `ConfigError` | `src/integration/rag/rag-config.ts` | `9164c344...` |
| <!-- coderef:uuid=f4e6a072-c565-5b23-b7f4-bc08fa8ed41f --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `f4e6a072...` |
| <!-- coderef:uuid=22389444-629e-54fe-805c-7007b6a2a502 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `22389444...` |
| <!-- coderef:uuid=d1d03fe1-5d40-5469-ac8a-749329d201b0 --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `d1d03fe1...` |
| <!-- coderef:uuid=0705bcf2-823e-5b27-a671-35fc01fa808c --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `0705bcf2...` |
| <!-- coderef:uuid=3f632b95-7eb3-5ef3-a5b9-fb7a7364a849 --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `3f632b95...` |
| <!-- coderef:uuid=efd6c9e6-d041-504d-8560-e3de57350246 --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `efd6c9e6...` |
| <!-- coderef:uuid=d129cd95-a773-58db-9064-2ea3ad2cf374 --> `CodeRefParser` | `src/parser/parser.ts` | `d129cd95...` |
| <!-- coderef:uuid=a6f4f032-2ba4-5e0e-be4a-e1a26ba6101c --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `a6f4f032...` |
| <!-- coderef:uuid=e1c18196-42aa-5f1e-a9d5-6fe1176965c4 --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `e1c18196...` |
| <!-- coderef:uuid=6e4e7e62-4348-509b-9389-638076554aea --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `6e4e7e62...` |
| <!-- coderef:uuid=09c464d3-e1f5-51a8-a3ec-dfa3bffb7c2e --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `09c464d3...` |
| <!-- coderef:uuid=34b6341e-5268-565e-93eb-a835e42623b4 --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `34b6341e...` |
| <!-- coderef:uuid=0aa3a96f-1560-5d9c-a6df-9fcdb7b64436 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `0aa3a96f...` |
| <!-- coderef:uuid=c2b9ed71-08d6-5f8c-8638-bb7a034329bc --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `c2b9ed71...` |
| <!-- coderef:uuid=5e4bfb1a-b9de-5ce7-9e49-ae28c21d3740 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `5e4bfb1a...` |
| <!-- coderef:uuid=7c5ce285-32e4-5fb5-8cf5-04880ede34e3 --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `7c5ce285...` |
| <!-- coderef:uuid=5412098c-5e9a-56ad-9556-1751381417a0 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `5412098c...` |
| <!-- coderef:uuid=9723ad20-105c-59c1-8a85-1089f0aa7ee2 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `9723ad20...` |
| <!-- coderef:uuid=0c81e087-2d07-57b3-8fdb-7dc393455ef9 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `0c81e087...` |
| <!-- coderef:uuid=88e88dc5-8e8d-52a6-9180-973f2dfa401d --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `88e88dc5...` |
| <!-- coderef:uuid=9780f8bf-2880-5a04-a465-29b61ff9c5b3 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `9780f8bf...` |
| <!-- coderef:uuid=06ef7e8e-6b4b-53c8-9fe0-7eb486b5e42e --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `06ef7e8e...` |
| <!-- coderef:uuid=efa76a9c-5470-525f-9eba-9a34c2c2ce55 --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `efa76a9c...` |
| <!-- coderef:uuid=87a3d70c-1c20-5645-bc43-c7f9690b14a3 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `87a3d70c...` |
| <!-- coderef:uuid=d33a3b0d-d954-5393-933e-bfa8824df04d --> `PluginError` | `src/plugins/plugin-registry.ts` | `d33a3b0d...` |
| <!-- coderef:uuid=a4071ae8-f986-56d4-82bf-2ce979c0ff75 --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `a4071ae8...` |
| <!-- coderef:uuid=51df9bed-759c-5358-8baf-370d8b405b36 --> `QueryExecutor` | `src/query/query-executor.ts` | `51df9bed...` |
| <!-- coderef:uuid=442fc42f-3bc6-581a-ba80-b84eb4733b8e --> `EntityRegistry` | `src/registry/entity-registry.ts` | `442fc42f...` |
| <!-- coderef:uuid=4eb25e56-c459-5abd-90c2-d6cc8615149e --> `FileWatcher` | `src/scanner/file-watcher.ts` | `4eb25e56...` |
| <!-- coderef:uuid=673074be-7664-582d-8008-623e5ffaf2db --> `LRUCache` | `src/scanner/lru-cache.ts` | `673074be...` |
| <!-- coderef:uuid=b1e53754-3d4d-5d33-b675-f5db7cc88e60 --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `b1e53754...` |
| <!-- coderef:uuid=bf8131ab-eed9-5c9d-b18b-71de15c2e016 --> `SearchIndex` | `src/search/search-engine.ts` | `bf8131ab...` |
| <!-- coderef:uuid=7f38a5c1-9fe0-5dda-8add-451836502925 --> `SearchEngine` | `src/search/search-engine.ts` | `7f38a5c1...` |
| <!-- coderef:uuid=8a4d0d1e-112d-5740-abb5-265ebab73cc9 --> `OpenAI` | `src/types/external-modules.d.ts` | `8a4d0d1e...` |
| <!-- coderef:uuid=81b9e028-fe5e-5a98-be13-11595fcc323c --> `Anthropic` | `src/types/external-modules.d.ts` | `81b9e028...` |
| <!-- coderef:uuid=8a8a67dc-9e10-522f-ae54-10c957a71005 --> `ChromaClient` | `src/types/external-modules.d.ts` | `8a8a67dc...` |
| <!-- coderef:uuid=726b67c6-c3bc-5a1f-8a0d-12d458217d21 --> `Collection` | `src/types/external-modules.d.ts` | `726b67c6...` |
| <!-- coderef:uuid=5ab5eb25-2f0b-5b15-a2d3-9b9515d7039a --> `Pinecone` | `src/types/external-modules.d.ts` | `5ab5eb25...` |
| <!-- coderef:uuid=308b9f49-d2ac-5ac4-b764-2e015eab28e2 --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `308b9f49...` |
| <!-- coderef:uuid=da2502e2-c2bd-5114-b7c6-defa8e05077a --> `CodeRefValidator` | `src/validator/validator.ts` | `da2502e2...` |

---

## Exported Interfaces (304)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=ad1c1fe8-d4fe-567a-9431-c472892b36d4 --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `ad1c1fe8...` |
| <!-- coderef:uuid=afa8ca99-8297-582d-ab8a-dee762660b23 --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `afa8ca99...` |
| <!-- coderef:uuid=f2be940d-f8f7-5188-a215-0025a8b0e823 --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `f2be940d...` |
| <!-- coderef:uuid=7311717d-34f3-5fa4-8ab3-7ce49f52f077 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `7311717d...` |
| <!-- coderef:uuid=bd59d42f-828c-5983-9910-b51af5bae513 --> `CallExpression` | `src/analyzer/call-detector.ts` | `bd59d42f...` |
| <!-- coderef:uuid=aa0f437b-e969-5350-a6ff-cd8c93d7d729 --> `CallEdge` | `src/analyzer/call-detector.ts` | `aa0f437b...` |
| <!-- coderef:uuid=a0a0b0bf-56eb-5459-b497-51e35cc2c7d9 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `a0a0b0bf...` |
| <!-- coderef:uuid=c8c14f67-966d-5caf-94a2-49143dc8dc71 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `c8c14f67...` |
| <!-- coderef:uuid=32515e4a-9104-5354-9b70-5dbf1301b265 --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `32515e4a...` |
| <!-- coderef:uuid=ed2e3e46-6eb4-5352-903c-d31f6dbe7002 --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `ed2e3e46...` |
| <!-- coderef:uuid=f12845f4-afd2-55b1-80f5-2ec3bded5270 --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `f12845f4...` |
| <!-- coderef:uuid=52626c98-1b28-590e-9c7d-dad4a87a6aed --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `52626c98...` |
| <!-- coderef:uuid=36f0264f-a904-5525-9a95-9bce70d24eb2 --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `36f0264f...` |
| <!-- coderef:uuid=9fb8b3ff-f3bf-5e95-b5be-15eb32de1001 --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `9fb8b3ff...` |
| <!-- coderef:uuid=db9c7d3e-68c5-52a7-9a23-b95c4dad4ece --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `db9c7d3e...` |
| <!-- coderef:uuid=e19cda8b-e72d-54b7-a66c-2a3f90552db4 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `e19cda8b...` |
| <!-- coderef:uuid=13423462-396f-50ce-9cfb-e019b27dfc64 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `13423462...` |
| <!-- coderef:uuid=48b2d971-bc1b-5509-bcde-b16706f70a6b --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `48b2d971...` |
| <!-- coderef:uuid=a93428a0-59ff-5a18-a346-14c7c117de28 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `a93428a0...` |
| <!-- coderef:uuid=d15709c9-9ff3-503f-9fb7-214c39bfd18e --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `d15709c9...` |
| <!-- coderef:uuid=c08fb4b7-11e6-512c-b4a4-a7db055667fb --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `c08fb4b7...` |
| <!-- coderef:uuid=cc9b11d0-a346-5314-989a-7c32cff90ec3 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `cc9b11d0...` |
| <!-- coderef:uuid=760798d8-d67b-5052-acf9-7f3ef1f86c2d --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `760798d8...` |
| <!-- coderef:uuid=bc1be281-875c-5e73-8d2b-b819644476a8 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `bc1be281...` |
| <!-- coderef:uuid=54f62410-d432-5ee4-8b26-98c3dcc6d198 --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `54f62410...` |
| <!-- coderef:uuid=0acdadd0-330e-5ae0-a21c-918b1fa2f5f3 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `0acdadd0...` |
| <!-- coderef:uuid=0b49f860-b30c-5d1c-8e48-e7cd551f45df --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `0b49f860...` |
| <!-- coderef:uuid=50eb41e6-66e9-562e-a8e9-1bb87b758c98 --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `50eb41e6...` |
| <!-- coderef:uuid=83cdb460-6610-5a3b-b05b-aa216170cf8e --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `83cdb460...` |
| <!-- coderef:uuid=40a9202b-fdd5-536a-929d-eb0fb4fb86d1 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `40a9202b...` |

*... and 274 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (32)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=7331a90b-3153-5024-969b-6c8989d5757d --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `7331a90b...` |
| <!-- coderef:uuid=aa24776a-df71-5dfc-a7b1-a6560d5c0cd5 --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `aa24776a...` |
| <!-- coderef:uuid=86e01b32-d49e-5419-8775-0097c0f8021e --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `86e01b32...` |
| <!-- coderef:uuid=b198c612-ff53-57f5-ac3b-aa7545403354 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `b198c612...` |
| <!-- coderef:uuid=fc5a52a7-9381-5669-a48c-63ea406e335d --> `WebAppType` | `src/analyzer/project-classifier.ts` | `fc5a52a7...` |
| <!-- coderef:uuid=6f729ef7-4a00-5d0b-8cef-35a85a5dbe64 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `6f729ef7...` |
| <!-- coderef:uuid=25bea7ec-ec31-5e08-81e7-6d01d5f47823 --> `ExportFormat` | `src/export/graph-exporter.ts` | `25bea7ec...` |
| <!-- coderef:uuid=5b20aa4a-6d36-57df-8a9a-aea1f7e16da6 --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `5b20aa4a...` |
| <!-- coderef:uuid=d57fbedf-750f-5e8f-8f07-2cf38e959327 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `d57fbedf...` |
| <!-- coderef:uuid=8c33ba67-07c9-5b44-a3c9-8982f66bb6b9 --> `IndexingStage` | `src/indexer/indexer-service.ts` | `8c33ba67...` |
| <!-- coderef:uuid=f4a6f515-b386-55c8-8848-15896588c3ea --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `f4a6f515...` |
| <!-- coderef:uuid=b8137659-5fc0-50d8-9e05-38ec44a90bc9 --> `QueryFilter` | `src/indexer/query-engine.ts` | `b8137659...` |
| <!-- coderef:uuid=f40f6877-0a84-5acc-8bdb-d50cfee1706d --> `RelationshipType` | `src/indexer/relationship-index.ts` | `f40f6877...` |
| <!-- coderef:uuid=428f92a2-8b85-5c5c-9bea-25318ed7bab2 --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `428f92a2...` |
| <!-- coderef:uuid=583e8b45-bf41-56ad-820d-c361a1e88e66 --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `583e8b45...` |
| <!-- coderef:uuid=6615ba4c-9f18-5e49-b903-6dfb7f44daef --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `6615ba4c...` |
| <!-- coderef:uuid=ce607208-23b2-57b5-ba1b-63127a325d2c --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `ce607208...` |
| <!-- coderef:uuid=8507c6f6-76ce-5106-9d00-8835ab5c1ed9 --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `8507c6f6...` |
| <!-- coderef:uuid=645c0b82-15e9-54ad-ae1d-cc9bb2bdbed3 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `645c0b82...` |
| <!-- coderef:uuid=e35b0bda-ca9c-5096-b158-fcf3d3349a78 --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `e35b0bda...` |
| <!-- coderef:uuid=8cd6df88-6dc3-5ced-bcb1-0986eb85c8b5 --> `LanguageExtension` | `src/pipeline/types.ts` | `8cd6df88...` |
| <!-- coderef:uuid=c534522d-7dc8-5776-a7ad-1b26b950282a --> `PluginSource` | `src/plugins/types.ts` | `c534522d...` |
| <!-- coderef:uuid=19943aae-ac6f-5adb-845b-b7a9192ae87a --> `QueryType` | `src/query/query-executor.ts` | `19943aae...` |
| <!-- coderef:uuid=10a366d5-f19b-5909-ac1a-79e0dd40526a --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `10a366d5...` |
| <!-- coderef:uuid=6da56d29-663f-5e7a-9312-6fd0e7f9a6aa --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `6da56d29...` |
| <!-- coderef:uuid=ee863f29-907b-5ebe-b8ac-7dbb55b9b7ff --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `ee863f29...` |
| <!-- coderef:uuid=a43065a8-23ca-59e1-baba-6b8b0dd7d43d --> `LogLevel` | `src/utils/logger.ts` | `a43065a8...` |
| <!-- coderef:uuid=f9aa39db-def5-5d2a-ba56-3143f69b487d --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `f9aa39db...` |
| <!-- coderef:uuid=493344c2-9d5d-5461-8909-4b448d91079f --> `IndexedCoderef` | `types.d.ts` | `493344c2...` |
| <!-- coderef:uuid=6eb8bd64-f29a-553d-8681-1d135de4d94a --> `DriftStatus` | `types.d.ts` | `6eb8bd64...` |
| <!-- coderef:uuid=af84e439-fa83-5536-8e1e-01c55d1cc050 --> `DriftReport` | `types.d.ts` | `af84e439...` |
| <!-- coderef:uuid=03a8e4d6-4fc8-5a3c-abfe-24037d83aad9 --> `DriftDetectionOptions` | `types.d.ts` | `03a8e4d6...` |

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
