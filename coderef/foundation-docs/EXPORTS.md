# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-07-02  
**Total Exported:** 771 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **284** | 445 | 729 |
| interface | **312** | 89 | 401 |
| constant | **30** | 103 | 133 |
| type | **44** | 21 | 65 |
| component | **2** | 0 | 2 |
| class | **99** | 4 | 103 |

---

## Exported Functions (284)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=8b715f0e-d5ba-5336-b4b4-2242465d299d --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `8b715f0e...` |
| <!-- coderef:uuid=301fa8b3-1275-5c74-a128-ba1f2d655563 --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `301fa8b3...` |
| <!-- coderef:uuid=c5768a38-0e0e-5877-8cdb-c2e89366397b --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `c5768a38...` |
| <!-- coderef:uuid=2e2f8226-cd83-5cb6-a913-9d8c10dfb0c0 --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `2e2f8226...` |
| <!-- coderef:uuid=1c859fa4-09ad-5623-a003-92eaba214105 --> `scanFileWithAST` | `src/analyzer/ast-element-scanner.ts` | ❌ | filePath | `1c859fa4...` |
| <!-- coderef:uuid=c1cd9634-498b-583f-a1b9-6e97967397b5 --> `scanFilesWithAST` | `src/analyzer/ast-element-scanner.ts` | ❌ | filePaths | `c1cd9634...` |
| <!-- coderef:uuid=8be88426-2b3a-5588-b578-424c28fb56c1 --> `analyzeProjectConfig` | `src/analyzer/config-analyzer.ts` | ❌ | projectPath | `8be88426...` |
| <!-- coderef:uuid=5234e074-b8da-572d-b4f0-5882bd8dcf67 --> `analyzeContracts` | `src/analyzer/contract-detector.ts` | ❌ | projectPath | `5234e074...` |
| <!-- coderef:uuid=c01a6bb8-c9e0-5d42-aef1-3625f06986ff --> `analyzeDatabase` | `src/analyzer/database-detector.ts` | ❌ | projectPath | `c01a6bb8...` |
| <!-- coderef:uuid=7c3719c9-5250-5d0c-9f4f-604c1d48f618 --> `analyzeDependencyHealth` | `src/analyzer/dependency-analyzer.ts` | ✅ | projectPath | `7c3719c9...` |
| <!-- coderef:uuid=af386c59-7fa8-5746-a403-93164d6d7872 --> `analyzeDesignPatterns` | `src/analyzer/design-pattern-detector.ts` | ❌ | projectPath | `af386c59...` |
| <!-- coderef:uuid=e25cf992-9c64-5162-818f-3e198304af2d --> `analyzeDocs` | `src/analyzer/docs-analyzer.ts` | ✅ | projectPath | `e25cf992...` |
| <!-- coderef:uuid=6c90a134-09a9-52ee-8106-95bc0ab5f4f8 --> `parseFetchCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `6c90a134...` |
| <!-- coderef:uuid=b02b13d1-9ecb-5a4e-a7d0-646dbb64996f --> `parseAxiosCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `b02b13d1...` |
| <!-- coderef:uuid=9ba3b2c1-a862-55e4-9ac2-a5490a9a5828 --> `parseReactQueryCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `9ba3b2c1...` |
| <!-- coderef:uuid=99e49a94-1fb8-576b-8e14-a6831b190b0e --> `parseCustomApiCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `99e49a94...` |
| <!-- coderef:uuid=f4cf1db9-9c92-5cc8-a1d6-dfa7d2385eae --> `extractHttpMethod` | `src/analyzer/frontend-call-parsers.ts` | ❌ | optionsArg | `f4cf1db9...` |
| <!-- coderef:uuid=e14b914f-dfa7-5a22-b958-31e5eb0fe8da --> `extractCallLocation` | `src/analyzer/frontend-call-parsers.ts` | ❌ | node, filePath | `e14b914f...` |
| <!-- coderef:uuid=8ae6ef75-37d2-5e63-ac18-1dce2fab78da --> `buildCallEdges` | `src/analyzer/js-call-detector/analyzer.ts` | ❌ | filePaths, callDetector, elementMap | `8ae6ef75...` |
| <!-- coderef:uuid=d98c7847-086e-5481-8d44-5c73b84c5c0c --> `analyzeCallPatterns` | `src/analyzer/js-call-detector/analyzer.ts` | ❌ | filePaths, callDetector | `d98c7847...` |
| <!-- coderef:uuid=7e45bb03-b801-5eea-b921-947e4e5bc3f5 --> `extractImportsFromAST` | `src/analyzer/js-call-detector/module-analyzer.ts` | ❌ | ast, imports | `7e45bb03...` |
| <!-- coderef:uuid=853255af-453e-5788-be9c-5913e348bde9 --> `extractExportsFromAST` | `src/analyzer/js-call-detector/module-analyzer.ts` | ❌ | ast, exports | `853255af...` |
| <!-- coderef:uuid=a927e0ad-0592-5a4c-8898-b54d8969ba8d --> `parseCallExpression` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node, filePath, context | `a927e0ad...` |
| <!-- coderef:uuid=d68bae5d-6c03-52a8-9c0f-e982269054df --> `parseNewExpression` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node, filePath, context | `d68bae5d...` |
| <!-- coderef:uuid=84893053-41a8-5f46-9863-68a35ac003f4 --> `extractObjectName` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node | `84893053...` |
| <!-- coderef:uuid=43b80ed5-a451-509c-8b0f-c8a9efbcb66d --> `isNestedCall` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node | `43b80ed5...` |
| <!-- coderef:uuid=88bb5a70-da37-572b-85aa-6776cb71d157 --> `extractParameters` | `src/analyzer/js-call-detector/parser.ts` | ❌ | params | `88bb5a70...` |
| <!-- coderef:uuid=08f9741b-216f-5ee2-94bc-f5199513fe61 --> `extractParameter` | `src/analyzer/js-call-detector/parser.ts` | ❌ | param | `08f9741b...` |
| <!-- coderef:uuid=2bd67d27-d0fd-5e59-958a-524fbdfd08d3 --> `visitNode` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | node, calls, filePath, context | `2bd67d27...` |
| <!-- coderef:uuid=9c240a84-edf3-553e-902a-fdfd314e7e5e --> `extractParametersFromAST` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | ast, filePath, result, context | `9c240a84...` |
| <!-- coderef:uuid=e258bb08-3b1f-5278-adaf-6566e7697f90 --> `extractElementsFromAST` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | ast, filePath, elements, parentExported | `e258bb08...` |
| <!-- coderef:uuid=af40ee64-522d-565b-a457-2e3ba45a6dc1 --> `parseJavaScript` | `src/analyzer/js-parser.ts` | ❌ | code, options | `af40ee64...` |
| <!-- coderef:uuid=4dbbabea-a87f-5e09-bb02-3b8d387b0fb4 --> `parseJavaScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath, options | `4dbbabea...` |
| <!-- coderef:uuid=398ea9c9-cd48-5655-9ea8-2d91cc3860c4 --> `isJavaScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath | `398ea9c9...` |
| <!-- coderef:uuid=05072f95-3e58-54b9-8026-ae3fce70327f --> `isTypeScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath | `05072f95...` |
| <!-- coderef:uuid=a5307f6d-2c5b-597a-b639-9c5b1f6662da --> `getSourceTypeFromExtension` | `src/analyzer/js-parser.ts` | ❌ | filePath | `a5307f6d...` |
| <!-- coderef:uuid=9bb59dcc-5c33-5150-bbda-8df9ef16f523 --> `parseJavaScriptFileAuto` | `src/analyzer/js-parser.ts` | ❌ | filePath | `9bb59dcc...` |
| <!-- coderef:uuid=40cd87fa-fbf7-5617-8b16-ae6bb43830a8 --> `analyzeMiddlewareAndDI` | `src/analyzer/middleware-detector.ts` | ❌ | elements, files | `40cd87fa...` |
| <!-- coderef:uuid=99aefa3f-ff1f-5c0e-8129-b8adac3d5516 --> `extractAllRoutes` | `src/analyzer/migration-route-analyzer.ts` | ❌ | elements | `99aefa3f...` |
| <!-- coderef:uuid=d1228e06-ece5-54cb-8dae-b48f9994d87b --> `findOrphanedCalls` | `src/analyzer/migration-route-analyzer.ts` | ❌ | elements, frontendCalls | `d1228e06...` |
| <!-- coderef:uuid=008efb29-6c96-563f-b28c-f92ce52c72c1 --> `detectBreakingChanges` | `src/analyzer/migration-route-analyzer.ts` | ❌ | oldElements, newElements | `008efb29...` |
| <!-- coderef:uuid=f024ca90-590f-5dd8-bd20-0bda62dc12bc --> `parseFlaskRoute` | `src/analyzer/route-parsers.ts` | ❌ | code, line | `f024ca90...` |
| <!-- coderef:uuid=de803dd2-59b6-54c9-8fed-01a468558016 --> `parseFastAPIRoute` | `src/analyzer/route-parsers.ts` | ❌ | code, line | `de803dd2...` |
| <!-- coderef:uuid=79713800-9021-5767-a4b9-ca87de443f4d --> `parseExpressRoute` | `src/analyzer/route-parsers.ts` | ❌ | code, line, fileContent | `79713800...` |
| <!-- coderef:uuid=be9cc7d9-effd-538c-a8c4-597afea3018d --> `parseNextJsRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, exports | `be9cc7d9...` |
| <!-- coderef:uuid=23197ec4-0302-5335-9a91-3388cfff6cf1 --> `parseNextJsPagesRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, fileContent | `23197ec4...` |
| <!-- coderef:uuid=9c35380e-d620-56cf-992f-61b3e2629e59 --> `parseSvelteKitRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, exports | `9c35380e...` |
| <!-- coderef:uuid=b44cc0d3-5f1d-5dac-beeb-b280482048e6 --> `parseNuxtRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, fileContent | `b44cc0d3...` |
| <!-- coderef:uuid=2b39d675-7591-57b5-8259-926704bcb825 --> `parseRemixRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, exports | `2b39d675...` |
| <!-- coderef:uuid=9bf05c2f-b986-5309-a031-c352cb8432ab --> `extractRouteMetadata` | `src/analyzer/route-parsers.ts` | ❌ | code, filePath, exports, line, fileContent | `9bf05c2f...` |

