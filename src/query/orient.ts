/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability orient-composite
 * @exports OrientInputs, OrientEnvelope, OrientHotspot, ORIENT_DEFAULT_TOKEN_BUDGET, skeletonBudgetFor, rankHotspotsFromGraph, condenseSummary, condenseValidation, composeOrient
 */

/**
 * orient — the one-call first-turn orientation composite
 * (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 P4, REC-003).
 *
 * Collapses the agent's opening sequence (map skeleton -> codebase_summary ->
 * validation_status -> hotspots, plus the staleness blocks) into ONE
 * deterministic token-budgeted envelope. This module is the PURE half: it
 * composes pre-loaded inputs and never touches the filesystem — the MCP
 * handler and the coderef-query CLI mirror do the I/O and share this seam.
 *
 * DETERMINISM. Output depends only on the inputs: no Date.now, no randomness,
 * stable ordering (hotspots by score desc then id asc). Identical inputs
 * produce byte-identical envelopes — pinned by __tests__/query/orient.test.ts.
 *
 * TOKEN BUDGET. The overall budget splits as: skeleton text gets
 * budget - ORIENT_STRUCTURED_RESERVE (the caller renders the skeleton at that
 * sub-budget BEFORE composing); the structured blocks live inside the reserve.
 * When the assembled envelope still estimates over budget, hotspots trim
 * 10 -> 5 -> 0 deterministically and each trim is DECLARED in warnings —
 * never a silent drop.
 *
 * SURFACES, NOT VERDICTS. Every block reports what an artifact claims about
 * itself. An absent artifact is a named entry in `no_data`, never a guess or
 * a zero pretending to be a measurement.
 */

/** Minimal graph shapes consumed by the ranking helper (structural subset). */
export interface OrientGraphEdge {
  sourceId?: string;
  targetId?: string;
  relationship?: string;
  resolutionStatus?: string;
  evidence?: { testOrigin?: boolean } | undefined;
}

export interface OrientGraphNode {
  id: string;
  name?: string;
  file?: string;
  line?: number;
  type?: string;
}

export interface OrientHotspot {
  id: string;
  name: string | null;
  file: string | null;
  line: number | null;
  fan_in: number;
  fan_out: number;
  score: number;
}

export interface OrientSkeletonBlock {
  text: string;
  estimated_tokens: number;
  token_budget: number;
  included_files: number;
  omitted_files: number;
  warnings: string[];
}

export interface OrientInputs {
  /** Rendered skeleton block (already fitted to skeletonBudgetFor(budget)), or null. */
  skeleton: OrientSkeletonBlock | null;
  /** codebase_summary-shaped envelope (or the raw pieces), or null. */
  summary: Record<string, unknown> | null;
  /** The locked validation report (14-field), or null. */
  validation: Record<string, unknown> | null;
  /** Graph-vs-source staleness block (staleness-check.ts shape), or null. */
  staleness: Record<string, unknown> | null;
  /** Vector-vs-index staleness block (staleness-check.ts compareVectorStamps), or null. */
  vector_staleness: Record<string, unknown> | null;
  /** Pre-ranked hotspots (top-N, score desc), or null when the graph is absent. */
  hotspots: OrientHotspot[] | null;
  /** The overall token budget the caller honored. */
  token_budget: number;
}

export interface OrientEnvelope {
  token_budget: number;
  estimated_tokens: number;
  orientation: OrientSkeletonBlock | null;
  summary: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  staleness: Record<string, unknown> | null;
  vector_staleness: Record<string, unknown> | null;
  hotspots: OrientHotspot[] | null;
  hotspot_count: number;
  no_data: string[];
  warnings: string[];
  hint: string;
}

export const ORIENT_DEFAULT_TOKEN_BUDGET = 2400;

/**
 * Tokens reserved for the structured blocks (summary/validation/staleness/
 * hotspots + envelope overhead); the skeleton gets the rest.
 */
export const ORIENT_STRUCTURED_RESERVE = 800;

/** Floor so a tiny overall budget still yields a usable skeleton header. */
const SKELETON_BUDGET_FLOOR = 300;

const HOTSPOT_CAP = 10;
const HOTSPOT_TRIM = 5;

/** chars/4 heuristic — same convention as skeleton-map/pack-context. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** The skeleton sub-budget for a given overall orient budget. */
export function skeletonBudgetFor(tokenBudget: number): number {
  return Math.max(SKELETON_BUDGET_FLOOR, tokenBudget - ORIENT_STRUCTURED_RESERVE);
}

const TEST_FILE_RE = /__tests__|\.test\.|\.spec\./;

/**
 * Pure hotspot ranking over graph edges: fan-in + fan-out across resolved
 * call/import edges, test-origin edges and test-file elements excluded
 * (mirrors the MCP hotspots tool's src_only default). Deterministic:
 * score desc, then id asc.
 */
