import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 4 call-resolution nested-scope qualifying path (AC-06)', () => {
  it('nested function calls preserve qualifying scopePath; method-on-this preserves class scope', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-nested-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export class Service {',
        '  handle() { return 1; }',
        '  outer() { return this.handle(); }',
        '}',
        'export function entry() {',
        '  function inner() { return 2; }',
        '  inner();',
        '  const s = new Service();',
        '  return s.handle();',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    // Nested inner() call: scopePath includes 'entry'.
    const innerCall = state.callResolutions.find(r =>
      r.calleeName === 'inner' && r.receiverText === null,
    );
    expect(innerCall).toBeDefined();
    expect(innerCall?.scopePath).toContain('entry');

    // this.handle() inside Service.outer: scopePath includes 'Service'.
    const thisHandle = state.callResolutions.find(r =>
      r.receiverText === 'this' && r.calleeName === 'handle',
    );
    expect(thisHandle).toBeDefined();
    expect(thisHandle?.scopePath).toContain('Service');
    expect(thisHandle?.kind).toBe('resolved');
  });
});
