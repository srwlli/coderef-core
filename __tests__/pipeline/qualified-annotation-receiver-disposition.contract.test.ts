/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability qualified-annotation-receiver-disposition-contract
 */

/**
 * Contract tests for FU-2 lever 2 — qualified-annotation receiver disposition
 * (WO-RESOLVE-62-OF-UNRESOLVED-CALLS-VIA-SCOPE-STACK-001).
 *
 * scope-binding's usableAnnotationType accepts only a BARE PascalCase
 * identifier, so every qualified annotation was rejected outright and
 * `(node: ts.Node)` produced NO binding at all — the receiver fell straight to
 * the honest tail. Measured on the clean 2026-08-01 baseline (HEAD 41293bc),
 * locals typed this way were ~160 of the 547 receiver_not_in_symbol_table
 * edges: `node` 92, `entry` 22, `res` 12, `child` 10, `spec` 9, `worker` 7,
 * `server` 6.
 *
 * These are never project structure — ts.Node is the TypeScript compiler API,
 * fs.Dirent is Node's. So the binding exists to reach a DISPOSITION, not a
 * resolution.
 *
 * The envelope, authored BEFORE measuring the delta:
 *   (a) params typed `ns.Type` where ns is an EXTERNAL package import
 *       classify external with reason='external_annotation_receiver';
 *   (b) params typed `ns.Type` where ns is a NODE BUILTIN import keep the
 *       canonical builtin_module_receiver disposition;
 *   (c) the `const x: ns.Type` declaration form behaves identically;
 *   (d) a root bound to a PROJECT import falls through untouched — a project
 *       namespace must never be swept to external;
 *   (e) a root bound to NOTHING falls through untouched;
 *   (f) bare PascalCase annotations keep their pre-existing own-methods
 *       resolution (no-regress on the GX-002 binding kinds);
 *   (g) a value path (`x: config.value`, lowercase last segment) does not
 *       bind — only type-shaped qualified names do;
 *   (h) the lever adds ZERO resolved edges.
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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-qualann-'));
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

const PKG = JSON.stringify({ name: 'fx', dependencies: { typescript: '5.0.0' } });

function call(state: PipelineState, callee: string) {
  return state.callResolutions!.find(c => c.calleeName === callee);
}

describe('qualified-annotation receiver disposition (FU-2 lever 2 contract)', () => {
  it('(a) external-package qualified param types classify external_annotation_receiver', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as ts from 'typescript';",
        'export function visit(node: ts.Node): number {',
        '  return node.getStart();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'getStart');
    expect(c, 'node.getStart() where node: ts.Node').toBeDefined();
    expect(c!.kind).toBe('external');
    expect(c!.reason).toBe('external_annotation_receiver');
  });

  it('(b) node-builtin qualified param types keep builtin_module_receiver', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as nodeFs from 'fs';",
        'export function check(entry: nodeFs.Dirent): boolean {',
        '  return entry.isDirectory();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'isDirectory');
    expect(c, 'entry.isDirectory() where entry: nodeFs.Dirent').toBeDefined();
    expect(c!.kind).toBe('builtin');
    expect(c!.reason).toBe('builtin_module_receiver');
  });

  it('(c) the const-declaration form behaves identically to the param form', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as ts from 'typescript';",
        'export function read(raw: unknown): number {',
        '  const sf: ts.SourceFile = raw as ts.SourceFile;',
        '  return sf.getLineStarts().length;',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'getLineStarts');
    expect(c, 'sf.getLineStarts() where const sf: ts.SourceFile').toBeDefined();
    expect(c!.kind).toBe('external');
    expect(c!.reason).toBe('external_annotation_receiver');
  });

  it('(d) a PROJECT-import namespace root is never swept to external', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/models.ts': [
        'export class Widget {',
        '  render(): string { return "w"; }',
        '}',
      ].join('\n') + '\n',
      'src/main.ts': [
        "import * as models from './models.js';",
        'export function use(w: models.Widget): string {',
        '  return w.render();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'render');
    expect(c, 'w.render() where w: models.Widget').toBeDefined();
    expect(c!.kind, 'a first-party namespace must not become external').not.toBe('external');
  });

  it('(e) an unbound namespace root falls through untouched', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export function use(x: unknownNs.Thing): string {',
        '  return x.doIt();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'doIt');
    expect(c, 'x.doIt() with no import for unknownNs').toBeDefined();
    expect(c!.kind).not.toBe('external');
  });

  it('(f) no-regress: bare PascalCase annotations keep own-methods resolution', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Engine {',
        '  start(): string { return "on"; }',
        '}',
        'export function boot(e: Engine): string {',
        '  return e.start();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'start');
    expect(c, 'e.start() where e: Engine').toBeDefined();
    expect(c!.kind, 'bare-annotation binding must still resolve').toBe('resolved');
  });

  it('(g) a value path (lowercase last segment) does not bind', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as ts from 'typescript';",
        'export function use(x: typeof ts.factory): string {',
        '  return x.createIdentifier("a");',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'createIdentifier');
    expect(c, 'createIdentifier call').toBeDefined();
    // `typeof ts.factory` is not a qualified TYPE name; whatever disposition it
    // takes must not come from a qualified-annotation binding claiming it.
    expect(c!.reason).not.toBe('external_annotation_receiver');
  });

  it('(i) `import type` namespaces disposition identically to value imports', async () => {
    // The DOMINANT real-world form: a type annotation's namespace is normally
    // imported with `import type`, which short-circuits Phase 3 classification
    // (import-resolver.ts:546) before external/builtin is ever decided. On this
    // repo `import type Parser from 'tree-sitter'` alone accounted for 89 of
    // the remaining edges — the first cut of this lever missed all of them.
    const state = await scanFixture({
      'package.json': JSON.stringify({ name: 'fx', dependencies: { 'tree-sitter': '0.20.0' } }),
      'src/main.ts': [
        "import type Parser from 'tree-sitter';",
        'export function walk(node: Parser.SyntaxNode): number {',
        '  return node.startIndex();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'startIndex');
    expect(c, 'node.startIndex() where node: Parser.SyntaxNode, import type').toBeDefined();
    expect(c!.kind).toBe('external');
    expect(c!.reason).toBe('external_annotation_receiver');
  });

  it('(j) a PROJECT `import type` namespace still falls through', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/models.ts': 'export class Widget { render(): string { return "w"; } }\n',
      'src/main.ts': [
        "import type * as models from './models.js';",
        'export function use(w: models.Widget): string {',
        '  return w.render();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'render');
    expect(c, 'project import type namespace').toBeDefined();
    expect(c!.kind, 'typeOnlyOrigin=project must not become external').not.toBe('external');
  });

  it('(h) the lever adds ZERO resolved edges — dispositions only', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import * as ts from 'typescript';",
        "import * as nodeFs from 'fs';",
        'export function visit(node: ts.Node, entry: nodeFs.Dirent): boolean {',
        '  void node.getStart();',
        '  return entry.isDirectory();',
        '}',
      ].join('\n') + '\n',
    });
    for (const callee of ['getStart', 'isDirectory']) {
      const c = call(state, callee);
      expect(c, callee).toBeDefined();
      expect(c!.kind, `${callee} must not be a resolved project edge`).not.toBe('resolved');
      expect(c!.resolvedTargetCodeRefId, `${callee} target`).toBeUndefined();
    }
  });
});
