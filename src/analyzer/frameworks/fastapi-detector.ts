/**
 * FastAPI Framework Detector
 * IMP-CORE-038: Framework detection via registry pattern
 *
 * Detects FastAPI route decorators (@app.get, @app.post, etc.)
 */

import { FrameworkDetector, FrameworkDetectionResult } from '../../scanner/framework-registry.js';
import { parseFastAPIRoute } from '../route-parsers.js';

export const fastapiDetector: FrameworkDetector = {
  name: 'fastapi',

  detect(file: string, content: string): FrameworkDetectionResult | null {
    // Check for FastAPI decorators
    const fastapiPattern = /@\w+\.(get|post|put|delete|patch)\s*\(/;
    if (!fastapiPattern.test(content)) {
      return null;
    }

    // Find first route definition
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/@(\w+)\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/);
      if (match) {
        const routeMetadata = parseFastAPIRoute(line, i + 1);
        if (routeMetadata) {
          // Extract function name from next line
          const nextLine = lines[i + 1] || '';
          const funcMatch = nextLine.match(/(?:async\s+)?def\s+(\w+)\s*\(/);
          const elementName = funcMatch ? funcMatch[1] : 'route_handler';

          return {
            framework: 'fastapi',
            route: routeMetadata,
            elementName,
            elementType: 'function'
          };
        }
      }
    }

    return null;
  }
};

export default fastapiDetector;
