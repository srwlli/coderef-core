# Project Context

## Statistics

- **Total Files:** 282
- **Total Elements:** 2006
- **Total Lines:** 81803
- **Languages:** ts, js, py


## Project Classification

- **Category:** hybrid
- **Confidence:** 95%
- **Purpose:** @coderef/CODEREF-CORE is a reusable library/SDK for other developers to import and use with cli-tool capabilities

### Detection Indicators

- CLI entry points: 25
- package.json bin field present
- Library entry points: 19
- Library exports configured
- TypeScript declarations present
- Hybrid: library + cli-tool

### Suggested Use Cases

- Reusable components
- Shared utilities
- SDK distribution
- Developer tooling
- Automation scripts
- System administration


## Architecture Analysis

- **Primary Pattern:** MICROSERVICES
- **Organization:** mixed
- **Coupling:** low
- **Cohesion:** medium
- **Patterns Detected:** 1

### Detected Patterns

- **MICROSERVICES** (60% confidence)
  - Found 0 service directories
  - Found 10 service class implementations
  - Multiple entry points detected (potential service boundaries)


## Configuration Analysis

### Package.json

- **Name:** @coderef/CODEREF-CORE@2.0.0
- **Type:** unknown
- **Dependencies:** 20 production, 4 dev
- **Workspaces:** No

### TypeScript Configuration

- **Target:** ES2020
- **Module:** commonjs
- **Strict Mode:** No
- **Path Mapping:** No
- **Monorepo:** No


## Entry Points

Found 75 application entry points. Primary entry point is marked with ⭐.

- **⭐ index.ts** [library]
  - File: index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/analyzer/frameworks/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/analyzer/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/analyzer/js-call-detector/index.ts
  - Library entry point
- **rag-index.ts** [library]
  - File: src/cli/rag-index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/context/breaking-change-detector/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/context/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/errors/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/export/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/indexer/index.ts
  - Library entry point
- **metadata-index.ts** [library]
  - File: src/indexer/metadata-index.ts
  - Library entry point
- **relationship-index.ts** [library]
  - File: src/indexer/relationship-index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/integration/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/integration/llm/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/integration/rag/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/integration/vector/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/pipeline/index.ts
  - Library entry point
- **index.ts** [library]
  - File: src/search/index.ts
  - Library entry point
- **main** [cli]
  - File: demo-all-modules.ts
  - CLI command handler (main)
- **run** [cli]
  - File: src/cli/populate.ts
  - CLI command handler (run)
- **main** [cli]
  - File: src/cli/populate.ts
  - CLI command handler (main)
- **main** [cli]
  - File: src/cli/rag-index.ts
  - CLI command handler (main)
- **main** [cli]
  - File: src/cli/rag-search.ts
  - CLI command handler (main)
- **main** [cli]
  - File: src/cli/rag-status.ts
  - CLI command handler (main)
- **main** [cli]
  - File: src/cli/scan-frontend-calls.ts
  - CLI command handler (main)
- **main** [cli]
  - File: src/cli/scan.ts
  - CLI command handler (main)
- **main** [cli]
  - File: src/cli/validate-routes.ts
  - CLI command handler (main)
- **main** [cli]
  - File: scripts/doc-gen/enhance-existing-docs.js
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/pipeline-quality/scripts/verify_test_gap_pipeline.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/01-element-classification/apply_iteration_5.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/03-test-coverage-linkage/apply_iteration_1.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/04-async-pattern-detection/apply_iteration_1.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/05-context-summary-signal/apply_iteration_1.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/06-test-gap-precision/apply_iteration_1.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/scripts/verify_async_patterns.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/scripts/verify_context_signal.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/scripts/verify_element_classification.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/scripts/verify_export_relationships.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/scripts/verify_test_gap_precision.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: autoresearch/scanner-quality/scripts/verify_test_linkage.py
  - CLI command handler (main)
- **main** [cli] (exported)
  - File: __tests__/.test-venv-fixtures/src/app.py
  - CLI command handler (main)
- **DynamicImportDetector.getArrowFunctionName** [serverless]
  - File: src/analyzer/dynamic-import-detector.ts
  - Serverless function handler (DynamicImportDetector.getArrowFunctionName)
