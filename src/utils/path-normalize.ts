/**
 * @coderef-semantic: 1.0.0
 * @layer utility
 * @capability path-slash-normalization
 * @exports normalizeSlashes, toRepoRelativePosix
 * @used_by src/utils/coderef-id.ts, src/registry/entity-registry.ts, src/scanner/scanner.ts, src/pipeline/ignore-rules.ts, src/cli/coderef-mcp-server.ts, src/query/scip-resolution-delta.ts, src/pipeline/scip-overlay.ts
 */

import * as path from 'path';

/**
 * THE slash normalizer (WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2,
 * P1-12). Replaces the 55+ hand-rolled `.replace(/\\/g, '/')` sites so
 * Windows and posix spellings of the same path converge on ONE canonical
 * (forward-slash) form everywhere — identity keys, ignore matching, display.
 *
 * Deliberately does NOT resolve, relativize, or lower-case: callers that
 * need project-relative identity go through normalizeProjectPath
 * (src/utils/coderef-id.ts), which builds on this.
 */
export function normalizeSlashes(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * THE SCIP path-coordinate normalizer (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001
 * Phase 2, blocker B-3). Maps any of the path forms that co-locate a graph edge
 * with a SCIP occurrence onto ONE canonical repo-relative forward-slash key:
 *
 *   - graph `sourceLocation.file`:   ABSOLUTE (`C:\...\src\pipeline\x.ts` on
 *                                    Windows, `/home/.../src/pipeline/x.ts` on posix)
 *   - SCIP `document.relativePath`:  repo-RELATIVE with the indexer's native
 *                                    separator (`src\pipeline\x.ts` on Windows,
 *                                    `src/pipeline/x.ts` on posix)
 *
 * Both must collapse to `src/pipeline/x.ts` so the (file, line) co-location key
 * matches. `normalizeSlashes` alone did NOT — it flips separators but never
 * relativizes an absolute path, so an absolute graph edge and a relative SCIP
 * occurrence for the SAME source line produced different keys and never matched
 * (the scope-A caveat + the P2 delta_ratio>1 artifact).
 *
 * Algorithm (deterministic, PURE — no fs):
 *   1. If `file` is absolute AND under `projectPath`, relativize against it.
 *      (path.relative uses the host separator; step 2 canonicalizes.)
 *   2. Flip all separators to forward slash.
 *   3. Strip a leading `./`.
 * A path already relative (SCIP's form) skips step 1 and just gets slash-flipped
 * + `./`-stripped. An absolute path OUTSIDE projectPath is left slash-flipped but
 * not relativized (it cannot be a repo-relative key; it simply won't match, which
 * is correct — it is not an in-repo occurrence).
 *
 * @param file the path to canonicalize (absolute or relative, either separator).
 * @param projectPath the absolute repo root; absolute `file` under it is
 *   relativized against it. When omitted, only slash-flip + `./`-strip apply
 *   (back-compat with callers that already pass repo-relative paths).
 */
export function toRepoRelativePosix(file: string, projectPath?: string): string {
  let out = file;
  if (projectPath && path.isAbsolute(file)) {
    const rel = path.relative(projectPath, file);
    // path.relative returns '' for the root itself and a '..'-prefixed path when
    // `file` is OUTSIDE projectPath. Only adopt the relativized form when it
    // stays inside the repo (no leading '..'); otherwise keep the original so an
    // out-of-repo absolute path is not silently mangled into a bogus key.
    if (rel !== '' && !rel.startsWith('..')) {
      out = rel;
    }
  }
  return normalizeSlashes(out).replace(/^\.\//, '');
}
