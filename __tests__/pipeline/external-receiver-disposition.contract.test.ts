/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability external-receiver-disposition-contract
 */

/**
 * Contract tests for the P2 external/builtin receiver disposition completion
 * (WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 P2 — the data-backed pivot from
 * the FU-2 field-path-walking hypothesis; see the P2 planning-gate decision).
 *
 * The envelope, authored BEFORE the implementation (P2-T3):
 *   (a) member calls on receivers bound to EXTERNAL package imports classify
 *       external with reason='external_module_receiver' — namespace imports,
 *       dotted roots (ts.factory.x()), and named/default local bindings;
 *   (b) cast/paren-wrapped receivers ((ts as any).x(), (ts).x()) normalize to
 *       the underlying identifier and classify the same;
 *   (c) node-builtin module receivers KEEP builtin_module_receiver precedence;
 *   (d) receivers bound to PROJECT imports (kind='resolved') keep branch-4
 *       behavior (ambiguous / imported_receiver_method_unknown) — never
 *       external;
 *   (e) unknown non-import receivers stay unresolved;
 *   (f) pure dotted receivers whose ROOT is in BUILTIN_RECEIVERS
 *       (process.stderr.write()) classify builtin
 *       reason='builtin_root_receiver';
 *   (g) the phase adds ZERO resolved edges — dispositions only.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports } from '../../src/pipeline/import-resolver.js';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import type { PipelineState } from '../../src/pipeline/types.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

async function scanFixture(files: Record<string, string>): Promise<PipelineState> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-extrecv-'));
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
  return state;
}

const PKG = JSON.stringify({ name: 'fx', dependencies: { 'extlib': '1.0.0' } });

describe('external/builtin receiver disposition (P2 contract)', () => {
  it('(a) namespace-import receivers from an external package classify external_module_receiver, incl. dotted roots', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as ext from 'extlib';",
        'export function use(): void {',
        '  ext.doThing();',
        '  ext.factory.createThing();',
        '}',
      ].join('\n') + '\n',
    });
    const direct = state.callResolutions!.find(c => c.calleeName === 'doThing');
    expect(direct, 'ext.doThing()').toBeDefined();
    expect(direct!.kind).toBe('external');
    expect(direct!.reason).toBe('external_module_receiver');

    const dotted = state.callResolutions!.find(c => c.calleeName === 'createThing');
    expect(dotted, 'ext.factory.createThing()').toBeDefined();
    expect(dotted!.kind).toBe('external');
    expect(dotted!.reason).toBe('external_module_receiver');
  });

  it('(a2) default-import receivers from an external package classify the same', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import extDefault from 'extlib';",
        'export function use(): void {',
        '  extDefault.run();',
        '}',
      ].join('\n') + '\n',
    });
    const call = state.callResolutions!.find(c => c.calleeName === 'run');
    expect(call).toBeDefined();
    expect(call!.kind).toBe('external');
    expect(call!.reason).toBe('external_module_receiver');
  });

  it('(b) cast/paren-wrapped receivers normalize to the underlying import binding', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as ext from 'extlib';",
        'export function use(): void {',
        '  (ext as any).legacyThing();',
        '  (ext).plainParen();',
        '}',
      ].join('\n') + '\n',
    });
    for (const callee of ['legacyThing', 'plainParen']) {
      const call = state.callResolutions!.find(c => c.calleeName === callee);
      expect(call, `${callee} call`).toBeDefined();
      expect(call!.kind, `${callee} kind (receiver: ${call!.receiverText})`).toBe('external');
      expect(call!.reason).toBe('external_module_receiver');
    }
  });

  it('(c) node-builtin module receivers keep builtin_module_receiver precedence', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as nodePath from 'path';",
        'export function j(a: string, b: string): string {',
        '  return nodePath.join(a, b);',
        '}',
      ].join('\n') + '\n',
    });
    const call = state.callResolutions!.find(c => c.calleeName === 'join');
    expect(call).toBeDefined();
    expect(call!.kind).toBe('builtin');
    expect(call!.reason).toBe('builtin_module_receiver');
  });

  it('(d) PROJECT-import receivers keep branch-4 behavior — never external', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/other.ts': 'export const helper = { poke(): void {} };\n',
      'src/main.ts': [
        "import { helper } from './other.js';",
        'export function use(): void {',
        '  helper.uniqueUnknownMethod();',
        '}',
      ].join('\n') + '\n',
    });
    const call = state.callResolutions!.find(c => c.calleeName === 'uniqueUnknownMethod');
    expect(call).toBeDefined();
    expect(call!.kind).not.toBe('external');
    expect(['ambiguous', 'unresolved', 'resolved']).toContain(call!.kind);
  });

  it('(e) unknown non-import receivers stay unresolved', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'declare const mystery: { poke(): void };',
        'export function use(): void {',
        '  mystery.pokeUnknown();',
        '}',
      ].join('\n') + '\n',
    });
    const call = state.callResolutions!.find(c => c.calleeName === 'pokeUnknown');
    expect(call).toBeDefined();
    expect(call!.kind).toBe('unresolved');
    expect(call!.reason).toBe('receiver_not_in_symbol_table');
  });

  it('(f) pure dotted receivers rooted in BUILTIN_RECEIVERS classify builtin_root_receiver', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export function log(msg: string): void {',
        '  process.stderr.write(msg);',
        '}',
      ].join('\n') + '\n',
    });
    const call = state.callResolutions!.find(c => c.calleeName === 'write');
    expect(call, 'process.stderr.write').toBeDefined();
    expect(call!.kind).toBe('builtin');
    expect(call!.reason).toBe('builtin_root_receiver');
  });

  it('(g) dispositions only — the phase creates no resolved edges from these branches', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as ext from 'extlib';",
        'export function use(): void {',
        '  ext.doThing();',
        '  (ext as any).legacyThing();',
        '  process.stderr.write("x");',
        '}',
      ].join('\n') + '\n',
    });
    const touched = state.callResolutions!.filter(
      c => c.reason === 'external_module_receiver' || c.reason === 'builtin_root_receiver',
    );
    expect(touched.length).toBeGreaterThanOrEqual(3);
    for (const c of touched) {
      expect(c.kind).not.toBe('resolved');
      expect(c.resolvedTargetCodeRefId).toBeUndefined();
    }
  });
});
