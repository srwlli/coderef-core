/**
 * Next.js Framework Detector
 * IMP-CORE-038: Framework detection via registry pattern
 *
 * Detects Next.js App Router and Pages Router API routes
 */

import { FrameworkDetector, FrameworkDetectionResult } from '../../scanner/framework-registry.js';
import { parseNextJsRoute, parseNextJsPagesRoute } from '../route-parsers.js';

export const nextjsDetector: FrameworkDetector = {
  name: 'nextjs',

  detect(file: string, content: string): FrameworkDetectionResult | null {
    // Check App Router: app/api/*/route.(ts|js|tsx|jsx)
    if (file.includes('/app/api/') && file.match(/\/route\.(ts|js|tsx|jsx)$/)) {
      const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const exports: string[] = [];

      for (const method of httpMethods) {
        const exportPattern = new RegExp(`export\\s+(?:async\\s+)?(?:function|const)\\s+${method}\\b`, 'g');
        if (exportPattern.test(content)) {
          exports.push(method);
        }
      }

      if (exports.length > 0) {
        const routeMetadata = parseNextJsRoute(file, exports);
        if (routeMetadata) {
          return {
            framework: 'nextjs',
            route: routeMetadata,
            elementName: 'route',
            elementType: 'function'
          };
        }
      }
    }

    // Check Pages Router: pages/api/*.ts
    const pagesRouteMetadata = parseNextJsPagesRoute(file, content);
    if (pagesRouteMetadata) {
      return {
        framework: 'nextjs-pages',
        route: pagesRouteMetadata,
        elementName: 'handler',
        elementType: 'handler'
      };
    }

    return null;
  }
};

export default nextjsDetector;
