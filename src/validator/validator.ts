/**
 * CodeRef2 Reference Validator
 *
 * Validates parsed CodeRef objects against specification rules
 * - Type validation
 * - Path validation
 * - Element validation
 * - Metadata validation
 * - Suggestion generation for typos/misspellings
 *
 * Implementation follows specification canonical format rules (lines 464-471)
 */

import { ParsedCodeRef } from '../parser/parser.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ValidatorOptions {
  strict?: boolean;
  checkMetadata?: boolean;
  generateSuggestions?: boolean;
}

export class CodeRefValidator {
  private strict: boolean;
  private checkMetadata: boolean;
  private generateSuggestions: boolean;

  // Valid 21 core type designators
  private validTypes = new Set([
    'F', 'D', 'C', 'Fn', 'Cl', 'M', 'V', 'S', 'T', 'A', 'Cfg',
    'H', 'Ctx', 'R', 'Q', 'I', 'Doc', 'Gen', 'Dep', 'E', 'WIP', 'AST'
  ]);

  // Extended types
  private extendedTypes = new Set(['ML', 'DB', 'SEC']);

  // Valid metadata categories
  private validCategories = new Set([
    'status', 'significance', 'security', 'performance', 'complexity',
    'scope', 'env', 'introduced', 'modified', 'deprecated', 'expires',
    'temporal', 'relationships', 'depends-on', 'used-by', 'calls',
    'implements', 'extends', 'imports', 'observes', 'emits', 'listens',
    'conflicts-with'
  ]);

  // Valid status values
  private validStatusValues = new Set([
    'active', 'deprecated', 'experimental', 'legacy', 'stable'
  ]);

  // Valid scope values
  private validScopeValues = new Set([
    'internal', 'public', 'private', 'protected'
  ]);

  constructor(options: ValidatorOptions = {}) {
    this.strict = options.strict ?? true;
    this.checkMetadata = options.checkMetadata ?? true;
    this.generateSuggestions = options.generateSuggestions ?? true;
  }

  /**
   * Validate a parsed CodeRef
   */
  validate(parsed: ParsedCodeRef): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // If parser already found errors, include them
    if (!parsed.isValid) {
      errors.push(...parsed.errors);
    }

    // Validate type designator
    if (!this.isValidTypeDesignator(parsed.type)) {
      errors.push(`Invalid type designator: ${parsed.type}`);
      if (this.generateSuggestions) {
        suggestions.push(
          `Valid types: ${Array.from(this.validTypes).join(', ')}`,
          `Extended types: ${Array.from(this.extendedTypes).join(', ')}`
        );
      }
    }

    // Validate path
    if (!parsed.path || parsed.path.length === 0) {
      errors.push('Path is required');
    } else if (!this.isValidPath(parsed.path)) {
      errors.push(`Invalid path format: ${parsed.path}`);
    }

    // Validate element if present
    if (parsed.element && !this.isValidElement(parsed.element)) {
      warnings.push(`Element format may be invalid: ${parsed.element}`);
    }

    // Validate line reference if present
    if (parsed.line) {
      const lineNum = parseInt(parsed.line, 10);
      if (isNaN(lineNum) || lineNum < 1) {
        errors.push(`Invalid line number: ${parsed.line}. Must be positive integer`);
      }

      if (parsed.lineEnd) {
        const endNum = parseInt(parsed.lineEnd, 10);
        if (isNaN(endNum) || endNum < 1) {
          errors.push(`Invalid line end number: ${parsed.lineEnd}. Must be positive integer`);
        }
        if (lineNum > endNum) {
          errors.push(`Line range is invalid: ${parsed.line}-${parsed.lineEnd}. Start must be <= end`);
        }
      }
    }

    // Validate block reference if present
    if (parsed.blockType) {
      const validBlockTypes = ['function', 'if', 'else', 'try', 'catch', 'for', 'while', 'switch', 'case', 'block'];
      if (!validBlockTypes.includes(parsed.blockType)) {
        errors.push(`Invalid block type: ${parsed.blockType}`);
      }

      if (!parsed.blockIdentifier || parsed.blockIdentifier.length === 0) {
        errors.push('Block identifier is required');
      }
    }

