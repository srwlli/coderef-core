---
subject: Public API Reference — @coderef/core
status: generated
generator: scripts/doc-gen/generate-exports-md.js
documents:
  - dist-old/src/analyzer/contract-detector.d.ts
  - dist-old/src/analyzer/database-detector.d.ts
  - dist-old/src/context/types.d.ts
  - dist-old/src/integration/rag/indexing-orchestrator.d.ts
  - dist-old/src/types/types.d.ts
  - src/analyzer/config-analyzer.ts
  - src/analyzer/contract-detector.ts
  - src/analyzer/database-detector.ts
  - src/cli/mcp-response-format.ts
  - src/cli/mcp/shared.ts
  - src/context/types.ts
  - src/generator/generateRoutes.ts
  - src/integration/rag/indexing-orchestrator.ts
  - src/map/git-history.ts
  - src/pipeline/call-resolver.ts
  - src/pipeline/types.ts
  - src/query/type-hierarchy.ts
  - src/types/types.ts
  - src/validator/frontend-update-generator.ts
  - src/validator/migration-mapper.ts
documents_truncated: 20 of 405 export-bearing files listed
---

# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-08-01  
**Total Exported:** 1,937 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **437** | 1533 | 1970 |
| constant | **114** | 365 | 479 |
| interface | **1042** | 124 | 1166 |
| type | **140** | 36 | 176 |
| class | **204** | 111 | 315 |

---

## Exported Functions (437)

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
| <!-- coderef:uuid=8cefb59c-0cb9-5a39-bf1f-2b2bd3c0404c --> `buildCallEdges` | `src/analyzer/js-call-detector/analyzer.ts` | ❌ | callsByFile, elementMap | `8cefb59c...` |
| <!-- coderef:uuid=bbb97f89-2064-5b94-857b-cd35418a2c06 --> `analyzeCallPatterns` | `src/analyzer/js-call-detector/analyzer.ts` | ❌ | callsByFile | `bbb97f89...` |
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

*... and 387 more functions. See index.json for complete list.*

---

