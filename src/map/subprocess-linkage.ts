/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-subprocess-test-linkage
 * @exports SubprocessTestContent, MapMetricsSubprocessLinkage, SubprocessExtractionResult, computeSubprocessLinkage, extractSubprocessTestContents
 * @used_by src/map/emit-map.ts, src/map/engineering-metrics.ts
 */

/**
 * Subprocess-aware test linkage v1 (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001
 * Phase 4). CLI tests exercise dist bins through child_process
 * (`execAsync(\`node dist/src/cli/populate.js ...\`)`), which the call/import
 * graph cannot see — those src files land in testLinkage.zeroTestInEdge as
 * covered-but-invisible. This module surfaces that coverage as DATA.
 *
 * IMPURITY BOUNDARY (git-history precedent — the ONE impure step lives at the
 * generateMap edge, never inside the pure projection): the IO extractor below
 * reads test-file contents once, returns a plain serializable record, and the
 * caller passes it into projectMapData via options.subprocessTestContents. The
 * pure core then feeds engineering-metrics' ADDITIVE `testLinkage.subprocess`
 * block. testLinkage.summary keys are UNTOUCHED — metrics-delta diffs that
 * summary generically and its concern scalar must keep meaning "direct resolved
 * graph edges only".
 *
 * ABSENCE = NO-DATA: extractor degraded (index absent/unreadable) or contents
 * not supplied => the block is ABSENT, never a fabricated zero. Contents
 * supplied but zero matches => block PRESENT with observed-zero counts.
 *
 * Test-likeness comes from the canonical isTestLikeFile predicate
 * (src/map/graph-analytics.ts) — never duplicate those regexes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeSlashes } from '../utils/path-normalize.js';
import { isTestLikeFile } from './graph-analytics.js';

/** One test-like file's content, project-relative slash-normalized path. */
export interface SubprocessTestContent {
  file: string;
  content: string;
}

export interface MapMetricsSubprocessLinkage {
  summary: {
    /** Test-like files whose contents were supplied to the scan. */
    testFilesScanned: number;
    /** Files with at least one dist-bin spawn literal that mapped to a src file. */
    testFilesWithSpawnRefs: number;
    /** Distinct src files linked through subprocess spawn literals. */
    linkedSrcFileCount: number;
    /** Total mapped spawn-literal occurrences across all test files. */
    spawnRefCount: number;
  };
  /**
   * src file -> subprocess-linkage facts, key-sorted; testFiles sorted.
   * Absence of a src file here = observed zero (given the scanned contents).
   */
  linked: Record<string, { testFileCount: number; refCount: number; testFiles: string[] }>;
  note: string;
}

const SUBPROCESS_NOTE =
  'Subprocess linkage is an OBSERVATION over spawn/exec string literals in test files that ' +
  'reference dist bins mapped back to src — coverage made visible, not a verdict. It does not ' +
  'change testLinkage.summary, which counts direct resolved graph edges only.';

/**
 * Prefilter: the file must show some child_process-ish call surface before its
 * dist literals count. The dist literal + src membership check is the real
 * signal; this only screens prose-only mentions.
 */
const SUBPROCESS_MARKER = /\bchild_process\b|\b(?:exec|spawn|fork)\w*\s*\(/;

/** dist bin literal: dist/src/... path ending .js|.mjs|.cjs, either slash direction. */
const DIST_TARGET_REGEX = /\bdist[\\/](src(?:[\\/][\w.\-]+)+\.(?:js|mjs|cjs))/g;

/**
 * path.join-style segmented shape: 'dist', 'src', 'cli', 'coderef-map.js'.
 * Requires the literal 'dist','src' prefix; trailing quoted segments are
 * reconstructed into a src-relative path (last segment must be a JS bin).
 */
const JOIN_SEGMENTS_REGEX = /['"]dist['"]\s*,\s*['"]src['"]((?:\s*,\s*['"][\w.\-]+['"])+)/g;

