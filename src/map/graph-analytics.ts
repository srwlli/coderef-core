/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-graph-analytics
 * @exports MapCommunity, MapCentralityEntry, MapCouplingEntry, MapDeadCode, MapAnalytics, GraphAnalyticsOptions, isTestLikeFile, computeGraphAnalytics
 * @used_by src/map/project-map-data.ts
 */

/**
 * Graph analytics over the FILE-level map projection
 * (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P1, graphify feedback item #3).
 *
 * PURE function over already-projected nodes/edges — no `.coderef/` reads and
 * no intelligence artifacts, so any-repo universality is inherited from the
 * projection (same constraint as the hotspots/cycles overlays in
 * project-map-data.ts). Deterministic by construction: no Date.now, no
 * Math.random; label propagation and betweenness sampling are index/stride
 * based; every emitted array is sorted with an explicit tie-break.
 *
 * Dead-code output is SURFACES, NOT VERDICTS: zero-in-degree files are
 * candidates for review — entrypoints and externally-consumed modules
 * legitimately have no internal callers.
 */

export interface MapCommunity {
  /** Deterministic id: rank by (size desc, first member asc). */
  id: number;
  size: number;
  /** Sorted member file paths. */
  files: string[];
  /** Dominant top-level directory among members — orientation label. */
  label: string;
}

export interface MapCentralityEntry {
  file: string;
  /** Distinct undirected neighbors. */
  degree: number;
  inDegree: number;
  outDegree: number;
  /** Brandes betweenness (possibly stride-sampled; see betweennessApproximated). */
  betweenness: number;
}

export interface MapCouplingEntry {
  file: string;
  /** Distinct files this file depends on (Ce). */
  efferent: number;
  /** Distinct files depending on this file (Ca). */
  afferent: number;
  /** Ce / (Ce + Ca), rounded to 3 decimals. */
  instability: number;
}

export interface MapDeadCode {
  /** Files with no resolved file-edges at all. */
  isolated: string[];
  /** In-degree 0, out-degree > 0, not entrypoint/test-like. Candidates only. */
  zeroInDegreeCandidates: string[];
  /** Zero-in-degree files excluded by the entrypoint/test heuristics. */
  entrypointExcludedCount: number;
  note: string;
}

export interface MapAnalytics {
  schemaVersion: string;
  /** Total communities BEFORE the communityCap truncation. */
  communityCount: number;
  communities: MapCommunity[];
  /** file -> community id, for EVERY file (viewer color-by needs totality). */
  assignments: Record<string, number>;
  centrality: {
    top: MapCentralityEntry[];
    betweennessApproximated: boolean;
    sampledSources?: number;
  };
  /** Articulation-point files of the undirected file graph, sorted. */
  bridges: string[];
  coupling: { top: MapCouplingEntry[] };
  deadCode: MapDeadCode;
  warnings: string[];
}

export interface GraphAnalyticsOptions {
  /** Max communities listed (assignments always cover all files). Default 50. */
  communityCap?: number;
  /** Max centrality entries. Default 25. */
  centralityTop?: number;
  /** Max bridge files. Default 50. */
  bridgeCap?: number;
  /** Max coupling entries. Default 25. */
  couplingTop?: number;
  /** Max files per dead-code list. Default 200. */
  deadCodeCap?: number;
  /** Run exact betweenness when file count <= this. Default 500. */
  betweennessExactLimit?: number;
  /** Source-sample target for approximate betweenness. Default 200. */
  betweennessSampleTarget?: number;
  /** Label-propagation round cap. Default 10. */
  labelPropagationRounds?: number;
}

interface AnalyticsEdgeInput {
  source: string;
  target: string;
  weight?: number;
}

const DEAD_CODE_NOTE =
  'Zero-in-degree files are dead-code CANDIDATES surfaced for review — entrypoints, ' +
  'dynamically-loaded modules, and externally-consumed APIs legitimately have no ' +
  'internal callers. Surfaces, not verdicts.';

