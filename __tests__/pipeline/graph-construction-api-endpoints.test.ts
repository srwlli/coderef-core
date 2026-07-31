/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-graph-construction-api-endpoints-test
 */

/**
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 Phase 2 (REC-002).
 *
 * Endpoints as first-class graph nodes. The invariants under test are the ones
 * that decide whether the graph can TELL THE TRUTH about an HTTP surface:
 *
 *   - an endpoint NOBODY calls is still present (the orphan case — the single
 *     most valuable thing this subsystem reports, and the case an edge-only
 *     design makes unrepresentable);
 *   - a client call that matches nothing is recorded UNRESOLVED, never dropped,
 *     and says WHICH way it failed (missing path vs unserved verb);
 *   - a directed walk crosses the network boundary end to end;
 *   - none of it perturbs the element/import/call graph that existed before.
 */

import { describe, expect, it } from 'vitest';
import { constructGraph, collectEndpoints } from '../../src/pipeline/graph-builder.js';
import { CanonicalGraphQuery } from '../../src/query/canonical-graph.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import type { RouteFact, FrontendCallFact } from '../../src/pipeline/extractors/route-extractor.js';

const ROOT = '/tmp/api';

function emptyGraph(): ExportedGraph {
  return {
    version: '1.0.0',
    exportedAt: 0,
    nodes: [],
    edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
  };
}

