import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { HeaderImportFact } from '../../src/pipeline/header-fact.js';

// This test replaces __tests__/pipeline/raw-header-import-placeholders.test.ts
// (Phase 2 placeholder cardinality test) per dispatch DISPATCH-2026-05-02-013
// task 1.24. RawHeaderImportFact was removed in Phase 3
// (WO-PIPELINE-IMPORT-RESOLUTION-001); HeaderImportFact (Phase 2.5 structured
// replacement) is now the canonical shape. The cardinality property — one
// record per literal in the @imports header array — still holds and is the
// thing worth asserting.

const createdProjects: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-header-cardinality-'));
  createdProjects.push(projectDir);
  await Promise.all(
    Object.entries(files).map(async ([rel, content]) => {
      const filePath = path.join(projectDir, rel);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    }),
  );
  return projectDir;
}

async function runHeaderImports(projectDir: string): Promise<HeaderImportFact[]> {
  const state = await new PipelineOrchestrator().run(projectDir, {
    outputDir: path.join(projectDir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
  return state.headerImportFacts;
}

describe('Phase 2.5 HeaderImportFact cardinality (replaces Phase 2 raw-header-import-placeholders)', () => {
  afterEach(async () => {
    await Promise.all(
      createdProjects.splice(0).map(d => fs.rm(d, { recursive: true, force: true })),
    );
  });

  it('emits one HeaderImportFact per literal in @imports header array', async () => {
    const projectDir = await createProject({
      'src/m.ts': [
        '/**',
        ' * @coderef-semantic:1.0.0',
        ' * @layer utility',
        ' * @capability foo-bar',
        ' * @exports _',
        ' * @imports ["foo:bar", "./baz:qux"]',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        'export const _ = 1;',
        '',
      ].join('\n'),
    });
    const facts = await runHeaderImports(projectDir);
    expect(facts).toHaveLength(2);
    const pairs = facts.map(f => `${f.module}:${f.symbol}`).sort();
    expect(pairs).toEqual(['./baz:qux', 'foo:bar']);
  });

  it('emits zero HeaderImportFacts when the file has no @imports header', async () => {
    const projectDir = await createProject({
      'src/no-header.ts': 'export const _ = 1;\n',
    });
    const facts = await runHeaderImports(projectDir);
    expect(facts).toHaveLength(0);
  });

  it('preserves module + symbol verbatim including special characters', async () => {
    const projectDir = await createProject({
      'src/m.ts': [
        '/**',
        ' * @coderef-semantic:1.0.0',
        ' * @layer utility',
        ' * @capability foo-bar',
        ' * @exports _',
        ' * @imports ["@scope/pkg:default", "../../deep/path:helper"]',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        'export const _ = 1;',
        '',
      ].join('\n'),
    });
    const facts = await runHeaderImports(projectDir);
    expect(facts).toHaveLength(2);
    const pairs = facts.map(f => `${f.module}:${f.symbol}`).sort();
    expect(pairs).toEqual(['../../deep/path:helper', '@scope/pkg:default']);
  });
});
