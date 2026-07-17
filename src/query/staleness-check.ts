/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability staleness-check
 * @exports StalenessResult, checkStaleness
 */

/**
 * staleness-check — the query-time freshness checker for the scan-time hash
 * manifest (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 8, staleness-contract).
 *
 * This is the impure half of the contract: it reads `.coderef/manifest.json` (the
 * per-file sha256 snapshot GraphGenerator wrote at build time) and the current
 * on-disk source files, and reports which/how-many source files have changed since
 * the graph was built. The MCP server attaches the result to every read response so
 * an agent never acts confidently on a graph that predates its own last edit.
 *
 * BASIS = HASH, mtime/size = FAST-PATH (lifted from IncrementalCache.checkFiles).
 * For each file in the manifest: stat it; if its size matches AND its mtime is not
 * newer than graph.json, it is assumed fresh WITHOUT re-hashing (the steady-state
 * "nothing changed" case hashes ZERO files). Only files whose size differs or whose
 * mtime is newer than the graph are re-hashed and compared to the manifest — so a
 * file that was merely touched (mtime bumped) but is byte-identical is correctly
 * NOT stale, the exact false-positive the Phase-7 mtime heuristic gets wrong.
 *
 * GRACEFUL DEGRADATION. A pre-Phase-8 `.coderef/` has no manifest.json. Rather than
 * throw, the checker falls back to the coarse newest-source-mtime-vs-graph.json
 * signal and labels the result `basis: 'manifest-absent'` so the caller knows it is
 * the cheap heuristic, not the authoritative hash check. Any unexpected I/O error
 * likewise degrades to a non-stale `basis: 'error'` result — a freshness checker
 * must never break a read tool.
 *
 * SURFACES, NOT VERDICTS. `stale` means "at least one source file differs from the
 * manifest snapshot" — a freshness fact. `stale_count: 0` means "no source file
 * differs", NOT "the graph is correct".
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  diffManifest,
  type StalenessManifest,
  STALENESS_MANIFEST_VERSION,
} from '../pipeline/staleness-manifest.js';

/** The freshness verdict attached to MCP responses. */
export interface StalenessResult {
  /** True iff at least one source file differs from the manifest snapshot. */
  stale: boolean;
  /** Number of source files whose current content differs from the manifest. */
  stale_count: number;
  /** Up to `sampleCap` stale file paths (project-relative), deterministically sorted. */
  stale_files_sample: string[];
  /**
   * How the verdict was derived:
   *  - 'scan-time-hash-manifest' — authoritative: current content re-hashed against the manifest.
   *  - 'manifest-absent'         — degraded: newest-source-mtime vs graph.json (no manifest on disk).
   *  - 'error'                   — a freshness check error; treated as not-stale, never throws.
   */
  basis: 'scan-time-hash-manifest' | 'manifest-absent' | 'error';
  /** Agent-facing next step when stale (names the reindex escape hatch). */
  hint?: string;
  /** One-line human note describing the basis / degradation. */
  note?: string;
}

/** Extensions counted as source files — mirrors coderef-mcp-server's SOURCE_EXT_RE. */
const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|cpp|cc|h|hpp)$/;
/** Directories skipped by the fallback walk — mirrors coderef-mcp-server's scanSources. */
const SKIP_DIRS = new Set(['.coderef', 'node_modules', '.git', 'dist', '.vscode', 'coverage']);
/** Default number of stale paths surfaced in the sample. */
const DEFAULT_SAMPLE_CAP = 25;

export interface CheckStalenessOptions {
  /** Max stale paths in `stale_files_sample` (default 25; <=0 means all). */
  sampleCap?: number;
  /** Reindex hint string; default names the MCP `reindex` tool. */
  hint?: string;
}

/** The not-stale result used for the "no manifest, nothing newer" and error paths. */
function fresh(basis: StalenessResult['basis'], note: string): StalenessResult {
  return { stale: false, stale_count: 0, stale_files_sample: [], basis, note };
}

/**
 * Compute the freshness of the graph at `projectDir` against its scan-time manifest.
 * Never throws — every failure path degrades to a labelled non-stale result.
 */
