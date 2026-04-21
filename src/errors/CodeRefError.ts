/**
 * CodeRefError - Base error class for all CodeRef system errors
 * @module errors
 *
 * Provides a foundation for custom error handling with:
 * - Structured error codes
 * - Error cause chains for debugging
 * - Context information for recovery
 * - JSON serialization for logging
 * - User-friendly toString() for CLI display
 */

/**
 * Options for creating a CodeRefError
 */
export interface CodeRefErrorOptions {
  /** Original error that caused this error (for error chains) */
  cause?: Error;
  /** Additional context information for debugging and recovery */
  context?: Record<string, any>;
}

/**
 * Base error class for all CodeRef system errors
 *
 * Extends the native Error class with additional functionality:
 * - Structured error codes for programmatic error handling
 * - Optional cause chain for tracking error origins
 * - Context object for additional debugging information
 * - JSON serialization for logging and telemetry
 * - User-friendly toString() for CLI display
 *
 * @example
 * ```typescript
 * throw new CodeRefError('Operation failed', {
 *   cause: originalError,
 *   context: { file: 'auth.ts', operation: 'scan' }
 * });
 * ```
 */
export class CodeRefError extends Error {
  /** Error code for programmatic error handling */
  public code: string;

  /** Original error that caused this error (if any) */
  public cause?: Error;

  /** Additional context information */
  public context?: Record<string, any>;

  /**
   * Create a new CodeRefError
   *
   * @param message - Human-readable error message
   * @param options - Optional cause and context
   */
  constructor(message: string, options?: CodeRefErrorOptions) {
    super(message);

    this.name = 'CodeRefError';
    this.code = 'CODEREF_ERROR';
    this.cause = options?.cause;
    this.context = options?.context;

    // Maintain proper stack trace for V8 engines (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON for logging and debugging
   *
   * @returns JSON representation of the error
   */
  toJSON(): object {
    const json: any = {
      name: this.name,
      code: this.code,
      message: this.message,
      stack: this.stack,
    };

    if (this.context) {
      json.context = this.context;
    }

    if (this.cause) {
      json.cause = {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      };
    }

    return json;
  }

  /**
   * Convert error to user-friendly string for CLI display
   *
   * @returns Formatted error message
   */
  toString(): string {
    let output = `${this.name}: ${this.message}`;

    if (this.context) {
      const contextStr = Object.entries(this.context)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');
      output += `\n  Context: ${contextStr}`;
    }

    if (this.cause) {
      output += `\n  Caused by: ${this.cause.message}`;
    }

    return output;
  }
}

export default CodeRefError;
