/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability from
 * @exports inferLayerFromPath, inferCapabilityFromPath, SemanticHeader, HeaderGenerationOptions, HeaderGenerator, generateHeaders
 * @used_by src/cli/populate.ts, src/semantic/orchestrator.ts
 */


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
import logger from '../utils/logger.js';
import { normalizeSlashes } from '../utils/path-normalize.js';

// Ordered path-pattern → layer inference table.
// Patterns are tested with String.includes(); first match wins.
// Layer values must be valid entries from STANDARDS/layers.json.
const LAYER_PATTERNS: Array<{ pattern: string; layer: string }> = [
  { pattern: '__tests__', layer: 'test_support' },
  { pattern: '__test__', layer: 'test_support' },
  { pattern: '.test.', layer: 'test_support' },
  { pattern: '.spec.', layer: 'test_support' },
  { pattern: 'src/cli/', layer: 'cli' },
  { pattern: 'src\\cli\\', layer: 'cli' },
  { pattern: 'scripts/', layer: 'cli' },
  { pattern: 'scripts\\', layer: 'cli' },
  { pattern: 'src/integration/', layer: 'integration' },
  { pattern: 'src\\integration\\', layer: 'integration' },
  { pattern: 'src/utils/', layer: 'utility' },
  { pattern: 'src\\utils\\', layer: 'utility' },
  { pattern: 'src/config/', layer: 'configuration' },
  { pattern: 'src\\config\\', layer: 'configuration' },
  { pattern: 'src/pipeline/', layer: 'service' },
  { pattern: 'src\\pipeline\\', layer: 'service' },
  { pattern: 'src/scanner/', layer: 'service' },
  { pattern: 'src\\scanner\\', layer: 'service' },
  { pattern: 'src/semantic/', layer: 'service' },
  { pattern: 'src\\semantic\\', layer: 'service' },
  { pattern: 'src/adapter/', layer: 'service' },
  { pattern: 'src\\adapter\\', layer: 'service' },
  { pattern: 'src/analyzer/', layer: 'service' },
  { pattern: 'src\\analyzer\\', layer: 'service' },
  { pattern: 'src/indexer/', layer: 'service' },
  { pattern: 'src\\indexer\\', layer: 'service' },
  { pattern: 'src/search/', layer: 'service' },
  { pattern: 'src\\search\\', layer: 'service' },
  { pattern: 'src/context/', layer: 'service' },
  { pattern: 'src\\context\\', layer: 'service' },
  { pattern: 'src/export/', layer: 'service' },
  { pattern: 'src\\export\\', layer: 'service' },
  { pattern: 'src/cache/', layer: 'service' },
  { pattern: 'src\\cache\\', layer: 'service' },
  { pattern: 'src/registry/', layer: 'service' },
  { pattern: 'src\\registry\\', layer: 'service' },
  { pattern: 'src/query/', layer: 'service' },
  { pattern: 'src\\query\\', layer: 'service' },
  { pattern: 'src/types/', layer: 'domain' },
  { pattern: 'src\\types\\', layer: 'domain' },
  { pattern: 'src/parser/', layer: 'parser' },
  { pattern: 'src\\parser\\', layer: 'parser' },
  { pattern: 'src/formatter/', layer: 'formatter' },
  { pattern: 'src\\formatter\\', layer: 'formatter' },
  { pattern: 'src/validator/', layer: 'validation' },
  { pattern: 'src\\validator\\', layer: 'validation' },
  { pattern: 'src/generator/', layer: 'service' },
  { pattern: 'src\\generator\\', layer: 'service' },
  { pattern: 'src/fileGeneration/', layer: 'service' },
  { pattern: 'src\\fileGeneration\\', layer: 'service' },
  { pattern: 'utils/', layer: 'utility' },
  { pattern: 'utils\\', layer: 'utility' },
  { pattern: 'src/', layer: 'service' },
  { pattern: 'src\\', layer: 'service' },
];

export function inferLayerFromPath(filePath: string): string | undefined {
  const normalized = normalizeSlashes(filePath);
  for (const { pattern, layer } of LAYER_PATTERNS) {
    const normalizedPattern = normalizeSlashes(pattern);
    if (normalized.includes(normalizedPattern)) return layer;
  }
  return undefined;
}

