/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability mjs-smoke-suite-runner
 */

/**
 * WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3 (P2-17): the five
 * `__tests__/*.test.mjs` files are standalone smoke scripts (they spawn dist
 * servers/CLIs and exit 0/1) — vitest's include only matched `.ts`, so they
 * had NEVER executed. Rather than rewriting each as a vitest suite, this
 * runner executes every script as a child process and asserts exit 0, so
 * they now run on every suite pass. They require a built dist/ (consistent
 * with the suite's other dist-spawning tests).
 */

import { execFile } from 'child_process';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.join(__dirname, '..');

const SMOKE_SCRIPTS = [
  'coderef-rag-server-health.test.mjs',
  'coderef-rag-server-query-degraded.test.mjs',
  'coderef-watch-debounce.test.mjs',
  'coderef-watch-heartbeat-schema.test.mjs',
  'foundation-docs-meta-writer.test.mjs',
];

function runScript(script: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(REPO_ROOT, '__tests__', script)],
      { cwd: REPO_ROOT, timeout: 60_000 },
      (error, stdout, stderr) => {
        const code = error ? ((error as NodeJS.ErrnoException & { code?: number }).code as number ?? 1) : 0;
        resolve({ code: typeof code === 'number' ? code : 1, output: `${stdout}\n${stderr}` });
      },
    );
  });
}

describe('mjs smoke suites (previously never executed)', () => {
  for (const script of SMOKE_SCRIPTS) {
    // retry: the watch/debounce scripts assert real wall-clock windows and
    // can miss them under full-suite CPU contention; a genuine breakage
    // fails all three attempts.
    it(`${script} exits 0`, { timeout: 90_000, retry: 2 }, async () => {
      const { code, output } = await runScript(script);
      expect(code, `${script} failed:\n${output.slice(-2000)}`).toBe(0);
    });
  }
});
