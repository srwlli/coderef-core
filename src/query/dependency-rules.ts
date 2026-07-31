/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability dependency-rules-gate
 * @exports DEPENDENCY_RULES_SCHEMA_VERSION, RulePair, RulesSpec, LayerEdge, RuleStatus, DependencyRuleResult, DependencyRulesReport, DependencyRulesNode, DependencyRulesEdge, ProjectLayerEdgesOptions, parseRulesSpec, projectLayerEdges, checkDependencyRules
 * @used_by src/cli/coderef-analyze.ts, src/cli/mcp/verify-tools.ts, __tests__/query/dependency-rules-dogfood.test.ts, __tests__/query/dependency-rules.test.ts
 */

/**
 * dependency-rules — a PURE checker of DECLARED architecture constraints against
 * the OBSERVED declared-layer dependency edges (WO-CODE-INTELLIGENCE-GENRE-
 * FEATURES-PROGRAM-001 Phase 7, dependency-rules gate).
 *
 * The map already SURFACES the declared layer->layer dependency matrix
 * (src/map/layer-drift.ts computeLayerDrift) as an OBSERVATION. P7 turns that
 * observation into a CHECK: an optional .coderef/rules.json declares forbidden
 * (or allowed) cross-layer dependencies, and this module reports which declared
 * rules the observed edge set satisfies or violates. It RIDES the exact same
 * layer model (per-node metadata.layer, the matrix aggregation idiom) so the
 * check and the observation can never drift apart.
 *
 * PURE. No I/O, no git, no Date.now / Math.random. parseRulesSpec validates an
 * already-parsed value; projectLayerEdges aggregates already-loaded nodes/edges;
 * checkDependencyRules joins a spec against that aggregation. Deterministic —
 * identical inputs yield a byte-identical report (rules key-sorted, violating
 * edges sorted with explicit tie-breaks).
 *
 * SURFACES, NOT VERDICTS. A violated rule is a declared-constraint MISMATCH fact
 * with the offending edges named — NOT a quality score. There is deliberately NO
 * composite "architecture health" number: the caller reads violated/satisfied/
 * not_applicable and decides. (The CLI --gate exit code is an OPT-IN operator
 * choice layered on top, not a verdict this module emits.)
 *
 * ABSENCE = NO-DATA. The caller owns the "no rules.json" case (-> no_data:true,
 * never a false "all rules pass"). This pure core only diffs a spec that exists;
 * an empty rule set yields an empty report, not a fabricated pass.
 */

/** Bump when the report shape changes so a stale consumer is caught, not mis-read. */
export const DEPENDENCY_RULES_SCHEMA_VERSION = '1.0.0';

/** One declared layer-pair constraint: a dependency FROM one layer TO another. */
export interface RulePair {
  from: string;
  to: string;
}

/**
 * Parsed rules spec. `forbid` names dependencies that MUST NOT exist;
 * `allow` (when present) is an allow-list: for any source layer that appears in
 * an allow rule, a declared edge to a target NOT in that layer's allow-set is a
 * violation. The two are independent; a spec may declare either or both.
 */
export interface RulesSpec {
  forbid: RulePair[];
  allow: RulePair[];
  /** Non-fatal shape warnings surfaced during parse (unknown/dropped fields). */
  warnings: string[];
}

/** One observed declared-layer dependency, aggregated from the graph. */
export interface LayerEdge {
  sourceLayer: string;
  targetLayer: string;
  /** Distinct node-edges between the two layers. */
  edgeCount: number;
  /** Summed edge weight (defaults to edgeCount when edges carry no weight). */
  weight: number;
  /** Sorted sample "sourceFile -> targetFile" labels (capped). */
  sampleEdges: string[];
}

export type RuleStatus = 'violated' | 'satisfied' | 'not_applicable';

/** The result for one declared rule against the observed edge set. */
export interface DependencyRuleResult {
  kind: 'forbid' | 'allow';
  from: string;
  to: string;
  status: RuleStatus;
  /** Observed edges that violate this rule (empty unless status==='violated'). */
  violatingEdges: LayerEdge[];
}

export interface DependencyRulesReport {
  schemaVersion: string;
  ruleCount: number;
  violatedCount: number;
  satisfiedCount: number;
  notApplicableCount: number;
  /** Per-rule results, sorted (kind, from, to). */
  rules: DependencyRuleResult[];
  warnings: string[];
  note: string;
}

/** Minimal node shape the projector needs (subset of a graph.json node). */
export interface DependencyRulesNode {
  id: string;
  file?: string;
  metadata?: { layer?: string } | null;
}

