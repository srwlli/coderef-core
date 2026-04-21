// coderef-core/scanner/error-reporter.ts

/**
 * Type of scanning error
 */
export type ScanErrorType =  | 'read'        // File read errors (ENOENT, EACCES, etc.)
  | 'parse'       // AST parse errors, syntax errors
  | 'pattern'     // Regex pattern errors
  | 'permission'  // Permission denied
  | 'encoding';   // Non-UTF8 encoding issues

/**
 * Severity level of the error
 */
export type ScanErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Structured error information for scanner failures.
 * Provides actionable context including file location, error type, and fix suggestions.
 */
export interface ScanError {
  /** Type of error */
  type: ScanErrorType;

  /** Severity level */
  severity: ScanErrorSeverity;

  /** File path where error occurred */
  file: string;

  /** Line number (if applicable) */
  line?: number;

  /** Column number (if applicable) */
  column?: number;

  /** Pattern that caused the error (for pattern errors) */
  pattern?: string;

  /** Human-readable error message */
  message: string;

  /** Actionable suggestion to fix the error */
  suggestion?: string;

  /** Stack trace (for debugging) */
  stack?: string;
}

/**
 * Statistics about a scan operation
 */
export interface ScanStats {
  /** Total files attempted */
  filesAttempted: number;

  /** Files successfully scanned */
  filesScanned: number;

  /** Files that failed */
  filesFailed: number;

  /** Total elements found */
  elementsFound: number;

  /** Scan duration in milliseconds */
  durationMs: number;

  /** Timestamp when scan started */
  startedAt: number;

  /** Timestamp when scan completed */
  completedAt: number;
}

/**
 * Result of a scan operation including elements, errors, and statistics.
 * Non-throwing API: errors are returned in the errors array instead of throwing exceptions.
 */
export interface ScanResult<T> {
  /** Successfully scanned elements */
  elements: T[];

  /** Errors encountered during scan (severity: error) */
  errors: ScanError[];

  /** Warnings encountered during scan (severity: warning) */
  warnings: ScanError[];

  /** Scan statistics */
  stats: ScanStats;
}

/**
 * Database of common error suggestions.
 * Maps error types to actionable fix suggestions.
 */
const ERROR_SUGGESTIONS: Record<string, string> = {
  'ENOENT': 'File does not exist. Check that the file path is correct and the file has not been deleted.',

  'EACCES': 'Permission denied. Add read permission with: chmod +r <file> or run scanner with appropriate permissions.',

  'EISDIR': 'Expected a file but found a directory. Ensure the path points to a file, not a directory.',

  'SyntaxError': 'Syntax error in file. Run your language\'s type checker to validate syntax (e.g., npx tsc --noEmit for TypeScript).',

  'EncodingError': 'Non-UTF8 encoding detected. Convert file to UTF-8 with: iconv -f ISO-8859-1 -t UTF-8 <file> > <file>.tmp && mv <file>.tmp <file>',

  'PatternError': 'Regex pattern failed to execute. This may indicate a malformed pattern or engine limitation. Check the pattern definition.',

  'EMFILE': 'Too many open files. Increase the system limit with: ulimit -n 4096 (Unix) or adjust in Windows Resource Monitor.',

  'ENOMEM': 'Out of memory. Try scanning fewer files at once or increase available memory.'
};

/**
 * Creates a structured ScanError from a caught exception.
 *
 * @param error The caught error (Error, string, or unknown)
 * @param file The file being processed
 * @param type The type of error
 * @param severity The severity level (default: 'error')
 * @returns Structured ScanError object
 *
 * @example
 * ```typescript
 * try {
 *   fs.readFileSync(file, 'utf-8');
 * } catch (err) {
 *   const scanError = createScanError(err, file, 'read');
 *   errors.push(scanError);
 * }
 * ```
 */
export function createScanError(
  error: unknown,
  file: string,
  type: ScanErrorType,
  severity: ScanErrorSeverity = 'error'
): ScanError {
  let message = 'Unknown error';
  let suggestion: string | undefined;
  let stack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;

    // Extract error code (e.g., ENOENT, EACCES)
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode && ERROR_SUGGESTIONS[errorCode]) {
      suggestion = ERROR_SUGGESTIONS[errorCode];
    }

    // Check for specific error types
    if (message.includes('SyntaxError') || error.name === 'SyntaxError') {
      suggestion = ERROR_SUGGESTIONS['SyntaxError'];
    }
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = String(error);
  }

  // Default suggestions by type
  if (!suggestion) {
    if (type === 'encoding') {
      suggestion = ERROR_SUGGESTIONS['EncodingError'];
    } else if (type === 'pattern') {
      suggestion = ERROR_SUGGESTIONS['PatternError'];
    }
  }

  return {
    type,
    severity,
    file,
    message,
    suggestion,
    stack
  };
}

