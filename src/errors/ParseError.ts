/**
 * ParseError - Tag parsing failures
 * @module errors
 *
 * Thrown when CodeRef tag parsing fails due to invalid format
 */

import { CodeRefError, CodeRefErrorOptions } from './CodeRefError.js';

/**
 * Error thrown when parsing CodeRef tags fails
 *
 * @example
 * ```typescript
 * throw new ParseError('Invalid tag format: missing #', {
 *   context: { tag: '@Fn/path', expected: '@Fn/path#element:line' }
 * });
 * ```
 */
export class ParseError extends CodeRefError {
  constructor(message: string, options?: CodeRefErrorOptions) {
    super(message, options);
    this.name = 'ParseError';
    this.code = 'PARSE_ERROR';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ParseError;