/** Minimal edge shape the projector needs (subset of a graph.json edge). */
export interface DependencyRulesEdge {
  source?: string;
  target?: string;
  weight?: number;
}

export interface ProjectLayerEdgesOptions {
  /** Max sample edges retained per layer-pair. Default 25. */
  sampleCap?: number;
}

const REPORT_NOTE =
  'Declared architecture constraints checked against observed declared-layer dependencies. ' +
  'A violated rule is a constraint-mismatch FACT with the offending edges named — not a ' +
  'quality score. There is deliberately no composite architecture-health number.';

const EMPTY_NOTE =
  'no rules declared; nothing to check. Declare forbid/allow layer-pair constraints in ' +
  '.coderef/rules.json to enable the gate.';

function asRulePairs(value: unknown, kind: string, warnings: string[]): RulePair[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    warnings.push(`rules.${kind} is not an array; ignored`);
    return [];
  }
  const out: RulePair[] = [];
  for (let i = 0; i < value.length; i++) {
    const raw = value[i] as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') {
      warnings.push(`rules.${kind}[${i}] is not an object; skipped`);
      continue;
    }
    const from = raw.from;
    const to = raw.to;
    if (typeof from !== 'string' || typeof to !== 'string' || !from || !to) {
      warnings.push(`rules.${kind}[${i}] missing string from/to; skipped`);
      continue;
    }
    out.push({ from, to });
  }
  return out;
}

/**
 * Validate an already-parsed rules value into a RulesSpec. Never throws — an
 * unexpected shape yields warnings + whatever pairs were well-formed. The caller
 * owns the file read + the no-file (no-data) case; this only shapes the value.
 */
export function parseRulesSpec(raw: unknown): RulesSpec {
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object') {
    warnings.push('rules spec is not an object; treated as empty');
    return { forbid: [], allow: [], warnings };
  }
  const obj = raw as Record<string, unknown>;
  // Accept both camelCase and snake_case for the two arrays (config ergonomics).
  const forbid = asRulePairs(obj.forbid ?? obj.forbidden, 'forbid', warnings);
  const allow = asRulePairs(obj.allow ?? obj.allowed, 'allow', warnings);
  return { forbid, allow, warnings };
}

/**
 * Aggregate the observed declared-layer dependency edges from graph nodes + edges.
 * Mirrors the matrix loop in src/map/layer-drift.ts computeLayerDrift: build a
 * node-id -> layer map, then aggregate each edge whose BOTH endpoints resolve to
 * a layered node into a (sourceLayer, targetLayer) bucket. Edges to a missing or
 * unlayered endpoint are ignored (defensive — unresolved edges carry empty
 * targets). Deterministic: buckets emitted sorted, sampleEdges sorted + capped.
 */
export function projectLayerEdges(
  nodes: DependencyRulesNode[],
  edges: DependencyRulesEdge[],
  options: ProjectLayerEdgesOptions = {},
): LayerEdge[] {
  const sampleCap = options.sampleCap ?? 25;
  const layerOf = new Map<string, string>();
  const fileOf = new Map<string, string>();
  for (const n of nodes) {
    const layer = n.metadata?.layer;
    if (layer) layerOf.set(n.id, layer);
    if (n.file) fileOf.set(n.id, n.file);
  }

  interface Agg { edgeCount: number; weight: number; samples: Set<string> }
  const agg = new Map<string, Agg>();
  for (const e of edges) {
    if (!e || !e.source || !e.target) continue;
    const sl = layerOf.get(e.source);
    const tl = layerOf.get(e.target);
    if (!sl || !tl) continue;
    const key = sl + '\u0000' + tl;
    let bucket = agg.get(key);
    if (!bucket) {
      bucket = { edgeCount: 0, weight: 0, samples: new Set<string>() };
      agg.set(key, bucket);
    }
    bucket.edgeCount++;
    bucket.weight += Number(e.weight ?? 1);
    const sf = fileOf.get(e.source) ?? e.source;
    const tf = fileOf.get(e.target) ?? e.target;
    bucket.samples.add(`${sf} -> ${tf}`);
  }

  const out: LayerEdge[] = [];
  for (const [key, bucket] of agg) {
    const [sourceLayer, targetLayer] = key.split('\u0000');
    out.push({
      sourceLayer,
      targetLayer,
      edgeCount: bucket.edgeCount,
      weight: bucket.weight,
      sampleEdges: Array.from(bucket.samples).sort().slice(0, sampleCap),
    });
  }
  out.sort((a, b) =>
    a.sourceLayer === b.sourceLayer
      ? (a.targetLayer < b.targetLayer ? -1 : a.targetLayer > b.targetLayer ? 1 : 0)
      : (a.sourceLayer < b.sourceLayer ? -1 : 1),
  );
  return out;
}

