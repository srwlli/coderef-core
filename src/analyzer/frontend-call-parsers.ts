/**
 * @coderef-semantic: 1.0.0
 * @exports parseFetchCalls, parseAxiosCalls, parseReactQueryCalls, parseCustomApiCalls, extractHttpMethod, extractCallLocation
 * @used_by src/fileGeneration/saveFrontendCalls.ts, src/generator/generateFrontendCalls.ts, src/scanner/frontend-scanner.ts, src/scanner/scanner.ts, src/types/types.ts
 */





// coderef-core/analyzer/frontend-call-parsers.ts
// WO-ROUTE-VALIDATION-ENHANCEMENT-001: Frontend API call detection parsers

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { FrontendCall } from '../types/types';

// Re-export FrontendCall type for external use
export type { FrontendCall };

/**
 * Parse fetch() API calls: fetch('/api/users', { method: 'POST' })
 * Handles both static strings and template literals
 *
 * @param code - Source code containing fetch calls
 * @param filePath - File path for source location
 * @returns Array of FrontendCall objects or empty array
 *
 * @example
 * parseFetchCalls("fetch('/api/users')", 'app.tsx')
 * // Returns: [{ path: '/api/users', method: 'GET', file: 'app.tsx', line: 1, callType: 'fetch', confidence: 100 }]
 *
 * @example
 * parseFetchCalls("fetch(`/api/users/${id}`)", 'app.tsx')
 * // Returns: [{ path: '/api/users/{id}', method: 'GET', file: 'app.tsx', line: 1, callType: 'fetch', confidence: 80 }]
 */
export function parseFetchCalls(code: string, filePath: string): FrontendCall[] {
  const calls: FrontendCall[] = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      CallExpression(path) {
        const { node } = path;

        // Check if it's a fetch call
        if (t.isIdentifier(node.callee) && node.callee.name === 'fetch') {
          const firstArg = node.arguments[0];
          const secondArg = node.arguments[1];

          // Extract path
          const pathInfo = extractPath(firstArg);
          if (!pathInfo) return;

          // Extract HTTP method
          const method = extractHttpMethod(secondArg);

          // Extract line number
          const line = node.loc?.start.line || 0;

          calls.push({
            path: pathInfo.path,
            method,
            file: filePath,
            line,
            callType: 'fetch',
            confidence: pathInfo.confidence,
          });
        }
      },
    });
  } catch (error) {
    // Silently fail on parse errors (malformed code)
    return [];
  }

  return calls;
}

/**
 * Parse axios API calls: axios.get('/api/users'), axios.post('/api/users', data)
 * Handles all HTTP methods: get, post, put, delete, patch
 *
 * @param code - Source code containing axios calls
 * @param filePath - File path for source location
 * @returns Array of FrontendCall objects or empty array
 *
 * @example
 * parseAxiosCalls("axios.get('/api/users')", 'app.tsx')
 * // Returns: [{ path: '/api/users', method: 'GET', file: 'app.tsx', line: 1, callType: 'axios', confidence: 100 }]
 */
export function parseAxiosCalls(code: string, filePath: string): FrontendCall[] {
  const calls: FrontendCall[] = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      CallExpression(path) {
        const { node } = path;

        // Check if it's axios.method() call
        if (
          t.isMemberExpression(node.callee) &&
          t.isIdentifier(node.callee.object) &&
          node.callee.object.name === 'axios' &&
          t.isIdentifier(node.callee.property)
        ) {
          const methodName = node.callee.property.name;
          const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'request'];

          if (validMethods.includes(methodName.toLowerCase())) {
            const firstArg = node.arguments[0];
            const pathInfo = extractPath(firstArg);
            if (!pathInfo) return;

            const line = node.loc?.start.line || 0;

            calls.push({
              path: pathInfo.path,
              method: methodName.toUpperCase(),
              file: filePath,
              line,
              callType: 'axios',
              confidence: pathInfo.confidence,
            });
          }
        }
      },
    });
  } catch (error) {
    return [];
  }

  return calls;
}

/**
 * Parse React Query hooks: useQuery({ queryKey: ['/api/users'], queryFn: ... })
 * and useMutation({ mutationFn: () => fetch('/api/users') })
 *
 * @param code - Source code containing React Query hooks
 * @param filePath - File path for source location
 * @returns Array of FrontendCall objects or empty array
 *
 * @example
 * parseReactQueryCalls("useQuery({ queryKey: ['/api/users'], queryFn })", 'app.tsx')
 * // Returns: [{ path: '/api/users', method: 'GET', file: 'app.tsx', line: 1, callType: 'reactQuery', confidence: 90 }]
 */