## Exported Classes (204)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=4992729f-cd77-5406-bef6-2d72f999c32d --> `ASTElementScanner` | `dist-old/src/analyzer/ast-element-scanner.d.ts` | `4992729f...` |
| <!-- coderef:uuid=14fae55b-f1c3-54a2-84dd-e22e719586aa --> `ConfigAnalyzer` | `dist-old/src/analyzer/config-analyzer.d.ts` | `14fae55b...` |
| <!-- coderef:uuid=bdabc84b-c7e6-5cca-a0e9-0f2a5ffd79d7 --> `ContractDetector` | `dist-old/src/analyzer/contract-detector.d.ts` | `bdabc84b...` |
| <!-- coderef:uuid=4da8e017-f950-59ec-b1cb-64f69cb3e985 --> `DatabaseDetector` | `dist-old/src/analyzer/database-detector.d.ts` | `4da8e017...` |
| <!-- coderef:uuid=f2fec8aa-dd39-5380-8cc1-d88c4c4698ef --> `DependencyAnalyzer` | `dist-old/src/analyzer/dependency-analyzer.d.ts` | `f2fec8aa...` |
| <!-- coderef:uuid=7269c171-9ee2-5b9b-a042-2cdac55b139f --> `DesignPatternDetector` | `dist-old/src/analyzer/design-pattern-detector.d.ts` | `7269c171...` |
| <!-- coderef:uuid=4698c106-c53f-5bc5-9d89-fdc85d8263e4 --> `DocsAnalyzer` | `dist-old/src/analyzer/docs-analyzer.d.ts` | `4698c106...` |
| <!-- coderef:uuid=09d09ac8-df32-5842-9f81-7bbf5733dc48 --> `DynamicImportDetector` | `dist-old/src/analyzer/dynamic-import-detector.d.ts` | `09d09ac8...` |
| <!-- coderef:uuid=ee9e15ec-73f6-5863-9c96-8ea52e7cdd17 --> `EntryPointDetector` | `dist-old/src/analyzer/entry-detector.d.ts` | `ee9e15ec...` |
| <!-- coderef:uuid=efda1bca-d2b5-5aa2-bc4c-d319ed15d9a6 --> `JSCallDetector` | `dist-old/src/analyzer/js-call-detector/index.d.ts` | `efda1bca...` |
| <!-- coderef:uuid=58b11c94-7a90-5c22-8f30-67ae9f5354fd --> `MiddlewareDetector` | `dist-old/src/analyzer/middleware-detector.d.ts` | `58b11c94...` |
| <!-- coderef:uuid=921818b9-13b3-5ffc-bc93-77ae5c0e8c54 --> `MigrationRouteAnalyzer` | `dist-old/src/analyzer/migration-route-analyzer.d.ts` | `921818b9...` |
| <!-- coderef:uuid=47b02638-177c-5f27-b51f-87de9b55c119 --> `ProjectClassifier` | `dist-old/src/analyzer/project-classifier.d.ts` | `47b02638...` |
| <!-- coderef:uuid=2242ce11-e182-513a-8d60-bc655795502c --> `IncrementalCache` | `dist-old/src/cache/incremental-cache.d.ts` | `2242ce11...` |
| <!-- coderef:uuid=7a0686eb-39e6-51cf-ae73-1e3fd674d6d1 --> `BuildHintError` | `dist-old/src/cli/mcp/shared.d.ts` | `7a0686eb...` |
| <!-- coderef:uuid=4b65c426-309a-5dc3-913f-a0a8445b6dfa --> `DryRunSemanticOrchestrator` | `dist-old/src/cli/semantic-integration.d.ts` | `4b65c426...` |
| <!-- coderef:uuid=6dd1584a-7034-5115-b2f4-7d0f48f0cf69 --> `AgenticFormatter` | `dist-old/src/context/agentic-formatter.d.ts` | `6dd1584a...` |
| <!-- coderef:uuid=784b1670-24a2-5c9e-917c-b7ea96826656 --> `BreakingChangeDetector` | `dist-old/src/context/breaking-change-detector/index.d.ts` | `784b1670...` |
| <!-- coderef:uuid=697c123a-988a-551b-aa0f-398bbe0b468f --> `ComplexityScorer` | `dist-old/src/context/complexity-scorer.d.ts` | `697c123a...` |
| <!-- coderef:uuid=9ea299df-de93-58f7-b35b-b5f5be641c57 --> `CodebaseContextService` | `dist-old/src/context/context-generator.d.ts` | `9ea299df...` |
| <!-- coderef:uuid=58bbaf0b-6177-5650-bab7-645c357b6433 --> `ContextTracker` | `dist-old/src/context/context-tracker.d.ts` | `58bbaf0b...` |
| <!-- coderef:uuid=0972d403-2172-55a5-914b-8595a58b2ddf --> `EdgeCaseDetector` | `dist-old/src/context/edge-case-detector.d.ts` | `0972d403...` |
| <!-- coderef:uuid=b213ad86-07d3-5261-ada4-ce24f2a42e10 --> `EntryPointDetector` | `dist-old/src/context/entry-point-detector.d.ts` | `b213ad86...` |
| <!-- coderef:uuid=b32de993-50d7-52f4-a766-d99286a82223 --> `ExampleExtractor` | `dist-old/src/context/example-extractor.d.ts` | `b32de993...` |
| <!-- coderef:uuid=d8d28015-063d-5347-bf1a-832aacb6c258 --> `FuzzyResolver` | `dist-old/src/context/fuzzy-resolver.d.ts` | `d8d28015...` |
| <!-- coderef:uuid=247eab62-6f87-57cd-87f3-96386482f7bc --> `ImpactSimulator` | `dist-old/src/context/impact-simulator.d.ts` | `247eab62...` |
| <!-- coderef:uuid=f3f17e9e-d92e-5569-9fe2-c4640cccf84c --> `MarkdownFormatter` | `dist-old/src/context/markdown-formatter.d.ts` | `f3f17e9e...` |
| <!-- coderef:uuid=c9e55738-1e1a-51f1-a8e1-b582f1fa9b01 --> `TaskContextGenerator` | `dist-old/src/context/task-context-generator.d.ts` | `c9e55738...` |
| <!-- coderef:uuid=dbc89e4b-630b-5772-a6a7-3a00928d2a62 --> `TestPatternAnalyzer` | `dist-old/src/context/test-pattern-analyzer.d.ts` | `dbc89e4b...` |
| <!-- coderef:uuid=0aa31f81-1053-5381-8aa5-1b66ecbb549b --> `GraphExporter` | `dist-old/src/export/graph-exporter.d.ts` | `0aa31f81...` |
| <!-- coderef:uuid=d9bfbfc1-0035-50f2-a10e-d658ce8284c7 --> `CodeRefFormatter` | `dist-old/src/formatter/formatter.d.ts` | `d9bfbfc1...` |
| <!-- coderef:uuid=bf2058cd-d8b8-5b19-8674-346267344e5d --> `IndexStore` | `dist-old/src/indexer/index-store.d.ts` | `bf2058cd...` |
| <!-- coderef:uuid=e77b8bcd-857b-5acf-994a-dd9bc645030e --> `IndexerService` | `dist-old/src/indexer/indexer-service.d.ts` | `e77b8bcd...` |
| <!-- coderef:uuid=1f159c00-d7bd-58db-96e6-d0119e738025 --> `MetadataIndex` | `dist-old/src/indexer/metadata-index.d.ts` | `1f159c00...` |
| <!-- coderef:uuid=d43cbc18-2a77-5b48-8cf1-a1b4b912c28b --> `QueryEngine` | `dist-old/src/indexer/query-engine.d.ts` | `d43cbc18...` |
| <!-- coderef:uuid=6d96461b-00b1-5d0c-b69b-37f952bbe808 --> `RelationshipIndex` | `dist-old/src/indexer/relationship-index.d.ts` | `6d96461b...` |
| <!-- coderef:uuid=0d7418fb-9395-5ca1-ac3b-b3b15328e155 --> `AIPromptGenerator` | `dist-old/src/integration/ai-prompt-generator.d.ts` | `0d7418fb...` |
| <!-- coderef:uuid=9fe0ad7f-60e2-5dab-907a-c90e4b34138d --> `AnthropicProvider` | `dist-old/src/integration/llm/anthropic-provider.d.ts` | `9fe0ad7f...` |
| <!-- coderef:uuid=76acdc60-9506-5268-b659-d5a5c9c17477 --> `LLMError` | `dist-old/src/integration/llm/llm-provider.d.ts` | `76acdc60...` |
| <!-- coderef:uuid=d01cab2a-54a1-5165-aca2-356b7e602868 --> `ProviderDoesNotSupportEmbeddings` | `dist-old/src/integration/llm/model-registry.d.ts` | `d01cab2a...` |
| <!-- coderef:uuid=bb602a15-af7f-5b2a-9db1-b974f765cff4 --> `OllamaProvider` | `dist-old/src/integration/llm/ollama-provider.d.ts` | `bb602a15...` |
| <!-- coderef:uuid=f81d146c-49ba-5700-b5dc-b815ce878a34 --> `OpenAIProvider` | `dist-old/src/integration/llm/openai-provider.d.ts` | `f81d146c...` |
| <!-- coderef:uuid=11b31570-78f2-5d72-8a79-c51ec23a2d5c --> `Cls0` | `dist-old/src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.d.ts` | `11b31570...` |
| <!-- coderef:uuid=dab88c94-a63f-5817-871d-7efa56fdd97f --> `Cls1` | `dist-old/src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.d.ts` | `dab88c94...` |
| <!-- coderef:uuid=89a0ec9e-522e-5e10-9f65-58e674f759f9 --> `Cls2` | `dist-old/src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.d.ts` | `89a0ec9e...` |
| <!-- coderef:uuid=0fc305f5-82f5-5a04-9bb4-8d6a000cc6a8 --> `AnswerGenerationService` | `dist-old/src/integration/rag/answer-generation-service.d.ts` | `0fc305f5...` |
| <!-- coderef:uuid=bedc00d6-c968-57bd-b419-636e4b6bfa3a --> `ChunkConverter` | `dist-old/src/integration/rag/chunk-converter.d.ts` | `bedc00d6...` |
| <!-- coderef:uuid=d20fc568-1a0d-501b-917d-caf3e760e43b --> `ConfidenceScorer` | `dist-old/src/integration/rag/confidence-scorer.d.ts` | `d20fc568...` |
| <!-- coderef:uuid=152c58a3-95a5-50c6-ac6e-2e17e7760a30 --> `ContextBuilder` | `dist-old/src/integration/rag/context-builder.d.ts` | `152c58a3...` |
| <!-- coderef:uuid=a60678d6-b0f1-5a70-8cd4-daf2dcc03ce0 --> `ConversationManager` | `dist-old/src/integration/rag/conversation-manager.d.ts` | `a60678d6...` |
| <!-- coderef:uuid=89479d36-bae6-5517-96b4-17b5d4ed038f --> `EmbeddingCache` | `dist-old/src/integration/rag/embedding-cache.d.ts` | `89479d36...` |
| <!-- coderef:uuid=31c2fffe-7f5d-53a6-8c18-f6c7f9022f85 --> `EmbeddingService` | `dist-old/src/integration/rag/embedding-service.d.ts` | `31c2fffe...` |
| <!-- coderef:uuid=7da3af5c-2e84-55a0-9e09-28b911a5120b --> `EmbeddingTextGenerator` | `dist-old/src/integration/rag/embedding-text-generator.d.ts` | `7da3af5c...` |
| <!-- coderef:uuid=d90668d5-5166-5bb5-beeb-5ec9df5f7c50 --> `GraphReRanker` | `dist-old/src/integration/rag/graph-reranker.d.ts` | `d90668d5...` |
| <!-- coderef:uuid=297d63d7-a2f2-5a98-a6cf-6dfa90c4ddcd --> `IncrementalIndexer` | `dist-old/src/integration/rag/incremental-indexer.d.ts` | `297d63d7...` |
| <!-- coderef:uuid=8bd40615-43ee-543f-8a06-7f291a432ea5 --> `IndexingOrchestrator` | `dist-old/src/integration/rag/indexing-orchestrator.d.ts` | `8bd40615...` |
| <!-- coderef:uuid=432bd229-b47c-5a22-b0cb-d14c67522ec6 --> `PromptTemplateBuilder` | `dist-old/src/integration/rag/prompt-templates.d.ts` | `432bd229...` |
| <!-- coderef:uuid=4fef8b4e-0f70-5a11-a300-a787ae1dc9b8 --> `PromptValidator` | `dist-old/src/integration/rag/prompt-templates.d.ts` | `4fef8b4e...` |
| <!-- coderef:uuid=6dadc5bd-b533-5cf4-9eb9-fe520596c714 --> `ConfigError` | `dist-old/src/integration/rag/rag-config.d.ts` | `6dadc5bd...` |
| <!-- coderef:uuid=65e2a3ad-6cd6-5b1b-b446-098b7b65a552 --> `RAGConfigLoader` | `dist-old/src/integration/rag/rag-config.d.ts` | `65e2a3ad...` |
| <!-- coderef:uuid=a6c962d3-3f5f-53f3-9640-9c9dc561bb63 --> `SemanticSearchService` | `dist-old/src/integration/rag/semantic-search.d.ts` | `a6c962d3...` |
| <!-- coderef:uuid=9d17690c-b459-51e8-8d5c-0f68a6a831f6 --> `SparseRetriever` | `dist-old/src/integration/rag/sparse-retriever.d.ts` | `9d17690c...` |
| <!-- coderef:uuid=f089f856-4b7e-5590-8747-c731d88cde2c --> `ScipDecodeError` | `dist-old/src/integration/scip/scip-schema.d.ts` | `f089f856...` |
| <!-- coderef:uuid=98aadcb7-2aa5-5e4f-bae2-25e0a30636c5 --> `ChromaStore` | `dist-old/src/integration/vector/chroma-store.d.ts` | `98aadcb7...` |
| <!-- coderef:uuid=e2f320c1-f761-5839-a347-efa14a9578de --> `JsonVectorStore` | `dist-old/src/integration/vector/json-store.d.ts` | `e2f320c1...` |
| <!-- coderef:uuid=d120f9a1-4ef8-50ea-bf07-b9f1971e1d7d --> `PineconeStore` | `dist-old/src/integration/vector/pinecone-store.d.ts` | `d120f9a1...` |
| <!-- coderef:uuid=bf1d420c-1b7f-58e7-a22c-addaf953fe19 --> `VectorStoreError` | `dist-old/src/integration/vector/vector-store.d.ts` | `bf1d420c...` |
| <!-- coderef:uuid=dbe5f720-0286-567c-a9b8-a43c41ff8338 --> `MapProjectionError` | `dist-old/src/map/project-map-data.d.ts` | `dbe5f720...` |
| <!-- coderef:uuid=58109b54-e539-5812-98bd-e7ade7dc4458 --> `CodeRefParser` | `dist-old/src/parser/parser.d.ts` | `58109b54...` |
| <!-- coderef:uuid=56a80459-59e6-5f30-b0d5-be51d004556e --> `ElementExtractor` | `dist-old/src/pipeline/extractors/element-extractor.d.ts` | `56a80459...` |
| <!-- coderef:uuid=f45c81c5-9f91-58b1-bc69-14f45f918155 --> `RelationshipExtractor` | `dist-old/src/pipeline/extractors/relationship-extractor.d.ts` | `f45c81c5...` |
| <!-- coderef:uuid=65dc4066-1d78-5b32-ab5a-44c223cc6af4 --> `RouteExtractor` | `dist-old/src/pipeline/extractors/route-extractor.d.ts` | `65dc4066...` |
| <!-- coderef:uuid=1c4d60ea-9a29-54ef-95ba-5758848dfa2c --> `ComplexityGenerator` | `dist-old/src/pipeline/generators/complexity-generator.d.ts` | `1c4d60ea...` |
| <!-- coderef:uuid=20dc7908-7137-5e85-9c93-27ee03d6a66f --> `PipelineContextGenerator` | `dist-old/src/pipeline/generators/context-generator.d.ts` | `20dc7908...` |
| <!-- coderef:uuid=e0b80711-a058-5565-b320-caf9dc736e12 --> `CoverageGenerator` | `dist-old/src/pipeline/generators/coverage-generator.d.ts` | `e0b80711...` |
| <!-- coderef:uuid=c9cadf2f-6ed8-58aa-bde5-c08557ef0a70 --> `DiagramGenerator` | `dist-old/src/pipeline/generators/diagram-generator.d.ts` | `c9cadf2f...` |
| <!-- coderef:uuid=affd90ad-a85e-5a20-9698-599ad4e5d85a --> `DriftGenerator` | `dist-old/src/pipeline/generators/drift-generator.d.ts` | `affd90ad...` |
| <!-- coderef:uuid=5c470dc9-9bd1-5615-be9a-69f7e52273f5 --> `ExportGenerator` | `dist-old/src/pipeline/generators/export-generator.d.ts` | `5c470dc9...` |
| <!-- coderef:uuid=97ddfa51-0730-5c29-b527-eb3eb02c6314 --> `GraphGenerator` | `dist-old/src/pipeline/generators/graph-generator.d.ts` | `97ddfa51...` |
| <!-- coderef:uuid=6549caba-5720-595f-8a59-4717ee2744ca --> `HealthGenerator` | `dist-old/src/pipeline/generators/health-generator.d.ts` | `6549caba...` |
| <!-- coderef:uuid=b071ca20-a4f2-5138-a340-e213926d0db1 --> `IndexGenerator` | `dist-old/src/pipeline/generators/index-generator.d.ts` | `b071ca20...` |
| <!-- coderef:uuid=0993ad61-0eac-5da6-b326-995b0455c1f7 --> `PatternGenerator` | `dist-old/src/pipeline/generators/pattern-generator.d.ts` | `0993ad61...` |
| <!-- coderef:uuid=0396e3ff-80f7-52ff-9fce-fc8072b11dbb --> `RegistryGenerator` | `dist-old/src/pipeline/generators/registry-generator.d.ts` | `0396e3ff...` |
| <!-- coderef:uuid=ba110d64-cb97-59ed-b312-6cbc01768b45 --> `RoutesGenerator` | `dist-old/src/pipeline/generators/routes-generator.d.ts` | `ba110d64...` |
| <!-- coderef:uuid=ed55234c-5949-56ed-81a5-c36df0f895cb --> `ValidationGenerator` | `dist-old/src/pipeline/generators/validation-generator.d.ts` | `ed55234c...` |
| <!-- coderef:uuid=c6ad27f1-b5aa-5607-a5be-cf3f17b983c3 --> `GrammarRegistry` | `dist-old/src/pipeline/grammar-registry.d.ts` | `c6ad27f1...` |
| <!-- coderef:uuid=b60684db-dc38-5d85-97eb-7cc44302111a --> `PipelineOrchestrator` | `dist-old/src/pipeline/orchestrator.d.ts` | `b60684db...` |
| <!-- coderef:uuid=1dbec291-d06c-5ec8-bbf7-0c4b46a3b3aa --> `CanonicalGraphError` | `dist-old/src/query/canonical-graph.d.ts` | `1dbec291...` |
| <!-- coderef:uuid=66db8184-3b35-5670-a9ab-7bee69d1845e --> `CanonicalGraphQuery` | `dist-old/src/query/canonical-graph.d.ts` | `66db8184...` |
| <!-- coderef:uuid=97fedab1-6edd-5398-ae1c-143610432b21 --> `EntityRegistry` | `dist-old/src/registry/entity-registry.d.ts` | `97fedab1...` |
| <!-- coderef:uuid=d206a1b0-bfbb-5648-8f18-45159a2d8566 --> `FileWatcher` | `dist-old/src/scanner/file-watcher.d.ts` | `d206a1b0...` |
| <!-- coderef:uuid=abd34885-6223-5471-a6cc-658eafdf5379 --> `LRUCache` | `dist-old/src/scanner/lru-cache.d.ts` | `abd34885...` |
| <!-- coderef:uuid=7571bf88-749b-52e6-bc2a-b08153795dcd --> `SearchIndex` | `dist-old/src/search/search-engine.d.ts` | `7571bf88...` |
| <!-- coderef:uuid=6683bb42-aa03-5bb3-bd4d-70d738889172 --> `SearchEngine` | `dist-old/src/search/search-engine.d.ts` | `6683bb42...` |
| <!-- coderef:uuid=d56ae308-da82-5047-972d-0d7638de084c --> `ASTExtractor` | `dist-old/src/semantic/ast-extractor.d.ts` | `d56ae308...` |
| <!-- coderef:uuid=3b4aa3f8-c066-5e7e-81f8-b922df7519eb --> `HeaderGenerator` | `dist-old/src/semantic/header-generator.d.ts` | `3b4aa3f8...` |
| <!-- coderef:uuid=606f3e88-de32-57fe-abe7-03ffe7821f4c --> `SemanticOrchestrator` | `dist-old/src/semantic/orchestrator.d.ts` | `606f3e88...` |
| <!-- coderef:uuid=72440b35-bdb3-517d-bce5-e42b0894ca01 --> `RegistrySyncer` | `dist-old/src/semantic/registry-sync.d.ts` | `72440b35...` |
| <!-- coderef:uuid=ba712ac4-91dd-513a-8440-e180671c2e76 --> `SemanticParameterMapper` | `dist-old/src/validator/migration-mapper.d.ts` | `ba712ac4...` |
| <!-- coderef:uuid=92c59170-9ad3-5437-8a1e-caf383a51454 --> `CodeRefValidator` | `dist-old/src/validator/validator.d.ts` | `92c59170...` |
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
| <!-- coderef:uuid=9215a8e0-545b-57fa-81a1-e572f1cc2b62 --> `BuildHintError` | `src/cli/mcp/shared.ts` | `9215a8e0...` |
| <!-- coderef:uuid=c8c1d36f-a3f2-51a2-990b-8208ba05bd9f --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `c8c1d36f...` |
| <!-- coderef:uuid=87f6aa4b-dfac-55b7-a7a5-f770d4dbb159 --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `87f6aa4b...` |
| <!-- coderef:uuid=124ff4c2-d634-5465-83e3-c3b2b089aee5 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `124ff4c2...` |
| <!-- coderef:uuid=ab4438a4-59b3-5a3b-a755-9209d1a26861 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `ab4438a4...` |
| <!-- coderef:uuid=b0f65dee-b782-5313-9e38-56253eb68a3f --> `CodebaseContextService` | `src/context/context-generator.ts` | `b0f65dee...` |
| <!-- coderef:uuid=73006523-3288-5d25-9dd5-d9294dfa00a4 --> `ContextTracker` | `src/context/context-tracker.ts` | `73006523...` |
| <!-- coderef:uuid=bf214a1d-2789-573e-ab26-00c79a4f2d09 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `bf214a1d...` |
| <!-- coderef:uuid=f4c15e39-d20e-5f5a-9d19-9eec1b0e7f67 --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `f4c15e39...` |
| <!-- coderef:uuid=17b9a67a-ddab-55ce-995a-c279e059ee17 --> `ExampleExtractor` | `src/context/example-extractor.ts` | `17b9a67a...` |
| <!-- coderef:uuid=397b23c8-bbf3-5add-8f90-9fa43fb5b54d --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `397b23c8...` |
| <!-- coderef:uuid=fbfda8a2-cb2e-54c9-92e4-471d65a4797a --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `fbfda8a2...` |
| <!-- coderef:uuid=339f1a20-83d9-58a7-add6-65c121c75f65 --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `339f1a20...` |
| <!-- coderef:uuid=3d3abea5-5020-56d1-a282-e8c29b97b865 --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `3d3abea5...` |
| <!-- coderef:uuid=feb8f302-4a15-5c10-8601-1a500d014770 --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `feb8f302...` |
| <!-- coderef:uuid=1d9273c9-f5cd-5694-a16d-a68f7889f459 --> `GraphExporter` | `src/export/graph-exporter.ts` | `1d9273c9...` |
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
| <!-- coderef:uuid=64d83c66-6de6-5e26-bb5c-95e6f7cf3855 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `64d83c66...` |
| <!-- coderef:uuid=e5acc2e8-f48f-5920-87cf-35211e058ffb --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `e5acc2e8...` |
| <!-- coderef:uuid=e45da3ea-52a0-5abf-89e5-fa81065d6718 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `e45da3ea...` |
| <!-- coderef:uuid=be937bad-51fd-5fae-a4d5-4ea67a5fc6ea --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `be937bad...` |
| <!-- coderef:uuid=ee046fd5-c21a-5cd9-adac-1293c903f27a --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `ee046fd5...` |
| <!-- coderef:uuid=affa7286-95d7-5c22-bf41-68dbf9104f1d --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `affa7286...` |
| <!-- coderef:uuid=1e068991-78ea-5493-9de7-0eee20b00297 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `1e068991...` |
| <!-- coderef:uuid=56837e2a-0d6e-503c-9d85-e79b11e1d384 --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `56837e2a...` |
| <!-- coderef:uuid=6651d17d-31cf-500b-ae21-161e840d0980 --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `6651d17d...` |
| <!-- coderef:uuid=84063e12-cb68-5295-80b4-57740eced79a --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `84063e12...` |
| <!-- coderef:uuid=767755a8-6974-5ac3-90ee-3fb3422abb78 --> `EmbeddingCache` | `src/integration/rag/embedding-cache.ts` | `767755a8...` |
| <!-- coderef:uuid=b498b4f7-3112-5aa6-91ae-56c6a872c0a7 --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `b498b4f7...` |
| <!-- coderef:uuid=398bdbce-a990-5e6f-b79b-3b13bd85625a --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `398bdbce...` |
| <!-- coderef:uuid=b37bb5b1-f5b6-5e7d-ba53-455b3e2e87f4 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `b37bb5b1...` |
| <!-- coderef:uuid=b2869152-f54d-5b7a-8903-a366868d5230 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `b2869152...` |
| <!-- coderef:uuid=40be5b86-8547-5e2c-ba6a-8f325f5b8b2d --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `40be5b86...` |
| <!-- coderef:uuid=6f4058e6-850c-581a-bc75-b652be4dd32c --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `6f4058e6...` |
| <!-- coderef:uuid=ad0394b5-5f52-5ee5-9cec-4db2c506197f --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `ad0394b5...` |
| <!-- coderef:uuid=56716503-7d07-523d-bf03-a59d6a3f760f --> `ConfigError` | `src/integration/rag/rag-config.ts` | `56716503...` |
| <!-- coderef:uuid=dcf45632-6774-570e-bc39-bb9bcc6c5758 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `dcf45632...` |
| <!-- coderef:uuid=8d23227d-4002-5498-8d94-cc03dce52a11 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `8d23227d...` |
| <!-- coderef:uuid=38ec37b2-0292-52a8-b3c1-01681f404999 --> `SparseRetriever` | `src/integration/rag/sparse-retriever.ts` | `38ec37b2...` |
| <!-- coderef:uuid=f8255f3d-2a18-5432-9831-b98d622fb99d --> `ScipDecodeError` | `src/integration/scip/scip-schema.ts` | `f8255f3d...` |
| <!-- coderef:uuid=c870044a-43cf-5878-9e84-b926acbef73a --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `c870044a...` |
| <!-- coderef:uuid=244bfb7b-b886-54d8-ad3c-18e761f8af1d --> `JsonVectorStore` | `src/integration/vector/json-store.ts` | `244bfb7b...` |
| <!-- coderef:uuid=494772ba-4d63-57ee-9fa5-dbf980e6b245 --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `494772ba...` |
| <!-- coderef:uuid=daddac9a-eebf-52bf-a860-1dd4f318de33 --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `daddac9a...` |
| <!-- coderef:uuid=2bd12fd8-d09d-50b5-8592-59e8873fe552 --> `MapProjectionError` | `src/map/project-map-data.ts` | `2bd12fd8...` |
| <!-- coderef:uuid=559101b1-1016-5357-b066-fe95e2c4ffc4 --> `CodeRefParser` | `src/parser/parser.ts` | `559101b1...` |
| <!-- coderef:uuid=cceb75a6-7dac-548a-8b68-24ba5998c408 --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `cceb75a6...` |
| <!-- coderef:uuid=f10a5be1-34a6-5b8e-bfd7-6985a436e4dc --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `f10a5be1...` |
| <!-- coderef:uuid=08a4962a-b9cf-543e-a36f-c2512d41cbf8 --> `RouteExtractor` | `src/pipeline/extractors/route-extractor.ts` | `08a4962a...` |
| <!-- coderef:uuid=0ef9b097-35f1-5d83-be25-98bb0edc1755 --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `0ef9b097...` |
| <!-- coderef:uuid=3c0af8ad-e830-5f5e-b217-e57052357bfa --> `PipelineContextGenerator` | `src/pipeline/generators/context-generator.ts` | `3c0af8ad...` |
| <!-- coderef:uuid=56a3d644-1146-5980-809f-28270cc31739 --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `56a3d644...` |
| <!-- coderef:uuid=86e36102-f829-57c0-9553-cf5213d88820 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `86e36102...` |
| <!-- coderef:uuid=aca32e51-83c4-50c3-aafb-edfb28c6659d --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `aca32e51...` |
| <!-- coderef:uuid=5017c34a-dade-5f73-9ef1-6b3bb5896354 --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `5017c34a...` |
| <!-- coderef:uuid=5caae6e6-c610-56cc-9ec5-02b296723b15 --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `5caae6e6...` |
| <!-- coderef:uuid=1aa3cd87-e979-58d9-9bba-64e3fc2e460a --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `1aa3cd87...` |
| <!-- coderef:uuid=0cd50867-2119-55ca-991c-d1cc01fa1c01 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `0cd50867...` |
| <!-- coderef:uuid=8b3d6777-694e-5b00-95fd-64bfc99b69b8 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `8b3d6777...` |
| <!-- coderef:uuid=309fe7ed-022e-5ec9-af42-33689522ca0e --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `309fe7ed...` |
| <!-- coderef:uuid=d095dea2-1b87-5223-9fd7-1cbf95895ad1 --> `RoutesGenerator` | `src/pipeline/generators/routes-generator.ts` | `d095dea2...` |
| <!-- coderef:uuid=cf737e57-b7a5-5c8b-9bd3-62a7f2c44dd7 --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `cf737e57...` |
| <!-- coderef:uuid=1a11187a-f26e-594c-8fb4-9dc643c295e0 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `1a11187a...` |
| <!-- coderef:uuid=ac3c6070-2c26-5a42-9d3d-f08685e77536 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `ac3c6070...` |
| <!-- coderef:uuid=56a52ab8-2fb0-5d6c-81cc-95252da6f911 --> `CanonicalGraphError` | `src/query/canonical-graph.ts` | `56a52ab8...` |
| <!-- coderef:uuid=195a482a-5f88-502c-8d05-a03c4555638d --> `CanonicalGraphQuery` | `src/query/canonical-graph.ts` | `195a482a...` |
| <!-- coderef:uuid=9f492d46-06a3-5b0a-8a18-4c2b1cfdf6da --> `EntityRegistry` | `src/registry/entity-registry.ts` | `9f492d46...` |
| <!-- coderef:uuid=bfe8846e-2328-53d2-9606-7e687d39f6e6 --> `LRUCache` | `src/scanner/lru-cache.ts` | `bfe8846e...` |
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

