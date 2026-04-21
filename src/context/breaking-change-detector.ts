/**
 * IMP-CORE-035: Breaking Change Detector - Backward Compatibility Re-export
 * 
 * DEPRECATED: This monolithic file has been refactored into modular components.
 * The new location is: breaking-change-detector/index.ts
 * 
 * This file exists for backward compatibility and simply re-exports from the
 * new modular structure. Please update imports to use the new module path.
 * 
 * @deprecated Use breaking-change-detector/index.ts instead
 */

// Re-export everything from the new modular structure
export * from './breaking-change-detector/index.js';

// Maintain default export compatibility
export { default } from './breaking-change-detector/index.js';
