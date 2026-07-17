/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-edge-evidence
 * @exports MapEdgeEvidenceSample, MapEdgeEvidence, EdgeEvidenceOptions, EdgeEvidenceResult, computeEdgeEvidence
 * @used_by src/map/project-map-data.ts
 */

/**
 * Per-edge evidence for the FILE-level map projection
 * (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P2, graphify feedback item #5).
 *
 * PURE function over raw graph.json edge records plus the caller's
 * node-id -> file map — no `.coderef/` reads, no path normalization opinions
 * (the caller owns both), so any-repo universality is inherited from the
 * projection. Deterministic by construction: no Date.now, no Math.random;
 * samples are sorted with a total-order tie-break before capping.
 *
 * Recomputes cross-file resolved pairs with the SAME skip rules as the
 * projection's edge-aggregation pass (resolved + sourceId + targetId +
 * cross-file), so every aggregated MapEdge finds its evidence by
 * `source + ' ' + target` key and vice versa.
 *
 * Output is SURFACES, NOT VERDICTS: provenance classes, source lines, and
 * ambiguous-candidate counts are resolution facts from the scan — they carry
 * no judgment about whether an edge is correct or desirable.
 */

export interface MapEdgeEvidenceSample {
  relationship: string;
  /** explicit = declared in source (import/export); inferred = derived via symbol resolution (call); unspecified = no basis recorded. */
  provenance: 'explicit' | 'inferred' | 'unspecified';
  /** 1-based source line; 0 = unknown (import edges commonly carry 0). */
  line: number;
  /** Human-readable basis, e.g. `localName <- originSpecifier` or `receiver.callee() in scope`. */
  detail: string;
}

export interface MapEdgeEvidence {
  /** Underlying-edge counts per provenance class (all edges of the pair, not just samples). */
  provenance: Record<string, number>;
  /** Capped, line-sorted samples (see EdgeEvidenceOptions.sampleCap). */
  samples: MapEdgeEvidenceSample[];
  samplesTruncated: boolean;
  /** Ambiguous-call edges whose candidates land in this pair (counts only, never samples). */
  ambiguous?: { edgeCount: number; candidateCount: number };
}

export interface EdgeEvidenceOptions {
  /** Max samples embedded per file edge (default 5). */
  sampleCap?: number;
}

export interface EdgeEvidenceResult {
  /** Keyed `sourceFile + ' ' + targetFile` — same key the projection aggregates by. */
  byPair: Map<string, MapEdgeEvidence>;
  warnings: string[];
}

const SAMPLE_CAP_DEFAULT = 5;

/** Provenance from evidence.kind when present, relationship otherwise. Total on any input. */
function classifyProvenance(edge: any): MapEdgeEvidenceSample['provenance'] {
  const kind = edge.evidence && edge.evidence.kind ? String(edge.evidence.kind) : '';
  if (kind === 'resolved-import') return 'explicit';
  if (kind === 'resolved-call') return 'inferred';
  const rel = String(edge.relationship || '');
  if (rel === 'import' || rel === 'export') return 'explicit';
  if (rel === 'call') return 'inferred';
  return 'unspecified';
}

function sampleDetail(edge: any): string {
  const ev = edge.evidence || {};
  if (ev.localName || ev.originSpecifier) {
    const local = ev.localName ? String(ev.localName) : '*';
    return ev.originSpecifier ? local + ' <- ' + String(ev.originSpecifier) : local;
  }
  if (ev.calleeName) {
    const receiver = ev.receiverText ? String(ev.receiverText) + '.' : '';
    const scope = ev.scopePath ? ' in ' + String(ev.scopePath) : '';
    return receiver + String(ev.calleeName) + '()' + scope;
  }
  // No evidence payload (e.g. export edges, minimal fixtures): fall back to the
  // target element name embedded in the graph node id (`@T/file#name:line`).
  const target = String(edge.targetId || '');
  const hash = target.indexOf('#');
  if (hash !== -1) {
    const name = target.slice(hash + 1).split(':')[0];
    if (name) return name;
  }
  return String(edge.relationship || 'edge');
}

function sampleLine(edge: any): number {
  const line = edge.sourceLocation ? Number(edge.sourceLocation.line || 0) : 0;
  return Number.isFinite(line) && line > 0 ? line : 0;
}

function compareSamples(a: MapEdgeEvidenceSample, b: MapEdgeEvidenceSample): number {
  if (a.line !== b.line) return a.line - b.line;
  if (a.relationship !== b.relationship) return a.relationship < b.relationship ? -1 : 1;
  if (a.detail !== b.detail) return a.detail < b.detail ? -1 : 1;
  if (a.provenance !== b.provenance) return a.provenance < b.provenance ? -1 : 1;
  return 0;
}