## Exported Interfaces (1042)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=223e10c3-ccea-5c01-a2d7-b68f1c4e33ea --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `223e10c3...` |
| <!-- coderef:uuid=fa63e8a3-44a4-5666-ad16-448811ae1db0 --> `ASTScanResult` | `dist-old/src/analyzer/ast-element-scanner.d.ts` | `fa63e8a3...` |
| <!-- coderef:uuid=0fd4eacc-706f-527b-9b9d-2d7ca8d40e50 --> `PackageJsonAnalysis` | `dist-old/src/analyzer/config-analyzer.d.ts` | `0fd4eacc...` |
| <!-- coderef:uuid=9d8e2b32-d89a-5107-be9a-8c771847645e --> `TsConfigAnalysis` | `dist-old/src/analyzer/config-analyzer.d.ts` | `9d8e2b32...` |
| <!-- coderef:uuid=62689ded-73d5-5b99-b67c-449ad42f3875 --> `DockerfileStage` | `dist-old/src/analyzer/config-analyzer.d.ts` | `62689ded...` |
| <!-- coderef:uuid=1260953a-2d61-567f-8e90-8d1eb3a87b7b --> `DockerfileAnalysis` | `dist-old/src/analyzer/config-analyzer.d.ts` | `1260953a...` |
| <!-- coderef:uuid=99e10e6f-74d0-593a-82f1-d87011bfa630 --> `DockerComposeService` | `dist-old/src/analyzer/config-analyzer.d.ts` | `99e10e6f...` |
| <!-- coderef:uuid=65cbefcf-676a-590b-9470-37c3d8900625 --> `DockerComposeAnalysis` | `dist-old/src/analyzer/config-analyzer.d.ts` | `65cbefcf...` |
| <!-- coderef:uuid=f1d72e14-ff9c-5513-baa8-835e0793840c --> `GitHubActionStep` | `dist-old/src/analyzer/config-analyzer.d.ts` | `f1d72e14...` |
| <!-- coderef:uuid=3a8b9734-2736-50c3-8b0b-46a3cddb2b53 --> `GitHubActionJob` | `dist-old/src/analyzer/config-analyzer.d.ts` | `3a8b9734...` |
| <!-- coderef:uuid=f533cf51-f696-51ad-904c-4f4a11783283 --> `GitHubActionWorkflow` | `dist-old/src/analyzer/config-analyzer.d.ts` | `f533cf51...` |
| <!-- coderef:uuid=9a2e7a9a-1904-534d-b8ac-3fbcfb82ae75 --> `EnvFileAnalysis` | `dist-old/src/analyzer/config-analyzer.d.ts` | `9a2e7a9a...` |
| <!-- coderef:uuid=d2d7f5d6-9b5f-5c4c-bca3-cc9653848b1e --> `ConfigAnalysis` | `dist-old/src/analyzer/config-analyzer.d.ts` | `d2d7f5d6...` |
| <!-- coderef:uuid=2d1a6196-669e-511d-b9fd-25c1a5c29cef --> `OpenApiSpec` | `dist-old/src/analyzer/contract-detector.d.ts` | `2d1a6196...` |
| <!-- coderef:uuid=93705b85-baca-56b3-ada1-a038a76a0030 --> `OpenApiPath` | `dist-old/src/analyzer/contract-detector.d.ts` | `93705b85...` |
| <!-- coderef:uuid=576dbb04-276f-589b-b24e-c6534c8d2479 --> `OpenApiComponent` | `dist-old/src/analyzer/contract-detector.d.ts` | `576dbb04...` |
| <!-- coderef:uuid=4d6521f0-cab2-5895-b66e-daecc7e4730b --> `GraphqlSchema` | `dist-old/src/analyzer/contract-detector.d.ts` | `4d6521f0...` |
| <!-- coderef:uuid=7cb937c1-bc6a-5a24-aaaf-69e23b055200 --> `GraphqlType` | `dist-old/src/analyzer/contract-detector.d.ts` | `7cb937c1...` |
| <!-- coderef:uuid=a29ae97b-e779-581b-913b-71f2bf4fcb84 --> `GraphqlOperation` | `dist-old/src/analyzer/contract-detector.d.ts` | `a29ae97b...` |
| <!-- coderef:uuid=f6afbde7-3e3e-56a6-b712-35308d73a7fa --> `ProtobufDefinition` | `dist-old/src/analyzer/contract-detector.d.ts` | `f6afbde7...` |
| <!-- coderef:uuid=6c948562-43f8-5ffc-bc59-0b914c6aacf1 --> `ProtobufMessage` | `dist-old/src/analyzer/contract-detector.d.ts` | `6c948562...` |
| <!-- coderef:uuid=428c8579-7006-5183-ad1a-8f45a2b67158 --> `ProtobufField` | `dist-old/src/analyzer/contract-detector.d.ts` | `428c8579...` |
| <!-- coderef:uuid=95e3d691-4801-516e-bf70-84930981ef9e --> `ProtobufService` | `dist-old/src/analyzer/contract-detector.d.ts` | `95e3d691...` |
| <!-- coderef:uuid=57d5a423-7d48-585c-b372-167433f76811 --> `ProtobufMethod` | `dist-old/src/analyzer/contract-detector.d.ts` | `57d5a423...` |
| <!-- coderef:uuid=60defb64-290d-561c-8240-eb75ff4b8a10 --> `ProtobufEnum` | `dist-old/src/analyzer/contract-detector.d.ts` | `60defb64...` |
| <!-- coderef:uuid=6b5a840e-24d7-5c4e-8f8c-b4a4eca45a07 --> `JsonSchema` | `dist-old/src/analyzer/contract-detector.d.ts` | `6b5a840e...` |
| <!-- coderef:uuid=88254dd2-b11c-57c4-ab24-9a3644759ca7 --> `ContractAnalysis` | `dist-old/src/analyzer/contract-detector.d.ts` | `88254dd2...` |
| <!-- coderef:uuid=2e7df001-6789-50d7-9f86-8b7136b3a846 --> `PrismaModel` | `dist-old/src/analyzer/database-detector.d.ts` | `2e7df001...` |
| <!-- coderef:uuid=79959e84-65ed-5b83-b197-775c0f003602 --> `PrismaField` | `dist-old/src/analyzer/database-detector.d.ts` | `79959e84...` |
| <!-- coderef:uuid=09ee14f6-10da-585c-b0e9-617016fce093 --> `PrismaRelation` | `dist-old/src/analyzer/database-detector.d.ts` | `09ee14f6...` |