*... and 234 more functions. See index.json for complete list.*

---

## Exported Classes (99)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=daa49fab-86bd-5dd2-93fc-e2e4dc285392 --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `daa49fab...` |
| <!-- coderef:uuid=8b7294e7-76f5-56c1-968c-c7da1b7c66fd --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `8b7294e7...` |
| <!-- coderef:uuid=aba20646-8c01-5b75-880d-e04e44be044c --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `aba20646...` |
| <!-- coderef:uuid=3c3a2ac0-6e72-59bc-9a72-7cf648761ef5 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `3c3a2ac0...` |
| <!-- coderef:uuid=d550f7ce-8a0f-50eb-920e-a25736c251e0 --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `d550f7ce...` |
| <!-- coderef:uuid=635b02c7-54c8-5346-8366-f4b8636bb94f --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `635b02c7...` |
| <!-- coderef:uuid=89e68f77-ecc5-5564-9081-e65d15607728 --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `89e68f77...` |
| <!-- coderef:uuid=41e9a0c7-30b2-58ae-b567-ad9284f0829f --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `41e9a0c7...` |
| <!-- coderef:uuid=ef69e28e-af06-5803-a45c-2f2aa741cca3 --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `ef69e28e...` |
| <!-- coderef:uuid=34e88cd9-d838-5f0b-aceb-3b2a31ec449e --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `34e88cd9...` |
| <!-- coderef:uuid=998c43cf-0d82-599d-b5a8-0a48ee105c86 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `998c43cf...` |
| <!-- coderef:uuid=0e096457-543d-5126-8919-822fcfc639bf --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `0e096457...` |
| <!-- coderef:uuid=61c70200-9741-5534-b682-2f8b587c2f17 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `61c70200...` |
| <!-- coderef:uuid=68253add-8a13-5bbd-a22c-3a46f0c5a3c4 --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `68253add...` |
| <!-- coderef:uuid=936b0c8f-3a36-5b92-a481-b06ee2f7a347 --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `936b0c8f...` |
| <!-- coderef:uuid=50ad9ecf-bb54-5c2a-92e6-96c47bc7635c --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `50ad9ecf...` |
| <!-- coderef:uuid=f6a3c8f5-54cc-57d6-8efc-cab4a3562105 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `f6a3c8f5...` |
| <!-- coderef:uuid=2a7ac3ec-a6b2-528f-b83c-f18dfe4c9095 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `2a7ac3ec...` |
| <!-- coderef:uuid=e1229fcb-3366-54bb-8043-e6eeb4267b38 --> `ContextGenerator` | `src/context/context-generator.ts` | `e1229fcb...` |
| <!-- coderef:uuid=a1e11a52-97fa-5b7e-afc9-8bf375db207a --> `ContextTracker` | `src/context/context-tracker.ts` | `a1e11a52...` |
| <!-- coderef:uuid=4a643d43-c9a4-5e55-9c7a-9a2e7c8b68ce --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `4a643d43...` |
| <!-- coderef:uuid=c6105ae7-a8e1-561a-891d-4b7cf0b30d5f --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `c6105ae7...` |
| <!-- coderef:uuid=8b8660bb-0021-5a68-81d0-9ac0290d2446 --> `ExampleExtractor` | `src/context/example-extractor.ts` | `8b8660bb...` |
| <!-- coderef:uuid=a513215f-2a38-5f27-a61a-4e0beeaa55d0 --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `a513215f...` |
| <!-- coderef:uuid=33ecec19-7b44-55e9-bb49-b2b3a8ad9b37 --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `33ecec19...` |
| <!-- coderef:uuid=0d7c79e0-9fda-55d9-86f0-a6504830c06f --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `0d7c79e0...` |
| <!-- coderef:uuid=b23eb8f0-0e8f-5aad-abbe-7c5822dcf936 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `b23eb8f0...` |
| <!-- coderef:uuid=d07504ef-e7a2-5ff7-8014-4df799c53185 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `d07504ef...` |
| <!-- coderef:uuid=645b0d3c-a732-52f8-946c-fb2ac8a3c613 --> `GraphExporter` | `src/export/graph-exporter.ts` | `645b0d3c...` |
| <!-- coderef:uuid=58a0cdc3-0717-54ed-b7a8-c28ead4c6644 --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `58a0cdc3...` |
| <!-- coderef:uuid=e7b3e468-9722-5745-82b6-fe824f59b299 --> `IndexStore` | `src/indexer/index-store.ts` | `e7b3e468...` |
| <!-- coderef:uuid=eb490c44-0780-55f0-b673-ff4fa1a9a5ad --> `IndexerService` | `src/indexer/indexer-service.ts` | `eb490c44...` |
| <!-- coderef:uuid=41685fc8-25e3-5b70-b3ac-f5027600a4d2 --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `41685fc8...` |
| <!-- coderef:uuid=335e7276-c2e4-5259-bcdc-bbf4e46e43ce --> `QueryEngine` | `src/indexer/query-engine.ts` | `335e7276...` |
| <!-- coderef:uuid=23ba46b3-0c74-59a7-a777-db24f7d77fa9 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `23ba46b3...` |
| <!-- coderef:uuid=f96b5a78-036d-5a26-8eb4-51c8cb331da0 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `f96b5a78...` |
| <!-- coderef:uuid=322df3bf-574c-5d6f-8e58-5fd168782e2e --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `322df3bf...` |
| <!-- coderef:uuid=1ed20f56-3ea8-5ef8-86e7-b730abc71661 --> `LLMError` | `src/integration/llm/llm-provider.ts` | `1ed20f56...` |
| <!-- coderef:uuid=4b65a2a3-bf72-5c1e-8c53-b35ae6c39433 --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `4b65a2a3...` |
| <!-- coderef:uuid=3d4655c5-4fec-5655-9f98-aa0abafcf4ef --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `3d4655c5...` |
| <!-- coderef:uuid=3fd4d9fc-7279-50f0-9ded-bc669f8588cc --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `3fd4d9fc...` |
| <!-- coderef:uuid=34a614c4-1b7a-580a-9a54-52b697de5ff0 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `34a614c4...` |
| <!-- coderef:uuid=c755ef2a-bd23-5392-93a3-d1946c7e90f3 --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `c755ef2a...` |
| <!-- coderef:uuid=7c2a5a73-7b84-5ad6-93a3-c745ed462a13 --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `7c2a5a73...` |
| <!-- coderef:uuid=59bf646c-b5e7-5a13-875d-0b3f2ce97521 --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `59bf646c...` |
| <!-- coderef:uuid=c8922b5d-52ea-59e8-a948-1973421b1640 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `c8922b5d...` |
| <!-- coderef:uuid=3581a473-2b03-50b9-a0cc-bee0c2c0aabc --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `3581a473...` |
| <!-- coderef:uuid=44c9010c-841a-597b-8959-ee7beeb5303f --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `44c9010c...` |
| <!-- coderef:uuid=8174b6c1-a793-5bc7-9d4b-dff19a6f2318 --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `8174b6c1...` |
| <!-- coderef:uuid=ff77ff02-da04-59fb-86bd-5a4aecff6617 --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `ff77ff02...` |
| <!-- coderef:uuid=2d0f1d8a-4fe6-55a1-ae1c-2d57d4b7bc9b --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `2d0f1d8a...` |
| <!-- coderef:uuid=d931473f-2682-5a4f-bb4c-f69e8c015b6c --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `d931473f...` |
| <!-- coderef:uuid=28d5b202-7f5d-5fce-8a08-8e2fceae81b3 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `28d5b202...` |
| <!-- coderef:uuid=2c7a4291-c36c-5cad-b6eb-4acf5da8f5a8 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `2c7a4291...` |
| <!-- coderef:uuid=10d8fe84-11d8-57fb-b633-01ba7f935f14 --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `10d8fe84...` |
| <!-- coderef:uuid=c9e676c1-4904-563f-907e-15d08f7f2dfc --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `c9e676c1...` |
| <!-- coderef:uuid=d4662697-335f-5576-b4d7-0442338f1520 --> `ConfigError` | `src/integration/rag/rag-config.ts` | `d4662697...` |
| <!-- coderef:uuid=f7510d31-8b7c-5a69-bc9b-d5422f17c0e2 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `f7510d31...` |
| <!-- coderef:uuid=c4b4750b-c848-5f6e-b004-a6a1f4010461 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `c4b4750b...` |
| <!-- coderef:uuid=2a1ce345-288e-506a-82b8-1f1af491c919 --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `2a1ce345...` |
| <!-- coderef:uuid=9d43df3c-db56-504d-bc76-1de71b7440f4 --> `JsonVectorStore` | `src/integration/vector/json-store.ts` | `9d43df3c...` |
| <!-- coderef:uuid=83b5b485-aefc-56d8-941f-955b469e750b --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `83b5b485...` |
| <!-- coderef:uuid=0bd5c7c1-7756-5812-a793-4df0a2cff59c --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `0bd5c7c1...` |
| <!-- coderef:uuid=38816f69-ab0b-51e3-aee7-fcf7ec8917d1 --> `CodeRefParser` | `src/parser/parser.ts` | `38816f69...` |
| <!-- coderef:uuid=07b35101-4e97-557c-bfbf-23e9b6350420 --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `07b35101...` |
| <!-- coderef:uuid=f4b3a60a-00f2-5865-b616-41244bcb98bb --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `f4b3a60a...` |
| <!-- coderef:uuid=7935d730-034d-51c5-ac67-6946b93bf9d2 --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `7935d730...` |
| <!-- coderef:uuid=3c386af0-461e-57b0-aa04-dbbe9caa4048 --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `3c386af0...` |
| <!-- coderef:uuid=f2cd84fe-5352-59a2-a3a6-3a5629efa150 --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `f2cd84fe...` |
| <!-- coderef:uuid=7d80d49c-957c-5bf3-9701-95ec368fc8a4 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `7d80d49c...` |
| <!-- coderef:uuid=9a9ad609-64c3-5e50-85d0-da7253e05fc0 --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `9a9ad609...` |
| <!-- coderef:uuid=b247157b-a821-54cf-865d-e62974987577 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `b247157b...` |
| <!-- coderef:uuid=e21469c1-4235-5546-962b-c2d1377cd14a --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `e21469c1...` |
| <!-- coderef:uuid=24ab6298-0c84-5fbc-85f0-28873f39e0c4 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `24ab6298...` |
| <!-- coderef:uuid=a5d85f9d-7f25-59ed-b3ed-5496ea730bd3 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `a5d85f9d...` |
| <!-- coderef:uuid=203742a8-a84d-528e-98cf-45477f87c51a --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `203742a8...` |
| <!-- coderef:uuid=cc33ef34-79b5-5863-9466-e6514836fb4c --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `cc33ef34...` |
| <!-- coderef:uuid=463b9df2-b8c2-5cd6-a364-1bbf4c340682 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `463b9df2...` |
| <!-- coderef:uuid=698a845d-dbb3-5cff-866b-8086b617cb17 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `698a845d...` |
| <!-- coderef:uuid=1a648c34-3392-56cc-a393-89f0709234a2 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `1a648c34...` |
| <!-- coderef:uuid=a2968293-adff-5fb2-8968-1b255134e328 --> `CanonicalGraphError` | `src/query/canonical-graph.ts` | `a2968293...` |
| <!-- coderef:uuid=30035452-96cf-5b3e-945d-9893f86be402 --> `CanonicalGraphQuery` | `src/query/canonical-graph.ts` | `30035452...` |
| <!-- coderef:uuid=eb83d35c-0592-5483-a2ce-d8b49ff2a284 --> `EntityRegistry` | `src/registry/entity-registry.ts` | `eb83d35c...` |
| <!-- coderef:uuid=337c0f6a-8536-58ed-b54d-0371a01b594e --> `FileWatcher` | `src/scanner/file-watcher.ts` | `337c0f6a...` |
| <!-- coderef:uuid=ed6d5e33-f0ce-5e87-9125-74cc31e4e24b --> `LRUCache` | `src/scanner/lru-cache.ts` | `ed6d5e33...` |
| <!-- coderef:uuid=e98ca01b-fbd7-5bb3-9e3b-01d493c99750 --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `e98ca01b...` |
| <!-- coderef:uuid=9489323f-68f6-5814-972b-65bde7c83843 --> `SearchIndex` | `src/search/search-engine.ts` | `9489323f...` |
| <!-- coderef:uuid=bcdc7adf-b7f2-5619-9104-d262c4a033a3 --> `SearchEngine` | `src/search/search-engine.ts` | `bcdc7adf...` |
| <!-- coderef:uuid=4ad8c6b6-ef75-545a-ae4e-9793deb4bdde --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `4ad8c6b6...` |
| <!-- coderef:uuid=19b12a60-2523-581e-8972-16035b48ca6c --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `19b12a60...` |
| <!-- coderef:uuid=3358aa62-c588-589e-8013-66570d50a86d --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `3358aa62...` |
| <!-- coderef:uuid=b6580849-d1c4-5385-9468-612e4e7aabcf --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `b6580849...` |
| <!-- coderef:uuid=2f11014c-54da-5a2f-b8d1-268bcb0f58a7 --> `OpenAI` | `src/types/external-modules.d.ts` | `2f11014c...` |
| <!-- coderef:uuid=f7782ee3-5487-517a-b3bd-19c70eff55b5 --> `Anthropic` | `src/types/external-modules.d.ts` | `f7782ee3...` |
| <!-- coderef:uuid=a0e72e17-af27-5484-b89b-a3627bba08bf --> `ChromaClient` | `src/types/external-modules.d.ts` | `a0e72e17...` |
| <!-- coderef:uuid=c469e427-856b-583a-9742-3b430ec8248f --> `Collection` | `src/types/external-modules.d.ts` | `c469e427...` |
| <!-- coderef:uuid=f933eee5-671a-5ef5-aac7-d0ede8668fad --> `Pinecone` | `src/types/external-modules.d.ts` | `f933eee5...` |
| <!-- coderef:uuid=60bbd1da-0279-5e0c-917e-085a8b7dcd0f --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `60bbd1da...` |
| <!-- coderef:uuid=8d9575fa-f3a1-50c5-b6a5-f0385c77c095 --> `CodeRefValidator` | `src/validator/validator.ts` | `8d9575fa...` |

