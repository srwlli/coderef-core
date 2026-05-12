# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-05-11  
**Total Exported:** 931 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **411** | 350 | 761 |
| class | **117** | 5 | 122 |
| interface | **346** | 54 | 400 |
| type | **49** | 10 | 59 |
| component | **2** | 0 | 2 |
| constant | **6** | 10 | 16 |

---

## Exported Functions (411)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=1e098487-abc4-57ff-91ae-206a39b2cc32 --> `authenticateUser` | `__tests__/.test-integration-project/src/auth.ts` | ❌ | username, password | `1e098487...` |
| <!-- coderef:uuid=1da6a6b1-9564-5ba9-ae15-a731ba10d2fc --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `1da6a6b1...` |
| <!-- coderef:uuid=40ea77e1-eddc-56a0-bf6b-09679fb0e09d --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `40ea77e1...` |
| <!-- coderef:uuid=f8825260-7b2d-5069-b258-6d2012c622c0 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `f8825260...` |
| <!-- coderef:uuid=46759637-9963-530f-b882-7956707e88e2 --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `46759637...` |
| <!-- coderef:uuid=6ee0ce8b-b1bc-514a-a1a1-d54e5059bbd1 --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `6ee0ce8b...` |
| <!-- coderef:uuid=de1f04a9-4f0c-5a74-98b1-bdbab35524f5 --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `de1f04a9...` |
| <!-- coderef:uuid=975f6af3-c4b6-5681-8291-c9c202427c7f --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `975f6af3...` |
| <!-- coderef:uuid=3a490ef9-308f-56c4-b5cb-48c49a93c15e --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `3a490ef9...` |
| <!-- coderef:uuid=1c53fab0-156b-50f0-a4aa-4dd515f33844 --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `1c53fab0...` |
| <!-- coderef:uuid=f4db23be-26dd-5fb5-bf8d-82f46f2afe8a --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `f4db23be...` |
| <!-- coderef:uuid=174921c1-161e-5bf9-bdc6-21ecdff536f7 --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `174921c1...` |
| <!-- coderef:uuid=65af4473-39e4-5a69-beb4-cf8820319c6e --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `65af4473...` |
| <!-- coderef:uuid=bc9a45c8-97b3-5b9b-8903-1c9da6e22208 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `bc9a45c8...` |
| <!-- coderef:uuid=8a143a6e-6f5d-517c-8f60-0ad793a85c89 --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `8a143a6e...` |
| <!-- coderef:uuid=9a5053b4-26fd-508b-b491-a8dc305dac72 --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `9a5053b4...` |
| <!-- coderef:uuid=89def8f1-cadf-5189-b094-aaa65535a54a --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `89def8f1...` |
| <!-- coderef:uuid=af620739-f943-514e-accc-a816f16a90be --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `af620739...` |
| <!-- coderef:uuid=d1561aad-4651-509f-a770-062a611e58ff --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `d1561aad...` |
| <!-- coderef:uuid=204bf501-660f-5945-8111-823b13fc4f3a --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `204bf501...` |
| <!-- coderef:uuid=12f5e853-7a82-5362-8e45-af0e81c50fe6 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `12f5e853...` |
| <!-- coderef:uuid=f0345fc4-bb62-5f49-bb2b-e1c15ca865fc --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `f0345fc4...` |
| <!-- coderef:uuid=c35da75c-f0bc-55d2-a440-6eaa47f7c7c8 --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `c35da75c...` |
| <!-- coderef:uuid=5c4e2254-999a-52ed-bce0-88287541244c --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `5c4e2254...` |
| <!-- coderef:uuid=a04c1899-d283-5fb7-9d1f-b6541ad315a5 --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `a04c1899...` |
| <!-- coderef:uuid=78716e94-fb11-56bb-b785-5d530ff67489 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `78716e94...` |
| <!-- coderef:uuid=5f8ad8f4-34ea-5c8b-80f6-f53c7f5c6078 --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `5f8ad8f4...` |
| <!-- coderef:uuid=8bef2254-3fd7-5af7-837f-2309d52d322d --> `main` | `autoresearch/scanner-quality/01-element-classification/apply_iteration_5.py` | ❌ |  | `8bef2254...` |
| <!-- coderef:uuid=7a72431a-b610-5c94-9ec6-c67b11ea1229 --> `main` | `autoresearch/scanner-quality/03-test-coverage-linkage/apply_iteration_1.py` | ❌ |  | `7a72431a...` |
| <!-- coderef:uuid=7b377723-5679-5e25-b8aa-16f27f0e30fa --> `main` | `autoresearch/scanner-quality/04-async-pattern-detection/apply_iteration_1.py` | ❌ |  | `7b377723...` |
| <!-- coderef:uuid=b49758b6-1209-52f0-8ecd-f76eca17e045 --> `main` | `autoresearch/scanner-quality/05-context-summary-signal/apply_iteration_1.py` | ❌ |  | `b49758b6...` |
| <!-- coderef:uuid=57addad3-898c-55b4-8c7f-e39068e9e980 --> `main` | `autoresearch/scanner-quality/06-test-gap-precision/apply_iteration_1.py` | ❌ |  | `57addad3...` |
| <!-- coderef:uuid=c08869e6-da17-57cc-aaa0-412fa871bde8 --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `c08869e6...` |
| <!-- coderef:uuid=d2b36986-5c32-5fa1-8aa9-5100ace782e9 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `d2b36986...` |
| <!-- coderef:uuid=78a829b1-39bf-53ff-88a2-d3000bc5c7d9 --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `78a829b1...` |
| <!-- coderef:uuid=3aa8100c-6e1f-55e1-9394-3fd7350c47be --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `3aa8100c...` |
| <!-- coderef:uuid=1eb095af-42a0-5da0-af65-5197bc0959d2 --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `1eb095af...` |
| <!-- coderef:uuid=f2a0d794-0a14-51c3-af6f-f52f26685a86 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `f2a0d794...` |
| <!-- coderef:uuid=f360d8fc-d1a1-59e4-a13f-e71fb0dc61ee --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `f360d8fc...` |
| <!-- coderef:uuid=8cdc444c-6d88-5bd6-a67b-dc7254a14d33 --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `8cdc444c...` |
| <!-- coderef:uuid=b2be13ea-292c-55d8-9285-1e429775b6a3 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `b2be13ea...` |
| <!-- coderef:uuid=3de2c089-8e8a-5a03-8b5e-dd061809d78b --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `3de2c089...` |
| <!-- coderef:uuid=f47e7dcc-7582-5a95-ba5b-d1a110fe4079 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `f47e7dcc...` |
| <!-- coderef:uuid=95735feb-f4cc-5b94-8da9-f71365477ff2 --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `95735feb...` |
| <!-- coderef:uuid=67061067-c4d6-5cb8-8d8a-89d25d808387 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `67061067...` |
| <!-- coderef:uuid=ac46faf4-afa9-5af1-ab16-8381ded0fbc0 --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `ac46faf4...` |
| <!-- coderef:uuid=9716b53a-24fd-5a32-be48-3b08eefccce7 --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `9716b53a...` |
| <!-- coderef:uuid=49bd4efa-7a7c-5b0f-b132-91022e062385 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `49bd4efa...` |
| <!-- coderef:uuid=da42fbdb-e7e2-554d-a6d5-833fc104c33f --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `da42fbdb...` |
| <!-- coderef:uuid=e8d1cb70-b142-5bfa-87f9-23bf28678d59 --> `detect_duplicate_pairs` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `e8d1cb70...` |

