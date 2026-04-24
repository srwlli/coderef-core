/**
 * Scanner File Runner — extracted from scanner.ts (P3)
 *
 * Single entry point scanSingleFile() that covers every per-file execution
 * path the orchestrator previously inlined:
 *
 *   cache hit -> tree-sitter (+ optional fallback) -> AST (+ optional fallback)
 *   -> regex -> error
 *
 * Returns a structured result the orchestrator can consume uniformly. No
 * reporting or global cache writes happen here — the orchestrator owns
 * progress + SCAN_CACHE bookkeeping. This preserves behavior while making
 * the control flow linear.
 *
 * Workorder: WO-SCANNER-MODULE-EXTRACTION-001
 */

import * as fs from 'fs';
import * as path from 'path';
import { ElementData, ScanOptions } from '../types/types.js';
import type { ScanCacheEntry } from './lru-cache.js';
import { PatternConfig, sortPatternsByPriority } from './scanner-patterns.js';
import { isEntirelyCommented } from './scanner-comments.js';

/**
 * Status of a single-file scan. The orchestrator uses this to decide
 * whether to emit progress, update caches, or fall through to another mode.
 */
export type FileRunStatus =
  | 'cache_hit'
  | 'tree_sitter_final'
  | 'tree_sitter_no_fallback_skip'
  | 'ast_final'
  | 'ast_no_fallback_skip'
  | 'regex'
  | 'no_patterns_skip'
  | 'entirely_commented_skip'
  | 'error';

export interface FileRunResult {
  currentFile: string;
  status: FileRunStatus;
  /** Elements detected in THIS file (already cache-sliced / runner-scoped). */
  elements: ElementData[];
  /** When present, caller should store this under SCAN_CACHE[file]. */
  cacheEntry?: ScanCacheEntry;
  /** Populated on status === 'error'. */
  error?: unknown;
}

export interface FileRunnerContext {
  /** Absolute root dir of the scan — needed for ASTElementScanner. */
  dir: string;
  /** SCAN_CACHE instance from the orchestrator. */
  scanCache: {
    get(key: string): ScanCacheEntry | undefined;
    set(key: string, value: ScanCacheEntry): void;
  };
  /** Scanner instance factory for the regex path. Fresh instance per file. */
  makeScanner: () => {
    addElement(el: ElementData): void;
    processFile(file: string, content: string, patterns: PatternConfig[], includeComments: boolean): void;
    getElements(): ElementData[];
  };
  verbose: boolean;
  includeComments: boolean;
  /**
   * Per-call resolved pattern map. P6: orchestrator builds this once via
   * buildResolvedPatternMap() so no scan mutates shared defaults.
   */
  resolvedPatterns: Record<string, PatternConfig[]>;
}

/**
 * Scan a single file end-to-end and return a structured result. Never throws;
 * errors are reported as status: 'error'.
 */
