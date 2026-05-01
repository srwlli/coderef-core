/**
 * CodeRef-Semantics header generator
 *
 * Generates semantic headers (exports, used_by, rules, related) as code comments
 * from extracted AST information and semantic metadata.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ExportInfo, ImportInfo } from './ast-extractor.js';
import type { ElementData } from '../types/types.js';

export interface SemanticHeader {
  file: string;
  line: number;
  type: 'exports' | 'used_by' | 'rules' | 'related';
  content: string[];
}

export interface HeaderGenerationOptions {
  preserveExisting?: boolean;
  commentStyle?: 'block' | 'line'; // /* */ or //
  includeMetadata?: boolean;
}

export class HeaderGenerator {
  private options: HeaderGenerationOptions;

  constructor(options: HeaderGenerationOptions = {}) {
    this.options = {
      preserveExisting: true,
      commentStyle: 'block',
      includeMetadata: true,
      ...options,
    };
  }

  /**
   * Generate semantic headers for exports and dependencies
   */
  generateHeaders(
    exports: ExportInfo[],
    imports: ImportInfo[],
    internalDeps: string[] = [],
    externalDeps: string[] = [],
  ): SemanticHeader[] {
    const headers: SemanticHeader[] = [];

    // Generate exports header
    if (exports.length > 0) {
      const exportNames = exports.map((e) => e.name).join(', ');
      headers.push({
        file: '',
        line: 1,
        type: 'exports',
        content: [`[${exportNames}]`],
      });
    }

    // Generate used_by header (internal dependencies)
    if (internalDeps.length > 0) {
      const depList = internalDeps.map((d) => this.normalizePath(d)).join(', ');
      headers.push({
        file: '',
        line: 1,
        type: 'used_by',
        content: [`[${depList}]`],
      });
    }

    // Generate rules header (constraints derived from structure)
    const rules = this.deriveRules(exports, imports);
    if (rules.length > 0) {
      headers.push({
        file: '',
        line: 1,
        type: 'rules',
        content: [JSON.stringify(rules)],
      });
    }

    // Generate related header (related modules)
    const related = this.deriveRelated(imports, externalDeps);
    if (related.length > 0) {
      headers.push({
        file: '',
        line: 1,
        type: 'related',
        content: [`[${related.join(', ')}]`],
      });
    }

    return headers;
  }

  /**
   * Generate semantic headers from canonical ElementData.
   *
   * This is projection-only: callers decide whether to write the headers.
   */
  generateHeadersFromElement(element: ElementData): SemanticHeader[] {
    return this.generateHeadersFromElements([element]);
  }

  /**
   * Generate one deduplicated semantic header set for a file's elements.
   */
  generateHeadersFromElements(elements: ElementData[]): SemanticHeader[] {
    const headers: SemanticHeader[] = [];
    const file = elements[0]?.file || '';
    const exports = uniqueStrings(elements.flatMap(element => element.exports?.map(exp => exp.name) || []));
    const usedBy = uniqueStrings(elements.flatMap(element => element.usedBy?.map(entry => entry.file) || []));
    const rules = uniqueObjects(elements.flatMap(element => element.rules || []), rule => `${rule.rule}:${rule.description || ''}:${rule.severity || ''}`);
    const related = uniqueObjects(elements.flatMap(element => element.related || []), entry => `${getRelatedPath(entry)}:${entry.reason || ''}:${entry.confidence ?? (entry as any).confidence_score ?? ''}`);

    if (exports.length > 0) {
      headers.push({
        file,
        line: 1,
        type: 'exports',
        content: [`[${exports.join(', ')}]`],
      });
    }

    if (usedBy.length > 0) {
      headers.push({
        file,
        line: 1,
        type: 'used_by',
        content: [`[${usedBy.join(', ')}]`],
      });
    }

    if (rules.length > 0) {
      headers.push({
        file,
        line: 1,
        type: 'rules',
        content: [JSON.stringify(rules)],
      });
    }

    if (related.length > 0) {
      headers.push({
        file,
        line: 1,
        type: 'related',
        content: [`[${related.map(entry => getRelatedPath(entry)).filter(Boolean).join(', ')}]`],
      });
    }

    return headers;
  }

  /**
   * Format headers as code comments
   */
  formatAsComments(headers: SemanticHeader[]): string[] {
    const comments: string[] = [];

    if (this.options.commentStyle === 'block') {
      if (headers.length === 0) return comments;

      comments.push(`/**`);
      comments.push(` * @semantic`);
      for (const header of headers) {
        comments.push(` * ${header.type}: ${header.content.join(', ')}`);
      }
      comments.push(` */`);
      return comments;
    }

    for (const header of headers) {
      comments.push(`// @semantic ${header.type}: ${header.content.join(', ')}`);
    }

    return comments;
  }

