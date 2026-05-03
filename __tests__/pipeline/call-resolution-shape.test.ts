import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const VALID_KINDS = new Set([
  'resolved',
  'unresolved',
  'ambiguous',
  'external',
  'builtin',
]);

describe('Phase 4 call-resolution shape (AC-01 integration)', () => {
  it('every RawCallFact produces exactly one CallResolution with a valid 5-kind', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-call-shape-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'helper.ts'),
      'export function helperFn() { return 1; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        "import { helperFn } from './helper';",
        'export class C {',
        '  m1() { return 1; }',
        '  m2() { return this.m1(); }',
        '}',
        'export function run() {',
        '  const c = new C();',
        '  helperFn();',
        '  c.m1();',
        '  Math.floor(1.5);',
        '  notDefined();',
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

    expect(state.callResolutions.length).toBe(state.rawCalls.length);
    for (const r of state.callResolutions) {
      expect(VALID_KINDS.has(r.kind)).toBe(true);
    }
    // mixed-kinds fixture must produce at least one of each branch:
    const kinds = new Set(state.callResolutions.map(r => r.kind));
    expect(kinds.has('resolved')).toBe(true);
    expect(kinds.has('builtin')).toBe(true);
    expect(kinds.has('unresolved')).toBe(true);
  });
});
