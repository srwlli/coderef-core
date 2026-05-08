# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-05-05  
**Total Exported:** 916 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **405** | 347 | 752 |
| interface | **346** | 54 | 400 |
| type | **47** | 11 | 58 |
| constant | **3** | 13 | 16 |
| component | **2** | 0 | 2 |
| class | **113** | 5 | 118 |

---

## Exported Functions (405)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=4065d22a-ec62-5daa-ad16-3510ce254711 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `4065d22a...` |
| <!-- coderef:uuid=1bdbedc8-e2b5-5c2a-862d-edb4df750916 --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `1bdbedc8...` |
| <!-- coderef:uuid=0de8e636-6fdb-59e0-ac50-80545a268cc3 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `0de8e636...` |
| <!-- coderef:uuid=3e7e17bf-de25-520b-8395-df5d0385d198 --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `3e7e17bf...` |
| <!-- coderef:uuid=edb1d9b6-a6bb-5714-9916-a022e26b551d --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `edb1d9b6...` |
| <!-- coderef:uuid=2dba4d01-9fbd-5ecf-a9a1-79c949dfcc29 --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `2dba4d01...` |
| <!-- coderef:uuid=9ec60e30-673c-5e1b-9187-afdeed4c68bb --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `9ec60e30...` |
| <!-- coderef:uuid=ac9d7a2d-df2f-5016-a856-7ea837546888 --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `ac9d7a2d...` |
| <!-- coderef:uuid=f6c6f7b7-2a47-5022-98b9-619be161bb98 --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `f6c6f7b7...` |
| <!-- coderef:uuid=a4d782fa-9f7e-5584-a874-a9886af0f674 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `a4d782fa...` |
| <!-- coderef:uuid=67bb5302-02e5-550f-abbc-07fa78650604 --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `67bb5302...` |
| <!-- coderef:uuid=868a63b1-05b5-5613-ad85-a7451936e6f1 --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `868a63b1...` |
| <!-- coderef:uuid=c7de1bf6-e262-5167-bb90-e89d6406acc6 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `c7de1bf6...` |
| <!-- coderef:uuid=6f5e4208-6d4b-57af-af46-61e3da635859 --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `6f5e4208...` |
| <!-- coderef:uuid=d33f9ff8-6423-5409-850c-24b7901c09ff --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `d33f9ff8...` |
| <!-- coderef:uuid=344ce6b0-8790-5f18-ab8c-cc0989404164 --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `344ce6b0...` |
| <!-- coderef:uuid=8d1efe15-64ad-57c4-9859-a5663af55f86 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `8d1efe15...` |
| <!-- coderef:uuid=9324825a-bf91-5571-abfd-cab3c67cd3cb --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `9324825a...` |
| <!-- coderef:uuid=e14841ca-2093-5f77-b07d-c00a066e2359 --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `e14841ca...` |
| <!-- coderef:uuid=51ea8ada-8f26-5d30-8e13-63576c1abe27 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `51ea8ada...` |
| <!-- coderef:uuid=f06c25ae-1a33-5761-ae01-da632423a9b9 --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `f06c25ae...` |
| <!-- coderef:uuid=aa18f3e4-8867-5388-af22-85751d3131d0 --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `aa18f3e4...` |
| <!-- coderef:uuid=24718ac2-ceea-5efd-bd1a-112f3ba6916d --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `24718ac2...` |
| <!-- coderef:uuid=d241ad90-7b79-5082-a8cf-5d09acacb4a1 --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `d241ad90...` |
| <!-- coderef:uuid=532d7c44-64a9-551e-b776-978b7bef6b88 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `532d7c44...` |
| <!-- coderef:uuid=b51e6b5c-fa1d-5568-ab45-05f845eec780 --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `b51e6b5c...` |
| <!-- coderef:uuid=d7f78d3c-64ea-5da4-85a3-9ec0f1b3a388 --> `main` | `autoresearch/scanner-quality/01-element-classification/apply_iteration_5.py` | ❌ |  | `d7f78d3c...` |
| <!-- coderef:uuid=50092487-5c30-576f-b0d4-7c800b21f032 --> `main` | `autoresearch/scanner-quality/03-test-coverage-linkage/apply_iteration_1.py` | ❌ |  | `50092487...` |
| <!-- coderef:uuid=8086844a-d83a-50b1-9afb-a72f40498727 --> `main` | `autoresearch/scanner-quality/04-async-pattern-detection/apply_iteration_1.py` | ❌ |  | `8086844a...` |
| <!-- coderef:uuid=4786f7fe-95d5-5074-aa5c-9e212a9c78fd --> `main` | `autoresearch/scanner-quality/05-context-summary-signal/apply_iteration_1.py` | ❌ |  | `4786f7fe...` |
| <!-- coderef:uuid=3f6c58cd-0ccc-5be1-883a-51825ce09850 --> `main` | `autoresearch/scanner-quality/06-test-gap-precision/apply_iteration_1.py` | ❌ |  | `3f6c58cd...` |
| <!-- coderef:uuid=f93500f7-a663-54e0-aa07-c5df2fbae9ba --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `f93500f7...` |
| <!-- coderef:uuid=3c3188e7-c83f-50f0-aa70-b5c2e6dc81d0 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `3c3188e7...` |
| <!-- coderef:uuid=a134f391-0680-5520-ba92-25389964c681 --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `a134f391...` |
| <!-- coderef:uuid=473bf32a-ca2a-5534-bf57-baaba4765f77 --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `473bf32a...` |
| <!-- coderef:uuid=6a945036-dec2-5287-85d0-0fd02e6bfebf --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `6a945036...` |
| <!-- coderef:uuid=8b83f26f-6d42-5878-b065-2daef880480c --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `8b83f26f...` |
| <!-- coderef:uuid=4ed005c1-e6ec-5246-9a23-3a3ad84706d3 --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `4ed005c1...` |
| <!-- coderef:uuid=062a666c-6286-5d75-91e4-34f55d82b71b --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `062a666c...` |
| <!-- coderef:uuid=daf80eca-93fb-52da-8cc5-8de39aff3e17 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `daf80eca...` |
| <!-- coderef:uuid=26e3347b-05e5-574a-b1b2-92fb56940a1d --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `26e3347b...` |
| <!-- coderef:uuid=2314acfd-4cd1-5e5f-85f3-74aa8c7b32f9 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `2314acfd...` |
| <!-- coderef:uuid=3499cfaa-c267-595e-966d-c7ce339b2f81 --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `3499cfaa...` |
| <!-- coderef:uuid=da4d5043-07a7-515c-89e1-3cce7c10cb49 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `da4d5043...` |
| <!-- coderef:uuid=2a64ea43-c66b-5b5a-913f-40cff774c042 --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `2a64ea43...` |
| <!-- coderef:uuid=6b9619d1-c763-5755-b509-9021fe2830f7 --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `6b9619d1...` |
| <!-- coderef:uuid=b7ed018a-6b07-511d-81f0-75900cab4c88 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `b7ed018a...` |
| <!-- coderef:uuid=c3a17ab1-8688-5ca2-af9c-0ca9ddcf9228 --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `c3a17ab1...` |
| <!-- coderef:uuid=f6b8feba-1166-5a35-9d1d-c61ea64d754f --> `detect_duplicate_pairs` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `f6b8feba...` |
| <!-- coderef:uuid=367b72bd-92af-5ed5-979b-b4126f579a21 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `367b72bd...` |

