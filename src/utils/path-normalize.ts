/**
 * @coderef-semantic: 1.0.0
 * @layer utility
 * @capability path-slash-normalization
 * @exports normalizeSlashes
 * @used_by src/utils/coderef-id.ts, src/registry/entity-registry.ts, src/scanner/scanner.ts, src/pipeline/ignore-rules.ts, src/cli/coderef-mcp-server.ts
 */

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
