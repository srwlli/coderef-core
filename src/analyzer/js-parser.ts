/**
 * JavaScript Parser - Utility for parsing JavaScript files with Acorn
 * Phase 2, Task JS-005: Install and configure chosen parser library
 *
 * Provides a simple wrapper around Acorn parser for:
 * - Parsing JavaScript files to ESTree-compliant AST
 * - Handling both ESM and CommonJS module systems
 * - Graceful error handling for invalid syntax
 */

import { parse, Options, Node } from 'acorn';
import * as fs from 'fs';

/**
 * Options for parsing JavaScript code
 */
export interface JSParseOptions {
  /**
   * ECMAScript version to target
   * Default: 'latest' (supports all modern features)
   */
  ecmaVersion?: Options['ecmaVersion'];

  /**
   * Module system: 'module' (ESM) or 'script' (CommonJS/global)
   * Default: 'module'
   */
  sourceType?: Options['sourceType'];

  /**
   * Include location information (line/column)
   * Default: true
   */
  locations?: boolean;

  /**
   * Include byte range information
   * Default: false (not needed for our use case)
   */
  ranges?: boolean;

  /**
   * Allow return statements outside functions (CommonJS pattern)
   * Default: true
   */
  allowReturnOutsideFunction?: boolean;

  /**
   * Be lenient with syntax errors
   * Default: true (we want to parse as much as possible)
   */
  tolerant?: boolean;
}

/**
 * Result of parsing a JavaScript file
 */
export interface JSParseResult {
  /**
   * The parsed AST (ESTree format)
   */
  ast: Node | null;

  /**
   * Whether parsing was successful
   */
  success: boolean;

  /**
   * Error message if parsing failed
   */
  error?: string;

  /**
   * File path that was parsed
   */
  filePath: string;
}

/**
 * Parse JavaScript code string to AST
 */
export function parseJavaScript(
  code: string,
  options: JSParseOptions = {}
): Node | null {
  const parseOptions: Options = {
    ecmaVersion: options.ecmaVersion ?? 'latest',
    sourceType: options.sourceType ?? 'module',
    locations: options.locations ?? true,
    ranges: options.ranges ?? false,
    allowReturnOutsideFunction: options.allowReturnOutsideFunction ?? true,
  };

  try {
    const ast = parse(code, parseOptions);
    return ast as any; // ESTree Node type
  } catch (error) {
    // If parsing as module fails, try as script (CommonJS)
    if (options.sourceType === 'module') {
      try {
        const scriptOptions = { ...parseOptions, sourceType: 'script' as const };
        const ast = parse(code, scriptOptions);
        return ast as any;
      } catch {
        // Both failed, return null
        return null;
      }
    }
    return null;
  }
}

/**
 * Parse JavaScript file to AST
 */
export function parseJavaScriptFile(
  filePath: string,
  options: JSParseOptions = {}
): JSParseResult {
  try {
    // Read file
    const code = fs.readFileSync(filePath, 'utf-8');

    // Parse code
    const ast = parseJavaScript(code, options);

    if (ast) {
      return {
        ast,
        success: true,
        filePath,
      };
    } else {
      return {
        ast: null,
        success: false,
        error: 'Failed to parse as module or script',
        filePath,
      };
    }
  } catch (error) {
    return {
      ast: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      filePath,
    };
  }
}

/**
 * Check if a file is likely JavaScript
 */
export function isJavaScriptFile(filePath: string): boolean {
  return (
    filePath.endsWith('.js') ||
    filePath.endsWith('.jsx') ||
    filePath.endsWith('.mjs') ||
    filePath.endsWith('.cjs')
  );
}

/**
 * Check if a file is likely TypeScript
 */
export function isTypeScriptFile(filePath: string): boolean {
  return (
    filePath.endsWith('.ts') ||
    filePath.endsWith('.tsx') ||
    filePath.endsWith('.mts') ||
    filePath.endsWith('.cts')
  );
}

/**
 * Get the source type (module vs script) based on file extension
 */
export function getSourceTypeFromExtension(filePath: string): 'module' | 'script' {
  // .mjs is always module, .cjs is always script
  if (filePath.endsWith('.mjs')) return 'module';
  if (filePath.endsWith('.cjs')) return 'script';

  // .js and .jsx default to module (most common in modern projects)
  return 'module';
}

/**
 * Parse JavaScript file with automatic source type detection
 */
export function parseJavaScriptFileAuto(filePath: string): JSParseResult {
  const sourceType = getSourceTypeFromExtension(filePath);
  return parseJavaScriptFile(filePath, { sourceType });
}

export default {
  parseJavaScript,
  parseJavaScriptFile,
  parseJavaScriptFileAuto,
  isJavaScriptFile,
  isTypeScriptFile,
  getSourceTypeFromExtension,
};