/** Reconstruct 'src/...' from a JOIN_SEGMENTS_REGEX tail; null unless it ends in a JS bin. */
function joinSegmentsToRel(tail: string): string | null {
  const segments = Array.from(tail.matchAll(/['"]([\w.\-]+)['"]/g), m => m[1]);
  if (segments.length === 0) return null;
  const rel = 'src/' + segments.join('/');
  return /\.(?:js|mjs|cjs)$/.test(rel) ? rel : null;
}

/** Map a dist-relative bin path (src/... with a JS extension) to a src file id present in srcSet. */
function mapDistToSrc(distRel: string, srcSet: Set<string>): string | null {
  const rel = normalizeSlashes(distRel);
  let candidates: string[];
  if (rel.endsWith('.mjs')) {
    const stem = rel.slice(0, -'.mjs'.length);
    candidates = [stem + '.mts', rel, stem + '.ts'];
  } else if (rel.endsWith('.cjs')) {
    const stem = rel.slice(0, -'.cjs'.length);
    candidates = [stem + '.cts', rel, stem + '.ts'];
  } else {
    const stem = rel.slice(0, -'.js'.length);
    candidates = [stem + '.ts', stem + '.tsx', rel];
  }
  for (const candidate of candidates) {
    if (srcSet.has(candidate)) return candidate;
  }
  return null;
}

/**
 * PURE core: given test-file contents (already isTestLikeFile-filtered by the
 * extractor) and the projection's src file ids, compute the subprocess block.
 * Deterministic: inputs sorted, Records key-sorted, no timestamps.
 */
export function computeSubprocessLinkage(
  testContents: SubprocessTestContent[],
  srcFileIds: Iterable<string>,
): MapMetricsSubprocessLinkage {
  const srcSet = new Set(Array.from(srcFileIds));
  const linkedAgg = new Map<string, { testFiles: Set<string>; refCount: number }>();
  let testFilesWithSpawnRefs = 0;
  let spawnRefCount = 0;

  const sorted = testContents
    .filter(tc => tc && typeof tc.file === 'string' && typeof tc.content === 'string')
    .slice()
    .sort((a, b) => (a.file < b.file ? -1 : 1));

  for (const { file, content } of sorted) {
    if (!SUBPROCESS_MARKER.test(content)) continue;
    const rels: string[] = [];
    for (const match of content.matchAll(DIST_TARGET_REGEX)) rels.push(match[1]);
    for (const match of content.matchAll(JOIN_SEGMENTS_REGEX)) {
      const rel = joinSegmentsToRel(match[1]);
      if (rel) rels.push(rel);
    }
    let fileHadRef = false;
    for (const rel of rels) {
      const mapped = mapDistToSrc(rel, srcSet);
      if (!mapped) continue;
      fileHadRef = true;
      spawnRefCount++;
      let agg = linkedAgg.get(mapped);
      if (!agg) {
        agg = { testFiles: new Set(), refCount: 0 };
        linkedAgg.set(mapped, agg);
      }
      agg.testFiles.add(normalizeSlashes(file));
      agg.refCount++;
    }
    if (fileHadRef) testFilesWithSpawnRefs++;
  }

  const linked: Record<string, { testFileCount: number; refCount: number; testFiles: string[] }> = {};
  for (const key of Array.from(linkedAgg.keys()).sort()) {
    const agg = linkedAgg.get(key)!;
    const testFiles = Array.from(agg.testFiles).sort();
    linked[key] = { testFileCount: testFiles.length, refCount: agg.refCount, testFiles };
  }

  return {
    summary: {
      testFilesScanned: sorted.length,
      testFilesWithSpawnRefs,
      linkedSrcFileCount: linkedAgg.size,
      spawnRefCount,
    },
    linked,
    note: SUBPROCESS_NOTE,
  };
}

export interface SubprocessExtractionResult {
  /** null = no data (reason set); [] = index readable but no test-like files. */
  contents: SubprocessTestContent[] | null;
  reason?: string;
}

/**
 * IMPURE extractor — the one read of test-file contents, invoked by generateMap
 * (never by the pure projection). Derives the test-like file list from
 * `.coderef/index.json` via the canonical isTestLikeFile predicate and reads
 * each file relative to projectRoot. Every degraded path returns
 * { contents: null, reason } instead of throwing (any-repo rule); files listed
 * in the index but unreadable on disk are skipped silently (deleted since scan).
 */
export function extractSubprocessTestContents(projectRoot: string): SubprocessExtractionResult {
  const indexPath = path.join(projectRoot, '.coderef', 'index.json');
  if (!fs.existsSync(indexPath)) {
    return { contents: null, reason: 'index.json absent; subprocess linkage has no test-file list' };
  }
  let elements: any[];
  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    elements = Array.isArray(index.elements) ? index.elements : [];
  } catch (err: any) {
    return { contents: null, reason: `index.json unreadable (${err.message}); subprocess linkage skipped` };
  }

  const testFiles = new Set<string>();
  for (const el of elements) {
    if (!el || !el.file) continue;
    const file = normalizeSlashes(String(el.file));
    if (isTestLikeFile(file)) testFiles.add(file);
  }

  const contents: SubprocessTestContent[] = [];
  for (const file of Array.from(testFiles).sort()) {
    try {
      contents.push({ file, content: fs.readFileSync(path.join(projectRoot, file), 'utf-8') });
    } catch {
      // Listed in the index but not readable now — skip, never fabricate.
    }
  }
  return { contents };
}
