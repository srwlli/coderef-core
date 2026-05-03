import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 unresolved bare specifier (AC-04 unit)', () => {
  it('bare specifier NOT in package.json AND NOT in node_modules → kind=unresolved with structured reason', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-unres-bare-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 't', dependencies: {} }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { x } from 'lodash-fork';\nexport const m = x;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(r => r.originSpecifier === 'lodash-fork');
    expect(r).toBeDefined();
    expect(r!.kind).toBe('unresolved');
    expect(r!.reason).toBe('not_in_manifest_or_node_modules');
  });
});
