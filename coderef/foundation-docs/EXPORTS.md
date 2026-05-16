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
| <!-- coderef:uuid=c361d616-5f67-507e-ba7c-cf187f252371 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `c361d616...` |
| <!-- coderef:uuid=a3567e5d-2220-5e1c-8a93-80c0058b83ce --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `a3567e5d...` |
| <!-- coderef:uuid=bd7095c2-f684-5835-90cc-95ecc2c12715 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `bd7095c2...` |
| <!-- coderef:uuid=c4a2fbe1-4f5d-5056-8408-ad48848b1c9e --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `c4a2fbe1...` |
| <!-- coderef:uuid=64a0a502-3214-5ceb-bb49-03c78e976d8c --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `64a0a502...` |
| <!-- coderef:uuid=080fdb41-0442-5185-ac0e-42734ad9bd09 --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `080fdb41...` |
| <!-- coderef:uuid=59708417-e593-5995-bc53-f3caf7c2c314 --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `59708417...` |
| <!-- coderef:uuid=53a97823-88f1-5402-ae09-a4f749403d3c --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `53a97823...` |
| <!-- coderef:uuid=3197edd2-2a6b-5f45-b797-7d7da9e7f6e8 --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `3197edd2...` |
| <!-- coderef:uuid=2d6c8e02-8591-582b-86ec-882208a230cd --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `2d6c8e02...` |
| <!-- coderef:uuid=eab6c908-e156-5954-b425-a3b4657a5c9a --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `eab6c908...` |
| <!-- coderef:uuid=be092ec5-2e63-5d5e-b202-124b6c51321a --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `be092ec5...` |
| <!-- coderef:uuid=4de93b90-6ede-5b2d-8b69-6b87c47a1cf1 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `4de93b90...` |
| <!-- coderef:uuid=ef292b15-ff03-5693-9e53-c1623b6c51e4 --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `ef292b15...` |
| <!-- coderef:uuid=0f65bd7f-cf68-5d50-b9a8-3e8878105238 --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `0f65bd7f...` |
| <!-- coderef:uuid=afcd3162-bba2-595d-9562-0948007a1125 --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `afcd3162...` |
| <!-- coderef:uuid=a5a33303-efb9-563b-a9df-c3a879839be8 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `a5a33303...` |
| <!-- coderef:uuid=feb3428d-da54-53ad-9064-d2d739352ce8 --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `feb3428d...` |
| <!-- coderef:uuid=0a21ee4a-f70c-5098-af8d-717c0f2b1d05 --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `0a21ee4a...` |
| <!-- coderef:uuid=3ca87ea5-ee76-52eb-a7ad-215d75c95e21 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `3ca87ea5...` |
| <!-- coderef:uuid=4bdcd9e1-dcb8-574d-b678-0230f71402bf --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `4bdcd9e1...` |
| <!-- coderef:uuid=6d589908-e6e6-59e7-bf58-39d1943b0bf4 --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `6d589908...` |
| <!-- coderef:uuid=0496bacb-88d7-5b5d-a9fe-5574603bebb9 --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `0496bacb...` |
| <!-- coderef:uuid=c0bcd122-f7d4-559c-b609-58c3f192972a --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `c0bcd122...` |
| <!-- coderef:uuid=9aae39d5-7aa9-5aef-bdf1-55d1c9edb82e --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `9aae39d5...` |
| <!-- coderef:uuid=9f9b2887-3d7e-509b-a914-42257cdcb175 --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `9f9b2887...` |
| <!-- coderef:uuid=577ee97d-60f0-5764-a523-9d94535676a1 --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `577ee97d...` |
| <!-- coderef:uuid=66962441-ae6b-531c-be9a-20f0a42bf884 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `66962441...` |
| <!-- coderef:uuid=5eca6c7e-eadb-5cae-ba1c-5a783bee6086 --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `5eca6c7e...` |
| <!-- coderef:uuid=16d6dcc5-5558-598c-b9c7-531f41523947 --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `16d6dcc5...` |
| <!-- coderef:uuid=035093da-3652-57ae-b6bb-2d94d47f91fb --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `035093da...` |
| <!-- coderef:uuid=35bd2760-817b-558f-b69b-cfb1cb8d1916 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `35bd2760...` |
| <!-- coderef:uuid=3d174acb-cc75-595d-b0ec-00bfdf4589aa --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `3d174acb...` |
| <!-- coderef:uuid=16c7e97b-82e6-5b40-89e5-70c8dd4a15e7 --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `16c7e97b...` |
| <!-- coderef:uuid=4b2a0abc-2a54-5f62-a7ca-999ef5fd0d73 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `4b2a0abc...` |
| <!-- coderef:uuid=8063cb4b-509d-54cf-9f54-3916aa1a2fa7 --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `8063cb4b...` |
| <!-- coderef:uuid=8f4ef034-cd2b-50b8-b04f-080c872f4934 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `8f4ef034...` |
| <!-- coderef:uuid=8e47ee66-9b2c-5019-bd00-a90ebcd71d11 --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `8e47ee66...` |
| <!-- coderef:uuid=01e4c1e6-3082-5fc7-9d43-63c0bf740266 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `01e4c1e6...` |
| <!-- coderef:uuid=ba5fb397-908f-5ff7-b18e-3b65909d77e0 --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `ba5fb397...` |
| <!-- coderef:uuid=8000eb38-2f5e-5e96-8fcc-f787f93d32b0 --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `8000eb38...` |
| <!-- coderef:uuid=814fc50d-e32b-5793-ae39-1fc24a164b8d --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `814fc50d...` |
| <!-- coderef:uuid=57b7fdfb-3fc7-5062-804a-7ee5b14813cb --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `57b7fdfb...` |
| <!-- coderef:uuid=22d090ac-0d17-5ae0-857f-153db46358f5 --> `detect_duplicate_pairs` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `22d090ac...` |
| <!-- coderef:uuid=ed12db22-9095-5855-b001-d6864642089c --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `ed12db22...` |
| <!-- coderef:uuid=bd947b00-0b21-5057-9096-42c91859f828 --> `main` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `bd947b00...` |
| <!-- coderef:uuid=c5177523-5917-5b07-979d-ddd877795702 --> `log` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `c5177523...` |
| <!-- coderef:uuid=a1a37739-737e-5aad-a4b1-76431890c4a6 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `a1a37739...` |
| <!-- coderef:uuid=de311cc8-16bb-51a8-a664-6f0804d469c6 --> `load_index` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `de311cc8...` |
| <!-- coderef:uuid=54d31155-0a84-57dd-b0ef-6b68b0b2354b --> `check_export_precision` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `54d31155...` |