*... and 355 more functions. See index.json for complete list.*

---

## Exported Classes (113)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=b64fa021-a3dd-52f2-bb30-49de20027ac7 --> `TestSetupCoderefDirs` | `scripts/setup-coderef-dir/test_setup_coderef_dirs.py` | `b64fa021...` |
| <!-- coderef:uuid=2bc8be97-21c1-56e7-b734-6f3e328fc178 --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `2bc8be97...` |
| <!-- coderef:uuid=33f6a07e-db4c-5b11-8e09-3c622015fbc0 --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `33f6a07e...` |
| <!-- coderef:uuid=ab9de9dd-f4a0-58d5-a303-b979f1a51f5e --> `CallDetector` | `src/analyzer/call-detector.ts` | `ab9de9dd...` |
| <!-- coderef:uuid=f183ed0d-25d0-5550-ad2f-b3708c140fc1 --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `f183ed0d...` |
| <!-- coderef:uuid=2f55057d-2b60-556b-9cf2-eaceda957138 --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `2f55057d...` |
| <!-- coderef:uuid=787151ce-5284-5a0c-bf72-437f99959fd8 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `787151ce...` |
| <!-- coderef:uuid=f7afc498-c0c2-5484-8095-7362628510c6 --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `f7afc498...` |
| <!-- coderef:uuid=4e06db2d-3656-56d1-a592-0fdcd6995da5 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `4e06db2d...` |
| <!-- coderef:uuid=9048e558-cef7-53a8-9676-5758c7819253 --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `9048e558...` |
| <!-- coderef:uuid=180f232a-cf1d-5546-8d42-b7bb3c68b8f0 --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `180f232a...` |
| <!-- coderef:uuid=855a10b5-3898-56d6-b15f-d78e77b488d0 --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `855a10b5...` |
| <!-- coderef:uuid=7611106f-dd47-5d59-8d23-5031613efb55 --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `7611106f...` |
| <!-- coderef:uuid=ca91c67f-8801-562d-8000-2479586333c2 --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `ca91c67f...` |
| <!-- coderef:uuid=d01332f6-3b1d-54ef-9755-55a76de91676 --> `GraphError` | `src/analyzer/graph-error.ts` | `d01332f6...` |
| <!-- coderef:uuid=25462f21-200c-535e-80b6-f4e12fec6687 --> `ImportParser` | `src/analyzer/import-parser.ts` | `25462f21...` |
| <!-- coderef:uuid=70a6b63c-5960-5e00-8d5c-b9cd387f59d3 --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `70a6b63c...` |
| <!-- coderef:uuid=062f625b-322b-56f3-9281-645fb2a7e14c --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `062f625b...` |
| <!-- coderef:uuid=65622d6d-2f3d-50f9-a56b-febeb85bc876 --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `65622d6d...` |
| <!-- coderef:uuid=874a9209-cb07-53e7-8520-e7c048fad06d --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `874a9209...` |
| <!-- coderef:uuid=f0af31c7-b5a2-5ebf-80ef-56bed17df937 --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `f0af31c7...` |
| <!-- coderef:uuid=3f7570d3-1eba-5d70-8007-0906de072a93 --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `3f7570d3...` |
| <!-- coderef:uuid=b1154317-c963-5751-8442-c83cc3e571c0 --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `b1154317...` |
| <!-- coderef:uuid=658223e3-8a56-5806-800a-40fa854336a9 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `658223e3...` |
| <!-- coderef:uuid=fcb7085e-cc3f-52a4-9c1e-2f284eb20d7b --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `fcb7085e...` |
| <!-- coderef:uuid=48bf187d-27c5-5501-9320-6b131437b0ee --> `ContextGenerator` | `src/context/context-generator.ts` | `48bf187d...` |
| <!-- coderef:uuid=faee6a85-e40d-565a-bc78-ec4fa83b6ee9 --> `ContextTracker` | `src/context/context-tracker.ts` | `faee6a85...` |
| <!-- coderef:uuid=74a66239-7185-56b0-95df-9430c0789fe3 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `74a66239...` |
| <!-- coderef:uuid=8290bd10-675a-5cc0-8de0-20cb181c69b3 --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `8290bd10...` |
| <!-- coderef:uuid=1bb1414b-7308-56e5-bd20-57667d2d9a2f --> `ExampleExtractor` | `src/context/example-extractor.ts` | `1bb1414b...` |
| <!-- coderef:uuid=2dcec49f-b5a9-54f9-83f6-8f5984adeb51 --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `2dcec49f...` |
| <!-- coderef:uuid=6b86411e-d991-5c29-a391-d96d302d5629 --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `6b86411e...` |
| <!-- coderef:uuid=760cc879-678a-502b-ae6c-92b8aba71e85 --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `760cc879...` |
| <!-- coderef:uuid=f9d0bc9c-4794-544c-a3ba-7fea0afe22f8 --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `f9d0bc9c...` |
| <!-- coderef:uuid=1b51a8dd-10d9-5c93-bb4c-5e9b12353945 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `1b51a8dd...` |
| <!-- coderef:uuid=299fa752-ca0b-5cb9-beb1-4a096f053463 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `299fa752...` |
| <!-- coderef:uuid=574cbf65-a759-5109-be4d-07a457290927 --> `CodeRefError` | `src/errors/CodeRefError.ts` | `574cbf65...` |
| <!-- coderef:uuid=a69a7782-6dbe-5ace-8022-00bf234923e5 --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `a69a7782...` |
| <!-- coderef:uuid=134dd1ca-4e4d-518e-b99e-660e578a5699 --> `IndexError` | `src/errors/IndexError.ts` | `134dd1ca...` |
| <!-- coderef:uuid=b6717069-8c21-550a-b301-bbfcd7443fbb --> `ParseError` | `src/errors/ParseError.ts` | `b6717069...` |
| <!-- coderef:uuid=618eb107-c336-554a-8bb6-7d82e97a0fe6 --> `ScanError` | `src/errors/ScanError.ts` | `618eb107...` |
| <!-- coderef:uuid=80a308a4-4e05-5919-b59e-f23754efac24 --> `ValidationError` | `src/errors/ValidationError.ts` | `80a308a4...` |
| <!-- coderef:uuid=06044f5b-936b-5ccd-8903-b6332fc22309 --> `GraphExporter` | `src/export/graph-exporter.ts` | `06044f5b...` |
| <!-- coderef:uuid=301845a5-4fa4-5812-90ac-80d047d818ea --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `301845a5...` |
| <!-- coderef:uuid=c8db0846-bcf2-5734-9eaa-59ce7f80b751 --> `IndexStore` | `src/indexer/index-store.ts` | `c8db0846...` |
| <!-- coderef:uuid=3e9d5162-7c6d-5118-a05d-1b7a96685ff6 --> `IndexerService` | `src/indexer/indexer-service.ts` | `3e9d5162...` |
| <!-- coderef:uuid=533bd40a-01ae-5c47-b2d5-fb19ed472562 --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `533bd40a...` |
| <!-- coderef:uuid=c6bac043-b9c1-571a-a598-462e779d5379 --> `QueryEngine` | `src/indexer/query-engine.ts` | `c6bac043...` |
| <!-- coderef:uuid=c599639c-3163-50a5-ad65-a8c5db2342d1 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `c599639c...` |
| <!-- coderef:uuid=f6746a56-93e0-575b-a9e3-e12f9597cfb7 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `f6746a56...` |
| <!-- coderef:uuid=3c979387-1fb3-51ef-b791-15a788d375ee --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `3c979387...` |
| <!-- coderef:uuid=bf5f2276-0d8f-563b-99a4-83d5d26ca8fc --> `LLMError` | `src/integration/llm/llm-provider.ts` | `bf5f2276...` |
| <!-- coderef:uuid=1ba4a539-e2e9-5614-ac9e-9d42f395f60b --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `1ba4a539...` |
| <!-- coderef:uuid=d4526710-1127-56c9-ae7d-7381df76cf67 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `d4526710...` |
| <!-- coderef:uuid=c8650f16-4dbb-5cf4-bdb5-3a88902fb5ca --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `c8650f16...` |
| <!-- coderef:uuid=cb333267-3c72-5ea3-8bf2-73e26ce2a733 --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `cb333267...` |
| <!-- coderef:uuid=4b53ec73-1a98-59d7-8687-50f6baee26d6 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `4b53ec73...` |
| <!-- coderef:uuid=97353450-48ef-5492-b124-7462a4e5512d --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `97353450...` |
| <!-- coderef:uuid=f65db217-dbbf-58c9-9b9b-2f34025a6102 --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `f65db217...` |
| <!-- coderef:uuid=9ea2101a-ac6a-5ae5-a380-c6705ed046c3 --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `9ea2101a...` |
| <!-- coderef:uuid=d8bc7c68-a6d4-511a-bdab-4f55d1ed235b --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `d8bc7c68...` |
| <!-- coderef:uuid=603c896d-a590-5352-aa46-9cc244fb6434 --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `603c896d...` |
| <!-- coderef:uuid=c3f9e4a2-b38f-525c-a8a1-def8ab9ef3ab --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `c3f9e4a2...` |
| <!-- coderef:uuid=8e3e6904-ff48-580a-bd27-aea97c89f5a4 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `8e3e6904...` |
| <!-- coderef:uuid=0660b180-0446-5e1d-88e9-c6abb10ddb2d --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `0660b180...` |
| <!-- coderef:uuid=dad82c3f-1a3d-5c9a-b758-c205bb0a8bb8 --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `dad82c3f...` |
| <!-- coderef:uuid=c71d95a7-34f1-5b66-814d-9354e6399691 --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `c71d95a7...` |
| <!-- coderef:uuid=107792bb-625a-538b-9fe0-bd62568f535b --> `ConfigError` | `src/integration/rag/rag-config.ts` | `107792bb...` |
| <!-- coderef:uuid=83e9f16a-ab07-5dd7-83b2-316fa0484922 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `83e9f16a...` |
| <!-- coderef:uuid=20bccde9-f474-5329-af96-873ebf3f3b5e --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `20bccde9...` |
| <!-- coderef:uuid=dd96fb73-a219-5416-ac41-387b0586a028 --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `dd96fb73...` |
| <!-- coderef:uuid=a154a7f1-f71f-5eb3-9d0e-f7c27b74ce91 --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `a154a7f1...` |
| <!-- coderef:uuid=1f7f748a-3e8c-59fd-ab82-d563398643eb --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `1f7f748a...` |
| <!-- coderef:uuid=c2482117-a1ac-53a7-b6a0-13a0940093fe --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `c2482117...` |
| <!-- coderef:uuid=8174f439-314f-5a68-b5d6-c30757915aff --> `CodeRefParser` | `src/parser/parser.ts` | `8174f439...` |
| <!-- coderef:uuid=b5d76746-1efb-57bd-85d3-cda19f66991d --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `b5d76746...` |
| <!-- coderef:uuid=41c1ca54-2c65-5f7b-a305-94bcfe6f4b2e --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `41c1ca54...` |
| <!-- coderef:uuid=c03b0bd8-82f7-5798-9838-d93dc5bbf091 --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `c03b0bd8...` |
| <!-- coderef:uuid=a69bf413-a312-5725-9431-1dd14b12fc1e --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `a69bf413...` |
| <!-- coderef:uuid=cafb4ff7-1a32-5aa1-8ffe-98f9dc79f595 --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `cafb4ff7...` |
| <!-- coderef:uuid=df6b90a8-532a-5993-b888-b50934e42a99 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `df6b90a8...` |
| <!-- coderef:uuid=f545ec8d-a841-587a-a122-2988b5ae3fff --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `f545ec8d...` |
| <!-- coderef:uuid=3a6afba3-ee49-50ef-a644-92dc082f12e2 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `3a6afba3...` |
| <!-- coderef:uuid=81132ccc-b152-5dfd-b259-bdef30649fcc --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `81132ccc...` |
| <!-- coderef:uuid=668de392-cede-517e-a5d3-380e2fec6324 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `668de392...` |
| <!-- coderef:uuid=f71bc2e8-f2fa-5026-8401-064b30bf8586 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `f71bc2e8...` |
| <!-- coderef:uuid=fb4b2f8f-5f05-5f3e-b82e-43011a6bbd18 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `fb4b2f8f...` |
| <!-- coderef:uuid=c85c5ae0-d1e7-57fb-a6e3-f4ba8dc4da04 --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `c85c5ae0...` |
| <!-- coderef:uuid=81164899-d2c2-5794-9620-3f4986291b5b --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `81164899...` |
| <!-- coderef:uuid=bc8d3461-b5dd-5949-a26d-bc528523955f --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `bc8d3461...` |
| <!-- coderef:uuid=a6d24281-a619-5630-93bd-0fc8a2c8f5eb --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `a6d24281...` |
| <!-- coderef:uuid=4c91dd67-2deb-5c7b-9af0-f87346a92853 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `4c91dd67...` |
| <!-- coderef:uuid=c3fa80f8-fb66-5cc1-a7bd-a0f6aa9e0bba --> `PluginError` | `src/plugins/plugin-registry.ts` | `c3fa80f8...` |
| <!-- coderef:uuid=2ccfdedf-3d03-5906-8ccb-524251463a4a --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `2ccfdedf...` |
| <!-- coderef:uuid=55ef4f3f-3f0f-5f42-963d-4d6ebb6369d1 --> `QueryExecutor` | `src/query/query-executor.ts` | `55ef4f3f...` |
| <!-- coderef:uuid=7c5e3104-c03f-5f44-98c0-08444a79116a --> `EntityRegistry` | `src/registry/entity-registry.ts` | `7c5e3104...` |
| <!-- coderef:uuid=e13a9288-62f7-5299-8e0d-09712a2871a0 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `e13a9288...` |
| <!-- coderef:uuid=a8235972-1b93-5edf-9172-cf83436df274 --> `LRUCache` | `src/scanner/lru-cache.ts` | `a8235972...` |
| <!-- coderef:uuid=677d043c-ca1f-58b6-aa5c-89f0aa79f261 --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `677d043c...` |
| <!-- coderef:uuid=3f78efd0-ad34-53ff-85e6-7f62ffddf15c --> `SearchIndex` | `src/search/search-engine.ts` | `3f78efd0...` |
| <!-- coderef:uuid=e721f55c-5d3a-54dc-b139-55d5b9ce3016 --> `SearchEngine` | `src/search/search-engine.ts` | `e721f55c...` |
| <!-- coderef:uuid=0925fedc-8463-5175-b939-4a44035554a1 --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `0925fedc...` |
| <!-- coderef:uuid=bea64818-c246-547b-b76d-146737ac899f --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `bea64818...` |
| <!-- coderef:uuid=99d3b65d-0dee-56c6-97c5-07d6c1d5cfa1 --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `99d3b65d...` |
| <!-- coderef:uuid=090e8da2-40a8-5d23-bcc1-8ca8b2f4d7d4 --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `090e8da2...` |
| <!-- coderef:uuid=db09fee4-45b9-56ef-a5fd-b338e5c818f1 --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `db09fee4...` |
| <!-- coderef:uuid=44f637a8-1549-53c0-882e-a8ee0f6c8215 --> `OpenAI` | `src/types/external-modules.d.ts` | `44f637a8...` |
| <!-- coderef:uuid=53446943-36d7-5c9e-a825-b2166b788997 --> `Anthropic` | `src/types/external-modules.d.ts` | `53446943...` |
| <!-- coderef:uuid=f0828598-a430-5760-b9f6-cff70310889b --> `ChromaClient` | `src/types/external-modules.d.ts` | `f0828598...` |
| <!-- coderef:uuid=6c75f679-01dc-5104-bddd-189545315b68 --> `Collection` | `src/types/external-modules.d.ts` | `6c75f679...` |
| <!-- coderef:uuid=0e186cbc-9c9e-580d-bb19-4191e3044c85 --> `Pinecone` | `src/types/external-modules.d.ts` | `0e186cbc...` |
| <!-- coderef:uuid=23790e8f-e053-5e11-b6d0-f2cdf61ee6c5 --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `23790e8f...` |
| <!-- coderef:uuid=67bf5807-610e-5add-956e-ffc32699b970 --> `CodeRefValidator` | `src/validator/validator.ts` | `67bf5807...` |