export function parseReactQueryCalls(code: string, filePath: string): FrontendCall[] {
  const calls: FrontendCall[] = [];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      CallExpression(path) {
        const { node } = path;

        // Check for useQuery or useMutation
        if (
          t.isIdentifier(node.callee) &&
          (node.callee.name === 'useQuery' || node.callee.name === 'useMutation')
        ) {
          const firstArg = node.arguments[0];

          // Extract queryKey array
          if (t.isObjectExpression(firstArg)) {
            const queryKeyProp = firstArg.properties.find(
              (prop) =>
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key) &&
                prop.key.name === 'queryKey'
            );

            if (queryKeyProp && t.isObjectProperty(queryKeyProp) && t.isArrayExpression(queryKeyProp.value)) {
              const firstElement = queryKeyProp.value.elements[0];
              const pathInfo = extractPath(firstElement);
              if (!pathInfo) return;

              const line = node.loc?.start.line || 0;
              const method = node.callee.name === 'useMutation' ? 'POST' : 'GET';

              calls.push({
                path: pathInfo.path,
                method,
                file: filePath,
                line,
                callType: 'reactQuery',
                confidence: pathInfo.confidence,
              });
            }
          }
        }
      },
    });
  } catch (error) {
    return [];
  }

  return calls;
}

/**
 * Parse custom API client calls: api.get('/users'), apiClient.post('/users')
 * Detects common patterns like api.*, apiClient.*, client.*, http.*
 *
 * @param code - Source code containing custom client calls
 * @param filePath - File path for source location
 * @returns Array of FrontendCall objects or empty array
 *
 * @example
 * parseCustomApiCalls("api.get('/users')", 'app.tsx')
 * // Returns: [{ path: '/users', method: 'GET', file: 'app.tsx', line: 1, callType: 'custom', confidence: 90 }]
 */
export function parseCustomApiCalls(code: string, filePath: string): FrontendCall[] {
  const calls: FrontendCall[] = [];

  const API_CLIENT_PATTERNS = ['api', 'apiClient', 'client', 'http', 'httpClient', 'request'];

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      CallExpression(path) {
        const { node } = path;

        // Check if it's customClient.method() call
        if (
          t.isMemberExpression(node.callee) &&
          t.isIdentifier(node.callee.object) &&
          t.isIdentifier(node.callee.property)
        ) {
          const objectName = node.callee.object.name;
          const methodName = node.callee.property.name;

          // Check if object name matches common API client patterns
          const isApiClient = API_CLIENT_PATTERNS.some(
            (pattern) => objectName.toLowerCase().includes(pattern)
          );

          const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'request'];

          if (isApiClient && validMethods.includes(methodName.toLowerCase())) {
            const firstArg = node.arguments[0];
            const pathInfo = extractPath(firstArg);
            if (!pathInfo) return;

            const line = node.loc?.start.line || 0;

            calls.push({
              path: pathInfo.path,
              method: methodName.toUpperCase(),
              file: filePath,
              line,
              callType: 'custom',
              confidence: pathInfo.confidence,
            });
          }
        }
      },
    });
  } catch (error) {
    return [];
  }

  return calls;
}

/**
 * Extract HTTP method from fetch options object
 * Handles: fetch('/path', { method: 'POST' })
 *
 * @param optionsArg - AST node for options argument
 * @returns HTTP method string (defaults to 'GET')
 */
export function extractHttpMethod(optionsArg: any): string {
  if (!optionsArg || !t.isObjectExpression(optionsArg)) {
    return 'GET'; // Default method
  }

  const methodProp = optionsArg.properties.find(
    (prop: any) =>
      t.isObjectProperty(prop) &&
      t.isIdentifier(prop.key) &&
      prop.key.name === 'method'
  );

  if (methodProp && t.isObjectProperty(methodProp) && t.isStringLiteral(methodProp.value)) {
    return methodProp.value.value.toUpperCase();
  }

  return 'GET';
}

/**
 * Extract path from AST node
 * Handles static strings and template literals
 *
 * @param pathArg - AST node containing the path
 * @returns Object with path and confidence score, or null
 */
function extractPath(pathArg: any): { path: string; confidence: number } | null {
  if (!pathArg) return null;

  // Static string: fetch('/api/users')
  if (t.isStringLiteral(pathArg)) {
    return {
      path: pathArg.value,
      confidence: 100, // Exact match
    };
  }

  // Template literal: fetch(`/api/users/${id}`)
  if (t.isTemplateLiteral(pathArg)) {
    // Build path by interleaving quasis and {id} placeholders
    const parts: string[] = [];
    for (let i = 0; i < pathArg.quasis.length; i++) {
      parts.push(pathArg.quasis[i].value.raw);
      // Add {id} placeholder between quasis (not after the last one)
      if (i < pathArg.expressions.length) {
        parts.push('{id}');
      }
    }
    const path = parts.join('');

    return {
      path,
      confidence: 80, // Dynamic route
    };
  }

  // Variable or expression: const url = '/api/users'; fetch(url)
  // Skip these as we can't resolve them statically
  return null;
}

/**
 * Extract source location (file path and line number) from AST node
 *
 * @param node - AST node
 * @param filePath - File path
 * @returns Object with file and line number
 */
export function extractCallLocation(node: any, filePath: string): { file: string; line: number } {
  return {
    file: filePath,
    line: node.loc?.start.line || 0,
  };
}
