# Public API Reference

**Project:** @coderef/core  
**Version:** 2.0.0  
**Generated:** 2026-06-13  
**Total Exported:** 841 elements  
<!-- coderef:uuid=exports-root -->

---

## Overview

This document lists all **publicly exported** APIs from @coderef/core. These are the stable interfaces intended for external consumption. Internal APIs (marked as `exported: false`) are subject to change without notice.

---

## Summary by Type

| Type | Exported | Internal | Total |
|------|----------|----------|-------|
| function | **305** | 455 | 760 |
| interface | **344** | 104 | 448 |
| constant | **30** | 96 | 126 |
| type | **45** | 19 | 64 |
| component | **2** | 0 | 2 |
| class | **115** | 4 | 119 |

---

## Exported Functions (305)

| Function | File | Async | Parameters | UUID |
|----------|------|-------|------------|------|
| <!-- coderef:uuid=2e232703-9d05-50ba-8dca-14714e391844 --> `createMockEnvironment` | `__tests__/generators/helpers.ts` | ✅ |  | `2e232703...` |
| <!-- coderef:uuid=93a80247-9b51-57ff-ac24-5e1dc206155c --> `cleanupEnvironment` | `__tests__/generators/helpers.ts` | ✅ | projectDir | `93a80247...` |
| <!-- coderef:uuid=ccc97368-6a6a-5da6-8f77-3525e41b2c88 --> `readJson` | `__tests__/generators/helpers.ts` | ✅ | filePath | `ccc97368...` |
| <!-- coderef:uuid=829daa03-7ddc-5b7e-9ebb-b7ee8b00bbaa --> `readText` | `__tests__/generators/helpers.ts` | ✅ | filePath | `829daa03...` |
| <!-- coderef:uuid=86674bf5-7783-5733-915b-4be3e59600bc --> `convertGraphToElements` | `src/adapter/graph-to-elements.ts` | ❌ | graph, options | `86674bf5...` |
| <!-- coderef:uuid=6dfb05f7-e3f5-5d1e-9c59-e0876312b67b --> `getConversionStats` | `src/adapter/graph-to-elements.ts` | ❌ | elements | `6dfb05f7...` |
| <!-- coderef:uuid=943634bb-3bd1-533f-99ac-a4f309907198 --> `scanFileWithAST` | `src/analyzer/ast-element-scanner.ts` | ❌ | filePath | `943634bb...` |
| <!-- coderef:uuid=e7fe444a-67bb-5ba7-9a53-592f4d6abaa7 --> `scanFilesWithAST` | `src/analyzer/ast-element-scanner.ts` | ❌ | filePaths | `e7fe444a...` |
| <!-- coderef:uuid=98090ab0-912c-5d3e-b87f-dbe643aec9e9 --> `analyzeProjectConfig` | `src/analyzer/config-analyzer.ts` | ❌ | projectPath | `98090ab0...` |
| <!-- coderef:uuid=1c5806c2-e7d4-5ea8-8157-2a8324ac9141 --> `analyzeContracts` | `src/analyzer/contract-detector.ts` | ❌ | projectPath | `1c5806c2...` |
| <!-- coderef:uuid=ffd206d0-382a-5cc9-8ec9-035e304a2bf5 --> `analyzeDatabase` | `src/analyzer/database-detector.ts` | ❌ | projectPath | `ffd206d0...` |
| <!-- coderef:uuid=9fd33e23-d049-5d98-a771-8754037c8dd0 --> `analyzeDependencyHealth` | `src/analyzer/dependency-analyzer.ts` | ✅ | projectPath | `9fd33e23...` |
| <!-- coderef:uuid=91ccb2b8-4fcb-5038-9f93-43346bcb5679 --> `analyzeDesignPatterns` | `src/analyzer/design-pattern-detector.ts` | ❌ | projectPath | `91ccb2b8...` |
| <!-- coderef:uuid=96e9e189-736c-5d21-a692-8e9a93f0ad7e --> `analyzeDocs` | `src/analyzer/docs-analyzer.ts` | ✅ | projectPath | `96e9e189...` |
| <!-- coderef:uuid=761dea85-91ce-5553-8784-0fe4350ed985 --> `parseFetchCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `761dea85...` |
| <!-- coderef:uuid=2cd8899d-ad25-5cb8-bae6-eab76deac7c7 --> `parseAxiosCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `2cd8899d...` |
| <!-- coderef:uuid=d7a20d39-2279-5483-8ab7-686ed366e069 --> `parseReactQueryCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `d7a20d39...` |
| <!-- coderef:uuid=283f59e5-9ff5-562d-bc65-8148539f0574 --> `parseCustomApiCalls` | `src/analyzer/frontend-call-parsers.ts` | ❌ | code, filePath | `283f59e5...` |
| <!-- coderef:uuid=dfd18684-fcf0-52af-bd92-f8416bc09964 --> `extractHttpMethod` | `src/analyzer/frontend-call-parsers.ts` | ❌ | optionsArg | `dfd18684...` |
| <!-- coderef:uuid=2b3c4a77-cf58-53c2-b67c-7b329941f45f --> `extractCallLocation` | `src/analyzer/frontend-call-parsers.ts` | ❌ | node, filePath | `2b3c4a77...` |
| <!-- coderef:uuid=d166ef21-b40f-5c95-b515-a667d6cc869e --> `parseNodeId` | `src/analyzer/graph-helpers.ts` | ❌ | nodeId | `d166ef21...` |
| <!-- coderef:uuid=017e6f2b-7bb1-5c93-adf6-e28d38710b61 --> `getImportsForElement` | `src/analyzer/graph-helpers.ts` | ❌ | graph, nodeId | `017e6f2b...` |
| <!-- coderef:uuid=bbb6ad65-24e1-5f77-b6a0-627993c55303 --> `getExportsForElement` | `src/analyzer/graph-helpers.ts` | ❌ | graph, nodeId | `bbb6ad65...` |
| <!-- coderef:uuid=bfeae9da-e936-5b15-ae18-87bb3fda5a06 --> `getConsumersForElement` | `src/analyzer/graph-helpers.ts` | ❌ | graph, nodeId | `bfeae9da...` |
| <!-- coderef:uuid=584c6e97-a624-55d9-bf33-00573a20b0e9 --> `getDependenciesForElement` | `src/analyzer/graph-helpers.ts` | ❌ | graph, nodeId | `584c6e97...` |
| <!-- coderef:uuid=8a40c876-f3cd-5fc5-86d2-83d127cd8271 --> `getElementCharacteristics` | `src/analyzer/graph-helpers.ts` | ❌ | graph, nodeId | `8a40c876...` |
| <!-- coderef:uuid=b8a4c3b4-5389-5759-be38-38b276e1fe42 --> `calculateAutoFillRate` | `src/analyzer/graph-helpers.ts` | ❌ | graph, nodeId | `b8a4c3b4...` |
| <!-- coderef:uuid=15374270-bd15-557c-89af-0cc8a64937c4 --> `buildCallEdges` | `src/analyzer/js-call-detector/analyzer.ts` | ❌ | filePaths, callDetector, elementMap | `15374270...` |
| <!-- coderef:uuid=0dfa98a9-a404-59f3-b720-deb73c1fbd82 --> `analyzeCallPatterns` | `src/analyzer/js-call-detector/analyzer.ts` | ❌ | filePaths, callDetector | `0dfa98a9...` |
| <!-- coderef:uuid=d71ab3b1-0ba0-52bd-8672-f931aad4def9 --> `extractImportsFromAST` | `src/analyzer/js-call-detector/module-analyzer.ts` | ❌ | ast, imports | `d71ab3b1...` |
| <!-- coderef:uuid=00efa541-e5e1-5830-9b34-75ba268fb262 --> `extractExportsFromAST` | `src/analyzer/js-call-detector/module-analyzer.ts` | ❌ | ast, exports | `00efa541...` |
| <!-- coderef:uuid=6bbe40d9-0db0-5005-a905-99b7c299aef5 --> `parseCallExpression` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node, filePath, context | `6bbe40d9...` |
| <!-- coderef:uuid=12218c9e-f4f4-5859-bfcc-44c4609ee452 --> `parseNewExpression` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node, filePath, context | `12218c9e...` |
| <!-- coderef:uuid=836c9511-cf00-59bf-b58b-1b3fdb8b3bef --> `extractObjectName` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node | `836c9511...` |
| <!-- coderef:uuid=7b57c2e0-4fad-5148-b171-ea5ae9a6dd42 --> `isNestedCall` | `src/analyzer/js-call-detector/parser.ts` | ❌ | node | `7b57c2e0...` |
| <!-- coderef:uuid=2b446f2f-9784-59ae-aad7-a799c5083b0e --> `extractParameters` | `src/analyzer/js-call-detector/parser.ts` | ❌ | params | `2b446f2f...` |
| <!-- coderef:uuid=6f81ca60-16a2-57c9-90fc-a6a06b28f098 --> `extractParameter` | `src/analyzer/js-call-detector/parser.ts` | ❌ | param | `6f81ca60...` |
| <!-- coderef:uuid=11a7e048-bb4b-5152-be2c-a9a43223e7c0 --> `visitNode` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | node, calls, filePath, context | `11a7e048...` |
| <!-- coderef:uuid=6a5126c2-fa2f-56a3-8898-35ea29cd5758 --> `extractParametersFromAST` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | ast, filePath, result, context | `6a5126c2...` |
| <!-- coderef:uuid=4825a2df-7254-5cea-8c04-3964f6d9afae --> `extractElementsFromAST` | `src/analyzer/js-call-detector/visitor.ts` | ❌ | ast, filePath, elements, parentExported | `4825a2df...` |
| <!-- coderef:uuid=9e1f1bf0-4f12-5c4c-985f-4f607f434348 --> `parseJavaScript` | `src/analyzer/js-parser.ts` | ❌ | code, options | `9e1f1bf0...` |
| <!-- coderef:uuid=2e5ac029-9ee9-5228-9204-14d765bef2d3 --> `parseJavaScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath, options | `2e5ac029...` |
| <!-- coderef:uuid=26a6a5cc-0ad1-572c-8b5f-69c9e0d1252e --> `isJavaScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath | `26a6a5cc...` |
| <!-- coderef:uuid=e877fe7a-211e-58b1-9376-6ba7a6e537f8 --> `isTypeScriptFile` | `src/analyzer/js-parser.ts` | ❌ | filePath | `e877fe7a...` |
| <!-- coderef:uuid=79514e8d-17c9-5fad-a63e-2544de29fb92 --> `getSourceTypeFromExtension` | `src/analyzer/js-parser.ts` | ❌ | filePath | `79514e8d...` |
| <!-- coderef:uuid=9e7ec783-0125-532b-a45b-7b5db949dbe5 --> `parseJavaScriptFileAuto` | `src/analyzer/js-parser.ts` | ❌ | filePath | `9e7ec783...` |
| <!-- coderef:uuid=575bc8b2-ff4a-585d-8ec5-a808b4a0fb51 --> `analyzeMiddlewareAndDI` | `src/analyzer/middleware-detector.ts` | ❌ | elements, files | `575bc8b2...` |
| <!-- coderef:uuid=feac0a76-fda8-5c18-8ff7-f24a63e0c6f2 --> `extractAllRoutes` | `src/analyzer/migration-route-analyzer.ts` | ❌ | elements | `feac0a76...` |
| <!-- coderef:uuid=4f70008c-c1f8-56eb-b51d-49eec78c44e3 --> `findOrphanedCalls` | `src/analyzer/migration-route-analyzer.ts` | ❌ | elements, frontendCalls | `4f70008c...` |
| <!-- coderef:uuid=1cb1c7d3-99a1-50d6-a088-0c4b2a47c1d6 --> `detectBreakingChanges` | `src/analyzer/migration-route-analyzer.ts` | ❌ | oldElements, newElements | `1cb1c7d3...` |

*... and 255 more functions. See index.json for complete list.*

---

## Exported Classes (115)

| Class | File | UUID |
|-------|------|------|
| <!-- coderef:uuid=7df3524f-351d-5afc-9e27-00d21269f140 --> `AnalyzerService` | `src/analyzer/analyzer-service.ts` | `7df3524f...` |
| <!-- coderef:uuid=1c19a19c-5cc8-57ee-a5ab-83b82150501a --> `ASTElementScanner` | `src/analyzer/ast-element-scanner.ts` | `1c19a19c...` |
| <!-- coderef:uuid=1aa6daf4-464b-56d1-9278-ab825e89f8b1 --> `CallDetector` | `src/analyzer/call-detector.ts` | `1aa6daf4...` |
| <!-- coderef:uuid=df3e4fa6-6d49-5709-b4fb-6c65733b2dee --> `ConfigAnalyzer` | `src/analyzer/config-analyzer.ts` | `df3e4fa6...` |
| <!-- coderef:uuid=b9d3483e-bf11-58bd-8ead-437146cd402f --> `ContractDetector` | `src/analyzer/contract-detector.ts` | `b9d3483e...` |
| <!-- coderef:uuid=c737b949-3d82-5cb0-ac65-e62677178f64 --> `DatabaseDetector` | `src/analyzer/database-detector.ts` | `c737b949...` |
| <!-- coderef:uuid=682ec23c-fcf8-5174-b1a2-b6f0890c6d47 --> `DependencyAnalyzer` | `src/analyzer/dependency-analyzer.ts` | `682ec23c...` |
| <!-- coderef:uuid=a497ee99-84c9-5409-acb7-62aac63cc3a1 --> `DesignPatternDetector` | `src/analyzer/design-pattern-detector.ts` | `a497ee99...` |
| <!-- coderef:uuid=47d156e5-e5b5-50fa-9d56-76ff89b35f35 --> `DocsAnalyzer` | `src/analyzer/docs-analyzer.ts` | `47d156e5...` |
| <!-- coderef:uuid=7b55540c-a37b-5f9f-9e1d-9fbb9a981c03 --> `DynamicImportDetector` | `src/analyzer/dynamic-import-detector.ts` | `7b55540c...` |
| <!-- coderef:uuid=33abf6e1-020a-526a-b519-3563a47eb82a --> `EntryPointDetector` | `src/analyzer/entry-detector.ts` | `33abf6e1...` |
| <!-- coderef:uuid=88434c23-e831-5b8e-a46e-bd3cfa806439 --> `GraphAnalyzer` | `src/analyzer/graph-analyzer.ts` | `88434c23...` |
| <!-- coderef:uuid=43496bb5-ed4a-5da5-b232-17cd7393af65 --> `GraphBuilder` | `src/analyzer/graph-builder.ts` | `43496bb5...` |
| <!-- coderef:uuid=91a1c708-b9cd-5fd4-a4c1-c931462f4b91 --> `GraphError` | `src/analyzer/graph-error.ts` | `91a1c708...` |
| <!-- coderef:uuid=f875bdb3-b8a3-5f0b-ae3b-5f20a75c81b6 --> `ImportParser` | `src/analyzer/import-parser.ts` | `f875bdb3...` |
| <!-- coderef:uuid=3238341b-fc37-514f-8f31-feaa5b3217ea --> `JSCallDetector` | `src/analyzer/js-call-detector/index.ts` | `3238341b...` |
| <!-- coderef:uuid=dfbf6056-435e-566f-a3b0-9686c1980345 --> `MiddlewareDetector` | `src/analyzer/middleware-detector.ts` | `dfbf6056...` |
| <!-- coderef:uuid=a8f24464-5332-568c-96a7-1376a5a844e0 --> `MigrationRouteAnalyzer` | `src/analyzer/migration-route-analyzer.ts` | `a8f24464...` |
| <!-- coderef:uuid=f2df23b6-1356-56e6-8c7e-fb6aaca4ae37 --> `ProjectClassifier` | `src/analyzer/project-classifier.ts` | `f2df23b6...` |
| <!-- coderef:uuid=e7988a27-0be7-5480-b595-a2133d94c380 --> `IncrementalCache` | `src/cache/incremental-cache.ts` | `e7988a27...` |
| <!-- coderef:uuid=bb6919af-4eb3-5ea6-9438-0f002d23a61a --> `DryRunSemanticOrchestrator` | `src/cli/semantic-integration.ts` | `bb6919af...` |
| <!-- coderef:uuid=370ee5b0-20cb-5dff-8c93-d1a99fd01003 --> `AgenticFormatter` | `src/context/agentic-formatter.ts` | `370ee5b0...` |
| <!-- coderef:uuid=bd5bfa83-56c4-5309-ab61-4790ec7c7190 --> `BreakingChangeDetector` | `src/context/breaking-change-detector/index.ts` | `bd5bfa83...` |
| <!-- coderef:uuid=fa5a38ff-e5fa-5286-b0a7-c70bdf9618b1 --> `ComplexityScorer` | `src/context/complexity-scorer.ts` | `fa5a38ff...` |
| <!-- coderef:uuid=57cbc776-261c-59e0-92f4-7186357b83b4 --> `ContextGenerator` | `src/context/context-generator.ts` | `57cbc776...` |
| <!-- coderef:uuid=d9cbd2f5-a34f-5089-a7ee-3bc96298a767 --> `ContextTracker` | `src/context/context-tracker.ts` | `d9cbd2f5...` |
| <!-- coderef:uuid=eb0fd918-1007-5e0f-8d47-45db42f79d71 --> `EdgeCaseDetector` | `src/context/edge-case-detector.ts` | `eb0fd918...` |
| <!-- coderef:uuid=e68dfa41-d945-5609-98fe-34d56f9f6a33 --> `EntryPointDetector` | `src/context/entry-point-detector.ts` | `e68dfa41...` |
| <!-- coderef:uuid=312b89f3-f004-5c47-8509-16d2d037fbc7 --> `ExampleExtractor` | `src/context/example-extractor.ts` | `312b89f3...` |
| <!-- coderef:uuid=c1808d02-ed62-577f-9e84-f0fa26ef77a6 --> `FuzzyResolver` | `src/context/fuzzy-resolver.ts` | `c1808d02...` |
| <!-- coderef:uuid=bc32d815-b24a-5234-b3e0-37a17dadda3d --> `ImpactSimulator` | `src/context/impact-simulator.ts` | `bc32d815...` |
| <!-- coderef:uuid=fe5c4613-9c72-51f6-8240-928d917f8bf6 --> `MarkdownFormatter` | `src/context/markdown-formatter.ts` | `fe5c4613...` |
| <!-- coderef:uuid=f9930e33-d9a9-5385-82d9-052762d66cb9 --> `MultiHopTraversal` | `src/context/multi-hop-traversal.ts` | `f9930e33...` |
| <!-- coderef:uuid=62a8484e-07fe-5cef-889a-7c62289317dc --> `TaskContextGenerator` | `src/context/task-context-generator.ts` | `62a8484e...` |
| <!-- coderef:uuid=da81c423-37ac-5764-a37d-d831f5d304ba --> `TestPatternAnalyzer` | `src/context/test-pattern-analyzer.ts` | `da81c423...` |
| <!-- coderef:uuid=2bb6ae62-ca07-5412-9e35-bcf05098fb59 --> `CodeRefError` | `src/errors/CodeRefError.ts` | `2bb6ae62...` |
| <!-- coderef:uuid=5afbd9d0-97a1-5915-800c-b991aab4d589 --> `FileNotFoundError` | `src/errors/FileNotFoundError.ts` | `5afbd9d0...` |
| <!-- coderef:uuid=aabc87a9-a8e3-546f-bf27-7db5ceb90118 --> `IndexError` | `src/errors/IndexError.ts` | `aabc87a9...` |
| <!-- coderef:uuid=63d641c3-d0a7-5f18-a895-407e5fc6037f --> `ParseError` | `src/errors/ParseError.ts` | `63d641c3...` |
| <!-- coderef:uuid=146d9f0a-50ab-512c-99ab-9ca70b809bcf --> `ScanError` | `src/errors/ScanError.ts` | `146d9f0a...` |
| <!-- coderef:uuid=890769ea-5a17-5ca2-93bc-693c6410edd8 --> `ValidationError` | `src/errors/ValidationError.ts` | `890769ea...` |
| <!-- coderef:uuid=feb71d78-cb35-5bcc-aadd-6407fee21afa --> `GraphExporter` | `src/export/graph-exporter.ts` | `feb71d78...` |
| <!-- coderef:uuid=1fd2283d-90ab-506e-bb44-558a1578e210 --> `CodeRefFormatter` | `src/formatter/formatter.ts` | `1fd2283d...` |
| <!-- coderef:uuid=71888023-e26e-5f8c-80f6-d83629ce80b2 --> `IndexStore` | `src/indexer/index-store.ts` | `71888023...` |
| <!-- coderef:uuid=6d8b5ba5-ebb7-5fb7-8cdc-9dec8150067b --> `IndexerService` | `src/indexer/indexer-service.ts` | `6d8b5ba5...` |
| <!-- coderef:uuid=ff01f852-e6ff-51cf-870b-9592e6c6d8b2 --> `MetadataIndex` | `src/indexer/metadata-index.ts` | `ff01f852...` |
| <!-- coderef:uuid=d0711540-a51d-5024-9aaa-5b819a41d3c4 --> `QueryEngine` | `src/indexer/query-engine.ts` | `d0711540...` |
| <!-- coderef:uuid=41a65e0f-7d1d-5a82-98c9-95718f4668a8 --> `RelationshipIndex` | `src/indexer/relationship-index.ts` | `41a65e0f...` |
| <!-- coderef:uuid=62209f5b-577e-579e-bf06-6c97f828c32a --> `AIPromptGenerator` | `src/integration/ai-prompt-generator.ts` | `62209f5b...` |
| <!-- coderef:uuid=5c4446f7-30dc-5783-b8a8-f598e9178b5e --> `AnthropicProvider` | `src/integration/llm/anthropic-provider.ts` | `5c4446f7...` |
| <!-- coderef:uuid=5686ad2e-499b-5261-8e8d-142f02af6218 --> `LLMError` | `src/integration/llm/llm-provider.ts` | `5686ad2e...` |
| <!-- coderef:uuid=84ef7de9-135a-5651-bc0c-901e60bf0fec --> `ProviderDoesNotSupportEmbeddings` | `src/integration/llm/model-registry.ts` | `84ef7de9...` |
| <!-- coderef:uuid=26b9c9ce-8df4-5eda-bb5f-7a0260bf1447 --> `OllamaProvider` | `src/integration/llm/ollama-provider.ts` | `26b9c9ce...` |
| <!-- coderef:uuid=a278d41f-df00-521f-93e7-9dbe6a65de00 --> `OpenAIProvider` | `src/integration/llm/openai-provider.ts` | `a278d41f...` |
| <!-- coderef:uuid=ed895f06-e4d5-5fb7-a088-c62122a80c22 --> `Cls0` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod0.ts` | `ed895f06...` |
| <!-- coderef:uuid=c5007825-afb8-54a5-a27a-975a851ef397 --> `Cls1` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod1.ts` | `c5007825...` |
| <!-- coderef:uuid=73491a02-12a8-522f-aea8-9272df00c9b9 --> `Cls2` | `src/integration/rag/__tests__/fixtures/dual-ac-frozen/src/mod2.ts` | `73491a02...` |
| <!-- coderef:uuid=e1d7b1ab-8de0-52c1-8e52-ef84e20aeac2 --> `AnswerGenerationService` | `src/integration/rag/answer-generation-service.ts` | `e1d7b1ab...` |
| <!-- coderef:uuid=a2f36853-a535-5495-993d-28c91a5cd368 --> `ChunkConverter` | `src/integration/rag/chunk-converter.ts` | `a2f36853...` |
| <!-- coderef:uuid=ffd025c5-e18c-5ae0-a221-beb0105f7592 --> `ConfidenceScorer` | `src/integration/rag/confidence-scorer.ts` | `ffd025c5...` |
| <!-- coderef:uuid=0d9fce31-f9b8-5ccc-a929-3c036968d2b8 --> `ContextBuilder` | `src/integration/rag/context-builder.ts` | `0d9fce31...` |
| <!-- coderef:uuid=578a6b1c-a6bc-5b43-b894-708b5a0c4eb3 --> `ConversationManager` | `src/integration/rag/conversation-manager.ts` | `578a6b1c...` |
| <!-- coderef:uuid=8ac87808-8633-572a-9a67-cf52562b54eb --> `EmbeddingService` | `src/integration/rag/embedding-service.ts` | `8ac87808...` |
| <!-- coderef:uuid=6fdf8568-2170-50ca-8223-7f3093e57db5 --> `EmbeddingTextGenerator` | `src/integration/rag/embedding-text-generator.ts` | `6fdf8568...` |
| <!-- coderef:uuid=0d0225f9-300e-506d-a0d6-837898da9453 --> `GraphReRanker` | `src/integration/rag/graph-reranker.ts` | `0d0225f9...` |
| <!-- coderef:uuid=f5c5c197-c021-5c2a-96fa-28630b430f67 --> `IncrementalIndexer` | `src/integration/rag/incremental-indexer.ts` | `f5c5c197...` |
| <!-- coderef:uuid=37106727-7895-5ced-b9fd-6c4b12249fa9 --> `IndexingOrchestrator` | `src/integration/rag/indexing-orchestrator.ts` | `37106727...` |
| <!-- coderef:uuid=2608ef6c-1e5a-5ecc-8721-2f54bc272ade --> `PromptTemplateBuilder` | `src/integration/rag/prompt-templates.ts` | `2608ef6c...` |
| <!-- coderef:uuid=1ff1abdc-a0c0-5292-a64b-e280c911b8d1 --> `PromptValidator` | `src/integration/rag/prompt-templates.ts` | `1ff1abdc...` |
| <!-- coderef:uuid=383d815e-6305-562a-9be9-015b438a1007 --> `ConfigError` | `src/integration/rag/rag-config.ts` | `383d815e...` |
| <!-- coderef:uuid=96cae6af-0559-58bd-bfca-bef0a81ded84 --> `RAGConfigLoader` | `src/integration/rag/rag-config.ts` | `96cae6af...` |
| <!-- coderef:uuid=81aaba72-3e46-5c7a-92a0-6e3a45562eb3 --> `SemanticSearchService` | `src/integration/rag/semantic-search.ts` | `81aaba72...` |
| <!-- coderef:uuid=432b7608-b48f-5851-97f4-c4e8abb3fc8c --> `ChromaStore` | `src/integration/vector/chroma-store.ts` | `432b7608...` |
| <!-- coderef:uuid=07d0d87f-abaf-55f5-a6da-845057590842 --> `PineconeStore` | `src/integration/vector/pinecone-store.ts` | `07d0d87f...` |
| <!-- coderef:uuid=1d462e28-e64a-5d32-9773-71a84153feb7 --> `SQLiteVectorStore` | `src/integration/vector/sqlite-store.ts` | `1d462e28...` |
| <!-- coderef:uuid=9d758077-704d-5d18-9e92-3fa7fd50373f --> `VectorStoreError` | `src/integration/vector/vector-store.ts` | `9d758077...` |
| <!-- coderef:uuid=91fc9af0-04f4-5461-82e8-7dcc8d4ec1cf --> `CodeRefParser` | `src/parser/parser.ts` | `91fc9af0...` |
| <!-- coderef:uuid=cd64cc90-d639-5f55-ab43-7334beda4261 --> `ElementExtractor` | `src/pipeline/extractors/element-extractor.ts` | `cd64cc90...` |
| <!-- coderef:uuid=e9593c19-256a-5f05-9e84-bf814e73afe7 --> `RelationshipExtractor` | `src/pipeline/extractors/relationship-extractor.ts` | `e9593c19...` |
| <!-- coderef:uuid=5d5923a8-d749-5a14-9ef4-abde310b02c7 --> `ComplexityGenerator` | `src/pipeline/generators/complexity-generator.ts` | `5d5923a8...` |
| <!-- coderef:uuid=8a5c746a-20c3-588e-967e-13a3c8e66f55 --> `ContextGenerator` | `src/pipeline/generators/context-generator.ts` | `8a5c746a...` |
| <!-- coderef:uuid=0bc9cf1b-76c8-5e71-93ca-a9fa73df60fa --> `CoverageGenerator` | `src/pipeline/generators/coverage-generator.ts` | `0bc9cf1b...` |
| <!-- coderef:uuid=9e2003f6-6cac-55c2-b6a4-935b9dac97b6 --> `DiagramGenerator` | `src/pipeline/generators/diagram-generator.ts` | `9e2003f6...` |
| <!-- coderef:uuid=0ba24163-0a07-59fa-a98c-2e138483f9f0 --> `DriftGenerator` | `src/pipeline/generators/drift-generator.ts` | `0ba24163...` |
| <!-- coderef:uuid=e1958a61-6008-5e8f-b7e3-20cf83ec3c7d --> `ExportGenerator` | `src/pipeline/generators/export-generator.ts` | `e1958a61...` |
| <!-- coderef:uuid=0a2e3773-7393-52da-b64e-b0b12c31189f --> `GraphGenerator` | `src/pipeline/generators/graph-generator.ts` | `0a2e3773...` |
| <!-- coderef:uuid=437baf0b-2b52-5d24-92eb-2b684de3e575 --> `HealthGenerator` | `src/pipeline/generators/health-generator.ts` | `437baf0b...` |
| <!-- coderef:uuid=b9740d68-a75d-576d-af4e-88dbd61e5cd1 --> `IndexGenerator` | `src/pipeline/generators/index-generator.ts` | `b9740d68...` |
| <!-- coderef:uuid=6902747f-ba5f-5776-a76e-d2732fc5f7e6 --> `PatternGenerator` | `src/pipeline/generators/pattern-generator.ts` | `6902747f...` |
| <!-- coderef:uuid=2c59b77b-8b6b-55c9-a3aa-05af2506f03d --> `RegistryGenerator` | `src/pipeline/generators/registry-generator.ts` | `2c59b77b...` |
| <!-- coderef:uuid=80163cd6-e363-5229-82c8-e305ede8777a --> `ValidationGenerator` | `src/pipeline/generators/validation-generator.ts` | `80163cd6...` |
| <!-- coderef:uuid=11aebac3-6bdd-5c12-a06d-e6db1e92ee12 --> `GrammarRegistry` | `src/pipeline/grammar-registry.ts` | `11aebac3...` |
| <!-- coderef:uuid=1848f36b-ac10-5b2a-8145-66d38d625e3b --> `IncrementalCache` | `src/pipeline/incremental-cache.ts` | `1848f36b...` |
| <!-- coderef:uuid=5aa75d75-60d4-5adf-8b89-4fe661cb4033 --> `PipelineOrchestrator` | `src/pipeline/orchestrator.ts` | `5aa75d75...` |
| <!-- coderef:uuid=edde1bcf-c776-52ff-9f23-89461d48cc0b --> `PluginError` | `src/plugins/plugin-registry.ts` | `edde1bcf...` |
| <!-- coderef:uuid=3ee1f75d-ce33-5e02-873d-5e1601a60a38 --> `PluginRegistry` | `src/plugins/plugin-registry.ts` | `3ee1f75d...` |
| <!-- coderef:uuid=0faf4485-d2b2-52ec-b8c0-53e47096f457 --> `QueryExecutor` | `src/query/query-executor.ts` | `0faf4485...` |
| <!-- coderef:uuid=2a678e09-bfa8-5ba3-bec9-9b1077f9197e --> `EntityRegistry` | `src/registry/entity-registry.ts` | `2a678e09...` |
| <!-- coderef:uuid=0c36c439-8bea-5940-a57c-0c3e8d16a818 --> `FileWatcher` | `src/scanner/file-watcher.ts` | `0c36c439...` |
| <!-- coderef:uuid=d37e4be7-335f-52d3-9bc8-9f00249aa466 --> `LRUCache` | `src/scanner/lru-cache.ts` | `d37e4be7...` |
| <!-- coderef:uuid=530764ac-ee68-5f3b-b672-426f179b78af --> `TreeSitterScanner` | `src/scanner/tree-sitter-scanner.ts` | `530764ac...` |
| <!-- coderef:uuid=5bccbaa2-0b7d-5bf4-95d5-7a552f5b676f --> `SearchIndex` | `src/search/search-engine.ts` | `5bccbaa2...` |
| <!-- coderef:uuid=a623b94b-4cde-5793-bf7e-9ce42f46e235 --> `SearchEngine` | `src/search/search-engine.ts` | `a623b94b...` |
| <!-- coderef:uuid=e7651ac6-97ca-521e-8e70-6bfc088d64aa --> `ASTExtractor` | `src/semantic/ast-extractor.ts` | `e7651ac6...` |
| <!-- coderef:uuid=8e4d4a9b-54fd-5ad4-aa32-84ddb8ffc5a0 --> `HeaderGenerator` | `src/semantic/header-generator.ts` | `8e4d4a9b...` |
| <!-- coderef:uuid=5881a164-7b95-56dd-b96e-54c876788326 --> `LLMEnricher` | `src/semantic/llm-enricher.ts` | `5881a164...` |
| <!-- coderef:uuid=7d40e33c-17fc-5522-878e-ad748909e1bf --> `SemanticOrchestrator` | `src/semantic/orchestrator.ts` | `7d40e33c...` |
| <!-- coderef:uuid=1acabadf-d255-5089-a097-4501e50cb17d --> `RegistrySyncer` | `src/semantic/registry-sync.ts` | `1acabadf...` |
| <!-- coderef:uuid=d69e45be-f38e-5504-8acb-9bef250a2ec8 --> `OpenAI` | `src/types/external-modules.d.ts` | `d69e45be...` |
| <!-- coderef:uuid=62cc366d-e872-5107-9cf2-08ac4b842aea --> `Anthropic` | `src/types/external-modules.d.ts` | `62cc366d...` |
| <!-- coderef:uuid=1a5f3909-18a9-5c29-8735-31a037111ac7 --> `ChromaClient` | `src/types/external-modules.d.ts` | `1a5f3909...` |
| <!-- coderef:uuid=30ab4261-cb24-5e9d-af33-b4b704447132 --> `Collection` | `src/types/external-modules.d.ts` | `30ab4261...` |
| <!-- coderef:uuid=b1a25a3e-cea3-5ef6-875a-9d50632b2d55 --> `Pinecone` | `src/types/external-modules.d.ts` | `b1a25a3e...` |
| <!-- coderef:uuid=ccc85769-7a66-50a4-b1b1-eb4ac5e12311 --> `SemanticParameterMapper` | `src/validator/migration-mapper.ts` | `ccc85769...` |
| <!-- coderef:uuid=2a0b5feb-c3d0-5e6d-b8fd-333c51c8c48b --> `CodeRefValidator` | `src/validator/validator.ts` | `2a0b5feb...` |

---

## Exported Interfaces (344)

| Interface | File | UUID |
|-----------|------|------|
| <!-- coderef:uuid=5d9dc906-8b1b-5569-adb4-d6322f9b2b41 --> `MockEnvironment` | `__tests__/generators/helpers.ts` | `5d9dc906...` |
| <!-- coderef:uuid=f0ca744e-c2b6-5e1e-8f11-b945f9d88729 --> `ConversionOptions` | `src/adapter/graph-to-elements.ts` | `f0ca744e...` |
| <!-- coderef:uuid=14d3fbd0-ea1e-5f72-87b7-889b6333c467 --> `AnalysisResult` | `src/analyzer/analyzer-service.ts` | `14d3fbd0...` |
| <!-- coderef:uuid=e8c45bf5-eda8-56ad-aa7e-8edcb0ef950c --> `ASTScanResult` | `src/analyzer/ast-element-scanner.ts` | `e8c45bf5...` |
| <!-- coderef:uuid=73b3fc26-f294-5395-9751-4610b2170dd8 --> `CallExpression` | `src/analyzer/call-detector.ts` | `73b3fc26...` |
| <!-- coderef:uuid=11fd322c-93b0-5a1b-b561-a8b2ee1f7e7c --> `CallEdge` | `src/analyzer/call-detector.ts` | `11fd322c...` |
| <!-- coderef:uuid=7e71b490-54ca-5e6f-b6fb-c2548bbb4a90 --> `PackageJsonAnalysis` | `src/analyzer/config-analyzer.ts` | `7e71b490...` |
| <!-- coderef:uuid=b926c20a-4b2b-5d15-aff2-d5dba509547a --> `TsConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `b926c20a...` |
| <!-- coderef:uuid=2197e2a0-7a5d-5bd9-a659-668072a2e810 --> `DockerfileStage` | `src/analyzer/config-analyzer.ts` | `2197e2a0...` |
| <!-- coderef:uuid=30754209-b795-593b-b6c2-0db7055c55d5 --> `DockerfileAnalysis` | `src/analyzer/config-analyzer.ts` | `30754209...` |
| <!-- coderef:uuid=6666ff7f-8c14-5d03-a324-c3acc876f38f --> `DockerComposeService` | `src/analyzer/config-analyzer.ts` | `6666ff7f...` |
| <!-- coderef:uuid=e252dbe3-6cec-59bb-87ca-4d5e5f18e150 --> `DockerComposeAnalysis` | `src/analyzer/config-analyzer.ts` | `e252dbe3...` |
| <!-- coderef:uuid=90a9ccbc-4930-5182-9777-c8a34f73ac9f --> `GitHubActionStep` | `src/analyzer/config-analyzer.ts` | `90a9ccbc...` |
| <!-- coderef:uuid=03e29f4c-0ba7-54d5-99ec-0159bd7964f9 --> `GitHubActionJob` | `src/analyzer/config-analyzer.ts` | `03e29f4c...` |
| <!-- coderef:uuid=43de36eb-fb7c-5996-8656-954f3017cb41 --> `GitHubActionWorkflow` | `src/analyzer/config-analyzer.ts` | `43de36eb...` |
| <!-- coderef:uuid=7e8727b6-c7bb-5954-b26a-1d025058e9b3 --> `EnvFileAnalysis` | `src/analyzer/config-analyzer.ts` | `7e8727b6...` |
| <!-- coderef:uuid=fb7f5cf4-6c77-5bcb-bd94-6194a9a4b3d8 --> `ConfigAnalysis` | `src/analyzer/config-analyzer.ts` | `fb7f5cf4...` |
| <!-- coderef:uuid=037005bb-6d36-566d-a092-149361a98abc --> `OpenApiSpec` | `src/analyzer/contract-detector.ts` | `037005bb...` |
| <!-- coderef:uuid=5bc34cb9-a838-5338-ba74-ec2e4e860762 --> `OpenApiPath` | `src/analyzer/contract-detector.ts` | `5bc34cb9...` |
| <!-- coderef:uuid=5d764a51-77c9-5338-bf6c-ea912c8f5bef --> `OpenApiComponent` | `src/analyzer/contract-detector.ts` | `5d764a51...` |
| <!-- coderef:uuid=534eec33-af64-5f59-9d23-dc60079d1851 --> `GraphqlSchema` | `src/analyzer/contract-detector.ts` | `534eec33...` |
| <!-- coderef:uuid=4664697f-b26d-5ad6-aa7e-9abf14e0fdd0 --> `GraphqlType` | `src/analyzer/contract-detector.ts` | `4664697f...` |
| <!-- coderef:uuid=c8ee4e84-5c07-5eb2-b22f-a3a9d706ae13 --> `GraphqlOperation` | `src/analyzer/contract-detector.ts` | `c8ee4e84...` |
| <!-- coderef:uuid=bd0b0389-029b-5bec-ac7c-ac20828151cc --> `ProtobufDefinition` | `src/analyzer/contract-detector.ts` | `bd0b0389...` |
| <!-- coderef:uuid=418ebf1f-c567-51f5-a0ea-f7ea14c4f535 --> `ProtobufMessage` | `src/analyzer/contract-detector.ts` | `418ebf1f...` |
| <!-- coderef:uuid=e610dc0f-eb38-5eeb-bd80-9776b811ffed --> `ProtobufField` | `src/analyzer/contract-detector.ts` | `e610dc0f...` |
| <!-- coderef:uuid=cbeef7e3-1f23-5253-9d96-d3367d26ca79 --> `ProtobufService` | `src/analyzer/contract-detector.ts` | `cbeef7e3...` |
| <!-- coderef:uuid=8a4e645f-9af0-5ea4-b557-cdd2fb8d08b1 --> `ProtobufMethod` | `src/analyzer/contract-detector.ts` | `8a4e645f...` |
| <!-- coderef:uuid=7b63f1f8-cfc0-561a-89b9-7f10e38a2e0b --> `ProtobufEnum` | `src/analyzer/contract-detector.ts` | `7b63f1f8...` |
| <!-- coderef:uuid=1b4add4c-0178-53c5-96ca-a8d7590df925 --> `JsonSchema` | `src/analyzer/contract-detector.ts` | `1b4add4c...` |

