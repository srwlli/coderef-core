/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability test-dsl-reclassify-contract
 */

/**
 * Contract tests for the test_dsl disposition (operator-delegated ruling A,
 * 2026-08-01, both-sides — the P3c js_prototype_member shape extended to
 * test-framework DSL vocabulary).
 *
 * The envelope pinned here, authored BEFORE the implementation (P1-T3 of
 * WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001):
 *   (a) framework ambient callees (describe/it/expect/beforeEach/...) as BARE
 *       calls in test-origin files flip unresolved -> builtin with
 *       reason='test_dsl_ambient_callee';
 *   (b) expect()-rooted matcher receivers (and the ambient vi/jest/expect
 *       receiver objects) flip unresolved -> builtin with
 *       reason='test_dsl_matcher_receiver';
 *   (c) the SAME calls in production (non-test) files are NOT reclassified —
 *       the test-file guard is load-bearing;
 *   (d) project symbols always win: a test file calling a project-defined
 *       function that happens to share a DSL name resolves normally, and an
 *       ambiguous result is never flipped;
 *   (e) plain dotted receivers in test files (obj.a.b — the FU-2 recall
 *       frontier) are NOT gobbled by the matcher side;
 *   (f) edge ids are status-invariant (computeEdgeId excludes
 *       resolutionStatus), so the flip changes classification, never identity;
 *   (g) the validation report discloses test_dsl_count and excludes the
 *       flipped population from the resolvable denominator.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports } from '../../src/pipeline/import-resolver.js';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import { constructGraph, computeEdgeId } from '../../src/pipeline/graph-builder.js';
import { validatePipelineState } from '../../src/pipeline/output-validator.js';
import type { ValidatePipelineStateOptions } from '../../src/pipeline/output-validator.js';
import type { PipelineState } from '../../src/pipeline/types.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const layerEnum: ValidatePipelineStateOptions['layerEnum'] = [
  'service', 'utility', 'test_support', 'cli', 'parser',
];

async function scanAndGraph(files: Record<string, string>): Promise<{ state: PipelineState; graph: ReturnType<typeof constructGraph> }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-testdsl-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
  }
  const state = await new PipelineOrchestrator().run(dir, {
    outputDir: path.join(dir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
  state.importResolutions = resolveImports(state);
  state.callResolutions = resolveCalls(state);
  const graph = constructGraph(state);
  return { state, graph };
}

// A test body exercising both DSL sides without importing any framework —
// the ambient-globals shape (vitest globals mode) that produces the
// callee_not_in_symbol_table / receiver_not_in_symbol_table populations.
const DSL_TEST_BODY = [
  'declare const output: { byType: { fetch: number } };',
  'describe("sample", () => {',
  '  beforeEach(() => { void 0; });',
  '  it("checks", () => {',
  '    expect(output.byType.fetch).toBe(1);',
  '    expect.soft(output.byType.fetch).toBe(1);',
  '    vi.advanceTimersByTime(5);',
  '  });',
  '});',
  'declare const vi: { advanceTimersByTime(n: number): void };',
].join('\n') + '\n';

describe('test_dsl reclassify contract (ruling A, both sides)', () => {
  it('(a) ambient DSL callees in a test file flip to builtin reason=test_dsl_ambient_callee', async () => {
    const { state } = await scanAndGraph({ '__tests__/sample.test.ts': DSL_TEST_BODY });
    const bare = (name: string) =>
      state.callResolutions!.find(c => c.calleeName === name && c.receiverText === null);
    for (const name of ['describe', 'it', 'beforeEach']) {
      const call = bare(name);
      expect(call, `bare ${name}() call`).toBeDefined();
      expect(call!.kind, `${name}() kind`).toBe('builtin');
      expect(call!.reason, `${name}() reason`).toBe('test_dsl_ambient_callee');
    }
  });

  it('(b) expect()-rooted matcher receivers and ambient vi/expect receivers flip to test_dsl_matcher_receiver', async () => {
    const { state } = await scanAndGraph({ '__tests__/sample.test.ts': DSL_TEST_BODY });
    const matcher = state.callResolutions!.filter(
      c => c.reason === 'test_dsl_matcher_receiver',
    );
    // expect(...).toBe x2 via expect( rooted receivers, expect.soft receiver
    // 'expect', and vi.advanceTimersByTime receiver 'vi' all take the matcher leg.
    expect(matcher.length).toBeGreaterThanOrEqual(3);
    for (const c of matcher) {
      expect(c.kind).toBe('builtin');
      expect(c.receiverText).not.toBeNull();
    }
    const toBeOnExpect = matcher.find(
      c => c.calleeName === 'toBe' && c.receiverText!.startsWith('expect('),
    );
    expect(toBeOnExpect, 'expect(...).toBe with expect( receiver').toBeDefined();
  });

  it('(c) the SAME DSL calls in a production file are NOT reclassified', async () => {
    const { state } = await scanAndGraph({ 'src/runner.ts': DSL_TEST_BODY });
    const flipped = state.callResolutions!.filter(
      c => typeof c.reason === 'string' && c.reason.startsWith('test_dsl'),
    );
    expect(flipped, 'no test_dsl classifications outside test files').toHaveLength(0);
    const describeCall = state.callResolutions!.find(
      c => c.calleeName === 'describe' && c.receiverText === null,
    );
    expect(describeCall).toBeDefined();
    expect(describeCall!.kind).toBe('unresolved');
  });

  it('(d) project symbols always win; ambiguous results are never flipped', async () => {
    const { state } = await scanAndGraph({
      // A project-defined `it` in the same test file: symbol-table resolution
      // must beat the DSL vocabulary.
      '__tests__/own-symbol.test.ts': [
        'function it(name: string, fn: () => void): void { fn(); }',
        'export function run(): void {',
        '  it("local", () => { void 0; });',
        '}',
      ].join('\n') + '\n',
      // Two same-name candidates in other files -> a bare call to that name is
      // ambiguous, and ambiguity must survive (never silently become test_dsl).
      'src/a.ts': 'export function describe(x: string): string { return x; }\n',
      'src/b.ts': 'export function describe(x: number): number { return x; }\n',
      '__tests__/ambig.test.ts': [
        'export function trigger(): void {',
        '  describe("which one");',
        '}',
      ].join('\n') + '\n',
    });
    const localIt = state.callResolutions!.find(
      c => c.calleeName === 'it' && c.sourceFile.includes('own-symbol'),
    );
    expect(localIt, 'project-defined it() call').toBeDefined();
    expect(localIt!.kind).toBe('resolved');

    const ambig = state.callResolutions!.find(
      c => c.calleeName === 'describe' && c.sourceFile.includes('ambig'),
    );
    expect(ambig, 'two-candidate describe() call').toBeDefined();
    expect(ambig!.kind).toBe('ambiguous');
    expect(ambig!.reason ?? '').not.toMatch(/^test_dsl/);
  });

  it('(e) plain dotted receivers in test files stay unresolved (FU-2 protection)', async () => {
    const { state } = await scanAndGraph({
      '__tests__/dotted.test.ts': [
        'declare const output: { byType: { fetch: { poke(): void } } };',
        'export function trigger(): void {',
        '  output.byType.fetch.poke();',
        '}',
      ].join('\n') + '\n',
    });
    const dotted = state.callResolutions!.find(c => c.calleeName === 'poke');
    expect(dotted, 'dotted-receiver call').toBeDefined();
    expect(dotted!.kind).toBe('unresolved');
    expect(dotted!.reason ?? '').not.toMatch(/^test_dsl/);
  });

  it('(f) flipped edges keep status-invariant ids and carry the test_dsl reason', async () => {
    const { graph } = await scanAndGraph({ '__tests__/sample.test.ts': DSL_TEST_BODY });
    const dslEdges = graph.edges.filter(
      e => typeof e.reason === 'string' && e.reason.startsWith('test_dsl'),
    );
    expect(dslEdges.length).toBeGreaterThanOrEqual(4);
    for (const e of dslEdges) {
      expect(e.resolutionStatus).toBe('builtin');
      expect(e.evidence?.kind).toBe('builtin-call');
      // Identity is computed from (source, relationship, specifier, file, line)
      // only — reclassification cannot move an edge id.
      const ev = e.evidence as { calleeName?: string };
      const recomputed = computeEdgeId({
        sourceId: e.sourceId,
        relationship: 'call',
        originSpecifier: ev.calleeName ?? '',
        sourceFile: e.sourceLocation!.file,
        line: e.sourceLocation!.line,
      });
      expect(e.id).toBe(recomputed);
    }
  });

  it('(g) validation report discloses test_dsl_count and excludes it from the resolvable denominator', async () => {
    const { state, graph } = await scanAndGraph({
      '__tests__/sample.test.ts': DSL_TEST_BODY,
      'src/main.ts': "import { gone } from './gone.js';\nexport const m = String(gone);\n",
    });
    const result = validatePipelineState(state, graph, { layerEnum });
    const report = result.report as unknown as Record<string, number>;

    expect(typeof report.test_dsl_count).toBe('number');
    expect(report.test_dsl_count).toBeGreaterThanOrEqual(4);
    // Flipped edges are counted inside builtin_count (the P3c home) and are
    // therefore OUT of both unresolved_count and the resolvable denominator.
    expect(report.builtin_count).toBeGreaterThanOrEqual(report.test_dsl_count);
    const dslStillUnresolved = graph.edges.filter(
      e => e.resolutionStatus === 'unresolved'
        && typeof e.reason === 'string' && e.reason.startsWith('test_dsl'),
    );
    expect(dslStillUnresolved).toHaveLength(0);
  });
});
