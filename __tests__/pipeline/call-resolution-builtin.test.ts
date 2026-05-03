import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const ALL_BUILTIN_RECEIVERS = [
  'Array', 'Object', 'Promise', 'Map', 'Set', 'String', 'Number',
  'Boolean', 'RegExp', 'Date', 'Error', 'JSON', 'Math', 'Reflect', 'Symbol',
];

describe('Phase 4 call-resolution builtin allowlist (AC-02 unit)', () => {
  it('every BUILTIN_RECEIVERS receiver classifies as kind=builtin and emits no project graph edge', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-builtin-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    const calls = ALL_BUILTIN_RECEIVERS.map(r => `  ${r}.toString();`).join('\n');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export function run() {',
        calls,
        '  return 1;',
        '}',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const builtinResolutions = state.callResolutions.filter(r => r.kind === 'builtin');
    // Every builtin receiver must classify as builtin.
    for (const receiver of ALL_BUILTIN_RECEIVERS) {
      const match = builtinResolutions.find(r => r.receiverText === receiver);
      expect(match).toBeDefined();
      expect(match?.kind).toBe('builtin');
      expect(match?.reason).toBe('in_allowlist');
    }
    // Zero resolved-call edges for builtin-only fixture.
    const resolvedCallEdges = state.graph.edges.filter(e => e.type === 'resolved-call');
    expect(resolvedCallEdges.length).toBe(0);
  });
});
