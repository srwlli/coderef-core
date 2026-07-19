/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability pipeline-symbol-table-cache
 * @exports FACT_SET_FILENAME, FileFactBundle, IncrementalFactSet, buildFactSet, serializeFactSet, deserializeFactSet, factSetPath, writeFactSet, readFactSet, mergeChangedFacts
 */

/**
 * symbol-table-cache — persisted full-project fact set for graph-safe
 * incremental populate (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P5, ADJ-03).
 *
 * The corruption trap (P5-T1 READ): the orchestrator's existing `incremental`
 * path filters the file set to changed-only and never merges the unchanged
 * files' facts back before resolveImports/resolveCalls/constructGraph run. So a
 * changed file that calls or imports a symbol defined in an UNCHANGED file can
 * no longer resolve it — cross-file resolution silently breaks.
 *
 * The graph-safe fix (ADJ-03, operator-ruled): after a FULL build, persist the
 * complete resolve-INPUTS per file (the exact processFile() output). On an
 * incremental pass, re-scan ONLY the changed files, SWAP their fact bundles into
 * the cached full set, then run the SAME pure resolveImports/resolveCalls/
 * constructGraph over the MERGED full universe. Parity is structural: identical
 * inputs → identical pure-function output → a resolved-edge set byte-identical
 * to a full rebuild. Only the slow scan step is skipped; correctness is not
 * traded for speed.
 *
 * This module owns ONLY the persisted fact-set (serialize / load / merge). It
 * does NOT touch src/cache/incremental-cache.ts (file-hash change detection) —
 * that is a separate concern with its own in-flight WO (RISK-05).
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ElementData,
} from '../types/types.js';
import type {
  ImportRelationship,
  CallRelationship,
  HeritageRelationship,
  RawImportFact,
  RawCallFact,
  RawExportFact,
  HeaderFact,
  HeaderImportFact,
} from './types.js';

/** Canonical on-disk filename under .coderef/. */
export const FACT_SET_FILENAME = 'incremental-facts.json';
/** Bump when the persisted shape changes so stale caches are ignored, not misread. */
const FACT_SET_VERSION = 2; // v2: FileFactBundle.heritage (WO-...-GENRE-FEATURES-PROGRAM-001 P5)

/**
 * The complete per-file output of PipelineOrchestrator.processFile() — every
 * fact resolveImports/resolveCalls/constructGraph consume for this file. All
 * fields are plain data (extractor outputs), so the bundle is JSON-round-trip
 * safe with no custom (de)serialization.
 */
export interface FileFactBundle {
  language: string;
  elements: ElementData[];
  imports: ImportRelationship[];
  calls: CallRelationship[];
  /**
   * Class/interface heritage facts (WO-...-GENRE-FEATURES-PROGRAM-001 P5). Optional so
   * a bundle read from an older cache (pre-v2, no heritage) still deserializes; a missing
   * field is treated as "no heritage extracted" (absence=no-data), and the FACT_SET_VERSION
   * bump means such a cache is ignored on load rather than misread anyway.
   */
  heritage?: HeritageRelationship[];
  rawImports: RawImportFact[];
  rawCalls: RawCallFact[];
  rawExports: RawExportFact[];
  headerFact: HeaderFact;
  headerImportFacts: HeaderImportFact[];
  content: string;
}

/**
 * The persisted full-project fact set. `order` preserves the file-iteration
 * order of the originating full build so a reassembled state concatenates facts
 * in the identical order (belt-and-suspenders for byte-identity; constructGraph
 * dedupes edges by id, so the resolved-edge SET is order-independent regardless).
 */
export interface IncrementalFactSet {
  version: number;
  projectPath: string;
  /** Deterministic file order from the originating full build. */
  order: string[];
  /** file path -> its complete fact bundle. */
  byFile: Record<string, FileFactBundle>;
}

/**
 * Build an IncrementalFactSet from a completed full-build's per-file bundles.
 * `order` MUST be the exact order the orchestrator processed the files.
 */
export function buildFactSet(
  projectPath: string,
  order: string[],
  byFile: Map<string, FileFactBundle>,
): IncrementalFactSet {
  const obj: Record<string, FileFactBundle> = {};
  for (const [file, bundle] of byFile) obj[file] = bundle;
  return { version: FACT_SET_VERSION, projectPath, order: [...order], byFile: obj };
}

export function serializeFactSet(set: IncrementalFactSet): string {
  return JSON.stringify(set);
}

export function deserializeFactSet(text: string): IncrementalFactSet | null {
  try {
    const parsed = JSON.parse(text) as IncrementalFactSet;
    if (!parsed || parsed.version !== FACT_SET_VERSION || !parsed.byFile || !parsed.order) {
      return null; // absent / stale-schema / malformed → caller falls back to a full build
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Absolute path to the fact-set file for a project. */
export function factSetPath(projectDir: string): string {
  return path.join(projectDir, '.coderef', FACT_SET_FILENAME);
}

export function writeFactSet(projectDir: string, set: IncrementalFactSet): void {
  const p = factSetPath(projectDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // temp+rename for atomicity (a torn write must never poison the next delta).
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, serializeFactSet(set), 'utf8');
  fs.renameSync(tmp, p);
}

/** Load the persisted fact set, or null when absent/stale/unreadable. */
export function readFactSet(projectDir: string): IncrementalFactSet | null {
  try {
    return deserializeFactSet(fs.readFileSync(factSetPath(projectDir), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Produce a NEW fact set with the changed files' bundles swapped in and deleted
 * files removed — the merge at the heart of the graph-safe delta. Unchanged
 * files keep their cached bundles verbatim (that is what preserves cross-file
 * resolution). Never mutates the input set.
 *
 * - `rescanned`: file -> freshly-scanned bundle (added or modified files).
 * - `deleted`: files removed since the cached build (dropped from the set).
 */
export function mergeChangedFacts(
  base: IncrementalFactSet,
  rescanned: Map<string, FileFactBundle>,
  deleted: Iterable<string> = [],
): IncrementalFactSet {
  const byFile: Record<string, FileFactBundle> = { ...base.byFile };
  const deletedSet = new Set(deleted);
  for (const d of deletedSet) delete byFile[d];
  for (const [file, bundle] of rescanned) byFile[file] = bundle;

  // Preserve original order; append any brand-new files (not previously seen)
  // deterministically (sorted) after the known order, and drop deleted files.
  const known = new Set(base.order);
  const order = base.order.filter(f => !deletedSet.has(f));
  const fresh: string[] = [];
  for (const file of rescanned.keys()) {
    if (!known.has(file) && !deletedSet.has(file)) fresh.push(file);
  }
  fresh.sort();
  order.push(...fresh);

  return { version: FACT_SET_VERSION, projectPath: base.projectPath, order, byFile };
}
