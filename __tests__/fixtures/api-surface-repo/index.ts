/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability api-surface-fixture-repo
 * @exports CLIENT, HANDLER, ORPHAN_HANDLER, EP_USERS, EP_ORPHAN, graphFixture, writeFixtureRepo, apiSurfaceFixture
 * @used_by __tests__/map/api-surface.test.ts, __tests__/map/dashboard-asset.test.ts, __tests__/map/viewer-asset.test.ts
 */

/**
 * The API-surface fixture repo — ONE definition, shared by every suite that
 * needs a non-empty `api` block.
 *
 * WHY THIS MODULE EXISTS (WO-WIRE-THE-MAPDATA-API-BLOCK-INTO-THE-MAP-001 P1-T2).
 * The host repo serves ZERO endpoints: `.coderef/map/data.json` carries
 * `api.summary.endpointCount === 0` and `networkEdges: []`. Every viewer and
 * dashboard assertion written against the host repo would therefore be
 * `expect(0).toBe(0)` — a DEAD wiring and a CORRECT empty state are
 * indistinguishable under that test. This fixture is the only thing that makes
 * the api-block rendering falsifiable, and it is the precondition FU-6 named
 * when the predecessor workorder deferred exactly this work.
 *
 * It was EXTRACTED from __tests__/map/api-surface.test.ts rather than authored
 * fresh (ADJ-01): an equivalent fixture already existed there and was already
 * green, so writing a second one would have created two definitions of the same
 * contract that could silently diverge. The projection suite imports this module
 * now, so one fixture backs the projection tests and the asset tests alike.
 *
 * The four properties every consumer depends on:
 *   1. TWO served routes, declared by two DIFFERENT frameworks (express, flask)
 *      so `byFramework` has more than one key.
 *   2. A resolved client call, so `networkEdges` is non-empty and at least one
 *      endpoint is NOT orphaned.
 *   3. An endpoint with NO resolved caller, so `orphaned === true` is exercised.
 *      Orphaned is a SURFACE, not a verdict — see src/map/api-surface.ts.
 *   4. TWO unmatched calls with DIFFERENT reasons, so `byReason` proves a
 *      never-built endpoint is distinguishable from an external host.
 */

import * as fs from 'fs';
import * as path from 'path';

export const CLIENT = '@File/src/client.ts';
export const HANDLER = '@File/server/users.ts';
export const ORPHAN_HANDLER = '@File/server/reports.ts';
export const EP_USERS = '@Endpoint/api/users/{}#GET';
export const EP_ORPHAN = '@Endpoint/api/reports#GET';

/** The raw graph.json shape: 3 file nodes, 2 endpoint nodes, 5 edges. */
export function graphFixture() {
  return {
    version: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    nodes: [
      { id: CLIENT, type: 'file', name: 'client.ts', file: 'src/client.ts', line: 1 },
      { id: HANDLER, type: 'file', name: 'users.ts', file: 'server/users.ts', line: 1 },
      { id: ORPHAN_HANDLER, type: 'file', name: 'reports.ts', file: 'server/reports.ts', line: 1 },
      {
        id: EP_USERS, type: 'endpoint', name: 'GET /api/users/{}',
        metadata: { path: '/api/users/{}', method: 'GET', frameworks: ['express'], endpoint: true },
      },
      {
        id: EP_ORPHAN, type: 'endpoint', name: 'GET /api/reports',
        metadata: { path: '/api/reports', method: 'GET', frameworks: ['flask'], endpoint: true },
      },
    ],
    edges: [
      {
        id: 'se1', sourceId: EP_USERS, targetId: HANDLER,
        relationship: 'serves_endpoint', resolutionStatus: 'resolved', confidence: 'exact',
        sourceLocation: { file: 'server/users.ts', line: 0 },
        evidence: { kind: 'serves-endpoint', endpointPath: '/api/users/{}', method: 'GET', framework: 'express', declaredMethods: ['GET'] },
      },
      {
        id: 'se2', sourceId: EP_ORPHAN, targetId: ORPHAN_HANDLER,
        relationship: 'serves_endpoint', resolutionStatus: 'resolved', confidence: 'exact',
        sourceLocation: { file: 'server/reports.ts', line: 0 },
        evidence: { kind: 'serves-endpoint', endpointPath: '/api/reports', method: 'GET', framework: 'flask', declaredMethods: ['GET'] },
      },
      {
        id: 'ce1', sourceId: CLIENT, targetId: EP_USERS,
        relationship: 'calls_endpoint', resolutionStatus: 'resolved', confidence: 'exact',
        sourceLocation: { file: 'src/client.ts', line: 12 },
        evidence: { kind: 'calls-endpoint', endpointPath: '/api/users/{}', method: 'GET', callType: 'fetch', detectionConfidence: 80, rawPath: '/api/users/{id}' },
      },
      {
        id: 'ce2', sourceId: CLIENT,
        relationship: 'calls_endpoint', resolutionStatus: 'unresolved', confidence: 'inferred',
        reason: 'endpoint_not_in_project',
        sourceLocation: { file: 'src/client.ts', line: 20 },
        evidence: { kind: 'calls-endpoint', endpointPath: '/api/ghost', method: 'GET', callType: 'fetch', detectionConfidence: 100, rawPath: '/api/ghost' },
      },
      {
        id: 'ce3', sourceId: CLIENT,
        relationship: 'calls_endpoint', resolutionStatus: 'external', confidence: 'strong',
        reason: 'absolute_url_external_origin',
        sourceLocation: { file: 'src/client.ts', line: 25 },
        evidence: { kind: 'calls-endpoint', endpointPath: '/v1/models', method: 'GET', callType: 'fetch', detectionConfidence: 100, rawPath: 'https://vendor.example/v1/models' },
      },
    ],
    statistics: { nodeCount: 5, edgeCount: 5 },
  };
}