---

## Exported Interfaces (346)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=69e94b04-890b-5e60-873e-19e9d1a1cf9f --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `69e94b04...` |
| <!-- coderef:uuid=7a33ee81-ce8b-5b87-8e13-4b507beff72a --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `7a33ee81...` |
| <!-- coderef:uuid=a30c2671-c140-58a5-be22-4f4103670bd6 --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `a30c2671...` |
| <!-- coderef:uuid=8aadb1e6-f6ef-5a98-8b14-7750d728e375 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `8aadb1e6...` |
| <!-- coderef:uuid=122d90f5-cc39-5350-b923-db88d8a4f783 --> `CallExpression` | `src/analyzer/call-detector.ts` | `122d90f5...` |
| <!-- coderef:uuid=27037770-4c88-55e2-a4c8-a5281d3bd309 --> `CallEdge` | `src/analyzer/call-detector.ts` | `27037770...` |
| <!-- coderef:uuid=f8a138b9-ec14-5062-bce5-62dccb2c1dd7 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `f8a138b9...` |
| <!-- coderef:uuid=a1c1dbcb-8212-5d94-93f6-01349c205639 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `a1c1dbcb...` |
| <!-- coderef:uuid=b59ac420-2a8b-559b-a1d1-c04773c78627 --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `b59ac420...` |
| <!-- coderef:uuid=b7e2e016-fc6e-51a5-8265-81bacff0b847 --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `b7e2e016...` |
| <!-- coderef:uuid=6069937a-33da-5251-9422-9772529bf09f --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `6069937a...` |
| <!-- coderef:uuid=4077cb35-fdb3-540a-b79f-2142d8ec6e2b --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `4077cb35...` |
| <!-- coderef:uuid=4cad6a2e-5b8b-592d-9370-d3ec0a8f9236 --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `4cad6a2e...` |
| <!-- coderef:uuid=d6549472-3dee-5c23-a43a-e3f70819a995 --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `d6549472...` |
| <!-- coderef:uuid=0871197e-0a0e-5b3f-bbf6-6ed9bf77ffa1 --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `0871197e...` |
| <!-- coderef:uuid=fcde027b-1d59-5162-9730-2172f5b82b7b --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `fcde027b...` |
| <!-- coderef:uuid=aacd19f9-0fc2-5046-8e70-ff53d7e091b6 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `aacd19f9...` |
| <!-- coderef:uuid=45878e9d-652d-5af0-a8ae-2482f3fc1286 --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `45878e9d...` |
| <!-- coderef:uuid=575c4093-e69a-580d-bc1d-5b9145301cc0 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `575c4093...` |
| <!-- coderef:uuid=b490c9b1-c373-5a06-ae10-20a3bb2bca26 --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `b490c9b1...` |
| <!-- coderef:uuid=64043f9c-047e-53c4-a12c-7a14c277e84c --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `64043f9c...` |
| <!-- coderef:uuid=6d606f91-2313-5bf9-992a-0d113eb94830 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `6d606f91...` |
| <!-- coderef:uuid=72f9ccfb-82be-5320-95d6-1849f0825d3f --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `72f9ccfb...` |
| <!-- coderef:uuid=5b8c79cf-bc38-5b34-b6cd-75373994994a --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `5b8c79cf...` |
| <!-- coderef:uuid=3237dbf6-04c3-57d4-b87f-3242fc33ab42 --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `3237dbf6...` |
| <!-- coderef:uuid=0750cf9b-647c-5c52-a9d8-0d19bf392db0 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `0750cf9b...` |
| <!-- coderef:uuid=b3c2432d-3a5a-59a4-ab50-e0a1f6ee5024 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `b3c2432d...` |
| <!-- coderef:uuid=ec62207d-b21f-52f4-b850-9ef8a58c0d1a --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `ec62207d...` |
| <!-- coderef:uuid=fa80323c-cb84-50a7-a3b8-c334121c1f5c --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `fa80323c...` |
| <!-- coderef:uuid=76a01a9f-4957-58a7-b83c-98345e07326b --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `76a01a9f...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (47)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=8647482a-4483-566c-afa6-05edf647a3c5 --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `8647482a...` |
| <!-- coderef:uuid=ee2476de-d0d5-560f-9080-58b80b69f40b --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `ee2476de...` |
| <!-- coderef:uuid=e0892371-0299-5f46-aade-c93100295b4f --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `e0892371...` |
| <!-- coderef:uuid=707c07fd-b16d-57f6-9bdb-7e1d39f3cf29 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `707c07fd...` |
| <!-- coderef:uuid=a8966a47-a45a-5fba-bbbf-8f22c9452874 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `a8966a47...` |
| <!-- coderef:uuid=e2d589f5-c6b5-56d0-bee4-3639d7577a83 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `e2d589f5...` |
| <!-- coderef:uuid=4564fb01-0be8-5b25-b8c7-3ff9a3ef0173 --> `ExportFormat` | `src/export/graph-exporter.ts` | `4564fb01...` |
| <!-- coderef:uuid=75607deb-9f36-5885-a03d-9617f54b8daa --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `75607deb...` |
| <!-- coderef:uuid=993553d0-8030-594c-8561-20917a0ead2c --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `993553d0...` |
| <!-- coderef:uuid=07c8d306-e673-5f4a-99b7-febb122ed473 --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `07c8d306...` |
| <!-- coderef:uuid=a47c54b2-47b2-532e-8c0a-fb046bf543d9 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `a47c54b2...` |
| <!-- coderef:uuid=9c5b8985-1db6-5dde-accc-642185ba3df2 --> `IndexingStage` | `src/indexer/indexer-service.ts` | `9c5b8985...` |
| <!-- coderef:uuid=56194d4b-2db8-56d8-b981-d829edf6956e --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `56194d4b...` |
| <!-- coderef:uuid=2f2c4ae1-f8c9-565a-a504-a18c24ce9565 --> `QueryFilter` | `src/indexer/query-engine.ts` | `2f2c4ae1...` |
| <!-- coderef:uuid=e75d6433-d7d9-5c41-8dc4-1277f2a7661c --> `RelationshipType` | `src/indexer/relationship-index.ts` | `e75d6433...` |
| <!-- coderef:uuid=1c546ee0-25e6-5350-b478-d6acdfeea5ee --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `1c546ee0...` |
| <!-- coderef:uuid=8e78596f-e294-5cfa-83af-40d1418c16d6 --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `8e78596f...` |
| <!-- coderef:uuid=90ab6400-5d79-55c1-9be5-aebf5e0cb6c7 --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `90ab6400...` |
| <!-- coderef:uuid=b47068cd-caf5-5961-9c5c-36068043e998 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `b47068cd...` |
| <!-- coderef:uuid=169f7532-bd2b-513f-8cae-7c1ac5b1c0af --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `169f7532...` |
| <!-- coderef:uuid=bcf78089-2f25-50a6-8741-b069d1ba8fb4 --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `bcf78089...` |
| <!-- coderef:uuid=85ae9c2a-c13a-537d-a89b-bee0c7221770 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `85ae9c2a...` |
| <!-- coderef:uuid=5e5276fb-e801-5b7b-a1c3-968e10331ba0 --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `5e5276fb...` |
| <!-- coderef:uuid=14de5e71-3af0-5df3-b1c1-92e56436d012 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `14de5e71...` |
| <!-- coderef:uuid=ed3d0c3b-6b5a-5de0-aff2-5e7aa5993d0e --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `ed3d0c3b...` |
| <!-- coderef:uuid=b23e0be0-cae1-5989-8473-d96e708f1e1d --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `b23e0be0...` |
| <!-- coderef:uuid=ebf41ea2-c702-5d21-9d5e-a8a4b966a7d3 --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `ebf41ea2...` |
| <!-- coderef:uuid=c174e2fd-d67d-54f0-b1ad-89c7cc1cbd98 --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `c174e2fd...` |
| <!-- coderef:uuid=06eaada3-9fbf-5843-9471-471da3bbb37f --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `06eaada3...` |
| <!-- coderef:uuid=bb246707-3d69-50af-81d4-4d0c04869df5 --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `bb246707...` |
| <!-- coderef:uuid=dc2e7a9d-a28d-52a1-8048-7cb3b2c11cf3 --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `dc2e7a9d...` |
| <!-- coderef:uuid=b7c2ffa2-89c5-544e-ae87-4673db0a936e --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `b7c2ffa2...` |
| <!-- coderef:uuid=b3a75b61-0a29-56f1-a2d2-1dd92ee74082 --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `b3a75b61...` |
| <!-- coderef:uuid=f739d7e0-7c48-52c2-8729-0727352a6f5e --> `ExportTable` | `src/pipeline/import-resolver.ts` | `f739d7e0...` |
| <!-- coderef:uuid=7b1eb3df-a8ca-5861-a551-78a3ef129980 --> `LanguageExtension` | `src/pipeline/types.ts` | `7b1eb3df...` |
| <!-- coderef:uuid=7e767c74-d760-53dc-98c7-e73610e23da3 --> `RawExportKind` | `src/pipeline/types.ts` | `7e767c74...` |
| <!-- coderef:uuid=817e72ad-7760-59af-a4ad-4f9a6585784a --> `PluginSource` | `src/plugins/types.ts` | `817e72ad...` |
| <!-- coderef:uuid=9078420a-e9fb-5fb9-998d-d6cfecf56a41 --> `QueryType` | `src/query/query-executor.ts` | `9078420a...` |
| <!-- coderef:uuid=f015bedb-6b4f-5c15-b198-3c36ffb7ac81 --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `f015bedb...` |
| <!-- coderef:uuid=1d7b7eac-fb41-5628-8044-978a8f47fcf9 --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `1d7b7eac...` |
| <!-- coderef:uuid=960a8f69-90b5-55fe-8516-404df806ef44 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `960a8f69...` |
| <!-- coderef:uuid=93701d95-f097-52c6-9718-d578d5aa9902 --> `LogLevel` | `src/utils/logger.ts` | `93701d95...` |
| <!-- coderef:uuid=c4e63eb5-6129-5153-af8a-aa78e5741646 --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `c4e63eb5...` |
| <!-- coderef:uuid=ce1bc486-ca73-5c55-b8b6-0dc550fec856 --> `IndexedCoderef` | `types.d.ts` | `ce1bc486...` |
| <!-- coderef:uuid=b0777099-66e2-55c4-949a-5afdad1ec877 --> `DriftStatus` | `types.d.ts` | `b0777099...` |
| <!-- coderef:uuid=2dbfc8b3-a323-5ab7-aa7f-a8e45ffd63bb --> `DriftReport` | `types.d.ts` | `2dbfc8b3...` |
| <!-- coderef:uuid=da1dda59-419b-5204-884e-a31b5c1dc0a5 --> `DriftDetectionOptions` | `types.d.ts` | `da1dda59...` |

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
