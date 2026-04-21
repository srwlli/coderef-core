/**
 * IMP-CORE-035: JavaScript AST Visitor
 * Recursively traverses AST to find call expressions and context
 */

import { CallExpression, Parameter, TraversalContext, DetectedElement } from './types.js';
import { parseCallExpression, parseNewExpression, extractParameters } from './parser.js';

/**
 * Recursively visit AST nodes to find call expressions
 */
export function visitNode(
  node: any,
  calls: CallExpression[],
  filePath: string,
  context?: TraversalContext
): void {
  if (!node || typeof node !== 'object') return;

  // Track current context (function/class scope)
  let currentContext = context;

  // Update context based on node type
  if (node.type === 'FunctionDeclaration' && node.id) {
    currentContext = {
      functionName: node.id.name,
      className: context?.className,
      parameters: node.params ? extractParameters(node.params) : [],
      isAsync: node.async || false,
    };
  } else if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    // Anonymous function - keep parent context
    currentContext = {
      ...context,
      isAsync: node.async || false,
    };
  } else if (node.type === 'MethodDefinition' && node.key) {
    const methodName = node.key.type === 'Identifier' ? node.key.name : '';
    currentContext = {
      functionName: methodName,
      className: context?.className,
      parameters: node.value?.params ? extractParameters(node.value.params) : [],
      isAsync: node.value?.async || false,
    };
  } else if (node.type === 'ClassDeclaration' && node.id) {
    currentContext = {
      functionName: context?.functionName,
      className: node.id.name,
    };
  }

  // Handle call expressions
  if (node.type === 'CallExpression') {
    const call = parseCallExpression(node, filePath, currentContext);
    if (call) {
      calls.push(call);
    }
  }

  // Handle new expressions (constructors)
  if (node.type === 'NewExpression') {
    const call = parseNewExpression(node, filePath, currentContext);
    if (call) {
      calls.push(call);
    }
  }

  // Recursively visit children
  for (const key in node) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        visitNode(item, calls, filePath, currentContext);
      }
    } else if (child && typeof child === 'object') {
      visitNode(child, calls, filePath, currentContext);
    }
  }
}

/**
 * Extract parameters from all functions in AST
 */
export function extractParametersFromAST(
  ast: any,
  filePath: string,
  result: Map<string, Parameter[]>,
  context?: { className?: string }
): void {
  if (!ast || typeof ast !== 'object') return;

  // Track class context
  let currentContext = context;

  if (ast.type === 'ClassDeclaration' && ast.id) {
    currentContext = { className: ast.id.name };
  }

  // Extract from function declarations
  if (ast.type === 'FunctionDeclaration' && ast.id && ast.params) {
    const functionName = ast.id.name;
    const parameters = extractParameters(ast.params);
    const key = currentContext?.className
      ? `${currentContext.className}.${functionName}`
      : functionName;
    result.set(key, parameters);
  }

  // Extract from method definitions
  if (ast.type === 'MethodDefinition' && ast.key && ast.value?.params) {
    const methodName = ast.key.type === 'Identifier' ? ast.key.name : '';
    const parameters = extractParameters(ast.value.params);
    const key = currentContext?.className
      ? `${currentContext.className}.${methodName}`
      : methodName;
    result.set(key, parameters);
  }

  // Recursively traverse
  for (const key in ast) {
    const child = ast[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        extractParametersFromAST(item, filePath, result, currentContext);
      }
    } else if (child && typeof child === 'object') {
      extractParametersFromAST(child, filePath, result, currentContext);
    }
  }
}

/**
 * Recursively extract elements from AST
 */
export function extractElementsFromAST(
  ast: any,
  filePath: string,
  elements: DetectedElement[],
  parentExported: boolean = false
): void {
  if (!ast || typeof ast !== 'object') {
    return;
  }

  const isExported = parentExported ||
                    (ast.type === 'ExportNamedDeclaration' || ast.type === 'ExportDefaultDeclaration');

  // TypeScript Interface
  if (ast.type === 'TSInterfaceDeclaration' && ast.id) {
    elements.push({
      type: 'interface',
      name: ast.id.name,
      file: filePath,
      line: ast.loc?.start.line || 0,
      exported: isExported
    });
  }

  // TypeScript Type Alias
  if (ast.type === 'TSTypeAliasDeclaration' && ast.id) {
    elements.push({
      type: 'type',
      name: ast.id.name,
      file: filePath,
      line: ast.loc?.start.line || 0,
      exported: isExported
    });
  }

  // Decorators (both class and method decorators)
  if (ast.decorators && Array.isArray(ast.decorators)) {
    for (const decorator of ast.decorators) {
      let decoratorName = '';

      if (decorator.expression?.type === 'Identifier') {
        decoratorName = decorator.expression.name;
      } else if (decorator.expression?.type === 'CallExpression' &&
                 decorator.expression.callee?.type === 'Identifier') {
        decoratorName = decorator.expression.callee.name;
      }

      if (decoratorName) {
        elements.push({
          type: 'decorator',
          name: decoratorName,
          file: filePath,
          line: decorator.loc?.start.line || 0,
          exported: false
        });
      }
    }
  }

  // Class Properties (PropertyDefinition in newer acorn, ClassProperty in older)
  if ((ast.type === 'PropertyDefinition' || ast.type === 'ClassProperty') && ast.key) {
    const propertyName = ast.key.type === 'Identifier' ? ast.key.name : '';
    if (propertyName) {
      elements.push({
        type: 'property',
        name: propertyName,
        file: filePath,
        line: ast.loc?.start.line || 0,
        exported: false
      });
    }
  }

  // Functions
  if (ast.type === 'FunctionDeclaration' && ast.id) {
    elements.push({
      type: 'function',
      name: ast.id.name,
      file: filePath,
      line: ast.loc?.start.line || 0,
      exported: isExported
    });
  }

  // Classes
  if (ast.type === 'ClassDeclaration' && ast.id) {
    elements.push({
      type: 'class',
      name: ast.id.name,
      file: filePath,
      line: ast.loc?.start.line || 0,
      exported: isExported
    });
  }

  // Methods
  if (ast.type === 'MethodDefinition' && ast.key) {
    const methodName = ast.key.type === 'Identifier' ? ast.key.name : '';
    if (methodName) {
      elements.push({
        type: 'method',
        name: methodName,
        file: filePath,
        line: ast.loc?.start.line || 0,
        exported: false
      });
    }
  }

  // Recursively traverse AST
  for (const key in ast) {
    const child = ast[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        extractElementsFromAST(item, filePath, elements, isExported);
      }
    } else if (child && typeof child === 'object') {
      extractElementsFromAST(child, filePath, elements, isExported);
    }
  }
}
