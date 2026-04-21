# Project Context

## Statistics

- **Total Files:** 296
- **Total Elements:** 1977
- **Total Lines:** 75601
- **Languages:** ts, js, py

## Entry Points

- **convertGraphToElements** (src/adapter/graph-to-elements.ts)
- **getConversionStats** (src/adapter/graph-to-elements.ts)
- **visit** (src/analyzer/ast-element-scanner.ts)
- **visit** (src/analyzer/ast-element-scanner.ts)
- **visit** (src/analyzer/ast-element-scanner.ts)
- **visit** (src/analyzer/ast-element-scanner.ts)
- **scanFileWithAST** (src/analyzer/ast-element-scanner.ts)
- **scanFilesWithAST** (src/analyzer/ast-element-scanner.ts)
- **parseFetchCalls** (src/analyzer/frontend-call-parsers.ts)
- **parseAxiosCalls** (src/analyzer/frontend-call-parsers.ts)
- **parseReactQueryCalls** (src/analyzer/frontend-call-parsers.ts)
- **parseCustomApiCalls** (src/analyzer/frontend-call-parsers.ts)
- **extractHttpMethod** (src/analyzer/frontend-call-parsers.ts)
- **extractCallLocation** (src/analyzer/frontend-call-parsers.ts)
- **dfs** (src/analyzer/graph-analyzer.ts)
- **dfs** (src/analyzer/graph-analyzer.ts)
- **dfs** (src/analyzer/graph-analyzer.ts)
- **dfs** (src/analyzer/graph-analyzer.ts)
- **parseNodeId** (src/analyzer/graph-helpers.ts)
- **getImportsForElement** (src/analyzer/graph-helpers.ts)

## Critical Functions

- **scanCurrentElements** - Complexity: 40, Dependents: 1
  - File: src/scanner/scanner.ts
- **ASTElementScanner.visitNode** - Complexity: 63, Dependents: 0
  - File: src/analyzer/ast-element-scanner.ts
- **EmbeddingTextGenerator.generate** - Complexity: 29, Dependents: 0
  - File: src/integration/rag/embedding-text-generator.ts
- **JSCallDetector.extractExportsFromAST** - Complexity: 55, Dependents: 0
  - File: src/analyzer/js-call-detector.ts
- **JSCallDetector.extractElementsFromAST** - Complexity: 52, Dependents: 0
  - File: src/analyzer/js-call-detector.ts
- **buildDependencyGraph** - Complexity: 8, Dependents: 0
  - File: src/fileGeneration/buildDependencyGraph.ts
- **analyzeCoverage** - Complexity: 6, Dependents: 0
  - File: src/fileGeneration/analyzeCoverage.ts
- **ComplexityGenerator.generate** - Complexity: 6, Dependents: 0
  - File: src/pipeline/generators/complexity-generator.ts
- **AnalyzerService.analyze** - Complexity: 5, Dependents: 0
  - File: src/analyzer/analyzer-service.ts
- **QueryExecutor.execute** - Complexity: 4, Dependents: 0
  - File: src/query/query-executor.ts
- **IndexGenerator.generate** - Complexity: 3, Dependents: 0
  - File: src/pipeline/generators/index-generator.ts
- **ContextGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/context/context-generator.ts
- **CoverageGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/pipeline/generators/coverage-generator.ts
- **DiagramGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/pipeline/generators/diagram-generator.ts
- **DriftGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/pipeline/generators/drift-generator.ts
- **ExportGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/pipeline/generators/export-generator.ts
- **GraphGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/pipeline/generators/graph-generator.ts
- **PatternGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/pipeline/generators/pattern-generator.ts
- **RegistryGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/pipeline/generators/registry-generator.ts
- **ValidationGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/pipeline/generators/validation-generator.ts

## Async Patterns

Found 30 async functions/methods. Consider concurrency implications, error handling (Promise rejection, try/catch), and race conditions when planning features.

- **main** (function)
  - File: demo-all-modules.ts
- **AnalyzerService.analyze** (method)
  - File: src/analyzer/analyzer-service.ts
- **AnalyzerService.saveGraph** (method)
  - File: src/analyzer/analyzer-service.ts
- **AnalyzerService.loadGraph** (method)
  - File: src/analyzer/analyzer-service.ts
- **AnalyzerService.findFiles** (method)
  - File: src/analyzer/analyzer-service.ts
- **scanDirectory** (function)
  - File: src/cli/detect-languages.ts
- **detectProjectLanguages** (function)
  - File: src/cli/detect-languages.ts
- **runGenerator** (function)
  - File: src/cli/populate.ts
- **run** (function)
  - File: src/cli/populate.ts
- **main** (function)
  - File: src/cli/populate.ts
- **main** (function)
  - File: src/cli/scan-frontend-calls.ts
- **resolveFilePaths** (function)
  - File: src/cli/validate-routes.ts
- **main** (function)
  - File: src/cli/validate-routes.ts
- **BreakingChangeDetector.detectChanges** (method)
  - File: src/context/breaking-change-detector.ts
- **BreakingChangeDetector.findImpactedCallSites** (method)
  - File: src/context/breaking-change-detector.ts
- **BreakingChangeDetector.getChangedElements** (method)
  - File: src/context/breaking-change-detector.ts
- **BreakingChangeDetector.extractSignaturesFromRef** (method)
  - File: src/context/breaking-change-detector.ts
- **BreakingChangeDetector.extractSignaturesFromWorktree** (method)
  - File: src/context/breaking-change-detector.ts
