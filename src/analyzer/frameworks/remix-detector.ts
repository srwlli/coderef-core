/**
 * Remix Framework Detector
 * IMP-CORE-038: Framework detection via registry pattern
 *
 * Detects Remix routes (app/routes/*.tsx with loader/action exports)
 */

import { FrameworkDetector, FrameworkDetectionResult } from '../../scanner/framework-registry.js';
import { parseRemixRoute } from '../route-parsers.js';

export const remixDetector: FrameworkDetector = {
  name: 'remix',

  detect(file: string, content: string): FrameworkDetectionResult | null {
    // Check for Remix routes directory
    if (!file.includes('/routes/') || !file.endsWith('.tsx') && !file.endsWith('.jsx')) {
      return null;
    }

    // Extract exports
    const exports: string[] = [];
    const exportPatterns = [
      /export\s+(?:async\s+)?function\s+(loader|action)\b/g,
      /export\s+const\s+(loader|action)\b/g
    ];

    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }

    const routeMetadata = parseRemixRoute(file, exports);
    if (routeMetadata) {
      return {
        framework: 'remix',
        route: routeMetadata,
        elementName: 'route',
        elementType: 'function'
      };
    }

    return null;
  }
};

export default remixDetector;