*... and 354 more functions. See index.json for complete list.*

---

## Exported Classes (115)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=a70a7cd1-61e5-57c8-8f78-37c761f8cad4 --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `a70a7cd1...` |
| <!-- coderef:uuid=48e29f04-5e07-541a-b129-d61131de9ee8 --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `48e29f04...` |
| <!-- coderef:uuid=840fae65-0826-5aad-bd8d-eee4cff99b24 --> `CallDetector` | `src/analyzer/call-detector.ts` | `840fae65...` |
| <!-- coderef:uuid=f0824d00-a483-51ef-ab99-ff69ebdbaf78 --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `f0824d00...` |
| <!-- coderef:uuid=8eecaa38-6e5d-5883-8a15-9e188fcfb66c --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `8eecaa38...` |
| <!-- coderef:uuid=aa28e540-2bd5-51b4-a925-304d6a42f0a8 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `aa28e540...` |
| <!-- coderef:uuid=b45514b8-ceda-5b81-9cb6-13d60cc12be6 --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `b45514b8...` |
| <!-- coderef:uuid=eab78158-8f68-582b-b5d8-bc1044c15820 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `eab78158...` |
| <!-- coderef:uuid=b9db7f67-b63f-5187-ba1f-670f77c2bb19 --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `b9db7f67...` |
| <!-- coderef:uuid=9afea860-0bd0-5b43-9315-40f494720ad7 --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `9afea860...` |
| <!-- coderef:uuid=1ff126df-020a-5a08-bd91-c4b91c22a7bb --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `1ff126df...` |
| <!-- coderef:uuid=e5a67afb-79bc-5a26-a3e7-514747330c0a --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `e5a67afb...` |
| <!-- coderef:uuid=c8aa62e6-50a2-5449-91d3-43b227cb92af --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `c8aa62e6...` |
| <!-- coderef:uuid=18d6d550-8def-5126-b52d-3b1e6a59dda9 --> `GraphError` | `src/analyzer/graph-error.ts` | `18d6d550...` |
| <!-- coderef:uuid=584cc8ad-ff01-5f5a-aec4-a11ea5e4b427 --> `ImportParser` | `src/analyzer/import-parser.ts` | `584cc8ad...` |
| <!-- coderef:uuid=0c61b3e8-14b7-55bf-8c5d-fee14396986b --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `0c61b3e8...` |
| <!-- coderef:uuid=e558cf99-d4a6-588b-ac0f-4c08b0efe9f9 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `e558cf99...` |
| <!-- coderef:uuid=2c8fd82c-3ba2-519f-8b93-6ea24a979139 --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `2c8fd82c...` |
| <!-- coderef:uuid=ebaf8b59-457b-5f97-a266-d67469b524a6 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `ebaf8b59...` |
| <!-- coderef:uuid=5bc8bfeb-31d8-5c4e-a497-6fb5a92924a9 --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `5bc8bfeb...` |
| <!-- coderef:uuid=935a7ee6-f62c-546e-bf31-148d35e0c971 --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `935a7ee6...` |
| <!-- coderef:uuid=f37fe8ba-f24d-5137-b113-d4a24d50554c --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `f37fe8ba...` |
| <!-- coderef:uuid=7703f3b9-0216-5f94-8711-4d13ab96cc31 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `7703f3b9...` |
| <!-- coderef:uuid=01bd2aaa-352c-5e0e-bff4-210ab3260727 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `01bd2aaa...` |
| <!-- coderef:uuid=ec2bf090-b03f-58ac-927d-707817b1a0dd --> `ContextGenerator` | `src/context/context-generator.ts` | `ec2bf090...` |
| <!-- coderef:uuid=fc8c6321-60a4-56d9-be4a-b6e5f4f69bfb --> `ContextTracker` | `src/context/context-tracker.ts` | `fc8c6321...` |
| <!-- coderef:uuid=432be694-390b-5727-a359-037ef9579e83 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `432be694...` |
| <!-- coderef:uuid=ccfa7055-e2d7-526f-ae6e-485cebe98980 --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `ccfa7055...` |
| <!-- coderef:uuid=019e17f9-608f-5a7f-9f63-c6eef997669c --> `ExampleExtractor` | `src/context/example-extractor.ts` | `019e17f9...` |
| <!-- coderef:uuid=ba96e8f6-698a-59ea-a084-dc50cdca64e5 --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `ba96e8f6...` |
| <!-- coderef:uuid=19a1ff14-3b79-5296-bd3c-7aa1ca2d40b7 --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `19a1ff14...` |
| <!-- coderef:uuid=b3d0a7c8-0afc-5e16-a866-3b9bf0f4bfe1 --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `b3d0a7c8...` |
| <!-- coderef:uuid=474b1ff8-dc3a-5df8-956f-1d166456b77d --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `474b1ff8...` |
| <!-- coderef:uuid=0d441a4e-fae3-5cea-ad46-162d138a3364 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `0d441a4e...` |
| <!-- coderef:uuid=e8a0361a-2e66-55f7-af71-aaa79932499d --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `e8a0361a...` |
| <!-- coderef:uuid=5e73b696-b4ef-5076-9cab-41a4b4907998 --> `CodeRefError` | `src/errors/CodeRefError.ts` | `5e73b696...` |
| <!-- coderef:uuid=db24cece-ee79-5ff5-a7e6-c82783c4be1a --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `db24cece...` |
| <!-- coderef:uuid=38f6f31a-51bd-5e6d-afc0-14bbc820f9e7 --> `IndexError` | `src/errors/IndexError.ts` | `38f6f31a...` |
| <!-- coderef:uuid=8f5c0558-823e-5dce-a446-92305fdb93de --> `ParseError` | `src/errors/ParseError.ts` | `8f5c0558...` |
| <!-- coderef:uuid=e898ca1d-c0af-5c87-b347-ff61374797d7 --> `ScanError` | `src/errors/ScanError.ts` | `e898ca1d...` |
| <!-- coderef:uuid=eb9cfda9-414d-589d-9082-1267035932bd --> `ValidationError` | `src/errors/ValidationError.ts` | `eb9cfda9...` |
| <!-- coderef:uuid=9fd8265c-ab69-543e-a26c-9c1a13fd2d76 --> `GraphExporter` | `src/export/graph-exporter.ts` | `9fd8265c...` |
| <!-- coderef:uuid=531af67b-f29f-5a52-8905-1479c4268a28 --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `531af67b...` |
| <!-- coderef:uuid=09b30cf4-4b75-5cea-9562-1d04a36068ef --> `IndexStore` | `src/indexer/index-store.ts` | `09b30cf4...` |
| <!-- coderef:uuid=69496941-dbe3-52ad-9370-a0b5edde7f16 --> `IndexerService` | `src/indexer/indexer-service.ts` | `69496941...` |
| <!-- coderef:uuid=1b5e55e1-d209-57c2-bcef-ba5d3878fc9b --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `1b5e55e1...` |
| <!-- coderef:uuid=71b87a85-4195-5cba-8b1c-7182ce3e3d41 --> `QueryEngine` | `src/indexer/query-engine.ts` | `71b87a85...` |
| <!-- coderef:uuid=5082b580-ad01-59e0-bf14-9510b6f21907 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `5082b580...` |
| <!-- coderef:uuid=acb482cd-cac5-5609-994a-f9a8485f89f7 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `acb482cd...` |
| <!-- coderef:uuid=75a697c7-f8cc-58e6-823f-8f15e3ae163a --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `75a697c7...` |
| <!-- coderef:uuid=47c934cf-0378-5f92-8bfd-35e9e4bda92c --> `LLMError` | `src/integration/llm/llm-provider.ts` | `47c934cf...` |
| <!-- coderef:uuid=b1389217-70c6-55cc-913e-0e5bcc9a00f9 --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `b1389217...` |
| <!-- coderef:uuid=056d38e9-53ba-58ec-80dd-46e05a55a8bb --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `056d38e9...` |
| <!-- coderef:uuid=a5eedcc6-c5aa-5ecc-a73e-63b145b3c7c2 --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `a5eedcc6...` |
| <!-- coderef:uuid=312d7ef0-a1ad-5d4a-a233-b95916d6f7c6 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `312d7ef0...` |
| <!-- coderef:uuid=38eaf173-699e-5463-baee-c5da48747ab5 --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `38eaf173...` |
| <!-- coderef:uuid=d065b822-7463-5adc-a961-82ce171355d2 --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `d065b822...` |
| <!-- coderef:uuid=23ff97a1-25c6-573e-b53d-73b2578b6b7b --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `23ff97a1...` |
| <!-- coderef:uuid=3e5bb156-fa43-560e-939f-b546aaf714fc --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `3e5bb156...` |
| <!-- coderef:uuid=c6e5b818-0a5c-5047-b120-5e1d41eea1d8 --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `c6e5b818...` |
| <!-- coderef:uuid=a48ea099-93c6-5ebf-947b-57260a42caea --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `a48ea099...` |
| <!-- coderef:uuid=9ea66eb6-b0fb-5747-b4b9-714dac10c429 --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `9ea66eb6...` |
| <!-- coderef:uuid=41409580-5214-5a87-b93e-4fc00c336cde --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `41409580...` |
| <!-- coderef:uuid=db3b28c5-9c9e-5d1c-bbf4-5ae6787ac0cd --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `db3b28c5...` |
| <!-- coderef:uuid=be933b40-6336-5dd0-ad33-29761c129a80 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `be933b40...` |
| <!-- coderef:uuid=116ddd5b-f528-5f37-9785-3a9e161436a6 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `116ddd5b...` |
| <!-- coderef:uuid=3c7f654a-19cf-5183-93a2-33d080439c36 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `3c7f654a...` |
| <!-- coderef:uuid=a506975f-8794-5b7b-ba1d-dcecdcd1126b --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `a506975f...` |
| <!-- coderef:uuid=0ebb95c0-75bd-59ad-a75a-bdffcf9b4caf --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `0ebb95c0...` |
| <!-- coderef:uuid=65391372-7b28-55c8-9ca0-f07d052f2998 --> `ConfigError` | `src/integration/rag/rag-config.ts` | `65391372...` |
| <!-- coderef:uuid=580ffde5-3ff1-5508-8446-ebc2bb2b6c0f --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `580ffde5...` |
| <!-- coderef:uuid=e409dc05-5162-53f2-84e2-718aa3b46386 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `e409dc05...` |
| <!-- coderef:uuid=6b679b80-ad99-5c3b-8441-a72981fb7b2b --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `6b679b80...` |
| <!-- coderef:uuid=52e2817b-af20-5005-88a3-b1c43077bc19 --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `52e2817b...` |
| <!-- coderef:uuid=86fa054c-293d-518b-8848-b4e4f872223a --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `86fa054c...` |
| <!-- coderef:uuid=1b964eff-6873-5591-b0ac-080684904dd0 --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `1b964eff...` |
| <!-- coderef:uuid=cc88b1fb-518d-5631-a179-ff3218ba3569 --> `CodeRefParser` | `src/parser/parser.ts` | `cc88b1fb...` |
| <!-- coderef:uuid=21a6ac7e-80e7-5c76-890c-c7385920eefe --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `21a6ac7e...` |
| <!-- coderef:uuid=c4dbb1c1-ce13-5a7a-b500-1ca66147efc4 --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `c4dbb1c1...` |
| <!-- coderef:uuid=d04cc317-47d5-596c-9d65-8e9d65a91f07 --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `d04cc317...` |
| <!-- coderef:uuid=1bf5e623-6f13-5624-8e52-fe7bd8f7d354 --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `1bf5e623...` |
| <!-- coderef:uuid=cef11aa4-df82-5972-bfc1-18e66237fd9a --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `cef11aa4...` |
| <!-- coderef:uuid=92d1d354-cc97-5fa1-bce2-efab869a686b --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `92d1d354...` |
| <!-- coderef:uuid=eed096d2-b537-5185-9b0f-82c2747e04dc --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `eed096d2...` |
| <!-- coderef:uuid=de149cc3-bde6-543a-ba69-8f675b836fee --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `de149cc3...` |
| <!-- coderef:uuid=c8972575-0d9f-5382-a7c4-487f80209210 --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `c8972575...` |
| <!-- coderef:uuid=baccef82-6eb8-5da4-8f9f-37c006c86b6c --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `baccef82...` |
| <!-- coderef:uuid=30e69a7d-9cda-52d7-a109-44b71aa274b9 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `30e69a7d...` |
| <!-- coderef:uuid=fd2fc4dd-4854-5e0d-b125-9fb905bca11e --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `fd2fc4dd...` |
| <!-- coderef:uuid=6a776b8f-5cfd-5222-a239-2f8058d129fa --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `6a776b8f...` |
| <!-- coderef:uuid=faa01444-996b-5ea0-b24a-1752a37fd124 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `faa01444...` |
| <!-- coderef:uuid=185f1584-5a97-5f19-b215-ba9295aa7807 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `185f1584...` |
| <!-- coderef:uuid=0e405ad5-6377-5cce-9b22-8b05d6645be3 --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `0e405ad5...` |
| <!-- coderef:uuid=718bd605-6c48-58f7-9b21-41eb2ec7fc8a --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `718bd605...` |
| <!-- coderef:uuid=31b1bb9e-b446-5047-8f13-8a7211a30445 --> `PluginError` | `src/plugins/plugin-registry.ts` | `31b1bb9e...` |
| <!-- coderef:uuid=55aaaf2b-68a9-5079-9610-745938d36631 --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `55aaaf2b...` |
| <!-- coderef:uuid=64559d58-dbff-5674-90e0-87685ee54d23 --> `QueryExecutor` | `src/query/query-executor.ts` | `64559d58...` |
| <!-- coderef:uuid=68ccf2fc-7971-5201-9ece-66bf6afaaddd --> `EntityRegistry` | `src/registry/entity-registry.ts` | `68ccf2fc...` |
| <!-- coderef:uuid=ec1138a8-f903-547a-8975-25485d4f3d5a --> `FileWatcher` | `src/scanner/file-watcher.ts` | `ec1138a8...` |
| <!-- coderef:uuid=3b8e0676-b91e-5460-87fd-696ed27c17a3 --> `LRUCache` | `src/scanner/lru-cache.ts` | `3b8e0676...` |
| <!-- coderef:uuid=9885124e-c6c0-56ad-9bba-3fb86e4f7e36 --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `9885124e...` |
| <!-- coderef:uuid=d4b3b059-5082-56f2-804c-569a87632518 --> `SearchIndex` | `src/search/search-engine.ts` | `d4b3b059...` |
| <!-- coderef:uuid=aa315d35-f51f-504a-a9f2-4dffd6fecbde --> `SearchEngine` | `src/search/search-engine.ts` | `aa315d35...` |
| <!-- coderef:uuid=fb08873f-3998-564f-ac5b-74c364ec802c --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `fb08873f...` |
| <!-- coderef:uuid=aa553723-68e6-5f19-b8be-961dcd821644 --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `aa553723...` |
| <!-- coderef:uuid=e7dd4bb8-7d4b-5135-8653-c94f38cb3607 --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `e7dd4bb8...` |
| <!-- coderef:uuid=c4b92a23-0eb8-5f88-b4a4-b450a24d84f2 --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `c4b92a23...` |
| <!-- coderef:uuid=f864042c-414b-51c7-a75c-f3834445ff31 --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `f864042c...` |
| <!-- coderef:uuid=04469a27-ea10-59b3-9e38-881e8c86702c --> `OpenAI` | `src/types/external-modules.d.ts` | `04469a27...` |
| <!-- coderef:uuid=8f168d2c-ce4a-59b4-b5e4-3358e888dc76 --> `Anthropic` | `src/types/external-modules.d.ts` | `8f168d2c...` |
| <!-- coderef:uuid=25c0634f-abbe-50c6-85d7-a881dfb14f5f --> `ChromaClient` | `src/types/external-modules.d.ts` | `25c0634f...` |
| <!-- coderef:uuid=4a832ad8-3a55-58f5-a700-04751494f3be --> `Collection` | `src/types/external-modules.d.ts` | `4a832ad8...` |
| <!-- coderef:uuid=a7e48cc6-8bff-5c29-9c50-981787251a5b --> `Pinecone` | `src/types/external-modules.d.ts` | `a7e48cc6...` |
| <!-- coderef:uuid=e8d35c28-eb0c-5799-93a2-355c5e2a39a8 --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `e8d35c28...` |
| <!-- coderef:uuid=6325dbe6-bb10-5f95-824f-2968fd756397 --> `CodeRefValidator` | `src/validator/validator.ts` | `6325dbe6...` |

