/**
 * Nuxt Framework Detector
 * IMP-CORE-038: Framework detection via registry pattern
 *
 * Detects Nuxt server API routes (server/api/*.ts)
 */

import { FrameworkDetector, FrameworkDetectionResult } from '../../scanner/framework-registry.js';
import { parseNuxtRoute } from '../route-parsers.js';

export const nuxtDetector: FrameworkDetector = {
  name: 'nuxt',

  detect(file: string, content: string): FrameworkDetectionResult | null {
    const routeMetadata = parseNuxtRoute(file, content);

    if (routeMetadata) {
      return {
        framework: 'nuxt',
        route: routeMetadata,
        elementName: 'handler',
        elementType: 'function'
      };
    }

    return null;
  }
};

export default nuxtDetector;
