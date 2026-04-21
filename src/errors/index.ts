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

// Re-export GraphError from analyzer (already exists)
export { GraphError, GraphErrorCode } from '../analyzer/graph-error.js';
