/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-api-surface
 * @exports MapApiEndpoint, MapApiUnmatchedCall, MapApiNetworkEdge, MapApiSummary, MapApiSurface, ApiSurfaceOptions, computeApiSurface
 * @used_by src/map/project-map-data.ts
 */

/**
 * API-surface projection — folds the endpoint nodes and endpoint edges that
 * graph-builder emits (WO-API-SURFACE-MAPPING-...-001 P2) into the file-grain
 * shape the map viewer and the MCP tools consume.
 *
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 Phase 3.
 *
 * PURE, like every other map projection module: no filesystem, no clock, no
 * randomness. It receives the raw graph arrays and the node->file map that
 * project-map-data has already built, and returns a plain record.
 *
 * WHY THIS BLOCK HAS TO EXIST SEPARATELY. The map's file-edge aggregation keys
 * both endpoints of an edge through `nodeFile`, and endpoint nodes deliberately
 * carry NO file (an endpoint is not located in source). So `calls_endpoint` and
 * `serves_endpoint` edges are skipped by that walk — correctly, since the file
 * graph must keep meaning "module depends on module". The consequence is that
 * without this block the single most useful fact in the whole subsystem — WHICH
 * FILE calls WHICH HANDLER over HTTP — would be present in graph.json and
 * invisible in the map. `networkEdges` restores exactly that, kept separate from
 * `edges` so a consumer always knows which hops cross a process boundary.
 *
 * SURFACES, NOT VERDICTS. Nothing here says an endpoint is wrong.
 *   - `orphaned` means NO RESOLVED CALLER WAS FOUND IN THIS REPO. For a public
 *     API, a mobile client, or a server-to-server caller (RISK-008: the
 *     frontend-call gate only sees browser-reachable extensions), that is the
 *     expected and correct state — not dead code.
 *   - `unmatchedCalls` records every client call that did not bind, WITH the
 *     reason it did not, so a reader can tell a never-built endpoint from a
 *     wrong-verb call from an unknowable interpolated base URL.
 *   - Absence of the whole block means the producer never ran. It never means
 *     the project has no API.
 */

import { normalizeSlashes } from '../utils/path-normalize.js';

export interface MapApiEndpoint {
  /** Canonical endpoint node id, `@Endpoint/<path>#<METHOD>`. */
  id: string;
  /** Canonical path with parameter names erased (`/api/users/{}`). */
  path: string;
  /** Uppercase HTTP method, or `ANY` when the producer declared none. */
  method: string;
  /** Frameworks that declared it. */
  frameworks: string[];
  /** Files serving it (project-relative, slash-normalized). */
  handlers: string[];
  /** Files with a RESOLVED call to it. */
  callers: string[];
  /**
   * True when no resolved caller was found IN THIS REPO. A surface, not a
   * verdict — see the module note.
   */
  orphaned: boolean;
}

export interface MapApiUnmatchedCall {
  /** Calling file (project-relative). */
  file: string;
  line: number;
  /** Canonical path the call resolves to, as far as it could be canonicalized. */
  path: string;
  method: string;
  /** Raw path as written, before canonicalization. Kept for a reader's eyes. */
  rawPath?: string;
  /** `unresolved` or `external`. */
  status: string;
  /**
   * WHY it did not bind:
   *   endpoint_not_in_project        404-shaped — the path is served nowhere
   *   endpoint_method_not_served     405-shaped — path served, this verb is not
   *   client_path_origin_unresolved  `${baseUrl}` interpolation; origin unknown
   *   absolute_url_external_origin   a different authority (RFC 3986 s3.2)
   */
  reason: string;
  callType?: string;
  /** Detector confidence: 100 static string, 80 template literal. */
  confidence?: number;
}

/**
 * A file-to-file hop that crosses the network boundary. Deliberately NOT merged
 * into MapData.edges: a module import and an HTTP request are different kinds of
 * coupling, and collapsing them would hide a process boundary from every
 * consumer that reads the file graph.
 */
export interface MapApiNetworkEdge {
  /** Calling file. */
  source: string;
  /** Handler file. */
  target: string;
  /** Endpoint node ids this hop travels through. */
  endpoints: string[];
}

export interface MapApiSummary {
  endpointCount: number;
  /** Endpoints with no resolved caller in this repo. */
  orphanedCount: number;
  /** Client calls that bound to an endpoint node. */
  resolvedCallCount: number;
  /** Client calls that did not bind (any reason), including external. */
  unmatchedCallCount: number;
  /** Endpoints per declaring framework. */
  byFramework: Record<string, number>;
  /** Unmatched calls per reason. */
  byReason: Record<string, number>;
}

export interface MapApiSurface {
  endpoints: MapApiEndpoint[];
  unmatchedCalls: MapApiUnmatchedCall[];
  networkEdges: MapApiNetworkEdge[];
  summary: MapApiSummary;
  warnings: string[];
}

export interface ApiSurfaceOptions {
  /** Max unmatched-call entries retained (default 200). Truncation is declared. */
  unmatchedCap?: number;
}

const UNMATCHED_CAP_DEFAULT = 200;

/**
 * Fold endpoint nodes + endpoint edges into the API-surface block.
 *
 * @param graphNodes Raw `graph.json` nodes.
 * @param graphEdges Raw `graph.json` edges.
 * @param nodeFile   Graph-node-id -> project-relative file, as project-map-data
 *                   already built it. Endpoint nodes are absent from it by
 *                   design (they have no file), which is why this module
 *                   resolves their file endpoints through the edges instead.
 */
