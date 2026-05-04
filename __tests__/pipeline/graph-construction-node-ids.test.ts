import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 5 graph-construction node ids (AC-01)', () => {
  it('every graph.nodes[i].id is a canonical codeRefId; matches metadata.codeRefId; ids are unique', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-phase5-nodeids-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'h.ts'), 'export function helperFn() { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      "import { helperFn } from './h';\nexport function run() { return helperFn(); }\n",
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    expect(state.graph.nodes.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const node of state.graph.nodes) {
      // No undefined / null ids.
      expect(typeof node.id).toBe('string');
      expect(node.id.length).toBeGreaterThan(0);
      // Element nodes' ids match their metadata.codeRefId.
      if (node.type !== 'file') {
        expect(node.metadata?.codeRefId).toBe(node.id);
      }
      // Canonical codeRefId pattern: starts with @ and contains /.
      expect(node.id.startsWith('@')).toBe(true);
      expect(node.id.includes('/')).toBe(true);
      // Uniqueness within the graph.
      expect(seen.has(node.id)).toBe(false);
      seen.add(node.id);
    }
  });
});
