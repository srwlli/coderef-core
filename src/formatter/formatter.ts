/**
 * CodeRef2 Reference Formatter
 *
 * Formats and normalizes CodeRef references to canonical form
 * per specification lines 466-471
 *
 * Canonical Format Rules:
 * - No extraneous whitespace
 * - Paths normalized (redundant segments removed)
 * - Metadata keys alphabetically sorted
 * - Boolean values lowercase (true, false)
 * - Consistent quoting in metadata strings
 */

import { ParsedCodeRef } from '../parser/parser.js';

export class CodeRefFormatter {
  /**
   * Format a parsed CodeRef into canonical string
   */
  format(parsed: ParsedCodeRef): string {
    if (!parsed.isValid || parsed.errors.length > 0) {
      throw new Error(`Cannot format invalid CodeRef: ${parsed.errors.join(', ')}`);
    }

    let result = `@${parsed.type}/${this.normalizePath(parsed.path)}`;

    if (parsed.element) {
      result += `#${parsed.element}`;
    }

    if (parsed.line) {
      if (parsed.blockType && parsed.blockIdentifier) {
        result += `:${parsed.blockType}{${parsed.blockIdentifier}}`;
      } else {
        result += `:${parsed.line}`;
        if (parsed.lineEnd) {
          result += `-${parsed.lineEnd}`;
        }
      }
    }

    if (parsed.metadata && Object.keys(parsed.metadata).length > 0) {
      result += `{${this.formatMetadata(parsed.metadata)}}`;
    }

    return result;
  }

  /**
   * Normalize path by removing redundant segments
   */
  private normalizePath(path: string): string {
    const segments = path.split('/').filter(s => s.length > 0);

    // Remove . references (current directory)
    const normalized = segments.filter(s => s !== '.');

    // Remove .. and preceding segment (parent directory)
    const resolved: string[] = [];
    for (const segment of normalized) {
      if (segment === '..') {
        if (resolved.length > 0) {
          resolved.pop();
        }
      } else {
        resolved.push(segment);
      }
    }

    return resolved.join('/');
  }

  /**
   * Format metadata to canonical form
   */
  private formatMetadata(metadata: Record<string, any>): string {
    const entries: string[] = [];

    // Sort keys alphabetically
    const sortedKeys = Object.keys(metadata).sort();

    for (const key of sortedKeys) {
      const value = metadata[key];
      entries.push(this.formatMetadataEntry(key, value));
    }

    return entries.join(',');
  }

  /**
   * Format individual metadata entry
   */
  private formatMetadataEntry(key: string, value: any): string {
    const formattedValue = this.formatMetadataValue(value);

    if (value === true) {
      // Boolean true - just the key
      return key;
    }

    if (value === false || (typeof value === 'string' && value.length === 0)) {
      // Empty or false value - omit value part
      return key;
    }

    return `${key}=${formattedValue}`;
  }

  /**
   * Format metadata value to canonical form
   */
  private formatMetadataValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    if (typeof value === 'string') {
      // Quote strings if they contain special characters
      if (/[,={}#:\[\]]/.test(value) || value.length === 0) {
        return `"${value}"`;
      }
      return value;
    }

    if (Array.isArray(value)) {
      const items = value.map(item =>
        typeof item === 'string' && /[,={}#:\[\]]/.test(item)
          ? `"${item}"`
          : String(item)
      );
      return `[${items.join(',')}]`;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}

// Export for public API
export const formatter = new CodeRefFormatter();

/**
 * Convenience function to format a parsed reference
 */
export function formatCodeRef(parsed: ParsedCodeRef): string {
  return formatter.format(parsed);
}

/**
 * Batch format multiple parsed references
 */
export function formatCodeRefs(parsed: ParsedCodeRef[]): string[] {
  return parsed.map(ref => formatter.format(ref));
}
