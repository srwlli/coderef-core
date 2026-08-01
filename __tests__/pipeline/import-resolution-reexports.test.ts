import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { createCodeRefId } from '../../src/utils/coderef-id.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 transitive re-exports (AC-08 unit)', () => {
  it('`export { foo } from "./bar"` — re-exporter\'s effective table contains foo with bar\'s origin codeRefId', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-rex-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'bar.ts'), 'export function foo() { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'index.ts'),
      "export { foo } from './bar';\n",
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { foo } from './index';\nexport const m = foo;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(
      r => r.localName === 'foo' && r.originSpecifier === './index',
    );
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
    // origin must be bar.foo, NOT index.ts's re-export.
    const barFoo = state.elements.find(e => e.name === 'foo' && e.file.endsWith('bar.ts'));
    expect(barFoo).toBeDefined();
    const expectedCodeRefId = barFoo!.codeRefId
      ?? createCodeRefId(barFoo!, state.projectPath, { includeLine: true });
    expect(r!.resolvedTargetCodeRefId).toBe(expectedCodeRefId);
  });

  it('`export * from "./bar"` — re-exporter exposes every symbol from bar with bar\'s origin codeRefIds', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-star-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'bar.ts'),
      'export const a = 1;\nexport function b() { return 2; }\n',
      'utf-8',
    );
    await fs.writeFile(path.join(dir, 'src', 'index.ts'), "export * from './bar';\n", 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { a, b } from './index';\nexport const m = a + b();\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const ra = state.importResolutions.find(
      r => r.localName === 'a' && r.originSpecifier === './index',
    );
    const rb = state.importResolutions.find(
      r => r.localName === 'b' && r.originSpecifier === './index',
    );
    expect(ra?.kind).toBe('resolved');
    expect(rb?.kind).toBe('resolved');
    const barA = state.elements.find(e => e.name === 'a' && e.file.endsWith('bar.ts'));
    const barB = state.elements.find(e => e.name === 'b' && e.file.endsWith('bar.ts'));
    if (barA) {
      const expA = barA.codeRefId ?? createCodeRefId(barA, state.projectPath, { includeLine: true });
      expect(ra!.resolvedTargetCodeRefId).toBe(expA);
    }
    if (barB) {
      const expB = barB.codeRefId ?? createCodeRefId(barB, state.projectPath, { includeLine: true });
      expect(rb!.resolvedTargetCodeRefId).toBe(expB);
    }
  });

  it('cycle a → b → a → kind=unresolved with reason=reexport_cycle (no infinite loop)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-cycle-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'a.ts'), "export { x } from './b';\n", 'utf-8');
    await fs.writeFile(path.join(dir, 'src', 'b.ts'), "export { x } from './a';\n", 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { x } from './a';\nexport const m = x;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(
      r => r.localName === 'x' && r.originSpecifier === './a',
    );
    expect(r).toBeDefined();
    expect(r!.kind).toBe('unresolved');
    expect(['reexport_cycle', 'symbol_not_in_module_exports']).toContain(r!.reason);
  });
});

/**
 * WO-ELEMENTEXTRACTOR-REVISITS-RUST-IMPL-AND-JAVA-OR-C-001 phase 3
 * (TKT-AF2FYQ / STUB-PTB2ZC).
 *
 * A RENAMED re-export did not resolve. buildExportTables dropped
 * RawExportFact.localName when it built the reExport entry, so
 * resolveTransitiveReExport recursed into the upstream module asking for the
 * DOWNSTREAM alias — a name that module has never heard of. Measured at HEAD:
 * all three shapes below came back kind='unresolved',
 * reason='symbol_not_in_module_exports'.
 *
 * The extractor was never at fault: relationship-extractor.ts:745-748 splits
 * nameNode (local) from aliasNode (exported) correctly. The fact arrived
 * well-formed and the table kept half of it.
 *
 * Worth more than its blast radius suggests: on the HEADER leg the same miss
 * lands at import-resolver.ts:710-713, which maps it to kind='stale'. A
 * correct header that re-exports through a rename was being reported as stale
 * source.
 */
