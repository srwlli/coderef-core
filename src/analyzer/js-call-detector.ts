/**
 * IMP-CORE-035: JavaScript Call Detector - Backward Compatibility Re-export
 * 
 * DEPRECATED: This monolithic file has been refactored into modular components.
 * The new location is: js-call-detector/index.ts
 * 
 * This file exists for backward compatibility and simply re-exports from the
 * new modular structure. Please update imports to use the new module path.
 * 
 * @deprecated Use js-call-detector/index.ts instead
 */

// Re-export everything from the new modular structure
export * from './js-call-detector/index.js';

// Maintain default export compatibility
export { default } from './js-call-detector/index.js';
