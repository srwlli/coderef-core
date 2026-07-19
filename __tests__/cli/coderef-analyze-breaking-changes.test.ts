/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability coderef-analyze-breaking-changes-cli-test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * CLI-path regression for --type=breaking-changes (api_diff) — the P6 post-ship
 * remediation gap (REC-P6PS-002). The shipped CLI built its exports manifest from
 * graph.json nodes, which carry NO metadata.parameters, so paramArity was always
 * null and the "changed" (signature-arity-change) bucket was PERMANENTLY EMPTY on
 * the CLI — while the MCP handler (reads index.json) worked. The pure api-diff
 * tests fed fabricated manifests and the MCP test used index.json, so nothing
 * exercised the CLI's own projection and the bug shipped green.
 *
 * This test drives the ACTUAL built CLI over a fixture whose current index.json
 * differs from the snapshot by exactly one param-arity change, and asserts the
 * `changed` bucket is non-empty — the assertion that would have caught the bug.
 * It reads index.json (the fixed source), never graph.json nodes.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'dist', 'src', 'cli', 'coderef-analyze.js');

/** Minimal .coderef fixture: graph.json (empty — must NOT be the manifest source) + index.json. */
function writeRepo(elements: unknown[]): string {
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-analyze-apidiff-'));
  const cr = path.join(proj, '.coderef');
  fs.mkdirSync(cr, { recursive: true });
  const graph = {
    version: '1.0.0', exportedAt: 1, nodes: [], edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
  };
  fs.writeFileSync(path.join(cr, 'graph.json'), JSON.stringify(graph));
  fs.writeFileSync(path.join(cr, 'index.json'), JSON.stringify({ elements }));
  fs.writeFileSync(path.join(cr, 'validation-report.json'), JSON.stringify({ ok: true }));
  return proj;
}

function runAnalyze(proj: string, args: string[]): { code: number; json: any; raw: string } {
  const res = spawnSync('node', [cliPath, '--project', proj, '--type', 'breaking-changes', '--output=json', ...args], {
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  const raw = res.stdout ?? '';
  let json: any;
  try { json = JSON.parse(raw); } catch { /* leave undefined; test asserts on code */ }
  return { code: res.status ?? -1, json, raw: raw + (res.stderr ?? '') };
}

describe('coderef-analyze --type=breaking-changes (CLI api_diff)', () => {
  beforeAll(() => {
    // The CLI ships under dist/cli via tsconfig.cli.json. Build it if absent so
    // the test exercises the real compiled entry point (stale-dist safe: only
    // builds when missing).
    if (!fs.existsSync(cliPath)) {
      execSync('npx tsc -p tsconfig.cli.json', { cwd: repoRoot, stdio: 'ignore' });
    }
  });

  it('surfaces a param-arity change in the `changed` bucket (index.json is the manifest source)', () => {
    // BEFORE: one exported fn with arity 1.
    const proj = writeRepo([
      { name: 'f', type: 'function', file: 'src/a.ts', line: 1, exported: true, parameters: [{}], codeRefIdNoLine: 'f' },
    ]);
    try {
      // Snapshot the current surface under "baseline".
      const snap = runAnalyze(proj, ['--to=baseline']);
      expect(snap.code).toBe(0);
      expect(snap.json?.action).toBe('snapshot');
      expect(snap.json?.exported_count).toBe(1);

      // AFTER: same export, arity 1 -> 3. graph.json is still empty; if the CLI
      // read graph nodes (the bug) paramArity would be null and changed_count 0.
      fs.writeFileSync(path.join(proj, '.coderef', 'index.json'), JSON.stringify({
        elements: [
          { name: 'f', type: 'function', file: 'src/a.ts', line: 1, exported: true, parameters: [{}, {}, {}], codeRefIdNoLine: 'f' },
        ],
      }));

      const diff = runAnalyze(proj, ['--from=baseline']);
      expect(diff.code).toBe(0);
      expect(diff.json?.no_data).toBe(false);
      expect(diff.json?.changed_count).toBe(1);
      expect(diff.json?.changed?.[0]).toMatchObject({
        name: 'f',
        before: { paramArity: 1 },
        after: { paramArity: 3 },
      });
      expect(diff.json?.added_count).toBe(0);
      expect(diff.json?.removed_count).toBe(0);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('non-exported elements are excluded even though graph.json is empty (source is index.json)', () => {
    const proj = writeRepo([
      { name: 'pub', type: 'function', file: 'src/a.ts', line: 1, exported: true, parameters: [], codeRefIdNoLine: 'pub' },
      { name: 'priv', type: 'function', file: 'src/a.ts', line: 5, exported: false, parameters: [{}], codeRefIdNoLine: 'priv' },
    ]);
    try {
      const snap = runAnalyze(proj, ['--to=baseline']);
      expect(snap.code).toBe(0);
      // Only the exported element is in the manifest — the private one is dropped.
      // (Under the bug, graph nodes defaulted exported:true, so this count would
      // have been fabricated; here it is the honest index-derived count.)
      expect(snap.json?.exported_count).toBe(1);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it('no baseline snapshot -> no_data, never a false 0-breaking', () => {
    const proj = writeRepo([
      { name: 'f', type: 'function', file: 'src/a.ts', line: 1, exported: true, parameters: [], codeRefIdNoLine: 'f' },
    ]);
    try {
      const diff = runAnalyze(proj, ['--from=does-not-exist']);
      expect(diff.code).toBe(0);
      expect(diff.json?.no_data).toBe(true);
      expect(diff.json?.added).toEqual([]);
      expect(diff.json?.removed).toEqual([]);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });
});
