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

describe('Phase 4 call-resolution imported-symbol cross-phase seam (AC-07)', () => {
  it('alias-imported function call resolves via Phase 3 ImportResolution.localName binding', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-imported-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'alpha.ts'),
      'export function doAlpha() { return 1; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'beta.ts'),
      [
        "import { doAlpha as alias } from './alpha';",
        'export function entry() {',
        '  return alias();',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const doAlphaElem = state.elements.find(e => e.name === 'doAlpha');
    expect(doAlphaElem).toBeDefined();
    const expectedDoAlphaId = doAlphaElem!.codeRefId
      ?? createCodeRefId(doAlphaElem!, state.projectPath, { includeLine: true });

    // Phase 3 must have produced an ImportResolution for `alias` → doAlpha.
    const ir = state.importResolutions.find(r => r.localName === 'alias' && r.kind === 'resolved');
    expect(ir).toBeDefined();
    expect(ir?.resolvedTargetCodeRefId).toBe(expectedDoAlphaId);

    // Phase 4 call resolution: alias() must resolve via the binding.
    const call = state.callResolutions.find(r =>
      r.calleeName === 'alias' && r.receiverText === null && r.sourceFile.includes('beta.ts'),
    );
    expect(call).toBeDefined();
    expect(call?.kind).toBe('resolved');
    expect(call?.resolvedTargetCodeRefId).toBe(expectedDoAlphaId);
  });
});
