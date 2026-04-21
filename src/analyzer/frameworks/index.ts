/**
 * Framework Detectors Index
 * IMP-CORE-038: Central export for all framework detectors
 */

export { nextjsDetector } from './nextjs-detector.js';
export { sveltekitDetector } from './sveltekit-detector.js';
export { nuxtDetector } from './nuxt-detector.js';
export { remixDetector } from './remix-detector.js';
export { expressDetector } from './express-detector.js';
export { flaskDetector } from './flask-detector.js';
export { fastapiDetector } from './fastapi-detector.js';

// Re-export registry for convenience
export { frameworkRegistry, type FrameworkDetector, type FrameworkDetectionResult } from '../../scanner/framework-registry.js';
