/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability index-jscall-detector
 * @exports JSCallDetector
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
import { parseJavaScriptFile, parseJavaScript } from '../js-parser.js';
import type { Node } from 'acorn';
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
  // WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3 (P2-13): one Acorn parse per
  // file, shared by detectCalls/detectImports/detectExports/getFileParameters/
  // detectElements. Previously each method re-read + re-parsed independently
  // (2+ parses per file in the scan path). Null = parse failed (cached too, so
  // a broken file is not re-parsed per detector).
  private astCache: Map<string, Node | null> = new Map();

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Parse (or fetch the cached parse of) a file. Single parse per file per
   * detector instance.
   */
  private getAST(filePath: string): Node | null {
    if (this.astCache.has(filePath)) {
      return this.astCache.get(filePath)!;
    }
    const result = parseJavaScriptFile(filePath);
    const ast = result.success ? result.ast : null;
    this.astCache.set(filePath, ast);
    return ast;
  }

  /**
   * Seed the AST cache from in-memory content, avoiding a disk re-read when
   * the caller (scanner) already holds the file's content.
   */
  primeContent(filePath: string, content: string): void {
    if (this.astCache.has(filePath)) return;
    this.astCache.set(filePath, parseJavaScript(content));
  }

  /**
   * Detect calls in a single JavaScript file
   */
  detectCalls(filePath: string): CallExpression[] {
    // Check cache first
    if (this.callCache.has(filePath)) {
      return this.callCache.get(filePath)!;
    }

    const ast = this.getAST(filePath);
    if (!ast) {
      return [];
    }

    const calls: CallExpression[] = [];
    visitNode(ast, calls, filePath);

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

    const ast = this.getAST(filePath);
    if (!ast) {
      return new Map();
    }

    const parameters = new Map<string, Parameter[]>();
    extractParametersFromAST(ast, filePath, parameters);

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

    const ast = this.getAST(filePath);
    if (!ast) {
      return [];
    }

    const imports: ModuleImport[] = [];
    extractImportsFromAST(ast, imports);

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

    const ast = this.getAST(filePath);
    if (!ast) {
      return [];
    }

    const exports: ModuleExport[] = [];
    extractExportsFromAST(ast, exports);

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
    const ast = this.getAST(filePath);
    if (!ast) {
      return [];
    }

    const elements: DetectedElement[] = [];
    extractElementsFromAST(ast, filePath, elements);
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
    this.astCache.clear();
  }
}

export default JSCallDetector;
