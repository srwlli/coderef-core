/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability coderef-analyze-dependency-rules-cli-test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * CLI-path test for --type=dependency-rules (P7). Drives the BUILT CLI over a
 * graph.json fixture whose nodes carry metadata.layer, with and without a
 * .coderef/rules.json, asserting:
 *   - no rules.json -> no_data (never a false all-pass), exit 0
 *   - a forbid violation with --gate -> exit 2 (CI gate)
 *   - the same violation WITHOUT --gate -> exit 0 (report-only default)
 * This exercises the real compiled entry point + the --gate exit-code path,
 * which pure/MCP tests cannot cover (MCP has no exit code).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'dist', 'src', 'cli', 'coderef-analyze.js');

/** A .coderef fixture with two service-layer nodes and one cli-layer node. */
function writeRepo(): string {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-analyze-deprules-'));
  const cr = path.join(proj, '.coderef');
  fs.mkdirSync(cr, { recursive: true });
  const nodes = [
    { id: '@Fn/svc.ts#doWork:1', file: 'svc.ts', type: 'function', name: 'doWork', line: 1, metadata: { layer: 'service' } },
    { id: '@Fn/cli.ts#main:1', file: 'cli.ts', type: 'function', name: 'main', line: 1, metadata: { layer: 'cli' } },
  ];
  // One observed edge: service -> cli (svc.ts depends on cli.ts).
  const edges = [{ id: 'e1', source: '@Fn/svc.ts#doWork:1', target: '@Fn/cli.ts#main:1', type: 'calls' }];
  const graph = {
    version: '1.0.0', exportedAt: 1, nodes, edges,
    statistics: { nodeCount: nodes.length, edgeCount: edges.length, edgesByType: { calls: 1 }, densityRatio: 0 },
  };
  fs.writeFileSync(path.join(cr, 'graph.json'), JSON.stringify(graph));
  fs.writeFileSync(path.join(cr, 'index.json'), JSON.stringify({ elements: nodes.map(n => ({ ...n, ...n.metadata })) }));
  fs.writeFileSync(path.join(cr, 'validation-report.json'), JSON.stringify({ ok: true }));
  return proj;
}

function runAnalyze(proj: string, extra: string[]): { code: number; json: any; raw: string } {
  const res = spawnSync(
    'node',
    [cliPath, '--project', proj, '--type', 'dependency-rules', '--output=json', ...extra],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const raw = res.stdout ?? '';
  let json: any;
  try { json = JSON.parse(raw); } catch { /* leave undefined */ }
  return { code: res.status ?? -1, json, raw: raw + (res.stderr ?? '') };
}

describe('coderef-analyze --type=dependency-rules (CLI gate)', () => {
  beforeAll(() => {
    if (!fs.existsSync(cliPath)) {
      execSync('npx tsc -p tsconfig.cli.json', { cwd: repoRoot, stdio: 'ignore' });
    }
  });

  it('no rules.json -> no_data, exit 0 (never a false all-pass)', () => {
    const proj = writeRepo();
    try {
      const r = runAnalyze(proj, []);
      expect(r.code).toBe(0);
      expect(r.json?.no_data).toBe(true);
      expect(r.json?.rule_count).toBe(0);
      // The observed edge is still surfaced so the operator knows the graph was read.
      expect(r.json?.observed_layer_edge_count).toBe(1);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('a forbid violation with --gate exits 2 (CI gate) and names the edge', () => {
    const proj = writeRepo();
    try {
      fs.writeFileSync(
        path.join(proj, '.coderef', 'rules.json'),
        JSON.stringify({ forbid: [{ from: 'service', to: 'cli' }] }),
      );
      const r = runAnalyze(proj, ['--gate']);
      expect(r.code).toBe(2);
      expect(r.json?.no_data).toBe(false);
      expect(r.json?.violated_count).toBe(1);
      expect(r.json?.rules?.[0]?.status).toBe('violated');
      expect(r.json?.rules?.[0]?.violatingEdges?.[0]?.sourceLayer).toBe('service');
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('the same violation WITHOUT --gate exits 0 (report-only default)', () => {
    const proj = writeRepo();
    try {
      fs.writeFileSync(
        path.join(proj, '.coderef', 'rules.json'),
        JSON.stringify({ forbid: [{ from: 'service', to: 'cli' }] }),
      );
      const r = runAnalyze(proj, []);
      expect(r.code).toBe(0);
      expect(r.json?.violated_count).toBe(1);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('a satisfied forbid rule with --gate exits 0', () => {
    const proj = writeRepo();
    try {
      // Forbid cli -> service, but the observed edge is service -> cli: satisfied.
      fs.writeFileSync(
        path.join(proj, '.coderef', 'rules.json'),
        JSON.stringify({ forbid: [{ from: 'cli', to: 'service' }] }),
      );
      const r = runAnalyze(proj, ['--gate']);
      expect(r.code).toBe(0);
      expect(r.json?.violated_count).toBe(0);
      expect(r.json?.satisfied_count).toBe(1);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });
});