- **ContextGenerator.generate** (method)
  - File: src/context/context-generator.ts
- **ContextGenerator.detectPatterns** (method)
  - File: src/context/context-generator.ts
- **analyzeCoverage** (function)
  - File: src/fileGeneration/analyzeCoverage.ts
- **buildDependencyGraph** (function)
  - File: src/fileGeneration/buildDependencyGraph.ts
- **detectDrift** (function)
  - File: src/fileGeneration/detectDrift.ts
- **loadPreviousScan** (function)
  - File: src/fileGeneration/detectDrift.ts
- **writeReport** (function)
  - File: src/fileGeneration/detectDrift.ts
- **detectPatterns** (function)
  - File: src/fileGeneration/detectPatterns.ts
- **generateContext** (function)
  - File: src/fileGeneration/generateContext.ts
- **generateDiagrams** (function)
  - File: src/fileGeneration/generateDiagrams.ts
- **saveFrontendCalls** (function)
  - File: src/fileGeneration/saveFrontendCalls.ts
- **generateFrontendCallsOutput** (function)
  - File: src/fileGeneration/saveFrontendCalls.ts

## High-Priority Test Gaps

Found 35 functions without test coverage. Prioritized by complexity and architectural importance.

- **ASTElementScanner.visitNode** - Complexity: 63
  - File: src/analyzer/ast-element-scanner.ts
- **JSCallDetector.extractExportsFromAST** - Complexity: 55
  - File: src/analyzer/js-call-detector.ts
- **JSCallDetector.extractElementsFromAST** - Complexity: 52
  - File: src/analyzer/js-call-detector.ts
- **scanCurrentElements** - Complexity: 40
  - File: src/scanner/scanner.ts
- **EmbeddingTextGenerator.generate** - Complexity: 29
  - File: src/integration/rag/embedding-text-generator.ts
- **JSCallDetector.extractImportsFromAST** - Complexity: 37
  - File: src/analyzer/js-call-detector.ts
- **ContextBuilder.buildContext** - Complexity: 26
  - File: src/integration/rag/context-builder.ts
- **CodeRefValidator.validateMetadata** - Complexity: 36
  - File: src/validator/validator.ts
- **SemanticSearchService.search** - Complexity: 25
  - File: src/integration/rag/semantic-search.ts
- **SearchIndex.search** - Complexity: 34
  - File: src/search/search-engine.ts
- **GraphBuilder.importGraphFromJSON** - Complexity: 22
  - File: src/analyzer/graph-builder.ts
- **JSCallDetector.visitNode** - Complexity: 32
  - File: src/analyzer/js-call-detector.ts
- **ContextBuilder.buildResultSection** - Complexity: 22
  - File: src/integration/rag/context-builder.ts
- **EmbeddingService.embedChunks** - Complexity: 22
  - File: src/integration/rag/embedding-service.ts
- **CodeRefParser.parse** - Complexity: 29
  - File: src/parser/parser.ts
- **convertGraphToElements** - Complexity: 28
  - File: src/adapter/graph-to-elements.ts
- **GraphAnalyzer.traverse** - Complexity: 18
  - File: src/analyzer/graph-analyzer.ts
- **QueryExecutor.executeQuery** - Complexity: 18
  - File: src/query/query-executor.ts
- **GraphReRanker.rerank** - Complexity: 27
  - File: src/integration/rag/graph-reranker.ts
- **ChromaStore.query** - Complexity: 27
  - File: src/integration/vector/chroma-store.ts
- **AnswerGenerationService.generateAnswer** - Complexity: 16
  - File: src/integration/rag/answer-generation-service.ts
- **PipelineOrchestrator.run** - Complexity: 16
  - File: src/pipeline/orchestrator.ts
- **JSCallDetector.extractParametersFromAST** - Complexity: 24
  - File: src/analyzer/js-call-detector.ts
- **detectPreset** - Complexity: 24
  - File: src/config/presets.ts
- **OpenAIProvider.complete** - Complexity: 24
  - File: src/integration/llm/openai-provider.ts
- **PromptTemplateBuilder.detectQuestionType** - Complexity: 14
  - File: src/integration/rag/prompt-templates.ts
- **TreeSitterScanner.extractCppParameters** - Complexity: 14
  - File: src/scanner/tree-sitter-scanner.ts
- **TaskContextGenerator.filterByTaskRelevance** - Complexity: 13
  - File: src/context/task-context-generator.ts
- **AIPromptGenerator.synthesizeContext** - Complexity: 13
  - File: src/integration/ai-prompt-generator.ts
- **ChunkConverter.convertGraph** - Complexity: 23
  - File: src/integration/rag/chunk-converter.ts
- **ChunkConverter.extractDocumentation** - Complexity: 23
  - File: src/integration/rag/chunk-converter.ts
- **ContextGenerator.resolveTargetElementId** - Complexity: 13
  - File: src/pipeline/generators/context-generator.ts
- **TreeSitterScanner.extractPythonParameters** - Complexity: 13
  - File: src/scanner/tree-sitter-scanner.ts
- **TreeSitterScanner.extractParameters** - Complexity: 13
  - File: src/scanner/tree-sitter-scanner.ts
- **CodeRefValidator.validate** - Complexity: 23
  - File: src/validator/validator.ts

## Module Structure

- **src:** 231 files
- **__tests__:** 37 files
- **autoresearch:** 14 files
- **.:** 7 files
- **scripts:** 3 files
- **utils:** 3 files
- **examples:** 1 files

## Generated

2026-04-14T01:54:28.523Z