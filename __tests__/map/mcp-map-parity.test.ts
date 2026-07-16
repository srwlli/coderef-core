/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability mcp-map-parity-tests
 */

/**
 * CLI/MCP parity for the map surface (WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001
 * P5; precedent: the P6 parity suite of WO-...-CLI-MCP-PARITY-001). Both
 * surfaces share the extracted generateMap core, so the data.json an agent
 * reads via the MCP `map` tool must equal the one the CLI emits — modulo
 * meta.generatedAt.
 *
 * HERMETIC on purpose: a synthetic fixture repo in tmp, not this repo's live
 * .coderef/ — other suites regenerate the live artifacts mid-run, which makes
 * staleness-based assertions racy (observed in the first full-suite run).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildToolHandlers } from '../../src/cli/coderef-mcp-server.js';
import { generateMap } from '../../src/map/emit-map.js';

function writeFixtureRepo(root: string): void {
  const coderefDir = path.join(root, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  const graph = {
    version: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    nodes: [
      { id: '@File/src/a.ts', type: 'file', name: 'a.ts', file: 'src/a.ts', line: 0 },
      { id: '@Fn/src/a.ts#alpha:1', type: 'function', name: 'alpha', file: 'src/a.ts', line: 1, metadata: { layer: 'service' } },
      { id: '@Fn/src/b.ts#beta:1', type: 'function', name: 'beta', file: 'src/b.ts', line: 1 },
    ],
    edges: [
      { id: 'e1', sourceId: '@File/src/a.ts', targetId: '@Fn/src/b.ts#beta:1', relationship: 'import', resolutionStatus: 'resolved' },
      { id: 'e2', sourceId: '@Fn/src/b.ts#beta:1', targetId: '@Fn/src/a.ts#alpha:1', relationship: 'call', resolutionStatus: 'resolved' },
    ],
    statistics: { nodeCount: 3, edgeCount: 2 },
  };
  fs.writeFileSync(path.join(coderefDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
  fs.writeFileSync(
    path.join(coderefDir, 'index.json'),
    JSON.stringify({
      schemaVersion: '1.0.0',
      projectPath: root,
      totalElements: 2,
      elements: [
        { type: 'function', name: 'alpha', file: 'src/a.ts', line: 1, exported: true },
        { type: 'function', name: 'beta', file: 'src/b.ts', line: 1 },
      ],
    }),
    'utf-8',
  );
}

function stripVolatile(data: any): any {
  const clone = JSON.parse(JSON.stringify(data));
  delete clone.meta.generatedAt;
  return clone;
}

describe('MCP map tool — CLI parity (hermetic fixture repo)', () => {
  let root: string;
  let cliOut: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-parity-'));
    writeFixtureRepo(root);
    cliOut = path.join(root, 'cli-out');
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('emits byte-identical MapData modulo generatedAt', () => {
    // CLI path: extracted core into a separate out dir.
    const cli = generateMap(root, cliOut);

    // MCP path: the map tool with refresh=true against the same repo.
    const handlers = buildToolHandlers(root);
    const result = handlers.map({ refresh: true }) as any;
    expect(result.error, JSON.stringify(result)).toBeUndefined();
    expect(result.refreshed).toBe(true);

    const mcpData = JSON.parse(fs.readFileSync(result.data_path, 'utf-8'));
    expect(stripVolatile(mcpData)).toEqual(stripVolatile(cli.data));
    expect(result.node_count).toBe(cli.data.nodes.length);
    expect(result.edge_count).toBe(cli.data.edges.length);
    // Analytics summary fields (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P1)
    expect(result.community_count).toBe(cli.data.analytics!.communityCount);
    expect(result.isolated_count).toBe(cli.data.analytics!.deadCode.isolated.length);
    expect(result.community_count).toBeGreaterThan(0);
  });

  it('serves a fresh map without regeneration on the second call', () => {
    const handlers = buildToolHandlers(root);
    const first = handlers.map({ refresh: true }) as any;
    expect(first.refreshed).toBe(true);
    const second = handlers.map({}) as any;
    expect(second.refreshed).toBe(false);
    expect(second.node_count).toBe(first.node_count);
    expect(second.data_path).toBe(first.data_path);
  });

  it('regenerates when graph.json is newer than the map', () => {
    const handlers = buildToolHandlers(root);
    handlers.map({ refresh: true });
    // Touch graph.json into the future relative to data.json
    const graphPath = path.join(root, '.coderef', 'graph.json');
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(graphPath, future, future);
    const result = handlers.map({}) as any;
    expect(result.refreshed).toBe(true);
  });

  it('confines writes to .coderef/map/', () => {
    const handlers = buildToolHandlers(root);
    const result = handlers.map({}) as any;
    expect(result.writes_confined_to.replace(/\\/g, '/')).toContain('.coderef/map');
    expect(result.graph_html_path.replace(/\\/g, '/')).toContain('.coderef/map/graph.html');
  });
});