/**
 * Creates a ScanError with file location context (line and column).
 *
 * @param error The caught error
 * @param file The file being processed
 * @param line The line number where error occurred
 * @param column Optional column number
 * @param type The type of error
 * @returns Structured ScanError with location context
 *
 * @example
 * ```typescript
 * const error = createScanErrorWithContext(
 *   new Error('Unexpected token'),
 *   'src/App.tsx',
 *   42,
 *   15,
 *   'parse'
 * );
 * console.log(`${error.file}:${error.line}:${error.column}: ${error.message}`);
 * // Output: src/App.tsx:42:15: Unexpected token
 * ```
 */
export function createScanErrorWithContext(
  error: unknown,
  file: string,
  line: number,
  column?: number,
  type: ScanErrorType = 'parse'
): ScanError {
  const scanError = createScanError(error, file, type);

  return {
    ...scanError,
    line,
    column
  };
}

/**
 * Formats a ScanError as a human-readable string.
 * Includes file location, message, and suggestion if available.
 *
 * @param error The ScanError to format
 * @returns Formatted error string
 *
 * @example
 * ```typescript
 * const formatted = formatScanError(error);
 * console.error(formatted);
 * // Output:
 * // ERROR: src/App.tsx:42:15 - Unexpected token
 * // Suggestion: Run your language's type checker to validate syntax
 * ```
 */
export function formatScanError(error: ScanError): string {
  const location = error.line !== undefined
    ? `${error.file}:${error.line}${error.column !== undefined ? `:${error.column}` : ''}`
    : error.file;

  let formatted = `${error.severity.toUpperCase()}: ${location} - ${error.message}`;

  if (error.suggestion) {
    formatted += `\nSuggestion: ${error.suggestion}`;
  }

  if (error.pattern) {
    formatted += `\nPattern: ${error.pattern}`;
  }

  return formatted;
}

/**
 * Prints all errors and warnings from a ScanResult to console.
 *
 * @param result The ScanResult containing errors and warnings
 * @param verbose If true, includes stack traces
 *
 * @example
 * ```typescript
 * const result = await scanWithErrors('./src', ['ts']);
 * printScanErrors(result, true);
 * ```
 */
export function printScanErrors(
  result: ScanResult<unknown>,
  verbose: boolean = false
): void {
  if (result.errors.length > 0) {
    console.error(`\n${result.errors.length} error(s) encountered:\n`);
    for (const error of result.errors) {
      console.error(formatScanError(error));
      if (verbose && error.stack) {
        console.error(`Stack: ${error.stack}`);
      }
      console.error(''); // Empty line
    }
  }

  if (result.warnings.length > 0) {
    console.warn(`\n${result.warnings.length} warning(s):\n`);
    for (const warning of result.warnings) {
      console.warn(formatScanError(warning));
      console.warn(''); // Empty line
    }
  }

  // Print summary
  const { stats } = result;
  console.log(`\nScan Summary:`);
  console.log(`  Files scanned: ${stats.filesScanned}/${stats.filesAttempted}`);
  console.log(`  Elements found: ${stats.elementsFound}`);
  console.log(`  Duration: ${stats.durationMs}ms`);

  if (stats.filesFailed > 0) {
    console.log(`  Failed: ${stats.filesFailed} files`);
  }
}

/**
 * Creates an initial ScanStats object with start time.
 *
 * @returns ScanStats initialized with current timestamp
 */
export function initScanStats(): ScanStats {
  const now = Date.now();
  return {
    filesAttempted: 0,
    filesScanned: 0,
    filesFailed: 0,
    elementsFound: 0,
    durationMs: 0,
    startedAt: now,
    completedAt: now
  };
}

/**
 * Finalizes ScanStats by calculating duration and completion time.
 *
 * @param stats The stats object to finalize
 * @returns Finalized stats with duration calculated
 */
export function finalizeScanStats(stats: ScanStats): ScanStats {
  const now = Date.now();
  return {
    ...stats,
    completedAt: now,
    durationMs: now - stats.startedAt
  };
}
