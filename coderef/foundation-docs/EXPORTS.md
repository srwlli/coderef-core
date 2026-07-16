# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-07-16  
**Total Exported:** 833 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **314** | 540 | 854 |
| interface | **339** | 81 | 420 |
| constant | **33** | 133 | 166 |
| type | **44** | 22 | 66 |
| component | **2** | 0 | 2 |
| class | **101** | 6 | 107 |

---

## Exported Functions (314)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=8ab5018f-83dc-5253-a4a4-3c1d3cafc5ef --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `8ab5018f...` |
| <!-- coderef:uuid=afb22276-5b5b-5ce7-b30f-a1daa3a977dc --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `afb22276...` |
| <!-- coderef:uuid=70c7e17c-072f-5bc3-8d70-bc5b25bbcb73 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `70c7e17c...` |
| <!-- coderef:uuid=a7450e85-0e28-5f28-8233-3a374da11f49 --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `a7450e85...` |
| <!-- coderef:uuid=c9ef2763-e2f9-54a9-ac12-1e96f3196850 --> `scanFileWithAST` | `src/analyzer/ast-element-scanner.ts` | ❌ | filePath | `c9ef2763...` |
| <!-- coderef:uuid=815dc249-b434-5924-9b3b-2d854d74c4da --> `scanFilesWithAST` | `src/analyzer/ast-element-scanner.ts` | ❌ | filePaths | `815dc249...` |
| <!-- coderef:uuid=d59f589f-7dec-5df2-b8fc-d3a8b80fdb4d --> `analyzeProjectConfig` | `src/analyzer/config-analyzer.ts` | ❌ | projectPath | `d59f589f...` |
| <!-- coderef:uuid=ce54c6f1-ed22-5890-a86f-0082d1409767 --> `analyzeContracts` | `src/analyzer/contract-detector.ts` | ❌ | projectPath | `ce54c6f1...` |
| <!-- coderef:uuid=0260fcf5-f6da-5650-9e4e-51195fe6dbbf --> `analyzeDatabase` | `src/analyzer/database-detector.ts` | ❌ | projectPath | `0260fcf5...` |
| <!-- coderef:uuid=423a56b6-042d-564f-86cd-9d701dbb981a --> `analyzeDependencyHealth` | `src/analyzer/dependency-analyzer.ts` | ✅ | projectPath | `423a56b6...` |
| <!-- coderef:uuid=3e5fa967-3dcb-59be-8dcd-ff93f224780a --> `analyzeDesignPatterns` | `src/analyzer/design-pattern-detector.ts` | ❌ | projectPath | `3e5fa967...` |
| <!-- coderef:uuid=318760a2-17a9-5949-90d9-2f1c871c0b8c --> `analyzeDocs` | `src/analyzer/docs-analyzer.ts` | ✅ | projectPath | `318760a2...` |
| <!-- coderef:uuid=0ea896f5-d4da-553b-a7de-962ad9a2eef5 --> `parseFetchCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `0ea896f5...` |
| <!-- coderef:uuid=4ccda63b-abb6-5fc6-91a4-83b5c534b881 --> `parseAxiosCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `4ccda63b...` |
| <!-- coderef:uuid=41fb56cb-e426-5c4c-a37e-75995ad1d073 --> `parseReactQueryCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `41fb56cb...` |
| <!-- coderef:uuid=6acb9bfa-c799-5ef2-96ba-0a1c2713bda5 --> `parseCustomApiCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `6acb9bfa...` |
| <!-- coderef:uuid=7e95a1d5-7e23-5b1b-b7f2-fffec7f0f3bd --> `extractHttpMethod` | `src/analyzer/frontend-call-parsers.ts` | ❌ | optionsArg | `7e95a1d5...` |
| <!-- coderef:uuid=f35b6f77-86c8-56a5-a467-834efe98a2ef --> `extractCallLocation` | `src/analyzer/frontend-call-parsers.ts` | ❌ | node, filePath | `f35b6f77...` |
| <!-- coderef:uuid=beb46fb9-38d0-5348-a77e-1a83a2bbde00 --> `buildCallEdges` | `src/analyzer/js-call-detector/analyzer.ts` | ❌ | filePaths, callDetector, elementMap | `beb46fb9...` |
| <!-- coderef:uuid=e5802853-2e4a-5d65-8d78-6677aa4f2351 --> `analyzeCallPatterns` | `src/analyzer/js-call-detector/analyzer.ts` | ❌ | filePaths, callDetector | `e5802853...` |
| <!-- coderef:uuid=d5f1273b-6b4c-5e54-abc8-5708042bc67f --> `extractImportsFromAST` | `src/analyzer/js-call-detector/module-analyzer.ts` | ❌ | ast, imports | `d5f1273b...` |
| <!-- coderef:uuid=740f9bae-6aa9-5759-8cbc-76376e3a32c7 --> `extractExportsFromAST` | `src/analyzer/js-call-detector/module-analyzer.ts` | ❌ | ast, exports | `740f9bae...` |
| <!-- coderef:uuid=d255720b-cde2-560b-a2ec-a17c15c7943d --> `parseCallExpression` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node, filePath, context | `d255720b...` |
| <!-- coderef:uuid=dc6ec032-db96-54d3-af81-cf158c9d0a59 --> `parseNewExpression` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node, filePath, context | `dc6ec032...` |
| <!-- coderef:uuid=81764591-8cbf-5920-8e5a-3e05d3ebac0c --> `extractObjectName` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node | `81764591...` |
| <!-- coderef:uuid=4c903f9d-fba2-5743-ab4d-5654aa164222 --> `isNestedCall` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node | `4c903f9d...` |
| <!-- coderef:uuid=9ea49809-1dbc-5bf9-8f40-285162ea11fb --> `extractParameters` | `src/analyzer/js-call-detector/parser.ts` | ❌ | params | `9ea49809...` |
| <!-- coderef:uuid=89482ae2-fea6-5d48-a346-be70e20c37a7 --> `extractParameter` | `src/analyzer/js-call-detector/parser.ts` | ❌ | param | `89482ae2...` |
| <!-- coderef:uuid=089b01d1-fdd2-569b-a452-43de22839727 --> `visitNode` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | node, calls, filePath, context | `089b01d1...` |
| <!-- coderef:uuid=8bd96e69-036d-5b20-9028-41c7b431ed70 --> `extractParametersFromAST` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | ast, filePath, result, context | `8bd96e69...` |
| <!-- coderef:uuid=255b524a-0e4b-51b0-8782-dba0590a0ad7 --> `extractElementsFromAST` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | ast, filePath, elements, parentExported | `255b524a...` |
| <!-- coderef:uuid=5583a707-f832-50d9-a2a2-9d51e1e267d3 --> `parseJavaScript` | `src/analyzer/js-parser.ts` | ❌ | code, options | `5583a707...` |
| <!-- coderef:uuid=e5c6d722-70a4-5e6c-86ba-ecc7d6a4243e --> `parseJavaScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath, options | `e5c6d722...` |
| <!-- coderef:uuid=7f8f25bf-0778-5d77-b4d6-7f72e07a735a --> `isJavaScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath | `7f8f25bf...` |
| <!-- coderef:uuid=e7b9662b-62c9-5f94-9684-090184a1c0c2 --> `isTypeScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath | `e7b9662b...` |
| <!-- coderef:uuid=20bd2e27-def3-57c6-b801-6738c41e86da --> `getSourceTypeFromExtension` | `src/analyzer/js-parser.ts` | ❌ | filePath | `20bd2e27...` |
| <!-- coderef:uuid=c4a91e28-9bdd-5e9e-9d2f-d5d5d4bed214 --> `parseJavaScriptFileAuto` | `src/analyzer/js-parser.ts` | ❌ | filePath | `c4a91e28...` |
| <!-- coderef:uuid=e2ab02ba-1e55-530f-b22d-e528a25ed8c5 --> `analyzeMiddlewareAndDI` | `src/analyzer/middleware-detector.ts` | ❌ | elements, files | `e2ab02ba...` |
| <!-- coderef:uuid=b57e4867-8526-547d-b676-34b495a87c3e --> `extractAllRoutes` | `src/analyzer/migration-route-analyzer.ts` | ❌ | elements | `b57e4867...` |
| <!-- coderef:uuid=4d812fd9-5dc7-534b-b798-d754b0dff060 --> `findOrphanedCalls` | `src/analyzer/migration-route-analyzer.ts` | ❌ | elements, frontendCalls | `4d812fd9...` |
| <!-- coderef:uuid=52349f57-1197-5c6d-a959-671e856ded38 --> `detectBreakingChanges` | `src/analyzer/migration-route-analyzer.ts` | ❌ | oldElements, newElements | `52349f57...` |
| <!-- coderef:uuid=212e6e1c-b863-5b1b-9751-76a9ed8f8a1e --> `parseFlaskRoute` | `src/analyzer/route-parsers.ts` | ❌ | code, line | `212e6e1c...` |
| <!-- coderef:uuid=1897a464-4a4e-5bef-a7c1-d231b19a6712 --> `parseFastAPIRoute` | `src/analyzer/route-parsers.ts` | ❌ | code, line | `1897a464...` |
| <!-- coderef:uuid=9fba04a1-6eec-59ad-a907-5b66fc0bea47 --> `parseExpressRoute` | `src/analyzer/route-parsers.ts` | ❌ | code, line, fileContent | `9fba04a1...` |
| <!-- coderef:uuid=d4bc4a20-d265-5e83-8c3a-a80d4a4aa68b --> `parseNextJsRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, exports | `d4bc4a20...` |
| <!-- coderef:uuid=53203171-57f9-5800-b47e-b99b19546fed --> `parseNextJsPagesRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, fileContent | `53203171...` |
| <!-- coderef:uuid=4a3985bd-435d-5bf0-97d5-d01958b15ba1 --> `parseSvelteKitRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, exports | `4a3985bd...` |
| <!-- coderef:uuid=e48a119e-9715-537e-ba5a-cb2e6ee72cc6 --> `parseNuxtRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, fileContent | `e48a119e...` |
| <!-- coderef:uuid=640edcae-5798-5444-a325-2b34810d298c --> `parseRemixRoute` | `src/analyzer/route-parsers.ts` | ❌ | filePath, exports | `640edcae...` |
| <!-- coderef:uuid=2eac99ad-00a7-506f-82d2-9c9ab7583d96 --> `extractRouteMetadata` | `src/analyzer/route-parsers.ts` | ❌ | code, filePath, exports, line, fileContent | `2eac99ad...` |

*... and 264 more functions. See index.json for complete list.*

---

## Exported Classes (101)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=1625d0fe-c722-542b-99d0-fc34e0ced16a --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `1625d0fe...` |
| <!-- coderef:uuid=18a49471-e7f3-58d2-b2db-3638374226ae --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `18a49471...` |
| <!-- coderef:uuid=42530844-a548-5f7b-a887-3517e55e9fe5 --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `42530844...` |
| <!-- coderef:uuid=64a30b7c-e731-5ded-a8a0-214c31055c89 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `64a30b7c...` |
| <!-- coderef:uuid=fbd961ac-2c14-5993-b9c9-b7371d3c051a --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `fbd961ac...` |
| <!-- coderef:uuid=451e9452-303b-5c3d-8b03-9b5075c0690a --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `451e9452...` |
| <!-- coderef:uuid=34f0fc16-2773-553f-8a31-d638b1c38192 --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `34f0fc16...` |
| <!-- coderef:uuid=f1dc77c7-66da-54a5-8a1b-560af8343bd2 --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `f1dc77c7...` |
| <!-- coderef:uuid=5a4bd9bd-7792-52bf-8806-cea99947d340 --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `5a4bd9bd...` |
| <!-- coderef:uuid=a1d85508-af3b-5c04-9370-1f223a34ef11 --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `a1d85508...` |
| <!-- coderef:uuid=fd3b20ae-44b4-5524-a183-26648a7e8266 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `fd3b20ae...` |
| <!-- coderef:uuid=51bf0532-1274-508c-9d40-41004475f4c5 --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `51bf0532...` |
| <!-- coderef:uuid=280ca531-3cc3-54ac-9908-5d4009c86f58 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `280ca531...` |
| <!-- coderef:uuid=d2339bcb-849f-5b13-8e4c-7df3ae823569 --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `d2339bcb...` |
| <!-- coderef:uuid=f81c0542-bc80-59b2-ab52-968484e37dc0 --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `f81c0542...` |
| <!-- coderef:uuid=87f6aa4b-dfac-55b7-a7a5-f770d4dbb159 --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `87f6aa4b...` |
| <!-- coderef:uuid=124ff4c2-d634-5465-83e3-c3b2b089aee5 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `124ff4c2...` |
| <!-- coderef:uuid=44a322ca-c90d-5ef7-babc-cc07290e7b69 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `44a322ca...` |
| <!-- coderef:uuid=c8753c42-69b2-50d8-b058-f5e123779ce2 --> `ContextGenerator` | `src/context/context-generator.ts` | `c8753c42...` |
| <!-- coderef:uuid=73006523-3288-5d25-9dd5-d9294dfa00a4 --> `ContextTracker` | `src/context/context-tracker.ts` | `73006523...` |
| <!-- coderef:uuid=bf214a1d-2789-573e-ab26-00c79a4f2d09 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `bf214a1d...` |
| <!-- coderef:uuid=f4c15e39-d20e-5f5a-9d19-9eec1b0e7f67 --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `f4c15e39...` |
| <!-- coderef:uuid=17b9a67a-ddab-55ce-995a-c279e059ee17 --> `ExampleExtractor` | `src/context/example-extractor.ts` | `17b9a67a...` |
| <!-- coderef:uuid=397b23c8-bbf3-5add-8f90-9fa43fb5b54d --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `397b23c8...` |
| <!-- coderef:uuid=fbfda8a2-cb2e-54c9-92e4-471d65a4797a --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `fbfda8a2...` |
| <!-- coderef:uuid=339f1a20-83d9-58a7-add6-65c121c75f65 --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `339f1a20...` |
| <!-- coderef:uuid=3d3abea5-5020-56d1-a282-e8c29b97b865 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `3d3abea5...` |
| <!-- coderef:uuid=feb8f302-4a15-5c10-8601-1a500d014770 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `feb8f302...` |
| <!-- coderef:uuid=e53b139a-bef3-5c7c-ae3f-c7a4f1a820f3 --> `GraphExporter` | `src/export/graph-exporter.ts` | `e53b139a...` |
| <!-- coderef:uuid=168a2568-c20f-5222-85b9-e898d833560c --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `168a2568...` |
| <!-- coderef:uuid=534635b4-03ed-5ed3-8e41-d6c8820953ae --> `IndexStore` | `src/indexer/index-store.ts` | `534635b4...` |
| <!-- coderef:uuid=26eadb3a-576f-54bb-8620-b73a988da1a6 --> `IndexerService` | `src/indexer/indexer-service.ts` | `26eadb3a...` |
| <!-- coderef:uuid=0faaf819-7778-5ce8-91f5-e478fb735e5c --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `0faaf819...` |
| <!-- coderef:uuid=5f0b8b12-adae-55c6-b057-92ec654774d4 --> `QueryEngine` | `src/indexer/query-engine.ts` | `5f0b8b12...` |
| <!-- coderef:uuid=9992c1c5-b87d-5857-9a11-83f8dbe39b36 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `9992c1c5...` |
| <!-- coderef:uuid=3e3df4e1-14ed-543a-ac59-0f61dd9b9fb1 --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `3e3df4e1...` |
| <!-- coderef:uuid=16dc1d49-3a3f-5a82-a5b9-9d934dc2fb3e --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `16dc1d49...` |
| <!-- coderef:uuid=461115ae-6922-50eb-a624-dc4eaf8b299e --> `LLMError` | `src/integration/llm/llm-provider.ts` | `461115ae...` |
| <!-- coderef:uuid=29b076fd-2c93-58bd-b1de-b3f3308431ab --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `29b076fd...` |
| <!-- coderef:uuid=9e4afdcc-0952-53c2-88ac-aabb6a22e8b0 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `9e4afdcc...` |
| <!-- coderef:uuid=e5acc2e8-f48f-5920-87cf-35211e058ffb --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `e5acc2e8...` |
| <!-- coderef:uuid=e45da3ea-52a0-5abf-89e5-fa81065d6718 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `e45da3ea...` |
| <!-- coderef:uuid=be937bad-51fd-5fae-a4d5-4ea67a5fc6ea --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `be937bad...` |
| <!-- coderef:uuid=ee046fd5-c21a-5cd9-adac-1293c903f27a --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `ee046fd5...` |
| <!-- coderef:uuid=affa7286-95d7-5c22-bf41-68dbf9104f1d --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `affa7286...` |
| <!-- coderef:uuid=1e068991-78ea-5493-9de7-0eee20b00297 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `1e068991...` |
| <!-- coderef:uuid=56837e2a-0d6e-503c-9d85-e79b11e1d384 --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `56837e2a...` |
| <!-- coderef:uuid=6651d17d-31cf-500b-ae21-161e840d0980 --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `6651d17d...` |
| <!-- coderef:uuid=84063e12-cb68-5295-80b4-57740eced79a --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `84063e12...` |
| <!-- coderef:uuid=d44abc1b-1b4d-5347-ba06-d063f817e67d --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `d44abc1b...` |
| <!-- coderef:uuid=398bdbce-a990-5e6f-b79b-3b13bd85625a --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `398bdbce...` |
| <!-- coderef:uuid=b37bb5b1-f5b6-5e7d-ba53-455b3e2e87f4 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `b37bb5b1...` |
| <!-- coderef:uuid=b2869152-f54d-5b7a-8903-a366868d5230 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `b2869152...` |
| <!-- coderef:uuid=f1a64be4-6fdf-563e-8d69-821910de98a2 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `f1a64be4...` |
| <!-- coderef:uuid=6f4058e6-850c-581a-bc75-b652be4dd32c --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `6f4058e6...` |
| <!-- coderef:uuid=ad0394b5-5f52-5ee5-9cec-4db2c506197f --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `ad0394b5...` |
| <!-- coderef:uuid=56716503-7d07-523d-bf03-a59d6a3f760f --> `ConfigError` | `src/integration/rag/rag-config.ts` | `56716503...` |
| <!-- coderef:uuid=dcf45632-6774-570e-bc39-bb9bcc6c5758 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `dcf45632...` |
| <!-- coderef:uuid=8d23227d-4002-5498-8d94-cc03dce52a11 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `8d23227d...` |
| <!-- coderef:uuid=38ec37b2-0292-52a8-b3c1-01681f404999 --> `SparseRetriever` | `src/integration/rag/sparse-retriever.ts` | `38ec37b2...` |
| <!-- coderef:uuid=c870044a-43cf-5878-9e84-b926acbef73a --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `c870044a...` |
| <!-- coderef:uuid=244bfb7b-b886-54d8-ad3c-18e761f8af1d --> `JsonVectorStore` | `src/integration/vector/json-store.ts` | `244bfb7b...` |
| <!-- coderef:uuid=494772ba-4d63-57ee-9fa5-dbf980e6b245 --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `494772ba...` |
| <!-- coderef:uuid=daddac9a-eebf-52bf-a860-1dd4f318de33 --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `daddac9a...` |
| <!-- coderef:uuid=7beb9296-f48a-5b17-84ff-4493989ecdee --> `MapProjectionError` | `src/map/project-map-data.ts` | `7beb9296...` |
| <!-- coderef:uuid=559101b1-1016-5357-b066-fe95e2c4ffc4 --> `CodeRefParser` | `src/parser/parser.ts` | `559101b1...` |
| <!-- coderef:uuid=523ba0ce-8b89-579c-90ab-b670f95473db --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `523ba0ce...` |
| <!-- coderef:uuid=c1f2698a-6231-5aaf-9ee3-581b02368e4b --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `c1f2698a...` |
| <!-- coderef:uuid=bfbec462-9397-52af-bb79-679342d467ea --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `bfbec462...` |
| <!-- coderef:uuid=ce5bbcaa-b802-51f3-9785-a27955070592 --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `ce5bbcaa...` |
| <!-- coderef:uuid=56a3d644-1146-5980-809f-28270cc31739 --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `56a3d644...` |
| <!-- coderef:uuid=86e36102-f829-57c0-9553-cf5213d88820 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `86e36102...` |
| <!-- coderef:uuid=aca32e51-83c4-50c3-aafb-edfb28c6659d --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `aca32e51...` |
| <!-- coderef:uuid=5017c34a-dade-5f73-9ef1-6b3bb5896354 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `5017c34a...` |
| <!-- coderef:uuid=0220b7d1-0f58-53d8-b54e-26d2bac918db --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `0220b7d1...` |
| <!-- coderef:uuid=1aa3cd87-e979-58d9-9bba-64e3fc2e460a --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `1aa3cd87...` |
| <!-- coderef:uuid=0cd50867-2119-55ca-991c-d1cc01fa1c01 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `0cd50867...` |
| <!-- coderef:uuid=8b3d6777-694e-5b00-95fd-64bfc99b69b8 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `8b3d6777...` |
| <!-- coderef:uuid=309fe7ed-022e-5ec9-af42-33689522ca0e --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `309fe7ed...` |
| <!-- coderef:uuid=cf737e57-b7a5-5c8b-9bd3-62a7f2c44dd7 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `cf737e57...` |
| <!-- coderef:uuid=1a11187a-f26e-594c-8fb4-9dc643c295e0 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `1a11187a...` |
| <!-- coderef:uuid=8e2c4a95-d041-56b3-aecc-c42aa8da876a --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `8e2c4a95...` |
| <!-- coderef:uuid=8b538db6-15d0-5d93-ba0a-36f2e376886d --> `CanonicalGraphError` | `src/query/canonical-graph.ts` | `8b538db6...` |
| <!-- coderef:uuid=18ec28e0-5494-523f-8e2b-9d4278bb2d28 --> `CanonicalGraphQuery` | `src/query/canonical-graph.ts` | `18ec28e0...` |
| <!-- coderef:uuid=9f492d46-06a3-5b0a-8a18-4c2b1cfdf6da --> `EntityRegistry` | `src/registry/entity-registry.ts` | `9f492d46...` |
| <!-- coderef:uuid=c835ec2a-f327-5e68-8ce5-4cfe63fd7109 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `c835ec2a...` |
| <!-- coderef:uuid=bfe8846e-2328-53d2-9606-7e687d39f6e6 --> `LRUCache` | `src/scanner/lru-cache.ts` | `bfe8846e...` |
| <!-- coderef:uuid=270a225e-7b3f-585d-8c5b-afbb184bbd08 --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `270a225e...` |
| <!-- coderef:uuid=1eab290f-e14d-5ae0-8c18-cbd485c595d5 --> `SearchIndex` | `src/search/search-engine.ts` | `1eab290f...` |
| <!-- coderef:uuid=480d3df1-4166-5df0-84aa-bc03fc3b77c3 --> `SearchEngine` | `src/search/search-engine.ts` | `480d3df1...` |
| <!-- coderef:uuid=b87bf3cb-f92e-578e-9937-083e48810dc5 --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `b87bf3cb...` |
| <!-- coderef:uuid=7f9355d0-c534-5215-86ec-73ed07ce9d73 --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `7f9355d0...` |
| <!-- coderef:uuid=cef4c82f-385a-57f3-9ece-62213b28e21f --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `cef4c82f...` |
| <!-- coderef:uuid=28721e0c-465d-53d2-90b1-b1ac16a348ec --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `28721e0c...` |
| <!-- coderef:uuid=54f170d9-87ce-5e6b-aea8-192527eb2376 --> `OpenAI` | `src/types/external-modules.d.ts` | `54f170d9...` |
| <!-- coderef:uuid=310c9678-272c-5a0e-8892-6200316337b5 --> `Anthropic` | `src/types/external-modules.d.ts` | `310c9678...` |
| <!-- coderef:uuid=2148c17b-0341-5cae-9ca1-465eaf90d644 --> `ChromaClient` | `src/types/external-modules.d.ts` | `2148c17b...` |
| <!-- coderef:uuid=a581f70c-59bf-5442-a8f3-c2d5322757a0 --> `Collection` | `src/types/external-modules.d.ts` | `a581f70c...` |
| <!-- coderef:uuid=ad2f1471-7848-59b9-bc52-a01208e404b5 --> `Pinecone` | `src/types/external-modules.d.ts` | `ad2f1471...` |
| <!-- coderef:uuid=b986e3e8-c881-59a8-bff7-aeba5c364738 --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `b986e3e8...` |
| <!-- coderef:uuid=3fb602fd-9a08-55c9-8613-2bb2766912f0 --> `CodeRefValidator` | `src/validator/validator.ts` | `3fb602fd...` |

---

## Exported Interfaces (339)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=223e10c3-ccea-5c01-a2d7-b68f1c4e33ea --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `223e10c3...` |
| <!-- coderef:uuid=1300af11-61a9-5e8e-9890-24131d2f7263 --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `1300af11...` |
| <!-- coderef:uuid=6e7175c5-c58f-5ec3-8bdb-8143f60e3397 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `6e7175c5...` |
| <!-- coderef:uuid=e16cd25b-b4a4-5707-9a31-00b509ac13f8 --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `e16cd25b...` |
| <!-- coderef:uuid=7fbd629f-bc77-540a-b286-47d583b8406a --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `7fbd629f...` |
| <!-- coderef:uuid=37eb63a2-8fd9-5d93-a927-e60dc89e6afa --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `37eb63a2...` |
| <!-- coderef:uuid=baadc650-6621-5283-aa3a-057b40f960c1 --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `baadc650...` |
| <!-- coderef:uuid=f471f254-83b9-503c-83cf-be86b0271742 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `f471f254...` |
| <!-- coderef:uuid=c09b0417-f9b6-578a-9289-345765f99ee4 --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `c09b0417...` |
| <!-- coderef:uuid=fd99d78a-8066-5099-8e1c-0cacd676420c --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `fd99d78a...` |
| <!-- coderef:uuid=d1a33ce9-fbb7-5146-9508-fe01cad6941a --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `d1a33ce9...` |
| <!-- coderef:uuid=862a9a5b-721f-594d-b526-8fcb5437fd7e --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `862a9a5b...` |
| <!-- coderef:uuid=c2db3688-c5fd-5772-8881-31856e4ef040 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `c2db3688...` |
| <!-- coderef:uuid=40527eec-7ef7-5143-af1c-b679988a6403 --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `40527eec...` |
| <!-- coderef:uuid=91691300-019f-5f41-bafe-7ef0535959a6 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `91691300...` |
| <!-- coderef:uuid=6bf69ff5-f2c7-5ee8-9105-b1fc57e24822 --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `6bf69ff5...` |
| <!-- coderef:uuid=b10a7a72-a131-5cf5-8831-42909b33e4d0 --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `b10a7a72...` |
| <!-- coderef:uuid=3f80e534-bbe5-5445-9047-3a5a21813b44 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `3f80e534...` |
| <!-- coderef:uuid=e540c4c7-a6e4-58b3-b708-87b2d0060648 --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `e540c4c7...` |
| <!-- coderef:uuid=746edbd4-d04c-50bb-9d73-cd378b156a61 --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `746edbd4...` |
| <!-- coderef:uuid=d0c8d5c4-1f3b-5af1-a026-3da3d5ef29ab --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `d0c8d5c4...` |
| <!-- coderef:uuid=a08b2fec-139c-569e-b5df-a8f5f3013380 --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `a08b2fec...` |
| <!-- coderef:uuid=c4160f6e-7de1-528a-821c-65872dfe806f --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `c4160f6e...` |
| <!-- coderef:uuid=713503cf-4a11-5491-96a5-c40eca9e98ee --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `713503cf...` |
| <!-- coderef:uuid=6f4fbb02-fadf-5486-a407-f4cb1f8170bf --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `6f4fbb02...` |
| <!-- coderef:uuid=28eeedad-b277-5293-8723-ee6cee6a471f --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `28eeedad...` |
| <!-- coderef:uuid=17c80770-6169-5e9e-8924-5486b4e14c32 --> `ContractAnalysis` | `src/analyzer/contract-detector.ts` | `17c80770...` |
| <!-- coderef:uuid=49028c2b-6ad3-516d-bb35-42c495f3c9d5 --> `PrismaModel` | `src/analyzer/database-detector.ts` | `49028c2b...` |
| <!-- coderef:uuid=d0fa2d27-e6be-5757-8b98-37be3b8659fe --> `PrismaField` | `src/analyzer/database-detector.ts` | `d0fa2d27...` |
| <!-- coderef:uuid=d61b4ee1-44e2-5e0f-a8d9-80ee84f11c9d --> `PrismaRelation` | `src/analyzer/database-detector.ts` | `d61b4ee1...` |

*... and 309 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (44)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=aafb5728-4126-5b05-b53e-478009b92ada --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `aafb5728...` |
| <!-- coderef:uuid=bfe5cea1-07ae-599e-9aa3-e32d3a267cf3 --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `bfe5cea1...` |
| <!-- coderef:uuid=f8ea40a9-bc0a-5514-860d-629a00621f4b --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `f8ea40a9...` |
| <!-- coderef:uuid=96331f7b-b03c-5977-8999-0e03b98a0673 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `96331f7b...` |
| <!-- coderef:uuid=547081e0-c789-5db8-896a-cf7299131c29 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `547081e0...` |
| <!-- coderef:uuid=135d36bc-cbf3-5e0c-aeaf-87ba423c406a --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `135d36bc...` |
| <!-- coderef:uuid=657bc756-1c6e-5e46-8b9f-9f12d7c5b002 --> `FlagKind` | `src/cli/shared/cli-args.ts` | `657bc756...` |
| <!-- coderef:uuid=0be23141-4534-5c5d-8496-9d15e7d02613 --> `ExportFormat` | `src/export/graph-exporter.ts` | `0be23141...` |
| <!-- coderef:uuid=ec4d0421-181d-5a9a-ac54-f7554b5b549e --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `ec4d0421...` |
| <!-- coderef:uuid=2ededd07-d322-5ec1-ba47-c6697e3c43b1 --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `2ededd07...` |
| <!-- coderef:uuid=636ac279-898a-5c53-9139-f3d1e8d05a03 --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `636ac279...` |
| <!-- coderef:uuid=ffb377b7-6e73-54bf-aefa-ec09705f2863 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `ffb377b7...` |
| <!-- coderef:uuid=40590008-aac5-57b9-a9fa-6cc5a724b7b9 --> `IndexingStage` | `src/indexer/indexer-service.ts` | `40590008...` |
| <!-- coderef:uuid=8b5d4c8d-1d06-5d77-8fe9-0c2773286b84 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `8b5d4c8d...` |
| <!-- coderef:uuid=1260da3c-b61d-5092-acb2-f06fef3cbbe9 --> `QueryFilter` | `src/indexer/query-engine.ts` | `1260da3c...` |
| <!-- coderef:uuid=8c03ed9c-6f3d-5ec0-b110-fdacc2bc1613 --> `RelationshipType` | `src/indexer/relationship-index.ts` | `8c03ed9c...` |
| <!-- coderef:uuid=b5f5bc43-64a4-543e-9018-c8ce52a5223c --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `b5f5bc43...` |
| <!-- coderef:uuid=e614b5a4-2d99-544f-9c5b-4b127f1dd1dd --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `e614b5a4...` |
| <!-- coderef:uuid=fee41cb3-b087-5dc1-a25a-10c00c98548a --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `fee41cb3...` |
| <!-- coderef:uuid=e662e57e-02bc-5be3-aaa7-1f403e1df7a2 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `e662e57e...` |
| <!-- coderef:uuid=01ab8945-3105-591f-9f07-977e36309836 --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `01ab8945...` |
| <!-- coderef:uuid=9e49cce5-ca0a-59a0-98c8-6738467ca2f1 --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `9e49cce5...` |
| <!-- coderef:uuid=6b43c9f2-ee82-57eb-98f3-9ed9cc3124a8 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `6b43c9f2...` |
| <!-- coderef:uuid=bd4861d7-0d18-528e-bcc1-778264c572f2 --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `bd4861d7...` |
| <!-- coderef:uuid=5b5b3018-2c7e-54c0-818f-74fda789aa41 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `5b5b3018...` |
| <!-- coderef:uuid=d3713b85-895e-5cb3-90f0-6bb053918992 --> `RelativePath` | `src/integration/rag/path-types.ts` | `d3713b85...` |
| <!-- coderef:uuid=fc5a9f8c-9c2f-54df-8716-d27e062a4840 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `fc5a9f8c...` |
| <!-- coderef:uuid=e58a30e0-02ab-5d9d-b756-c9faf5c82fa0 --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `e58a30e0...` |
| <!-- coderef:uuid=e0f820da-9bd3-50df-893c-d232d8771791 --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `e0f820da...` |
| <!-- coderef:uuid=7fd1b216-0818-5760-88ee-cac8248548e6 --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `7fd1b216...` |
| <!-- coderef:uuid=4c496708-f0f3-5a30-bab5-1d6567dbdb2f --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `4c496708...` |
| <!-- coderef:uuid=b80de943-3115-53cb-90f4-d7acdefa0791 --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `b80de943...` |
| <!-- coderef:uuid=151e8387-d00b-5de2-a54c-69e2110d730c --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `151e8387...` |
| <!-- coderef:uuid=1bd3121f-eb82-5a47-a0d8-9601b349efe5 --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `1bd3121f...` |
| <!-- coderef:uuid=bd36983c-10e9-51a8-bc1f-3fffe4eb035a --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `bd36983c...` |
| <!-- coderef:uuid=61131750-9315-5e71-8e8c-377299fe5bbc --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `61131750...` |
| <!-- coderef:uuid=d175c932-c821-511d-88fc-0c6cc81579ee --> `ExportTable` | `src/pipeline/import-resolver.ts` | `d175c932...` |
| <!-- coderef:uuid=cca65e74-0ec4-5d2f-922e-ba0397924974 --> `LanguageExtension` | `src/pipeline/types.ts` | `cca65e74...` |
| <!-- coderef:uuid=0543c963-48fb-58c5-a74e-9c711ca4213f --> `RawExportKind` | `src/pipeline/types.ts` | `0543c963...` |
| <!-- coderef:uuid=1ce94088-4c5e-5666-b492-fcb31f005850 --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `1ce94088...` |
| <!-- coderef:uuid=ee0535e8-c87c-591c-8309-ba36bc7575b3 --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `ee0535e8...` |
| <!-- coderef:uuid=e3d30f38-2f15-5429-bef7-95f2924e9c5e --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `e3d30f38...` |
| <!-- coderef:uuid=5215131a-9534-518e-973f-d424b9c2bbfa --> `LogLevel` | `src/utils/logger.ts` | `5215131a...` |
| <!-- coderef:uuid=8b525b7e-2b97-5d11-a33f-3d81fba3723d --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `8b525b7e...` |

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
