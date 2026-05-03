import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const PHASE_5_FORBIDDEN_FIELDS = [
  'fileGrainNodeId',
  'edgeSchemaVersion',
  'graphConstructionPass',
  'nodePromotedFrom',
];

describe('Phase 5 boundary INVARIANT: NO graph construction work leaks into Phase 4 (AC-10)', () => {
  it('CallResolution[] and PipelineState carry no Phase 5 graph-construction fields; legacy graph schema unchanged except resolved-call edges', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-phase5-leak-'));
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

    // No Phase 5 fields on any CallResolution.
    for (const r of state.callResolutions) {
      for (const field of PHASE_5_FORBIDDEN_FIELDS) {
        expect(r as unknown as Record<string, unknown>).not.toHaveProperty(field);
      }
    }
    // No Phase 5 fields on PipelineState top level.
    for (const field of PHASE_5_FORBIDDEN_FIELDS) {
      expect(state as unknown as Record<string, unknown>).not.toHaveProperty(field);
    }
    // No Phase 5 fields on any graph node.
    for (const node of state.graph.nodes) {
      for (const field of PHASE_5_FORBIDDEN_FIELDS) {
        expect(node as unknown as Record<string, unknown>).not.toHaveProperty(field);
      }
    }
    // Edge schema unchanged: edges only carry source/target/type/metadata.
    // Phase 4 may add 'resolved-call' edges; legacy edge types unchanged.
    const allowedEdgeTypes = new Set([
      'imports', 'calls', 'depends_on', 'extends', 'implements',
      'resolved-import', 'resolved-call',
    ]);
    for (const edge of state.graph.edges) {
      expect(allowedEdgeTypes.has(edge.type)).toBe(true);
    }
  });
});
