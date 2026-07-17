/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability rename-planner
 * @exports RenameSite, RenamePlan, planRename
 */

/**
 * rename-planner — resolve a symbol to its declaration + reference SITES over
 * the canonical `.coderef/graph.json`, producing a flat, span-grained
 * RenamePlan for the applier to execute.
 *
 * Read-only: this module never touches the filesystem beyond loading the
 * canonical graph. It answers "where is <oldName> declared and referenced?"
 * using the graph's resolved call+import reference sites (per-edge, with
 * line) plus the declaration lines of the resolved target nodes. The applier
 * (src/refactor/rename-applier.ts) does the text rewriting and owns the
 * shadow-ambiguity guard; the plan carries stable-shape `ambiguities` and
 * `typeOnlyRefs` arrays it fills / leaves empty.
 *
 * The graph is line-grained only (edge.sourceLocation has file+line, NO
 * column — see src/export/graph-exporter.ts:92). Column-precise rewriting is
 * therefore impossible from the plan alone; the applier re-tokenizes each
 * line with a word-boundary regex and cross-checks the attributed site count.
 */

import * as path from 'path';
import { loadCanonicalGraph } from '../query/canonical-graph.js';
import type { EdgeConfidenceTier } from '../pipeline/edge-confidence.js';

export interface RenameSite {
  file: string;
  line: number;
  kind: 'declaration' | 'call' | 'import';
  /**
   * Confidence TIER of the edge this site came from (Phase 3). Declaration
   * sites are always 'exact' (they ARE the resolved target node). Reference
   * sites carry the tier of their inbound resolved edge — 'exact' for a normal
   * resolved reference, 'heuristic' for a provisional single-candidate one.
   * PROVENANCE, not a verdict: use it to separate auto-apply-safe ('exact')
   * sites from ones a human should review before rewriting.
   */
  confidence: EdgeConfidenceTier;
}

export interface RenamePlan {
  oldName: string;
  newName: string;
  targetIds: string[];
  sites: RenameSite[];
  typeOnlyRefs: Array<{ file?: string; line?: number; note: string }>;
  ambiguities: Array<{ file: string; line: number; reason: string }>;
  /**
   * The minConfidence threshold applied when building this plan, or null when
   * no filter was requested (Phase 3). Echoed so a consumer knows whether the
   * site list was tightened.
   */
  minConfidence: EdgeConfidenceTier | null;
}

/**
 * Build a rename plan for `oldName -> newName` against the project's canonical
 * graph. Throws if the symbol resolves to zero nodes.
 *
 * `minConfidence` (optional, Phase 3) tightens the REFERENCE sites to those
 * whose edge tier meets or exceeds the threshold — e.g. `'exact'` drops
 * provisional single-candidate ('heuristic') sites, leaving only the
 * auto-apply-safe ones. Declaration sites are always retained (they are 'exact'
 * by construction). Absent `minConfidence` → every reference site is kept and
 * the plan is byte-unchanged from the pre-Phase-3 shape plus the additive
 * `confidence`/`minConfidence` fields.
 */
export function planRename(
  projectDir: string,
  oldName: string,
  newName: string,
  minConfidence?: EdgeConfidenceTier,
): RenamePlan {
  const q = loadCanonicalGraph(projectDir);
  const res = q.resolve(oldName);
  if (res.nodes.length === 0) {
    throw new Error(`symbol not found: ${oldName}`);
  }

  const targetIds = res.nodes.map(n => n.id);

  const sites: RenameSite[] = [];

  // The canonical graph stores project-relative file paths (posix slashes);
  // absolutize them against projectDir so the applier can read/write real
  // files regardless of the process cwd.
  const abs = (file: string): string =>
    path.isAbsolute(file) ? file : path.resolve(projectDir, file);

  // Declaration sites: one per resolved target node that carries a location.
  // A declaration IS the resolved target, so its provenance is always 'exact'.
  for (const node of res.nodes) {
    if (typeof node.file !== 'string' || typeof node.line !== 'number') continue;
    sites.push({ file: abs(node.file), line: node.line, kind: 'declaration', confidence: 'exact' });
  }

  // Reference sites: per-edge inbound call+import sites (with line + tier),
  // optionally filtered to the minConfidence threshold.
  for (const site of q.referenceSitesOf(res, minConfidence)) {
    const kind: RenameSite['kind'] = site.relationship === 'import' ? 'import' : 'call';
    sites.push({ file: abs(site.file), line: site.line, kind, confidence: site.confidence });
  }

  return {
    oldName,
    newName,
    targetIds,
    sites,
    // typeOnly edges are module-grain in the current graph; a full pass is
    // optional and out of scope here. Keep the field for shape stability.
    typeOnlyRefs: [],
    // The applier fills shadow ambiguities during rewriting; the planner
    // returns an empty array so the RenamePlan shape is stable.
    ambiguities: [],
    minConfidence: minConfidence ?? null,
  };
}