- **EntryPointDetector.isServerlessHandler** [serverless]
  - File: src/analyzer/entry-detector.ts
  - Serverless function handler (EntryPointDetector.isServerlessHandler)
- **MiddlewareHandler** [serverless] (exported)
  - File: src/analyzer/middleware-detector.ts
  - Serverless function handler (MiddlewareHandler)
- **MiddlewareDetector.detectExpressHandlers** [serverless]
  - File: src/analyzer/middleware-detector.ts
  - Serverless function handler (MiddlewareDetector.detectExpressHandlers)
- **MarkdownFormatter.formatCriticalFunctions** [serverless]
  - File: src/context/markdown-formatter.ts
  - Serverless function handler (MarkdownFormatter.formatCriticalFunctions)
- **TestPatternAnalyzer.extractTestedFunctions** [serverless]
  - File: src/context/test-pattern-analyzer.ts
  - Serverless function handler (TestPatternAnalyzer.extractTestedFunctions)
- **detectHandlers** [serverless]
  - File: src/fileGeneration/detectPatterns.ts
  - Serverless function handler (detectHandlers)
- **ElementExtractor.createFunctionElement** [serverless]
  - File: src/pipeline/extractors/element-extractor.ts
  - Serverless function handler (ElementExtractor.createFunctionElement)
- **ElementExtractor.extractCppFunctionName** [serverless]
  - File: src/pipeline/extractors/element-extractor.ts
  - Serverless function handler (ElementExtractor.extractCppFunctionName)
- **ElementExtractor.isAsyncFunction** [serverless]
  - File: src/pipeline/extractors/element-extractor.ts
  - Serverless function handler (ElementExtractor.isAsyncFunction)
- **ContextGenerator.findCriticalFunctions** [serverless]
  - File: src/pipeline/generators/context-generator.ts
  - Serverless function handler (ContextGenerator.findCriticalFunctions)
- **isInternalFunction** [serverless] (exported)
  - File: src/pipeline/generators/pattern-generator.ts
  - Serverless function handler (isInternalFunction)
- **TreeSitterScanner.extractCppFunctionName** [serverless]
  - File: src/scanner/tree-sitter-scanner.ts
  - Serverless function handler (TreeSitterScanner.extractCppFunctionName)
- **TreeSitterScanner.createFunctionElement** [serverless]
  - File: src/scanner/tree-sitter-scanner.ts
  - Serverless function handler (TreeSitterScanner.createFunctionElement)
- **count_async_functions** [serverless] (exported)
  - File: autoresearch/pipeline-quality/scripts/verify_async_pattern_pipeline.py
  - Serverless function handler (count_async_functions)
- **scan_and_get_detected_critical_functions** [serverless] (exported)
  - File: autoresearch/pipeline-quality/scripts/verify_critical_function_pipeline.py
  - Serverless function handler (scan_and_get_detected_critical_functions)
- **build_known_async_functions** [serverless] (exported)
  - File: autoresearch/scanner-quality/scripts/verify_async_patterns.py
  - Serverless function handler (build_known_async_functions)
- **extract_critical_functions** [serverless] (exported)
  - File: autoresearch/scanner-quality/scripts/verify_context_signal.py
  - Serverless function handler (extract_critical_functions)
- **scanner-worker.ts** [job]
  - File: src/scanner/scanner-worker.ts
  - Scheduled job entry
- **GitHubActionJob** [job] (exported)
  - File: src/analyzer/config-analyzer.ts
  - Job/task handler (GitHubActionJob)
- **EntryPointDetector.isJobHandler** [job]
  - File: src/analyzer/entry-detector.ts
  - Job/task handler (EntryPointDetector.isJobHandler)
- **TaskContextGenerator** [job] (exported)
  - File: src/context/task-context-generator.ts
  - Job/task handler (TaskContextGenerator)
- **TaskContextGenerator.addDependencies** [job]
  - File: src/context/task-context-generator.ts
  - Job/task handler (TaskContextGenerator.addDependencies)
- **TaskContextGenerator.filterByTaskRelevance** [job]
  - File: src/context/task-context-generator.ts
  - Job/task handler (TaskContextGenerator.filterByTaskRelevance)