---

## Exported Interfaces (346)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=c8a58568-c315-554b-89ce-5d6a830a56df --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `c8a58568...` |
| <!-- coderef:uuid=9770d3fe-33d9-52aa-be27-124dccab6722 --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `9770d3fe...` |
| <!-- coderef:uuid=2c861c82-b3d7-5332-a932-80d8d3f3a7f8 --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `2c861c82...` |
| <!-- coderef:uuid=991851a0-5265-5eb8-a6c6-612ca6ad4df0 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `991851a0...` |
| <!-- coderef:uuid=abf21fd2-2d24-5c83-8735-2299cd454eb8 --> `CallExpression` | `src/analyzer/call-detector.ts` | `abf21fd2...` |
| <!-- coderef:uuid=6e89ccdc-e163-5c14-a0af-b7b4438bcbf7 --> `CallEdge` | `src/analyzer/call-detector.ts` | `6e89ccdc...` |
| <!-- coderef:uuid=83b47126-88f2-558a-9b1a-80d87f5a6bf8 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `83b47126...` |
| <!-- coderef:uuid=39f212b8-162c-5374-8b19-97d5687239e1 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `39f212b8...` |
| <!-- coderef:uuid=d2f8a240-1dab-50ea-b3bd-00946e540c1f --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `d2f8a240...` |
| <!-- coderef:uuid=77daa8a6-2f39-5488-a9a1-c5ced6ee8c56 --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `77daa8a6...` |
| <!-- coderef:uuid=191b5283-e003-5bca-a3e4-a8c7a610cc94 --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `191b5283...` |
| <!-- coderef:uuid=e04d5e7d-8d21-59d5-b87c-3e434e418297 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `e04d5e7d...` |
| <!-- coderef:uuid=aa8b862b-dd3e-5e86-aecf-80328e9ff29f --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `aa8b862b...` |
| <!-- coderef:uuid=a96615e6-068d-5f92-980a-616312ee5266 --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `a96615e6...` |
| <!-- coderef:uuid=d11da093-8ade-5875-a259-bb20af3b99be --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `d11da093...` |
| <!-- coderef:uuid=f5413838-69e0-5d62-af1c-00646b46b627 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `f5413838...` |
| <!-- coderef:uuid=6d047d53-7f49-5b7f-92c9-aeb14bcb10f4 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `6d047d53...` |
| <!-- coderef:uuid=3f775518-22f3-57b4-8570-b6b162b5d5f6 --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `3f775518...` |
| <!-- coderef:uuid=4626779e-eb8b-5894-80e8-33b1e3edf8c3 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `4626779e...` |
| <!-- coderef:uuid=bcddb9fa-dbea-5d35-8e4e-810644478c5c --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `bcddb9fa...` |
| <!-- coderef:uuid=836b97af-dbc7-5467-9072-1eb09c02825b --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `836b97af...` |
| <!-- coderef:uuid=24e096e5-a49f-5eca-b57b-0f61047eb99c --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `24e096e5...` |
| <!-- coderef:uuid=85390885-8afd-5218-bcfe-1bae32553b3d --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `85390885...` |
| <!-- coderef:uuid=6247b050-981c-5d1b-9e2b-a29cc1b0fe0f --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `6247b050...` |
| <!-- coderef:uuid=a3256140-74c3-548b-95b3-13332a7b3ee6 --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `a3256140...` |
| <!-- coderef:uuid=36036191-e516-5bec-ba83-9cd9eff92829 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `36036191...` |
| <!-- coderef:uuid=a7b36c89-3b63-55e4-a2dd-f0ba55463383 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `a7b36c89...` |
| <!-- coderef:uuid=9baa907a-0b2a-53c0-8634-e0435d2d7f6f --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `9baa907a...` |
| <!-- coderef:uuid=28016e18-bf37-5986-a607-103755fe0c01 --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `28016e18...` |
| <!-- coderef:uuid=0f6b01be-be83-57e9-af49-2158e30eca23 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `0f6b01be...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (49)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=7faacc3c-2c49-5b8e-a2bc-e038487de386 --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `7faacc3c...` |
| <!-- coderef:uuid=75c971af-dfc0-5db7-82b4-38edd15d47fa --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `75c971af...` |
| <!-- coderef:uuid=a10f745d-c74e-553b-b792-833dd7d7180b --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `a10f745d...` |
| <!-- coderef:uuid=e5c1b863-6dfe-5b5f-8182-bfd8ad82c121 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `e5c1b863...` |
| <!-- coderef:uuid=d7fb8dfc-aeac-5c05-9c75-41128b5a9e18 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `d7fb8dfc...` |
| <!-- coderef:uuid=c9bc40b4-d711-5119-91c6-97636a4ac29b --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `c9bc40b4...` |
| <!-- coderef:uuid=bfce1b46-b070-5d99-88be-35422a237937 --> `ExportFormat` | `src/export/graph-exporter.ts` | `bfce1b46...` |
| <!-- coderef:uuid=52cfb02b-80db-5606-b939-6c11ed2fd939 --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `52cfb02b...` |
| <!-- coderef:uuid=10679858-2f8f-5502-a7bc-a5814e51eb7d --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `10679858...` |
| <!-- coderef:uuid=04c40f2b-53e6-58fd-b0fd-4d9746b10e97 --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `04c40f2b...` |
| <!-- coderef:uuid=762b91fa-8f96-5866-a042-337ab5e13039 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `762b91fa...` |
| <!-- coderef:uuid=9f9c5adb-0aa7-5001-b986-31f838dd4b51 --> `IndexingStage` | `src/indexer/indexer-service.ts` | `9f9c5adb...` |
| <!-- coderef:uuid=b759e523-2251-5f2d-b736-8ac45fe04955 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `b759e523...` |
| <!-- coderef:uuid=e85d917d-e900-5fb1-91c2-3510bedb7208 --> `QueryFilter` | `src/indexer/query-engine.ts` | `e85d917d...` |
| <!-- coderef:uuid=bff37b1b-054b-5523-9378-f6836b300005 --> `RelationshipType` | `src/indexer/relationship-index.ts` | `bff37b1b...` |
| <!-- coderef:uuid=149b72b6-f0fd-5551-ab6b-bc2904dd636d --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `149b72b6...` |
| <!-- coderef:uuid=01e24d64-e49f-5352-a3a5-f4547a5290b7 --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `01e24d64...` |
| <!-- coderef:uuid=3b576da6-bb9b-5dc5-8cb7-9d13252b84f2 --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `3b576da6...` |
| <!-- coderef:uuid=71ae018d-1299-5e41-8989-520e490d4904 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `71ae018d...` |
| <!-- coderef:uuid=8ba257b2-dbc7-55b7-8ac0-5f2ceca58a80 --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `8ba257b2...` |
| <!-- coderef:uuid=a895caa0-17db-5d20-8c2d-f696b74e868c --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `a895caa0...` |
| <!-- coderef:uuid=aeacf0b9-10cf-55bb-a817-7f43cfcd0c42 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `aeacf0b9...` |
| <!-- coderef:uuid=f0204102-857b-5b1d-b9c0-c2daa37998cb --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `f0204102...` |
| <!-- coderef:uuid=8a69f5c8-bf03-5048-8d3a-225f7e0956e3 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `8a69f5c8...` |
| <!-- coderef:uuid=9c7fe567-c32f-5fc4-be67-fb2e22d8ff77 --> `RelativePath` | `src/integration/rag/path-types.ts` | `9c7fe567...` |
| <!-- coderef:uuid=4664f8df-47d5-5354-ac13-1855bc768c12 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `4664f8df...` |
| <!-- coderef:uuid=d5da4db9-6b34-5a10-a83c-436c1e8df832 --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `d5da4db9...` |
| <!-- coderef:uuid=9be6c9e3-cb28-5299-b132-6b1b0d5174ff --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `9be6c9e3...` |
| <!-- coderef:uuid=14cf9160-34d8-57d6-8883-c87432a5df8e --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `14cf9160...` |
| <!-- coderef:uuid=3816c8da-d462-5529-a039-4d440a8d1c34 --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `3816c8da...` |
| <!-- coderef:uuid=4823d88c-db5d-56c5-a508-468ad6540cb3 --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `4823d88c...` |
| <!-- coderef:uuid=75604c77-4e70-5b8a-ae19-7cc427dc2114 --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `75604c77...` |
| <!-- coderef:uuid=55452b85-c54a-55b8-843b-17a761ce523d --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `55452b85...` |
| <!-- coderef:uuid=5cb370b4-a1e4-5bfe-ab14-eb2fd2f4e37f --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `5cb370b4...` |
| <!-- coderef:uuid=5cabf37d-a262-5e8e-aa69-4801cdcb92cc --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `5cabf37d...` |
| <!-- coderef:uuid=f6e8ae2a-2f00-508d-b932-bf0b5bad28a9 --> `ExportTable` | `src/pipeline/import-resolver.ts` | `f6e8ae2a...` |
| <!-- coderef:uuid=8e8a66ca-d49b-5661-b127-04b3a2deb3d4 --> `LanguageExtension` | `src/pipeline/types.ts` | `8e8a66ca...` |
| <!-- coderef:uuid=77eff975-57d6-557d-a2d2-d989e8aba69e --> `RawExportKind` | `src/pipeline/types.ts` | `77eff975...` |
| <!-- coderef:uuid=8452698f-9b81-5a5a-9d6c-db03eef780df --> `PluginSource` | `src/plugins/types.ts` | `8452698f...` |
| <!-- coderef:uuid=9f997bec-0250-5b0d-8ad1-aa718cafe417 --> `QueryType` | `src/query/query-executor.ts` | `9f997bec...` |
| <!-- coderef:uuid=74bcdcf3-67cc-5ad8-8da9-b73ed1ade4a2 --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `74bcdcf3...` |
| <!-- coderef:uuid=885d30a9-8286-5096-8a56-e4fc01d8d525 --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `885d30a9...` |
| <!-- coderef:uuid=1eb790ad-f0ff-5f20-b093-2fab0b4ac5e6 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `1eb790ad...` |
| <!-- coderef:uuid=dab352b3-f663-5b8c-99eb-afa3f7fb04db --> `LogLevel` | `src/utils/logger.ts` | `dab352b3...` |
| <!-- coderef:uuid=6f928f2e-d94a-5782-8af7-d5bd052e35d3 --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `6f928f2e...` |
| <!-- coderef:uuid=9f611eba-7a8e-5aa2-96dc-beba94b3d70e --> `IndexedCoderef` | `types.d.ts` | `9f611eba...` |
| <!-- coderef:uuid=09929c0d-2312-5c61-b71a-daea6839f565 --> `DriftStatus` | `types.d.ts` | `09929c0d...` |
| <!-- coderef:uuid=1ebaa254-a1ce-5ee4-baf5-ef47232dcff9 --> `DriftReport` | `types.d.ts` | `1ebaa254...` |
| <!-- coderef:uuid=b83d228a-5c30-5e43-9745-1f85c35782e1 --> `DriftDetectionOptions` | `types.d.ts` | `b83d228a...` |

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
