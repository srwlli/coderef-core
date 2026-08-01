/**
 * Orchestration boundary tests — WO-UNIFIED-PIPELINE-LEGACY-SURFACE-BOUNDARY-001 (P4-T3).
 *
 * Proves the final orchestration contract at the CLI boundary:
 *   1. A default coderef-pipeline run performs ONE canonical parse — the
 *      redundant scan leg is not in the default plan.
 *   2. Standalone coderef-scan remains a functional explicit diagnostic
 *      (--only=scan still plans it).
 *   3. The incremental coderef-watch path still routes through
 *      `populate --changed-files` and the full flush chains populate without
 *      a scan leg.
 *   4. The retired scanner FileWatcher is gone and nothing imports it.
 *
 * The dry-run assertions spawn the built CLI (dist/) — the build is part of
 * the suite's environment contract, same as the other CLI-facing tests.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PIPELINE_BIN = path.join(REPO_ROOT, 'dist', 'src', 'cli', 'coderef-pipeline.js');

function dryRunPlan(extraArgs: string[] = []): string {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-orch-'));
  const res = spawnSync(process.execPath, [PIPELINE_BIN, projectDir, '--dry-run', ...extraArgs], {
    encoding: 'utf-8',
    timeout: 60_000,
  });
  expect(res.status, `dry-run failed: ${res.stderr}`).toBe(0);
  return res.stdout + res.stderr;
}

describe('default pipeline performs one canonical parse (P4-T1)', () => {
  it('dry-run default plan contains populate but NOT the scan leg', () => {
    const out = dryRunPlan();
    expect(out).toMatch(/populate/);
    expect(out).not.toMatch(/\bscan\b(?!-)/);
  });

  it('--only=scan still plans the explicit scan diagnostic', () => {
    const out = dryRunPlan(['--only=scan']);
    expect(out).toMatch(/\bscan\b/);
    expect(out).not.toMatch(/populate/);
  });

  it('--skip still subtracts from the default plan', () => {
    const out = dryRunPlan(['--skip=rag,docs']);
    expect(out).toMatch(/populate/);
    expect(out).not.toMatch(/\brag\b/);
  });
});

describe('watch orchestration (P4-T1/T2)', () => {
  const watchSrc = fs.readFileSync(path.join(REPO_ROOT, 'src', 'cli', 'coderef-watch.ts'), 'utf-8');

  it('full flush chains populate,docs[,rag] with no scan leg', () => {
    expect(watchSrc).toMatch(/'populate,docs'/);
    expect(watchSrc).toMatch(/'populate,docs,rag'/);
    expect(watchSrc).not.toMatch(/'scan,populate/);
  });

  it('incremental flush still routes through populate --changed-files', () => {
    expect(watchSrc).toMatch(/--changed-files/);
  });
});

describe('retired FileWatcher stays retired (P4-T2)', () => {
  it('src/scanner/file-watcher.ts no longer exists', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'src', 'scanner', 'file-watcher.ts'))).toBe(false);
  });

  it('no production source imports the retired file-watcher module', () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue;
          walk(full);
        } else if (entry.name.endsWith('.ts')) {
          if (/from\s+'[^']*scanner\/file-watcher/.test(fs.readFileSync(full, 'utf-8'))) {
            offenders.push(full);
          }
        }
      }
    };
    walk(path.join(REPO_ROOT, 'src'));
    expect(offenders).toEqual([]);
  });
});
