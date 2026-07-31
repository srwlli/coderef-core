/**
 * Contract test: coderef-pipeline rag leg (FU-PIPELINE-HEADERLESS).
 *
 * Two defects, both covered here:
 *   1. The rag leg never forwarded --include-headerless, so a header-less repo
 *      indexed almost nothing (observed: 56 chunks vs 1,781 for the same repo
 *      once the flag was passed by hand).
 *   2. That near-empty index was invisible: the leg exited 0 and printed OK,
 *      so a green pipeline hid a broken result.
 *
 * Technique: swap dist/src/cli/rag-index.js for a stub that records the argv it
 * received and prints a controllable "Chunks indexed:" line. The real bin is
 * restored in afterAll. Tests are skipped (not failed) when dist is unbuilt so
 * this never fails for the wrong reason.
 *
 * Run: npx vitest run __tests__/pipeline-rag-headerless-passthrough.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = process.cwd();
const PIPELINE_BIN = path.resolve(REPO_ROOT, 'dist/src/cli/coderef-pipeline.js');
const RAG_BIN = path.resolve(REPO_ROOT, 'dist/src/cli/rag-index.js');
const ARGV_SINK = path.join(os.tmpdir(), `coderef-rag-argv-${process.pid}.json`);

const distBuilt = fs.existsSync(PIPELINE_BIN) && fs.existsSync(RAG_BIN);
const suite = distBuilt ? describe : describe.skip;

/** Stub rag-index: record argv, emit a chosen chunk count, exit 0. */
function installStub(chunks: number): void {
  fs.writeFileSync(
    RAG_BIN,
    'require("fs").writeFileSync(' + JSON.stringify(ARGV_SINK) + ', JSON.stringify(process.argv.slice(2)));\n' +
    `console.log("  Chunks indexed: ${chunks}");\n` +
    'process.exit(0);\n',
  );
}

function runPipeline(extra: string[]): { stdout: string; stderr: string; code: number } {
  const res = spawnSync(process.execPath, [PIPELINE_BIN, REPO_ROOT, '--only=rag', ...extra], {
    encoding: 'utf-8',
    env: { ...process.env },
  });
  return { stdout: res.stdout ?? '', stderr: res.stderr ?? '', code: res.status ?? 1 };
}

function argvSeen(): string[] {
  return JSON.parse(fs.readFileSync(ARGV_SINK, 'utf-8'));
}

suite('coderef-pipeline rag leg: headerless passthrough + empty-index visibility', () => {
  let realRagBin: Buffer;

  beforeAll(() => {
    realRagBin = fs.readFileSync(RAG_BIN);
  });

  afterAll(() => {
    // Always put the real bin back, even if an expectation failed.
    if (realRagBin) fs.writeFileSync(RAG_BIN, realRagBin);
    try { fs.rmSync(ARGV_SINK, { force: true }); } catch { /* best effort */ }
  });

  it('forwards --include-headerless to rag-index when asked', () => {
    installStub(1781);
    const r = runPipeline(['--rag-include-headerless']);
    expect(r.code).toBe(0);
    expect(argvSeen()).toContain('--include-headerless');
  });

  it('accepts the --include-headerless alias', () => {
    installStub(1781);
    const r = runPipeline(['--include-headerless']);
    expect(r.code).toBe(0);
    expect(argvSeen()).toContain('--include-headerless');
  });

  it('does NOT pass the flag when it was not requested', () => {
    installStub(1781);
    runPipeline([]);
    expect(argvSeen()).not.toContain('--include-headerless');
  });

  it('warns when 0 chunks were embedded despite a clean exit', () => {
    installStub(0);
    const r = runPipeline([]);
    const out = r.stdout + r.stderr;
    // Exit stays 0 — this is an advisory, not a failure.
    expect(r.code).toBe(0);
    expect(out).toContain('WARNING');
    expect(out).toMatch(/index is EMPTY/i);
    // Without the flag, the warning must name the remedy.
    expect(out).toContain('--rag-include-headerless');
  });

  it('omits the headerless remedy hint when the flag was already supplied', () => {
    installStub(0);
    const r = runPipeline(['--rag-include-headerless']);
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/index is EMPTY/i);
    // The flag is not the cause here, so it must not be suggested as the fix.
    expect(out).not.toContain('re-run with --rag-include-headerless');
  });

  it('reports the chunk count and stays silent when the index is healthy', () => {
    installStub(1781);
    const r = runPipeline([]);
    const out = r.stdout + r.stderr;
    expect(out).toContain('chunks=1781');
    expect(out).not.toContain('WARNING');
  });
});
