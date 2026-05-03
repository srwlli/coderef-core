import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { buildExportTables } from '../../src/pipeline/import-resolver.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 ↔ Phase 2.5 export-set consistency (AC-13 unit)', () => {
  it('Phase 2.5 cross-check export set equals Phase 3 export-table key set per file', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-xphase-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'm.ts'),
      [
        '/**',
        ' * @coderef-semantic:1.0.0',
        ' * @layer utility',
        ' * @capability foo-bar',
        ' * @exports a, b',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        'export const a = 1;',
        'export const b = 2;',
        '',
      ].join('\n'),
      'utf-8',
    );

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    // Phase 2.5 cross-check uses RawExportFact[].exportedName grouped by
    // sourceFile.
    const phase25SetByFile = new Map<string, Set<string>>();
    for (const fact of state.rawExports) {
      let s = phase25SetByFile.get(fact.sourceFile);
      if (!s) {
        s = new Set();
        phase25SetByFile.set(fact.sourceFile, s);
      }
      s.add(fact.exportedName);
    }

    // Phase 3 export table.
    const exportTables = buildExportTables(state);

    // Compare keys per file.
    for (const [file, set25] of phase25SetByFile) {
      const phase3Table = exportTables.get(file);
      expect(phase3Table).toBeDefined();
      const set3 = new Set(phase3Table!.keys());
      // Both directions: Phase 2.5 ⊆ Phase 3 AND Phase 3 ⊆ Phase 2.5.
      expect([...set25].sort()).toEqual([...set3].sort());
    }
  });
});