/**
 * Materialize the fixture as a real `.coderef/` repo on disk.
 *
 * `withRoutesArtifact` is the ABSENT-vs-ZERO switch and is load-bearing: when
 * routes.json was never produced the projection omits the whole `api` block,
 * which means the API surface is UNKNOWN — never that the project has no API.
 * Passing `false` is how a consumer tests the no-data branch.
 */
export function writeFixtureRepo(root: string, withRoutesArtifact: boolean): void {
  const coderefDir = path.join(root, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graphFixture()), 'utf-8');
  fs.writeFileSync(
    path.join(coderefDir, 'index.json'),
    JSON.stringify({
      schemaVersion: '1.0.0',
      projectPath: root,
      totalElements: 2,
      elements: [
        { type: 'function', name: 'loadUsers', file: 'src/client.ts', line: 3, exported: true },
        { type: 'function', name: 'handler', file: 'server/users.ts', line: 5, exported: true },
      ],
    }),
    'utf-8',
  );
  if (withRoutesArtifact) {
    fs.writeFileSync(
      path.join(coderefDir, 'routes.json'),
      JSON.stringify({ totalRoutes: 2, projectPath: root, byFramework: {} }),
      'utf-8',
    );
  }
}

/**
 * The `api` block exactly as the projection emits it for this fixture, for
 * consumers that render an api block WITHOUT needing a repo on disk (the asset
 * suites drive the browser renderers, not the pipeline).
 *
 * Kept in lockstep with the projection by a test in api-surface.test.ts that
 * asserts this literal `toStrictEqual` the real `projectMapData(repo).api` —
 * so this convenience copy cannot silently drift from what the pipeline emits.
 */
export function apiSurfaceFixture() {
  return {
    endpoints: [
      {
        id: EP_ORPHAN,
        path: '/api/reports',
        method: 'GET',
        frameworks: ['flask'],
        handlers: ['server/reports.ts'],
        callers: [],
        orphaned: true,
      },
      {
        id: EP_USERS,
        path: '/api/users/{}',
        method: 'GET',
        frameworks: ['express'],
        handlers: ['server/users.ts'],
        callers: ['src/client.ts'],
        orphaned: false,
      },
    ],
    unmatchedCalls: [
      {
        file: 'src/client.ts',
        line: 20,
        path: '/api/ghost',
        method: 'GET',
        rawPath: '/api/ghost',
        status: 'unresolved',
        reason: 'endpoint_not_in_project',
        callType: 'fetch',
        confidence: 100,
      },
      {
        file: 'src/client.ts',
        line: 25,
        path: '/v1/models',
        method: 'GET',
        rawPath: 'https://vendor.example/v1/models',
        status: 'external',
        reason: 'absolute_url_external_origin',
        callType: 'fetch',
        confidence: 100,
      },
    ],
    networkEdges: [
      { source: 'src/client.ts', target: 'server/users.ts', endpoints: [EP_USERS] },
    ],
    summary: {
      endpointCount: 2,
      orphanedCount: 1,
      resolvedCallCount: 1,
      unmatchedCallCount: 2,
      byFramework: { express: 1, flask: 1 },
      byReason: { endpoint_not_in_project: 1, absolute_url_external_origin: 1 },
    },
    warnings: [] as string[],
  };
}
