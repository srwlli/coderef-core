/**
 * CodeRef2 EBNF Parser
 *
 * Parses @Type/path#element:line{metadata} reference strings into structured objects
 * based on the grammar defined in coderef2-specification.md
 *
 * EBNF Grammar:
 * CodeRef ::= '@' TypeDesignator '/' Path ('#' Element)? (':' LineReference)? ('{' Metadata '}')?
 *
 * Implementation follows specification lines 422-451
 */

export interface ParsedCodeRef {
  type: string;
  path: string;
  element?: string;
  line?: string;
  lineEnd?: string;
  blockType?: string;
  blockIdentifier?: string;
  metadata?: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

export interface ParserOptions {
  strict?: boolean;
  allowUnknownTypes?: boolean;
}

export class CodeRefParser {
  private strict: boolean;
  private allowUnknownTypes: boolean;

  // Valid type designators (21 core + support for extended)
  private validTypes = new Set([
    'F', 'D', 'C', 'Fn', 'Cl', 'M', 'V', 'S', 'T', 'A', 'Cfg',
    'H', 'Ctx', 'R', 'Q', 'I', 'Doc', 'Gen', 'Dep', 'E', 'WIP', 'AST',
    // Extended types
    'ML', 'DB', 'SEC'
  ]);

  constructor(options: ParserOptions = {}) {
    this.strict = options.strict ?? true;
    this.allowUnknownTypes = options.allowUnknownTypes ?? false;
  }