/**
 * Classify and aggregate per-file-edge evidence from raw graph edge records.
 * `nodeFile` maps graph node ids to (already normalized) project-relative
 * file paths — the same map the projection builds for its aggregation pass.
 */
export function computeEdgeEvidence(
  rawEdges: any[],
  nodeFile: Map<string, string>,
  options: EdgeEvidenceOptions = {},
): EdgeEvidenceResult {
  const sampleCap = options.sampleCap ?? SAMPLE_CAP_DEFAULT;
  const warnings: string[] = [];

  // ---- resolved cross-file pairs (same skip rules as the projection) -------
  const collected = new Map<string, MapEdgeEvidenceSample[]>();
  const provenanceCounts = new Map<string, Record<string, number>>();
  for (const e of rawEdges) {
    if (!e || e.resolutionStatus !== 'resolved' || !e.sourceId || !e.targetId) continue;
    const sourceFile = nodeFile.get(e.sourceId);
    const targetFile = nodeFile.get(e.targetId);
    if (!sourceFile || !targetFile || sourceFile === targetFile) continue;
    const key = sourceFile + ' ' + targetFile;

    const provenance = classifyProvenance(e);
    let counts = provenanceCounts.get(key);
    if (!counts) {
      counts = {};
      provenanceCounts.set(key, counts);
    }
    counts[provenance] = (counts[provenance] || 0) + 1;

    let list = collected.get(key);
    if (!list) {
      list = [];
      collected.set(key, list);
    }
    list.push({
      relationship: String(e.relationship || 'unknown'),
      provenance,
      line: sampleLine(e),
      detail: sampleDetail(e),
    });
  }

  // ---- ambiguous exposure (counts only, existing pairs only) ---------------
  const ambiguousByPair = new Map<string, { edgeCount: number; candidateCount: number }>();
  let unattachedAmbiguous = 0;
  for (const e of rawEdges) {
    if (!e || e.resolutionStatus !== 'ambiguous' || !e.sourceId) continue;
    const sourceFile = nodeFile.get(e.sourceId);
    if (!sourceFile) {
      unattachedAmbiguous++;
      continue;
    }
    // Count candidates per existing pair; one ambiguous edge may fan out to
    // several candidate files.
    const perPairCandidates = new Map<string, number>();
    for (const candidate of Array.isArray(e.candidates) ? e.candidates : []) {
      const candidateFile = nodeFile.get(String(candidate));
      if (!candidateFile || candidateFile === sourceFile) continue;
      const key = sourceFile + ' ' + candidateFile;
      if (!collected.has(key)) continue;
      perPairCandidates.set(key, (perPairCandidates.get(key) || 0) + 1);
    }
    if (perPairCandidates.size === 0) {
      unattachedAmbiguous++;
      continue;
    }
    for (const [key, candidateCount] of perPairCandidates) {
      const cur = ambiguousByPair.get(key) || { edgeCount: 0, candidateCount: 0 };
      cur.edgeCount++;
      cur.candidateCount += candidateCount;
      ambiguousByPair.set(key, cur);
    }
  }

  // ---- assembly: sort, cap, attach ------------------------------------------
  const byPair = new Map<string, MapEdgeEvidence>();
  let truncatedPairs = 0;
  for (const key of Array.from(collected.keys()).sort()) {
    const all = collected.get(key)!.slice().sort(compareSamples);
    const truncated = all.length > sampleCap;
    if (truncated) truncatedPairs++;
    const ambiguous = ambiguousByPair.get(key);
    // Key-sorted copy: JSON output must not depend on input edge order.
    const counts = provenanceCounts.get(key)!;
    const provenance: Record<string, number> = {};
    for (const cls of Object.keys(counts).sort()) provenance[cls] = counts[cls];
    byPair.set(key, {
      provenance,
      samples: all.slice(0, sampleCap),
      samplesTruncated: truncated,
      ...(ambiguous ? { ambiguous } : {}),
    });
  }

  if (truncatedPairs > 0) {
    warnings.push(
      `edge evidence samples capped at ${sampleCap} for ${truncatedPairs} of ${byPair.size} file edges`,
    );
  }
  if (unattachedAmbiguous > 0) {
    warnings.push(
      `${unattachedAmbiguous} ambiguous edges had no resolved file edge to attach to (counts omitted)`,
    );
  }

  return { byPair, warnings };
}
