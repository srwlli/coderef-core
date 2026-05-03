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

describe('Phase 4 call-resolution duplicate-name ambiguity (AC-05)', () => {
  it('duplicate function names across files yield ambiguous with candidates[]', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-amb-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'a.ts'),
      'export function helper() { return "a"; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'b.ts'),
      'export function helper() { return "b"; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'entry.ts'),
      [
        'export function entry() {',
        '  return helper();',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const helperA = state.elements.find(e => e.name === 'helper' && e.file.includes('a.ts'));
    const helperB = state.elements.find(e => e.name === 'helper' && e.file.includes('b.ts'));
    expect(helperA).toBeDefined();
    expect(helperB).toBeDefined();
    const helperAId = helperA!.codeRefId
      ?? createCodeRefId(helperA!, state.projectPath, { includeLine: true });
    const helperBId = helperB!.codeRefId
      ?? createCodeRefId(helperB!, state.projectPath, { includeLine: true });

    const call = state.callResolutions.find(r =>
      r.calleeName === 'helper' && r.receiverText === null && r.sourceFile.includes('entry.ts'),
    );
    expect(call).toBeDefined();
    expect(call?.kind).toBe('ambiguous');
    expect(call?.candidates).toBeDefined();
    expect(call?.candidates).toEqual(
      expect.arrayContaining([helperAId, helperBId]),
    );
    // Ambiguous never has a single resolved target.
    expect(call?.resolvedTargetCodeRefId).toBeUndefined();
  });
});
