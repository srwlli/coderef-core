/**
 * Scanner Runtime — extracted from scanner.ts (P4)
 *
 * Shared runtime helpers used by the orchestrator: progress reporting,
 * cache entry persistence, language resolution, and per-call resolved
 * pattern building. P6 will lean on `buildResolvedPatternMap` to kill
 * scan-time mutation of LANGUAGE_PATTERNS.
 *
 * Workorder: WO-SCANNER-MODULE-EXTRACTION-001
 */

import { ElementData, ScanOptions } from '../types/types.js';
import type { ScanCacheEntry } from './lru-cache.js';
import {
  PatternConfig,
  LANGUAGE_PATTERNS,
  DEFAULT_SUPPORTED_LANGS,
} from './scanner-patterns.js';

export interface ProgressSnapshot {
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  elementsFound: number;
  percentComplete: number;
}

/**
 * Emit a progress event to the user-provided callback. Returns the next
 * filesProcessed counter so the orchestrator can stay stateless about it.
 */
export function reportProgress(params: {
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  elementsFound: number;
  onProgress?: (snapshot: ProgressSnapshot) => void;
}): number {
  const { currentFile, totalFiles, elementsFound, onProgress } = params;
  const filesProcessed = params.filesProcessed + 1;

  if (onProgress) {
    const percentComplete = totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0;
    onProgress({ currentFile, filesProcessed, totalFiles, elementsFound, percentComplete });
  }

  return filesProcessed;
}

/**
 * Persist a single file's scan result into the LRU scan cache.
 */
export function storeFileCacheEntry(
  scanCache: { set(key: string, value: ScanCacheEntry): void },
  file: string,
  entry: ScanCacheEntry
): void {
  scanCache.set(file, entry);
}

/**
 * Merge language arguments (positional + options.langs) and dedupe them.
 */
export function resolveScanLanguages(
  lang: string | string[],
  optionLangs: string[] = []
): string[] {
  const langs = Array.isArray(lang) ? lang : [lang];
  return [...new Set([...langs, ...optionLangs])];
}

/**
 * Build a per-call resolved pattern map. Combines built-in LANGUAGE_PATTERNS,
 * the shared registry state (read-only here), and the caller's customPatterns
 * into a fresh Record so the orchestrator can run a scan without mutating the
 * shared defaults. This is the foundation for the P6 no-global-mutation fix.
 *
 * For languages the caller hasn't registered patterns for, falls back to a
 * minimal generic set (function + class) so an unknown language still
 * produces some output — mirroring current behavior.
 */
export function buildResolvedPatternMap(
  allLangs: string[],
  customPatterns: ScanOptions['customPatterns'] = []
): Record<string, PatternConfig[]> {
  const resolved: Record<string, PatternConfig[]> = {};

  for (const lang of allLangs) {
    if (LANGUAGE_PATTERNS[lang]) {
      resolved[lang] = [...LANGUAGE_PATTERNS[lang]];
    } else if (!DEFAULT_SUPPORTED_LANGS.includes(lang)) {
      resolved[lang] = [
        { type: 'function', pattern: /function\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
        { type: 'class', pattern: /class\s+([a-zA-Z0-9_$]+)/g, nameGroup: 1 },
      ];
    } else {
      resolved[lang] = [];
    }
  }

  // Layer customPatterns on top without touching shared defaults.
  if (customPatterns) {
    for (const cp of customPatterns) {
      if (!resolved[cp.lang]) resolved[cp.lang] = [];
      resolved[cp.lang].push({
        type: cp.type,
        pattern: cp.pattern,
        nameGroup: cp.nameGroup,
      });
    }
  }

  return resolved;
}