export function computeApiSurface(
  graphNodes: any[],
  graphEdges: any[],
  nodeFile: ReadonlyMap<string, string>,
  options: ApiSurfaceOptions = {},
): MapApiSurface {
  const unmatchedCap = options.unmatchedCap ?? UNMATCHED_CAP_DEFAULT;
  const warnings: string[] = [];

  // ---- endpoint nodes -------------------------------------------------------
  const byId = new Map<string, MapApiEndpoint>();
  for (const node of graphNodes) {
    if (!node || node.type !== 'endpoint' || !node.id) continue;
    const meta = (node.metadata ?? {}) as Record<string, unknown>;
    byId.set(String(node.id), {
      id: String(node.id),
      path: String(meta.path ?? ''),
      method: String(meta.method ?? ''),
      frameworks: Array.isArray(meta.frameworks) ? meta.frameworks.map(String) : [],
      handlers: [],
      callers: [],
      orphaned: true,
    });
  }

  // ---- serves_endpoint: endpoint -> handler file ----------------------------
  // The handler file comes from the EDGE, not from the node, because an endpoint
  // node has no file of its own.
  for (const edge of graphEdges) {
    if (!edge || edge.relationship !== 'serves_endpoint') continue;
    const endpoint = byId.get(String(edge.sourceId ?? ''));
    if (!endpoint) continue;
    const file = edge.targetId ? nodeFile.get(String(edge.targetId)) : undefined;
    const resolved = file ?? (edge.sourceLocation?.file
      ? normalizeSlashes(String(edge.sourceLocation.file))
      : undefined);
    if (resolved && !endpoint.handlers.includes(resolved)) endpoint.handlers.push(resolved);
  }

  // ---- calls_endpoint -------------------------------------------------------
  const networkAgg = new Map<string, MapApiNetworkEdge>();
  const unmatchedCalls: MapApiUnmatchedCall[] = [];
  const byReason: Record<string, number> = {};
  let resolvedCallCount = 0;
  let unmatchedTotal = 0;

  for (const edge of graphEdges) {
    if (!edge || edge.relationship !== 'calls_endpoint') continue;
    const evidence = (edge.evidence ?? {}) as Record<string, unknown>;
    const callerFile = edge.sourceId ? nodeFile.get(String(edge.sourceId)) : undefined;
    const file = callerFile ?? (edge.sourceLocation?.file
      ? normalizeSlashes(String(edge.sourceLocation.file))
      : '');

    if (edge.resolutionStatus === 'resolved' && edge.targetId) {
      resolvedCallCount++;
      const endpoint = byId.get(String(edge.targetId));
      if (!endpoint) {
        // A resolved edge pointing at a node that is not in graph.nodes would be
        // an AC-02 violation upstream. Declare it rather than dropping it.
        warnings.push(
          `api-surface: calls_endpoint edge ${edge.id} targets unknown endpoint ${edge.targetId}`,
        );
        continue;
      }
      endpoint.orphaned = false;
      if (file && !endpoint.callers.includes(file)) endpoint.callers.push(file);

      for (const handler of endpoint.handlers) {
        if (!file || file === handler) continue;
        const key = `${file} ${handler}`;
        let agg = networkAgg.get(key);
        if (!agg) {
          agg = { source: file, target: handler, endpoints: [] };
          networkAgg.set(key, agg);
        }
        if (!agg.endpoints.includes(endpoint.id)) agg.endpoints.push(endpoint.id);
      }
      continue;
    }

    // Unmatched — recorded with its reason, never dropped.
    const reason = String(edge.reason ?? 'unknown');
    byReason[reason] = (byReason[reason] ?? 0) + 1;
    unmatchedTotal++;
    if (unmatchedCalls.length < unmatchedCap) {
      unmatchedCalls.push({
        file,
        line: typeof edge.sourceLocation?.line === 'number' ? edge.sourceLocation.line : 0,
        path: String(evidence.endpointPath ?? ''),
        method: String(evidence.method ?? ''),
        ...(evidence.rawPath !== undefined ? { rawPath: String(evidence.rawPath) } : {}),
        status: String(edge.resolutionStatus ?? ''),
        reason,
        ...(evidence.callType !== undefined ? { callType: String(evidence.callType) } : {}),
        ...(typeof evidence.detectionConfidence === 'number'
          ? { confidence: evidence.detectionConfidence }
          : {}),
      });
    }
  }

  if (unmatchedTotal > unmatchedCalls.length) {
    // Never let a cap read as completeness.
    warnings.push(
      `api-surface: unmatchedCalls truncated to ${unmatchedCalls.length} of ${unmatchedTotal} ` +
      `(unmatchedCap=${unmatchedCap}); summary counts are complete.`,
    );
  }

  // ---- deterministic ordering ----------------------------------------------
  const endpoints = Array.from(byId.values()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const endpoint of endpoints) {
    endpoint.handlers.sort();
    endpoint.callers.sort();
  }
  const networkEdges = Array.from(networkAgg.values()).sort((a, b) =>
    a.source === b.source
      ? (a.target < b.target ? -1 : a.target > b.target ? 1 : 0)
      : (a.source < b.source ? -1 : 1),
  );
  for (const netEdge of networkEdges) netEdge.endpoints.sort();
  unmatchedCalls.sort((a, b) =>
    a.file === b.file ? a.line - b.line : (a.file < b.file ? -1 : 1),
  );

  const byFramework: Record<string, number> = {};
  for (const endpoint of endpoints) {
    for (const framework of endpoint.frameworks) {
      byFramework[framework] = (byFramework[framework] ?? 0) + 1;
    }
  }

  return {
    endpoints,
    unmatchedCalls,
    networkEdges,
    summary: {
      endpointCount: endpoints.length,
      orphanedCount: endpoints.filter(e => e.orphaned).length,
      resolvedCallCount,
      unmatchedCallCount: unmatchedTotal,
      byFramework,
      byReason,
    },
    warnings,
  };
}