export function inferCapabilityFromPath(filePath: string, elementName: string): string | undefined {
  const stem = path.basename(filePath).replace(/\.[^.]+$/, '');
  const stemSlug = stem.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const nameSlug = elementName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!stemSlug) return undefined;
  const capability = stemSlug === nameSlug ? stemSlug : `${stemSlug}-${nameSlug}`;
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(capability) ? capability : undefined;
}

export interface SemanticHeader {
  file: string;
  line: number;
  type: 'exports' | 'used_by' | 'rules' | 'related';
  content: string[];
  layer?: string;
  capability?: string;
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
    const layer = elements.map(e => e.layer).find(l => l != null)
      ?? inferLayerFromPath(file);
    const firstElement = elements[0];
    const capability = elements.map(e => e.capability).find(c => c != null)
      ?? (firstElement ? inferCapabilityFromPath(file, firstElement.name) : undefined);

    // Always emit at least one header entry so files with no exports still get a
    // @coderef-semantic block (enabling @layer/@capability and defined headerStatus).
    headers.push({
      file,
      line: 1,
      type: 'exports',
      content: exports.length > 0 ? [`[${exports.join(', ')}]`] : [],
      layer,
      capability,
    });

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
   * Comment family for a file by extension. Languages using hash line comments
   * (Python, Ruby, Shell, YAML, TOML, …) MUST NOT receive JS block comments —
   * a JS block opener on line 1 of a .py file is a SyntaxError (the broken-
   * sweep bug). C-family languages (ts/js/tsx/jsx/go/rust/java/c/cpp/…) use the
   * JS block-comment style.
   */
  private hashCommentExt = new Set([
    'py', 'pyi', 'rb', 'sh', 'bash', 'zsh', 'yaml', 'yml', 'toml',
    'r', 'pl', 'pm', 'tcl', 'mk', 'cfg', 'conf', 'ini',
  ]);

  private commentFamilyForFile(filePath?: string): 'block' | 'hash' {
    if (!filePath) return 'block';
    const dot = filePath.lastIndexOf('.');
    const ext = dot >= 0 ? filePath.slice(dot + 1).toLowerCase() : '';
    return this.hashCommentExt.has(ext) ? 'hash' : 'block';
  }

  /**
   * Format headers as code comments. `filePath` selects the comment family by
   * extension: C-family block comments vs hash-comment languages (`#`). When
   * omitted, falls back to the configured commentStyle (back-compat).
   */
  formatAsComments(headers: SemanticHeader[], filePath?: string): string[] {
    const comments: string[] = [];
    if (headers.length === 0) return comments;

    // Legacy back-compat: no filePath + configured line style → `//` comments.
    // (filePath-driven calls never hit this; it preserves older callers.)
    if (filePath === undefined && this.options.commentStyle === 'line') {
      for (const header of headers) {
        const value = header.content.join(', ').replace(/^\[|\]$/g, '');
        comments.push(`// @coderef-semantic: 1.0.0 @${header.type} ${value}`);
      }
      return comments;
    }

    const family = filePath !== undefined ? this.commentFamilyForFile(filePath) : 'block';

    // Hash-comment languages (Python et al.): one `#` line per directive.
    // Never emit a JS block comment — invalid syntax in these languages.
    if (family === 'hash') {
      comments.push(`# @coderef-semantic: 1.0.0`);
      const meta = headers.find(h => h.layer ?? h.capability);
      if (meta?.layer) comments.push(`# @layer ${meta.layer}`);
      if (meta?.capability) comments.push(`# @capability ${meta.capability}`);
      for (const header of headers) {
        if (header.content.length === 0) continue;
        const value = header.content.join(', ').replace(/^\[|\]$/g, '');
        comments.push(`# @${header.type} ${value}`);
      }
      return comments;
    }

    // C-family block comment.
    comments.push(`/**`);
    comments.push(` * @coderef-semantic: 1.0.0`);
    const meta = headers.find(h => h.layer ?? h.capability);
    if (meta?.layer) comments.push(` * @layer ${meta.layer}`);
    if (meta?.capability) comments.push(` * @capability ${meta.capability}`);
    for (const header of headers) {
      if (header.content.length === 0) continue; // sentinel with no content — skip the @type line
      const value = header.content.join(', ').replace(/^\[|\]$/g, '');
      comments.push(` * @${header.type} ${value}`);
    }
    comments.push(` */`);
    return comments;
  }