- **TaskContextGenerator.calculateImpactScope** [job]
  - File: src/context/task-context-generator.ts
  - Job/task handler (TaskContextGenerator.calculateImpactScope)
- **TaskContextGenerator.generateTaskContext** [job]
  - File: src/context/task-context-generator.ts
  - Job/task handler (TaskContextGenerator.generateTaskContext)
- **TaskContextGenerator.calculateTransitiveDependents** [job]
  - File: src/context/task-context-generator.ts
  - Job/task handler (TaskContextGenerator.calculateTransitiveDependents)
- **TaskContextGenerator.matchPattern** [job]
  - File: src/context/task-context-generator.ts
  - Job/task handler (TaskContextGenerator.matchPattern)
- **TaskSpecificContext** [job] (exported)
  - File: src/context/types.ts
  - Job/task handler (TaskSpecificContext)
- **TaskContext** [job] (exported)
  - File: src/context/types.ts
  - Job/task handler (TaskContext)
- **WorkerMessage** [job]
  - File: src/scanner/scanner-worker.ts
  - Job/task handler (WorkerMessage)

## Critical Functions

- **ContextGenerator.generateMarkdown** - Complexity: 102, Dependents: 0
  - File: src/pipeline/generators/context-generator.ts
- **scanCurrentElements** - Complexity: 40, Dependents: 1
  - File: src/scanner/scanner.ts
- **EmbeddingTextGenerator.generate** - Complexity: 30, Dependents: 0
  - File: src/integration/rag/embedding-text-generator.ts
- **ASTElementScanner.visitNode** - Complexity: 63, Dependents: 0
  - File: src/analyzer/ast-element-scanner.ts
- **extractExportsFromAST** - Complexity: 55, Dependents: 3
  - File: src/analyzer/js-call-detector/module-analyzer.ts
- **extractElementsFromAST** - Complexity: 51, Dependents: 3
  - File: src/analyzer/js-call-detector/visitor.ts
- **DatabaseDetector.detect** - Complexity: 9, Dependents: 0
  - File: src/analyzer/database-detector.ts
- **buildDependencyGraph** - Complexity: 8, Dependents: 0
  - File: src/fileGeneration/buildDependencyGraph.ts
- **ConfigAnalyzer.analyze** - Complexity: 7, Dependents: 0
  - File: src/analyzer/config-analyzer.ts
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
- **FrameworkRegistry.detect** - Complexity: 3, Dependents: 0
  - File: src/scanner/framework-registry.ts
- **DependencyAnalyzer.analyze** - Complexity: 2, Dependents: 0
  - File: src/analyzer/dependency-analyzer.ts
- **DesignPatternDetector.analyze** - Complexity: 2, Dependents: 0
  - File: src/analyzer/design-pattern-detector.ts
- **DocsAnalyzer.analyze** - Complexity: 2, Dependents: 0
  - File: src/analyzer/docs-analyzer.ts
- **EntryPointDetector.detect** - Complexity: 2, Dependents: 0
  - File: src/analyzer/entry-detector.ts
- **ContextGenerator.generate** - Complexity: 2, Dependents: 0
  - File: src/context/context-generator.ts

## Dependency Risk Analysis

- **Risk Level:** LOW (11/100)
- **Total Dependencies:** 24 (20 direct, 4 dev)
- **Issues Found:** 27 (8 outdated, 0 vulnerabilities, 0 circular imports, 19 potentially unused)

### Risk Details

🟢 **Low:**
- **@babel/parser** (unused): Dependency '@babel/parser' is declared but may not be imported in source code
- **@babel/traverse** (unused): Dependency '@babel/traverse' is declared but may not be imported in source code
- **@babel/types** (unused): Dependency '@babel/types' is declared but may not be imported in source code
- **@pinecone-database/pinecone** (unused): Dependency '@pinecone-database/pinecone' is declared but may not be imported in source code
- **acorn** (unused): Dependency 'acorn' is declared but may not be imported in source code
- **chromadb** (unused): Dependency 'chromadb' is declared but may not be imported in source code
- **glob** (unused): Dependency 'glob' is declared but may not be imported in source code
- **minimatch** (unused): Dependency 'minimatch' is declared but may not be imported in source code
- **openai** (unused): Dependency 'openai' is declared but may not be imported in source code
- **protobufjs** (unused): Dependency 'protobufjs' is declared but may not be imported in source code
  - ... and 17 more low-severity items


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
- **DependencyAnalyzer.analyze** (method)
  - File: src/analyzer/dependency-analyzer.ts
