/**
 * ScanError - Scanner failures
 * @module errors
 *
 * Thrown when code scanning operations fail
 */

import { CodeRefError, CodeRefErrorOptions } from './CodeRefError.js';

/**
 * Error thrown when scanner operations fail
 *
 * @example
 * ```typescript
 * throw new ScanError('Failed to parse file', {
 *   cause: tsError,
 *   context: { file: 'auth.ts', operation: 'AST parse' }
 * });
 * ```
 */
export class ScanError extends CodeRefError {
  constructor(message: string, options?: CodeRefErrorOptions) {
    super(message, options);
    this.name = 'ScanError';
    this.code = 'SCAN_ERROR';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ScanError;
