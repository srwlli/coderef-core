/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability scip-resolution-delta
 * @exports ScipDeltaElement, ScipDeltaEdge, ScipDeltaRow, ScipDeltaSummary, ScipResolutionDeltaSurface, ScipResolutionDeltaInputs, computeScipResolutionDelta, SCIP_DELTA_SCHEMA_VERSION
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * scip-resolution-delta — what SCIP resolves that CodeRef currently does NOT
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 11, scope-A).
 *
 * The fit-decision (discovery-phase11.md) found CodeRef's OWN resolution rate is
 * only ~21.58% (15,882 unresolved edges): its tree-sitter heuristic structurally
 * cannot match a compiler-grade indexer. SCIP (from an external scip-* indexer)
 * IS compiler-grade. This surface quantifies the LIFT: for each SCIP-resolved
 * reference occurrence whose corresponding CodeRef graph edge is unresolved /
 * ambiguous / absent, it emits a delta row — the concrete set of edges SCIP
 * would resolve that CodeRef missed.
 *
 * SCOPE-A is READ-ONLY. It does NOT mutate edges and does NOT touch the
 * resolver — it only REPORTS the delta. Actually FEEDING SCIP into
 * call-resolver.ts (flipping unresolved→resolved on the live graph) is the
 * deferred deep integration (needs a real scip-typescript index for regression
 * proof); it is a tracked follow-up, not this phase.
 *
 * PURE. No I/O, deterministic. The caller decodes the .scip (scip-schema.ts),
 * loads index.json elements + graph.json edges, and passes them in.
 *
 * SURFACES, NOT VERDICTS. A delta is a RESOLUTION-PROVENANCE gain — "SCIP has a
 * precise answer here that CodeRef lacks" — NOT a quality grade or a defect
 * count. There is deliberately no score. ABSENCE = NO-DATA: no SCIP index (or
 * an empty one) returns `{ no_data: true }`, never a false "0 delta" (which
 * would falsely imply CodeRef's resolution is already complete).
 */

/** Minimal element shape (subset of ElementData) needed to map occurrences. */
export interface ScipDeltaElement {
  codeRefId?: string;
  name: string;
  file: string;
  line?: number;
}

/** Minimal edge shape (subset of the exported graph edge). */
export interface ScipDeltaEdge {
  sourceId?: string;
  target?: string;
  type?: string;
  relationship?: string;
  resolutionStatus?: string;
  sourceLocation?: { file?: string; line?: number };
}

/** One SCIP-resolves-what-CodeRef-missed row. */
export interface ScipDeltaRow {
  /** codeRefId the SCIP occurrence maps to (by file + 1-indexed line), or null. */
  codeRefId: string | null;
  /** The SCIP symbol moniker resolved at this occurrence. */
  scipSymbol: string;
  file: string;
  /** 1-indexed line (SCIP's 0-indexed range start, normalized). */
  line: number;
  /** CodeRef's status for the co-located edge: unresolved | ambiguous | absent. */
  coderefStatus: 'unresolved' | 'ambiguous' | 'absent';
  scipStatus: 'resolved';
  provenance: 'scip';
}

/** Roll-up. No score — surfaces-not-verdicts. */
export interface ScipDeltaSummary {
  scip_documents: number;
  scip_occurrences: number;
  scip_definitions: number;
  /** CodeRef edges that are not resolved (unresolved + ambiguous), for context. */
  coderef_unresolved_total: number;
  /** Count of edges SCIP resolves that CodeRef did NOT — the lift. */
  delta_resolved_by_scip: number;
  /** delta_resolved_by_scip / coderef_unresolved_total (provenance ratio, NOT a grade). */
  delta_ratio: number;
}

export interface ScipResolutionDeltaSurface {
  deltas: ScipDeltaRow[];
  summary: ScipDeltaSummary;
  no_data: boolean;
  truncated: boolean;
  schema_version: string;
  note: string;
}

/** SCIP index shape this projection needs (from scip-schema decodeScipIndex). */
interface ScipIndexLike {
  documents: Array<{
    relativePath: string;
    occurrences: Array<{ range: number[]; symbol: string; isDefinition: boolean }>;
  }>;
}

export interface ScipResolutionDeltaInputs {
  /** Decoded SCIP index, or null/undefined when no .scip was provided. */
  scip: ScipIndexLike | null | undefined;
  elements: ScipDeltaElement[];
  edges: ScipDeltaEdge[];
  limit?: number;
  offset?: number;
}

export const SCIP_DELTA_SCHEMA_VERSION = '1.0.0';

const DEFAULT_LIMIT = 100;

const NOTE =
  'SCIP resolution delta: rows are references SCIP resolves precisely that ' +
  "CodeRef's own heuristic left unresolved/ambiguous/absent — the concrete lift " +
  "over CodeRef's ~21.58% resolution rate. SURFACES, NOT VERDICTS: a delta is a " +
  'resolution-provenance gain, NOT a defect or a quality grade (no score). ' +
  'ABSENCE = NO-DATA: no .scip index → no_data:true, never a false "0 delta". ' +
  'READ-ONLY: this does NOT feed the resolver or mutate edges (that live wiring ' +
  'is a deferred deep integration needing a real scip-typescript index).';

/** Key an element by "file:line" (1-indexed) for occurrence lookup. */
function elementKey(file: string, line: number): string {
  return `${file}:${line}`;
}

/**
 * Project the SCIP-vs-CodeRef resolution delta. Deterministic: rows sorted by
 * (file, line, scipSymbol). The summary is over the full computed set; pagination
 * only bounds the returned rows.
 */
export function computeScipResolutionDelta(
  inputs: ScipResolutionDeltaInputs,
): ScipResolutionDeltaSurface {
  const { scip, elements, edges, limit = DEFAULT_LIMIT, offset = 0 } = inputs;

  const emptyScip = !scip || !Array.isArray(scip.documents) || scip.documents.length === 0;
  if (emptyScip) {
    return {
      deltas: [],
      summary: {
        scip_documents: 0,
        scip_occurrences: 0,
        scip_definitions: 0,
        coderef_unresolved_total: 0,
        delta_resolved_by_scip: 0,
        delta_ratio: 0,
      },
      no_data: true,
      truncated: false,
      schema_version: SCIP_DELTA_SCHEMA_VERSION,
      note: NOTE,
    };
  }

  // Index elements by (file, 1-indexed line) for occurrence → codeRefId mapping.
  const elByKey = new Map<string, ScipDeltaElement>();
  for (const el of elements) {
    if (typeof el.line === 'number') {
      elByKey.set(elementKey(el.file, el.line), el);
    }
  }

  // Index CodeRef edge resolution status by (file, line) of the call site.
  // A reference at (file, line) is "resolved" by CodeRef iff an edge there has
  // resolutionStatus === 'resolved'. Otherwise unresolved / ambiguous / absent.
  const edgeStatusByKey = new Map<string, string>();
  let coderefUnresolvedTotal = 0;
  for (const e of edges) {
    const file = e.sourceLocation?.file;
    const line = e.sourceLocation?.line;
    const status = e.resolutionStatus;
    if (status === 'unresolved' || status === 'ambiguous') coderefUnresolvedTotal += 1;
    if (typeof file === 'string' && typeof line === 'number' && status) {
      const key = elementKey(normalizeFile(file), line);
      // Prefer a 'resolved' status if any edge at that site resolved.
      const prev = edgeStatusByKey.get(key);
      if (prev !== 'resolved') edgeStatusByKey.set(key, status);
    }
  }

  let scipOccurrences = 0;
  let scipDefinitions = 0;
  const deltas: ScipDeltaRow[] = [];

  for (const doc of scip.documents) {
    const file = normalizeFile(doc.relativePath);
    for (const occ of doc.occurrences) {
      scipOccurrences += 1;
      if (occ.isDefinition) {
        scipDefinitions += 1;
        continue; // definitions anchor symbols; the delta is about REFERENCES SCIP resolves
      }
      if (!occ.symbol || !Array.isArray(occ.range) || occ.range.length === 0) continue;

      // SCIP range is 0-indexed [startLine, ...]; CodeRef line is 1-indexed.
      const line = occ.range[0] + 1;
      const key = elementKey(file, line);
      const crStatus = edgeStatusByKey.get(key);

      // SCIP resolved this reference (it has a symbol). Is it a LIFT over CodeRef?
      // Lift when CodeRef's co-located edge is unresolved / ambiguous / absent.
      if (crStatus === 'resolved') continue; // CodeRef already has it — no delta

      const coderefStatus: ScipDeltaRow['coderefStatus'] =
        crStatus === 'unresolved' || crStatus === 'ambiguous' ? crStatus : 'absent';

      const el = elByKey.get(key);
      deltas.push({
        codeRefId: el?.codeRefId ?? null,
        scipSymbol: occ.symbol,
        file,
        line,
        coderefStatus,
        scipStatus: 'resolved',
        provenance: 'scip',
      });
    }
  }

  deltas.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.scipSymbol.localeCompare(b.scipSymbol),
  );

  const deltaResolvedByScip = deltas.length;
  const page = deltas.slice(offset, offset + limit);
  const truncated = offset + limit < deltas.length;

  return {
    deltas: page,
    summary: {
      scip_documents: scip.documents.length,
      scip_occurrences: scipOccurrences,
      scip_definitions: scipDefinitions,
      coderef_unresolved_total: coderefUnresolvedTotal,
      delta_resolved_by_scip: deltaResolvedByScip,
      delta_ratio:
        coderefUnresolvedTotal > 0 ? deltaResolvedByScip / coderefUnresolvedTotal : 0,
    },
    no_data: false,
    truncated,
    schema_version: SCIP_DELTA_SCHEMA_VERSION,
    note: NOTE,
  };
}

/** Normalize a file path to forward-slash relative form (matches index.json keys). */
function normalizeFile(file: string): string {
  return file.replace(/\\/g, '/');
}
