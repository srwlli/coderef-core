# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-05-16  
**Total Exported:** 926 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **408** | 397 | 805 |
| interface | **346** | 65 | 411 |
| type | **49** | 11 | 60 |
| component | **2** | 0 | 2 |
| class | **115** | 5 | 120 |
| constant | **6** | 12 | 18 |

---

## Exported Functions (408)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=1da6a6b1-9564-5ba9-ae15-a731ba10d2fc --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `1da6a6b1...` |
| <!-- coderef:uuid=40ea77e1-eddc-56a0-bf6b-09679fb0e09d --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `40ea77e1...` |
| <!-- coderef:uuid=f8825260-7b2d-5069-b258-6d2012c622c0 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `f8825260...` |
| <!-- coderef:uuid=46759637-9963-530f-b882-7956707e88e2 --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `46759637...` |
| <!-- coderef:uuid=d7406361-a48b-5f86-aef1-c779cdf216b5 --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `d7406361...` |
| <!-- coderef:uuid=a06c31e2-a27f-588d-b97e-c9f768ed2aa2 --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `a06c31e2...` |
| <!-- coderef:uuid=c1141eb5-5c73-5421-aaef-1d7a547e885c --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `c1141eb5...` |
| <!-- coderef:uuid=47ea9deb-3384-51f5-865e-4f1cb65c5100 --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `47ea9deb...` |
| <!-- coderef:uuid=dd84aaa0-208d-58f5-863c-c2ede82753f5 --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `dd84aaa0...` |
| <!-- coderef:uuid=38840d93-4192-54a7-b219-3852c56a1cb8 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `38840d93...` |
| <!-- coderef:uuid=c3ba1ce9-ec2d-59f0-bd67-d6b2022eda00 --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `c3ba1ce9...` |
| <!-- coderef:uuid=c5de70bb-cb71-5242-92a9-506eabf20b63 --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `c5de70bb...` |
| <!-- coderef:uuid=30ecf889-6b46-547e-9868-34e6ec52d1cb --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `30ecf889...` |
| <!-- coderef:uuid=bd7b2f44-6efc-59e6-85b7-0bad5c6128e0 --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `bd7b2f44...` |
| <!-- coderef:uuid=23e62d30-0e2b-5ac9-939f-69a99e622f4b --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `23e62d30...` |
| <!-- coderef:uuid=6c416abc-47bd-58d4-9a9c-6c73ce4dff38 --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `6c416abc...` |
| <!-- coderef:uuid=e5bde946-4be2-5b9d-8ab4-f578b5c501d5 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `e5bde946...` |
| <!-- coderef:uuid=b5b11e18-0906-5166-8105-b6ef113a1cc5 --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `b5b11e18...` |
| <!-- coderef:uuid=24cf94b8-8e37-5d19-aff4-471e9cfd793d --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `24cf94b8...` |
| <!-- coderef:uuid=54b6ad69-da31-5a75-b6c5-c71f5560de9c --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `54b6ad69...` |
| <!-- coderef:uuid=b3a8c5e8-40d4-548f-9dd0-6ea195d4c3bd --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `b3a8c5e8...` |
| <!-- coderef:uuid=e41de401-d6db-5550-afc7-25fca72872b0 --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `e41de401...` |
| <!-- coderef:uuid=b1c2d6ea-bc51-57af-a3b9-023731795f65 --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `b1c2d6ea...` |
| <!-- coderef:uuid=13798056-2883-551f-9aff-8239b20b5971 --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `13798056...` |
| <!-- coderef:uuid=072ef64c-cd66-5fa8-a7c7-096a5d8b241d --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `072ef64c...` |
| <!-- coderef:uuid=9648838b-e651-5905-ac8f-8287a76c2f47 --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `9648838b...` |
| <!-- coderef:uuid=9b1d5069-7bce-584a-8e60-511caea833b0 --> `main` | `autoresearch/scanner-quality/01-element-classification/apply_iteration_5.py` | ❌ |  | `9b1d5069...` |
| <!-- coderef:uuid=5bcdd164-8d64-5177-8bf0-00ccc8f3c6d6 --> `main` | `autoresearch/scanner-quality/03-test-coverage-linkage/apply_iteration_1.py` | ❌ |  | `5bcdd164...` |
| <!-- coderef:uuid=5c030abc-f997-5d97-ae15-de534142677e --> `main` | `autoresearch/scanner-quality/04-async-pattern-detection/apply_iteration_1.py` | ❌ |  | `5c030abc...` |
| <!-- coderef:uuid=c2c8f4d8-252e-57ce-99c7-c16bd6dbf6c0 --> `main` | `autoresearch/scanner-quality/06-test-gap-precision/apply_iteration_1.py` | ❌ |  | `c2c8f4d8...` |
| <!-- coderef:uuid=080857f0-524e-5216-81ea-b14a6bae0726 --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `080857f0...` |
| <!-- coderef:uuid=ba96acc6-d56e-572a-bc48-3baef4028946 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `ba96acc6...` |
| <!-- coderef:uuid=931bdce5-e3a0-58c7-938f-c9495327f2ce --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `931bdce5...` |
| <!-- coderef:uuid=03bf27da-9e12-5436-960c-9cc878cd0f1a --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `03bf27da...` |
| <!-- coderef:uuid=2cfce846-e707-50b3-a561-6359f6b03a55 --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `2cfce846...` |
| <!-- coderef:uuid=2bbe38e3-2a3a-5d02-a30f-f87a4717be39 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `2bbe38e3...` |
| <!-- coderef:uuid=82dfc9d0-cd77-51ed-b9dd-f195ed6ce88c --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `82dfc9d0...` |
| <!-- coderef:uuid=00c5c25c-648a-51d6-a259-32fac64cdce2 --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `00c5c25c...` |
| <!-- coderef:uuid=84949d00-28dd-535f-a6f1-b14605a64968 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `84949d00...` |
| <!-- coderef:uuid=ed5cb9d4-3762-5402-8409-38e6085b77e4 --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `ed5cb9d4...` |
| <!-- coderef:uuid=5a61ca33-9ad0-5658-8114-f65c328eb228 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `5a61ca33...` |
| <!-- coderef:uuid=e696d0ca-15f8-55f5-8a8a-98a7ef40c4ba --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `e696d0ca...` |
| <!-- coderef:uuid=64e79636-deea-5225-a3ef-2901a513b5a7 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `64e79636...` |
| <!-- coderef:uuid=b2a95341-4fa6-57c7-886d-3e30d8541e5b --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `b2a95341...` |
| <!-- coderef:uuid=ffdc2645-841e-5953-867b-d068c32bf38d --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `ffdc2645...` |
| <!-- coderef:uuid=6ca36257-6493-580a-893f-de15a6ec35a9 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `6ca36257...` |
| <!-- coderef:uuid=03aeae69-6c29-5afe-af0f-d11a1a1797c6 --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `03aeae69...` |
| <!-- coderef:uuid=04d37b81-3e87-594f-903d-c6d4cf27bb9b --> `detect_duplicate_pairs` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `04d37b81...` |
| <!-- coderef:uuid=ec50f72a-aec8-5e8a-a571-84f9db0c203c --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `ec50f72a...` |
| <!-- coderef:uuid=dbed8b10-5cb3-5c6a-b5ab-37bf56b6c71d --> `main` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `dbed8b10...` |