export function rankHotspotsFromGraph(
  edges: OrientGraphEdge[],
  nodesById: Map<string, OrientGraphNode>,
  topN: number = HOTSPOT_CAP,
): OrientHotspot[] {
  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  for (const e of edges) {
    if (e.resolutionStatus !== 'resolved' || !e.sourceId || !e.targetId) continue;
    if (e.relationship !== 'call' && e.relationship !== 'import') continue;
    if (e.evidence?.testOrigin === true) continue;
    fanIn.set(e.targetId, (fanIn.get(e.targetId) ?? 0) + 1);
    fanOut.set(e.sourceId, (fanOut.get(e.sourceId) ?? 0) + 1);
  }
  const ranked: OrientHotspot[] = [];
  const ids = new Set<string>([...fanIn.keys(), ...fanOut.keys()]);
  for (const id of ids) {
    const node = nodesById.get(id);
    if (!node) continue;
    if (TEST_FILE_RE.test((node.file ?? '').replace(/\\/g, '/'))) continue;
    const fi = fanIn.get(id) ?? 0;
    const fo = fanOut.get(id) ?? 0;
    ranked.push({
      id,
      name: node.name ?? null,
      file: node.file ?? null,
      line: node.line ?? null,
      fan_in: fi,
      fan_out: fo,
      score: fi + fo,
    });
  }
  ranked.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  return ranked.slice(0, Math.max(0, topN));
}

/**
 * Condense index/graph toplines into the orient summary block. Pure: takes
 * the parsed artifacts (or nulls) and reports only what they claim.
 */
export function condenseSummary(
  index: { totalElements?: number; elements?: unknown[]; elementsByType?: Record<string, number>; generatedAt?: string } | null,
  graph: { statistics?: { nodeCount?: number; edgeCount?: number; edgesByType?: Record<string, number> } } | null,
): Record<string, unknown> | null {
  if (!index && !graph) return null;
  const out: Record<string, unknown> = {};
  if (index) {
    out.total_elements = index.totalElements ?? (Array.isArray(index.elements) ? index.elements.length : null);
    out.elements_by_type = index.elementsByType ?? {};
    out.generated_at = index.generatedAt ?? null;
  }
  if (graph) {
    out.graph = {
      nodes: graph.statistics?.nodeCount ?? null,
      edges: graph.statistics?.edgeCount ?? null,
      edges_by_type: graph.statistics?.edgesByType ?? {},
    };
  }
  return out;
}

/** Condense the locked validation report into the trust-calibration block. */
export function condenseValidation(
  report: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!report) return null;
  return {
    resolution_rate: report.resolution_rate ?? null,
    resolved_of_resolvable: report.resolved_of_resolvable ?? null,
    unresolved_count: report.unresolved_count ?? null,
    ambiguous_count: report.ambiguous_count ?? null,
    header_coverage_pct: report.header_coverage_pct ?? null,
  };
}

/**
 * Compose the orient envelope from pre-loaded inputs. Pure and deterministic.
 * Over-budget assemblies trim hotspots (10 -> 5 -> 0) with declared warnings;
 * absent inputs land in no_data by name.
 */
export function composeOrient(inputs: OrientInputs): OrientEnvelope {
  const warnings: string[] = [];
  const no_data: string[] = [];

  if (!inputs.skeleton) no_data.push('skeleton_map');
  if (!inputs.summary) no_data.push('codebase_summary');
  if (!inputs.validation) no_data.push('validation_report');
  if (!inputs.staleness) no_data.push('staleness');
  if (!inputs.vector_staleness) no_data.push('vector_staleness');
  if (!inputs.hotspots) no_data.push('hotspots');

  let hotspots = inputs.hotspots ? inputs.hotspots.slice(0, HOTSPOT_CAP) : null;

  const draft = (h: OrientHotspot[] | null): OrientEnvelope => ({
    token_budget: inputs.token_budget,
    estimated_tokens: 0,
    orientation: inputs.skeleton,
    summary: inputs.summary,
    validation: inputs.validation,
    staleness: inputs.staleness,
    vector_staleness: inputs.vector_staleness,
    hotspots: h,
    hotspot_count: h ? h.length : 0,
    no_data,
    warnings,
    hint:
      'One-call orientation: skeleton (centrality-ranked files + exported signatures), ' +
      'summary/validation (trust calibration for every graph answer), staleness ' +
      '(reindex when it warns), vector_staleness (rag_index when it warns), top hotspots ' +
      '(architectural load-bearers). Surfaces, not verdicts — read files before concluding.',
  });

  let envelope = draft(hotspots);
  let estimated = estimateTokens(JSON.stringify(envelope));
  if (estimated > inputs.token_budget && hotspots && hotspots.length > HOTSPOT_TRIM) {
    hotspots = hotspots.slice(0, HOTSPOT_TRIM);
    warnings.push(`over budget at ${estimated} est tokens — hotspots trimmed ${HOTSPOT_CAP} -> ${HOTSPOT_TRIM}`);
    envelope = draft(hotspots);
    estimated = estimateTokens(JSON.stringify(envelope));
  }
  if (estimated > inputs.token_budget && hotspots && hotspots.length > 0) {
    hotspots = [];
    warnings.push(`still over budget at ${estimated} est tokens — hotspots trimmed to 0 (summary/validation kept)`);
    envelope = draft(hotspots);
    estimated = estimateTokens(JSON.stringify(envelope));
  }
  envelope.estimated_tokens = estimated;
  return envelope;
}