  /**
   * Insert headers into source file at appropriate location
   */
  async insertHeaders(filePath: string, headers: SemanticHeader[]): Promise<void> {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');

      // Skip if file already has semantic headers (unless overwrite enabled)
      if (this.hasSemanticHeader(content)) {
        if (this.options.preserveExisting) {
          logger.warn(`[header-generator] ${filePath} already has semantic headers, skipping`);
          return;
        }
        // Overwrite: preserve @layer/@capability from existing header so LLM-annotated
        // tags survive pure export-refresh runs, then strip the old block cleanly.
        const preserved = this.extractLayerCapability(content);
        for (const header of headers) {
          if (!header.layer && preserved.layer) header.layer = preserved.layer;
          if (!header.capability && preserved.capability) header.capability = preserved.capability;
        }
        content = this.stripSemanticHeaders(content);
      }

      // Language-aware comment syntax (sweep root-cause fix): Python and other
      // hash-comment files get `#` lines, never a JS `/** */` block.
      const comments = this.formatAsComments(headers, filePath);
      const headerBlock = comments.join('\n');

      // Insert at file top (after shebang only). The coderef header must be the
      // first comment block so detectHeaderBlock() in the parser can find it.
      // Any existing JSDoc (license headers, module docs) stays in place below.
      let insertPoint = 0;
      if (content.startsWith('#!/')) {
        insertPoint = content.indexOf('\n') + 1;
      }

      const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
      const prefix = content.slice(0, insertPoint);
      const suffix = content.slice(insertPoint);
      const newContent = prefix + headerBlock.replace(/\n/g, lineEnding) + lineEnding + lineEnding + suffix;
      fs.writeFileSync(filePath, newContent, 'utf-8');
    } catch (error) {
      logger.error(`Error inserting headers into ${filePath}:`, error instanceof Error ? error.message : error);
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
    // Match the canonical forms we write: `@coderef-semantic: ` (space before
    // version). Test files may contain `@coderef-semantic:1.0.0` (no space) as
    // string literals — excluded. Covers JS block (` * `), JS line (`// `),
    // and hash-comment (`# `) styles so re-runs on Python detect + refresh.
    return /^\s*\*\s*@coderef-semantic:\s+\d/m.test(content)
      || /^\/\/\s*@coderef-semantic:\s+\d/m.test(content)
      || /^#\s*@coderef-semantic:\s+\d/m.test(content);
  }

  private extractLayerCapability(content: string): { layer?: string; capability?: string } {
    const layerMatch = content.match(/@layer\s+([a-z][a-z0-9_-]*)/);
    const capMatch = content.match(/@capability\s+([a-z][a-z0-9-]*)/);
    return { layer: layerMatch?.[1], capability: capMatch?.[1] };
  }

  // Strip all semantic header blocks line-by-line to avoid regex eating source code.
  private stripSemanticHeaders(content: string): string {
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trimStart() === '/**') {
        const blockLines: string[] = [lines[i++]];
        while (i < lines.length && !lines[i].trimStart().startsWith('*/')) {
          blockLines.push(lines[i++]);
        }
        if (i < lines.length) blockLines.push(lines[i++]); // closing */
        if (blockLines.some(l => /@coderef-semantic/.test(l))) {
          // Discard semantic block; also drop a following blank line
          if (i < lines.length && lines[i].trim() === '') i++;
        } else {
          out.push(...blockLines);
        }
      } else if (/^\/\/\s*@coderef-semantic\s*:/.test(lines[i])) {
        i++;
      } else if (/^#\s*@coderef-semantic\s*:/.test(lines[i])) {
        // Hash-comment semantic header (Python et al.): strip the contiguous
        // run of `# @...` lines plus one trailing blank line.
        while (i < lines.length && /^#\s*@/.test(lines[i])) i++;
        if (i < lines.length && lines[i].trim() === '') i++;
      } else {
        out.push(lines[i++]);
      }
    }
    return out.join(lineEnding);
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
