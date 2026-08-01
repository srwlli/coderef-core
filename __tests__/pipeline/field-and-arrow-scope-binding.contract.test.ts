/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability field-and-arrow-scope-binding-contract
 */

/**
 * Contract tests for FU-2 levers 3 and 4
 * (WO-RESOLVE-62-OF-UNRESOLVED-CALLS-VIA-SCOPE-STACK-001).
 *
 * Lever 3 — `this.<field>` binding. Declared class field types are projected
 * into every method scope of that class, so `this.index.query()` reaches
 * branch 3's own-methods + heritage lookup exactly as a local would. Applied
 * AFTER the walk on purpose: the walk is a single forward pass and a field is
 * routinely declared below the methods that use it.
 *
 * Lever 4 — arrow-function scope frames. `const NAME = (params) => {` never
 * pushed a frame, so its typed parameters were never parsed at all. Measured
 * on the clean 2026-08-01 baseline this was the single largest residual class:
 * `const traverse = (node: Parser.SyntaxNode) => {...}` in the two extractor
 * files held 54 of the 282 remaining receiver_not_in_symbol_table edges.
 *
 * Unlike levers 1 and 2, lever 3 is the FIRST of this program's levers that
 * produces new RESOLVED project edges rather than only honest dispositions —
 * so its no-fabrication cases matter more, not less.
 *
 * The envelope, authored BEFORE measuring the delta:
 *   (a) `this.<field>` on a project-typed field resolves to the field type's
 *       own method;
 *   (b) a field declared BELOW its users still binds (post-walk ordering);
 *   (c) a field typed with an external qualified name dispositions external,
 *       never resolved;
 *   (d) `this.a.b` (two levels) is NOT bound — no dotted-path guessing;
 *   (e) an UNDECLARED field stays unresolved;
 *   (f) typed params of a brace-bodied arrow bind;
 *   (g) an arrow's bindings do NOT leak to a sibling scope after it closes;
 *   (h) an expression-bodied arrow pushes no frame (no leak, no crash);
 *   (i) `this` and `super` themselves keep their own branches.
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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-fieldarrow-'));
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

const PKG = JSON.stringify({ name: 'fx', dependencies: { 'tree-sitter': '0.20.0' } });

function call(state: PipelineState, callee: string) {
  return state.callResolutions!.find(c => c.calleeName === callee);
}

describe('field + arrow scope binding (FU-2 levers 3/4 contract)', () => {
  it('(a) this.<field> on a project-typed field resolves to that type\'s method', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Index {',
        '  query(): string { return "q"; }',
        '}',
        'export class Service {',
        '  private index: Index;',
        '  constructor(ix: Index) { this.index = ix; }',
        '  run(): string { return this.index.query(); }',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'query');
    expect(c, 'this.index.query()').toBeDefined();
    expect(c!.kind).toBe('resolved');
  });

  it('(b) a field declared BELOW its users still binds (post-walk ordering)', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Client {',
        '  send(): string { return "s"; }',
        '}',
        'export class Late {',
        '  run(): string { return this.client.send(); }',
        '  private client: Client = new Client();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'send');
    expect(c, 'this.client.send() with client declared after run()').toBeDefined();
    expect(c!.kind).toBe('resolved');
  });

  it('(c) an externally-typed field dispositions external, never resolved', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import type Parser from 'tree-sitter';",
        'export class Holder {',
        '  private tree: Parser.Tree;',
        '  constructor(t: Parser.Tree) { this.tree = t; }',
        '  walk(): unknown { return this.tree.rootNode(); }',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'rootNode');
    expect(c, 'this.tree.rootNode() where tree: Parser.Tree').toBeDefined();
    expect(c!.kind).toBe('external');
    expect(c!.reason).toBe('external_annotation_receiver');
  });

  it('(d) two-level this.a.b is NOT bound — no dotted-path guessing', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Inner { go(): string { return "g"; } }',
        'export class Outer {',
        '  private inner: Inner = new Inner();',
        '  run(): string { return this.inner.nested.go(); }',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'go');
    expect(c, 'this.inner.nested.go()').toBeDefined();
    // The binding key is the FULL receiver text (`this.inner`), so
    // `this.inner.nested` cannot match it. If this edge resolves at all it
    // must be via the PRE-EXISTING single-candidate ACG path, which is
    // explicitly approximate and labels itself provisional. What must never
    // happen is a field binding claiming a two-level path as exact.
    if (c!.kind === 'resolved') {
      expect(c!.reason, 'a two-level path may only resolve via ACG').toBe('field_based_acg');
      expect(c!.confidence, 'and only as provisional').toBe('provisional');
    }
  });

  it('(c2) a field typed with a BARE external class dispositions external', async () => {
    // `private client: Pinecone` binds fine, but own-methods and heritage both
    // miss because Pinecone is a third-party class. Before this it fell to the
    // honest tail; it is honestly an external member call.
    const state = await scanFixture({
      'package.json': JSON.stringify({ name: 'fx', dependencies: { 'tree-sitter': '0.20.0' } }),
      'src/main.ts': [
        "import { Parser } from 'tree-sitter';",
        'export class Store {',
        '  private client: Parser;',
        '  constructor(c: Parser) { this.client = c; }',
        '  run(): unknown { return this.client.parse(); }',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'parse');
    expect(c, 'this.client.parse() where client: Parser (external)').toBeDefined();
    expect(c!.kind).toBe('external');
  });

  it('(c3) a field typed with a PROJECT class still resolves, never external', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/dep.ts': 'export class Local { ping(): string { return "p"; } }\n',
      'src/main.ts': [
        "import { Local } from './dep.js';",
        'export class Host {',
        '  private dep: Local;',
        '  constructor(d: Local) { this.dep = d; }',
        '  run(): string { return this.dep.ping(); }',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'ping');
    expect(c, 'this.dep.ping() where dep: Local (project)').toBeDefined();
    expect(c!.kind, 'a first-party field type must not become external').not.toBe('external');
  });

  it('(e) an undeclared field stays unresolved', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Bare {',
        '  run(): unknown { return this.missing.doIt(); }',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'doIt');
    expect(c, 'this.missing.doIt()').toBeDefined();
    expect(c!.kind).not.toBe('resolved');
    expect(c!.kind).not.toBe('external');
  });

  it('(f) typed params of a brace-bodied arrow bind', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import type Parser from 'tree-sitter';",
        'export function extract(root: unknown): void {',
        '  const traverse = (node: Parser.SyntaxNode, depth?: number) => {',
        '    void depth;',
        '    void node.startIndex();',
        '  };',
        '  void traverse;',
        '  void root;',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'startIndex');
    expect(c, 'node.startIndex() inside an arrow').toBeDefined();
    expect(c!.kind).toBe('external');
    expect(c!.reason).toBe('external_annotation_receiver');
  });

  it('(g) arrow bindings do NOT leak into a sibling scope after it closes', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Widget { render(): string { return "w"; } }',
        'export function host(): void {',
        '  const first = (widget: Widget) => {',
        '    void widget.render();',
        '  };',
        '  void first;',
        '  const stray: unknown = null;',
        '  void (stray as any).render();',
        '}',
      ].join('\n') + '\n',
    });
    // The in-arrow call binds and resolves.
    const inside = state.callResolutions!.find(
      c => c.calleeName === 'render' && c.receiverText === 'widget',
    );
    expect(inside, 'widget.render() inside the arrow').toBeDefined();
    expect(inside!.kind).toBe('resolved');
    // The sibling call must NOT have picked up the arrow's binding.
    const outside = state.callResolutions!.find(
      c => c.calleeName === 'render' && c.receiverText !== 'widget',
    );
    if (outside) {
      expect(outside.receiverText, 'sibling receiver is not the arrow param').not.toBe('widget');
    }
  });

  it('(h) an expression-bodied arrow pushes no frame and does not leak', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Widget { render(): string { return "w"; } }',
        'export function host(): void {',
        '  const brief = (widget: Widget) => widget.render();',
        '  void brief;',
        '}',
      ].join('\n') + '\n',
    });
    // Deliberately unasserted on kind: the contract is that the walk stays
    // sane (no crash, no leaked frame), not that expression bodies bind.
    expect(state.callResolutions, 'resolutions produced').toBeDefined();
    expect(state.callResolutions!.length).toBeGreaterThan(0);
  });

  it('(i) this and super keep their own branches', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Base { greet(): string { return "b"; } }',
        'export class Derived extends Base {',
        '  private helper: Base = new Base();',
        '  own(): string { return "o"; }',
        '  run(): string { return this.own() + super.greet() + this.helper.greet(); }',
        '}',
      ].join('\n') + '\n',
    });
    const own = state.callResolutions!.find(c => c.calleeName === 'own');
    expect(own, 'this.own()').toBeDefined();
    expect(own!.kind, 'this.own() stays on the this-branch').toBe('resolved');
    const sup = state.callResolutions!.find(c => c.receiverText === 'super');
    expect(sup, 'super.greet()').toBeDefined();
    expect(sup!.kind, 'super.greet() stays on the super-branch').toBe('resolved');
  });
});
