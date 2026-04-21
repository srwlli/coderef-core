/**
 * Dynamic Import Detector - Detects dynamic import() expressions
 * WO-SCANNER-ACCURACY-IMPROVEMENTS-001: SCAN-001
 *
 * Detects:
 * - await import('./module') - async dynamic import
 * - import('./module').then() - promise-based dynamic import
 * - const { foo } = await import('./module') - destructured imports
 * - const mod = await import('./module') - namespace imports
 *
 * Creates relationship edges for dependency graph
 */

import * as fs from 'fs';
import * as ts from 'typescript';
import * as path from 'path';

/**
 * Represents a dynamic import detected in source code
 */
export interface DynamicImport {
  /** File containing the import */
  sourceFile: string;
  /** Module path being imported */
  modulePath: string;
  /** Resolved absolute path (if resolvable) */
  resolvedPath?: string;
  /** Symbols destructured from the import */
  importedSymbols: string[];
  /** If assigned to a variable, the variable name */
  namespaceVariable?: string;
  /** Line number of the import */
  line: number;
  /** Column of the import */
  column: number;
  /** Type of dynamic import pattern */
  importType: 'await' | 'promise' | 'conditional';
  /** Function/method containing this import */
  containingFunction?: string;
  /** Class containing this import */
  containingClass?: string;
}

/**
 * Represents a call to a dynamically imported function
 */
export interface DynamicCallEdge {
  sourceFile: string;
  sourceFunction?: string;
  targetModule: string;
  targetFunction: string;
  line: number;
  edgeType: 'dynamic-call';
}

export class DynamicImportDetector {
  private basePath: string;
  private importCache: Map<string, DynamicImport[]> = new Map();

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Detect dynamic imports in a file
   */
  detectDynamicImports(filePath: string): DynamicImport[] {
    // Check cache
    if (this.importCache.has(filePath)) {
      return this.importCache.get(filePath)!;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        this.getScriptKind(filePath)
      );

      const imports: DynamicImport[] = [];
      this.visitNode(sourceFile, imports, filePath);

      // Cache results
      this.importCache.set(filePath, imports);
      return imports;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get script kind based on file extension
   */
  private getScriptKind(filePath: string): ts.ScriptKind {
    if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
    if (filePath.endsWith('.ts')) return ts.ScriptKind.TS;
    if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
    return ts.ScriptKind.JS;
  }

  /**
   * Visit AST nodes to find dynamic imports
   */
  private visitNode(
    node: ts.Node,
    imports: DynamicImport[],
    filePath: string,
    context?: { functionName?: string; className?: string }
  ): void {
    // Track function/class context
    let currentContext = context;

    if (ts.isFunctionDeclaration(node) && node.name) {
      currentContext = {
        functionName: node.name.text,
        className: context?.className,
      };
    } else if (ts.isMethodDeclaration(node) && node.name) {
      const methodName = ts.isIdentifier(node.name) ? node.name.text : '';
      currentContext = {
        functionName: methodName,
        className: context?.className,
      };
    } else if (ts.isClassDeclaration(node) && node.name) {
      currentContext = {
        functionName: context?.functionName,
        className: node.name.text,
      };
    } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      // Try to get name from variable declaration
      const varName = this.getArrowFunctionName(node);
      if (varName) {
        currentContext = {
          functionName: varName,
          className: context?.className,
        };
      }
    }

    // Check for dynamic import() call
    if (ts.isCallExpression(node) && this.isDynamicImport(node)) {
      const dynamicImport = this.parseDynamicImport(node, filePath, currentContext);
      if (dynamicImport) {
        imports.push(dynamicImport);
      }
    }

    // Continue visiting children
    ts.forEachChild(node, (child) =>
      this.visitNode(child, imports, filePath, currentContext)
    );
  }

  /**
   * Check if a call expression is import()
   */
  private isDynamicImport(node: ts.CallExpression): boolean {
    // import() has a special syntax - the expression is ImportKeyword
    return node.expression.kind === ts.SyntaxKind.ImportKeyword;
  }

  /**
   * Parse a dynamic import expression
   */
  private parseDynamicImport(
    node: ts.CallExpression,
    filePath: string,
    context?: { functionName?: string; className?: string }
  ): DynamicImport | null {
    // Get the module path argument
    if (node.arguments.length === 0) return null;

    const moduleArg = node.arguments[0];
    let modulePath = '';

    if (ts.isStringLiteral(moduleArg)) {
      modulePath = moduleArg.text;
    } else if (ts.isTemplateExpression(moduleArg)) {
      // Template literal - extract head text
      modulePath = moduleArg.head.text + '...'; // Mark as dynamic
    } else {
      // Dynamic path expression - can't resolve statically
      modulePath = '<dynamic>';
    }

    // Get position info
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    // Determine import type and extract symbols
    const importType = this.getImportType(node);
    const importedSymbols = this.extractImportedSymbols(node);
    const namespaceVariable = this.extractNamespaceVariable(node);

    // Try to resolve the path
    const resolvedPath = this.resolveDynamicImportPath(modulePath, filePath);

    return {
      sourceFile: filePath,
      modulePath,
      resolvedPath,
      importedSymbols,
      namespaceVariable,
      line: line + 1,
      column: character,
      importType,
      containingFunction: context?.functionName,
      containingClass: context?.className,
    };
  }

