/**
 * Register Default Framework Detectors
 * IMP-CORE-038: Auto-register all built-in framework detectors
 *
 * Import this module to register all default framework detectors
 * with the global framework registry.
 */

/**
 * @coderef-semantic: 1.0.0
 * @exports registerDefaultFrameworks
 * @used_by src/scanner/scanner.ts
 */

import { frameworkRegistry } from './framework-registry.js';
import {
  nextjsDetector,
  sveltekitDetector,
  nuxtDetector,
  remixDetector,
  expressDetector,
  flaskDetector,
  fastapiDetector
} from '../analyzer/frameworks/index.js';

/**
 * Register all default framework detectors
 */
export function registerDefaultFrameworks(): void {
  frameworkRegistry.register(nextjsDetector);
  frameworkRegistry.register(sveltekitDetector);
  frameworkRegistry.register(nuxtDetector);
  frameworkRegistry.register(remixDetector);
  frameworkRegistry.register(expressDetector);
  frameworkRegistry.register(flaskDetector);
  frameworkRegistry.register(fastapiDetector);
}

// Auto-register on module load for backward compatibility
registerDefaultFrameworks();

export default registerDefaultFrameworks;
