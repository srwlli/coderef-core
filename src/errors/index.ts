/**
 * Error Classes Module
 * @module errors
 *
 * Centralized exports for all CodeRef error classes
 */

export { CodeRefError, CodeRefErrorOptions } from './CodeRefError.js';
export { ParseError } from './ParseError.js';
export { FileNotFoundError } from './FileNotFoundError.js';
export { ScanError } from './ScanError.js';
export { ValidationError } from './ValidationError.js';
export { IndexError } from './IndexError.js';

// GraphError re-export removed: src/analyzer/graph-error.ts was deleted with
// the legacy analyzer graph stack (DR-PHASE-5-C).