    // Validate metadata if present
    if (parsed.metadata && this.checkMetadata) {
      const metadataValidation = this.validateMetadata(parsed.metadata);
      if (!metadataValidation.isValid) {
        errors.push(...metadataValidation.errors);
        warnings.push(...metadataValidation.warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate type designator
   */
  private isValidTypeDesignator(type: string): boolean {
    if (!type || type.length === 0) return false;
    return this.validTypes.has(type) || this.extendedTypes.has(type);
  }

  /**
   * Validate path format
   */
  private isValidPath(path: string): boolean {
    if (!path || path.length === 0) return false;

    // Path can contain alphanumeric, hyphens, underscores, dots, percent signs
    // And escaped special characters
    if (!/^(?:[A-Za-z0-9_\-\.~%]|\\[#:\\/{}])+(?:\/(?:[A-Za-z0-9_\-\.~%]|\\[#:\\/{}])+)*$/.test(path)) {
      return false;
    }

    return true;
  }

  /**
   * Validate element format
   */
  private isValidElement(element: string): boolean {
    if (!element || element.length === 0) return false;

    // Special case: 'default'
    if (element === 'default') return true;

    // Element with parameters: name(params)
    if (element.includes('(')) {
      return /^[A-Za-z0-9_\-]+\([^)]*\)$/.test(element);
    }

    // Element with dots: name.subElement.subElement2
    const parts = element.split('.');
    for (const part of parts) {
      if (!/^[A-Za-z0-9_\-]+$/.test(part) && !/^\\[#:\\/{}]$/.test(part)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate metadata
   */
  private validateMetadata(metadata: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      // Check for category prefix
      const colonIndex = key.indexOf(':');
      if (colonIndex !== -1) {
        const category = key.substring(0, colonIndex);
        const actualKey = key.substring(colonIndex + 1);

        // Validate category
        if (!this.validCategories.has(category)) {
          warnings.push(`Unknown metadata category: ${category}`);
        }
      }

      // Validate specific known keys
      if (key === 'status' || key.endsWith(':status')) {
        if (typeof value === 'string' && !this.validStatusValues.has(value)) {
          warnings.push(`Unknown status value: ${value}. Valid: ${Array.from(this.validStatusValues).join(', ')}`);
        }
      }

      if (key === 'scope' || key.endsWith(':scope')) {
        if (typeof value === 'string' && !this.validScopeValues.has(value)) {
          warnings.push(`Unknown scope value: ${value}. Valid: ${Array.from(this.validScopeValues).join(', ')}`);
        }
      }

      // Validate timestamp format if temporal field
      if (key.includes('temporal') || key.includes('introduced') || key.includes('modified') ||
          key.includes('deprecated') || key.includes('expires')) {
        if (typeof value === 'string') {
          if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(value)) {
            warnings.push(`Invalid timestamp format for ${key}: ${value}. Expected ISO8601`);
          }
        }
      }

      // Validate relationship arrays
      if (key.includes('depends-on') || key.includes('used-by') || key.includes('calls') ||
          key.includes('implements') || key.includes('extends') || key.includes('imports') ||
          key.includes('observes') || key.includes('emits') || key.includes('listens') ||
          key.includes('conflicts-with')) {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'string' && item.startsWith('@')) {
              // It's a CodeRef, which is valid
            } else if (typeof item !== 'string') {
              warnings.push(`Relationship value should be string or CodeRef: ${key}=${item}`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Check if two type designators are similar (for suggestions)
   */
  private getSimilarTypes(type: string): string[] {
    const allTypes = Array.from(this.validTypes).concat(Array.from(this.extendedTypes));
    const similar: Array<{ type: string; score: number }> = [];

    for (const validType of allTypes) {
      if (this.calculateSimilarity(type, validType) > 0.6) {
        similar.push({
          type: validType,
          score: this.calculateSimilarity(type, validType)
        });
      }
    }

    return similar
      .sort((a, b) => b.score - a.score)
      .map(item => item.type);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshteinDistance(a, b);
    return 1.0 - (distance / maxLen);
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(a: string, b: string): number {
    const aLen = a.length;
    const bLen = b.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= aLen; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= bLen; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= aLen; i++) {
      for (let j = 1; j <= bLen; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[aLen][bLen];
  }
}

// Export for public API
export const validator = new CodeRefValidator();

/**
 * Convenience function to validate a single parsed reference
 */
export function validateCodeRef(parsed: ParsedCodeRef, options?: ValidatorOptions): ValidationResult {
  const v = new CodeRefValidator(options);
  return v.validate(parsed);
}

/**
 * Batch validate multiple parsed references
 */
export function validateCodeRefs(parsed: ParsedCodeRef[], options?: ValidatorOptions): ValidationResult[] {
  const v = new CodeRefValidator(options);
  return parsed.map(ref => v.validate(ref));
}