export function checkStaleness(projectDir: string, opts: CheckStalenessOptions = {}): StalenessResult {
  const sampleCap = opts.sampleCap ?? DEFAULT_SAMPLE_CAP;
  const hint =
    opts.hint ??
    'Source files changed since the graph was built — run the `reindex` tool (or `reindex --incremental` on the CLI) to refresh .coderef/.';
  const coderefDir = path.join(projectDir, '.coderef');
  const manifestPath = path.join(coderefDir, 'manifest.json');
  const graphPath = path.join(coderefDir, 'graph.json');

  // --- degraded path: no manifest on disk (pre-Phase-8 index) --------------------
  if (!fs.existsSync(manifestPath)) {
    return mtimeFallback(projectDir, graphPath);
  }

  let manifest: StalenessManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as StalenessManifest;
  } catch (e) {
    return fresh('error', `manifest.json unreadable — freshness unknown; treated as not-stale (${e instanceof Error ? e.message : String(e)})`);
  }
  if (!manifest || manifest.version !== STALENESS_MANIFEST_VERSION || !manifest.files) {
    // Unknown manifest shape/version — do not guess; fall back to the mtime signal.
    return mtimeFallback(projectDir, graphPath);
  }

  let graphMtimeMs = 0;
  try {
    graphMtimeMs = fs.statSync(graphPath).mtimeMs;
  } catch {
    // graph.json missing but manifest present — unusual; treat as not-stale.
    return fresh('error', 'graph.json missing — freshness baseline unavailable; treated as not-stale');
  }

  // --- authoritative path: mtime/size fast-path, then hash-confirm suspects ------
  // Build a currentHashes map the pure diffManifest consumes. The fast-path fills a
  // file's slot with its MANIFEST hash (i.e. "assumed fresh, no re-hash") when size
  // matches AND mtime is not newer than the graph; otherwise it re-hashes on disk.
  const currentHashes: Record<string, string | undefined> = {};
  for (const [rel, entry] of Object.entries(manifest.files)) {
    const abs = path.join(projectDir, rel);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(abs);
    } catch {
      currentHashes[rel] = undefined; // deleted/unreadable -> counted as missing by diff
      continue;
    }
    if (stat.size === entry.size && stat.mtimeMs <= graphMtimeMs) {
      // FAST-PATH: unchanged size + not-newer mtime -> assume fresh, do NOT hash.
      currentHashes[rel] = entry.sha256;
      continue;
    }
    // Suspect: size differs or mtime is newer -> re-hash and let the diff decide.
    try {
      currentHashes[rel] = createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    } catch {
      currentHashes[rel] = undefined;
    }
  }

  const diff = diffManifest(manifest, currentHashes);
  const cap = sampleCap > 0 ? sampleCap : diff.staleFiles.length;
  const stale = diff.staleCount > 0;
  return {
    stale,
    stale_count: diff.staleCount,
    stale_files_sample: diff.staleFiles.slice(0, cap),
    basis: 'scan-time-hash-manifest',
    ...(stale ? { hint } : {}),
    note: stale
      ? `${diff.staleCount} source file(s) differ from the scan-time manifest — the graph may predate a recent edit.`
      : 'no source file differs from the scan-time manifest.',
  };
}

/**
 * Degraded freshness signal when no manifest exists: the coarse
 * newest-source-mtime-vs-graph.json heuristic (the same signal ensureArtifacts uses
 * and Phase 7 labelled non-authoritative). Labelled `basis: 'manifest-absent'` so
 * the caller knows to treat it as a hint, not a hash-authoritative answer. This
 * reports a boolean "something is newer" — it cannot name files, so the sample is
 * empty by construction.
 */
function mtimeFallback(projectDir: string, graphPath: string): StalenessResult {
  let graphMtimeMs: number;
  try {
    graphMtimeMs = fs.statSync(graphPath).mtimeMs;
  } catch {
    return fresh('manifest-absent', 'no manifest and no graph.json — freshness unknown; treated as not-stale');
  }
  const newest = newestSourceMtime(projectDir);
  const stale = newest > graphMtimeMs;
  return {
    stale,
    stale_count: stale ? 1 : 0, // coarse: "something is newer" — cannot count files by mtime alone
    stale_files_sample: [],
    basis: 'manifest-absent',
    ...(stale
      ? { hint: 'A source file is newer than graph.json (mtime heuristic — no hash manifest present). Run `reindex` to write a manifest and get an authoritative answer.' }
      : {}),
    note: stale
      ? 'a source file is newer than graph.json (mtime heuristic; no hash manifest — reindex for authoritative freshness).'
      : 'no source file is newer than graph.json (mtime heuristic; no hash manifest present).',
  };
}

/** Newest source-file mtime under projectDir, bounded walk — mirrors scanSources. */
function newestSourceMtime(projectDir: string): number {
  let newest = 0;
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(path.join(dir, e.name));
      } else if (e.isFile() && SOURCE_EXT_RE.test(e.name)) {
        try {
          const m = fs.statSync(path.join(dir, e.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch {
          // ignore unreadable file
        }
      }
    }
  };
  walk(projectDir);
  return newest;
}
