import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports } from '../../src/pipeline/import-resolver.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 resolver determinism + purity INVARIANT (AC-11)', () => {
  it('idempotent across 100 invocations on identical state', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-det-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'helper.ts'), 'export const h = 1;\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { h } from './helper';\nexport const m = h;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const baseline = JSON.stringify(resolveImports(state));
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(resolveImports(state))).toBe(baseline);
    }
  });

  it('does not mutate state.rawImports / state.rawExports / state.headerImportFacts', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-frozen-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'helper.ts'), 'export const h = 1;\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { h } from './helper';\nexport const m = h;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const beforeImports = JSON.stringify(state.rawImports);
    const beforeExports = JSON.stringify(state.rawExports);
    const beforeHeaders = JSON.stringify(state.headerImportFacts);

    resolveImports(state);

    expect(JSON.stringify(state.rawImports)).toBe(beforeImports);
    expect(JSON.stringify(state.rawExports)).toBe(beforeExports);
    expect(JSON.stringify(state.headerImportFacts)).toBe(beforeHeaders);
  });
});
