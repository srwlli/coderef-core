# Dependency Diagram

## Usage

Embed this Mermaid diagram in your documentation:

```mermaid
graph TD
  demo_all_modules_ts_section["section"]
  demo_all_modules_ts_success["success"]
  demo_all_modules_ts_info["info"]
  demo_all_modules_ts_main["main"]
  examples_nextjs_api_route_ts_ApiResponse["ApiResponse"]
  examples_nextjs_api_route_ts_ScanRequest["ScanRequest"]
  examples_nextjs_api_route_ts_ScanResult["ScanResult"]
  examples_nextjs_api_route_ts_POST["POST"]
  examples_nextjs_api_route_ts_ValidationResult["ValidationResult"]
  examples_nextjs_api_route_ts_validateScanRequest["validateScanRequest"]
  examples_nextjs_api_route_ts_mapErrorToResponse["mapErrorToResponse"]
  examples_nextjs_api_route_ts_calculateSummary["calculateSummary"]
  examples_nextjs_api_route_ts_GET["GET"]
  examples_plugins_example_detector_src_detectors_fastapi_ts_DetectionResult["DetectionResult"]
  examples_plugins_example_detector_src_detectors_fastapi_ts_CodeDetector["CodeDetector"]
  examples_plugins_example_detector_src_hooks_route_relationships_ts_CustomEdge["CustomEdge"]
  examples_plugins_example_detector_src_hooks_route_relationships_ts_CodeElement["CodeElement"]
  examples_plugins_example_detector_src_hooks_route_relationships_ts_GraphBuilderContext["GraphBuilderContext"]
  examples_plugins_example_detector_src_hooks_route_relationships_ts_GraphHook["GraphHook"]
  scripts_scan_cli_test_scan_cli_test_ts_createTestProject["createTestProject"]
  src_adapter_graph_to_elements_ts_ConversionOptions["ConversionOptions"]
  src_adapter_graph_to_elements_ts_convertGraphToElements["convertGraphToElements"]
  src_adapter_graph_to_elements_ts_getConversionStats["getConversionStats"]
  src_analyzer_analyzer_service_ts_AnalysisResult["AnalysisResult"]
  src_analyzer_analyzer_service_ts_AnalyzerService["AnalyzerService"]
  src_analyzer_analyzer_service_ts_AnalyzerService_setElementMap["AnalyzerService.setElementMap"]
  src_analyzer_analyzer_service_ts_AnalyzerService_analyze["AnalyzerService.analyze"]
  src_analyzer_analyzer_service_ts_AnalyzerService_createAnalysisResult["AnalyzerService.createAnalysisResult"]
  src_analyzer_analyzer_service_ts_AnalyzerService_getCallers["AnalyzerService.getCallers"]
  src_analyzer_analyzer_service_ts_AnalyzerService_getCallees["AnalyzerService.getCallees"]
  src_analyzer_analyzer_service_ts_AnalyzerService_getDependents["AnalyzerService.getDependents"]
  src_analyzer_analyzer_service_ts_AnalyzerService_getDependencies["AnalyzerService.getDependencies"]
  src_analyzer_analyzer_service_ts_AnalyzerService_traverse["AnalyzerService.traverse"]
  src_analyzer_analyzer_service_ts_AnalyzerService_detectCircularDependencies["AnalyzerService.detectCircularDependencies"]
  src_analyzer_analyzer_service_ts_AnalyzerService_findShortestPath["AnalyzerService.findShortestPath"]
  src_analyzer_analyzer_service_ts_AnalyzerService_findAllPaths["AnalyzerService.findAllPaths"]
  src_analyzer_analyzer_service_ts_AnalyzerService_getGraph["AnalyzerService.getGraph"]
  src_analyzer_analyzer_service_ts_AnalyzerService_clearCache["AnalyzerService.clearCache"]
  src_analyzer_analyzer_service_ts_AnalyzerService_exportGraphAsJSON["AnalyzerService.exportGraphAsJSON"]
  src_analyzer_analyzer_service_ts_AnalyzerService_saveGraph["AnalyzerService.saveGraph"]
  src_analyzer_analyzer_service_ts_AnalyzerService_loadGraph["AnalyzerService.loadGraph"]
  src_analyzer_analyzer_service_ts_AnalyzerService_findFiles["AnalyzerService.findFiles"]
  src_analyzer_analyzer_service_ts_AnalyzerService_getGraphStatistics["AnalyzerService.getGraphStatistics"]
  src_analyzer_analyzer_service_ts_AnalyzerService_findIsolatedNodes["AnalyzerService.findIsolatedNodes"]
  src_analyzer_ast_element_scanner_ts_ASTScanResult["ASTScanResult"]
  src_analyzer_ast_element_scanner_ts_ASTElementScanner["ASTElementScanner"]
  src_analyzer_ast_element_scanner_ts_ASTElementScanner_scanFile["ASTElementScanner.scanFile"]
  src_analyzer_ast_element_scanner_ts_ASTElementScanner_scanFiles["ASTElementScanner.scanFiles"]
  src_analyzer_ast_element_scanner_ts_ASTElementScanner_parseElements["ASTElementScanner.parseElements"]
  src_analyzer_ast_element_scanner_ts_ASTElementScanner_collectExportedNames["ASTElementScanner.collectExportedNames"]
  demo_all_modules_ts --> __dist_index_js
  demo_all_modules_ts --> fs
  demo_all_modules_ts --> path
  examples_nextjs_api_route_ts --> next_server
  examples_nextjs_api_route_ts --> _coderef_core
  examples_nextjs_api_route_ts --> path
  examples_plugins_example_detector_src_index_ts --> __detectors_fastapi_js
  examples_plugins_example_detector_src_index_ts --> __hooks_route_relationships_js
  scripts_scan_cli_test_scan_cli_test_ts --> vitest
  scripts_scan_cli_test_scan_cli_test_ts --> child_process
  scripts_scan_cli_test_scan_cli_test_ts --> util
  scripts_scan_cli_test_scan_cli_test_ts --> url
  scripts_scan_cli_test_scan_cli_test_ts --> fs
  scripts_scan_cli_test_scan_cli_test_ts --> path
  scripts_scan_cli_test_scan_cli_test_ts --> os
  src_adapter_graph_to_elements_ts --> ___analyzer_graph_builder_js
  src_adapter_graph_to_elements_ts --> ___types_types_js
  src_analyzer_analyzer_service_ts --> __graph_builder_js
  src_analyzer_analyzer_service_ts --> __graph_analyzer_js
  src_analyzer_analyzer_service_ts --> __graph_error_js
  src_analyzer_analyzer_service_ts --> fs
  src_analyzer_analyzer_service_ts --> path
  src_analyzer_analyzer_service_ts --> glob
  src_analyzer_ast_element_scanner_ts --> fs
  src_analyzer_ast_element_scanner_ts --> typescript
  src_analyzer_ast_element_scanner_ts --> ___types_types_js
  src_analyzer_call_detector_ts --> fs
  src_analyzer_call_detector_ts --> typescript
  src_analyzer_config_analyzer_ts --> fs
  src_analyzer_config_analyzer_ts --> path
  src_analyzer_contract_detector_ts --> fs
  src_analyzer_contract_detector_ts --> path
  src_analyzer_database_detector_ts --> fs
  src_analyzer_database_detector_ts --> path
  src_analyzer_dependency_analyzer_ts --> fs_promises
  src_analyzer_dependency_analyzer_ts --> path
  src_analyzer_dependency_analyzer_ts --> child_process
  src_analyzer_dependency_analyzer_ts --> util
  src_analyzer_design_pattern_detector_ts --> fs
  src_analyzer_design_pattern_detector_ts --> path
  src_analyzer_docs_analyzer_ts --> fs_promises
  src_analyzer_docs_analyzer_ts --> path
  src_analyzer_dynamic_import_detector_ts --> fs
  src_analyzer_dynamic_import_detector_ts --> typescript
  src_analyzer_dynamic_import_detector_ts --> path
  src_analyzer_entry_detector_ts --> path
  src_analyzer_entry_detector_ts --> ___types_types_js
  src_analyzer_frameworks_express_detector_ts --> ______scanner_framework_registry_js
  src_analyzer_frameworks_express_detector_ts --> ___route_parsers_js
  src_analyzer_frameworks_fastapi_detector_ts --> ______scanner_framework_registry_js
  src_analyzer_frameworks_fastapi_detector_ts --> ___route_parsers_js
  src_analyzer_frameworks_flask_detector_ts --> ______scanner_framework_registry_js
  src_analyzer_frameworks_flask_detector_ts --> ___route_parsers_js
  src_analyzer_frameworks_nextjs_detector_ts --> ______scanner_framework_registry_js
  src_analyzer_frameworks_nextjs_detector_ts --> ___route_parsers_js
  src_analyzer_frameworks_nuxt_detector_ts --> ______scanner_framework_registry_js
  src_analyzer_frameworks_nuxt_detector_ts --> ___route_parsers_js
  src_analyzer_frameworks_remix_detector_ts --> ______scanner_framework_registry_js
  src_analyzer_frameworks_remix_detector_ts --> ___route_parsers_js
  src_analyzer_frameworks_sveltekit_detector_ts --> ______scanner_framework_registry_js
  src_analyzer_frameworks_sveltekit_detector_ts --> ___route_parsers_js
  src_analyzer_frontend_call_parsers_test_ts --> vitest
  src_analyzer_frontend_call_parsers_test_ts --> __frontend_call_parsers_js
  src_analyzer_frontend_call_parsers_ts --> _babel_parser
  src_analyzer_frontend_call_parsers_ts --> _babel_traverse
  src_analyzer_frontend_call_parsers_ts --> _babel_types
  src_analyzer_frontend_call_parsers_ts --> ___types_types
  src_analyzer_graph_analyzer_ts --> __graph_builder_js
  src_analyzer_graph_builder_ts --> __import_parser_js
  src_analyzer_graph_builder_ts --> __call_detector_js
  src_analyzer_graph_builder_ts --> __graph_error_js
  src_analyzer_graph_helpers_ts --> __graph_builder_js
  src_analyzer_import_parser_ts --> fs
  src_analyzer_import_parser_ts --> path
  src_analyzer_js_call_detector_analyzer_ts --> __types_js
  src_analyzer_js_call_detector_index_ts --> ___js_parser_js
  src_analyzer_js_call_detector_index_ts --> __types_js
  src_analyzer_js_call_detector_index_ts --> __visitor_js
  src_analyzer_js_call_detector_index_ts --> __module_analyzer_js
  src_analyzer_js_call_detector_index_ts --> __analyzer_js
  src_analyzer_js_call_detector_module_analyzer_ts --> __types_js
  src_analyzer_js_call_detector_parser_ts --> __types_js
  src_analyzer_js_call_detector_visitor_ts --> __types_js
  src_analyzer_js_call_detector_visitor_ts --> __parser_js
  src_analyzer_js_parser_ts --> acorn
  src_analyzer_js_parser_ts --> fs
  src_analyzer_middleware_detector_ts --> ___types_types_js
  src_analyzer_migration_route_analyzer_test_ts --> vitest
  src_analyzer_migration_route_analyzer_test_ts --> __migration_route_analyzer_js
  src_analyzer_migration_route_analyzer_test_ts --> ___types_types_js
  src_analyzer_migration_route_analyzer_ts --> ___types_types_js
  src_analyzer_project_classifier_ts --> fs_promises
  src_analyzer_project_classifier_ts --> path
  src_analyzer_project_classifier_ts --> __entry_detector_js
  src_analyzer_route_parsers_test_ts --> vitest
  src_analyzer_route_parsers_test_ts --> __route_parsers_js
  src_analyzer_route_parsers_ts --> ___types_types_js
  src_cache_incremental_cache_ts --> fs_promises
  src_cache_incremental_cache_ts --> path
  src_cache_incremental_cache_ts --> crypto
```

## Statistics

- **Nodes:** 2191
- **Edges:** 11215
- **Files:** 302
- **Elements:** 2191

## Generated

2026-04-28T22:40:55.820Z
