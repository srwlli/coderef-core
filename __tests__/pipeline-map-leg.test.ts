/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-map-leg-test-repo-root
 */

/**
 * Contract test: coderef-pipeline map leg
 * (WO-WIRE-THE-MAPDATA-DASHBOARD-INTO-CODEREF-MAP-AND-001 P2).
 *
 * The leg exists so a full pipeline run emits the dashboard, not only a
 * hand-run `coderef-map`. What is asserted here:
 *   - `map` is in the default leg set, positioned AFTER populate. Order is
 *     load-bearing: coderef-map re-runs scan+populate when graph.json is
 *     absent, so an earlier slot would trigger a redundant second scan.
 *   - --only=map and --skip=map both resolve correctly through the existing
 *     resolveLegs() filter.
 *
 * Uses --dry-run throughout: leg RESOLUTION is what this file covers, and a
 * real map emission is already covered by __tests__/map/dashboard-asset.test.ts.
 *
 * Run: npx vitest run __tests__/pipeline-map-leg.test.ts
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = process.cwd();
const PIPELINE_BIN = path.resolve(REPO_ROOT, 'dist/src/cli/coderef-pipeline.js');
const MAP_BIN = path.resolve(REPO_ROOT, 'dist/src/cli/coderef-map.js');

const suite = fs.existsSync(PIPELINE_BIN) ? describe : describe.skip;

function runPipeline(extra: string[]): { out: string; code: number } {
  const res = spawnSync(process.execPath, [PIPELINE_BIN, REPO_ROOT, '--dry-run', ...extra], {
    encoding: 'utf-8',
  });
  return { out: (res.stdout ?? '') + (res.stderr ?? ''), code: res.status ?? 1 };
}

/** The plan line: "  legs: scan -> populate -> map -> docs -> rag" */
function legsOf(out: string): string[] {
  const m = /legs:\s*(.+)/.exec(out);
  return m ? m[1].trim().split('->').map(s => s.trim()) : [];
}

suite('coderef-pipeline map leg', () => {
  it('includes map in the default leg set', () => {
    const { out, code } = runPipeline([]);
    expect(code).toBe(0);
    expect(legsOf(out)).toContain('map');
  });

  it('orders map AFTER populate so no redundant second scan fires', () => {
    const legs = legsOf(runPipeline([]).out);
    expect(legs.indexOf('map')).toBeGreaterThan(legs.indexOf('populate'));
    expect(legs.indexOf('map')).toBeGreaterThan(legs.indexOf('scan'));
  });

  it('--only=map runs the map leg alone', () => {
    const legs = legsOf(runPipeline(['--only=map']).out);
    expect(legs).toEqual(['map']);
  });

  it('--skip=map suppresses it while leaving the others intact', () => {
    const legs = legsOf(runPipeline(['--skip=map']).out);
    expect(legs).not.toContain('map');
    expect(legs).toContain('scan');
    expect(legs).toContain('populate');
  });

  it('advertises map in --help as a valid --only/--skip value', () => {
    const res = spawnSync(process.execPath, [PIPELINE_BIN, '--help'], { encoding: 'utf-8' });
    expect(res.stdout ?? '').toMatch(/Valid:.*\bmap\b/);
  });

  it('the coderef-map bin the leg shells to actually exists in dist', () => {
    // A missing sibling bin is the failure mode that would make the leg exit
    // non-zero at runtime while everything typechecks.
    expect(fs.existsSync(MAP_BIN)).toBe(true);
  });

  it('coderef-map --help documents the always-on dashboard output', () => {
    const res = spawnSync(process.execPath, [MAP_BIN, '--help'], { encoding: 'utf-8' });
    const out = res.stdout ?? '';
    expect(out).toContain('dashboard.html');
    expect(out).toMatch(/Always emitted/i);
  });
});
