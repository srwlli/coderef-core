import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const PHASE_6_FORBIDDEN_FIELDS = [
  'strictHeadersViolation',
  'headerDriftScore',
  'schemaValidationResult',
  'outputGateResult',
  'strictHeadersMode',
  'validationResults',
  'outputConstraints',
  'validationErrors',
];

describe('Phase 6 boundary INVARIANT: NO output validation work leaks into Phase 5', () => {
  it('graph nodes / edges / CallResolution / ImportResolution / PipelineState carry no Phase 6 validation fields', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-phase6-leak-'));
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

    // PipelineState top level.
    for (const field of PHASE_6_FORBIDDEN_FIELDS) {
      expect(state as unknown as Record<string, unknown>).not.toHaveProperty(field);
    }
    // graph object top level.
    for (const field of PHASE_6_FORBIDDEN_FIELDS) {
      expect(state.graph as unknown as Record<string, unknown>).not.toHaveProperty(field);
    }
    // graph.nodes.
    for (const node of state.graph.nodes) {
      for (const field of PHASE_6_FORBIDDEN_FIELDS) {
        expect(node as unknown as Record<string, unknown>).not.toHaveProperty(field);
      }
    }
    // graph.edges.
    for (const edge of state.graph.edges) {
      for (const field of PHASE_6_FORBIDDEN_FIELDS) {
        expect(edge as unknown as Record<string, unknown>).not.toHaveProperty(field);
      }
    }
    // CallResolutions.
    for (const r of state.callResolutions) {
      for (const field of PHASE_6_FORBIDDEN_FIELDS) {
        expect(r as unknown as Record<string, unknown>).not.toHaveProperty(field);
      }
    }
    // ImportResolutions.
    for (const r of state.importResolutions) {
      for (const field of PHASE_6_FORBIDDEN_FIELDS) {
        expect(r as unknown as Record<string, unknown>).not.toHaveProperty(field);
      }
    }
  });
});
