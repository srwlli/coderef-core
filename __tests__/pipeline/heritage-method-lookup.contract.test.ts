/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability heritage-method-lookup-contract
 */

/**
 * Contract tests for P3 heritage-aware method lookup
 * (WO-EDGE-RESOLUTION-IMPROVEMENT-PROGRAM-001 P3, STUB-9B66EN — retires the
 * branch-3 guardrail-3 "no parent-class walking" restriction using the
 * state.heritage facts extracted since genre-features P5).
 *
 * The envelope, authored BEFORE the implementation (P3-T3):
 *   (a) `const a = new A(); a.fromBase()` with `class A extends Base` resolves
 *       EXACT to Base.fromBase with reason='heritage_method_lookup';
 *   (b) multi-level chains (A extends B extends C, method on C) resolve
 *       through the chain;
 *   (c) heritage cycles terminate without hang and leave the prior
 *       classification;
 *   (d) `super.x()` resolves to the parent's method; heritage-present-but-
 *       method-absent yields 'super_method_not_in_heritage'; no heritage at
 *       all keeps 'super_call_out_of_scope';
 *   (e) inherited `this.x()` (method on parent, call in child) resolves via
 *       the chain;
 *   (f) OWN methods shadow inherited same-name methods (nearest wins);
 *   (g) external/unknown supertypes never fabricate a resolution;
 *   (h) same-ancestor-name multi-file collisions yield ambiguous with
 *       candidates, never silent resolution;
 *   (i) annotation/param scope bindings get the same walk as 'new' bindings.
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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-heritage-'));
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

function findCall(state: PipelineState, callee: string) {
  return state.callResolutions!.find(c => c.calleeName === callee);
}

describe('heritage-aware method lookup (P3 contract)', () => {
  it('(a) new-binding receiver resolves an inherited method EXACT via the declared chain', async () => {
    const state = await scanFixture({
      'src/base.ts': 'export class Base {\n  fromBase(): void {}\n}\n',
      'src/a.ts': "import { Base } from './base.js';\nexport class A extends Base {}\n",
      'src/main.ts': [
        "import { A } from './a.js';",
        'export function use(): void {',
        '  const a = new A();',
        '  a.fromBase();',
        '}',
      ].join('\n') + '\n',
    });
    const call = findCall(state, 'fromBase');
    expect(call, 'a.fromBase()').toBeDefined();
    expect(call!.kind).toBe('resolved');
    expect(call!.reason).toBe('heritage_method_lookup');
    expect(call!.confidence).toBeUndefined();
    // The id is symbol-table canonical (element codeRefId, or the same
    // line-anchored synthesis branch-3 own-method resolutions use in minimal
    // mode) — assert it points at Base.fromBase by file + member name.
    expect(call!.resolvedTargetCodeRefId).toBeDefined();
    expect(call!.resolvedTargetCodeRefId).toContain('fromBase');
    expect(call!.resolvedTargetCodeRefId).toContain('base');
  });

  it('(b) multi-level chains resolve through intermediate ancestors', async () => {
    const state = await scanFixture({
      'src/c.ts': 'export class C {\n  deepMethod(): void {}\n}\n',
      'src/b.ts': "import { C } from './c.js';\nexport class B extends C {}\n",
      'src/a.ts': "import { B } from './b.js';\nexport class A extends B {}\n",
      'src/main.ts': [
        "import { A } from './a.js';",
        'export function use(): void {',
        '  const a = new A();',
        '  a.deepMethod();',
        '}',
      ].join('\n') + '\n',
    });
    const call = findCall(state, 'deepMethod');
    expect(call).toBeDefined();
    expect(call!.kind).toBe('resolved');
    expect(call!.reason).toBe('heritage_method_lookup');
  });

  it('(c) heritage cycles terminate and leave the prior classification', async () => {
    const state = await scanFixture({
      'src/loop.ts': [
        'export class Alpha extends Beta {}',
        'export class Beta extends Alpha {}',
      ].join('\n') + '\n',
      'src/main.ts': [
        "import { Alpha } from './loop.js';",
        'export function use(): void {',
        '  const x = new Alpha();',
        '  x.nowhereMethod();',
        '}',
      ].join('\n') + '\n',
    });
    const call = findCall(state, 'nowhereMethod');
    expect(call, 'cycle walk must terminate').toBeDefined();
    expect(call!.kind).toBe('unresolved');
  });

  it('(d) super.x() resolves to the parent method; misses are honestly reasoned', async () => {
    const state = await scanFixture({
      'src/base.ts': 'export class Greeter {\n  greet(): void {}\n}\n',
      'src/child.ts': [
        "import { Greeter } from './base.js';",
        'export class LoudGreeter extends Greeter {',
        '  shout(): void {',
        '    super.greet();',
        '    super.missingMethod();',
        '  }',
        '}',
      ].join('\n') + '\n',
      'src/solo.ts': [
        'export class Solo {',
        '  m(): void {',
        '    super.orphanCall();',
        '  }',
        '}',
      ].join('\n') + '\n',
    });
    const hit = findCall(state, 'greet');
    expect(hit, 'super.greet()').toBeDefined();
    expect(hit!.kind).toBe('resolved');
    expect(hit!.reason).toBe('heritage_method_lookup');

    const miss = findCall(state, 'missingMethod');
    expect(miss, 'super.missingMethod()').toBeDefined();
    expect(miss!.kind).toBe('unresolved');
    expect(miss!.reason).toBe('super_method_not_in_heritage');

    const orphan = findCall(state, 'orphanCall');
    expect(orphan, 'super in a class with no heritage').toBeDefined();
    expect(orphan!.kind).toBe('unresolved');
    expect(orphan!.reason).toBe('super_call_out_of_scope');
  });

  it('(e) inherited this.x() resolves via the chain', async () => {
    const state = await scanFixture({
      'src/base.ts': 'export class Engine {\n  ignite(): void {}\n}\n',
      'src/child.ts': [
        "import { Engine } from './base.js';",
        'export class V8Engine extends Engine {',
        '  start(): void {',
        '    this.ignite();',
        '  }',
        '}',
      ].join('\n') + '\n',
    });
    const call = findCall(state, 'ignite');
    expect(call, 'this.ignite()').toBeDefined();
    expect(call!.kind).toBe('resolved');
    expect(call!.reason).toBe('heritage_method_lookup');
  });

  it('(f) own methods shadow inherited same-name methods (nearest wins)', async () => {
    const state = await scanFixture({
      'src/base.ts': 'export class Painter {\n  draw(): void {}\n}\n',
      'src/child.ts': [
        "import { Painter } from './base.js';",
        'export class Sketcher extends Painter {',
        '  draw(): void {}',
        '}',
      ].join('\n') + '\n',
      'src/main.ts': [
        "import { Sketcher } from './child.js';",
        'export function use(): void {',
        '  const s = new Sketcher();',
        '  s.draw();',
        '}',
      ].join('\n') + '\n',
    });
    const call = findCall(state, 'draw');
    expect(call).toBeDefined();
    expect(call!.kind).toBe('resolved');
    // Own-method exact resolution — NOT the heritage walk (branch 3 wins first).
    expect(call!.reason).not.toBe('heritage_method_lookup');
    // Shadowing proof: the target lives in child.ts (Sketcher.draw), not base.ts.
    expect(call!.resolvedTargetCodeRefId).toContain('child');
    expect(call!.resolvedTargetCodeRefId).not.toContain('base');
  });

  it('(g) external/unknown supertypes never fabricate a resolution', async () => {
    const state = await scanFixture({
      'package.json': JSON.stringify({ name: 'fx', dependencies: { extlib: '1.0.0' } }),
      'src/bus.ts': [
        "import { EmitterBase } from 'extlib';",
        'export class Bus extends EmitterBase {}',
      ].join('\n') + '\n',
      'src/main.ts': [
        "import { Bus } from './bus.js';",
        'export function use(): void {',
        '  const b = new Bus();',
        '  b.emitUnknownThing();',
        '}',
      ].join('\n') + '\n',
    });
    const call = findCall(state, 'emitUnknownThing');
    expect(call).toBeDefined();
    expect(call!.kind).not.toBe('resolved');
    expect(call!.resolvedTargetCodeRefId).toBeUndefined();
  });

  it('(h) same-ancestor-name collisions across files yield ambiguous, never silent resolution', async () => {
    const state = await scanFixture({
      'src/p1.ts': 'export class Pack {\n  seal(): void {}\n}\n',
      'src/p2.ts': 'export class Pack {\n  seal(): void {}\n}\n',
      'src/k.ts': [
        "import { Pack } from './p1.js';",
        'export class Kit extends Pack {}',
      ].join('\n') + '\n',
      'src/main.ts': [
        "import { Kit } from './k.js';",
        'export function use(): void {',
        '  const k = new Kit();',
        '  k.seal();',
        '}',
      ].join('\n') + '\n',
    });
    const call = findCall(state, 'seal');
    expect(call).toBeDefined();
    expect(call!.kind).toBe('ambiguous');
    expect(call!.reason).toBe('heritage_method_lookup');
    expect(call!.candidates!.length).toBeGreaterThanOrEqual(2);
  });

  it('(i) annotation and param bindings get the same heritage walk as new bindings', async () => {
    const state = await scanFixture({
      'src/base.ts': 'export class Store {\n  persist(): void {}\n  hydrate(): void {}\n}\n',
      'src/child.ts': "import { Store } from './base.js';\nexport class DiskStore extends Store {}\n",
      'src/main.ts': [
        "import { DiskStore } from './child.js';",
        'export function viaParam(d: DiskStore): void {',
        '  d.persist();',
        '}',
        'export function viaAnnotation(): void {',
        '  const d: DiskStore = makeStore();',
        '  d.hydrate();',
        '}',
        'declare function makeStore(): DiskStore;',
      ].join('\n') + '\n',
    });
    const viaParam = findCall(state, 'persist');
    expect(viaParam, 'param-bound receiver').toBeDefined();
    expect(viaParam!.kind).toBe('resolved');
    expect(viaParam!.reason).toBe('heritage_method_lookup');

    const viaAnnotation = findCall(state, 'hydrate');
    expect(viaAnnotation, 'annotation-bound receiver').toBeDefined();
    expect(viaAnnotation!.kind).toBe('resolved');
    expect(viaAnnotation!.reason).toBe('heritage_method_lookup');
  });
});