---

## Exported Interfaces (312)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=bff27489-6b20-5075-bf76-148c41b5923b --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `bff27489...` |
| <!-- coderef:uuid=46901067-e0a7-58af-933d-74a0d347a951 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `46901067...` |
| <!-- coderef:uuid=ee831c3d-2c60-50c8-8433-80f18a575f55 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `ee831c3d...` |
| <!-- coderef:uuid=a42bb154-7359-5e1e-8dde-fec8edc8ec81 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `a42bb154...` |
| <!-- coderef:uuid=9b791e9a-4518-525c-be08-a079773759ad --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `9b791e9a...` |
| <!-- coderef:uuid=be792f37-c7d3-55af-a2e6-0d4dc45c2df1 --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `be792f37...` |
| <!-- coderef:uuid=5bbbeab9-bdf8-579f-bd97-768e18d584b6 --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `5bbbeab9...` |
| <!-- coderef:uuid=df947c1b-2d1d-5211-a493-20e069546ba1 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `df947c1b...` |
| <!-- coderef:uuid=67735967-52f9-5ed9-8328-015d7efd9a32 --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `67735967...` |
| <!-- coderef:uuid=a51ddaff-a1f7-57de-ac76-f8567b260d4c --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `a51ddaff...` |
| <!-- coderef:uuid=456df1f2-3414-5af9-a2b1-0cb25ac1ba59 --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `456df1f2...` |
| <!-- coderef:uuid=f221db9a-9d6d-5f00-a0fe-e34ea3200671 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `f221db9a...` |
| <!-- coderef:uuid=eb71e607-cd70-5a78-9aad-29e5574d73d1 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `eb71e607...` |
| <!-- coderef:uuid=21c78d66-5a16-57d9-8d70-6145165b90c2 --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `21c78d66...` |
| <!-- coderef:uuid=6ac31a2f-ca3e-58f3-8443-84324b44f3c6 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `6ac31a2f...` |
| <!-- coderef:uuid=85942d3f-7116-588f-baa5-a20a4f89e20e --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `85942d3f...` |
| <!-- coderef:uuid=9c01f0ce-a28c-578d-a0f4-ababda168c6e --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `9c01f0ce...` |
| <!-- coderef:uuid=13023a89-a396-50e2-b3b8-bcf09bfd35f3 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `13023a89...` |
| <!-- coderef:uuid=4fe29979-50a0-59b6-9669-3b67a86b4edb --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `4fe29979...` |
| <!-- coderef:uuid=445b1ccb-d27b-5476-811b-67afda206df6 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `445b1ccb...` |
| <!-- coderef:uuid=dc0d1800-160f-5b86-920e-79985e506661 --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `dc0d1800...` |
| <!-- coderef:uuid=99321ba6-05d4-560e-add4-cd0dc8b1b631 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `99321ba6...` |
| <!-- coderef:uuid=c0881a22-bb47-50be-9610-64d232a09e22 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `c0881a22...` |
| <!-- coderef:uuid=47b93ddb-d5ff-553e-a4eb-a65214a974d6 --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `47b93ddb...` |
| <!-- coderef:uuid=b1de060a-dc6a-511e-90f3-1c7f969c4712 --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `b1de060a...` |
| <!-- coderef:uuid=cf97eecb-1fdd-5de2-8fcb-0fa800733509 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `cf97eecb...` |
| <!-- coderef:uuid=353b93f2-4c73-5bef-960d-5b3dc9ceee69 --> `ContractAnalysis` | `src/analyzer/contract-detector.ts` | `353b93f2...` |
| <!-- coderef:uuid=5da0020a-07b9-5957-a298-03e778e055f2 --> `PrismaModel` | `src/analyzer/database-detector.ts` | `5da0020a...` |
| <!-- coderef:uuid=edbc2aa3-efe5-5bef-a4bc-0dc073b79348 --> `PrismaField` | `src/analyzer/database-detector.ts` | `edbc2aa3...` |
| <!-- coderef:uuid=419a9b3f-dae7-5c78-9d74-a4c9cd65efc3 --> `PrismaRelation` | `src/analyzer/database-detector.ts` | `419a9b3f...` |

