/**
 * IMP-CORE-035: JavaScript Call Detector Types
 * Extracted from js-call-detector.ts for modularity
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports Parameter, CallExpression, CallEdge, ModuleImport, ModuleExport, TraversalContext, CallPatternAnalysis, DetectedElement
 * @used_by src/analyzer/js-call-detector/analyzer.ts, src/analyzer/js-call-detector/index.ts, src/analyzer/js-call-detector/module-analyzer.ts, src/analyzer/js-call-detector/parser.ts, src/analyzer/js-call-detector/visitor.ts
 */

/**
 * Parameter information extracted from function signature
 */
export interface Parameter {
  name: string;           // 'a', '{x, y}', '...args'
  hasDefault: boolean;    // Has default value
  isRest: boolean;        // Rest parameter (...)
  isDestructured: boolean; // Object/array destructuring
}

/**
 * Represents a function/method call detected in JavaScript code
 */
export interface CallExpression {
  callerFunction?: string;
  callerClass?: string;
  calleeFunction: string;
  calleeObject?: string;
  callType: 'function' | 'method' | 'constructor' | 'static';
  isAsync: boolean;
  line: number;
  column: number;
  isNested: boolean;
}

/**
 * Represents a call relationship edge in the dependency graph
 */
export interface CallEdge {
  sourceFile: string;
  targetFile: string;
  calls: CallExpression[];
  edgeType: 'calls';
}

/**
 * Represents a module import/require statement
 */
export interface ModuleImport {
  source: string;           // './utils', 'lodash'
  importType: 'esm' | 'commonjs';
  specifiers: string[];     // ['foo', 'bar'] or ['default']
  line: number;
  isDefault: boolean;
  dynamic?: boolean;        // True for dynamic imports (import() calls)
}

/**
 * Represents a module export statement
 */
export interface ModuleExport {
  exportType: 'esm' | 'commonjs';
  specifiers: string[];     // ['foo', 'bar'] or ['default']
  line: number;
  isDefault: boolean;
}

/**
 * Context information while traversing AST
 */
export interface TraversalContext {
  functionName?: string;
  className?: string;
  parameters?: Parameter[];
  isAsync?: boolean;
}

/**
 * Call pattern analysis result
 */
export interface CallPatternAnalysis {
  totalCalls: number;
  uniqueFunctions: Set<string>;
  methodCalls: number;
  constructorCalls: number;
  asyncCalls: number;
  nestedCalls: number;
}

/**
 * Code element detected in JavaScript/TypeScript
 */
export interface DetectedElement {
  type: 'interface' | 'type' | 'decorator' | 'property' | 'function' | 'class' | 'method';
  name: string;
  file: string;
  line: number;
  exported?: boolean;
}
