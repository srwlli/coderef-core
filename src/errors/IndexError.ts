/**
 * IndexError - Index file issues
 * @module errors
 *
 * Thrown when index file operations fail
 */

import { CodeRefError, CodeRefErrorOptions } from './CodeRefError.js';

/**
 * Error thrown when index file operations fail
 *
 * @example
 * ```typescript
 * throw new IndexError('Corrupted index file', {
 *   cause: jsonError,
 *   context: { file: './coderef-index.json', operation: 'parse' }
 * });
 * ```
 */
export class IndexError extends CodeRefError {
  constructor(message: string, options?: CodeRefErrorOptions) {
    super(message, options);
    this.name = 'IndexError';
    this.code = 'INDEX_ERROR';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default IndexError;