- **DependencyAnalyzer.loadPackageJson** (method)
  - File: src/analyzer/dependency-analyzer.ts
- **DependencyAnalyzer.runNpmAudit** (method)
  - File: src/analyzer/dependency-analyzer.ts
- **DependencyAnalyzer.analyzeDependency** (method)
  - File: src/analyzer/dependency-analyzer.ts
- **DependencyAnalyzer.checkIfOutdated** (method)
  - File: src/analyzer/dependency-analyzer.ts
- **DependencyAnalyzer.getLatestVersion** (method)
  - File: src/analyzer/dependency-analyzer.ts
- **DependencyAnalyzer.checkIfUsed** (method)
  - File: src/analyzer/dependency-analyzer.ts
- **DependencyAnalyzer.getLicenseInfo** (method)
  - File: src/analyzer/dependency-analyzer.ts
- **analyzeDependencyHealth** (function)
  - File: src/analyzer/dependency-analyzer.ts
- **DocsAnalyzer.analyze** (method)
  - File: src/analyzer/docs-analyzer.ts
- **DocsAnalyzer.analyzeReadme** (method)
  - File: src/analyzer/docs-analyzer.ts
- **DocsAnalyzer.analyzeJSDocCoverage** (method)
  - File: src/analyzer/docs-analyzer.ts
- **DocsAnalyzer.analyzeChangelog** (method)
  - File: src/analyzer/docs-analyzer.ts
- **DocsAnalyzer.analyzeApiDocs** (method)
  - File: src/analyzer/docs-analyzer.ts
- **DocsAnalyzer.analyzeCommentDensity** (method)
  - File: src/analyzer/docs-analyzer.ts
- **DocsAnalyzer.findSourceFiles** (method)
  - File: src/analyzer/docs-analyzer.ts
- **DocsAnalyzer.findSourceFilesRecursive** (method)
  - File: src/analyzer/docs-analyzer.ts
- **analyzeDocs** (function)
  - File: src/analyzer/docs-analyzer.ts
- **ProjectClassifier.classify** (method)
  - File: src/analyzer/project-classifier.ts
- **ProjectClassifier.loadPackageJson** (method)
  - File: src/analyzer/project-classifier.ts
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

## High-Priority Test Gaps

Found 35 functions without test coverage. Prioritized by complexity and architectural importance.

- **ContextGenerator.generateMarkdown** - Complexity: 102
  - File: src/pipeline/generators/context-generator.ts
- **ASTElementScanner.visitNode** - Complexity: 63
  - File: src/analyzer/ast-element-scanner.ts
- **extractExportsFromAST** - Complexity: 55
  - File: src/analyzer/js-call-detector/module-analyzer.ts
- **extractElementsFromAST** - Complexity: 51
  - File: src/analyzer/js-call-detector/visitor.ts
- **ContextGenerator.detectTechStack** - Complexity: 32
  - File: src/pipeline/generators/context-generator.ts
- **EmbeddingTextGenerator.generate** - Complexity: 30
  - File: src/integration/rag/embedding-text-generator.ts
- **scanCurrentElements** - Complexity: 40
  - File: src/scanner/scanner.ts
- **ContextGenerator.detectMVCPatterns** - Complexity: 28
  - File: src/pipeline/generators/context-generator.ts
- **extractImportsFromAST** - Complexity: 37
  - File: src/analyzer/js-call-detector/module-analyzer.ts
- **ContextBuilder.buildContext** - Complexity: 27
  - File: src/integration/rag/context-builder.ts
- **SemanticSearchService.search** - Complexity: 27
  - File: src/integration/rag/semantic-search.ts
- **ProjectClassifier.analyzeApiService** - Complexity: 26
  - File: src/analyzer/project-classifier.ts