describe('Phase 3 RENAMED re-exports (TKT-AF2FYQ)', () => {
  async function fixture(files: Record<string, string>, prefix: string) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    for (const [name, body] of Object.entries(files)) {
      await fs.writeFile(path.join(dir, 'src', name), body, 'utf-8');
    }
    return new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
  }

  function idOf(state: Awaited<ReturnType<PipelineOrchestrator['run']>>, name: string, file: string) {
    const el = state.elements.find(e => e.name === name && e.file.endsWith(file));
    expect(el, `origin element ${name} in ${file} must exist for this test to mean anything`).toBeDefined();
    return el!.codeRefId ?? createCodeRefId(el!, state.projectPath, { includeLine: true });
  }

  it('(a) `export { x as y } from "./m"` resolves y to m\'s x', async () => {
    const state = await fixture({
      'm.ts': 'export function x() { return 1; }\n',
      'index.ts': "export { x as y } from './m';\n",
      'main.ts': "import { y } from './index';\nexport const q = y;\n",
    }, 'coderef-p3-rename-');

    const r = state.importResolutions.find(
      r => r.localName === 'y' && r.originSpecifier === './index',
    );
    expect(r).toBeDefined();
    expect(r!.kind, `was unresolved/${r!.reason} at HEAD`).toBe('resolved');
    // Not merely "resolved" — resolved to the RIGHT origin. A wrong target
    // would satisfy a kind-only assertion.
    expect(r!.resolvedTargetCodeRefId).toBe(idOf(state, 'x', 'm.ts'));
  });

  it('(b) `export { default as Thing } from "./m"` — the barrel idiom', async () => {
    // All six renamed re-exports in this repo are this shape, and it is the
    // dominant barrel idiom in the wider ecosystem. localName here is the
    // literal `default`.
    const state = await fixture({
      'm.ts': 'export default function thing() { return 1; }\n',
      'index.ts': "export { default as Thing } from './m';\n",
      'main.ts': "import { Thing } from './index';\nexport const q = Thing;\n",
    }, 'coderef-p3-default-');

    const r = state.importResolutions.find(
      r => r.localName === 'Thing' && r.originSpecifier === './index',
    );
    expect(r).toBeDefined();
    expect(r!.kind, `was unresolved/${r!.reason} at HEAD`).toBe('resolved');
    expect(r!.resolvedTargetCodeRefId).toBe(idOf(state, 'thing', 'm.ts'));
  });

  it('(c) a TWO-HOP rename chain carries the rename at every hop', async () => {
    // The middle name `beta` exists in NO other module, so a fix that only
    // translated the first hop would still miss here. This is the case that
    // separates "recursion is rename-aware" from "the entry point is".
    const state = await fixture({
      'c.ts': 'export function alpha() { return 1; }\n',
      'b.ts': "export { alpha as beta } from './c';\n",
      'a.ts': "export { beta as gamma } from './b';\n",
      'main.ts': "import { gamma } from './a';\nexport const q = gamma;\n",
    }, 'coderef-p3-chain-');

    const r = state.importResolutions.find(
      r => r.localName === 'gamma' && r.originSpecifier === './a',
    );
    expect(r).toBeDefined();
    expect(r!.kind, `was unresolved/${r!.reason} at HEAD`).toBe('resolved');
    expect(r!.resolvedTargetCodeRefId).toBe(idOf(state, 'alpha', 'c.ts'));
  });

  it('(d) a rename whose upstream genuinely lacks the local name stays UNRESOLVED', async () => {
    // The guard against reading this fix as "renames always resolve now".
    // './m' exports `other`, not `x`; the re-export is simply wrong, and the
    // resolver must keep saying so.
    const state = await fixture({
      'm.ts': 'export function other() { return 1; }\n',
      'index.ts': "export { x as y } from './m';\n",
      'main.ts': "import { y } from './index';\nexport const q = y;\n",
    }, 'coderef-p3-genuine-');

    const r = state.importResolutions.find(
      r => r.localName === 'y' && r.originSpecifier === './index',
    );
    expect(r).toBeDefined();
    expect(r!.kind).toBe('unresolved');
    expect(r!.reason).toBe('symbol_not_in_module_exports');
  });

  it('(e) `export *` OVER a renamed re-export — the shape this repo actually ships', async () => {
    // P3-T6 measured a delta of exactly ZERO on coderef-core, which is worth
    // stating plainly rather than dressing up: all six renamed re-exports here
    // are `export { default as X }` in a sub-barrel, and NO internal file
    // imports through them. They are reached only from src/index.ts, which
    // re-exports the sub-barrels with `export * from './analyzer/index.js'`
    // and friends — i.e. the package's PUBLIC surface.
    //
    // So the broken consumer was never in this repo; it was anyone writing
    // `import { GraphExporter } from '@coderef/core'`. That path is two hops:
    // wildcard, then rename. This case is that exact shape, and it is not
    // implied by (a)-(d) — the wildcard branch is deliberately NOT
    // localName-aware, so this test is what proves the two branches compose.
    const state = await fixture({
      'impl.ts': 'export default class Exporter { run() { return 1; } }\n',
      'sub.ts': "export { default as Exporter } from './impl';\n",
      'index.ts': "export * from './sub';\n",
      'main.ts': "import { Exporter } from './index';\nexport const q = Exporter;\n",
    }, 'coderef-p3-star-rename-');

    const r = state.importResolutions.find(
      r => r.localName === 'Exporter' && r.originSpecifier === './index',
    );
    expect(r).toBeDefined();
    expect(r!.kind, `was unresolved/${r!.reason} at HEAD`).toBe('resolved');
    expect(r!.resolvedTargetCodeRefId).toBe(idOf(state, 'Exporter', 'impl.ts'));
  });
});
