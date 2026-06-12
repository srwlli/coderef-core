/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability graph-test-origin-tagging-test
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { resolveImports } from '../../src/pipeline/import-resolver.js';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import { constructGraph } from '../../src/pipeline/graph-builder.js';
import { validatePipelineState } from '../../src/pipeline/output-validator.js';
import type { ValidatePipelineStateOptions } from '../../src/pipeline/output-validator.js';
import type { PipelineState } from '../../src/pipeline/types.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const layerEnum: ValidatePipelineStateOptions['layerEnum'] = [
  'service', 'utility', 'test_support', 'cli', 'parser',
];

async function scanAndGraph(files: Record<string, string>): Promise<{ state: PipelineState; graph: ReturnType<typeof constructGraph> }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-testorigin-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
  }
  const state = await new PipelineOrchestrator().run(dir, {
    outputDir: path.join(dir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
  state.importResolutions = resolveImports(state);
  state.callResolutions = resolveCalls(state);
  const graph = constructGraph(state);
  return { state, graph };
}

describe('test-origin edge tagging + src-only counts (STUB-K5YBFN, ruling option A)', () => {
  it('edges originating in test files carry evidence.testOrigin=true; src edges carry no tag', async () => {
    const { graph } = await scanAndGraph({
      'src/main.ts': "import { gone } from './gone.js';\nexport const m = String(gone);\n",
      '__tests__/sample.test.ts': "import { nope } from '../src/nope.js';\nexport const t = String(nope);\n",
    });

    const srcEdge = graph.edges.find(
      e => (e.evidence as { originSpecifier?: string } | undefined)?.originSpecifier === './gone.js',
    );
    expect(srcEdge, 'src unresolved edge').toBeDefined();
    expect(srcEdge!.resolutionStatus).toBe('unresolved');
    expect((srcEdge!.evidence as { testOrigin?: boolean }).testOrigin).toBeUndefined();

    const testEdge = graph.edges.find(
      e => (e.evidence as { originSpecifier?: string } | undefined)?.originSpecifier === '../src/nope.js',
    );
    expect(testEdge, 'test-origin unresolved edge').toBeDefined();
    expect(testEdge!.resolutionStatus).toBe('unresolved');
    expect((testEdge!.evidence as { testOrigin?: boolean }).testOrigin).toBe(true);
  });

  it('graph semantics unchanged: test-origin edges keep status, ids, and counts in totals', async () => {
    const { graph } = await scanAndGraph({
      '__tests__/sample.test.ts': "import { nope } from '../src/nope.js';\nexport const t = String(nope);\n",
    });
    const testEdge = graph.edges.find(
      e => (e.evidence as { originSpecifier?: string } | undefined)?.originSpecifier === '../src/nope.js',
    );
    expect(testEdge!.resolutionStatus).toBe('unresolved');
    expect(testEdge!.id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('report surfaces unresolved_src_count and ambiguous_src_count alongside totals', async () => {
    const { state, graph } = await scanAndGraph({
      'src/main.ts': "import { gone } from './gone.js';\nexport const m = String(gone);\n",
      '__tests__/sample.test.ts': "import { nope } from '../src/nope.js';\nexport const t = String(nope);\n",
    });
    const result = validatePipelineState(state, graph, { layerEnum });
    const report = result.report as unknown as Record<string, number>;

    expect(typeof report.unresolved_src_count).toBe('number');
    expect(typeof report.ambiguous_src_count).toBe('number');
    // One unresolved src import + one unresolved test import in this fixture:
    // totals count both, src-only counts only the src one.
    expect(report.unresolved_count).toBeGreaterThanOrEqual(2);
    expect(report.unresolved_src_count).toBeLessThan(report.unresolved_count);
    expect(report.unresolved_src_count).toBeGreaterThanOrEqual(1);
    expect(report.ambiguous_src_count).toBeLessThanOrEqual(report.ambiguous_count);
  });
});
