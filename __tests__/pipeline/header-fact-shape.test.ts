import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-header-shape-'));
  created.push(dir);
  await Promise.all(
    Object.entries(files).map(async ([rel, content]) => {
      const fp = path.join(dir, rel);
      await fs.mkdir(path.dirname(fp), { recursive: true });
      await fs.writeFile(fp, content, 'utf-8');
    }),
  );
  return dir;
}

describe('Phase 2.5 header-fact shape (AC-01)', () => {
  afterEach(async () => {
    await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
  });

  it('emits a HeaderFact and a defined headerStatus for every walked file', async () => {
    const dir = await createProject({
      'src/has-header.ts': [
        '/**',
        ' * @coderef-semantic:1.0.0',
        ' * @layer utility',
        ' * @capability foo-bar',
        ' * @exports x',
        ' * @imports []',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        'export const x = 1;',
        '',
      ].join('\n'),
      'src/no-header.ts': 'export const y = 2;\n',
    });
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    expect(state.headerFacts.size).toBeGreaterThanOrEqual(2);
    for (const [file, fact] of state.headerFacts) {
      expect(typeof file).toBe('string');
      expect(fact.sourceFile).toBe(file);
    }

    for (const elem of state.elements) {
      expect(['defined', 'stale', 'missing', 'partial']).toContain(elem.headerStatus);
      expect(elem.headerFact).toBeDefined();
    }

    // Verify orchestrator propagates capability and layer from headerFact into element fields.
    const hasHeaderElems = state.elements.filter(e => e.headerStatus === 'defined');
    for (const elem of hasHeaderElems) {
      if (elem.file.endsWith('has-header.ts')) {
        expect(elem.layer).toBe('utility');
        expect(elem.capability).toBe('foo-bar');
      }
    }
  });

  it('returns missing status (not undefined) when no header is present', async () => {
    const dir = await createProject({
      'src/plain.ts': 'export function plain() { return 1; }\n',
    });
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    for (const elem of state.elements) {
      expect(elem.headerStatus).toBe('missing');
      expect(elem.headerFact).toBeDefined();
      expect(elem.headerFact!.parseErrors).toBeUndefined();
    }
  });
});
