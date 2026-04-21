/**
 * Flask Framework Detector
 * IMP-CORE-038: Framework detection via registry pattern
 *
 * Detects Flask route decorators
 */

import { FrameworkDetector, FrameworkDetectionResult } from '../../scanner/framework-registry.js';
import { parseFlaskRoute } from '../route-parsers.js';

export const flaskDetector: FrameworkDetector = {
  name: 'flask',

  detect(file: string, content: string): FrameworkDetectionResult | null {
    // Check for Flask route decorators
    const flaskPattern = /@(\w+)\.route\s*\(/;
    if (!flaskPattern.test(content)) {
      return null;
    }

    // Find first route definition
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('.route(')) {
        const routeMetadata = parseFlaskRoute(line, i + 1);
        if (routeMetadata) {
          // Extract function name from next line
          const nextLine = lines[i + 1] || '';
          const funcMatch = nextLine.match(/def\s+(\w+)\s*\(/);
          const elementName = funcMatch ? funcMatch[1] : 'route_handler';

          return {
            framework: 'flask',
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

export default flaskDetector;
