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

describe('Phase 4 call-resolution this.method() (AC-03)', () => {
  it('this.knownMethod() resolves to enclosing class own method; this.unknown() is unresolved', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-this-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export class C {',
        '  m1() { return 1; }',
        '  m2() {',
        '    this.m1();',
        '    this.notDefined();',
        '    return 2;',
        '  }',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const m1Element = state.elements.find(e => e.name === 'C.m1');
    expect(m1Element).toBeDefined();
    const expectedM1Id = m1Element!.codeRefId
      ?? createCodeRefId(m1Element!, state.projectPath, { includeLine: true });

    const thisM1 = state.callResolutions.find(r =>
      r.receiverText === 'this' && r.calleeName === 'm1',
    );
    expect(thisM1).toBeDefined();
    expect(thisM1?.kind).toBe('resolved');
    expect(thisM1?.resolvedTargetCodeRefId).toBe(expectedM1Id);

    const thisUnknown = state.callResolutions.find(r =>
      r.receiverText === 'this' && r.calleeName === 'notDefined',
    );
    expect(thisUnknown).toBeDefined();
    expect(thisUnknown?.kind).toBe('unresolved');
    expect(thisUnknown?.reason).toBe('this_method_not_in_class');
  });
});