function ruleKey(r: DependencyRuleResult): string {
  return `${r.kind}\u0000${r.from}\u0000${r.to}`;
}

/**
 * Join a rules spec against the observed layer edges into a per-rule report.
 *
 * forbid rule (from -> to): VIOLATED when an observed edge matches from->to;
 *   NOT_APPLICABLE when neither `from` nor `to` appears anywhere in the observed
 *   set (the constraint references layers this graph doesn't exercise); else
 *   SATISFIED.
 * allow rule (from -> to): an allow-list entry. For the source layer `from`, an
 *   observed edge to a target NOT in that layer's declared allow-set is a
 *   VIOLATION. Each allow rule reports the violating edges leaving `from` toward
 *   a disallowed target; SATISFIED when `from` has observed outbound edges all
 *   within its allow-set; NOT_APPLICABLE when `from` has no observed outbound
 *   edges at all.
 *
 * SURFACES-NOT-VERDICTS: no composite score. Deterministic: rules sorted, each
 * rule's violatingEdges inherit projectLayerEdges' sort.
 */
export function checkDependencyRules(input: {
  rules: RulesSpec;
  layerEdges: LayerEdge[];
}): DependencyRulesReport {
  const { rules, layerEdges } = input;
  const warnings = [...rules.warnings];

  // Fast lookups over the observed set.
  const observedPairs = new Map<string, LayerEdge>();
  const layersPresent = new Set<string>();
  const outboundByLayer = new Map<string, LayerEdge[]>();
  for (const le of layerEdges) {
    observedPairs.set(le.sourceLayer + '\u0000' + le.targetLayer, le);
    layersPresent.add(le.sourceLayer);
    layersPresent.add(le.targetLayer);
    const list = outboundByLayer.get(le.sourceLayer);
    if (list) list.push(le);
    else outboundByLayer.set(le.sourceLayer, [le]);
  }

  const results: DependencyRuleResult[] = [];

  for (const rule of rules.forbid) {
    const hit = observedPairs.get(rule.from + '\u0000' + rule.to);
    let status: RuleStatus;
    const violatingEdges: LayerEdge[] = [];
    if (hit) {
      status = 'violated';
      violatingEdges.push(hit);
    } else if (!layersPresent.has(rule.from) && !layersPresent.has(rule.to)) {
      status = 'not_applicable';
    } else {
      status = 'satisfied';
    }
    results.push({ kind: 'forbid', from: rule.from, to: rule.to, status, violatingEdges });
  }

  // Group allow rules by source layer to build each layer's allow-set.
  const allowSetByLayer = new Map<string, Set<string>>();
  for (const rule of rules.allow) {
    let set = allowSetByLayer.get(rule.from);
    if (!set) { set = new Set<string>(); allowSetByLayer.set(rule.from, set); }
    set.add(rule.to);
  }
  for (const rule of rules.allow) {
    const outbound = outboundByLayer.get(rule.from) ?? [];
    const allowSet = allowSetByLayer.get(rule.from)!;
    let status: RuleStatus;
    const violatingEdges: LayerEdge[] = [];
    if (outbound.length === 0) {
      status = 'not_applicable';
    } else {
      // Same-layer edges are always allowed (a layer may depend on itself).
      for (const le of outbound) {
        if (le.targetLayer !== rule.from && !allowSet.has(le.targetLayer)) {
          violatingEdges.push(le);
        }
      }
      status = violatingEdges.length > 0 ? 'violated' : 'satisfied';
    }
    results.push({ kind: 'allow', from: rule.from, to: rule.to, status, violatingEdges });
  }

  results.sort((a, b) => (ruleKey(a) < ruleKey(b) ? -1 : ruleKey(a) > ruleKey(b) ? 1 : 0));

  const violatedCount = results.filter(r => r.status === 'violated').length;
  const satisfiedCount = results.filter(r => r.status === 'satisfied').length;
  const notApplicableCount = results.filter(r => r.status === 'not_applicable').length;

  return {
    schemaVersion: DEPENDENCY_RULES_SCHEMA_VERSION,
    ruleCount: results.length,
    violatedCount,
    satisfiedCount,
    notApplicableCount,
    rules: results,
    warnings,
    note: results.length === 0 ? EMPTY_NOTE : REPORT_NOTE,
  };
}
