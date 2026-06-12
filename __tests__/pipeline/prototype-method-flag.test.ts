/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability prototype-method-probable-builtin-flag-test
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports } from '../../src/pipeline/import-resolver.js';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import { constructGraph } from '../../src/pipeline/graph-builder.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('probableBuiltinMember evidence flag (STUB-XX4JBC, ruling option A)', () => {
  it('flags receiver_not_in_symbol_table calls whose callee is JS prototype vocabulary; leaves others untouched', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-protoflag-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        'export function go(x: any): void {',
        '  x.push(1);',
        '  x.customWeirdMethod();',
        '}',
      ].join('\n') + '\n',
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    state.importResolutions = resolveImports(state);
    state.callResolutions = resolveCalls(state);
    const graph = constructGraph(state);

    const pushEdge = graph.edges.find(
      e => (e.evidence as { calleeName?: string } | undefined)?.calleeName === 'push',
    );
    expect(pushEdge, 'push edge').toBeDefined();
    expect(pushEdge!.resolutionStatus).toBe('unresolved');
    expect(pushEdge!.reason).toBe('receiver_not_in_symbol_table');
    expect((pushEdge!.evidence as { probableBuiltinMember?: boolean }).probableBuiltinMember).toBe(true);

    const weirdEdge = graph.edges.find(
      e => (e.evidence as { calleeName?: string } | undefined)?.calleeName === 'customWeirdMethod',
    );
    expect(weirdEdge, 'customWeirdMethod edge').toBeDefined();
    expect(weirdEdge!.resolutionStatus).toBe('unresolved');
    expect(weirdEdge!.reason).toBe('receiver_not_in_symbol_table');
    expect((weirdEdge!.evidence as { probableBuiltinMember?: boolean }).probableBuiltinMember).toBeUndefined();
  });
});