*... and 314 more interfaces. See index.json for complete list.*

---

## Exported Type Aliases (45)

| Type | File | UUID |
|------|------|------|
| <!-- coderef:uuid=b052bc9d-940d-5167-ac7a-8de90eec4f6f --> `DesignPatternType` | `src/analyzer/design-pattern-detector.ts` | `b052bc9d...` |
| <!-- coderef:uuid=15a5a3db-9da5-55a6-935f-f267c3b6e033 --> `EntryPointType` | `src/analyzer/entry-detector.ts` | `15a5a3db...` |
| <!-- coderef:uuid=3a7f6b89-6c4e-50bc-a729-61ae3cd69967 --> `ProjectCategory` | `src/analyzer/project-classifier.ts` | `3a7f6b89...` |
| <!-- coderef:uuid=686c48ac-f45c-54a6-80e5-77446b0d618d --> `ApiServiceType` | `src/analyzer/project-classifier.ts` | `686c48ac...` |
| <!-- coderef:uuid=7f9c57d8-4719-512a-ab86-3c5c83e93c66 --> `WebAppType` | `src/analyzer/project-classifier.ts` | `7f9c57d8...` |
| <!-- coderef:uuid=cfb681c8-e716-5794-9aa6-9a7e4e064a4c --> `SupportedCliLanguage` | `src/cli/detect-languages.ts` | `cfb681c8...` |
| <!-- coderef:uuid=821a1e90-c8eb-50df-ae92-280d37692ae6 --> `ExportFormat` | `src/export/graph-exporter.ts` | `821a1e90...` |
| <!-- coderef:uuid=2ff35913-1b49-512e-9efd-6919d27a1582 --> `ExportedGraphEdgeRelationship` | `src/export/graph-exporter.ts` | `2ff35913...` |
| <!-- coderef:uuid=dc11097f-3989-5ff4-89fb-f798932ed446 --> `ExportedGraphEdgeResolutionStatus` | `src/export/graph-exporter.ts` | `dc11097f...` |
| <!-- coderef:uuid=5d0c73e5-a5f8-52e0-a0af-1a5485d7fa40 --> `IndexSchemaVersion` | `src/fileGeneration/index-storage.ts` | `5d0c73e5...` |
| <!-- coderef:uuid=3330074a-b06a-53e4-9e3d-88f35c5232e8 --> `IndexFormat` | `src/fileGeneration/index-storage.ts` | `3330074a...` |
| <!-- coderef:uuid=baeafd8d-77d5-5c9c-8518-1f6be21946ee --> `IndexingStage` | `src/indexer/indexer-service.ts` | `baeafd8d...` |
| <!-- coderef:uuid=47ab1959-07f1-5472-80ea-d67fd4c2b560 --> `MetadataCategory` | `src/indexer/metadata-index.ts` | `47ab1959...` |
| <!-- coderef:uuid=c21929e5-476a-5ac9-9035-974186466e8a --> `QueryFilter` | `src/indexer/query-engine.ts` | `c21929e5...` |
| <!-- coderef:uuid=93e17632-cd55-59d7-a370-9078f08ad868 --> `RelationshipType` | `src/indexer/relationship-index.ts` | `93e17632...` |
| <!-- coderef:uuid=6af16d03-18ae-52fc-82e5-abc6503c412b --> `AIQueryType` | `src/integration/ai-prompt-generator.ts` | `6af16d03...` |
| <!-- coderef:uuid=0e9b3ee9-c8a2-5dfd-95aa-f68cea752291 --> `LLMProviderFactory` | `src/integration/llm/llm-provider.ts` | `0e9b3ee9...` |
| <!-- coderef:uuid=1498662a-d241-58a3-b719-c90b9bd300da --> `ProgressCallback` | `src/integration/rag/embedding-service.ts` | `1498662a...` |
| <!-- coderef:uuid=0b5ae7e0-6f23-504f-9adc-baa7296a3078 --> `QueryStrategy` | `src/integration/rag/graph-reranker.ts` | `0b5ae7e0...` |
| <!-- coderef:uuid=e843f5c5-450c-5aaf-a133-398e36da664a --> `IndexingProgressCallback` | `src/integration/rag/indexing-orchestrator.ts` | `e843f5c5...` |
| <!-- coderef:uuid=9f78125d-9d6e-57c7-b9f9-73e784f10c20 --> `SkipReason` | `src/integration/rag/indexing-orchestrator.ts` | `9f78125d...` |
| <!-- coderef:uuid=6e029b02-9982-5ee9-acd4-802ea3e2f087 --> `FailReason` | `src/integration/rag/indexing-orchestrator.ts` | `6e029b02...` |
| <!-- coderef:uuid=ba8fd074-e773-54be-b21e-d733cb01dc30 --> `IndexingStatus` | `src/integration/rag/indexing-orchestrator.ts` | `ba8fd074...` |
| <!-- coderef:uuid=7972fbab-6cc4-5871-898f-57e006c702a0 --> `AbsolutePath` | `src/integration/rag/path-types.ts` | `7972fbab...` |
| <!-- coderef:uuid=b13881a2-4b1c-59ef-be28-2f84e858373f --> `RelativePath` | `src/integration/rag/path-types.ts` | `b13881a2...` |
| <!-- coderef:uuid=154c715f-ee64-54ef-8406-5daafd3bcc29 --> `LLMProviderName` | `src/integration/rag/rag-config.ts` | `154c715f...` |
| <!-- coderef:uuid=af0cc787-7724-5e16-a86e-97a7f303d1a4 --> `VectorStoreFactory` | `src/integration/vector/vector-store.ts` | `af0cc787...` |
| <!-- coderef:uuid=8e0680b5-bd0b-5d50-957f-6671d4b470cc --> `CallResolutionKind` | `src/pipeline/call-resolver.ts` | `8e0680b5...` |
| <!-- coderef:uuid=15fa6d0e-7f4b-5d23-af28-e2918ff28c5e --> `SymbolTable` | `src/pipeline/call-resolver.ts` | `15fa6d0e...` |
| <!-- coderef:uuid=af779a4b-3059-515f-b0d8-369a44f87f0b --> `LayerEnum` | `src/pipeline/element-taxonomy.ts` | `af779a4b...` |
| <!-- coderef:uuid=8e8053a4-c91a-5317-b907-31f186654bae --> `HeaderStatus` | `src/pipeline/element-taxonomy.ts` | `8e8053a4...` |
| <!-- coderef:uuid=3fe68c67-a8df-559f-9675-8e22662a285d --> `EdgeRelationship` | `src/pipeline/graph-builder.ts` | `3fe68c67...` |
| <!-- coderef:uuid=c49c0aa3-0941-520f-8048-7e7982a0d5ab --> `EdgeResolutionStatus` | `src/pipeline/graph-builder.ts` | `c49c0aa3...` |
| <!-- coderef:uuid=a8fe75a7-606b-5c89-a180-fa0b182d2ce9 --> `EdgeEvidence` | `src/pipeline/graph-builder.ts` | `a8fe75a7...` |
| <!-- coderef:uuid=237d872f-fd4f-569c-a4b3-9702209ed135 --> `ImportResolutionKind` | `src/pipeline/import-resolver.ts` | `237d872f...` |
| <!-- coderef:uuid=289b571c-2cab-5004-bceb-77b3ee64b2b8 --> `ExportTable` | `src/pipeline/import-resolver.ts` | `289b571c...` |
| <!-- coderef:uuid=093cc304-7535-5ee0-9a5e-0246727f7104 --> `LanguageExtension` | `src/pipeline/types.ts` | `093cc304...` |
| <!-- coderef:uuid=a497508e-08b1-51d1-81ce-6704d5740ab5 --> `RawExportKind` | `src/pipeline/types.ts` | `a497508e...` |
| <!-- coderef:uuid=43cc591d-cb23-51ce-9fcd-f3c9841e488a --> `PluginSource` | `src/plugins/types.ts` | `43cc591d...` |
| <!-- coderef:uuid=46219662-d558-573f-8404-402ec6303724 --> `QueryType` | `src/query/query-executor.ts` | `46219662...` |
| <!-- coderef:uuid=40f362b1-6437-59b3-a017-fba5a5fe459a --> `ScanErrorType` | `src/scanner/error-reporter.ts` | `40f362b1...` |
| <!-- coderef:uuid=349331b9-3c58-5c6f-945c-8511da788786 --> `ScanErrorSeverity` | `src/scanner/error-reporter.ts` | `349331b9...` |
| <!-- coderef:uuid=0203c58e-c6af-5468-8bc7-360b688e6291 --> `EnrichedElementData` | `src/scanner/tree-sitter-scanner.ts` | `0203c58e...` |
| <!-- coderef:uuid=1e7e0dec-1d31-5e50-905c-41c34eb4bea7 --> `LogLevel` | `src/utils/logger.ts` | `1e7e0dec...` |
| <!-- coderef:uuid=ee166bf3-3b64-5d84-9b85-00ddf3e4f64e --> `ConfidenceLevel` | `src/validator/frontend-update-generator.ts` | `ee166bf3...` |

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
