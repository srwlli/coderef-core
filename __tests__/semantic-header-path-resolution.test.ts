/**
 * Contract test: header generation must not depend on process.cwd().
 *
 * THE BUG: pipeline artifacts store REPO-RELATIVE paths on purpose
 * (normalizeProjectPath keeps .coderef/ portable). SemanticOrchestrator handed
 * those straight to fs.readFileSync, which resolves against process.cwd() — so
 * running the CLI from anywhere except inside --project hit ENOENT on every
 * source file, wrote nothing, and STILL reported "Generated N headers" and
 * exited 0. A silent no-op that looks like success.
 *
 * Every test here spawns the CLI with cwd deliberately set OUTSIDE the target
 * repo. That is the whole point: an in-repo run passed even before the fix, so
 * only the outside-the-repo case can catch a regression.
 *
 * Run: npx vitest run __tests__/semantic-header-path-resolution.test.ts
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = process.cwd();
const CLI = path.resolve(REPO_ROOT, 'dist/src/cli/semantic-integration-cli.js');

// cwd for every run: the system temp dir, which is NEVER the target repo and
// never coderef-core. If path resolution regresses to cwd, these all fail.
const OUTSIDE_CWD = os.tmpdir();

const fixtures: string[] = [];
const suite = fs.existsSync(CLI) ? describe : describe.skip;

function makeFixture(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `coderef-hdr-${name}-`));
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'src', 'alpha.ts'),
    'export function greet(name: string): string {\n  return `hello ${name}`;\n}\nexport const VERSION = "1.0.0";\n',
  );
  fs.writeFileSync(
    path.join(dir, 'src', 'beta.ts'),
    'import { greet } from "./alpha.js";\nexport function shout(n: string): string { return greet(n).toUpperCase(); }\n',
  );
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: name, version: '1.0.0' }));
  fixtures.push(dir);
  return dir;
}

function runCli(args: string[]): { stdout: string; stderr: string; code: number } {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf-8',
    cwd: OUTSIDE_CWD, // <-- the crux of this whole file
  });
  return { stdout: res.stdout ?? '', stderr: res.stderr ?? '', code: res.status ?? 1 };
}

suite('semantic header generation resolves paths against --project, not cwd', () => {
  let project: string;

  beforeEach(() => {
    project = makeFixture('proj');
  });

  afterAll(() => {
    for (const dir of fixtures.splice(0)) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  });

  it('reads every source file when run from outside the target repo', () => {
    const r = runCli([`--project=${project}`, '--dry-run']);
    const out = r.stdout + r.stderr;
    // The exact pre-fix symptom: "Error inserting headers into src/alpha.ts:
    //   ENOENT ... coderef-core\src\alpha.ts" (resolved against cwd).
    expect(out).not.toMatch(/Error inserting headers/);
    expect(out).not.toMatch(/ENOENT[^\n]*src[\\/]alpha\.ts/);
  });

  it('writes headers into the TARGET repo from outside it', () => {
    runCli([`--project=${project}`]);
    const alpha = fs.readFileSync(path.join(project, 'src', 'alpha.ts'), 'utf-8');
    expect(alpha).toContain('@coderef-semantic');
    expect(alpha).toContain('@exports greet, VERSION');
    // Body must survive the insertion.
    expect(alpha).toContain('return `hello ${name}`;');
  });

  it('leaves the file untouched on a dry run from outside', () => {
    const before = fs.readFileSync(path.join(project, 'src', 'alpha.ts'), 'utf-8');
    runCli([`--project=${project}`, '--dry-run']);
    expect(fs.readFileSync(path.join(project, 'src', 'alpha.ts'), 'utf-8')).toBe(before);
  });

  it('never writes into the cwd it was launched from', () => {
    const strayAlpha = path.join(OUTSIDE_CWD, 'src', 'alpha.ts');
    const strayExisted = fs.existsSync(strayAlpha);
    runCli([`--project=${project}`]);
    // The pre-fix bug read from cwd; a write-side variant would create files there.
    if (!strayExisted) expect(fs.existsSync(strayAlpha)).toBe(false);
  });

  it('resolves a RELATIVE --file against the project', () => {
    const r = runCli([`--project=${project}`, '--file=src/beta.ts', '--dry-run']);
    const out = r.stdout + r.stderr;
    // Pre-fix this threw "No pipeline extraction found for src/beta.ts",
    // because the extraction path and the CLI path resolved against
    // different roots.
    expect(out).not.toMatch(/No pipeline extraction found/);
  });

  it('accepts an ABSOLUTE --file (passthrough must keep working)', () => {
    const abs = path.join(project, 'src', 'beta.ts');
    const r = runCli([`--project=${project}`, `--file=${abs}`, '--dry-run']);
    expect(r.stdout + r.stderr).not.toMatch(/No pipeline extraction found/);
  });

  it('is idempotent: a second run does not duplicate the header block', () => {
    runCli([`--project=${project}`]);
    runCli([`--project=${project}`]);
    const alpha = fs.readFileSync(path.join(project, 'src', 'alpha.ts'), 'utf-8');
    expect(alpha.match(/@coderef-semantic/g)?.length).toBe(1);
  });
});
