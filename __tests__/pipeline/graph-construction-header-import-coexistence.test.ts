import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 5 header-import coexistence (AC-04)', () => {
  it('same module:symbol pair from header @imports AND AST import produces TWO edges with distinct relationship values', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-phase5-headercoex-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'alpha.ts'), 'export function doAlpha() { return 1; }\n', 'utf-8');
    await fs.writeFile(
      path.join(dir, 'src', 'beta.ts'),
      [
        '/**',
        ' * @coderef-semantic:1.0.0',
        ' * @layer utility',
        ' * @capability foo-bar',
        ' * @exports run',
        ' * @imports ["./alpha:doAlpha"]',
        ' */',
        "import { doAlpha } from './alpha';",
        'export function run() { return doAlpha(); }',
      ].join('\n'),
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    // Find import edges referencing './alpha'.
    const alphaImportEdges = state.graph.edges.filter(e => {
      const ev = e.evidence as Record<string, unknown> | undefined;
      const spec = (ev?.originSpecifier ?? ev?.module) as string | undefined;
      return spec === './alpha'
        && (e.relationship === 'import' || e.relationship === 'header-import');
    });

    // We MUST have at least one of each kind.
    const astEdges = alphaImportEdges.filter(e => e.relationship === 'import');
    const headerEdges = alphaImportEdges.filter(e => e.relationship === 'header-import');
    expect(astEdges.length).toBeGreaterThanOrEqual(1);
    expect(headerEdges.length).toBeGreaterThanOrEqual(1);

    // Both must have a sourceId (importer) — even module-level imports
    // get a file-grain fallback in Phase 5.
    for (const e of alphaImportEdges) {
      expect(typeof e.sourceId).toBe('string');
    }
  });
});
