/**
 * Phase 6 — output-validation-strict-headers behavioral test (AC-06).
 *
 * Exercises the --strict-headers CLI flag end-to-end via subprocess. Uses a
 * fixture project with documented @exports drift (header declares an
 * exported symbol that the AST does not export — Phase 2.5's cross-check at
 * orchestrator.ts:467-473 downgrades headerStatus to 'stale', and Phase 6's
 * SH-2 check surfaces every stale file). Asserts:
 *   - Without --strict-headers: exit 0, warnings to stderr, .coderef/ written
 *   - With --strict-headers:    exit 1, errors to stderr, generators skipped
 *
 * Behavioral discipline (DR-PHASE-6-D, R-PHASE-6-D): default false MUST
 * preserve pre-Phase-6 exit code 0 path even when header drift exists.
 *
 * Note: SH-1 (layer_in_enum) is hard to exercise via fixture because the
 * Phase 2.5 parser already rejects bad layers at parse time, leaving
 * headerStatus='partial' rather than 'defined'. SH-1 catches drift between
 * parse-time validity and write-time enum changes (a layer value present
 * when the file was scanned but absent from a NEWER layers.json). That
 * scenario is exercised by the unit test in
 * output-validation-semantic-headers.test.ts (which injects a bad layer
 * directly into the validator's input). The behavioral test here uses SH-2
 * because it's reproducible via fixture content alone.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const POPULATE_CLI = path.join(REPO_ROOT, 'dist', 'src', 'cli', 'populate.js');

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

async function makeFixtureWithStaleExports(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-phase6-strict-'));
  created.push(dir);
  await fs.mkdir(path.join(dir, 'src'), { recursive: true });
  // Header @exports declares { run, fakelyExported } but AST only exports run
  // — Phase 2.5 cross-check downgrades headerStatus to 'stale', triggering
  // SH-2 (exports_match_ast) at the validator.
  await fs.writeFile(
    path.join(dir, 'src', 'stale-exports.ts'),
    [
      '/**',
      ' * @coderef-semantic:1.0.0',
      ' * @layer utility',
      ' * @capability stale-exports-test',
      ' * @exports run, fakelyExported',
      ' */',
      'export function run() { return 1; }',
    ].join('\n'),
    'utf-8',
  );
  return dir;
}

describe('Phase 6 strict-headers CLI flag (AC-06)', () => {
  it('default mode (no flag): exits 0 even with stale @exports header drift; warnings to stderr; .coderef/ written', async () => {
    const dir = await makeFixtureWithStaleExports();
    const result = spawnSync('node', [POPULATE_CLI, dir, '--mode', 'minimal'], {
      encoding: 'utf-8',
      env: { ...process.env },
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/\[validation warning exports_match_ast\]/);
    const indexExists = await fs
      .access(path.join(dir, '.coderef', 'index.json'))
      .then(() => true)
      .catch(() => false);
    expect(indexExists).toBe(true);
  });

  it('--strict-headers: exits 1 with stale @exports drift; errors to stderr; index.json NOT written', async () => {
    const dir = await makeFixtureWithStaleExports();
    const result = spawnSync(
      'node',
      [POPULATE_CLI, dir, '--mode', 'minimal', '--strict-headers'],
      { encoding: 'utf-8', env: { ...process.env } },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/\[validation error header_drift_strict exports_match_ast\]/);
    const indexExists = await fs
      .access(path.join(dir, '.coderef', 'index.json'))
      .then(() => true)
      .catch(() => false);
    expect(indexExists).toBe(false);
  });
});
