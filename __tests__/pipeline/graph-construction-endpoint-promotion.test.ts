import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 5 graph-construction endpoint promotion (AC-02 integration)', () => {
  it('every resolved edge has both sourceId and targetId in graph.nodes ids set — Phase 0 test 1 line 52 mechanism reified', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-phase5-endpoint-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'alpha.ts'), 'export function actual() { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'beta.ts'),
      "import { actual } from './alpha';\nexport function run() { return actual(); }\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    const ids = new Set(state.graph.nodes.map(n => n.id));
    let resolvedCount = 0;
    for (const edge of state.graph.edges) {
      if (edge.resolutionStatus !== 'resolved') continue;
      resolvedCount++;
      expect(typeof edge.sourceId).toBe('string');
      expect(typeof edge.targetId).toBe('string');
      expect(ids.has(edge.sourceId!)).toBe(true);
      expect(ids.has(edge.targetId!)).toBe(true);
    }
    // Sanity: at least one resolved edge in this fixture.
    expect(resolvedCount).toBeGreaterThan(0);
  });
});
