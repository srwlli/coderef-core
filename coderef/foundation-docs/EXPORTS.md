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
| function | **404** | 397 | 801 |
| interface | **346** | 65 | 411 |
| type | **49** | 11 | 60 |
| component | **2** | 0 | 2 |
| class | **115** | 5 | 120 |
| constant | **6** | 12 | 18 |

---

## Exported Functions (404)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=d0296513-b642-5551-9051-3773b01dde18 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `d0296513...` |
| <!-- coderef:uuid=5c4480e3-2ec0-5790-9690-b075a3c7f307 --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `5c4480e3...` |
| <!-- coderef:uuid=a3da8588-5fdb-5af1-a012-9b50107b900a --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `a3da8588...` |
| <!-- coderef:uuid=7b7f28fe-4b4b-573a-9371-dde7c7a2810c --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `7b7f28fe...` |
| <!-- coderef:uuid=6df9f234-2b3e-5e46-aec0-bd3aa235f8c5 --> `log` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `6df9f234...` |
| <!-- coderef:uuid=71ded44c-b93a-5bde-b0f6-7460b20d4121 --> `count_async_functions` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `71ded44c...` |
| <!-- coderef:uuid=0ab8090b-0322-52f0-95fa-1f70582398c7 --> `count_workorders_with_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `0ab8090b...` |
| <!-- coderef:uuid=7361fcf4-2d4a-5eaf-a732-fe69c718d5fc --> `calculate_async_recall` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `7361fcf4...` |
| <!-- coderef:uuid=54215e70-f1b9-5abd-b197-fa6273abf661 --> `calculate_async_awareness` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `54215e70...` |
| <!-- coderef:uuid=ffaa6a08-469f-50cc-91d8-6495982a63fd --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `ffaa6a08...` |
| <!-- coderef:uuid=72c2d161-fa2d-5e3d-80f1-121083a14138 --> `main` | `autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py` | ❌ |  | `72c2d161...` |
| <!-- coderef:uuid=e7bcd1ba-777b-5a80-a753-32d1be3a7571 --> `log` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `e7bcd1ba...` |
| <!-- coderef:uuid=810df45e-59ed-521d-8476-1ccbc6ba1520 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `810df45e...` |
| <!-- coderef:uuid=e5360dc4-c007-565f-95f8-c9d196bfe674 --> `scan_and_get_detected_critical_functions` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `e5360dc4...` |
| <!-- coderef:uuid=395892cc-79f5-5795-ba6c-17fbba7da1e7 --> `calculate_detection_accuracy` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `395892cc...` |
| <!-- coderef:uuid=3b1fff79-1700-544e-8674-8bae8126af8f --> `analyze_workorder_utilization` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `3b1fff79...` |
| <!-- coderef:uuid=7e6b5b8f-9321-5604-8b0c-a7a0772e0502 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `7e6b5b8f...` |
| <!-- coderef:uuid=b4fc3c97-6806-52dc-92d1-f11c7942da00 --> `main` | `autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py` | ❌ |  | `b4fc3c97...` |
| <!-- coderef:uuid=cd9760ed-43d0-5e32-816e-e4ec001fe4d6 --> `log` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `cd9760ed...` |
| <!-- coderef:uuid=f8fa6f17-d7bf-5239-b1b4-87a977b350a0 --> `load_ground_truth` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `f8fa6f17...` |
| <!-- coderef:uuid=486bd5eb-5f8e-59e9-9591-604e7ef1560f --> `load_detected_test_gaps` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `486bd5eb...` |
| <!-- coderef:uuid=e33140d4-c5af-53cb-8e9f-6993d4515a2e --> `calculate_precision` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `e33140d4...` |
| <!-- coderef:uuid=31aaf7f8-d5aa-5782-90d8-6fd81b383c24 --> `check_test_existence` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `31aaf7f8...` |
| <!-- coderef:uuid=97454601-689e-5c0a-8f46-c1d419f63547 --> `calculate_closure_rate` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `97454601...` |
| <!-- coderef:uuid=6581618f-daac-5164-9c5c-42c0b88a4f02 --> `calculate_pipeline_score` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `6581618f...` |
| <!-- coderef:uuid=3a1515ac-771d-56bf-99e7-25c5b189ec7a --> `main` | `autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py` | ❌ |  | `3a1515ac...` |
| <!-- coderef:uuid=2dcbb155-b0d9-5bc4-b80f-f0476fd6a760 --> `log` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `2dcbb155...` |
| <!-- coderef:uuid=b5a43c0e-8d4e-5ee4-a65b-10865186c3dd --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `b5a43c0e...` |
| <!-- coderef:uuid=eed93e6f-396e-508c-b1bc-f45c0346eb8b --> `load_patterns` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `eed93e6f...` |
| <!-- coderef:uuid=f890a773-7c6c-53c6-8a3a-57ee81c25c69 --> `build_known_async_functions` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `f890a773...` |
| <!-- coderef:uuid=6fc45c86-e4de-579b-a93b-3f0bd753f8ff --> `check_async_detection` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `6fc45c86...` |
| <!-- coderef:uuid=ef1ac3bf-a14d-5eb7-a8db-180b65141f00 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `ef1ac3bf...` |
| <!-- coderef:uuid=f0bf7495-e1f1-5ea6-a9fe-202b8d3d0a0f --> `main` | `autoresearch/scanner-quality/scripts/verify_async_patterns.py` | ❌ |  | `f0bf7495...` |
| <!-- coderef:uuid=5fa901f9-50f6-5fd9-888e-051718305942 --> `log` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `5fa901f9...` |
| <!-- coderef:uuid=b177ffe7-9ea2-5924-b810-9c2fede6b913 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `b177ffe7...` |
| <!-- coderef:uuid=aadffa74-02bf-5dff-b917-8ee2bea72ad7 --> `load_context_md` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `aadffa74...` |
| <!-- coderef:uuid=1d1fdfb8-b232-5cb2-a036-dccaa3446079 --> `extract_critical_functions` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `1d1fdfb8...` |
| <!-- coderef:uuid=eb4a1836-5e6e-5ab7-9e9c-bc149db03544 --> `check_test_contamination` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `eb4a1836...` |
| <!-- coderef:uuid=2fb620e7-b7d8-5e9d-8570-ca60456834a9 --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `2fb620e7...` |
| <!-- coderef:uuid=50998c33-bfc3-5c77-868e-2b2d03493e4e --> `main` | `autoresearch/scanner-quality/scripts/verify_context_signal.py` | ❌ |  | `50998c33...` |
| <!-- coderef:uuid=0f2076c2-091c-524f-94df-2b0a2a4f46b7 --> `log` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `0f2076c2...` |
| <!-- coderef:uuid=31e072bf-cc11-5233-b75f-b4874e7b6082 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `31e072bf...` |
| <!-- coderef:uuid=0107ac19-93c3-5533-8dd5-2b54c6e6374d --> `load_index` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `0107ac19...` |
| <!-- coderef:uuid=2ca34045-6a82-5cdd-85e3-ea7a19d8a4de --> `detect_duplicate_pairs` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `2ca34045...` |
| <!-- coderef:uuid=94a1c380-40f6-5d78-9244-8f4c666cccdd --> `calculate_score` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `94a1c380...` |
| <!-- coderef:uuid=5c7ae061-1a59-5c76-b3b2-14f2b318996d --> `main` | `autoresearch/scanner-quality/scripts/verify_element_classification.py` | ❌ |  | `5c7ae061...` |
| <!-- coderef:uuid=751f50a5-ae65-5293-8d2c-8a08d049cd2c --> `log` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `751f50a5...` |
| <!-- coderef:uuid=d90225c5-c8d4-5df9-92bb-8cd0b5304d76 --> `rescan_corpus` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `d90225c5...` |
| <!-- coderef:uuid=430f6752-e671-540e-ade0-851da181da2b --> `load_index` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `430f6752...` |
| <!-- coderef:uuid=7680b2d8-aa4d-553e-8a4c-cd02ad46e101 --> `check_export_precision` | `autoresearch/scanner-quality/scripts/verify_export_relationships.py` | ❌ |  | `7680b2d8...` |

*... and 354 more functions. See index.json for complete list.*

---

## Exported Classes (115)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=a555f7ff-71f3-5e13-8bae-b9a3d34df426 --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `a555f7ff...` |
| <!-- coderef:uuid=45e2a854-6136-546a-b0a5-d67e68ebc0b6 --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `45e2a854...` |
| <!-- coderef:uuid=01dfba7a-96d1-53e3-b4ca-241b348258f5 --> `CallDetector` | `src/analyzer/call-detector.ts` | `01dfba7a...` |
| <!-- coderef:uuid=1af392e5-1557-56a7-9a4b-66206579b15f --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `1af392e5...` |
| <!-- coderef:uuid=602da8b1-9127-5b7f-89eb-eee9849cb423 --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `602da8b1...` |
| <!-- coderef:uuid=b394cba9-f5f8-5260-8aa3-62f156eb2e3c --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `b394cba9...` |
| <!-- coderef:uuid=87e16a18-e399-505d-9f39-3847bfcffbee --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `87e16a18...` |
| <!-- coderef:uuid=f2b0b796-ec23-5bef-9f1f-2561f3cf27b9 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `f2b0b796...` |
| <!-- coderef:uuid=5f485562-a226-56b3-accc-bc09df12111f --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `5f485562...` |
| <!-- coderef:uuid=129ec85d-a33c-5717-83aa-c0c861cf197d --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `129ec85d...` |
| <!-- coderef:uuid=9f330f4c-c80f-5eae-8f6b-f3130a334286 --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `9f330f4c...` |
| <!-- coderef:uuid=299cb317-3c77-57f1-9e62-aaddb5d7095f --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `299cb317...` |
| <!-- coderef:uuid=6a4473f8-2000-55a9-b39e-906c05f77f9a --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `6a4473f8...` |
| <!-- coderef:uuid=bab71bd6-0d83-56b1-872d-24434b48ef79 --> `GraphError` | `src/analyzer/graph-error.ts` | `bab71bd6...` |
| <!-- coderef:uuid=33803ccf-d786-5984-b3e2-e1f81daef2d4 --> `ImportParser` | `src/analyzer/import-parser.ts` | `33803ccf...` |
| <!-- coderef:uuid=a5ada611-b2a4-5e40-837b-fd929e3397d6 --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `a5ada611...` |
| <!-- coderef:uuid=3e093721-7ea8-557c-ac95-157b670427a5 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `3e093721...` |
| <!-- coderef:uuid=d4b6c872-184d-5b46-861c-f3cb636bee08 --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `d4b6c872...` |
| <!-- coderef:uuid=64b4494d-b7f3-5107-9dd3-f4ab2e58d9b2 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `64b4494d...` |
| <!-- coderef:uuid=ec5969db-fef7-54ab-9c63-bd7e5a812801 --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `ec5969db...` |
| <!-- coderef:uuid=9be09843-f4d5-5569-ae58-116a6b01697a --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `9be09843...` |
| <!-- coderef:uuid=fb61757c-57a7-5cfd-8d74-131b48577514 --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `fb61757c...` |
| <!-- coderef:uuid=ca5bf70f-d8ed-5fad-9ba4-0ae9afe0d466 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `ca5bf70f...` |
| <!-- coderef:uuid=852bbcd6-0e34-5d04-b62f-04e2cf261b33 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `852bbcd6...` |
| <!-- coderef:uuid=26125871-1b84-5260-a729-3b871b80dff6 --> `ContextGenerator` | `src/context/context-generator.ts` | `26125871...` |
| <!-- coderef:uuid=9340ded3-7b59-5a65-bc55-a69ce344bca7 --> `ContextTracker` | `src/context/context-tracker.ts` | `9340ded3...` |
| <!-- coderef:uuid=5f0137d8-c676-5355-827a-65ccd500f046 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `5f0137d8...` |
| <!-- coderef:uuid=d5fbb1a5-a646-55c6-b3ec-c53789a7ce7d --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `d5fbb1a5...` |
| <!-- coderef:uuid=af0b6818-b17b-5a51-a9be-0ec131927d7b --> `ExampleExtractor` | `src/context/example-extractor.ts` | `af0b6818...` |
| <!-- coderef:uuid=3b27c41d-debf-50a2-9476-ed5f36eb9af2 --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `3b27c41d...` |
| <!-- coderef:uuid=9b8f88d3-1dd3-5ba7-afaf-a3ff7cdab7a3 --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `9b8f88d3...` |
| <!-- coderef:uuid=4758f4f5-a767-5cf4-9e05-5f13c3aa7e77 --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `4758f4f5...` |
| <!-- coderef:uuid=19f055c5-45ae-56f4-b35e-1e941446ede1 --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `19f055c5...` |
| <!-- coderef:uuid=274c91d6-0e44-5f13-abbe-3722b0585e21 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `274c91d6...` |
| <!-- coderef:uuid=b69f0924-3596-5a0f-a06d-e3045cb9480c --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `b69f0924...` |
| <!-- coderef:uuid=90a5eab4-e58c-5677-9d17-d3a14583173c --> `CodeRefError` | `src/errors/CodeRefError.ts` | `90a5eab4...` |
| <!-- coderef:uuid=a2e5fe49-e756-5a21-b543-84fa4f21bcf8 --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `a2e5fe49...` |
| <!-- coderef:uuid=245e9133-1eb5-54e2-acba-39958cdc3bf5 --> `IndexError` | `src/errors/IndexError.ts` | `245e9133...` |
| <!-- coderef:uuid=97d15fae-fd61-5bf2-bc82-5172525879f2 --> `ParseError` | `src/errors/ParseError.ts` | `97d15fae...` |
| <!-- coderef:uuid=bb75af11-0753-51eb-bf4e-868aebc1a56b --> `ScanError` | `src/errors/ScanError.ts` | `bb75af11...` |
| <!-- coderef:uuid=8aeb8424-1284-5c56-a538-76fb57246cfb --> `ValidationError` | `src/errors/ValidationError.ts` | `8aeb8424...` |
| <!-- coderef:uuid=11d9754e-981b-56d6-984b-17a3526aed00 --> `GraphExporter` | `src/export/graph-exporter.ts` | `11d9754e...` |
| <!-- coderef:uuid=ed95bd90-cfac-5e01-a109-4ad7cfdf2740 --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `ed95bd90...` |
| <!-- coderef:uuid=9a281301-dfdf-5f0a-9410-572006bf0990 --> `IndexStore` | `src/indexer/index-store.ts` | `9a281301...` |
| <!-- coderef:uuid=ce5eedcd-c96c-5e07-9bfc-4f6359723ce6 --> `IndexerService` | `src/indexer/indexer-service.ts` | `ce5eedcd...` |
| <!-- coderef:uuid=6a695e21-cc86-5f73-81dc-40b5fdfe98bc --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `6a695e21...` |
| <!-- coderef:uuid=8e43ba2b-6766-5c8e-ab0c-8b855eacd3f4 --> `QueryEngine` | `src/indexer/query-engine.ts` | `8e43ba2b...` |
| <!-- coderef:uuid=b37dd9bf-e3bb-51d2-bc0a-344b38044d2d --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `b37dd9bf...` |
| <!-- coderef:uuid=0f515d04-bc9e-5c3f-8039-96b887b34536 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `0f515d04...` |
| <!-- coderef:uuid=54c65300-8613-5d17-9803-29ff2471135e --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `54c65300...` |
| <!-- coderef:uuid=19c6bebc-7ec3-5527-970c-a72a50f506bc --> `LLMError` | `src/integration/llm/llm-provider.ts` | `19c6bebc...` |
| <!-- coderef:uuid=6845de19-92a6-555e-9351-fc9946e9598f --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `6845de19...` |
| <!-- coderef:uuid=955ce44c-60c9-59fb-a215-650b3dcc338e --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `955ce44c...` |
| <!-- coderef:uuid=c24caae8-af6c-5c55-b046-163f4a9c8b88 --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `c24caae8...` |
| <!-- coderef:uuid=71efaef4-9a4f-512e-aa24-867742ba684f --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `71efaef4...` |
| <!-- coderef:uuid=076bf2fe-a1b6-5d49-a474-dd5d32410d93 --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `076bf2fe...` |
| <!-- coderef:uuid=157d6987-29a5-5c08-b6a0-14bb9eaa030e --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `157d6987...` |
| <!-- coderef:uuid=55daa87d-24f2-5273-b42b-b4c0eed37e93 --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `55daa87d...` |
| <!-- coderef:uuid=9a6050d7-7b32-5032-9e22-9c9f6a6e06c3 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `9a6050d7...` |
| <!-- coderef:uuid=3da8477e-540a-5387-a394-94fa76e4606b --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `3da8477e...` |
| <!-- coderef:uuid=4b52ec42-378b-5299-9085-bd663d6dab8a --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `4b52ec42...` |
| <!-- coderef:uuid=c716ce34-a7c3-5187-9591-347205e7a5de --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `c716ce34...` |
| <!-- coderef:uuid=d16963e0-6b16-508d-97c8-be24276ab7be --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `d16963e0...` |
| <!-- coderef:uuid=63f908e0-9d6e-57e5-a5f5-8fc6e725aa6d --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `63f908e0...` |
| <!-- coderef:uuid=5c591914-22a5-5853-bbab-04b9a6cef542 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `5c591914...` |
| <!-- coderef:uuid=ed8dbbbc-3d1d-5820-88f4-5e1781c0ca58 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `ed8dbbbc...` |
| <!-- coderef:uuid=8cd37acc-8325-5b6d-b32b-cd7c7a2cf0cc --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `8cd37acc...` |
| <!-- coderef:uuid=6bd73201-45cc-52f4-8932-17c461d6e64a --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `6bd73201...` |
| <!-- coderef:uuid=9b957957-5197-5c00-acdf-6c58696bbfb1 --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `9b957957...` |
| <!-- coderef:uuid=3c6ad3c0-7717-59c9-9491-67cd93fe5e66 --> `ConfigError` | `src/integration/rag/rag-config.ts` | `3c6ad3c0...` |
| <!-- coderef:uuid=715d0db7-a053-5585-ae71-08d438a86b67 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `715d0db7...` |
| <!-- coderef:uuid=864647c7-0276-5da8-b28a-f9e4df608325 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `864647c7...` |
| <!-- coderef:uuid=9e206ee4-1a06-534c-aedb-e313385b1184 --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `9e206ee4...` |
| <!-- coderef:uuid=5d7a21c9-eca9-5a5b-8a48-a5747d94db67 --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `5d7a21c9...` |
| <!-- coderef:uuid=10a32399-448c-52b3-9423-c62e31c2e5fb --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `10a32399...` |
| <!-- coderef:uuid=651c7379-405d-54da-ac55-3d29a64982ed --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `651c7379...` |
| <!-- coderef:uuid=2768bada-2329-5faf-8866-d65cab4b1805 --> `CodeRefParser` | `src/parser/parser.ts` | `2768bada...` |
| <!-- coderef:uuid=63035eb2-30ed-5cc2-bc02-2b853d452de5 --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `63035eb2...` |
| <!-- coderef:uuid=ccf3e600-db3d-5f5f-8e3a-750c32ef7447 --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `ccf3e600...` |
| <!-- coderef:uuid=cf4af8a9-9c2a-5236-b7b3-46a3c6d5878d --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `cf4af8a9...` |
| <!-- coderef:uuid=e96ff75e-c42f-5a80-919c-b9338bab2de4 --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `e96ff75e...` |
| <!-- coderef:uuid=c0357a80-d09f-5bda-8430-e6409b970c24 --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `c0357a80...` |
| <!-- coderef:uuid=7cc586e3-461c-5ac6-931c-b3634a0eeaa1 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `7cc586e3...` |
| <!-- coderef:uuid=2124da2f-a747-59bb-8979-f3d3145c2a9c --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `2124da2f...` |
| <!-- coderef:uuid=3de1fa18-b7a6-5c51-a028-8906b77abce0 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `3de1fa18...` |
| <!-- coderef:uuid=d4641b81-8af7-5a90-9b20-9b645d63d4d0 --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `d4641b81...` |
| <!-- coderef:uuid=a4d08c08-590a-5ca9-9d08-d538c262c386 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `a4d08c08...` |
| <!-- coderef:uuid=71ad752f-22b6-5c88-8f61-30441f62196e --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `71ad752f...` |
| <!-- coderef:uuid=1a18af01-1a80-5351-a3d6-028c0fd2d691 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `1a18af01...` |
| <!-- coderef:uuid=1dc7b6af-2788-5431-ae4e-4acf81a11325 --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `1dc7b6af...` |
| <!-- coderef:uuid=93273211-c91e-5429-8a14-aca72b5a4648 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `93273211...` |
| <!-- coderef:uuid=a7cb62a2-3276-5d5b-abe0-45575ad9b280 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `a7cb62a2...` |
| <!-- coderef:uuid=794ee691-7cde-5c49-a81d-223fbfad03aa --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `794ee691...` |
| <!-- coderef:uuid=00955f92-53c0-568a-990e-0f2f9e4d9c86 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `00955f92...` |
| <!-- coderef:uuid=839edd20-c0b7-5822-99e1-63262945badc --> `PluginError` | `src/plugins/plugin-registry.ts` | `839edd20...` |
| <!-- coderef:uuid=6a5674d2-5586-58a2-99a3-6aea1c11a553 --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `6a5674d2...` |
| <!-- coderef:uuid=68f5d3c4-3bae-5989-8121-90b4c12ac309 --> `QueryExecutor` | `src/query/query-executor.ts` | `68f5d3c4...` |
| <!-- coderef:uuid=90a1147a-45ed-5629-93a3-74e9f78b160b --> `EntityRegistry` | `src/registry/entity-registry.ts` | `90a1147a...` |
| <!-- coderef:uuid=8bb0ed5e-5555-561c-9a09-f2be340cd9c1 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `8bb0ed5e...` |
| <!-- coderef:uuid=ba9ebb13-aa0c-54e8-ad60-b4b30f82ee04 --> `LRUCache` | `src/scanner/lru-cache.ts` | `ba9ebb13...` |
| <!-- coderef:uuid=4351adaa-f628-55a2-9d96-885435e7717d --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `4351adaa...` |
| <!-- coderef:uuid=2a0a3300-f5a7-5510-8112-aa32eaebeb2b --> `SearchIndex` | `src/search/search-engine.ts` | `2a0a3300...` |
| <!-- coderef:uuid=467114bc-3614-5cd7-93e8-ee262b3d871f --> `SearchEngine` | `src/search/search-engine.ts` | `467114bc...` |
| <!-- coderef:uuid=a504e9c4-e93f-536b-97d6-66ae7cd91427 --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `a504e9c4...` |
| <!-- coderef:uuid=e780c22e-5109-5fcf-83c9-875ee3f1cdb2 --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `e780c22e...` |
| <!-- coderef:uuid=87dd40d7-8c90-5b3c-95bc-4b996a7ae671 --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `87dd40d7...` |
| <!-- coderef:uuid=b2011e61-daed-5a10-821d-1ac6ae194586 --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `b2011e61...` |
| <!-- coderef:uuid=73201c95-26a3-52c2-a97b-8506c968efef --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `73201c95...` |
| <!-- coderef:uuid=f299301c-802c-561c-9f2e-aabb82585b55 --> `OpenAI` | `src/types/external-modules.d.ts` | `f299301c...` |
| <!-- coderef:uuid=2640ad29-5280-52d7-8b47-4ee68f3ae607 --> `Anthropic` | `src/types/external-modules.d.ts` | `2640ad29...` |
| <!-- coderef:uuid=e803e5e1-6471-52ec-9b16-a293963c462b --> `ChromaClient` | `src/types/external-modules.d.ts` | `e803e5e1...` |
| <!-- coderef:uuid=302daefd-a2bf-56c0-aa64-694abb505b7c --> `Collection` | `src/types/external-modules.d.ts` | `302daefd...` |
| <!-- coderef:uuid=1446786e-bc1b-5fc1-a4cb-562cd089d872 --> `Pinecone` | `src/types/external-modules.d.ts` | `1446786e...` |
| <!-- coderef:uuid=4557e3df-d124-56f9-8e5f-973d42fe6eac --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `4557e3df...` |
| <!-- coderef:uuid=e563dfd1-430f-5f38-ba18-5a808dd7f1b3 --> `CodeRefValidator` | `src/validator/validator.ts` | `e563dfd1...` |

---

## Exported Interfaces (346)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=6595fbfd-db4f-593a-9344-6144102a4fcf --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `6595fbfd...` |
| <!-- coderef:uuid=68c30cc7-5044-549d-a7f6-2678b8e9ee66 --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `68c30cc7...` |
| <!-- coderef:uuid=91d8c7ff-5a1b-5576-a8c0-57242076c163 --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `91d8c7ff...` |
| <!-- coderef:uuid=4fa4ea67-5b61-5549-a3b1-333a07e25791 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `4fa4ea67...` |
| <!-- coderef:uuid=40781b5b-39ea-51da-a34b-cf886390902a --> `CallExpression` | `src/analyzer/call-detector.ts` | `40781b5b...` |
| <!-- coderef:uuid=560b0ba7-e6b4-56bc-8fa2-52e6ae02049c --> `CallEdge` | `src/analyzer/call-detector.ts` | `560b0ba7...` |
| <!-- coderef:uuid=adf720e7-2a06-57d8-bab5-812625fd296b --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `adf720e7...` |
| <!-- coderef:uuid=76bc049b-00b5-5dbb-bbea-838267580077 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `76bc049b...` |
| <!-- coderef:uuid=7103f059-fc55-5344-87ce-ac2a6cd0d1b6 --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `7103f059...` |
| <!-- coderef:uuid=d6e306ba-ef79-532c-93ca-259118bcadfe --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `d6e306ba...` |
| <!-- coderef:uuid=4844a93a-1600-5305-97d7-5bb518d8c488 --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `4844a93a...` |
| <!-- coderef:uuid=6bc8e366-f3c8-5c66-9463-444584448e20 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `6bc8e366...` |
| <!-- coderef:uuid=ddec07c1-b56a-5518-8894-bdf42230507b --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `ddec07c1...` |
| <!-- coderef:uuid=09a6b5f2-edac-5a74-b846-a1b25afef37b --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `09a6b5f2...` |
| <!-- coderef:uuid=57460c59-0721-5f02-a67e-65cd754ecd4d --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `57460c59...` |
| <!-- coderef:uuid=e266b95e-20ca-519f-a795-e750aa643241 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `e266b95e...` |
| <!-- coderef:uuid=7543a271-350f-5543-8b4b-5ea04e420c7c --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `7543a271...` |
| <!-- coderef:uuid=e86a1363-b455-581f-85bc-5dd9620b0fc3 --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `e86a1363...` |
| <!-- coderef:uuid=bd829955-e081-5ca6-9d11-73e3d2f49280 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `bd829955...` |
| <!-- coderef:uuid=3ddbc14c-4e53-52b9-96a0-7dcaf89ed35f --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `3ddbc14c...` |
| <!-- coderef:uuid=a5069b3e-5dbe-530e-934c-441c566c0bf1 --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `a5069b3e...` |
| <!-- coderef:uuid=2129e8d2-7ae4-5580-9b03-6a0bdfb7f4d7 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `2129e8d2...` |
| <!-- coderef:uuid=7f268c4b-ae3b-599e-90a9-713daff8c3ea --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `7f268c4b...` |
| <!-- coderef:uuid=43564d55-750d-587f-91a4-c5fa86435066 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `43564d55...` |
| <!-- coderef:uuid=08c09cfa-b70a-59fe-b9ea-3c464061758b --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `08c09cfa...` |
| <!-- coderef:uuid=41612f84-05e8-52cf-b49f-fa44061efea8 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `41612f84...` |
| <!-- coderef:uuid=7db1edcf-5780-5879-9fcb-ab8a3e541971 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `7db1edcf...` |
| <!-- coderef:uuid=9401a11c-c4e1-5cbb-8572-e752980443ad --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `9401a11c...` |
| <!-- coderef:uuid=d7d7b28a-61e5-5ceb-a87b-c83f9a309c47 --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `d7d7b28a...` |
| <!-- coderef:uuid=dc34fee4-ba1c-5d1f-86f9-e7d2c0434955 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `dc34fee4...` |

*... and 316 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (49)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=cf6ca851-07ae-5995-a092-3cb0b6e74e84 --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `cf6ca851...` |
| <!-- coderef:uuid=134247ec-f1f7-57a4-9959-f3f9e9900c34 --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `134247ec...` |
| <!-- coderef:uuid=157b158e-224b-5246-a222-b085ab07a50d --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `157b158e...` |
| <!-- coderef:uuid=b06cf6dd-3bab-5b44-acb5-c8657c0fc548 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `b06cf6dd...` |
| <!-- coderef:uuid=48e41b62-44e1-5df4-9066-f41eed54268c --> `WebAppType` | `src/analyzer/project-classifier.ts` | `48e41b62...` |
| <!-- coderef:uuid=6c21bafb-9639-5608-9315-f5e8b2475ed5 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `6c21bafb...` |
| <!-- coderef:uuid=78ee7c95-f2a7-522a-aad3-72251e32b16f --> `ExportFormat` | `src/export/graph-exporter.ts` | `78ee7c95...` |
| <!-- coderef:uuid=1d8a8c0a-b0ac-5c6a-999b-43262ff49c26 --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `1d8a8c0a...` |
| <!-- coderef:uuid=1f1c871d-b480-55ee-946d-9c17de313fad --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `1f1c871d...` |
| <!-- coderef:uuid=65982eb0-3ebc-57b4-baea-ab7f798486c4 --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `65982eb0...` |
| <!-- coderef:uuid=1c95af37-df45-5c38-93f3-501e227e7df2 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `1c95af37...` |
| <!-- coderef:uuid=79f785cd-670d-54c2-9a68-b635e1051bd4 --> `IndexingStage` | `src/indexer/indexer-service.ts` | `79f785cd...` |
| <!-- coderef:uuid=22b41ed2-eadf-572c-8246-d449ea36fad5 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `22b41ed2...` |
| <!-- coderef:uuid=fd49b6f1-f062-586c-af0c-92022fa2e72b --> `QueryFilter` | `src/indexer/query-engine.ts` | `fd49b6f1...` |
| <!-- coderef:uuid=f90ed575-8a5d-5826-80f8-e285496dee63 --> `RelationshipType` | `src/indexer/relationship-index.ts` | `f90ed575...` |
| <!-- coderef:uuid=6d89dcb5-70ea-5ec1-ade8-8cd106343b87 --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `6d89dcb5...` |
| <!-- coderef:uuid=f78da1ee-3edb-5881-a24f-1c0119bb9d91 --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `f78da1ee...` |
| <!-- coderef:uuid=e32c255e-14fa-5ded-ae6a-b761f4f17b5b --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `e32c255e...` |
| <!-- coderef:uuid=1a49f834-1214-5a97-8e6f-a1b1952f0c02 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `1a49f834...` |
| <!-- coderef:uuid=8fbcac4c-9a7f-5e0e-83b9-0b14781fd108 --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `8fbcac4c...` |
| <!-- coderef:uuid=33638ed0-bb07-5011-944a-a4b369a27dd0 --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `33638ed0...` |
| <!-- coderef:uuid=afb71a74-b50c-57b4-9b4a-9b4c296e0846 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `afb71a74...` |
| <!-- coderef:uuid=df54c697-2bcb-55de-8a0e-7e2df132a10c --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `df54c697...` |
| <!-- coderef:uuid=1e803945-2383-5ec2-9aeb-9b597055805a --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `1e803945...` |
| <!-- coderef:uuid=702e7ded-4838-5bcb-a454-9c8bbd8587ee --> `RelativePath` | `src/integration/rag/path-types.ts` | `702e7ded...` |
| <!-- coderef:uuid=5c1c4e9c-bbc7-53f8-9890-248407b4a532 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `5c1c4e9c...` |
| <!-- coderef:uuid=d267c80f-119a-5a87-ba61-fc6b413e7ae0 --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `d267c80f...` |
| <!-- coderef:uuid=c7003099-a847-5a86-ab5d-caf967e5d428 --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `c7003099...` |
| <!-- coderef:uuid=3ee37fab-87ac-51c9-9fa0-40145f4c4b56 --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `3ee37fab...` |
| <!-- coderef:uuid=5e9a9c87-70fe-53bf-8dc3-7da86658fb66 --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `5e9a9c87...` |
| <!-- coderef:uuid=6f63c136-d680-5bb2-8255-f36ae01a0496 --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `6f63c136...` |
| <!-- coderef:uuid=41e59635-58bb-5c1a-b77a-ed5e929843ca --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `41e59635...` |
| <!-- coderef:uuid=3bbc08b3-6a2d-56b8-8bc3-5334569ab823 --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `3bbc08b3...` |
| <!-- coderef:uuid=23871d53-b0e3-5ccc-bf1a-d47a0db237a4 --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `23871d53...` |
| <!-- coderef:uuid=787e2e6e-d654-5163-8a1c-d2b475757c7a --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `787e2e6e...` |
| <!-- coderef:uuid=b161a3ae-1d53-584e-a7f4-5e3841a47050 --> `ExportTable` | `src/pipeline/import-resolver.ts` | `b161a3ae...` |
| <!-- coderef:uuid=eb5fa0e6-0ad5-54ab-9b07-00fc52d13e21 --> `LanguageExtension` | `src/pipeline/types.ts` | `eb5fa0e6...` |
| <!-- coderef:uuid=8e32a620-e2f7-5e14-921e-b6a4f10a37b8 --> `RawExportKind` | `src/pipeline/types.ts` | `8e32a620...` |
| <!-- coderef:uuid=13c47953-6778-532a-ae20-d38c815b92c6 --> `PluginSource` | `src/plugins/types.ts` | `13c47953...` |
| <!-- coderef:uuid=83cedce8-3a82-5fea-adb3-87f33bc1d0d4 --> `QueryType` | `src/query/query-executor.ts` | `83cedce8...` |
| <!-- coderef:uuid=1296f09e-00b1-5fb5-8ecb-99ca32e015ee --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `1296f09e...` |
| <!-- coderef:uuid=0629f2b0-a0a9-5881-89f3-b1add66e65e6 --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `0629f2b0...` |
| <!-- coderef:uuid=6952f30f-a641-5a88-b998-24e90238ef10 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `6952f30f...` |
| <!-- coderef:uuid=d64b14e0-152c-52fd-8041-0e2906fcd66c --> `LogLevel` | `src/utils/logger.ts` | `d64b14e0...` |
| <!-- coderef:uuid=3179fd24-03d4-52da-92f8-d409b9a189fe --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `3179fd24...` |
| <!-- coderef:uuid=25e8812b-24d5-5e2f-82d4-523400734921 --> `IndexedCoderef` | `types.d.ts` | `25e8812b...` |
| <!-- coderef:uuid=5250685d-276a-5827-9876-1bc672a83516 --> `DriftStatus` | `types.d.ts` | `5250685d...` |
| <!-- coderef:uuid=10e8a9a8-0d89-5d9a-af5c-663464b15ad7 --> `DriftReport` | `types.d.ts` | `10e8a9a8...` |
| <!-- coderef:uuid=1c034dc1-0580-5844-b7c5-883d60346cd9 --> `DriftDetectionOptions` | `types.d.ts` | `1c034dc1...` |

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