*... and 358 more functions. See index.json for complete list.*

---

## Exported Classes (115)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=629e6022-68fb-53c6-beb3-835cad091a8b --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `629e6022...` |
| <!-- coderef:uuid=00d956a2-f54f-5646-aaad-3a0e8a13713f --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `00d956a2...` |
| <!-- coderef:uuid=706c0365-b04a-5b41-8b6f-d5ecbec8abe3 --> `CallDetector` | `src/analyzer/call-detector.ts` | `706c0365...` |
| <!-- coderef:uuid=2583e9e1-ab92-53bb-8c4c-98776bf38d9f --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `2583e9e1...` |
| <!-- coderef:uuid=959d2543-d8dc-559e-9383-dc68a5aa233e --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `959d2543...` |
| <!-- coderef:uuid=6f0a1f86-12f0-57a1-a85d-18afdd96cd13 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `6f0a1f86...` |
| <!-- coderef:uuid=0829ef75-87eb-5e67-92e1-ec6e0b3b239e --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `0829ef75...` |
| <!-- coderef:uuid=4976b48d-4564-5ce9-90cf-cc30ea74bfcc --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `4976b48d...` |
| <!-- coderef:uuid=f7886285-8124-5477-874c-e42d843bc8fd --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `f7886285...` |
| <!-- coderef:uuid=881aa956-7c49-5778-b59a-659ec3ed8a84 --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `881aa956...` |
| <!-- coderef:uuid=89bbd29f-59d6-5ca2-a5f7-ad7fabdf11ab --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `89bbd29f...` |
| <!-- coderef:uuid=80b1c7e7-6490-50e0-bc94-9b3a287178fd --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `80b1c7e7...` |
| <!-- coderef:uuid=b5add92e-4134-52f7-a3e9-439342d38238 --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `b5add92e...` |
| <!-- coderef:uuid=d2ff9ecb-46d6-5a6a-ad86-b777252f0fc4 --> `GraphError` | `src/analyzer/graph-error.ts` | `d2ff9ecb...` |
| <!-- coderef:uuid=ccccb636-87d6-5a71-a181-b390c12a963f --> `ImportParser` | `src/analyzer/import-parser.ts` | `ccccb636...` |
| <!-- coderef:uuid=7c2ceac6-25ae-5f85-a040-4a262dce14ac --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `7c2ceac6...` |
| <!-- coderef:uuid=27548b6f-a53b-52b4-9197-93eb63e26339 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `27548b6f...` |
| <!-- coderef:uuid=630b55f5-7244-59b4-a922-da479358aa0d --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `630b55f5...` |
| <!-- coderef:uuid=75be4a32-4713-5593-a456-83979e307337 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `75be4a32...` |
| <!-- coderef:uuid=d67f9853-1b2e-56dc-8227-9f3e960e60ed --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `d67f9853...` |
| <!-- coderef:uuid=ea601faf-541f-5f3f-b17e-3a1a674cbde2 --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `ea601faf...` |
| <!-- coderef:uuid=a7c5badc-49f6-5d86-a2a2-be579f3f2f9f --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `a7c5badc...` |
| <!-- coderef:uuid=814abe0d-1a0e-57ea-a4fa-d46843741784 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `814abe0d...` |
| <!-- coderef:uuid=5a5353de-a6b2-54c8-af60-bb957405a5a6 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `5a5353de...` |
| <!-- coderef:uuid=302ad319-90c3-5f1f-8f2c-5548c3d68c8d --> `ContextGenerator` | `src/context/context-generator.ts` | `302ad319...` |
| <!-- coderef:uuid=ebebceb0-9bcf-5308-ab4a-572de5d92a63 --> `ContextTracker` | `src/context/context-tracker.ts` | `ebebceb0...` |
| <!-- coderef:uuid=ff4fca22-3445-547d-b430-298f138d5720 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `ff4fca22...` |
| <!-- coderef:uuid=4dde6c27-0ce5-5cbc-873b-36bf56d0148d --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `4dde6c27...` |
| <!-- coderef:uuid=a1991e38-c2e6-51c5-bec3-0a41f5b38611 --> `ExampleExtractor` | `src/context/example-extractor.ts` | `a1991e38...` |
| <!-- coderef:uuid=8183557f-5e8e-5f91-b867-231e7e3622fb --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `8183557f...` |
| <!-- coderef:uuid=9dc72375-3d57-5674-9d4c-9ff6fca88e89 --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `9dc72375...` |
| <!-- coderef:uuid=d302614a-0ddd-5130-acee-1efffda26e05 --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `d302614a...` |
| <!-- coderef:uuid=283bbcf6-72b4-520a-aeec-481cde9400c7 --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `283bbcf6...` |
| <!-- coderef:uuid=32c39ca6-49af-589d-8ec8-ffc6a40e269b --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `32c39ca6...` |
| <!-- coderef:uuid=f7d61d2f-79fd-52fa-a961-926186ed4d1f --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `f7d61d2f...` |
| <!-- coderef:uuid=89af6dc7-bd9d-53da-b0a9-97db7e212ec4 --> `CodeRefError` | `src/errors/CodeRefError.ts` | `89af6dc7...` |
| <!-- coderef:uuid=e2ecf185-0e52-5170-8d18-937b07a031b6 --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `e2ecf185...` |
| <!-- coderef:uuid=9bd1ab24-6b08-51f2-9c1d-fa291fef182b --> `IndexError` | `src/errors/IndexError.ts` | `9bd1ab24...` |
| <!-- coderef:uuid=654e4fba-b260-572d-be03-93fba18243d0 --> `ParseError` | `src/errors/ParseError.ts` | `654e4fba...` |
| <!-- coderef:uuid=e14bea25-de48-5dad-b7a4-5c35b7929f3e --> `ScanError` | `src/errors/ScanError.ts` | `e14bea25...` |
| <!-- coderef:uuid=cac1f9c9-481f-50f0-bfc2-1fec9bd475a6 --> `ValidationError` | `src/errors/ValidationError.ts` | `cac1f9c9...` |
| <!-- coderef:uuid=09623fec-8219-5dc6-b42c-2b0f990936ef --> `GraphExporter` | `src/export/graph-exporter.ts` | `09623fec...` |
| <!-- coderef:uuid=9af2465a-d9a2-5a22-8f30-e81a5f03a7fe --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `9af2465a...` |
| <!-- coderef:uuid=f1b98242-006f-59cd-a9f1-8304787e10c4 --> `IndexStore` | `src/indexer/index-store.ts` | `f1b98242...` |
| <!-- coderef:uuid=8f4b18f3-b0a2-558e-a8c8-b11cfaa6f24e --> `IndexerService` | `src/indexer/indexer-service.ts` | `8f4b18f3...` |
| <!-- coderef:uuid=07195e89-4662-5029-bddf-55c136c47550 --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `07195e89...` |
| <!-- coderef:uuid=1b7e8bc7-d4cd-52ba-b9b6-58da3a03edac --> `QueryEngine` | `src/indexer/query-engine.ts` | `1b7e8bc7...` |
| <!-- coderef:uuid=0fb269a1-1186-5e74-89a8-e8db58fd4110 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `0fb269a1...` |
| <!-- coderef:uuid=cb921be3-a76d-5dc3-bcbe-5d19cae6b55d --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `cb921be3...` |
| <!-- coderef:uuid=bb1bfcd8-be1c-5aba-98fa-7f6804e7a94e --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `bb1bfcd8...` |
| <!-- coderef:uuid=55a64c25-028c-5085-9eba-d808e7a5e9f7 --> `LLMError` | `src/integration/llm/llm-provider.ts` | `55a64c25...` |
| <!-- coderef:uuid=a61b7f32-cc2f-5250-8f15-d388ee3fe89c --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `a61b7f32...` |
| <!-- coderef:uuid=27262d21-f9a8-5f14-bcab-a2fabe92cfb6 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `27262d21...` |
| <!-- coderef:uuid=cac3e8f9-35d3-5f8c-86d7-55e0c5059a69 --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `cac3e8f9...` |
| <!-- coderef:uuid=36b3b066-01a7-5f2a-8ff1-b81c91148e16 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `36b3b066...` |
| <!-- coderef:uuid=142fd01c-154b-57a1-a0ba-25e555500d2a --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `142fd01c...` |
| <!-- coderef:uuid=dbea5bdf-b43f-577a-ae7f-368523fe3dd7 --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `dbea5bdf...` |
| <!-- coderef:uuid=f41f8841-c877-536e-889a-3faf2e5254eb --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `f41f8841...` |
| <!-- coderef:uuid=e3a06ce6-ded6-5dd7-8314-9a375236f9bc --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `e3a06ce6...` |
| <!-- coderef:uuid=e07e9a19-574a-5ca2-a95d-040dba3d2bd6 --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `e07e9a19...` |
| <!-- coderef:uuid=e41daa46-ddaa-5576-81d2-aadc5ed4dfb1 --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `e41daa46...` |
| <!-- coderef:uuid=d8ccead2-e3e1-5c7f-bef8-b2c0005c67aa --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `d8ccead2...` |
| <!-- coderef:uuid=3c2173db-7cb9-59b2-90a1-a3f33cc3bf87 --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `3c2173db...` |
| <!-- coderef:uuid=223c3854-feb0-524d-88f1-389798c52e8d --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `223c3854...` |
| <!-- coderef:uuid=358b98ad-54f6-5df7-b047-f1d653361d66 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `358b98ad...` |
| <!-- coderef:uuid=bf63285c-2811-539d-b1fe-e3f75a699553 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `bf63285c...` |
| <!-- coderef:uuid=c014c3f7-57cd-57a3-831a-cb959284cde5 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `c014c3f7...` |
| <!-- coderef:uuid=178934a9-8325-56f6-9175-bea7f8f1b88a --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `178934a9...` |
| <!-- coderef:uuid=aef590db-7d68-5433-be6f-de6a456a017c --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `aef590db...` |
| <!-- coderef:uuid=ff3603b7-e8e1-540b-8fc9-eb0dab3a9c7a --> `ConfigError` | `src/integration/rag/rag-config.ts` | `ff3603b7...` |
| <!-- coderef:uuid=5ac6ab1e-8878-55b8-acc3-7493ee3b621f --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `5ac6ab1e...` |
| <!-- coderef:uuid=141c2215-0819-5f40-b6f3-fcdf4c5bf829 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `141c2215...` |
| <!-- coderef:uuid=23364756-391e-51c3-b6bd-3b543373107e --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `23364756...` |
| <!-- coderef:uuid=4ee08332-660c-5d63-82f5-30b2dafd195d --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `4ee08332...` |
| <!-- coderef:uuid=0d62758f-fb00-5cf7-bca7-053d80847571 --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `0d62758f...` |
| <!-- coderef:uuid=ce8370a4-8a74-5b90-ab15-069e0298ffaf --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `ce8370a4...` |
| <!-- coderef:uuid=bb8c4941-5229-5edb-98db-edc10184e4e4 --> `CodeRefParser` | `src/parser/parser.ts` | `bb8c4941...` |
| <!-- coderef:uuid=b95b9a35-e064-5d03-941d-263cefb203ec --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `b95b9a35...` |
| <!-- coderef:uuid=c7ca68b8-dd95-5e4e-952f-d27882677a60 --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `c7ca68b8...` |
| <!-- coderef:uuid=a2c5ea62-4f95-54bb-b7e1-89f8d82ad7bf --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `a2c5ea62...` |
| <!-- coderef:uuid=627588b5-09f1-513f-8546-dcd64f71e958 --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `627588b5...` |
| <!-- coderef:uuid=950c6a4b-6f21-5b6c-99e5-88654bd8329d --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `950c6a4b...` |
| <!-- coderef:uuid=f2745619-d358-595b-bd49-b2406c2aa689 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `f2745619...` |
| <!-- coderef:uuid=e26c0a2d-dace-56b0-94e0-8a15a63557d7 --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `e26c0a2d...` |
| <!-- coderef:uuid=29cbe502-0ef6-5a3a-8c63-e86321b47617 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `29cbe502...` |
| <!-- coderef:uuid=30adea26-8b75-54fa-8811-4c69dc7f05e2 --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `30adea26...` |
| <!-- coderef:uuid=b04b1451-9b82-5864-8938-c6e3b4c8cc61 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `b04b1451...` |
| <!-- coderef:uuid=50e8cae7-e886-522c-a7df-6790348b2a1d --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `50e8cae7...` |
| <!-- coderef:uuid=571c0d57-a6c0-575a-a6ef-0c09d912a67a --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `571c0d57...` |
| <!-- coderef:uuid=75029a57-626e-5da1-a119-6690379b2c55 --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `75029a57...` |
| <!-- coderef:uuid=6ea666f1-b26b-5f1b-a5f5-ddec3b625512 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `6ea666f1...` |
| <!-- coderef:uuid=07165540-2b7c-5d1f-9deb-9cbabbbeca42 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `07165540...` |
| <!-- coderef:uuid=cdf302f7-969c-5d8f-92ae-661da4af5fe1 --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `cdf302f7...` |
| <!-- coderef:uuid=f917d3d9-9af1-59e7-a262-94edf0cb06f5 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `f917d3d9...` |
| <!-- coderef:uuid=865cdf88-d0f3-5f63-a3f1-900cb24209dc --> `PluginError` | `src/plugins/plugin-registry.ts` | `865cdf88...` |
| <!-- coderef:uuid=22bf7eec-165d-589e-86cb-c003ef0072f0 --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `22bf7eec...` |
| <!-- coderef:uuid=d4b0ce92-ff85-5140-a03f-25cb96c9c2d6 --> `QueryExecutor` | `src/query/query-executor.ts` | `d4b0ce92...` |
| <!-- coderef:uuid=4f0cc3a5-0817-5abc-b762-d75aef5d2169 --> `EntityRegistry` | `src/registry/entity-registry.ts` | `4f0cc3a5...` |
| <!-- coderef:uuid=207ec4bb-dfae-57dd-bcee-f80232564e74 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `207ec4bb...` |
| <!-- coderef:uuid=2202212e-02f0-5a08-a53b-61b7bbed77c2 --> `LRUCache` | `src/scanner/lru-cache.ts` | `2202212e...` |
| <!-- coderef:uuid=bbe9c944-5909-5413-afdd-0afed368baef --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `bbe9c944...` |
| <!-- coderef:uuid=e80ae325-bd5d-5e8e-8696-88bc2050d3df --> `SearchIndex` | `src/search/search-engine.ts` | `e80ae325...` |
| <!-- coderef:uuid=2e5443f4-8f5a-549b-ba91-5497e7512f3e --> `SearchEngine` | `src/search/search-engine.ts` | `2e5443f4...` |
| <!-- coderef:uuid=eb180ed1-3737-5532-be3d-37c378cfa25d --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `eb180ed1...` |
| <!-- coderef:uuid=eadcc846-9b2f-56da-a8d7-4ded62b13efd --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `eadcc846...` |
| <!-- coderef:uuid=5a5869f6-1bd4-527a-a4bd-18ddec45490e --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `5a5869f6...` |
| <!-- coderef:uuid=be902c23-bc13-5b18-b496-7075fa5e4365 --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `be902c23...` |
| <!-- coderef:uuid=170979b0-3b18-5766-9e19-51a683ea0bf9 --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `170979b0...` |
| <!-- coderef:uuid=87a4e2fa-6db2-550d-b4de-ee1408c89a9b --> `OpenAI` | `src/types/external-modules.d.ts` | `87a4e2fa...` |
| <!-- coderef:uuid=8f9c3b33-8867-543c-9652-3a68ce6556a4 --> `Anthropic` | `src/types/external-modules.d.ts` | `8f9c3b33...` |
| <!-- coderef:uuid=95aef5c1-b909-5ed0-94f2-c08e4f7e5b4d --> `ChromaClient` | `src/types/external-modules.d.ts` | `95aef5c1...` |
| <!-- coderef:uuid=ca8c0b07-b756-59e1-9e2e-c9913f668b02 --> `Collection` | `src/types/external-modules.d.ts` | `ca8c0b07...` |
| <!-- coderef:uuid=982b85ff-aa84-544a-bf06-072649c2ea1e --> `Pinecone` | `src/types/external-modules.d.ts` | `982b85ff...` |
| <!-- coderef:uuid=ae53150c-8294-55ef-aef6-d9f03aa28af2 --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `ae53150c...` |
| <!-- coderef:uuid=88716224-0466-51b4-9fce-dbf32e4f46f9 --> `CodeRefValidator` | `src/validator/validator.ts` | `88716224...` |