  /**
   * Determine the type of dynamic import
   */
  private getImportType(node: ts.CallExpression): 'await' | 'promise' | 'conditional' {
    let parent = node.parent;

    // Check for await expression
    while (parent) {
      if (ts.isAwaitExpression(parent)) {
        return 'await';
      }
      // Check for .then() call
      if (
        ts.isPropertyAccessExpression(parent) &&
        parent.name.text === 'then'
      ) {
        return 'promise';
      }
      // Check for conditional (if statement, ternary)
      if (ts.isIfStatement(parent) || ts.isConditionalExpression(parent)) {
        return 'conditional';
      }
      parent = parent.parent;
    }

    return 'promise'; // Default to promise-based
  }

  /**
   * Extract destructured symbols from dynamic import
   */
  private extractImportedSymbols(node: ts.CallExpression): string[] {
    const symbols: string[] = [];
    let current = node.parent;

    // Walk up to find variable declaration with destructuring
    while (current) {
      if (ts.isAwaitExpression(current)) {
        current = current.parent;
        continue;
      }

      if (ts.isVariableDeclaration(current)) {
        if (ts.isObjectBindingPattern(current.name)) {
          // Destructured: const { foo, bar } = await import(...)
          for (const element of current.name.elements) {
            if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
              symbols.push(element.name.text);
            }
          }
        }
        break;
      }

      // Also check for .then() callback destructuring
      if (ts.isCallExpression(current)) {
        const callExpr = current;
        if (
          ts.isPropertyAccessExpression(callExpr.expression) &&
          callExpr.expression.name.text === 'then' &&
          callExpr.arguments.length > 0
        ) {
          const callback = callExpr.arguments[0];
          if (
            (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
            callback.parameters.length > 0
          ) {
            const param = callback.parameters[0];
            if (ts.isObjectBindingPattern(param.name)) {
              for (const element of param.name.elements) {
                if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
                  symbols.push(element.name.text);
                }
              }
            }
          }
        }
      }

      current = current.parent;
    }

    return symbols;
  }

  /**
   * Extract namespace variable name if import is assigned to a variable
   */
  private extractNamespaceVariable(node: ts.CallExpression): string | undefined {
    let current = node.parent;

    while (current) {
      if (ts.isAwaitExpression(current)) {
        current = current.parent;
        continue;
      }

      if (ts.isVariableDeclaration(current)) {
        if (ts.isIdentifier(current.name)) {
          // const mod = await import(...)
          return current.name.text;
        }
      }

      current = current.parent;
    }

    return undefined;
  }

  /**
   * Get arrow function name from parent variable declaration
   */
  private getArrowFunctionName(node: ts.ArrowFunction | ts.FunctionExpression): string | undefined {
    if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
      return node.parent.name.text;
    }
    if (
      ts.isPropertyAssignment(node.parent) &&
      ts.isIdentifier(node.parent.name)
    ) {
      return node.parent.name.text;
    }
    return undefined;
  }

  /**
   * Resolve dynamic import path to absolute path
   */
  private resolveDynamicImportPath(
    modulePath: string,
    sourceFile: string
  ): string | undefined {
    // Skip dynamic or non-relative paths
    if (modulePath === '<dynamic>' || !modulePath.startsWith('.')) {
      return undefined;
    }

    try {
      const sourceDir = path.dirname(sourceFile);
      let resolved = path.resolve(sourceDir, modulePath);

      // Handle extension resolution
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

      // Check if path already has extension
      if (extensions.some((ext) => resolved.endsWith(ext))) {
        if (fs.existsSync(resolved)) {
          return resolved;
        }
      }

      // Try adding extensions
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }

      // Try index files
      for (const ext of extensions) {
        const indexPath = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Build call edges from dynamic imports
   * Maps imported symbols to actual function calls
   */
  buildDynamicCallEdges(
    filePaths: string[],
    elementMap?: Map<string, { file: string; type: string }>
  ): DynamicCallEdge[] {
    const edges: DynamicCallEdge[] = [];

    for (const filePath of filePaths) {
      const imports = this.detectDynamicImports(filePath);

      for (const imp of imports) {
        // Create edges for each imported symbol
        for (const symbol of imp.importedSymbols) {
          edges.push({
            sourceFile: filePath,
            sourceFunction: imp.containingFunction,
            targetModule: imp.resolvedPath || imp.modulePath,
            targetFunction: symbol,
            line: imp.line,
            edgeType: 'dynamic-call',
          });
        }

        // If namespace import, we need to track usage of the namespace variable
        if (imp.namespaceVariable && !imp.importedSymbols.length) {
          // Track namespace usage - simplified for now
          edges.push({
            sourceFile: filePath,
            sourceFunction: imp.containingFunction,
            targetModule: imp.resolvedPath || imp.modulePath,
            targetFunction: '*',
            line: imp.line,
            edgeType: 'dynamic-call',
          });
        }
      }
    }

    return edges;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.importCache.clear();
  }
}

export default DynamicImportDetector;
