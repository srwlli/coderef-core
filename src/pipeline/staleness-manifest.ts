/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability staleness-manifest
 * @exports StalenessManifestEntry, StalenessManifest, ManifestDiff, STALENESS_MANIFEST_VERSION, buildManifest, diffManifest
 */

/**
 * staleness-manifest — the PURE scan-time file-hash manifest builder + comparator
 * (Cursor-Merkle-freshness pattern, WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001
 * Phase 8, the staleness-contract).
 *
 * THE PROBLEM. The worst failure mode of a precomputed index is confident action
 * on STALE structure: an agent reads a card, edits the file, re-queries, and the
 * graph still reflects the pre-edit structure with no staleness signal. Phase 7
 * shipped a per-symbol MTIME heuristic and explicitly deferred the AUTHORITATIVE
 * freshness contract here. This module is the authoritative half.
 *
 * A JOIN / PROJECTION, NOT NEW ANALYSIS. A per-file sha256 already exists as
 * IncrementalCache's `.coderef/incremental-cache.json` (contentHash/mtimeMs/size),
 * but that manifest is written ONLY under `scan --incremental` — not guaranteed at
 * query time. Phase 8 writes a leaner sibling `.coderef/manifest.json` ALWAYS, at
 * the instant graph.json is written, so the manifest and the graph share a build
 * instant. The mtime/size-fast-path-then-hash-confirm algorithm is lifted from
 * IncrementalCache.checkFiles — see the query-time checker (staleness-check.ts).
 *
 * PURE + DETERMINISTIC. This module does NO I/O and touches NO clock: `buildManifest`
 * takes the file list + an injected `hashOf` + an injected `builtAt` stamp;
 * `diffManifest` takes ALREADY-COMPUTED current hashes. That keeps both functions
 * free of `Date.now`/`Math.random`, so identical inputs yield a byte-identical
 * manifest and a deterministic diff — the caller (GraphGenerator / the query-time
 * checker) owns the I/O and the clock.
 *
 * BASIS = HASH, mtime/size = FAST-PATH. Authority is by content hash: a file that
 * is touched (mtime bumped) but byte-identical — or restored to identical content
 * via a checkout — is NOT stale. That is precisely the false-positive the Phase-7
 * mtime heuristic gets wrong and this basis fixes. The mtime/size fast-path (skip
 * hashing when both match the manifest) is an OPTIMIZATION that lives in the impure
 * query-time checker, not in this pure diff.
 *
 * SURFACES, NOT VERDICTS. A "stale" file is one whose current content differs from
 * the manifest snapshot — a freshness/provenance fact, never a correctness verdict.
 * An empty stale set means "no source file differs from the manifest", NOT "the
 * graph is correct".
 */

/** Bump when the manifest on-disk shape changes (consumers version-gate on it). */
export const STALENESS_MANIFEST_VERSION = 1 as const;

/** One manifest entry: the content fingerprint of a single source file at build time. */
export interface StalenessManifestEntry {
  /** SHA-256 of the file content at build time (lowercase hex). */
  sha256: string;
  /** File size in bytes at build time — the fast-path's cheap first check. */
  size: number;
}

/**
 * The scan-time file-hash manifest, written alongside graph.json. `files` is keyed
 * by project-relative POSIX path so it is stable across platforms and repo moves.
 */
export interface StalenessManifest {
  version: typeof STALENESS_MANIFEST_VERSION;
  /** ISO build instant — injected by the caller (never `Date.now` here). */
  builtAt: string;
  /** relPath -> content fingerprint. Deterministic key order (sorted). */
  files: Record<string, StalenessManifestEntry>;
}

/**
 * The result of comparing a manifest against the current on-disk hashes. `checked`
 * is the number of manifest files that had a current hash to compare (the rest are
 * unreadable/deleted and counted separately). `staleFiles` is sorted.
 */
export interface ManifestDiff {
  /** Project-relative paths whose current content differs from the manifest. Sorted. */
  staleFiles: string[];
  /** `staleFiles.length` — the count every MCP response surfaces. */
  staleCount: number;
  /** Manifest files that were present in `currentHashes` and got compared. */
  checked: number;
  /** Manifest files with NO current hash (deleted/unreadable since build). Sorted. */
  missingFiles: string[];
}

/** One source file fed to the builder: its project-relative path (POSIX-normalized by the caller). */
export interface ManifestSourceFile {
  /** Project-relative POSIX path (the manifest key). */
  path: string;
  /** File size in bytes at build time. */
  size: number;
}

/**
 * Build a StalenessManifest from the source files that fed the graph. PURE: no I/O,
 * no clock — `hashOf(path)` and `builtAt` are injected by the caller.
 *
 * - Duplicate paths collapse to a single entry (last write wins after the sort, but
 *   inputs are deduped first so the choice is deterministic regardless of order).
 * - `files` is emitted in sorted key order so the serialized manifest is
 *   byte-identical for identical inputs.
 * - A file whose `hashOf` returns `undefined` (unreadable at build time) is skipped
 *   with no entry — absence in the manifest ⇒ the checker treats it as no-data, not
 *   stale.
 */
export function buildManifest(
  files: readonly ManifestSourceFile[],
  hashOf: (path: string) => string | undefined,
  builtAt: string,
): StalenessManifest {
  // Dedup by path (deterministic: first occurrence wins) then sort for stable output.
  const seen = new Map<string, ManifestSourceFile>();
  for (const f of files) {
    if (!seen.has(f.path)) seen.set(f.path, f);
  }
  const sortedPaths = [...seen.keys()].sort();

  const out: Record<string, StalenessManifestEntry> = {};
  for (const path of sortedPaths) {
    const sha256 = hashOf(path);
    if (sha256 === undefined) continue; // unreadable at build time -> no entry (no-data)
    out[path] = { sha256, size: seen.get(path)!.size };
  }

  return { version: STALENESS_MANIFEST_VERSION, builtAt, files: out };
}

/**
 * Compare a manifest against the CURRENT content hashes of its files. PURE +
 * deterministic — the caller computes `currentHashes` (mtime/size fast-path +
 * selective re-hash live in the impure checker); this function only diffs.
 *
 * A manifest file is:
 *   - STALE      when it has a current hash that differs from the manifest hash.
 *   - MISSING    when it has NO current hash (deleted/unreadable since build).
 *   - fresh      when its current hash equals the manifest hash.
 *
 * Both output lists are sorted for byte-stable results. Never throws on shape drift.
 */
export function diffManifest(
  manifest: StalenessManifest,
  currentHashes: Readonly<Record<string, string | undefined>>,
): ManifestDiff {
  const staleFiles: string[] = [];
  const missingFiles: string[] = [];
  let checked = 0;

  for (const [path, entry] of Object.entries(manifest.files)) {
    const current = currentHashes[path];
    if (current === undefined) {
      missingFiles.push(path);
      continue;
    }
    checked++;
    if (current !== entry.sha256) staleFiles.push(path);
  }

  staleFiles.sort();
  missingFiles.sort();
  return { staleFiles, staleCount: staleFiles.length, checked, missingFiles };
}
