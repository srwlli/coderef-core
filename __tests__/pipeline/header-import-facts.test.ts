import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseHeader } from '../../src/pipeline/semantic-header-parser.js';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { collectHeaderImportPlaceholders } from '../../src/pipeline/extractors/relationship-extractor.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 2.5 structured HeaderImportFact records (AC-11)', () => {
  it('parseHeader produces structured {module, symbol} records', () => {
    const src = [
      '/**',
      ' * @coderef-semantic:1.0.0',
      ' * @layer utility',
      ' * @capability foo-bar',
      ' * @exports x',
      ' * @imports ["./alpha:doAlpha", "react:useState"]',
      ' * @generated 2026-05-03T00:00:00Z',
      ' */',
      'export const x = 1;',
      '',
    ].join('\n');
    const result = parseHeader(src, 'sample.ts');
    expect(result.importFacts).toHaveLength(2);
    expect(result.importFacts[0]).toMatchObject({ module: './alpha', symbol: 'doAlpha' });
    expect(result.importFacts[1]).toMatchObject({ module: 'react', symbol: 'useState' });
  });

  it('orchestrator threads HeaderImportFact[] into state.headerImportFacts', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-header-imports-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'a.ts'),
      [
        '/**',
        ' * @coderef-semantic:1.0.0',
        ' * @layer utility',
        ' * @capability foo-bar',
        ' * @exports x',
        ' * @imports ["./b:helper"]',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        'export const x = 1;',
        '',
      ].join('\n'),
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    expect(state.headerImportFacts).toHaveLength(1);
    expect(state.headerImportFacts[0]).toMatchObject({ module: './b', symbol: 'helper' });
  });

  it('deprecated collectHeaderImportPlaceholders still produces RawHeaderImportFact[] (backwards-compat)', () => {
    const src = [
      '/**',
      ' * @coderef-semantic:1.0.0',
      ' * @layer utility',
      ' * @capability foo-bar',
      ' * @exports x',
      ' * @imports ["./alpha:doAlpha"]',
      ' * @generated 2026-05-03T00:00:00Z',
      ' */',
      'export const x = 1;',
      '',
    ].join('\n');
    const facts = collectHeaderImportPlaceholders('sample.ts', src);
    expect(facts).toHaveLength(1);
    expect(facts[0].rawString).toBe('./alpha:doAlpha');
    expect(facts[0].parseStatus).toBe('placeholder');
  });
});
