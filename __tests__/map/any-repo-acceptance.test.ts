/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability coderef-map-any-repo-acceptance
 */

/**
 * The universality deliverable pinned as a regression test
 * (WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 P4): coderef-map against a repo
 * coderef has NEVER seen — no .coderef/, no semantic headers — must produce
 * a working map via the scan-if-absent path, degrading gracefully where
 * header-derived enrichment is unavailable.
 *
 * Live-run evidence (2026-07-16): a never-scanned 196-file Next.js app
 * mapped to 84 file nodes / 20 edges with 0% header coverage, rendered and
 * browser-verified. This test keeps that path green with a synthetic
 * mini-repo so it runs anywhere.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI_BIN = path.join(REPO_ROOT, 'dist', 'src', 'cli', 'coderef-map.js');
const runnable = fs.existsSync(CLI_BIN);

function writeMiniRepo(root: string): void {
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'lib', 'util.ts'),
    'export function add(a: number, b: number): number {\n  return a + b;\n}\n' +
    'export function mul(a: number, b: number): number {\n  return a * b;\n}\n',
    'utf-8',
  );
  fs.writeFileSync(
    path.join(root, 'lib', 'format.ts'),
    "import { add } from './util';\n\n" +
    'export function formatSum(a: number, b: number): string {\n' +
    '  return `sum=${add(a, b)}`;\n}\n',
    'utf-8',
  );
  fs.writeFileSync(
    path.join(root, 'index.ts'),
    "import { formatSum } from './lib/format';\n\n" +
    'export function main(): void {\n  console.log(formatSum(1, 2));\n}\n',
    'utf-8',
  );
}

describe('coderef-map any-repo acceptance (synthetic never-seen repo)', () => {
  let root: string;
  let result: ReturnType<typeof spawnSync>;

  beforeAll(() => {
    if (!runnable) return;
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-anyrepo-'));
    writeMiniRepo(root);
    result = spawnSync(process.execPath, [CLI_BIN, root, '--no-open'], {
      encoding: 'utf-8',
      timeout: 120000,
    });
  }, 150000);

  afterAll(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it.skipIf(!runnable)('exits 0 via the scan-if-absent path (no prior .coderef)', () => {
    expect(result.status, String(result.stderr)).toBe(0);
    expect(String(result.stdout)).toContain('scanning first');
  });

  it.skipIf(!runnable)('emits a schema-valid data.json with the fixture files as nodes', () => {
    const dataPath = path.join(root, '.coderef', 'map', 'data.json');
    expect(fs.existsSync(dataPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    expect(data.meta.schemaVersion).toBe('1.2.0');
    // v1.1 analytics block rides along on any repo (universality)
    expect(data.analytics).toBeDefined();
    expect(data.analytics.communityCount).toBeGreaterThan(0);
    const ids = data.nodes.map((n: any) => n.id);
    expect(ids).toContain('index.ts');
    expect(ids).toContain('lib/format.ts');
    expect(ids).toContain('lib/util.ts');
    // header-less repo: nodes have no layer, and that is fine
    expect(data.nodes.every((n: any) => n.layer === undefined || typeof n.layer === 'string')).toBe(true);
  });

  it.skipIf(!runnable)('resolves the relative-import file edges', () => {
    const data = JSON.parse(
      fs.readFileSync(path.join(root, '.coderef', 'map', 'data.json'), 'utf-8'),
    );
    const pairs = data.edges.map((e: any) => `${e.source}->${e.target}`);
    expect(pairs).toContain('lib/format.ts->lib/util.ts');
    expect(pairs).toContain('index.ts->lib/format.ts');
  });

  it.skipIf(!runnable)('emits the viewer with data inlined (double-clickable artifact)', () => {
    const html = fs.readFileSync(path.join(root, '.coderef', 'map', 'graph.html'), 'utf-8');
    expect(html).not.toContain('/*__CODEREF_MAP_DATA__*/null');
    expect(html).toContain('"schemaVersion"');
    for (const f of ['viewer.js', 'viewer.css', 'data.json']) {
      expect(fs.existsSync(path.join(root, '.coderef', 'map', f)), `missing ${f}`).toBe(true);
    }
  });
});