- **CodeRefValidator.validateMetadata** - Complexity: 36
  - File: src/validator/validator.ts
- **DocsAnalyzer.analyzeJSDocCoverage** - Complexity: 25
  - File: src/analyzer/docs-analyzer.ts
- **DocsAnalyzer.analyzeChangelog** - Complexity: 25
  - File: src/analyzer/docs-analyzer.ts
- **PipelineOrchestrator.run** - Complexity: 25
  - File: src/pipeline/orchestrator.ts
- **SearchIndex.search** - Complexity: 34
  - File: src/search/search-engine.ts
- **EmbeddingService.embedChunks** - Complexity: 23
  - File: src/integration/rag/embedding-service.ts
- **ContractDetector.parseOpenApi** - Complexity: 32
  - File: src/analyzer/contract-detector.ts
- **GraphBuilder.importGraphFromJSON** - Complexity: 22
  - File: src/analyzer/graph-builder.ts
- **visitNode** - Complexity: 32
  - File: src/analyzer/js-call-detector/visitor.ts
- **ContextBuilder.buildResultSection** - Complexity: 22
  - File: src/integration/rag/context-builder.ts
- **generateExportsMd** - Complexity: 32
  - File: scripts/doc-gen/generate-exports-md.js
- **DatabaseDetector.detectPrisma** - Complexity: 31
  - File: src/analyzer/database-detector.ts
- **DocsAnalyzer.analyzeReadme** - Complexity: 21
  - File: src/analyzer/docs-analyzer.ts
- **ProjectClassifier.detectApiSubtype** - Complexity: 30
  - File: src/analyzer/project-classifier.ts
- **ProjectClassifier.detectWebSubtype** - Complexity: 30
  - File: src/analyzer/project-classifier.ts
- **CodeRefParser.parse** - Complexity: 29
  - File: src/parser/parser.ts
- **convertGraphToElements** - Complexity: 28
  - File: src/adapter/graph-to-elements.ts
- **GraphAnalyzer.traverse** - Complexity: 18
  - File: src/analyzer/graph-analyzer.ts
- **MigrationRouteAnalyzer.detectBreakingChanges** - Complexity: 18
  - File: src/analyzer/migration-route-analyzer.ts
- **GraphReRanker.rerank** - Complexity: 28
  - File: src/integration/rag/graph-reranker.ts
- **ChromaStore.query** - Complexity: 28
  - File: src/integration/vector/chroma-store.ts
- **PatternGenerator.detectMiddleware** - Complexity: 18
  - File: src/pipeline/generators/pattern-generator.ts
- **QueryExecutor.executeQuery** - Complexity: 18
  - File: src/query/query-executor.ts

## Module Structure

- **src:** 205 files
- **__tests__:** 41 files
- **autoresearch:** 14 files
- **scripts:** 10 files
- **.:** 8 files
- **utils:** 3 files
- **examples:** 1 files

## Executive Summary

**Project Health Score:** 0/100 (CRITICAL)

### Key Insights

- High complexity concentration: 20 critical functions identified
- Significant test debt: 35 functions lack test coverage
- Heavy async usage: 30 async functions - review concurrency patterns

### Recommendations

- Prioritize test coverage for high-complexity functions
- Audit async error handling and race condition risks
- Consider focused refactoring sprint to address technical debt

## Risk Heat Map

Top 20 high-risk areas by complexity × test coverage:

- **context-generator** (CRITICAL) - Risk Score: 100
  - File: src/pipeline/generators/context-generator.ts
  - Complexity: 102, Estimated Coverage: 0%
- **scanner** (CRITICAL) - Risk Score: 100
  - File: src/scanner/scanner.ts
  - Complexity: 40, Estimated Coverage: 0%
- **embedding-text-generator** (CRITICAL) - Risk Score: 100
  - File: src/integration/rag/embedding-text-generator.ts
  - Complexity: 30, Estimated Coverage: 0%
- **ast-element-scanner** (CRITICAL) - Risk Score: 100
  - File: src/analyzer/ast-element-scanner.ts
  - Complexity: 63, Estimated Coverage: 0%
- **module-analyzer** (CRITICAL) - Risk Score: 100
  - File: src/analyzer/js-call-detector/module-analyzer.ts
  - Complexity: 55, Estimated Coverage: 0%
