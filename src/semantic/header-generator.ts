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
        content: [`exports: [${exportNames}]`],
      });
    }

    // Generate used_by header (internal dependencies)
    if (internalDeps.length > 0) {
      const depList = internalDeps.map((d) => this.normalizePath(d)).join(', ');
      headers.push({
        file: '',
        line: 1,
        type: 'used_by',
        content: [`used_by: [${depList}]`],
      });
    }

    // Generate rules header (constraints derived from structure)
    const rules = this.deriveRules(exports, imports);
    if (rules.length > 0) {
      headers.push({
        file: '',
        line: 1,
        type: 'rules',
        content: [`rules: ${JSON.stringify(rules)}`],
      });
    }

    // Generate related header (related modules)
    const related = this.deriveRelated(imports, externalDeps);
    if (related.length > 0) {
      headers.push({
        file: '',
        line: 1,
        type: 'related',
        content: [`related: [${related.join(', ')}]`],
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
    const headers: SemanticHeader[] = [];

    if (element.exports && element.exports.length > 0) {
      headers.push({
        file: element.file,
        line: 1,
        type: 'exports',
        content: [`exports: [${element.exports.map(exp => exp.name).join(', ')}]`],
      });
    }

    if (element.usedBy && element.usedBy.length > 0) {
      headers.push({
        file: element.file,
        line: 1,
        type: 'used_by',
        content: [`used_by: [${element.usedBy.map(entry => entry.file).join(', ')}]`],
      });
    }

    if (element.rules && element.rules.length > 0) {
      headers.push({
        file: element.file,
        line: 1,
        type: 'rules',
        content: [`rules: ${JSON.stringify(element.rules)}`],
      });
    }

    if (element.related && element.related.length > 0) {
      headers.push({
        file: element.file,
        line: 1,
        type: 'related',
        content: [`related: [${element.related.map(entry => entry.file).join(', ')}]`],
      });
    }

    return headers;
  }

  /**
   * Format headers as code comments
   */
  formatAsComments(headers: SemanticHeader[]): string[] {
    const comments: string[] = [];

    for (const header of headers) {
      if (this.options.commentStyle === 'block') {
        comments.push(`/**`);
        comments.push(` * @semantic`);
        comments.push(` * ${header.type}: ${header.content.join(', ')}`);
        comments.push(` */`);
      } else {
        comments.push(`// @semantic ${header.type}: ${header.content.join(', ')}`);
      }
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
      if (this.options.preserveExisting && content.includes('@semantic')) {
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
          insertPoint = content.indexOf('\n', insertPoint) + 1;
        } else if (content.substr(insertPoint, 2) === '/*') {
          insertPoint = content.indexOf('*/', insertPoint) + 2;
          if (content[insertPoint] === '\n') insertPoint++;
        } else {
          break;
        }
      }

      // Insert header block
      const newContent = content.slice(0, insertPoint) + headerBlock + '\n\n' + content.slice(insertPoint);
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