  /**
   * Parse a CodeRef string into a structured object
   * @param reference - The CodeRef string to parse (e.g., "@Fn/utils/logger#logInfo:42")
   * @returns ParsedCodeRef with all components extracted
   */
  parse(reference: string): ParsedCodeRef {
    const errors: string[] = [];
    const result: ParsedCodeRef = {
      type: '',
      path: '',
      isValid: true,
      errors: []
    };

    try {
      // Trim whitespace
      reference = reference.trim();

      // Validate format
      if (!reference.startsWith('@')) {
        errors.push('CodeRef must start with @ symbol');
        result.isValid = false;
        result.errors = errors;
        return result;
      }

      // Remove @ prefix
      let remaining = reference.slice(1);

      // Parse TypeDesignator
      const typeMatch = remaining.match(/^([A-Z][A-Za-z0-9]*)\//);
      if (!typeMatch) {
        errors.push('Invalid TypeDesignator format. Expected [A-Z][A-Za-z0-9]* followed by /');
        result.isValid = false;
        result.errors = errors;
        return result;
      }

      const type = typeMatch[1];
      if (!this.validTypes.has(type) && !this.allowUnknownTypes) {
        errors.push(`Unknown type designator: ${type}`);
        if (this.strict) {
          result.isValid = false;
          result.errors = errors;
          return result;
        }
      }
      result.type = type;

      // Remove type and slash
      remaining = remaining.slice(typeMatch[0].length);

      // Parse Path (until # or : or { or end)
      const pathMatch = remaining.match(/^([^#:{]+)/);
      if (!pathMatch) {
        errors.push('Invalid path format');
        result.isValid = false;
        result.errors = errors;
        return result;
      }

      const path = pathMatch[1].trim();
      if (!path) {
        errors.push('Path cannot be empty');
        result.isValid = false;
        result.errors = errors;
        return result;
      }

      // Validate path format: PathSegment ('/' PathSegment)*
      if (!this.isValidPath(path)) {
        errors.push(`Invalid path format: ${path}`);
        result.isValid = false;
        result.errors = errors;
        return result;
      }

      result.path = path;
      remaining = remaining.slice(pathMatch[0].length);

      // Parse optional Element (after #)
      if (remaining.startsWith('#')) {
        remaining = remaining.slice(1); // Remove #

        // Element format: ElementName ('.' SubElement)* | ElementWithParams | 'default'
        const elementMatch = remaining.match(/^([^:{}]+)/);
        if (!elementMatch) {
          errors.push('Invalid element format after #');
          result.isValid = false;
          result.errors = errors;
          return result;
        }

        const element = elementMatch[1].trim();
        if (!element) {
          errors.push('Element cannot be empty after #');
          result.isValid = false;
          result.errors = errors;
          return result;
        }

        if (!this.isValidElement(element)) {
          errors.push(`Invalid element format: ${element}`);
          result.isValid = false;
          result.errors = errors;
          return result;
        }

        result.element = element;
        remaining = remaining.slice(elementMatch[0].length);
      }

      // Parse optional LineReference (after :)
      if (remaining.startsWith(':')) {
        remaining = remaining.slice(1); // Remove :

        // LineReference: LineNumber ('-' LineNumber)? | BlockReference
        // BlockReference: BlockType '{' BlockIdentifier '}'
        if (remaining.match(/^(function|if|else|try|catch|for|while|switch|case|block)\{/)) {
          // Block reference
          const blockMatch = remaining.match(/^(\w+)\{([^}]+)\}/);
          if (blockMatch) {
            result.blockType = blockMatch[1];
            result.blockIdentifier = blockMatch[2];
            remaining = remaining.slice(blockMatch[0].length);
          } else {
            errors.push('Invalid block reference format');
            result.isValid = false;
            result.errors = errors;
            return result;
          }
        } else {
          // Line number or range
          const lineMatch = remaining.match(/^(\d+)(?:-(\d+))?/);
          if (lineMatch) {
            result.line = lineMatch[1];
            if (lineMatch[2]) {
              result.lineEnd = lineMatch[2];
            }
            remaining = remaining.slice(lineMatch[0].length);
          } else {
            errors.push('Invalid line reference format. Expected number or range (e.g., 42 or 42-47)');
            result.isValid = false;
            result.errors = errors;
            return result;
          }
        }
      }

      // Parse optional Metadata (after {)
      if (remaining.startsWith('{')) {
        const metadataEnd = remaining.indexOf('}');
        if (metadataEnd === -1) {
          errors.push('Unclosed metadata block. Missing }');
          result.isValid = false;
          result.errors = errors;
          return result;
        }

        const metadataStr = remaining.slice(1, metadataEnd).trim();
        if (metadataStr) {
          try {
            result.metadata = this.parseMetadata(metadataStr);
          } catch (error) {
            errors.push(`Failed to parse metadata: ${error instanceof Error ? error.message : String(error)}`);
            result.isValid = false;
            result.errors = errors;
            return result;
          }
        }

        remaining = remaining.slice(metadataEnd + 1).trim();
      }

      // Check for trailing content
      if (remaining.trim()) {
        errors.push(`Unexpected trailing content: ${remaining}`);
        result.isValid = false;
        result.errors = errors;
        return result;
      }

      result.isValid = errors.length === 0;
      result.errors = errors;
      return result;

    } catch (error) {
      result.isValid = false;
      result.errors = [
        ...errors,
        `Parse error: ${error instanceof Error ? error.message : String(error)}`
      ];
      return result;
    }
  }

  /**
   * Validate path format: PathSegment ('/' PathSegment)*
   * PathSegment ::= [A-Za-z0-9_\-\.~%]+ | EscapedChar
   * EscapedChar ::= '\' [#:\/{}]
   */
  private isValidPath(path: string): boolean {
    if (!path || path.length === 0) return false;

    // Split by / but not escaped slashes
    const segments = path.split('/').filter(s => s.length > 0);

    if (segments.length === 0) return false;

    for (const segment of segments) {
      // Check if segment matches pattern: [A-Za-z0-9_\-\.~%]+ with optional escapes
      if (!/^(?:[A-Za-z0-9_\-\.~%]|\\[#:\\/{}])+$/.test(segment)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate element format:
   * Element ::= ElementName ('.' SubElement)* | ElementWithParams | 'default'
   * ElementName ::= [A-Za-z0-9_\-]+ | EscapedChar
   * SubElement ::= [A-Za-z0-9_\-]+ | EscapedChar
   * ElementWithParams ::= ElementName '(' ParamList ')'
   */
  private isValidElement(element: string): boolean {
    if (!element || element.length === 0) return false;

    // Check for 'default' keyword
    if (element === 'default') return true;

    // Check for element with parameters: name(params)
    if (element.includes('(')) {
      const paramMatch = element.match(/^([A-Za-z0-9_\-]+)\(([^)]*)\)$/);
      if (paramMatch) {
        return true;
      }
      return false;
    }

    // Check for element with dots: name.subElement.subElement2
    const parts = element.split('.');
    for (const part of parts) {
      if (!/^(?:[A-Za-z0-9_\-]|\\[#:\\/{}])+$/.test(part)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Parse metadata section
   * Metadata ::= MetadataEntry (',' MetadataEntry)*
   * MetadataEntry ::= CategoryPrefix? Key ('=' Value)?
   * CategoryPrefix ::= [A-Za-z][A-Za-z0-9_\-]* ':'
   */
  private parseMetadata(metadataStr: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Handle JSON-like format
    if (metadataStr.startsWith('{') && metadataStr.endsWith('}')) {
      try {
        return JSON.parse(metadataStr);
      } catch {
        // Fall through to key=value parsing
      }
    }

    // Parse key=value pairs
    const entries = this.splitMetadataEntries(metadataStr);

    for (const entry of entries) {
      const trimmedEntry = entry.trim();
      if (!trimmedEntry) continue;

      // Parse: [category:]key[=value]
      const keyValueMatch = trimmedEntry.match(/^(?:([A-Za-z][A-Za-z0-9_\-]*):)?([A-Za-z][A-Za-z0-9_\-]*)(?:=(.+))?$/);

      if (!keyValueMatch) {
        throw new Error(`Invalid metadata entry: ${trimmedEntry}`);
      }

      const [, category, key, valueStr] = keyValueMatch;
      const fullKey = category ? `${category}:${key}` : key;

      if (valueStr) {
        metadata[fullKey] = this.parseMetadataValue(valueStr.trim());
      } else {
        metadata[fullKey] = true;
      }
    }

    return metadata;
  }

  /**
   * Split metadata entries by comma, respecting quoted strings
   */
  private splitMetadataEntries(str: string): string[] {
    const entries: string[] = [];
    let current = '';
    let inQuotes = false;
    let inBrackets = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '"' && (i === 0 || str[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '[' && !inQuotes) {
        inBrackets++;
        current += char;
      } else if (char === ']' && !inQuotes) {
        inBrackets--;
        current += char;
      } else if (char === ',' && !inQuotes && inBrackets === 0) {
        entries.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      entries.push(current);
    }

    return entries;
  }

  /**
   * Parse metadata value
   * Value ::= QuotedString | Number | Boolean | Array | Timestamp | CodeRefValue
   */
  private parseMetadataValue(valueStr: string): any {
    valueStr = valueStr.trim();

    // Quoted string
    if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
      return valueStr.slice(1, -1);
    }

    // Boolean
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;

    // Number
    if (/^\d+(?:\.\d+)?$/.test(valueStr)) {
      return parseFloat(valueStr);
    }

    // Array
    if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      try {
        return JSON.parse(valueStr);
      } catch {
        return valueStr;
      }
    }

    // CodeRef (starts with @)
    if (valueStr.startsWith('@')) {
      return valueStr;
    }

    // Timestamp (ISO8601)
    if (/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/.test(valueStr)) {
      return valueStr;
    }

    return valueStr;
  }
}

// Export for public API
export const parser = new CodeRefParser();

/**
 * Convenience function to parse a single reference
 */
export function parseCodeRef(reference: string, options?: ParserOptions): ParsedCodeRef {
  const p = new CodeRefParser(options);
  return p.parse(reference);
}

/**
 * Batch parse multiple references
 */
export function parseCodeRefs(references: string[], options?: ParserOptions): ParsedCodeRef[] {
  const p = new CodeRefParser(options);
  return references.map(ref => p.parse(ref));
}
