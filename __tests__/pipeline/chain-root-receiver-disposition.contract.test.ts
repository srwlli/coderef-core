/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability chain-root-receiver-disposition-contract
 */

/**
 * Contract tests for FU-2 lever 1 — chain-root receiver disposition
 * (WO-RESOLVE-62-OF-UNRESOLVED-CALLS-VIA-SCOPE-STACK-001).
 *
 * P2 shipped root extraction for PURE dotted chains and cast/paren wrappers.
 * It deliberately returned null for CALL-expression receivers, which left the
 * fluent-builder and factory-call population in the unresolved tail. Measured
 * on this repo at the clean 2026-08-01 baseline (HEAD 41293bc), those were 216
 * of the 547 honest receiver_not_in_symbol_table edges: 173 call-expression
 * (`z.string().optional()`, `createHash('sha256').update(x)`) and 43 new-expr
 * (`new Date().toISOString()`).
 *
 * The envelope, authored BEFORE measuring the delta:
 *   (a) external-package fluent chains classify external_module_receiver,
 *       including chains broken across lines the way builders are written;
 *   (b) node-builtin module CALL chains classify builtin_module_receiver,
 *       keeping the branch-3.5 precedence bare receivers already had;
 *   (c) `new X()` chains on a BUILTIN_RECEIVERS constructor classify
 *       builtin_root_receiver;
 *   (d) PROJECT-import receivers are untouched — a chain root must never
 *       manufacture an external disposition for first-party code;
 *   (e) `this.x()` / `super.x()` chains keep branch-1/2 ownership;
 *   (f) REFUSAL BIAS: expressions whose root is not provable (ternary, `??`,
 *       a second bare identifier) stay unresolved rather than guess;
 *   (g) the lever adds ZERO resolved edges — dispositions only, exactly as
 *       P2 did. This is the property that makes the change unable to
 *       fabricate project structure.
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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-chainroot-'));
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

const PKG = JSON.stringify({ name: 'fx', dependencies: { zod: '3.0.0' } });

function call(state: PipelineState, callee: string) {
  return state.callResolutions!.find(c => c.calleeName === callee);
}

describe('chain-root receiver disposition (FU-2 lever 1 contract)', () => {
  it('(a) external-package fluent chains classify external_module_receiver', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import { z } from 'zod';",
        'export function schema(): unknown {',
        '  const a = z.string().describe("x");',
        '  const b = z.number().optional().describe("y");',
        '  return [a, b];',
        '}',
      ].join('\n') + '\n',
    });
    for (const callee of ['describe', 'optional']) {
      const c = call(state, callee);
      expect(c, `z chain -> ${callee}`).toBeDefined();
      expect(c!.kind, `${callee} kind`).toBe('external');
      expect(c!.reason, `${callee} reason`).toBe('external_module_receiver');
    }
  });

  it('(a2) chains broken across lines resolve identically to single-line ones', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import { z } from 'zod';",
        'export function schema(): unknown {',
        '  return z',
        '    .string()',
        '    .optional()',
        '    .describe("multiline");',
        '}',
      ].join('\r\n') + '\r\n',
    });
    const c = call(state, 'describe');
    expect(c, 'CRLF-broken fluent chain').toBeDefined();
    expect(c!.kind).toBe('external');
    expect(c!.reason).toBe('external_module_receiver');
  });

  it('(b) node-builtin module call chains keep builtin_module_receiver', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import { createHash } from 'crypto';",
        "import * as nodeFs from 'fs';",
        'export function hash(content: string, p: string): string {',
        "  const dir = nodeFs.lstatSync(p).isDirectory();",
        "  void dir;",
        "  return createHash('sha256').update(content).digest('hex');",
        '}',
      ].join('\n') + '\n',
    });
    for (const callee of ['isDirectory', 'update', 'digest']) {
      const c = call(state, callee);
      expect(c, `builtin chain -> ${callee}`).toBeDefined();
      expect(c!.kind, `${callee} kind`).toBe('builtin');
    }
  });

  it('(c) new-expression chains on a builtin constructor classify builtin', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export function stamp(): string {',
        '  return new Date().toISOString();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'toISOString');
    expect(c, 'new Date().toISOString()').toBeDefined();
    expect(c!.kind).toBe('builtin');
    expect(c!.reason).toBe('builtin_root_receiver');
  });

  it('(d) PROJECT-import receivers are never swept to external by a chain root', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/dep.ts': [
        'export class Widget {',
        '  build(): Widget { return this; }',
        '  render(): string { return "w"; }',
        '}',
        'export function makeWidget(): Widget { return new Widget(); }',
      ].join('\n') + '\n',
      'src/main.ts': [
        "import { makeWidget } from './dep.js';",
        'export function use(): string {',
        '  return makeWidget().render();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'render');
    expect(c, 'makeWidget().render()').toBeDefined();
    expect(c!.kind, 'a first-party factory chain must not become external').not.toBe('external');
  });

  it('(e) this/super chains stay with the branch that owns them', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        'export class Svc {',
        '  private make(): Svc { return this; }',
        '  run(): void { this.make().finish(); }',
        '  finish(): void { /* noop */ }',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'finish');
    expect(c, 'this.make().finish()').toBeDefined();
    expect(c!.kind, 'this-rooted chains are never external').not.toBe('external');
  });

  it('(f) refusal bias: unprovable roots stay unresolved rather than guess', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import { z } from 'zod';",
        'export function pick(flag: boolean, other: any): unknown {',
        '  return (flag ? z : other).ternaryMember();',
        '}',
      ].join('\n') + '\n',
    });
    const c = call(state, 'ternaryMember');
    expect(c, 'ternary receiver').toBeDefined();
    expect(c!.kind, 'a ternary receiver root is a guess, not a fact').not.toBe('external');
    expect(c!.kind).not.toBe('builtin');
  });

  it('(h) test_dsl keeps precedence — matcher chains never migrate to external', async () => {
    // Regression guard. The chain root of `expect(result)` is `expect`, which
    // is a vitest import, so an ungated widening dispositions it external and
    // applyTestDslReclassify — which fires only on 'unresolved' — can never
    // reclaim it. Measured cost when this was ungated: test_dsl_count
    // 16,847 -> 10,319 on a full self-scan, with the whole suite still green.
    const state = await scanFixture({
      'package.json': JSON.stringify({ name: 'fx', devDependencies: { vitest: '4.0.0' } }),
      '__tests__/sample.test.ts': [
        "import { describe, it, expect, vi } from 'vitest';",
        "describe('s', () => {",
        "  it('works', () => {",
        '    const spy = vi.fn();',
        '    expect(spy).toHaveBeenCalled();',
        '    expect(1 + 1).toBe(2);',
        '  });',
        '});',
      ].join('\n') + '\n',
    });
    for (const callee of ['toHaveBeenCalled', 'toBe']) {
      const c = call(state, callee);
      expect(c, `expect() chain -> ${callee}`).toBeDefined();
      expect(c!.kind, `${callee} kind`).toBe('builtin');
      expect(c!.reason, `${callee} must stay in the test_dsl population`)
        .toBe('test_dsl_matcher_receiver');
    }
  });

  it('(g) the lever adds ZERO resolved edges — dispositions only', async () => {
    const state = await scanFixture({
      'package.json': PKG,
      'src/main.ts': [
        "import { z } from 'zod';",
        'export function schema(): unknown {',
        '  return z.string().optional().describe("x");',
        '}',
        'export function stamp(): string { return new Date().toISOString(); }',
      ].join('\n') + '\n',
    });
    const touched = state.callResolutions!.filter(
      c => ['describe', 'optional', 'toISOString'].includes(c.calleeName),
    );
    expect(touched.length).toBeGreaterThan(0);
    for (const c of touched) {
      expect(c.kind, `${c.calleeName} must not be a resolved project edge`).not.toBe('resolved');
      expect(c.resolvedTargetCodeRefId, `${c.calleeName} target`).toBeUndefined();
    }
  });
});
