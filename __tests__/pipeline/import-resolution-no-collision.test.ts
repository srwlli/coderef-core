import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 same-name imports from different modules → distinct codeRefIds (AC-09 unit)', () => {
  it('two files importing `helpers` from different modules each resolve to distinct codeRefIds', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-noclash-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src', 'mod-a'), { recursive: true });
    await fs.mkdir(path.join(dir, 'src', 'mod-b'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'mod-a', 'helpers.ts'),
      'export function helpers() { return "a"; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'mod-b', 'helpers.ts'),
      'export function helpers() { return "b"; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'a-consumer.ts'),
      "import { helpers } from './mod-a/helpers';\nexport const ca = helpers;\n",
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'b-consumer.ts'),
      "import { helpers } from './mod-b/helpers';\nexport const cb = helpers;\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const ra = state.importResolutions.find(
      r => r.localName === 'helpers' && r.originSpecifier === './mod-a/helpers',
    );
    const rb = state.importResolutions.find(
      r => r.localName === 'helpers' && r.originSpecifier === './mod-b/helpers',
    );
    expect(ra?.kind).toBe('resolved');
    expect(rb?.kind).toBe('resolved');
    expect(ra!.resolvedTargetCodeRefId).toBeDefined();
    expect(rb!.resolvedTargetCodeRefId).toBeDefined();
    // The two helpers must have distinct codeRefIds — no cross-module
    // collision (AC-09).
    expect(ra!.resolvedTargetCodeRefId).not.toBe(rb!.resolvedTargetCodeRefId);
  });
});