  /**
   * Insert headers into source file at appropriate location
   */
  async insertHeaders(filePath: string, headers: SemanticHeader[]): Promise<void> {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');

      // Skip if file already has semantic headers (unless overwrite enabled)
      if (this.options.preserveExisting && this.hasSemanticHeader(content)) {
        console.warn(`[header-generator] ${filePath} already has semantic headers, skipping`);
        return;
      }

      const comments = this.formatAsComments(headers);
      const headerBlock = comments.join('\n');

      // Find insertion point (after shebang and initial comments)
      let insertPoint = 0;
      if (content.startsWith('#!/')) {
        // Skip shebang line
        insertPoint = content.indexOf('\n') + 1;
      }

      // Skip license headers and leading comments
      while (insertPoint < content.length && content[insertPoint] === '/') {
        if (content.substr(insertPoint, 2) === '//') {
          const lineEnd = content.indexOf('\n', insertPoint);
          insertPoint = lineEnd === -1 ? content.length : lineEnd + 1;
        } else if (content.substr(insertPoint, 2) === '/*') {
          const commentEnd = content.indexOf('*/', insertPoint);
          if (commentEnd === -1) break;
          insertPoint = commentEnd + 2;
          insertPoint = this.skipSingleNewline(content, insertPoint);
        } else {
          break;
        }
      }

      // Insert header block
      const prefix = content.slice(0, insertPoint);
      const suffix = content.slice(insertPoint).replace(/^\r?\n/, '');
      const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
      const separator = prefix.length > 0
        ? (prefix.endsWith('\n') ? lineEnding : lineEnding + lineEnding)
        : '';
      const newContent = prefix + separator + headerBlock.replace(/\n/g, lineEnding) + lineEnding + lineEnding + suffix;
      fs.writeFileSync(filePath, newContent, 'utf-8');
    } catch (error) {
      console.error(`Error inserting headers into ${filePath}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Derive structural rules from exports and imports
   */
  private deriveRules(exports: ExportInfo[], imports: ImportInfo[]): string[] {
    const rules: string[] = [];

    // Rule 1: Public API consistency
    if (exports.length > 0 && imports.length > 0) {
      rules.push('public_api_imports_internal');
    }

    // Rule 2: No circular dependencies (checked at integration level)
    rules.push('no_circular_deps');

    // Rule 3: Default export pattern
    const hasDefault = exports.some((e) => e.type === 'default');
    if (hasDefault) {
      rules.push('uses_default_export');
    }

    // Rule 4: Named exports pattern
    const hasNamed = exports.some((e) => e.type === 'named');
    if (hasNamed && exports.length > 3) {
      rules.push('high_export_count');
    }

    return rules;
  }

  /**
   * Derive related modules from imports
   */
  private deriveRelated(imports: ImportInfo[], externalDeps: string[]): string[] {
    const related: string[] = [];

    // Group imports by source
    const importsBySource = new Map<string, ImportInfo[]>();
    for (const imp of imports) {
      const existing = importsBySource.get(imp.from) || [];
      existing.push(imp);
      importsBySource.set(imp.from, existing);
    }

    // List top related modules (by import count)
    const sorted = Array.from(importsBySource.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    for (const [source, _] of sorted) {
      related.push(this.normalizePath(source));
    }

    return related;
  }

  /**
   * Normalize module path
   */
  private normalizePath(modulePath: string): string {
    // Remove leading ./ and trailing /index
    return modulePath
      .replace(/^\.\//, '')
      .replace(/\/index$/, '')
      .replace(/\.(ts|tsx|js|jsx)$/, '');
  }

  private skipSingleNewline(content: string, index: number): number {
    if (content.slice(index, index + 2) === '\r\n') {
      return index + 2;
    }
    if (content[index] === '\n') {
      return index + 1;
    }
    return index;
  }

  private hasSemanticHeader(content: string): boolean {
    return /(^|\r?\n)\/\*\*\r?\n(?: \*.*\r?\n)* \* @semantic\r?\n(?: \*.*\r?\n)* \*\//.test(content)
      || /^\/\/\s*@semantic/m.test(content);
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueObjects<T>(values: T[], getKey: (value: T) => string): T[] {
  const unique = new Map<string, T>();
  for (const value of values) {
    const key = getKey(value);
    if (!unique.has(key)) {
      unique.set(key, value);
    }
  }
  return Array.from(unique.values());
}

function getRelatedPath(entry: any): string {
  return entry?.file || entry?.path || '';
}

/**
 * Generate headers for a single file
 */
export async function generateHeaders(
  filePath: string,
  exports: ExportInfo[],
  imports: ImportInfo[],
  options?: HeaderGenerationOptions,
): Promise<void> {
  const generator = new HeaderGenerator(options);
  const headers = generator.generateHeaders(exports, imports);
  await generator.insertHeaders(filePath, headers);
}