export async function scanSingleFile(
  file: string,
  options: ScanOptions,
  ctx: FileRunnerContext
): Promise<FileRunResult> {
  try {
    // ── Cache hit ───────────────────────────────────────────────────────────
    const stats = fs.statSync(file);
    const currentMtime = stats.mtimeMs;
    const cached = ctx.scanCache.get(file);

    if (cached && cached.mtime === currentMtime) {
      if (ctx.verbose) console.log(`Using cached results for: ${file}`);
      return {
        currentFile: file,
        status: 'cache_hit',
        elements: cached.elements,
      };
    }

    if (ctx.verbose) {
      console.log(cached ? `Cache miss (file modified): ${file}` : `Cache miss (new file): ${file}`);
    }

    const content = fs.readFileSync(file, 'utf-8');
    let currentLang = path.extname(file).substring(1);
    // Remap extensions to their canonical language key — discovery already
    // does this for gating, the runner does it for pattern lookup.
    if (currentLang === 'tsx') currentLang = 'ts';
    else if (currentLang === 'jsx') currentLang = 'js';

    const fallbackEnabled = options.fallbackToRegex !== false;
    const scanner = ctx.makeScanner();

    // ── Tree-sitter ─────────────────────────────────────────────────────────
    if (options.useTreeSitter) {
      try {
        if (ctx.verbose) console.log(`Using tree-sitter mode for: ${file}`);
        const { TreeSitterScanner } = await import('./tree-sitter-scanner.js');
        const treeSitterScanner = new TreeSitterScanner();
        const treeSitterElements = await treeSitterScanner.scanFile(file);

        for (const el of treeSitterElements) scanner.addElement(el);

        if (ctx.verbose) {
          console.log(`Tree-sitter mode detected ${treeSitterElements.length} elements in: ${file}`);
        }

        if (!fallbackEnabled) {
          const elements = scanner.getElements();
          return {
            currentFile: file,
            status: 'tree_sitter_final',
            elements,
            cacheEntry: { mtime: currentMtime, elements },
          };
        }
      } catch (err) {
        if (ctx.verbose) {
          console.warn(`Tree-sitter parsing failed for ${file}, falling back to regex:`, err);
        }
        if (!fallbackEnabled) {
          if (ctx.verbose) {
            console.error(`Skipping file ${file} - tree-sitter failed and fallback disabled`);
          }
          return {
            currentFile: file,
            status: 'tree_sitter_no_fallback_skip',
            elements: [],
          };
        }
      }
    }

    // ── AST (TS / JS) ───────────────────────────────────────────────────────
    const useASTMode = options.useAST && (currentLang === 'ts' || currentLang === 'js');

    if (useASTMode) {
      try {
        if (ctx.verbose) console.log(`Using AST mode for: ${file}`);
        let astElements: any[];

        if (currentLang === 'ts') {
          const { ASTElementScanner } = await import('../analyzer/ast-element-scanner.js');
          const astScanner = new ASTElementScanner(ctx.dir);
          astElements = astScanner.scanFile(file);
        } else {
          const { JSCallDetector } = await import('../analyzer/js-call-detector.js');
          const detector = new JSCallDetector();
          astElements = detector.detectElements(file);
        }

        const { JSCallDetector } = await import('../analyzer/js-call-detector.js');
        const detector = new JSCallDetector();
        const fileImports = detector.detectImports(file);
        const fileCalls = detector.detectCalls(file);

        for (const element of astElements) {
          const elementCalls = fileCalls
            .filter(c => c.callerFunction === element.name || c.callerClass === element.name)
            .map(c => c.calleeFunction);

          scanner.addElement({
            type: element.type as ElementData['type'],
            name: element.name,
            file: element.file,
            line: element.line,
            exported: element.exported,
            imports:
              fileImports.length > 0
                ? fileImports.map(imp => ({
                    source: imp.source,
                    specifiers: imp.specifiers.filter(s => s !== 'default'),
                    default: imp.isDefault ? imp.specifiers[0] : undefined,
                    dynamic: imp.dynamic || false,
                    line: imp.line,
                  }))
                : undefined,
            calls: elementCalls.length > 0 ? elementCalls : undefined,
          });
        }

        if (ctx.verbose) {
          console.log(
            `AST mode detected ${astElements.length} elements, ${fileImports.length} imports, and ${fileCalls.length} calls in: ${file}`
          );
        }

        if (!fallbackEnabled) {
          const elements = scanner.getElements();
          return {
            currentFile: file,
            status: 'ast_final',
            elements,
            cacheEntry: { mtime: currentMtime, elements },
          };
        }
      } catch (err) {
        if (ctx.verbose) {
          console.warn(`AST parsing failed for ${file}, falling back to regex:`, err);
        }
        if (!fallbackEnabled) {
          if (ctx.verbose) {
            console.error(`Skipping file ${file} - AST failed and fallback disabled`);
          }
          return {
            currentFile: file,
            status: 'ast_no_fallback_skip',
            elements: [],
          };
        }
      }
    }

    // ── Regex (default / fallback) ──────────────────────────────────────────
    const patterns = sortPatternsByPriority(ctx.resolvedPatterns[currentLang] || []);

    if (patterns.length === 0) {
      if (ctx.verbose) console.log(`No patterns found for language: ${currentLang}`);
      return {
        currentFile: file,
        status: 'no_patterns_skip',
        elements: scanner.getElements(),
      };
    }

    if (!ctx.includeComments && isEntirelyCommented(content)) {
      if (ctx.verbose) console.log(`Skipping entirely commented file: ${file}`);
      return {
        currentFile: file,
        status: 'entirely_commented_skip',
        elements: scanner.getElements(),
      };
    }

    scanner.processFile(file, content, patterns, ctx.includeComments);

    const elements = scanner.getElements();
    if (ctx.verbose) console.log(`Cached ${elements.length} elements for: ${file}`);

    return {
      currentFile: file,
      status: 'regex',
      elements,
      cacheEntry: { mtime: currentMtime, elements },
    };
  } catch (error) {
    if (ctx.verbose) console.error(`Error processing file ${file}:`, error);
    return {
      currentFile: file,
      status: 'error',
      elements: [],
      error,
    };
  }
}