*... and 1012 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (140)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=932b6482-ab33-54af-ae43-a4e02413c502 --> `DesignPatternType` | `dist-old/src/analyzer/design-pattern-detector.d.ts` | `932b6482...` |
| <!-- coderef:uuid=01e57a34-a77a-51b5-8e31-9e14bddd2f1c --> `EntryPointType` | `dist-old/src/analyzer/entry-detector.d.ts` | `01e57a34...` |
| <!-- coderef:uuid=609bad9c-f751-59bb-a446-450bfcf59551 --> `ProjectCategory` | `dist-old/src/analyzer/project-classifier.d.ts` | `609bad9c...` |
| <!-- coderef:uuid=4959265a-c4ab-588d-87d8-98579463ef25 --> `ApiServiceType` | `dist-old/src/analyzer/project-classifier.d.ts` | `4959265a...` |
| <!-- coderef:uuid=fcf58639-2cf0-5b5a-a99b-aec6c0705881 --> `WebAppType` | `dist-old/src/analyzer/project-classifier.d.ts` | `fcf58639...` |
| <!-- coderef:uuid=d2ef8172-0603-53dc-8271-6ab367a50c25 --> `IndexSchemaVersion` | `dist-old/src/artifacts/index-storage.d.ts` | `d2ef8172...` |
| <!-- coderef:uuid=6557b996-f244-561c-b40e-85ee6871e6ec --> `IndexFormat` | `dist-old/src/artifacts/index-storage.d.ts` | `6557b996...` |
| <!-- coderef:uuid=b09ff272-21ff-5df2-bb61-0150c8c2d4df --> `SupportedCliLanguage` | `dist-old/src/cli/detect-languages.d.ts` | `b09ff272...` |
| <!-- coderef:uuid=0ae59519-8569-5961-b376-7dcde73a8642 --> `ResponseFormat` | `dist-old/src/cli/mcp-response-format.d.ts` | `0ae59519...` |
| <!-- coderef:uuid=8e6bc8a4-ff3b-5921-888a-07a861ca8ba3 --> `ContextTools` | `dist-old/src/cli/mcp/context-tools.d.ts` | `8e6bc8a4...` |
| <!-- coderef:uuid=15ca4a57-2341-59c0-a607-1425d3fdbd26 --> `GraphTools` | `dist-old/src/cli/mcp/graph-tools.d.ts` | `15ca4a57...` |
| <!-- coderef:uuid=0bf7443a-3069-5cc6-87cd-4866a327c2ae --> `LookupTools` | `dist-old/src/cli/mcp/lookup-tools.d.ts` | `0bf7443a...` |
| <!-- coderef:uuid=c47d2579-1b70-5e4e-a479-6969812099c1 --> `MapTools` | `dist-old/src/cli/mcp/map-tools.d.ts` | `c47d2579...` |
| <!-- coderef:uuid=60c3a38c-31ea-59c6-a1fa-93fc2ccefbef --> `RagTools` | `dist-old/src/cli/mcp/rag-tools.d.ts` | `60c3a38c...` |
| <!-- coderef:uuid=7e4dfca6-2b2b-5a7c-9dd3-14b92b0b726a --> `ExportedNode` | `dist-old/src/cli/mcp/shared.d.ts` | `7e4dfca6...` |
| <!-- coderef:uuid=5d59aac1-4ec2-5714-b509-a8279fa0484c --> `ExportedEdge` | `dist-old/src/cli/mcp/shared.d.ts` | `5d59aac1...` |
| <!-- coderef:uuid=ed8b80e6-cf31-52f8-8b80-b105e6fa8c46 --> `VerifyTools` | `dist-old/src/cli/mcp/verify-tools.d.ts` | `ed8b80e6...` |
| <!-- coderef:uuid=ee0dd02f-c0a4-566e-ade6-ddd39f9a3cc3 --> `FlagKind` | `dist-old/src/cli/shared/cli-args.d.ts` | `ee0dd02f...` |
| <!-- coderef:uuid=f0c22ca1-605d-5989-bcc8-7732b7555924 --> `ExportFormat` | `dist-old/src/export/graph-exporter.d.ts` | `f0c22ca1...` |
| <!-- coderef:uuid=c17ad968-e7ee-52a0-942a-f1282a33656e --> `ExportedGraphEdgeRelationship` | `dist-old/src/export/graph-exporter.d.ts` | `c17ad968...` |
| <!-- coderef:uuid=9efb87d0-b6e2-5116-8cae-04a55a36049e --> `ExportedGraphEdgeResolutionStatus` | `dist-old/src/export/graph-exporter.d.ts` | `9efb87d0...` |
| <!-- coderef:uuid=68432e8c-50c4-514a-9428-acc2ee5168d7 --> `IndexingStage` | `dist-old/src/indexer/indexer-service.d.ts` | `68432e8c...` |
| <!-- coderef:uuid=8ee2cdd9-4aab-5a1c-b5b4-b66b370b8be2 --> `MetadataCategory` | `dist-old/src/indexer/metadata-index.d.ts` | `8ee2cdd9...` |
| <!-- coderef:uuid=1a9852c2-2be3-5a19-b209-1587993cb12c --> `QueryFilter` | `dist-old/src/indexer/query-engine.d.ts` | `1a9852c2...` |
| <!-- coderef:uuid=2d5f02d3-f3cd-504a-851b-3589a706df0d --> `RelationshipType` | `dist-old/src/indexer/relationship-index.d.ts` | `2d5f02d3...` |
| <!-- coderef:uuid=ed1eb0dd-66a3-580b-ae47-981e49505e06 --> `AIQueryType` | `dist-old/src/integration/ai-prompt-generator.d.ts` | `ed1eb0dd...` |
| <!-- coderef:uuid=50d8744e-9a49-594a-b5ad-b68c7ee1e9ba --> `LLMProviderFactory` | `dist-old/src/integration/llm/llm-provider.d.ts` | `50d8744e...` |
| <!-- coderef:uuid=a60689f1-0caf-5c9e-a3d2-2e0ab5c9d412 --> `ProgressCallback` | `dist-old/src/integration/rag/embedding-service.d.ts` | `a60689f1...` |
| <!-- coderef:uuid=42f1d25e-19f7-547d-96ce-262597e1d874 --> `QueryStrategy` | `dist-old/src/integration/rag/graph-reranker.d.ts` | `42f1d25e...` |
| <!-- coderef:uuid=93e70d62-d595-534e-8517-324279fcb16a --> `IndexingProgressCallback` | `dist-old/src/integration/rag/indexing-orchestrator.d.ts` | `93e70d62...` |
| <!-- coderef:uuid=78c07306-f0ac-5c84-ac0d-4b2c1377b4e4 --> `SkipReason` | `dist-old/src/integration/rag/indexing-orchestrator.d.ts` | `78c07306...` |
| <!-- coderef:uuid=ffdc70e9-8ef5-59dc-baac-ad00cb3e5a5d --> `FailReason` | `dist-old/src/integration/rag/indexing-orchestrator.d.ts` | `ffdc70e9...` |
| <!-- coderef:uuid=1048c9ae-0512-53a9-83a5-07c9b75e2029 --> `IndexingStatus` | `dist-old/src/integration/rag/indexing-orchestrator.d.ts` | `1048c9ae...` |
| <!-- coderef:uuid=2f415ffc-e27e-5789-afb9-4216a92852a0 --> `AbsolutePath` | `dist-old/src/integration/rag/path-types.d.ts` | `2f415ffc...` |
| <!-- coderef:uuid=b81359f1-e854-549d-ac78-f7fd95ac6f1a --> `RelativePath` | `dist-old/src/integration/rag/path-types.d.ts` | `b81359f1...` |
| <!-- coderef:uuid=ae797abf-3c5b-57f8-a4b1-ec35c67853cf --> `LLMProviderName` | `dist-old/src/integration/rag/rag-config.d.ts` | `ae797abf...` |
| <!-- coderef:uuid=055e94ba-684a-55b1-9f89-5841938a7570 --> `SearchLane` | `dist-old/src/integration/rag/search-router.d.ts` | `055e94ba...` |
| <!-- coderef:uuid=5982e9b9-e91d-5783-8dab-2639e92c3e55 --> `QueryShape` | `dist-old/src/integration/rag/search-router.d.ts` | `5982e9b9...` |
| <!-- coderef:uuid=c6875e6e-fecb-544e-8255-9e1d4866c29b --> `VectorStoreFactory` | `dist-old/src/integration/vector/vector-store.d.ts` | `c6875e6e...` |
| <!-- coderef:uuid=a6ef9c2f-82e0-5614-bbbd-54b8fc798b2b --> `SummaryDeltas` | `dist-old/src/map/metrics-delta.d.ts` | `a6ef9c2f...` |
| <!-- coderef:uuid=bd4b0307-85ad-5063-9c07-3de388d199c4 --> `FamilyDirection` | `dist-old/src/map/metrics-delta.d.ts` | `bd4b0307...` |
| <!-- coderef:uuid=919a1cf2-b5a7-58af-a46f-7261373be693 --> `CallResolutionKind` | `dist-old/src/pipeline/call-resolver.d.ts` | `919a1cf2...` |
| <!-- coderef:uuid=24194dc5-187f-5059-a09b-2f624f8b1225 --> `SymbolTable` | `dist-old/src/pipeline/call-resolver.d.ts` | `24194dc5...` |
| <!-- coderef:uuid=65e8553c-4f04-56da-9cad-c90bb380a4df --> `EdgeConfidenceTier` | `dist-old/src/pipeline/edge-confidence.d.ts` | `65e8553c...` |
| <!-- coderef:uuid=444f9583-1531-54b6-ba35-5c0d2b8f3ffd --> `LayerEnum` | `dist-old/src/pipeline/element-taxonomy.d.ts` | `444f9583...` |
| <!-- coderef:uuid=5981fd08-8230-5eed-99ab-de548c8bd290 --> `HeaderStatus` | `dist-old/src/pipeline/element-taxonomy.d.ts` | `5981fd08...` |
| <!-- coderef:uuid=d9384474-e461-54c7-9e2c-13c8155b0b03 --> `ClientPathClassification` | `dist-old/src/pipeline/endpoint-identity.d.ts` | `d9384474...` |
| <!-- coderef:uuid=217ae493-875f-53ee-8195-97cc48ee43a2 --> `GrammarFamily` | `dist-old/src/pipeline/extractors/complexity-metrics.d.ts` | `217ae493...` |
| <!-- coderef:uuid=341c6697-d937-59ac-a9c9-c94b6449861e --> `FrontendCallFact` | `dist-old/src/pipeline/extractors/route-extractor.d.ts` | `341c6697...` |
| <!-- coderef:uuid=5079b8a9-207f-54a6-a3dd-78b77b48a89c --> `FieldIndex` | `dist-old/src/pipeline/field-index.d.ts` | `5079b8a9...` |
| <!-- coderef:uuid=7eb4b905-be86-5bb3-875b-2b3b62f62cc9 --> `EdgeRelationship` | `dist-old/src/pipeline/graph-builder.d.ts` | `7eb4b905...` |
| <!-- coderef:uuid=2058ce06-48e7-5eb7-b042-ef98f2c30b00 --> `EdgeResolutionStatus` | `dist-old/src/pipeline/graph-builder.d.ts` | `2058ce06...` |
| <!-- coderef:uuid=65c152e3-b033-526c-98c3-6d9b8b54b50b --> `EdgeEvidence` | `dist-old/src/pipeline/graph-builder.d.ts` | `65c152e3...` |
| <!-- coderef:uuid=013e1574-8bdd-553a-96f2-fcd4df4d1092 --> `HeritageIndex` | `dist-old/src/pipeline/heritage-index.d.ts` | `013e1574...` |
| <!-- coderef:uuid=15ff21bc-302d-5f2b-8854-52a16e41d269 --> `ImportResolutionKind` | `dist-old/src/pipeline/import-resolver.d.ts` | `15ff21bc...` |
| <!-- coderef:uuid=bb3930f9-58d4-5554-9a5f-1b1e5914d216 --> `ExportTable` | `dist-old/src/pipeline/import-resolver.d.ts` | `bb3930f9...` |
| <!-- coderef:uuid=c3622252-0240-5e85-9a7e-bba3b6018e86 --> `LegacyGraphBuilder` | `dist-old/src/pipeline/phases/resolve-tail.d.ts` | `c3622252...` |
| <!-- coderef:uuid=26ceef57-2e2e-5737-b499-c20e5ea43ff3 --> `ScopeBindingKind` | `dist-old/src/pipeline/scope-binding.d.ts` | `26ceef57...` |
| <!-- coderef:uuid=168030da-fffb-5222-b5c9-758ef22d29c3 --> `ScopeBindingMap` | `dist-old/src/pipeline/scope-binding.d.ts` | `168030da...` |
| <!-- coderef:uuid=57ecfe45-6fb1-5b22-bdb4-14b5aac7145c --> `LanguageExtension` | `dist-old/src/pipeline/types.d.ts` | `57ecfe45...` |
| <!-- coderef:uuid=e220fe8e-2082-5835-abe0-12fd1a34595d --> `RawExportKind` | `dist-old/src/pipeline/types.d.ts` | `e220fe8e...` |
| <!-- coderef:uuid=8fe6ae03-9a1a-5eed-bfd4-df5976c0339d --> `ApiChangeType` | `dist-old/src/query/api-diff.d.ts` | `8fe6ae03...` |
| <!-- coderef:uuid=4ffb1a58-b31a-517e-b61e-e49b6db1092e --> `ClonePass` | `dist-old/src/query/clones.d.ts` | `4ffb1a58...` |
| <!-- coderef:uuid=20209ab1-5538-5c28-8f16-12be8b5ab975 --> `RuleStatus` | `dist-old/src/query/dependency-rules.d.ts` | `20209ab1...` |
| <!-- coderef:uuid=27b46db8-7ce1-5cae-92b5-4b72ae18eb72 --> `EgoGraphDirection` | `dist-old/src/query/ego-graph.d.ts` | `27b46db8...` |
| <!-- coderef:uuid=eaca5712-f148-5522-9b81-5fb6a44684dd --> `TypeHierarchyDirection` | `dist-old/src/query/type-hierarchy.d.ts` | `eaca5712...` |
| <!-- coderef:uuid=68c76038-5d37-5654-b4e0-7c776593b03b --> `ScanErrorType` | `dist-old/src/scanner/error-reporter.d.ts` | `68c76038...` |
| <!-- coderef:uuid=ab0ca506-fcc4-5b76-8776-1aa6b21462ba --> `ScanErrorSeverity` | `dist-old/src/scanner/error-reporter.d.ts` | `ab0ca506...` |
| <!-- coderef:uuid=fb019ada-6d49-5809-9664-ab3da6ee9ccd --> `LogLevel` | `dist-old/src/utils/logger.d.ts` | `fb019ada...` |
| <!-- coderef:uuid=8aec911f-19f0-573c-9afc-1c893672ac83 --> `ConfidenceLevel` | `dist-old/src/validator/frontend-update-generator.d.ts` | `8aec911f...` |
| <!-- coderef:uuid=aafb5728-4126-5b05-b53e-478009b92ada --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `aafb5728...` |
| <!-- coderef:uuid=bfe5cea1-07ae-599e-9aa3-e32d3a267cf3 --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `bfe5cea1...` |
| <!-- coderef:uuid=f8ea40a9-bc0a-5514-860d-629a00621f4b --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `f8ea40a9...` |
| <!-- coderef:uuid=96331f7b-b03c-5977-8999-0e03b98a0673 --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `96331f7b...` |
| <!-- coderef:uuid=547081e0-c789-5db8-896a-cf7299131c29 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `547081e0...` |
| <!-- coderef:uuid=f9715a90-bd94-58bf-aa86-83726d357818 --> `IndexSchemaVersion` | `src/artifacts/index-storage.ts` | `f9715a90...` |
| <!-- coderef:uuid=e5d6aa09-f670-5add-8fad-0a1700f91457 --> `IndexFormat` | `src/artifacts/index-storage.ts` | `e5d6aa09...` |
| <!-- coderef:uuid=135d36bc-cbf3-5e0c-aeaf-87ba423c406a --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `135d36bc...` |
| <!-- coderef:uuid=ce42f401-9598-5a97-b72c-8f4dcc6f0eef --> `ResponseFormat` | `src/cli/mcp-response-format.ts` | `ce42f401...` |
| <!-- coderef:uuid=4ad40a38-508f-5ce7-af0d-0c9ca95920c7 --> `ContextTools` | `src/cli/mcp/context-tools.ts` | `4ad40a38...` |
| <!-- coderef:uuid=ec2ccbef-866b-5d6c-b31c-7ecd2da4eb5a --> `GraphTools` | `src/cli/mcp/graph-tools.ts` | `ec2ccbef...` |
| <!-- coderef:uuid=7ba858c7-c278-5bc4-a7e6-97a51fe24aa9 --> `LookupTools` | `src/cli/mcp/lookup-tools.ts` | `7ba858c7...` |
| <!-- coderef:uuid=3522589c-4dbc-50c2-b4b8-69b772c67437 --> `MapTools` | `src/cli/mcp/map-tools.ts` | `3522589c...` |
| <!-- coderef:uuid=2a71481a-f56c-5834-ab85-30ef798056bb --> `RagTools` | `src/cli/mcp/rag-tools.ts` | `2a71481a...` |
| <!-- coderef:uuid=49990bc2-c1f7-5807-88e6-e6475f4ae45c --> `ExportedNode` | `src/cli/mcp/shared.ts` | `49990bc2...` |
| <!-- coderef:uuid=185a9d84-6238-545e-9b22-bebe1ea0cd4a --> `ExportedEdge` | `src/cli/mcp/shared.ts` | `185a9d84...` |
| <!-- coderef:uuid=635b98cb-284e-58d4-b6eb-14b62b2be3ff --> `VerifyTools` | `src/cli/mcp/verify-tools.ts` | `635b98cb...` |
| <!-- coderef:uuid=657bc756-1c6e-5e46-8b9f-9f12d7c5b002 --> `FlagKind` | `src/cli/shared/cli-args.ts` | `657bc756...` |
| <!-- coderef:uuid=0be23141-4534-5c5d-8496-9d15e7d02613 --> `ExportFormat` | `src/export/graph-exporter.ts` | `0be23141...` |
| <!-- coderef:uuid=ec4d0421-181d-5a9a-ac54-f7554b5b549e --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `ec4d0421...` |
| <!-- coderef:uuid=0220c933-13ec-5661-8b0a-922c5b4ef7c5 --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `0220c933...` |
| <!-- coderef:uuid=40590008-aac5-57b9-a9fa-6cc5a724b7b9 --> `IndexingStage` | `src/indexer/indexer-service.ts` | `40590008...` |
| <!-- coderef:uuid=8b5d4c8d-1d06-5d77-8fe9-0c2773286b84 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `8b5d4c8d...` |
| <!-- coderef:uuid=1260da3c-b61d-5092-acb2-f06fef3cbbe9 --> `QueryFilter` | `src/indexer/query-engine.ts` | `1260da3c...` |
| <!-- coderef:uuid=8c03ed9c-6f3d-5ec0-b110-fdacc2bc1613 --> `RelationshipType` | `src/indexer/relationship-index.ts` | `8c03ed9c...` |
| <!-- coderef:uuid=b5f5bc43-64a4-543e-9018-c8ce52a5223c --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `b5f5bc43...` |
| <!-- coderef:uuid=eaa74a69-41ee-523e-9632-a30e1d186c1a --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `eaa74a69...` |
| <!-- coderef:uuid=fee41cb3-b087-5dc1-a25a-10c00c98548a --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `fee41cb3...` |
| <!-- coderef:uuid=e662e57e-02bc-5be3-aaa7-1f403e1df7a2 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `e662e57e...` |
| <!-- coderef:uuid=e20252f7-8661-5b78-9980-66e7da72f21a --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `e20252f7...` |
| <!-- coderef:uuid=d54c6aff-a55c-5f44-a462-35ef3d5c482b --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `d54c6aff...` |
| <!-- coderef:uuid=57b9efe0-ae0d-5cac-a275-b80aed91c77a --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `57b9efe0...` |
| <!-- coderef:uuid=6b246ccb-6036-5ddd-a32f-17e5c1235e0a --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `6b246ccb...` |
| <!-- coderef:uuid=5b5b3018-2c7e-54c0-818f-74fda789aa41 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `5b5b3018...` |
| <!-- coderef:uuid=d3713b85-895e-5cb3-90f0-6bb053918992 --> `RelativePath` | `src/integration/rag/path-types.ts` | `d3713b85...` |
| <!-- coderef:uuid=fc5a9f8c-9c2f-54df-8716-d27e062a4840 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `fc5a9f8c...` |
| <!-- coderef:uuid=149da0d3-83cf-507b-8c01-ea2e02c931d5 --> `SearchLane` | `src/integration/rag/search-router.ts` | `149da0d3...` |
| <!-- coderef:uuid=45783337-e787-56be-8a74-1222a2a187c8 --> `QueryShape` | `src/integration/rag/search-router.ts` | `45783337...` |
| <!-- coderef:uuid=e58a30e0-02ab-5d9d-b756-c9faf5c82fa0 --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `e58a30e0...` |
| <!-- coderef:uuid=281c8bbe-2e5d-5ada-82cc-981a98797d2f --> `SummaryDeltas` | `src/map/metrics-delta.ts` | `281c8bbe...` |
| <!-- coderef:uuid=4865ac19-7920-5de9-acc3-bae7f96b4eb7 --> `FamilyDirection` | `src/map/metrics-delta.ts` | `4865ac19...` |
| <!-- coderef:uuid=c61705e9-5d93-5b9c-9a62-5a2a48ca49d3 --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `c61705e9...` |
| <!-- coderef:uuid=e75aa5ff-f24b-5828-8ad0-1d047d39fa8d --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `e75aa5ff...` |
| <!-- coderef:uuid=1ee44c6e-eefc-5268-b956-9635e9c47241 --> `EdgeConfidenceTier` | `src/pipeline/edge-confidence.ts` | `1ee44c6e...` |
| <!-- coderef:uuid=4c496708-f0f3-5a30-bab5-1d6567dbdb2f --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `4c496708...` |
| <!-- coderef:uuid=b80de943-3115-53cb-90f4-d7acdefa0791 --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `b80de943...` |
| <!-- coderef:uuid=dcc9a42d-0e88-5afa-a71e-4eb89e9c8963 --> `ClientPathClassification` | `src/pipeline/endpoint-identity.ts` | `dcc9a42d...` |
| <!-- coderef:uuid=56a78d3b-3aad-50f5-b1cf-fd090b332409 --> `GrammarFamily` | `src/pipeline/extractors/complexity-metrics.ts` | `56a78d3b...` |
| <!-- coderef:uuid=683c23c4-5438-5baf-b3e8-3cc6dd5dabef --> `FrontendCallFact` | `src/pipeline/extractors/route-extractor.ts` | `683c23c4...` |
| <!-- coderef:uuid=e2daf99d-be4e-52b6-b559-5c6b690450b5 --> `FieldIndex` | `src/pipeline/field-index.ts` | `e2daf99d...` |
| <!-- coderef:uuid=f315e085-e254-559d-82b0-4b8686271d6c --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `f315e085...` |
| <!-- coderef:uuid=035d5269-570b-5160-b0ee-985344c16f72 --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `035d5269...` |
| <!-- coderef:uuid=bc2096dc-70cc-5e14-8a44-e0b8573b7e9d --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `bc2096dc...` |
| <!-- coderef:uuid=1805920a-8b53-5cc4-8603-4f4a6352d001 --> `HeritageIndex` | `src/pipeline/heritage-index.ts` | `1805920a...` |
| <!-- coderef:uuid=61131750-9315-5e71-8e8c-377299fe5bbc --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `61131750...` |
| <!-- coderef:uuid=d175c932-c821-511d-88fc-0c6cc81579ee --> `ExportTable` | `src/pipeline/import-resolver.ts` | `d175c932...` |
| <!-- coderef:uuid=91e9a7fb-2a33-5873-b7f0-d2ffca00181d --> `LegacyGraphBuilder` | `src/pipeline/phases/resolve-tail.ts` | `91e9a7fb...` |
| <!-- coderef:uuid=798d3d7e-0c4a-5abc-aeec-a6ee7cafaceb --> `ScopeBindingKind` | `src/pipeline/scope-binding.ts` | `798d3d7e...` |
| <!-- coderef:uuid=fa0b7eae-b6b3-5721-8b00-f3147254288b --> `ScopeBindingMap` | `src/pipeline/scope-binding.ts` | `fa0b7eae...` |
| <!-- coderef:uuid=4bd21bb9-ee9e-53ca-b51e-024c8730fa86 --> `LanguageExtension` | `src/pipeline/types.ts` | `4bd21bb9...` |
| <!-- coderef:uuid=6a445855-1839-58e0-abb7-0ec8cb74a0a7 --> `RawExportKind` | `src/pipeline/types.ts` | `6a445855...` |
| <!-- coderef:uuid=c13c7ac6-faf6-5342-b476-f64b4453835e --> `ApiChangeType` | `src/query/api-diff.ts` | `c13c7ac6...` |
| <!-- coderef:uuid=06d161d7-f1ac-5e96-a229-5191eae879cc --> `ClonePass` | `src/query/clones.ts` | `06d161d7...` |
| <!-- coderef:uuid=0f384ba4-c0aa-5f62-99f8-3481c066c634 --> `RuleStatus` | `src/query/dependency-rules.ts` | `0f384ba4...` |
| <!-- coderef:uuid=1d4e52f8-df4c-5343-95fc-3454ee9b1fec --> `EgoGraphDirection` | `src/query/ego-graph.ts` | `1d4e52f8...` |
| <!-- coderef:uuid=52f47c63-ee80-53b1-bd90-e0b0fc7d29ce --> `TypeHierarchyDirection` | `src/query/type-hierarchy.ts` | `52f47c63...` |
| <!-- coderef:uuid=1ce94088-4c5e-5666-b492-fcb31f005850 --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `1ce94088...` |
| <!-- coderef:uuid=ee0535e8-c87c-591c-8309-ba36bc7575b3 --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `ee0535e8...` |
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
