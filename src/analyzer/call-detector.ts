/**
 * Call Detector - Detects function/method calls in source code
 * Phase 3, Task P3-T2: Relationship Detection & Analysis
 *
 * Detects:
 * - Direct function calls: foo(), bar.baz()
 * - Method calls: obj.method(), this.method()
 * - Constructor calls: new ClassName()
 * - Async function calls: await foo()
 * - Arrow function calls: () => foo()
 * - Nested calls: foo(bar())
 *
 * Uses TypeScript AST to reliably identify call expressions
 * Builds 'calls' relationship edges for dependency graph
 */

import * as fs from 'fs';
import * as ts from 'typescript';

/**
 * Represents a function/method call detected in source code
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

export class CallDetector {
  private basePath: string;
  private callCache: Map<string, CallExpression[]> = new Map();

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Detect calls in a single file
   */
  detectCalls(filePath: string): CallExpression[] {
    // Check cache first
    if (this.callCache.has(filePath)) {
      return this.callCache.get(filePath)!;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      );

      const calls: CallExpression[] = [];
      this.visitNode(sourceFile, calls, filePath);

      // Cache results
      this.callCache.set(filePath, calls);
      return calls;
    } catch (error) {
      // File may not be readable or may not be valid TypeScript
      return [];
    }
  }

  /**
   * Recursively visit AST nodes to find call expressions
   */
  private visitNode(
    node: ts.Node,
    calls: CallExpression[],
    filePath: string,
    parentContext?: { functionName?: string; className?: string }
  ): void {
    // Handle call expressions
    if (ts.isCallExpression(node)) {
      const call = this.parseCallExpression(node, filePath, parentContext);
      if (call) {
        calls.push(call);
      }
    }

    // Handle constructor calls (new expressions)
    if (ts.isNewExpression(node)) {
      const call = this.parseNewExpression(node, filePath, parentContext);
      if (call) {
        calls.push(call);
      }
    }

    // Track function/method context
    let currentContext = parentContext;

    if (ts.isFunctionDeclaration(node) && node.name) {
      currentContext = {
        functionName: node.name.text,
        className: parentContext?.className,
      };
    } else if (ts.isMethodDeclaration(node) && node.name) {
      const methodName = ts.isIdentifier(node.name) ? node.name.text : '';
      currentContext = {
        functionName: methodName,
        className: parentContext?.className,
      };
    } else if (ts.isClassDeclaration(node) && node.name) {
      currentContext = {
        functionName: parentContext?.functionName,
        className: node.name.text,
      };
    } else if (ts.isArrowFunction(node)) {
      // Arrow functions don't have explicit names, use parent context
      currentContext = parentContext;
    }

    // Continue visiting child nodes
    ts.forEachChild(node, (child) =>
      this.visitNode(child, calls, filePath, currentContext)
    );
  }

  /**
   * Parse a call expression node into CallExpression
   */
  private parseCallExpression(
    node: ts.CallExpression,
    filePath: string,
    context?: { functionName?: string; className?: string }
  ): CallExpression | null {
    const expression = node.expression;
    let calleeFunction = '';
    let calleeObject = '';
    let callType: 'function' | 'method' | 'constructor' | 'static' = 'function';

    // Handle different call patterns
    if (ts.isIdentifier(expression)) {
      // Direct function call: foo()
      calleeFunction = expression.text;
    } else if (ts.isPropertyAccessExpression(expression)) {
      // Method call: obj.method() or this.method()
      const propertyName = expression.name.text;
      calleeFunction = propertyName;

      if (ts.isIdentifier(expression.expression)) {
        calleeObject = expression.expression.text;
        callType = 'method';
      } else if (expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
        calleeObject = 'this';
        callType = 'method';
      } else if (ts.isPropertyAccessExpression(expression.expression)) {
        // Nested property access: obj.prop.method()
        const baseExpr = expression.expression;
        if (ts.isIdentifier(baseExpr.expression)) {
          calleeObject = baseExpr.expression.text;
          callType = 'method';
        }
      }
    }

    // Skip if we couldn't extract a callee function name
    if (!calleeFunction) {
      return null;
    }

    // Get line and column information
    const sourceFile = node.getSourceFile();
    const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    // Detect if call is async/await
    let isAsync = false;
    let checkNode: ts.Node | undefined = node.parent;
    while (checkNode) {
      if (ts.isAwaitExpression(checkNode)) {
        isAsync = true;
        break;
      }
      checkNode = checkNode.parent;
    }

    return {
      callerFunction: context?.functionName,
      callerClass: context?.className,
      calleeFunction,
      calleeObject: calleeObject || undefined,
      callType,
      isAsync,
      line: lineAndCharacter.line + 1,
      column: lineAndCharacter.character,
      isNested: this.isNestedCall(node),
    };
  }

  /**
   * Parse a new expression node (constructor call) into CallExpression
   */
  private parseNewExpression(
    node: ts.NewExpression,
    filePath: string,
    context?: { functionName?: string; className?: string }
  ): CallExpression | null {
    const expression = node.expression;
    let calleeFunction = '';

    // Extract constructor name
    if (ts.isIdentifier(expression)) {
      calleeFunction = expression.text;
    } else if (ts.isPropertyAccessExpression(expression)) {
      // Handle namespaced constructors: new MyNamespace.MyClass()
      calleeFunction = expression.name.text;
    }

    // Skip if we couldn't extract a constructor name
    if (!calleeFunction) {
      return null;
    }

    // Get line and column information
    const sourceFile = node.getSourceFile();
    const lineAndCharacter = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      callerFunction: context?.functionName,
      callerClass: context?.className,
      calleeFunction,
      calleeObject: undefined,
      callType: 'constructor',
      isAsync: false,
      line: lineAndCharacter.line + 1,
      column: lineAndCharacter.character,
      isNested: false,
    };
  }

  /**
   * Check if a call expression is nested (inside another call)
   */
  private isNestedCall(node: ts.CallExpression): boolean {
    let parent = node.parent;
    while (parent) {
      if (ts.isCallExpression(parent)) {
        // Check if this node is an argument to the parent call
        if (parent.arguments.includes(node)) {
          return true;
        }
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * Build call relationship edges from detected calls
   * Maps calls to indexed element names
   */
  buildCallEdges(
    filePaths: string[],
    elementMap?: Map<string, { file: string; type: string }>
  ): CallEdge[] {
    const edges: CallEdge[] = [];
    const edgeMap = new Map<string, CallEdge>();

    for (const filePath of filePaths) {
      const calls = this.detectCalls(filePath);

      for (const call of calls) {
        // Map callee function to element
        const calleeIdentifier = call.calleeObject
          ? `${call.calleeObject}.${call.calleeFunction}`
          : call.calleeFunction;

        // Find target file if elementMap provided
        let targetFile = call.calleeFunction;
        if (elementMap) {
          const element = elementMap.get(calleeIdentifier);
          if (element) {
            targetFile = element.file;
          }
        }

        const edgeKey = `${filePath} -> ${targetFile}`;

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            sourceFile: filePath,
            targetFile,
            calls: [],
            edgeType: 'calls',
          });
        }

        edgeMap.get(edgeKey)!.calls.push(call);
      }
    }

    return Array.from(edgeMap.values());
  }

  /**
   * Analyze call frequency and patterns
   */
  analyzeCallPatterns(filePaths: string[]): {
    totalCalls: number;
    uniqueFunctions: Set<string>;
    methodCalls: number;
    constructorCalls: number;
    asyncCalls: number;
    nestedCalls: number;
  } {
    let totalCalls = 0;
    const uniqueFunctions = new Set<string>();
    let methodCalls = 0;
    let constructorCalls = 0;
    let asyncCalls = 0;
    let nestedCalls = 0;

    for (const filePath of filePaths) {
      const calls = this.detectCalls(filePath);

      for (const call of calls) {
        totalCalls++;
        uniqueFunctions.add(call.calleeFunction);

        if (call.callType === 'method') methodCalls++;
        if (call.callType === 'constructor') constructorCalls++;
        if (call.isAsync) asyncCalls++;
        if (call.isNested) nestedCalls++;
      }
    }

    return {
      totalCalls,
      uniqueFunctions,
      methodCalls,
      constructorCalls,
      asyncCalls,
      nestedCalls,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.callCache.clear();
  }
}

export default CallDetector;
