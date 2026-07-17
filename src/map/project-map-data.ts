/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-data-projection
 * @exports MapElement, MapNode, MapEdge, MapHotspot, MapOverlays, MapMeta, MapData, MapProjectionError, projectMapData
 * @used_by src/cli/coderef-map.ts, src/cli/coderef-mcp-server.ts
 */

/**
 * Map data projection — projects the canonical `.coderef/graph.json` +
 * `.coderef/index.json` down to a FILE-level dependency map consumed by the
 * bundled map viewer (`coderef map <path>`) and the MCP `map` tool.
 *
 * WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 Phase 1.
 *
 * Design constraints (ruled plan, coderef/working/coderef-core/
 * graphify-alignment-projections/PLAN.md):
 * - File-level nodes, not element-level: graph.json is ~25MB at element
 *   grain; a 263-file repo projects to a data.json the viewer can embed.
 *   Element detail rides INSIDE each file node (capped), not as graph nodes.
 * - Only resolutionStatus='resolved' edges are traversable (same contract as
 *   src/query/canonical-graph.ts); everything else is counted in meta.
 * - Universal on any repo: hotspots + cycles overlays are COMPUTED from the
 *   projected file graph itself. `.coderef/intelligence/hotspots.json` is
 *   optional enrichment only — arbitrary repos will not have it.
 * - Graph analytics (communities, centrality/bridges, coupling, dead-code
 *   candidates — WO-MAP-GRAPH-ANALYTICS-MODULE-001 P1) follow the same rule:
 *   computed from the projected file graph by src/map/graph-analytics.ts,
 *   attached as the optional schema-additive `analytics` block.
 * - Per-edge evidence (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P2): the raw edge
 *   records the aggregation pass walks also feed src/map/edge-evidence.ts,
 *   attaching a schema-additive `evidence` block to each MapEdge (provenance
 *   classes, capped line-sorted samples, ambiguous-candidate counts).
 * - Declared-vs-detected drift (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P3): the
 *   projected nodes/edges plus analytics.assignments feed
 *   src/map/layer-drift.ts, attaching the schema-additive `drift` block. A
 *   layers spec is EXPLICIT opt-in via options.layersPath — never
 *   install-anchored auto-resolution, which would make any-repo output
 *   machine-dependent.
 * - Engineering metrics (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P4): the walks
 *   this projection already performs (index elements, raw graph edges) also
 *   feed src/map/engineering-metrics.ts — per-file headerStatus tallies and
 *   unresolved/ambiguous raw-edge counts — attaching the schema-additive
 *   `metrics` block (test linkage, documentation, unresolved refs, largest
 *   modules, most dependencies). Independent of options.analytics.
 * - Pure data. This module must never know HTML exists.
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizeSlashes } from '../utils/path-normalize.js';
import { computeGraphAnalytics, MapAnalytics } from './graph-analytics.js';
import { computeEdgeEvidence, MapEdgeEvidence } from './edge-evidence.js';
import { computeLayerDrift, MapLayerDrift, LayersSpec } from './layer-drift.js';
import { computeEngineeringMetrics, MapMetrics } from './engineering-metrics.js';

export interface MapElement {
  name: string;
  type: string;
  line: number;
  exported?: boolean;
}

export interface MapNode {
  /** Project-relative file path (slash-normalized) — the node identity. */
  id: string;
  /** Basename, for viewer labels. */
  label: string;
  /** Dirname ('' at root), for viewer grouping/coloring. */
  dir: string;
  elementCount: number;
  /** Element detail (capped at elementCap; see elementsTruncated). */
  elements: MapElement[];
  elementsTruncated: boolean;
  /** Dominant semantic layer among this file's graph nodes, when headers exist. */
  layer?: string;
  /** Sum of inbound file-edge weights. */
  inWeight: number;
  /** Sum of outbound file-edge weights. */
  outWeight: number;
  /** inWeight + outWeight — the universal hotspot metric. */
  hotspotScore: number;
}