- **visitor** (CRITICAL) - Risk Score: 100
  - File: src/analyzer/js-call-detector/visitor.ts
  - Complexity: 51, Estimated Coverage: 0%
- **database-detector** (CRITICAL) - Risk Score: 100
  - File: src/analyzer/database-detector.ts
  - Complexity: 31, Estimated Coverage: 0%
- **query-executor** (CRITICAL) - Risk Score: 100
  - File: src/query/query-executor.ts
  - Complexity: 18, Estimated Coverage: 0%
- **docs-analyzer** (CRITICAL) - Risk Score: 100
  - File: src/analyzer/docs-analyzer.ts
  - Complexity: 25, Estimated Coverage: 0%
- **context-builder** (CRITICAL) - Risk Score: 100
  - File: src/integration/rag/context-builder.ts
  - Complexity: 27, Estimated Coverage: 0%

## Recommended Work Order Priorities

AI-generated priorities based on complexity, dependencies, and test gaps:

1. **[TESTING]** ContextGenerator.generateMarkdown
   - File: src/pipeline/generators/context-generator.ts
   - Effort: large, Rationale: Critical function (complexity 102, 0 dependents) lacks test coverage

2. **[TESTING]** scanCurrentElements
   - File: src/scanner/scanner.ts
   - Effort: large, Rationale: Critical function (complexity 40, 1 dependents) lacks test coverage

3. **[TESTING]** EmbeddingTextGenerator.generate
   - File: src/integration/rag/embedding-text-generator.ts
   - Effort: large, Rationale: Critical function (complexity 30, 0 dependents) lacks test coverage

4. **[TESTING]** ASTElementScanner.visitNode
   - File: src/analyzer/ast-element-scanner.ts
   - Effort: large, Rationale: Critical function (complexity 63, 0 dependents) lacks test coverage

5. **[TESTING]** extractExportsFromAST
   - File: src/analyzer/js-call-detector/module-analyzer.ts
   - Effort: large, Rationale: Critical function (complexity 55, 3 dependents) lacks test coverage

6. **[TESTING]** extractElementsFromAST
   - File: src/analyzer/js-call-detector/visitor.ts
   - Effort: large, Rationale: Critical function (complexity 51, 3 dependents) lacks test coverage

7. **[TESTING]** ContextGenerator.detectTechStack
   - File: src/pipeline/generators/context-generator.ts
   - Effort: medium, Rationale: High-complexity function (32) lacks test coverage


## Documentation Quality

- **Overall Score:** 53/100 (BASIC)
- **Files Analyzed:** 549
- **Average Comment Density:** 36.8%

### README Analysis

- **Exists:** Yes
- **Completeness:** 44% (8/18 sections)
- **Quality:** BASIC

**Key Sections Present:**

- ✅ Installation
- ✅ Usage
- ✅ API Reference
- ✅ Contributing
- ✅ License
- ✅ Badges

### JSDoc/TSDoc Coverage

- **Files:** 279
- **Average Coverage:** 68.7%

**Low Coverage Files:**

- dist\index.d.ts: 0% (0/10)
- dist\src\adapter\graph-to-elements.d.ts: 0% (0/1)
- dist\src\analyzer\ast-element-scanner.js: 0% (0/2)
- dist\src\analyzer\config-analyzer.d.ts: 9% (1/11)
- dist\src\analyzer\contract-detector.d.ts: 7% (1/14)

### Changelog

- **Exists:** No
false
false
false
false
false

### API Documentation

- **Has API Docs:** Yes
- **Location:** docs
- **Format:** markdown

### Documentation Recommendations

- Add more sections to README (8/18 present). Priority: Installation, Usage, API Reference
- Add JSDoc comments to 81 files with <50% documentation coverage
- Create a CHANGELOG.md to track version history

## Technology Stack

- **Primary Language:** ts
- **Frameworks:** Next.js, Express
- **Build Tools:** Vite
- **Test Frameworks:** Vitest
- **Patterns:** Async/Await, OOP, Interface-based Design, Type Definitions

## Generated

2026-04-22T21:00:13.640Z