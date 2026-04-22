/**
 * FastAPI Route Detector
 * Example plugin detector for CodeRef
 *
 * Detects FastAPI route definitions in Python files.
 * Demonstrates the CodeDetector interface implementation.
 */

// Example: In a real plugin, use: import { CodeDetector, DetectionResult } from '@coderef/core/plugins/types';
// For this example, we define the interfaces inline:

interface DetectionResult {
  name: string;
  type: string;
  file: string;
  line: number;
  exported: boolean;
  framework?: string;
  route?: string;
  metadata?: Record<string, any>;
  confidence?: number;
}

interface CodeDetector {
  name: string;
  version?: string;
  filePatterns?: string[];
  priority?: number;
  detect(file: string, content: string): DetectionResult[] | null;
}

/**
 * FastAPI route detector implementation
 */
export const fastapiRouteDetector: CodeDetector = {
  name: 'fastapi-routes',
  version: '1.0.0',
  filePatterns: ['**/*.py'],
  priority: 10,

  /**
   * Detect FastAPI route definitions in Python file
   * @param file - Absolute file path
   * @param content - File content
   * @returns Detection results
   */
  detect(file: string, content: string): DetectionResult[] | null {
    const results: DetectionResult[] = [];

    // Simple regex-based detection for demonstration
    // In production, use AST parsing
    const routePattern = /@app\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/g;
    const functionPattern = /(?:async\s+)?def\s+(\w+)\s*\(/g;

    let match;
    const routes: Array<{ method: string; path: string; line: number }> = [];

    // Find all route decorators
    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const path = match[2];
      const line = content.substring(0, match.index).split('\n').length;

      routes.push({ method, path, line });
    }

    // Find function definitions and associate with routes
    if (routes.length > 0) {
      let funcMatch;
      const functions: Array<{ name: string; line: number }> = [];

      while ((funcMatch = functionPattern.exec(content)) !== null) {
        const line = content.substring(0, funcMatch.index).split('\n').length;
        functions.push({ name: funcMatch[1], line });
      }

      // Match routes to nearest function definition
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const nextRouteLine = routes[i + 1]?.line || Infinity;

        // Find function between this route and the next
        const handlerFunc = functions.find(f =>
          f.line > route.line && f.line < nextRouteLine
        );

        if (handlerFunc) {
          results.push({
            name: handlerFunc.name,
            type: 'function',
            file: file,
            line: handlerFunc.line,
            exported: false,
            framework: 'fastapi',
            route: route.path,
            metadata: {
              httpMethod: route.method,
              endpoint: route.path
            },
            confidence: 0.9
          });
        }
      }
    }

    return results.length > 0 ? results : null;
  }
};

// Default export for plugin loader
export default fastapiRouteDetector;
