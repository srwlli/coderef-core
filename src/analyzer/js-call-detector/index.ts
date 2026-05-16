/**
 * @coderef-semantic: 1.0.0
 * @exports CallEdge, CallExpression, CallPatternAnalysis, DetectedElement, JSCallDetector, ModuleExport, ModuleImport, Parameter, TraversalContext, analyzeCallPatterns, buildCallEdges, extractElementsFromAST, extractExportsFromAST, extractImportsFromAST, extractObjectName, extractParameter, extractParameters, extractParametersFromAST, isNestedCall, parseCallExpression, parseNewExpression, visitNode
 */

/**
 * IMP-CORE-035: JavaScript Call Detector - Modular Architecture
 * 
 * Main entry point that re-exports the JSCallDetector class and all types.
 * This module replaces the monolithic js-call-detector.ts with focused sub-modules:
 * 
 * - types.ts: All interfaces and type definitions
 * - parser.ts: Call expression parsing from AST
 * - visitor.ts: AST traversal and context tracking
 * - module-analyzer.ts: Import/export extraction
 * - analyzer.ts: Call graph building and pattern analysis
 */

// Re-export all types
export type {
  Parameter,
  CallExpression,
  CallEdge,
  ModuleImport,
  ModuleExport,
  TraversalContext,
  CallPatternAnalysis,
  DetectedElement,
} from './types.js';

// Re-export parser functions
export {
  parseCallExpression,
  parseNewExpression,
  extractObjectName,
  isNestedCall,
  extractParameters,
  extractParameter,
} from './parser.js';

// Re-export visitor functions
export {
  visitNode,
  extractParametersFromAST,
  extractElementsFromAST,
} from './visitor.js';

// Re-export module analyzer functions
export {
  extractImportsFromAST,
  extractExportsFromAST,
} from './module-analyzer.js';

// Re-export analyzer functions
export {
  buildCallEdges,
  analyzeCallPatterns,
} from './analyzer.js';

// Import dependencies for the main class
import { parseJavaScriptFile } from '../js-parser.js';
import {
  Parameter,
  CallExpression,
  CallEdge,
  ModuleImport,
  ModuleExport,
  DetectedElement,
} from './types.js';
import { visitNode, extractParametersFromAST, extractElementsFromAST } from './visitor.js';
import { extractImportsFromAST, extractExportsFromAST } from './module-analyzer.js';
import { buildCallEdges, analyzeCallPatterns } from './analyzer.js';

/**
 * JavaScript Call Detector
 * Analyzes JavaScript files to extract function calls and parameters
 * 
 * REFACTORED: Now uses modular sub-components for better maintainability
 * - Caching layer for parsed results
 * - Delegates to specialized modules for parsing, visiting, and analysis
 */
export class JSCallDetector {
  private basePath: string;
  private callCache: Map<string, CallExpression[]> = new Map();
  private parameterCache: Map<string, Map<string, Parameter[]>> = new Map();
  private importsCache: Map<string, ModuleImport[]> = new Map();
  private exportsCache: Map<string, ModuleExport[]> = new Map();

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Detect calls in a single JavaScript file
   */
  detectCalls(filePath: string): CallExpression[] {
    // Check cache first
    if (this.callCache.has(filePath)) {
      return this.callCache.get(filePath)!;
    }

    const result = parseJavaScriptFile(filePath);
    if (!result.success || !result.ast) {
      return [];
    }

    const calls: CallExpression[] = [];
    visitNode(result.ast, calls, filePath);

    // Cache results
    this.callCache.set(filePath, calls);
    return calls;
  }

  /**
   * Get parameters for all functions in a file
   */
  getFileParameters(filePath: string): Map<string, Parameter[]> {
    // Check cache
    if (this.parameterCache.has(filePath)) {
      return this.parameterCache.get(filePath)!;
    }

    const result = parseJavaScriptFile(filePath);
    if (!result.success || !result.ast) {
      return new Map();
    }

    const parameters = new Map<string, Parameter[]>();
    extractParametersFromAST(result.ast, filePath, parameters);

    // Cache results
    this.parameterCache.set(filePath, parameters);
    return parameters;
  }

  /**
   * Detect module imports in a file (ESM import + CommonJS require)
   */
  detectImports(filePath: string): ModuleImport[] {
    // Check cache
    if (this.importsCache.has(filePath)) {
      return this.importsCache.get(filePath)!;
    }

    const result = parseJavaScriptFile(filePath);
    if (!result.success || !result.ast) {
      return [];
    }

    const imports: ModuleImport[] = [];
    extractImportsFromAST(result.ast, imports);

    // Cache results
    this.importsCache.set(filePath, imports);
    return imports;
  }

  /**
   * Detect module exports in a file (ESM export + CommonJS module.exports)
   */
  detectExports(filePath: string): ModuleExport[] {
    // Check cache
    if (this.exportsCache.has(filePath)) {
      return this.exportsCache.get(filePath)!;
    }

    const result = parseJavaScriptFile(filePath);
    if (!result.success || !result.ast) {
      return [];
    }

    const exports: ModuleExport[] = [];
    extractExportsFromAST(result.ast, exports);

    // Cache results
    this.exportsCache.set(filePath, exports);
    return exports;
  }

  /**
   * Build call relationship edges from detected calls
   */
  buildCallEdges(
    filePaths: string[],
    elementMap?: Map<string, { file: string; type: string }>
  ): CallEdge[] {
    return buildCallEdges(filePaths, this, elementMap);
  }

  /**
   * Analyze call frequency and patterns
   */
  analyzeCallPatterns(filePaths: string[]) {
    return analyzeCallPatterns(filePaths, this);
  }

  /**
   * Detect code elements (interfaces, types, decorators, properties)
   */
  detectElements(filePath: string): DetectedElement[] {
    const result = parseJavaScriptFile(filePath);
    if (!result.success || !result.ast) {
      return [];
    }

    const elements: DetectedElement[] = [];
    extractElementsFromAST(result.ast, filePath, elements);
    return elements;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.callCache.clear();
    this.parameterCache.clear();
    this.importsCache.clear();
    this.exportsCache.clear();
  }
}

export default JSCallDetector;