function makeState(
  routes: RouteFact[] = [],
  frontendCalls: FrontendCallFact[] = [],
): PipelineState {
  return {
    projectPath: ROOT,
    files: new Map([['ts', [`${ROOT}/src/client.ts`]]]),
    elements: [
      {
        type: 'function',
        name: 'loadUsers',
        file: `${ROOT}/src/client.ts`,
        line: 3,
        codeRefId: '@Fn/src/client.ts#loadUsers:3',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    routes,
    frontendCalls,
    graph: emptyGraph(),
    sources: new Map(),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 1, relationshipsExtracted: 0 },
  } as unknown as PipelineState;
}

function route(
  path: string,
  methods: string[],
  framework: RouteFact['route']['framework'],
  file: string,
): RouteFact {
  return { name: 'handler', file: `${ROOT}/${file}`, line: 0, route: { path, methods, framework } };
}

function call(path: string, method: string, line: number, file = 'src/client.ts'): FrontendCallFact {
  return { path, method, file: `${ROOT}/${file}`, line, callType: 'fetch', confidence: 100 };
}

const edgesOfKind = (g: ExportedGraph, kind: string) =>
  g.edges.filter(e => e.relationship === kind);

describe('endpoint nodes (REC-002)', () => {
  it('one route with two methods becomes TWO endpoint nodes (RFC 9110 method separation)', () => {
    const graph = constructGraph(makeState([
      route('/api/users', ['GET', 'POST'], 'express', 'server/users.ts'),
    ]));
    const endpoints = graph.nodes.filter(n => n.type === 'endpoint');
    expect(endpoints.map(n => n.id).sort()).toEqual([
      '@Endpoint/api/users#GET',
      '@Endpoint/api/users#POST',
    ]);
  });

  it('two files serving the same endpoint MERGE into one node, keeping both handlers', () => {
    // Not tidiness — two handlers for one endpoint is a real condition a reader
    // needs to see. Hiding one would make the graph lie about the surface.
    const graph = constructGraph(makeState([
      route('/api/users', ['GET'], 'express', 'server/a.ts'),
      route('/api/users', ['GET'], 'express', 'server/b.ts'),
    ]));
    const endpoints = graph.nodes.filter(n => n.type === 'endpoint');
    expect(endpoints).toHaveLength(1);
    expect((endpoints[0].metadata as any).handlers).toHaveLength(2);
    expect(edgesOfKind(graph, 'serves_endpoint')).toHaveLength(2);
  });

  it('endpoint nodes carry NO file and NO line (they are not located in source)', () => {
    const graph = constructGraph(makeState([
      route('/api/users', ['GET'], 'express', 'server/users.ts'),
    ]));
    const endpoint = graph.nodes.find(n => n.type === 'endpoint')!;
    expect(endpoint.file).toBeUndefined();
    expect(endpoint.line).toBeUndefined();
    // ...which is exactly what keeps GI-6 (name,file,line duplicate identity)
    // from ever seeing them.
  });

  it('a route file with no extracted elements still gets a file-grain node (AC-02)', () => {
    const graph = constructGraph(makeState([
      route('/api/orphan', ['GET'], 'flask', 'server/standalone.py'),
    ]));
    expect(graph.nodes.some(n => n.id === '@File/server/standalone.py')).toBe(true);
  });
});

describe('the orphan case — an endpoint nobody calls', () => {
  it('is PRESENT in the graph with a handler and zero clients', () => {
    const graph = constructGraph(makeState([
      route('/api/forgotten', ['GET'], 'express', 'server/forgotten.ts'),
    ]));
    const endpointId = '@Endpoint/api/forgotten#GET';
    expect(graph.nodes.some(n => n.id === endpointId)).toBe(true);
    expect(edgesOfKind(graph, 'serves_endpoint').some(e => e.sourceId === endpointId)).toBe(true);
    expect(edgesOfKind(graph, 'calls_endpoint').some(e => e.targetId === endpointId)).toBe(false);
  });

  it('is reachable by query — callersOf(endpoint) returns empty, which is answerable', () => {
    const graph = constructGraph(makeState([
      route('/api/forgotten', ['GET'], 'express', 'server/forgotten.ts'),
    ]));
    const query = new CanonicalGraphQuery(graph);
    const resolution = query.resolve('@Endpoint/api/forgotten#GET');
    expect(resolution.nodes).toHaveLength(1);
    expect(query.callersOf(resolution)).toEqual([]);
  });
});

describe('client calls — recorded, never dropped', () => {
  it('a matching call resolves to the endpoint node', () => {
    const graph = constructGraph(makeState(
      [route('/api/users/:id', ['GET'], 'express', 'server/users.ts')],
      [call('/api/users/{id}', 'GET', 12)],
    ));
    const edge = edgesOfKind(graph, 'calls_endpoint')[0];
    expect(edge.resolutionStatus).toBe('resolved');
    expect(edge.targetId).toBe('@Endpoint/api/users/{}#GET');
    expect(edge.sourceId).toBe('@File/src/client.ts');
    expect(edge.confidence).toBe('exact');
  });

  it('an unknown path is unresolved with reason endpoint_not_in_project (404-shaped)', () => {
    const graph = constructGraph(makeState([], [call('/api/nope', 'GET', 4)]));
    const edge = edgesOfKind(graph, 'calls_endpoint')[0];
    expect(edge.resolutionStatus).toBe('unresolved');
    expect(edge.reason).toBe('endpoint_not_in_project');
    expect(edge.targetId).toBeUndefined(); // AC-05: no synthetic placeholder
  });

  it('a known path with an unserved verb says so distinctly (405-shaped)', () => {
    // Both are unresolved, but they send a reader to completely different
    // places: never-built vs built-and-called-wrong.
    const graph = constructGraph(makeState(
      [route('/api/users', ['GET'], 'express', 'server/users.ts')],
      [call('/api/users', 'DELETE', 9)],
    ));
    const edge = edgesOfKind(graph, 'calls_endpoint')[0];
    expect(edge.resolutionStatus).toBe('unresolved');
    expect(edge.reason).toBe('endpoint_method_not_served');
  });

  it('an absolute URL is external — a classification, not a failure', () => {
    const graph = constructGraph(makeState([], [call('http://localhost:11434/api/generate', 'POST', 7)]));
    const edge = edgesOfKind(graph, 'calls_endpoint')[0];
    expect(edge.resolutionStatus).toBe('external');
    expect(edge.reason).toBe('absolute_url_external_origin');
    expect(edge.confidence).toBe('strong');
  });

  it('an interpolated origin stays unresolved rather than being forced to match', () => {
    const graph = constructGraph(makeState(
      [route('/api/embeddings', ['POST'], 'express', 'server/embed.ts')],
      [call('{id}/api/embeddings', 'POST', 11)],
    ));
    const edge = edgesOfKind(graph, 'calls_endpoint')[0];
    expect(edge.resolutionStatus).toBe('unresolved');
    expect(edge.reason).toBe('client_path_origin_unresolved');
  });

  it('matching a method-less route is labelled heuristic, not silently trusted', () => {
    const graph = constructGraph(makeState(
      [route('/api/thing', [], 'express', 'server/thing.ts')],
      [call('/api/thing', 'PATCH', 5)],
    ));
    const edge = edgesOfKind(graph, 'calls_endpoint')[0];
    expect(edge.resolutionStatus).toBe('resolved');
    expect(edge.targetId).toBe('@Endpoint/api/thing#ANY');
    expect(edge.reason).toBe('endpoint_method_undeclared_by_server');
    expect(edge.confidence).toBe('heuristic');
  });

  it('EVERY frontend call yields exactly one edge, whatever its disposition', () => {
    const calls = [
      call('/api/users', 'GET', 1),
      call('/api/nope', 'GET', 2),
      call('https://vendor.example/v1/x', 'GET', 3),
      call('{id}/api/y', 'GET', 4),
    ];
    const graph = constructGraph(makeState(
      [route('/api/users', ['GET'], 'express', 'server/users.ts')],
      calls,
    ));
    expect(edgesOfKind(graph, 'calls_endpoint')).toHaveLength(calls.length);
  });
});

describe('crossing the network boundary', () => {
  const build = () => constructGraph(makeState(
    [route('/api/users/:id', ['GET'], 'express', 'server/users.ts')],
    [call('/api/users/{id}', 'GET', 12)],
  ));

  it('path_between(client, handler) walks client -> endpoint -> handler', () => {
    const query = new CanonicalGraphQuery(build());
    const result = query.shortestPath(
      query.resolve('@File/src/client.ts'),
      query.resolve('@File/server/users.ts'),
    );
    expect(result.found).toBe(true);
    expect(result.path.map(n => n.id)).toEqual([
      '@File/src/client.ts',
      '@Endpoint/api/users/{}#GET',
      '@File/server/users.ts',
    ]);
  });

  it('dependentsOf(handler) surfaces the CLIENT, not just importing modules', () => {
    const query = new CanonicalGraphQuery(build());
    const dependents = query.dependentsOf(query.resolve('@File/server/users.ts'));
    expect(dependents.map(n => n.id)).toContain('@File/src/client.ts');
  });

  it('callersOf(endpoint) returns its clients', () => {
    const query = new CanonicalGraphQuery(build());
    const callers = query.callersOf(query.resolve('@Endpoint/api/users/{}#GET'));
    expect(callers.map(n => n.id)).toEqual(['@File/src/client.ts']);
  });

  it('an unresolved client call is NOT traversed (only resolved edges are indexed)', () => {
    const graph = constructGraph(makeState([], [call('/api/nope', 'GET', 4)]));
    const query = new CanonicalGraphQuery(graph);
    // The edge exists in graph.edges for reporting...
    expect(edgesOfKind(graph, 'calls_endpoint')).toHaveLength(1);
    // ...but a walk from the caller finds nothing, because absence of a target
    // is no-data, not a fabricated hop.
    expect(query.dependenciesOf(query.resolve('@File/src/client.ts'))).toEqual([]);
  });
});

describe('no perturbation of the pre-existing graph', () => {
  it('a project with no routes and no calls produces a byte-identical graph', () => {
    const withNothing = constructGraph(makeState());
    const withEmptyArrays = constructGraph(makeState([], []));
    expect({ ...withNothing, exportedAt: 0 }).toStrictEqual({ ...withEmptyArrays, exportedAt: 0 });
    expect(withNothing.nodes.some(n => n.type === 'endpoint')).toBe(false);
  });

  it('adding routes leaves element and file-grain nodes untouched', () => {
    const before = constructGraph(makeState());
    const after = constructGraph(makeState(
      [route('/api/users', ['GET'], 'express', 'server/users.ts')],
      [call('/api/users', 'GET', 12)],
    ));
    const nonEndpoint = (g: ExportedGraph) =>
      g.nodes.filter(n => n.type !== 'endpoint' && n.id !== '@File/server/users.ts');
    expect(nonEndpoint(after)).toStrictEqual(nonEndpoint(before));
  });
});

describe('invariants (AC-02 / AC-05 / AC-08 / AC-10)', () => {
  const state = () => makeState(
    [
      route('/api/users/:id', ['GET', 'POST'], 'express', 'server/users.ts'),
      route('/api/files/[...path]', ['GET'], 'sveltekit', 'src/routes/api/files/[...path]/+server.ts'),
      route('/api/orphan', ['DELETE'], 'flask', 'server/orphan.py'),
    ],
    [
      call('/api/users/{id}', 'GET', 12),
      call('/api/users/{id}', 'PUT', 13),
      call('https://vendor.example/v1/x', 'GET', 14),
    ],
  );

  it('AC-02 — every resolved edge has both endpoints in graph.nodes', () => {
    const graph = constructGraph(state());
    const ids = new Set(graph.nodes.map(n => n.id));
    for (const edge of graph.edges) {
      if (edge.resolutionStatus !== 'resolved') continue;
      expect(ids.has(edge.sourceId!), `missing source ${edge.sourceId}`).toBe(true);
      expect(ids.has(edge.targetId!), `missing target ${edge.targetId}`).toBe(true);
    }
  });

  it('AC-05 — no non-resolved edge carries a targetId', () => {
    for (const edge of constructGraph(state()).edges) {
      if (edge.resolutionStatus === 'resolved') continue;
      expect(edge.targetId).toBeUndefined();
    }
  });

  it('AC-08 — deterministic across invocations, including node order', () => {
    const s = state();
    const baseline = { ...constructGraph(s), exportedAt: 0 };
    for (let i = 0; i < 25; i++) {
      expect({ ...constructGraph(s), exportedAt: 0 }).toStrictEqual(baseline);
    }
  });

  it('AC-08 — node order is independent of route declaration order', () => {
    const forward = constructGraph(state()).nodes.filter(n => n.type === 'endpoint').map(n => n.id);
    const s = state();
    (s as any).routes = [...(s as any).routes].reverse();
    const reversed = constructGraph(s).nodes.filter(n => n.type === 'endpoint').map(n => n.id);
    expect(reversed).toStrictEqual(forward);
  });

  it('AC-10 — edge ids are unique across the graph', () => {
    const edges = constructGraph(state()).edges;
    expect(new Set(edges.map(e => e.id)).size).toBe(edges.length);
  });

  it('constructGraph does not mutate state.routes / state.frontendCalls (purity)', () => {
    const s = state();
    Object.freeze((s as any).routes);
    Object.freeze((s as any).frontendCalls);
    expect(() => constructGraph(s)).not.toThrow();
  });

  it('collectEndpoints sorts every derived array', () => {
    const records = [...collectEndpoints(state()).values()];
    for (const record of records) {
      expect(record.frameworks).toStrictEqual([...record.frameworks].sort());
      expect(record.declaredMethods).toStrictEqual([...record.declaredMethods].sort());
      expect(record.handlerFiles).toStrictEqual([...record.handlerFiles].sort());
    }
  });
});
