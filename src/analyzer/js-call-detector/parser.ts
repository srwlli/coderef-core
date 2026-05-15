/**
 * @coderef-semantic: 1.0.0
 * @exports parseCallExpression, parseNewExpression, extractObjectName, isNestedCall, extractParameters, extractParameter
 * @used_by src/analyzer/js-call-detector/visitor.ts
 */



/**
 * IMP-CORE-035: JavaScript Call Parser
 * Extracts call expressions from AST nodes
 */

import { CallExpression, Parameter, TraversalContext } from './types.js';

/**
 * Parse a CallExpression node
 */
export function parseCallExpression(
  node: any,
  filePath: string,
  context?: TraversalContext
): CallExpression | null {
  const callee = node.callee;
  let calleeFunction = '';
  let calleeObject = '';
  let callType: 'function' | 'method' | 'constructor' | 'static' = 'function';

  // Handle different callee patterns
  if (callee.type === 'Identifier') {
    // Direct function call: foo()
    calleeFunction = callee.name;
    callType = 'function';
  } else if (callee.type === 'MemberExpression') {
    // Method call: obj.method() or this.method()
    if (callee.property.type === 'Identifier') {
      calleeFunction = callee.property.name;
    }

    if (callee.object.type === 'Identifier') {
      calleeObject = callee.object.name;
      callType = 'method';
    } else if (callee.object.type === 'ThisExpression') {
      calleeObject = 'this';
      callType = 'method';
    } else if (callee.object.type === 'MemberExpression') {
      // Nested: obj.prop.method()
      calleeObject = extractObjectName(callee.object);
      callType = 'method';
    }
  }

  // Skip if we couldn't extract a callee function name
  if (!calleeFunction) {
    return null;
  }

  // Get location
  const line = node.loc?.start.line || 0;
  const column = node.loc?.start.column || 0;

  // Check if async (await expression)
  const isAsync = context?.isAsync || false;

  // Check if nested
  const isNested = isNestedCall(node);

  return {
    callerFunction: context?.functionName,
    callerClass: context?.className,
    calleeFunction,
    calleeObject: calleeObject || undefined,
    callType,
    isAsync,
    line,
    column,
    isNested,
  };
}

/**
 * Parse a NewExpression node (constructor call)
 */
export function parseNewExpression(
  node: any,
  filePath: string,
  context?: TraversalContext
): CallExpression | null {
  const callee = node.callee;
  let calleeFunction = '';

  if (callee.type === 'Identifier') {
    calleeFunction = callee.name;
  } else if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    calleeFunction = callee.property.name;
  }

  if (!calleeFunction) {
    return null;
  }

  const line = node.loc?.start.line || 0;
  const column = node.loc?.start.column || 0;

  return {
    callerFunction: context?.functionName,
    callerClass: context?.className,
    calleeFunction,
    calleeObject: undefined,
    callType: 'constructor',
    isAsync: false,
    line,
    column,
    isNested: false,
  };
}

/**
 * Extract object name from nested MemberExpression
 */
export function extractObjectName(node: any): string {
  if (node.type === 'Identifier') {
    return node.name;
  } else if (node.type === 'MemberExpression') {
    const base = extractObjectName(node.object);
    const prop = node.property.type === 'Identifier' ? node.property.name : '?';
    return `${base}.${prop}`;
  } else if (node.type === 'ThisExpression') {
    return 'this';
  }
  return '?';
}

/**
 * Check if a call is nested inside another call
 */
export function isNestedCall(node: any): boolean {
  // Simple heuristic: check if parent node type suggests nesting
  // (Note: Acorn doesn't provide parent pointers, so this is limited)
  return false; // TODO: Could enhance with full parent tracking
}

/**
 * Extract parameters from function params array
 */
export function extractParameters(params: any[]): Parameter[] {
  return params.map(param => extractParameter(param));
}

/**
 * Extract a single parameter
 */
export function extractParameter(param: any): Parameter {
  // Simple identifier: a, b, c
  if (param.type === 'Identifier') {
    return {
      name: param.name,
      hasDefault: false,
      isRest: false,
      isDestructured: false,
    };
  }

  // Default parameter: a = 1
  if (param.type === 'AssignmentPattern') {
    const inner = extractParameter(param.left);
    return {
      ...inner,
      hasDefault: true,
    };
  }

  // Rest parameter: ...args
  if (param.type === 'RestElement') {
    const inner = extractParameter(param.argument);
    return {
      ...inner,
      name: '...' + inner.name,
      isRest: true,
    };
  }

  // Object destructuring: { x, y }
  if (param.type === 'ObjectPattern') {
    const props = param.properties
      .map((p: any) => {
        if (p.type === 'Property' && p.key.type === 'Identifier') {
          return p.key.name;
        }
        if (p.type === 'RestElement' && p.argument.type === 'Identifier') {
          return '...' + p.argument.name;
        }
        return '?';
      })
      .filter((p: string) => p !== '?');

    return {
      name: `{${props.join(', ')}}`,
      hasDefault: false,
      isRest: false,
      isDestructured: true,
    };
  }

  // Array destructuring: [a, b]
  if (param.type === 'ArrayPattern') {
    const elements = param.elements
      .map((e: any) => {
        if (!e) return null;
        if (e.type === 'Identifier') return e.name;
        if (e.type === 'RestElement' && e.argument.type === 'Identifier') {
          return '...' + e.argument.name;
        }
        return '?';
      })
      .filter((e: any) => e !== null && e !== '?');

    return {
      name: `[${elements.join(', ')}]`,
      hasDefault: false,
      isRest: false,
      isDestructured: true,
    };
  }

  // Fallback
  return {
    name: '<unknown>',
    hasDefault: false,
    isRest: false,
    isDestructured: false,
  };
}