*... and 282 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (44)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=77737efc-e490-546f-a103-c737891bfe24 --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `77737efc...` |
| <!-- coderef:uuid=9552a2d4-891d-5f66-b727-fc03bf075092 --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `9552a2d4...` |
| <!-- coderef:uuid=fa6f3f80-424e-5bcd-bf6a-d445d692ec4d --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `fa6f3f80...` |
| <!-- coderef:uuid=593ae025-fc3a-5893-8029-30400733604a --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `593ae025...` |
| <!-- coderef:uuid=9d197f51-8669-58d8-8f17-c340bb4fad30 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `9d197f51...` |
| <!-- coderef:uuid=fe6953e4-8d96-55d9-a133-2af95265cfc3 --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `fe6953e4...` |
| <!-- coderef:uuid=65a87eea-0d35-5a97-8e05-3e21dfbfd0f1 --> `FlagKind` | `src/cli/shared/cli-args.ts` | `65a87eea...` |
| <!-- coderef:uuid=81eaa57b-3a7a-56fa-be3a-d795b485c682 --> `ExportFormat` | `src/export/graph-exporter.ts` | `81eaa57b...` |
| <!-- coderef:uuid=2f30bc04-b658-5b69-ab2d-f10f7e79a10f --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `2f30bc04...` |
| <!-- coderef:uuid=a4394efb-2005-5549-8cab-79eb2ef227a3 --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `a4394efb...` |
| <!-- coderef:uuid=bbfc4150-1679-58b8-84e7-172f740a39ad --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `bbfc4150...` |
| <!-- coderef:uuid=e73bff20-64ed-59a2-af8b-377104f943a4 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `e73bff20...` |
| <!-- coderef:uuid=c4d922e2-5bed-59e7-bd55-bd42d06ab1de --> `IndexingStage` | `src/indexer/indexer-service.ts` | `c4d922e2...` |
| <!-- coderef:uuid=de06b035-cd7c-58a9-9423-2c8d495869dd --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `de06b035...` |
| <!-- coderef:uuid=e42b5036-2b3a-5e26-adf2-0fd0a467a014 --> `QueryFilter` | `src/indexer/query-engine.ts` | `e42b5036...` |
| <!-- coderef:uuid=9bf51235-25c5-5bf2-89f0-048e235e94ae --> `RelationshipType` | `src/indexer/relationship-index.ts` | `9bf51235...` |
| <!-- coderef:uuid=68be6883-456e-54d0-b3d8-4361e53b377c --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `68be6883...` |
| <!-- coderef:uuid=bd1b6a1e-794f-55f1-9387-ca420edd342b --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `bd1b6a1e...` |
| <!-- coderef:uuid=3aacda4f-1210-546c-ae96-0c146eb31ceb --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `3aacda4f...` |
| <!-- coderef:uuid=f75704e5-16d2-5013-b9bc-431359d01738 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `f75704e5...` |
| <!-- coderef:uuid=29a10d63-601b-5dd3-8c7d-1a6a470d1c57 --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `29a10d63...` |
| <!-- coderef:uuid=3e58b58c-94d0-5081-917a-0d8b75676df0 --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `3e58b58c...` |
| <!-- coderef:uuid=2bccf5af-dcc8-5f00-8f80-fe6cfe4784b0 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `2bccf5af...` |
| <!-- coderef:uuid=4ba686bc-1204-5e97-858c-43f2d9e1ad8a --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `4ba686bc...` |
| <!-- coderef:uuid=c738b6c4-bce4-519a-8a9d-45b58f236220 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `c738b6c4...` |
| <!-- coderef:uuid=8247fc32-09be-5676-a08a-ac386b800e7a --> `RelativePath` | `src/integration/rag/path-types.ts` | `8247fc32...` |
| <!-- coderef:uuid=0d69ebb7-5b8e-5dff-bf29-bd8630a20d16 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `0d69ebb7...` |
| <!-- coderef:uuid=5f67494b-093b-5304-9e66-31666f3ba6aa --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `5f67494b...` |
| <!-- coderef:uuid=eac3d10c-b890-5fd8-9885-4de96747e9c1 --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `eac3d10c...` |
| <!-- coderef:uuid=b56c162c-b157-58f6-8adf-3dea2252e45a --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `b56c162c...` |
| <!-- coderef:uuid=15c907e2-b0f4-5aab-a8f9-86309d40c9c0 --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `15c907e2...` |
| <!-- coderef:uuid=d820f85e-e1d2-5e7d-b849-733f34db0dc2 --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `d820f85e...` |
| <!-- coderef:uuid=2dc4eb8d-1b5f-589a-b344-71ed7d1bbfd6 --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `2dc4eb8d...` |
| <!-- coderef:uuid=18493a9c-936a-5834-b968-27bd7aaaeb1d --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `18493a9c...` |
| <!-- coderef:uuid=80b43cff-a8be-5b5c-bba1-dc1689062760 --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `80b43cff...` |
| <!-- coderef:uuid=572a865a-ba12-5178-8103-d4aec9153b2e --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `572a865a...` |
| <!-- coderef:uuid=79d4b6d7-61a9-5069-afd3-61c3ea43a37c --> `ExportTable` | `src/pipeline/import-resolver.ts` | `79d4b6d7...` |
| <!-- coderef:uuid=946840da-7bba-54f5-867c-a97566dc23d0 --> `LanguageExtension` | `src/pipeline/types.ts` | `946840da...` |
| <!-- coderef:uuid=47118da6-cfd0-5fbc-b71f-180bf3409b3d --> `RawExportKind` | `src/pipeline/types.ts` | `47118da6...` |
| <!-- coderef:uuid=19541275-09c4-553d-9584-ee2101c14196 --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `19541275...` |
| <!-- coderef:uuid=965be01c-39ee-5edb-9b7f-0d89f68af3e9 --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `965be01c...` |
| <!-- coderef:uuid=45a2ff66-5cfa-58be-9daf-999cf511cada --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `45a2ff66...` |
| <!-- coderef:uuid=b4873eac-edff-5301-9d73-3ca0ffd69b2c --> `LogLevel` | `src/utils/logger.ts` | `b4873eac...` |
| <!-- coderef:uuid=99534b0a-8832-536e-ad15-a1db45c123f5 --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `99534b0a...` |

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
