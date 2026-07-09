/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability js-prototype-member-builtin-reclassification-test
 */

/**
 * STUB-KWDA8V Phase 3, sub-stage 3c (operator ruling 2026-07-09) SUPERSEDES the
 * 2026-06-12 option-A ruling (STUB-XX4JBC). Previously, an unknown-receiver call
 * whose callee was JS prototype vocabulary (push/map/...) stayed
 * kind='unresolved' reason='receiver_not_in_symbol_table' with an additive
 * evidence.probableBuiltinMember=true flag. The measured baseline (src/ scan)
 * showed 4,378 such edges in real src — calls like `arr.push()`/`str.split()`
 * that will NEVER resolve to a project target. They are honestly builtins.
 *
 * Phase 3 3c reclassifies them: unknown receiver + JS-prototype callee +
 * JS/TS file + ZERO project candidates -> kind='builtin'
 * reason='js_prototype_member'. `builtin` emits NO graph edge (identical to
 * unresolved on the graph), so the ruling's original concern — never fabricate
 * a project edge — is preserved. The probableBuiltinMember flag is REMOVED (the
 * classification now carries the meaning).
 *
 * Guardrails asserted here:
 *   - a NON-prototype method (customWeirdMethod) on an unknown receiver still
 *     stays unresolved receiver_not_in_symbol_table (no over-reach);
 *   - the reclassification is LANGUAGE-GUARDED: a Python `.split()` on an
 *     unknown receiver is NOT JS-reclassified;
 *   - a PROJECT method genuinely named like prototype vocab, reached via a
 *     KNOWN receiver, still resolves (the 3c tail only fires on zero candidates).
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports } from '../../src/pipeline/import-resolver.js';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import { constructGraph } from '../../src/pipeline/graph-builder.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('js_prototype_member builtin reclassification (STUB-KWDA8V 3c, supersedes STUB-XX4JBC option-A)', () => {
  it('unknown-receiver JS-prototype call classifies builtin; a non-prototype call stays unresolved', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-protobuiltin-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export function go(x: any): void {',
        '  x.push(1);',
        '  x.customWeirdMethod();',
        '}',
      ].join('\n') + '\n',
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    state.importResolutions = resolveImports(state);
    state.callResolutions = resolveCalls(state);

    // push is JS prototype vocabulary on an unknown receiver -> builtin.
    const pushCall = state.callResolutions.find(c => c.calleeName === 'push');
    expect(pushCall, 'push call').toBeDefined();
    expect(pushCall!.kind).toBe('builtin');
    expect(pushCall!.reason).toBe('js_prototype_member');

    // customWeirdMethod is NOT prototype vocabulary -> stays unresolved.
    const weirdCall = state.callResolutions.find(c => c.calleeName === 'customWeirdMethod');
    expect(weirdCall, 'customWeirdMethod call').toBeDefined();
    expect(weirdCall!.kind).toBe('unresolved');
    expect(weirdCall!.reason).toBe('receiver_not_in_symbol_table');

    // Graph: the push call now emits a BUILTIN edge (resolutionStatus='builtin',
    // no targetId — no project edge is fabricated, same as every other builtin
    // call). It leaves the unresolved/receiver_not_in_symbol_table population.
    // The unresolved weird call still emits an unresolved edge with no
    // probableBuiltinMember flag (removed).
    const graph = constructGraph(state);
    const pushEdge = graph.edges.find(
      e => (e.evidence as { calleeName?: string } | undefined)?.calleeName === 'push',
    );
    expect(pushEdge, 'push edge').toBeDefined();
    expect(pushEdge!.resolutionStatus).toBe('builtin');
    expect(pushEdge!.targetId, 'builtin edge fabricates no project target').toBeFalsy();

    const weirdEdge = graph.edges.find(
      e => (e.evidence as { calleeName?: string } | undefined)?.calleeName === 'customWeirdMethod',
    );
    expect(weirdEdge, 'customWeirdMethod edge').toBeDefined();
    expect(weirdEdge!.resolutionStatus).toBe('unresolved');
    expect(weirdEdge!.reason).toBe('receiver_not_in_symbol_table');
    expect((weirdEdge!.evidence as { probableBuiltinMember?: boolean }).probableBuiltinMember).toBeUndefined();
  });

  it('LANGUAGE GUARD: a Python .split() on an unknown receiver is NOT JS-reclassified builtin', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-pyproto-'));
    created.push(dir);
    await fs.writeFile(
      path.join(dir, 'mod.py'),
      ['def go(x):', '    return x.split(",")', ''].join('\n'),
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['py'],
      mode: 'full',
    });
    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);

    const splitCall = calls.find(c => c.calleeName === 'split');
    expect(splitCall, 'python split call').toBeDefined();
    // NOT reclassified to the JS builtin — the js_prototype_member path is
    // language-guarded. It stays an honest unknown-receiver unresolved.
    expect(splitCall!.reason).not.toBe('js_prototype_member');
    expect(splitCall!.kind).not.toBe('builtin');
  });

  it('PROJECT-METHOD SAFETY: a project method named like prototype vocab, via a KNOWN receiver, still resolves (3c only fires on zero candidates)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-projmap-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    // Widget.map is a real project method; `const w = new Widget(); w.map()`
    // resolves via the new-initializer branch (3a) long before the 3c tail.
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export class Widget {',
        '  map() { return 1; }',
        '}',
        'export function run() {',
        '  const w = new Widget();',
        '  return w.map();',
        '}',
      ].join('\n') + '\n',
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    state.importResolutions = resolveImports(state);
    const calls = resolveCalls(state);

    const mapCall = calls.find(c => c.receiverText === 'w' && c.calleeName === 'map');
    expect(mapCall, 'w.map() call').toBeDefined();
    // Known receiver -> resolves to the project method, NOT swept to builtin.
    expect(mapCall!.kind).toBe('resolved');
    expect(mapCall!.reason).not.toBe('js_prototype_member');
  });
});