---

## Exported Interfaces (346)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=1fbf7f2f-e78d-50d8-a2fb-5953f7b3d693 --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `1fbf7f2f...` |
| <!-- coderef:uuid=618f3ca4-ebec-51a0-aefd-be96628bca93 --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `618f3ca4...` |
| <!-- coderef:uuid=1034deed-f5d7-584b-abd6-8825f1544eba --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `1034deed...` |
| <!-- coderef:uuid=56803491-7133-511f-bac5-ec5038d55312 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `56803491...` |
| <!-- coderef:uuid=f1bfcd38-d5d6-52ab-8b8c-0c92bd6e6e47 --> `CallExpression` | `src/analyzer/call-detector.ts` | `f1bfcd38...` |
| <!-- coderef:uuid=40fb327a-d958-5c12-8ae1-965661cf9945 --> `CallEdge` | `src/analyzer/call-detector.ts` | `40fb327a...` |
| <!-- coderef:uuid=e177568c-0f9f-5425-9f1e-42d28c4a2216 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `e177568c...` |
| <!-- coderef:uuid=716ba71f-a805-5a8d-9453-085f0da6c391 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `716ba71f...` |
| <!-- coderef:uuid=ecb3c1ad-4132-58a6-aa25-263461124829 --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `ecb3c1ad...` |
| <!-- coderef:uuid=a72e1fa4-656d-5cca-8d9c-d0381bcd8f43 --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `a72e1fa4...` |
| <!-- coderef:uuid=cdecb3c3-3213-562c-9256-01cdb866aff9 --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `cdecb3c3...` |
| <!-- coderef:uuid=afe39cba-6148-5493-8e9f-9e4e784191aa --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `afe39cba...` |
| <!-- coderef:uuid=81c3327b-e433-540b-9d38-c312c26a6882 --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `81c3327b...` |
| <!-- coderef:uuid=46521e50-5a77-59bc-a7e2-a99507ce751a --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `46521e50...` |
| <!-- coderef:uuid=ead37e85-7e1d-5ff3-9d8d-86949c583b9d --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `ead37e85...` |
| <!-- coderef:uuid=f8b37d52-9031-51d3-8550-d55df999bc7c --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `f8b37d52...` |
| <!-- coderef:uuid=f19ff475-5492-5893-8a54-32b5bc9a1325 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `f19ff475...` |
| <!-- coderef:uuid=b90d0121-c471-5e60-ad30-dfbfca744f67 --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `b90d0121...` |
| <!-- coderef:uuid=43426f5f-4bf1-5a23-8103-e9de4f19515c --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `43426f5f...` |
| <!-- coderef:uuid=f294ffb5-57b7-5ccd-9c65-753d0a9cbddf --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `f294ffb5...` |
| <!-- coderef:uuid=6dcf1f42-a227-54f0-90af-b158f88bfcf4 --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `6dcf1f42...` |
| <!-- coderef:uuid=b590bf9b-69cf-52de-a85e-b8b43723b48f --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `b590bf9b...` |
| <!-- coderef:uuid=d73a2b34-7ffb-5ecc-abf9-61a7162fc51f --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `d73a2b34...` |
| <!-- coderef:uuid=968f951d-f526-5d9e-93e0-921627fbe4f8 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `968f951d...` |
| <!-- coderef:uuid=c43a6c93-5279-50b4-a0a3-911c9f0710db --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `c43a6c93...` |
| <!-- coderef:uuid=5c36766e-caa6-5c28-b815-04ec9b419087 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `5c36766e...` |
| <!-- coderef:uuid=a98cd8ce-fb7b-5607-8553-aa98ae97b930 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `a98cd8ce...` |
| <!-- coderef:uuid=24444a5f-2517-5fea-82af-62c2c9c4023b --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `24444a5f...` |
| <!-- coderef:uuid=4c1356e5-d651-5ee6-95fd-4d593913f5ce --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `4c1356e5...` |
| <!-- coderef:uuid=f0d7b880-c1c5-52d8-beb4-2551912aa4cd --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `f0d7b880...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (49)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=0d7e06ac-ba09-5646-a780-c52510d156ff --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `0d7e06ac...` |
| <!-- coderef:uuid=6bcda88b-27ab-5a2b-b0f0-eabb7b38ab2b --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `6bcda88b...` |
| <!-- coderef:uuid=6cba4f8f-f448-5042-9410-08cde19ba2c1 --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `6cba4f8f...` |
| <!-- coderef:uuid=240cbfd1-3346-5393-8ab0-c3afcdc84782 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `240cbfd1...` |
| <!-- coderef:uuid=1ef0a0bb-459c-53e4-883f-269c3a22ac88 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `1ef0a0bb...` |
| <!-- coderef:uuid=a981000d-8fa5-5e16-9f54-e581007940d1 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `a981000d...` |
| <!-- coderef:uuid=64f1a65d-a22c-5888-8cae-3f8dc2aec7e8 --> `ExportFormat` | `src/export/graph-exporter.ts` | `64f1a65d...` |
| <!-- coderef:uuid=db4679d9-a679-5d1a-815a-c4854cc6e308 --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `db4679d9...` |
| <!-- coderef:uuid=aecd55bf-4ac3-5323-ac4d-2c2d075d4a04 --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `aecd55bf...` |
| <!-- coderef:uuid=4582ff47-8458-5fae-8fc4-4da471b17b5d --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `4582ff47...` |
| <!-- coderef:uuid=42eee1d6-bffa-5e2c-871a-b9f2382e6882 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `42eee1d6...` |
| <!-- coderef:uuid=65ce1983-c1a3-5428-843a-0e634abc3d16 --> `IndexingStage` | `src/indexer/indexer-service.ts` | `65ce1983...` |
| <!-- coderef:uuid=cbf4ebf2-fcdf-5161-a297-5bf2d5003aa7 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `cbf4ebf2...` |
| <!-- coderef:uuid=f5385bf1-b419-5f95-8bff-2d0bef831dac --> `QueryFilter` | `src/indexer/query-engine.ts` | `f5385bf1...` |
| <!-- coderef:uuid=69e4bd81-b523-5d93-8ff0-55b343b66ee6 --> `RelationshipType` | `src/indexer/relationship-index.ts` | `69e4bd81...` |
| <!-- coderef:uuid=cd69adcc-053b-5b20-9646-6850bddbec66 --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `cd69adcc...` |
| <!-- coderef:uuid=0fc8c412-f7c4-50e5-9dcd-0a7d88ef2a40 --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `0fc8c412...` |
| <!-- coderef:uuid=e0af9e0f-b30e-5a80-a077-a442090da555 --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `e0af9e0f...` |
| <!-- coderef:uuid=4b0ab05c-b9cf-5c30-bb17-276ff182c461 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `4b0ab05c...` |
| <!-- coderef:uuid=9a6643ac-e892-5238-a0a4-1eb15e3ad637 --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `9a6643ac...` |
| <!-- coderef:uuid=6f3475e5-1c81-5e3e-b0a1-1741a9e6d53a --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `6f3475e5...` |
| <!-- coderef:uuid=3861b2b6-f917-500c-bb38-34c0377e7d95 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `3861b2b6...` |
| <!-- coderef:uuid=af65e096-8e27-5559-925e-c4910cdab816 --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `af65e096...` |
| <!-- coderef:uuid=adbd31e2-b617-5994-bc18-e2e0c32f775b --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `adbd31e2...` |
| <!-- coderef:uuid=53c5c8ca-a4a7-5bba-9388-a920204c8a7a --> `RelativePath` | `src/integration/rag/path-types.ts` | `53c5c8ca...` |
| <!-- coderef:uuid=dcf5ea87-feb2-5fcd-a55b-c17051082a5d --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `dcf5ea87...` |
| <!-- coderef:uuid=206f1120-6852-5cf8-aec3-c9ec32a4e7d4 --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `206f1120...` |
| <!-- coderef:uuid=e267b1f6-0bbe-5f7c-a7c5-cc0227294b08 --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `e267b1f6...` |
| <!-- coderef:uuid=e079e412-a3df-5dc8-a901-305d2c7eaf65 --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `e079e412...` |
| <!-- coderef:uuid=55c0dadb-cba6-5320-af4d-4d305468e68a --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `55c0dadb...` |
| <!-- coderef:uuid=206320c1-047a-525b-96a8-3a0571b52a8e --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `206320c1...` |
| <!-- coderef:uuid=5c5f99d9-53e5-5cb6-ac11-25d4d26e9b53 --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `5c5f99d9...` |
| <!-- coderef:uuid=88074a2a-f2b8-59e6-929c-44b55248ffd9 --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `88074a2a...` |
| <!-- coderef:uuid=14badc58-2e74-534d-ad72-f0c806c19379 --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `14badc58...` |
| <!-- coderef:uuid=ca9a641d-75bf-5b65-b601-58e93789165e --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `ca9a641d...` |
| <!-- coderef:uuid=b22c2866-03a1-57ae-b7ca-888be5ce73b3 --> `ExportTable` | `src/pipeline/import-resolver.ts` | `b22c2866...` |
| <!-- coderef:uuid=e5eecf77-bf0a-5b1c-a9ae-184578d70d10 --> `LanguageExtension` | `src/pipeline/types.ts` | `e5eecf77...` |
| <!-- coderef:uuid=490c0231-78d7-57b4-9cc5-9c2abd6f4708 --> `RawExportKind` | `src/pipeline/types.ts` | `490c0231...` |
| <!-- coderef:uuid=7559f8c3-a350-56fe-8a91-42c8e8ba98a2 --> `PluginSource` | `src/plugins/types.ts` | `7559f8c3...` |
| <!-- coderef:uuid=ab06b247-c685-59a8-8808-cfba57c05cf7 --> `QueryType` | `src/query/query-executor.ts` | `ab06b247...` |
| <!-- coderef:uuid=79122ea9-a3c6-563d-8b2a-763fc49c8e7b --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `79122ea9...` |
| <!-- coderef:uuid=d07506b3-2f0e-58cf-9d2f-c97d252632ca --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `d07506b3...` |
| <!-- coderef:uuid=2f760c47-75f6-56ff-b153-231b85fdaa44 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `2f760c47...` |
| <!-- coderef:uuid=1572a98e-3324-5ebb-9b9d-d29d6f25b41c --> `LogLevel` | `src/utils/logger.ts` | `1572a98e...` |
| <!-- coderef:uuid=887b7150-d83a-5bf1-aa3f-527689f554f3 --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `887b7150...` |
| <!-- coderef:uuid=d92af92c-0b82-51fc-91c6-371431b78cb0 --> `IndexedCoderef` | `types.d.ts` | `d92af92c...` |
| <!-- coderef:uuid=e570cc82-cdae-55c7-9092-92f0a814c576 --> `DriftStatus` | `types.d.ts` | `e570cc82...` |
| <!-- coderef:uuid=511b6d3e-64af-5507-b095-510337dd3658 --> `DriftReport` | `types.d.ts` | `511b6d3e...` |
| <!-- coderef:uuid=e00a13c4-7edf-5854-9bfd-6f84f9f31af8 --> `DriftDetectionOptions` | `types.d.ts` | `e00a13c4...` |

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
