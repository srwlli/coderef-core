import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 external import classification (AC-03 unit)', () => {
  it('package listed in package.json dependencies → kind=external', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-ext-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 't', dependencies: { 'my-pkg': '^1.0.0' } }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { foo } from 'my-pkg';\nexport const m = foo;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(r => r.originSpecifier === 'my-pkg');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('external');
  });

  it('package present under node_modules but absent from package.json → kind=external (node_modules wins)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-ext-nm-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.mkdir(path.join(dir, 'node_modules', 'orphan-pkg'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'node_modules', 'orphan-pkg', 'package.json'),
      JSON.stringify({ name: 'orphan-pkg', version: '0.0.1' }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 't', dependencies: {} }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import x from 'orphan-pkg';\nexport const m = x;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(r => r.originSpecifier === 'orphan-pkg');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('external');
  });
});