export interface MapEdge {
  source: string;
  target: string;
  /** Total resolved element/file edges aggregated into this file edge. */
  weight: number;
  /** Per-relationship breakdown, e.g. { import: 3, call: 12 }. */
  kinds: Record<string, number>;
  /** Per-edge provenance evidence (absent when options.edgeEvidence === false). */
  evidence?: MapEdgeEvidence;
}

export interface MapHotspot {
  file: string;
  score: number;
  /** Enrichment from .coderef/intelligence/hotspots.json (optional). */
  elementInDegree?: number;
  maxComplexity?: number;
}

export interface MapOverlays {
  /** Top files by hotspotScore (descending), capped. */
  hotspots: MapHotspot[];
  /** File-level dependency cycles (SCCs of size > 1), capped. */
  cycles: string[][];
}

export interface MapMeta {
  schemaVersion: string;
  projectPath: string;
  repoName: string;
  generatedAt: string;
  source: {
    nodeCount: number;
    edgeCount: number;
    resolvedEdgeCount: number;
    elementCount: number;
  };
  warnings: string[];
}

export interface MapData {
  meta: MapMeta;
  nodes: MapNode[];
  edges: MapEdge[];
  overlays: MapOverlays;
  /** Graph analytics over this projection (absent when options.analytics === false). */
  analytics?: MapAnalytics;
  /** Declared-vs-detected layer drift (absent when options.layerDrift === false). */
  drift?: MapLayerDrift;
  /** Engineering metrics over this projection (absent when options.metrics === false). */
  metrics?: MapMetrics;
}

export class MapProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MapProjectionError';
  }
}

export interface ProjectMapDataOptions {
  /** Max elements embedded per file node (default 100). */
  elementCap?: number;
  /** Max hotspot overlay entries (default 25). */
  hotspotCap?: number;
  /** Max cycle overlay entries (default 50). */
  cycleCap?: number;
  /** Compute the analytics block (default true). */
  analytics?: boolean;
  /** Attach per-edge evidence blocks (default true). */
  edgeEvidence?: boolean;
  /** Max evidence samples per file edge (default 5; see edge-evidence.ts). */
  evidenceSampleCap?: number;
  /** Compute the drift block (default true). */
  layerDrift?: boolean;
  /**
   * Explicit path to a layers.json vocabulary (parsed for layers[].id +
   * dependency_rules.entry_layers/leaf_layers). Absent = spec-less drift.
   */
  layersPath?: string;
  /** Compute the metrics block (default true; independent of `analytics`). */
  metrics?: boolean;
}

const HOTSPOT_CAP_DEFAULT = 25;
const CYCLE_CAP_DEFAULT = 50;
const ELEMENT_CAP_DEFAULT = 100;

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Iterative Tarjan SCC over the file graph. Returns components of size > 1,
 * each sorted internally, the list sorted by its first member. Iterative on
 * purpose — a large repo's file graph must not hit recursion limits.
 */
function fileCycles(nodeIds: string[], edges: MapEdge[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }

  let counter = 0;
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];

  for (const root of nodeIds) {
    if (index.has(root)) continue;
    // Explicit work stack: [node, childPointer]
    const work: Array<[string, number]> = [[root, 0]];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const v = frame[0];
      if (frame[1] === 0) {
        index.set(v, counter);
        lowlink.set(v, counter);
        counter++;
        stack.push(v);
        onStack.add(v);
      }
      const children = adj.get(v) || [];
      let advanced = false;
      while (frame[1] < children.length) {
        const w = children[frame[1]];
        frame[1]++;
        if (!index.has(w)) {
          work.push([w, 0]);
          advanced = true;
          break;
        } else if (onStack.has(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
        }
      }
      if (advanced) continue;
      // v is finished
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1][0];
        lowlink.set(parent, Math.min(lowlink.get(parent)!, lowlink.get(v)!));
      }
      if (lowlink.get(v) === index.get(v)) {
        const component: string[] = [];
        for (;;) {
          const w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
          if (w === v) break;
        }
        if (component.length > 1) {
          component.sort();
          components.push(component);
        }
      }
    }
  }

  components.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return components;
}