*... and 361 more functions. See index.json for complete list.*

---

## Exported Classes (117)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=ff682489-935f-5cbf-8eac-ec8071c35382 --> `AuthService` | `__tests__/.test-integration-project/src/auth.ts` | `ff682489...` |
| <!-- coderef:uuid=19e66eee-010a-5147-90a5-7b25c5901be2 --> `UserService` | `__tests__/.test-integration-project/src/user.ts` | `19e66eee...` |
| <!-- coderef:uuid=629e6022-68fb-53c6-beb3-835cad091a8b --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `629e6022...` |
| <!-- coderef:uuid=00d956a2-f54f-5646-aaad-3a0e8a13713f --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `00d956a2...` |
| <!-- coderef:uuid=706c0365-b04a-5b41-8b6f-d5ecbec8abe3 --> `CallDetector` | `src/analyzer/call-detector.ts` | `706c0365...` |
| <!-- coderef:uuid=2583e9e1-ab92-53bb-8c4c-98776bf38d9f --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `2583e9e1...` |
| <!-- coderef:uuid=6e219724-b11c-5699-847c-9ab514bcdb97 --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `6e219724...` |
| <!-- coderef:uuid=e8ee0115-0656-5a66-b116-647084ca1096 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `e8ee0115...` |
| <!-- coderef:uuid=0829ef75-87eb-5e67-92e1-ec6e0b3b239e --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `0829ef75...` |
| <!-- coderef:uuid=11d41624-e80c-53b3-99c9-01663c77698d --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `11d41624...` |
| <!-- coderef:uuid=f7886285-8124-5477-874c-e42d843bc8fd --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `f7886285...` |
| <!-- coderef:uuid=881aa956-7c49-5778-b59a-659ec3ed8a84 --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `881aa956...` |
| <!-- coderef:uuid=89bbd29f-59d6-5ca2-a5f7-ad7fabdf11ab --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `89bbd29f...` |
| <!-- coderef:uuid=80b1c7e7-6490-50e0-bc94-9b3a287178fd --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `80b1c7e7...` |
| <!-- coderef:uuid=b5add92e-4134-52f7-a3e9-439342d38238 --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `b5add92e...` |
| <!-- coderef:uuid=d2ff9ecb-46d6-5a6a-ad86-b777252f0fc4 --> `GraphError` | `src/analyzer/graph-error.ts` | `d2ff9ecb...` |
| <!-- coderef:uuid=ccccb636-87d6-5a71-a181-b390c12a963f --> `ImportParser` | `src/analyzer/import-parser.ts` | `ccccb636...` |
| <!-- coderef:uuid=7c2ceac6-25ae-5f85-a040-4a262dce14ac --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `7c2ceac6...` |
| <!-- coderef:uuid=a2eaa684-1fa5-5b4a-897e-db14542725d6 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `a2eaa684...` |
| <!-- coderef:uuid=630b55f5-7244-59b4-a922-da479358aa0d --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `630b55f5...` |
| <!-- coderef:uuid=75be4a32-4713-5593-a456-83979e307337 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `75be4a32...` |
| <!-- coderef:uuid=d67f9853-1b2e-56dc-8227-9f3e960e60ed --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `d67f9853...` |
| <!-- coderef:uuid=f02ecd44-7b6e-55ba-b80d-10dbdf428004 --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `f02ecd44...` |
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
| <!-- coderef:uuid=55a14db6-87b5-56e9-b4a5-505bfef7df16 --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `55a14db6...` |
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
| <!-- coderef:uuid=b1b11583-d732-5480-bccf-8e762d403ad7 --> `QueryExecutor` | `src/query/query-executor.ts` | `b1b11583...` |
| <!-- coderef:uuid=4f0cc3a5-0817-5abc-b762-d75aef5d2169 --> `EntityRegistry` | `src/registry/entity-registry.ts` | `4f0cc3a5...` |
| <!-- coderef:uuid=207ec4bb-dfae-57dd-bcee-f80232564e74 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `207ec4bb...` |
| <!-- coderef:uuid=2202212e-02f0-5a08-a53b-61b7bbed77c2 --> `LRUCache` | `src/scanner/lru-cache.ts` | `2202212e...` |
| <!-- coderef:uuid=bbe9c944-5909-5413-afdd-0afed368baef --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `bbe9c944...` |
| <!-- coderef:uuid=3e6bf00e-161b-5986-97b5-512cd04f9add --> `SearchIndex` | `src/search/search-engine.ts` | `3e6bf00e...` |
| <!-- coderef:uuid=fa258119-684a-558a-8744-8ec3f92f02a3 --> `SearchEngine` | `src/search/search-engine.ts` | `fa258119...` |
| <!-- coderef:uuid=eb180ed1-3737-5532-be3d-37c378cfa25d --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `eb180ed1...` |
| <!-- coderef:uuid=bea64818-c246-547b-b76d-146737ac899f --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `bea64818...` |
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
| <!-- coderef:uuid=3da9c012-6c9d-5327-b67d-41373301c242 --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `3da9c012...` |
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
| <!-- coderef:uuid=c1f86a5b-7e3d-5313-bab0-0a399faf203d --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `c1f86a5b...` |
| <!-- coderef:uuid=70438312-5ee4-57e5-ba6d-2f79a106bc65 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `70438312...` |
| <!-- coderef:uuid=f5a316d2-914a-5a59-ae69-f34144df1193 --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `f5a316d2...` |
| <!-- coderef:uuid=4661ccf3-4415-5bc0-a3b2-e79111a667fe --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `4661ccf3...` |
| <!-- coderef:uuid=19ce308b-6add-5b97-b631-d9920546c955 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `19ce308b...` |
| <!-- coderef:uuid=d2e34c81-17ca-5ef1-b3d9-aabd9dd85d43 --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `d2e34c81...` |
| <!-- coderef:uuid=8238803a-0aef-5323-b9ef-70cf1d351155 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `8238803a...` |
| <!-- coderef:uuid=9c79192b-b644-5aba-8bfd-4b87bea026c5 --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `9c79192b...` |
| <!-- coderef:uuid=057b67e7-17f4-5e2d-87f3-0ccad3c2db13 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `057b67e7...` |
| <!-- coderef:uuid=27471f7c-544f-5402-8168-d4da1cddc17a --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `27471f7c...` |
| <!-- coderef:uuid=223cf788-b99e-55ed-b83d-a79c66e297ff --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `223cf788...` |
| <!-- coderef:uuid=6e79ff76-d1a0-5cf1-b226-2c47b1d6b443 --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `6e79ff76...` |
| <!-- coderef:uuid=1f30db4f-cd9f-5ea8-8f6c-bd2b89c7d326 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `1f30db4f...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (49)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=b1ac81c6-d334-54a5-b506-5da173577b3f --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `b1ac81c6...` |
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
| <!-- coderef:uuid=da4d04ea-6ea1-50ad-82c1-2c1470461899 --> `QueryType` | `src/query/query-executor.ts` | `da4d04ea...` |
| <!-- coderef:uuid=79122ea9-a3c6-563d-8b2a-763fc49c8e7b --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `79122ea9...` |
| <!-- coderef:uuid=d07506b3-2f0e-58cf-9d2f-c97d252632ca --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `d07506b3...` |
| <!-- coderef:uuid=2f760c47-75f6-56ff-b153-231b85fdaa44 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `2f760c47...` |
| <!-- coderef:uuid=1572a98e-3324-5ebb-9b9d-d29d6f25b41c --> `LogLevel` | `src/utils/logger.ts` | `1572a98e...` |
| <!-- coderef:uuid=887b7150-d83a-5bf1-aa3f-527689f554f3 --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `887b7150...` |
| <!-- coderef:uuid=ffadeb78-3659-583f-95da-b7215720086a --> `IndexedCoderef` | `types.d.ts` | `ffadeb78...` |
| <!-- coderef:uuid=2405beb8-8728-526f-8c04-d39d392e405a --> `DriftStatus` | `types.d.ts` | `2405beb8...` |
| <!-- coderef:uuid=46729ba1-67b0-5d8f-8291-59de8c03dc1c --> `DriftReport` | `types.d.ts` | `46729ba1...` |
| <!-- coderef:uuid=3f3cd943-b77d-597c-adff-7c623fd63310 --> `DriftDetectionOptions` | `types.d.ts` | `3f3cd943...` |

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
