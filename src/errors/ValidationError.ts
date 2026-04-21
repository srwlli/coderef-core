/**
 * ValidationError - Validation failures
 * @module errors
 *
 * Thrown when input validation fails
 */

import { CodeRefError, CodeRefErrorOptions } from './CodeRefError.js';

/**
 * Error thrown when validation fails
 *
 * @example
 * ```typescript
 * throw new ValidationError('Invalid type designator: X', {
 *   context: { provided: 'X', valid: ['Fn', 'C', 'Cl', 'M', 'H', 'T', 'A', 'I', 'Cfg'] }
 * });
 * ```
 */
export class ValidationError extends CodeRefError {
  constructor(message: string, options?: CodeRefErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ValidationError;