/**
 * Project the canonical `.coderef/` artifacts of `projectRoot` to file-level
 * MapData. Throws MapProjectionError when graph.json is absent — the caller
 * (CLI) owns the scan-if-absent decision; this module only projects.
 */
export function projectMapData(projectRoot: string, options: ProjectMapDataOptions = {}): MapData {
  const elementCap = options.elementCap ?? ELEMENT_CAP_DEFAULT;
  const hotspotCap = options.hotspotCap ?? HOTSPOT_CAP_DEFAULT;
  const cycleCap = options.cycleCap ?? CYCLE_CAP_DEFAULT;

  const coderefDir = path.join(projectRoot, '.coderef');
  const graphPath = path.join(coderefDir, 'graph.json');
  const indexPath = path.join(coderefDir, 'index.json');
  const hotspotsPath = path.join(coderefDir, 'intelligence', 'hotspots.json');

  if (!fs.existsSync(graphPath)) {
    throw new MapProjectionError(
      `Missing ${graphPath}. Run the scan first (coderef map runs it automatically; ` +
      `over MCP, run the coderef-map CLI or populate pipeline).`,
    );
  }

  const warnings: string[] = [];
  let graph: any;
  try {
    graph = readJson(graphPath);
  } catch (err: any) {
    throw new MapProjectionError(`Unreadable graph.json: ${err.message}`);
  }
  const graphNodes: any[] = Array.isArray(graph.nodes) ? graph.nodes : [];
  const graphEdges: any[] = Array.isArray(graph.edges) ? graph.edges : [];

  // ---- node identity: file paths -------------------------------------------
  const nodeFile = new Map<string, string>(); // graph node id -> relative file
  const fileLayerVotes = new Map<string, Map<string, number>>();
  for (const n of graphNodes) {
    if (!n || !n.id || !n.file) continue;
    const file = normalizeSlashes(String(n.file));
    nodeFile.set(n.id, file);
    const layer = n.metadata && n.metadata.layer ? String(n.metadata.layer) : undefined;
    if (layer) {
      let votes = fileLayerVotes.get(file);
      if (!votes) {
        votes = new Map<string, number>();
        fileLayerVotes.set(file, votes);
      }
      votes.set(layer, (votes.get(layer) || 0) + 1);
    }
  }

  // ---- file-level edge aggregation (resolved edges only) -------------------
  // The same walk feeds the metrics block's per-file unresolved/ambiguous
  // tallies (P4) — the only per-file resolution signal (validation-report.json
  // is repo-level only).
  const unresolvedCounts = new Map<string, { unresolved: number; ambiguous: number }>();
  const edgeAgg = new Map<string, MapEdge>();
  let resolvedEdgeCount = 0;
  for (const e of graphEdges) {
    if (!e) continue;
    if ((e.resolutionStatus === 'unresolved' || e.resolutionStatus === 'ambiguous') && e.sourceId) {
      const unresolvedSourceFile = nodeFile.get(e.sourceId);
      if (unresolvedSourceFile) {
        let counts = unresolvedCounts.get(unresolvedSourceFile);
        if (!counts) {
          counts = { unresolved: 0, ambiguous: 0 };
          unresolvedCounts.set(unresolvedSourceFile, counts);
        }
        if (e.resolutionStatus === 'unresolved') counts.unresolved++;
        else counts.ambiguous++;
      }
    }
    if (e.resolutionStatus !== 'resolved' || !e.sourceId || !e.targetId) continue;
    resolvedEdgeCount++;
    const sourceFile = nodeFile.get(e.sourceId);
    const targetFile = nodeFile.get(e.targetId);
    if (!sourceFile || !targetFile || sourceFile === targetFile) continue;
    const key = sourceFile + ' ' + targetFile;
    let agg = edgeAgg.get(key);
    if (!agg) {
      agg = { source: sourceFile, target: targetFile, weight: 0, kinds: {} };
      edgeAgg.set(key, agg);
    }
    agg.weight++;
    const kind = String(e.relationship || 'unknown');
    agg.kinds[kind] = (agg.kinds[kind] || 0) + 1;
  }
  const edges = Array.from(edgeAgg.values()).sort((a, b) =>
    a.source === b.source
      ? (a.target < b.target ? -1 : 1)
      : (a.source < b.source ? -1 : 1),
  );

  // ---- per-edge evidence (same raw edges, same skip rules) ------------------
  if (options.edgeEvidence !== false) {
    const evidence = computeEdgeEvidence(graphEdges, nodeFile, {
      ...(options.evidenceSampleCap !== undefined ? { sampleCap: options.evidenceSampleCap } : {}),
    });
    for (const e of edges) {
      const ev = evidence.byPair.get(e.source + ' ' + e.target);
      if (ev) e.evidence = ev;
    }
    warnings.push(...evidence.warnings);
  }

  // ---- elements per file ----------------------------------------------------
  // The same walk feeds the metrics block's per-file headerStatus tallies
  // (P4). Undefined when index.json is absent/unreadable — the documentation
  // family degrades to no-data, never a false zero.
  const fileElements = new Map<string, MapElement[]>();
  let headerTallies: Map<string, Map<string, number>> | undefined;
  let elementCount = 0;
  let indexUsable = false;
  if (fs.existsSync(indexPath)) {
    try {
      const index = readJson(indexPath);
      const elements: any[] = Array.isArray(index.elements) ? index.elements : [];
      headerTallies = new Map();
      for (const el of elements) {
        if (!el || !el.file || !el.name) continue;
        const file = normalizeSlashes(String(el.file));
        let list = fileElements.get(file);
        if (!list) {
          list = [];
          fileElements.set(file, list);
        }
        list.push({
          name: String(el.name),
          type: String(el.type || 'unknown'),
          line: Number(el.line || 0),
          exported: el.exported === true ? true : undefined,
        });
        elementCount++;
        const status = String(el.headerStatus || 'missing');
        let tally = headerTallies.get(file);
        if (!tally) {
          tally = new Map();
          headerTallies.set(file, tally);
        }
        tally.set(status, (tally.get(status) || 0) + 1);
      }
      indexUsable = true;
    } catch (err: any) {
      headerTallies = undefined;
      warnings.push(`index.json unreadable (${err.message}); element detail degraded to graph nodes`);
    }
  } else {
    warnings.push('index.json absent; element detail degraded to graph nodes');
  }
  if (!indexUsable) {
    // Fallback: derive element detail from graph nodes themselves.
    for (const n of graphNodes) {
      if (!n || !n.file || !n.name || String(n.id).startsWith('@File/')) continue;
      const file = normalizeSlashes(String(n.file));
      let list = fileElements.get(file);
      if (!list) {
        list = [];
        fileElements.set(file, list);
      }
      list.push({ name: String(n.name), type: String(n.type || 'unknown'), line: Number(n.line || 0) });
      elementCount++;
    }
  }

  // ---- node assembly --------------------------------------------------------
  const allFiles = new Set<string>();
  for (const file of nodeFile.values()) allFiles.add(file);
  for (const file of fileElements.keys()) allFiles.add(file);

  const inWeight = new Map<string, number>();
  const outWeight = new Map<string, number>();
  for (const e of edges) {
    outWeight.set(e.source, (outWeight.get(e.source) || 0) + e.weight);
    inWeight.set(e.target, (inWeight.get(e.target) || 0) + e.weight);
  }

  const nodes: MapNode[] = [];
  for (const file of Array.from(allFiles).sort()) {
    const elementsAll = (fileElements.get(file) || []).slice().sort((a, b) => a.line - b.line);
    const votes = fileLayerVotes.get(file);
    let layer: string | undefined;
    if (votes) {
      let best = 0;
      for (const [candidate, count] of Array.from(votes.entries()).sort()) {
        if (count > best) {
          best = count;
          layer = candidate;
        }
      }
    }
    const iw = inWeight.get(file) || 0;
    const ow = outWeight.get(file) || 0;
    nodes.push({
      id: file,
      label: path.posix.basename(file),
      dir: path.posix.dirname(file) === '.' ? '' : path.posix.dirname(file),
      elementCount: elementsAll.length,
      elements: elementsAll.slice(0, elementCap),
      elementsTruncated: elementsAll.length > elementCap,
      layer,
      inWeight: iw,
      outWeight: ow,
      hotspotScore: iw + ow,
    });
  }

  // ---- overlays --------------------------------------------------------------
  const hotspotEnrichment = new Map<string, { elementInDegree: number; maxComplexity: number }>();
  if (fs.existsSync(hotspotsPath)) {
    try {
      const intel = readJson(hotspotsPath);
      const data: any[] = Array.isArray(intel && intel.data) ? intel.data : [];
      for (const row of data) {
        if (!row || !row.file) continue;
        const file = normalizeSlashes(String(row.file));
        const cur = hotspotEnrichment.get(file) || { elementInDegree: 0, maxComplexity: 0 };
        cur.elementInDegree += Number(row.inDegree || 0);
        cur.maxComplexity = Math.max(cur.maxComplexity, Number(row.complexity || 0));
        hotspotEnrichment.set(file, cur);
      }
    } catch (err: any) {
      warnings.push(`intelligence/hotspots.json unreadable (${err.message}); hotspot enrichment skipped`);
    }
  } else {
    warnings.push('intelligence/hotspots.json absent; hotspot overlay uses graph weights only');
  }

  const hotspots: MapHotspot[] = nodes
    .filter(n => n.hotspotScore > 0)
    .slice()
    .sort((a, b) => b.hotspotScore - a.hotspotScore || (a.id < b.id ? -1 : 1))
    .slice(0, hotspotCap)
    .map(n => {
      const enrich = hotspotEnrichment.get(n.id);
      const spot: MapHotspot = { file: n.id, score: n.hotspotScore };
      if (enrich) {
        spot.elementInDegree = enrich.elementInDegree;
        spot.maxComplexity = enrich.maxComplexity;
      }
      return spot;
    });

  const cycles = fileCycles(nodes.map(n => n.id), edges).slice(0, cycleCap);

  const analytics =
    options.analytics === false
      ? undefined
      : computeGraphAnalytics(nodes.map(n => n.id), edges);

  // ---- declared-vs-detected drift (after analytics — needs assignments) ------
  let drift: MapLayerDrift | undefined;
  if (options.layerDrift !== false) {
    let layersSpec: LayersSpec | undefined;
    if (options.layersPath) {
      try {
        const spec = readJson(options.layersPath);
        const layerIds = Array.isArray(spec && spec.layers)
          ? spec.layers.map((l: any) => String((l && l.id) || '')).filter(Boolean)
          : [];
        const rules = (spec && spec.dependency_rules) || {};
        layersSpec = {
          layerIds,
          entryLayers: Array.isArray(rules.entry_layers) ? rules.entry_layers.map(String) : [],
          leafLayers: Array.isArray(rules.leaf_layers) ? rules.leaf_layers.map(String) : [],
        };
      } catch (err: any) {
        warnings.push(`layers spec unreadable (${err.message}); drift computed without a spec`);
      }
    }
    drift = computeLayerDrift(nodes, edges, analytics ? analytics.assignments : undefined, layersSpec);
    warnings.push(...drift.warnings);
  }

  // ---- engineering metrics (independent of the analytics block) --------------
  let metrics: MapMetrics | undefined;
  if (options.metrics !== false) {
    metrics = computeEngineeringMetrics(
      nodes.map(n => ({ id: n.id, elementCount: n.elementCount })),
      edges,
      headerTallies,
      unresolvedCounts,
    );
    warnings.push(...metrics.warnings);
  }

  const projectPath = normalizeSlashes(path.resolve(projectRoot));
  return {
    meta: {
      schemaVersion: '1.4.0',
      projectPath,
      repoName: path.basename(projectPath),
      generatedAt: new Date().toISOString(),
      source: {
        nodeCount: graphNodes.length,
        edgeCount: graphEdges.length,
        resolvedEdgeCount,
        elementCount,
      },
      warnings,
    },
    nodes,
    edges,
    overlays: { hotspots, cycles },
    ...(analytics ? { analytics } : {}),
    ...(drift ? { drift } : {}),
    ...(metrics ? { metrics } : {}),
  };
}
