import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 tsconfig.paths resolution (AC-05 unit)', () => {
  it('with paths { "@app/*": ["src/*"] }, `@app/foo` resolves to src/foo.ts', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-paths-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@app/*': ['src/*'] },
        },
      }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 't', dependencies: {} }),
      'utf-8',
    );
    await fs.writeFile(path.join(dir, 'src', 'foo.ts'), 'export const fooConst = 1;\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { fooConst } from '@app/foo';\nexport const m = fooConst;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(r => r.originSpecifier === '@app/foo');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
  });

  it('with NO `paths` field present, resolver falls back cleanly with no errors', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-paths-empty-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: '.' } }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 't', dependencies: {} }),
      'utf-8',
    );
    await fs.writeFile(path.join(dir, 'src', 'foo.ts'), 'export const fooConst = 1;\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { fooConst } from './foo';\nexport const m = fooConst;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(r => r.originSpecifier === './foo');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('resolved');
  });
});
