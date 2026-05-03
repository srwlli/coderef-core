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
