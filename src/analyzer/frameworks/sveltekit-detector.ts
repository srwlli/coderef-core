/**
 * SvelteKit Framework Detector
 * IMP-CORE-038: Framework detection via registry pattern
 *
 * Detects SvelteKit server routes (+server.ts, +page.server.ts)
 */

import { FrameworkDetector, FrameworkDetectionResult } from '../../scanner/framework-registry.js';
import { parseSvelteKitRoute } from '../route-parsers.js';

export const sveltekitDetector: FrameworkDetector = {
  name: 'sveltekit',

  detect(file: string, content: string): FrameworkDetectionResult | null {
    // Check for SvelteKit server files
    if (!file.includes('+server') && !file.includes('+page.server')) {
      return null;
    }

    // Extract exports
    const exports: string[] = [];
    const exportPatterns = [
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|load|actions)\b/g,
      /export\s+const\s+(GET|POST|PUT|DELETE|PATCH|load|actions)\b/g
    ];

    for (const pattern of exportPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[1]);
      }
    }

    const routeMetadata = parseSvelteKitRoute(file, exports);
    if (routeMetadata) {
      return {
        framework: 'sveltekit',
        route: routeMetadata,
        elementName: routeMetadata.path.includes('/api/') ? 'API' : 'load',
        elementType: 'function'
      };
    }

    return null;
  }
};

export default sveltekitDetector;
