/**
 * Express Framework Detector
 * IMP-CORE-038: Framework detection via registry pattern
 *
 * Detects Express route definitions via route-parsers
 */

import { FrameworkDetector, FrameworkDetectionResult } from '../../scanner/framework-registry.js';
import { parseExpressRoute } from '../route-parsers.js';

export const expressDetector: FrameworkDetector = {
  name: 'express',

  detect(file: string, content: string): FrameworkDetectionResult | null {
    // Express routes are detected inline via pattern matching in scanner
    // This detector provides framework identification for file-level detection

    // Check for Express app/route definitions in content
    const expressPattern = /(?:app|router)\.(get|post|put|delete|patch)\s*\(/;
    if (!expressPattern.test(content)) {
      return null;
    }

    // Find first route definition for metadata
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/(\w+)\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/);
      if (match) {
        const routeMetadata = parseExpressRoute(line, i + 1, content);
        if (routeMetadata) {
          return {
            framework: 'express',
            route: routeMetadata,
            elementName: match[1],
            elementType: 'function'
          };
        }
      }
    }

    return null;
  }
};

export default expressDetector;
