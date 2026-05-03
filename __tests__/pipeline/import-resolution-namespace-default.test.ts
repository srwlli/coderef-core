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

describe('Phase 3 namespace + default imports (AC-07 unit)', () => {
  it('`import * as ns from "./x"` binds local name "ns" with resolvedModuleFile set', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-ns-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'x.ts'),
      'export const a = 1;\nexport const b = 2;\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import * as ns from './x';\nexport const m = ns.a;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(r => r.localName === 'ns' && r.originSpecifier === './x');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
    expect(r!.resolvedModuleFile).toBeDefined();
  });

  it('`import myDefault from "./x"` where x has `export default function f(){}` binds to default codeRefId', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-default-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'x.ts'),
      'export default function f() { return 42; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import myDefault from './x';\nexport const m = myDefault;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(
      r => r.localName === 'myDefault' && r.originSpecifier === './x',
    );
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
    expect(r!.resolvedTargetCodeRefId).toBeDefined();
    // Target is x.f (the default-exported function).
    const fElem = state.elements.find(e => e.name === 'f' && e.file.endsWith('x.ts'));
    expect(fElem).toBeDefined();
    const expectedCodeRefId = fElem!.codeRefId
      ?? createCodeRefId(fElem!, state.projectPath, { includeLine: true });
    expect(r!.resolvedTargetCodeRefId).toBe(expectedCodeRefId);
  });
});
