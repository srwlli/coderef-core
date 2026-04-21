/**
 * FileNotFoundError - Missing files or directories
 * @module errors
 *
 * Thrown when a required file or directory cannot be found
 */

import { CodeRefError, CodeRefErrorOptions } from './CodeRefError.js';

/**
 * Error thrown when files or directories are not found
 *
 * @example
 * ```typescript
 * throw new FileNotFoundError('Index file not found: ./coderef-index.json', {
 *   context: { path: './coderef-index.json', operation: 'load' }
 * });
 * ```
 */
export class FileNotFoundError extends CodeRefError {
  constructor(message: string, options?: CodeRefErrorOptions) {
    super(message, options);
    this.name = 'FileNotFoundError';
    this.code = 'FILE_NOT_FOUND';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default FileNotFoundError;