const ENTRYPOINT_BASENAME = /^(index|main|app|server|cli|bin)\.[^.]+$/;
const ENTRYPOINT_SEGMENT = /^(bin|cli|scripts)$/;
const TEST_SEGMENT = /^(__tests__|__mocks__|tests?)$/;

/**
 * Test-like file classification — the single source for the test heuristic
 * (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P4 exports it for the engineering-metrics
 * testLinkage family; never duplicate these regexes).
 */
export function isTestLikeFile(file: string): boolean {
  const segments = file.toLowerCase().split('/');
  const base = segments[segments.length - 1];
  if (base.includes('.test.') || base.includes('.spec.')) return true;
  for (let i = 0; i < segments.length - 1; i++) {
    if (TEST_SEGMENT.test(segments[i])) return true;
  }
  return false;
}

function isEntrypointOrTestLike(file: string): boolean {
  if (isTestLikeFile(file)) return true;
  const segments = file.toLowerCase().split('/');
  const base = segments[segments.length - 1];
  if (ENTRYPOINT_BASENAME.test(base)) return true;
  for (let i = 0; i < segments.length - 1; i++) {
    if (ENTRYPOINT_SEGMENT.test(segments[i])) return true;
  }
  return false;
}

function round(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

/**
 * Compute analytics for a projected file graph. `nodeIds` are the file-node
 * identities; `edgeInputs` the aggregated file edges. Edges whose endpoints
 * are not in `nodeIds` are ignored (defensive — projectMapData never emits
 * them).
 */
export function computeGraphAnalytics(
  nodeIds: string[],
  edgeInputs: AnalyticsEdgeInput[],
  options: GraphAnalyticsOptions = {},
): MapAnalytics {
  const communityCap = options.communityCap ?? 50;
  const centralityTop = options.centralityTop ?? 25;
  const bridgeCap = options.bridgeCap ?? 50;
  const couplingTop = options.couplingTop ?? 25;
  const deadCodeCap = options.deadCodeCap ?? 200;
  const betweennessExactLimit = options.betweennessExactLimit ?? 500;
  const betweennessSampleTarget = options.betweennessSampleTarget ?? 200;
  const lpRounds = options.labelPropagationRounds ?? 10;

  const warnings: string[] = [];
  const ids = Array.from(new Set(nodeIds)).sort();
  const idSet = new Set(ids);

  // ---- adjacency (distinct-neighbor sets + undirected weights) --------------
  const outNb = new Map<string, Set<string>>();
  const inNb = new Map<string, Set<string>>();
  const undirected = new Map<string, Map<string, number>>(); // neighbor -> weight sum
  for (const id of ids) {
    outNb.set(id, new Set());
    inNb.set(id, new Set());
    undirected.set(id, new Map());
  }
  for (const e of edgeInputs) {
    if (!e || !idSet.has(e.source) || !idSet.has(e.target) || e.source === e.target) continue;
    const w = Number(e.weight || 1);
    outNb.get(e.source)!.add(e.target);
    inNb.get(e.target)!.add(e.source);
    const us = undirected.get(e.source)!;
    us.set(e.target, (us.get(e.target) || 0) + w);
    const ut = undirected.get(e.target)!;
    ut.set(e.source, (ut.get(e.source) || 0) + w);
  }
  // Sorted undirected neighbor lists — determinism for DFS/BFS orders.
  const neighbors = new Map<string, string[]>();
  for (const id of ids) {
    neighbors.set(id, Array.from(undirected.get(id)!.keys()).sort());
  }

  // ---- communities: weighted label propagation, in-place, sorted order ------
  const label = new Map<string, number>();
  ids.forEach((id, i) => label.set(id, i));
  for (let round_ = 0; round_ < lpRounds; round_++) {
    let changed = false;
    for (const id of ids) {
      const nbWeights = undirected.get(id)!;
      if (nbWeights.size === 0) continue;
      const votes = new Map<number, number>();
      for (const [nb, w] of nbWeights) {
        const l = label.get(nb)!;
        votes.set(l, (votes.get(l) || 0) + w);
      }
      let bestLabel = label.get(id)!;
      let bestVote = -1;
      for (const [l, v] of Array.from(votes.entries()).sort((a, b) => a[0] - b[0])) {
        if (v > bestVote) {
          bestVote = v;
          bestLabel = l;
        }
      }
      if (bestLabel !== label.get(id)) {
        label.set(id, bestLabel);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const byLabel = new Map<number, string[]>();
  for (const id of ids) {
    const l = label.get(id)!;
    let group = byLabel.get(l);
    if (!group) {
      group = [];
      byLabel.set(l, group);
    }
    group.push(id);
  }
  const groups = Array.from(byLabel.values());
  for (const g of groups) g.sort();
  groups.sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1));
  const assignments: Record<string, number> = {};
  const communities: MapCommunity[] = [];
  groups.forEach((files, rank) => {
    for (const f of files) assignments[f] = rank;
    const dirVotes = new Map<string, number>();
    for (const f of files) {
      const top = f.includes('/') ? f.split('/')[0] : '(root)';
      dirVotes.set(top, (dirVotes.get(top) || 0) + 1);
    }
    let bestDir = '(root)';
    let bestCount = -1;
    for (const [dir, count] of Array.from(dirVotes.entries()).sort()) {
      if (count > bestCount) {
        bestCount = count;
        bestDir = dir;
      }
    }
    communities.push({ id: rank, size: files.length, files, label: bestDir });
  });
  const communityCount = communities.length;
  const communitiesCapped = communities.slice(0, communityCap);
  if (communityCount > communityCap) {
    warnings.push(
      `communities truncated to ${communityCap} of ${communityCount} (communityCap); assignments still cover all files`,
    );
  }

  // ---- centrality: exact degree + (sampled) Brandes betweenness -------------
  const betweenness = new Map<string, number>();
  for (const id of ids) betweenness.set(id, 0);
  let approximated = false;
  let sources = ids;
  if (ids.length > betweennessExactLimit) {
    approximated = true;
    const stride = Math.ceil(ids.length / betweennessSampleTarget);
    sources = ids.filter((_, i) => i % stride === 0);
    warnings.push(
      `betweenness approximated from ${sources.length} of ${ids.length} sources (deterministic stride sampling)`,
    );
  }
  const indexOf = new Map<string, number>();
  ids.forEach((id, i) => indexOf.set(id, i));
  for (const s of sources) {
    // Brandes single-source (unweighted BFS) over the undirected graph.
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();
    sigma.set(s, 1);
    dist.set(s, 0);
    const queue: string[] = [s];
    let qi = 0;
    while (qi < queue.length) {
      const v = queue[qi++];
      stack.push(v);
      for (const w of neighbors.get(v)!) {
        if (!dist.has(w)) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, (sigma.get(w) || 0) + sigma.get(v)!);
          let p = pred.get(w);
          if (!p) {
            p = [];
            pred.set(w, p);
          }
          p.push(v);
        }
      }
    }
    const delta = new Map<string, number>();
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w) || []) {
        const share = (sigma.get(v)! / sigma.get(w)!) * (1 + (delta.get(w) || 0));
        delta.set(v, (delta.get(v) || 0) + share);
      }
      if (w !== s) betweenness.set(w, betweenness.get(w)! + (delta.get(w) || 0));
    }
  }
  const scale = approximated && sources.length > 0 ? ids.length / sources.length : 1;
  const centralityAll: MapCentralityEntry[] = ids.map(id => ({
    file: id,
    degree: neighbors.get(id)!.length,
    inDegree: inNb.get(id)!.size,
    outDegree: outNb.get(id)!.size,
    // Undirected graph: each pair counted twice in Brandes accumulation.
    betweenness: round((betweenness.get(id)! * scale) / 2, 4),
  }));
  const centralityTopList = centralityAll
    .filter(c => c.degree > 0)
    .sort(
      (a, b) =>
        b.degree - a.degree ||
        b.betweenness - a.betweenness ||
        (a.file < b.file ? -1 : 1),
    )
    .slice(0, centralityTop);

  // ---- bridges: articulation points via iterative Tarjan DFS ----------------
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const articulation = new Set<string>();
  let counter = 0;
  for (const root of ids) {
    if (disc.has(root)) continue;
    let rootChildren = 0;
    // Frame: [node, parent, neighborPointer]
    const work: Array<[string, string | null, number]> = [[root, null, 0]];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const v = frame[0];
      if (frame[2] === 0) {
        disc.set(v, counter);
        low.set(v, counter);
        counter++;
      }
      const nbs = neighbors.get(v)!;
      let advanced = false;
      while (frame[2] < nbs.length) {
        const w = nbs[frame[2]];
        frame[2]++;
        if (w === frame[1]) continue; // tree parent (aggregated graph: no parallel edges)
        if (!disc.has(w)) {
          if (v === root) rootChildren++;
          work.push([w, v, 0]);
          advanced = true;
          break;
        }
        low.set(v, Math.min(low.get(v)!, disc.get(w)!));
      }
      if (advanced) continue;
      work.pop();
      const parent = frame[1];
      if (parent !== null) {
        low.set(parent, Math.min(low.get(parent)!, low.get(v)!));
        if (parent !== root && low.get(v)! >= disc.get(parent)!) {
          articulation.add(parent);
        }
      }
    }
    if (rootChildren >= 2) articulation.add(root);
  }
  const bridgesAll = Array.from(articulation).sort();
  const bridges = bridgesAll.slice(0, bridgeCap);
  if (bridgesAll.length > bridgeCap) {
    warnings.push(`bridges truncated to ${bridgeCap} of ${bridgesAll.length} (bridgeCap)`);
  }

  // ---- coupling: distinct-dependency counts + instability -------------------
  const couplingAll: MapCouplingEntry[] = ids.map(id => {
    const efferent = outNb.get(id)!.size;
    const afferent = inNb.get(id)!.size;
    return {
      file: id,
      efferent,
      afferent,
      instability: efferent + afferent === 0 ? 0 : round(efferent / (efferent + afferent), 3),
    };
  });
  const couplingTopList = couplingAll
    .filter(c => c.efferent + c.afferent > 0)
    .sort(
      (a, b) =>
        b.efferent + b.afferent - (a.efferent + a.afferent) || (a.file < b.file ? -1 : 1),
    )
    .slice(0, couplingTop);

  // ---- dead / isolated code (surfaces, not verdicts) ------------------------
  const isolatedAll: string[] = [];
  const candidatesAll: string[] = [];
  let entrypointExcludedCount = 0;
  for (const id of ids) {
    const inDeg = inNb.get(id)!.size;
    const outDeg = outNb.get(id)!.size;
    if (inDeg === 0 && outDeg === 0) {
      isolatedAll.push(id);
    } else if (inDeg === 0 && outDeg > 0) {
      if (isEntrypointOrTestLike(id)) {
        entrypointExcludedCount++;
      } else {
        candidatesAll.push(id);
      }
    }
  }
  const isolated = isolatedAll.slice(0, deadCodeCap);
  if (isolatedAll.length > deadCodeCap) {
    warnings.push(`isolated files truncated to ${deadCodeCap} of ${isolatedAll.length} (deadCodeCap)`);
  }
  const zeroInDegreeCandidates = candidatesAll.slice(0, deadCodeCap);
  if (candidatesAll.length > deadCodeCap) {
    warnings.push(
      `zero-in-degree candidates truncated to ${deadCodeCap} of ${candidatesAll.length} (deadCodeCap)`,
    );
  }

  return {
    schemaVersion: '1.0.0',
    communityCount,
    communities: communitiesCapped,
    assignments,
    centrality: {
      top: centralityTopList,
      betweennessApproximated: approximated,
      ...(approximated ? { sampledSources: sources.length } : {}),
    },
    bridges,
    coupling: { top: couplingTopList },
    deadCode: {
      isolated,
      zeroInDegreeCandidates,
      entrypointExcludedCount,
      note: DEAD_CODE_NOTE,
    },
    warnings,
  };
}
