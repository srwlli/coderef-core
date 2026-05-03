import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { RawHeaderImportFact } from '../../src/pipeline/types.js';

const createdProjects: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-raw-headers-'));
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

async function runRawHeaders(projectDir: string): Promise<RawHeaderImportFact[]> {
  const state = await new PipelineOrchestrator().run(projectDir, {
    outputDir: path.join(projectDir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
  return state.rawHeaderImports;
}

describe('Phase 2 raw header-import placeholders', () => {
  afterEach(async () => {
    await Promise.all(
      createdProjects.splice(0).map(d => fs.rm(d, { recursive: true, force: true })),
    );
  });

  it('emits one placeholder per literal in @imports header array', async () => {
    // Phase 2.5 (WO-PIPELINE-SEMANTIC-HEADER-PARSER-001) requires a proper
    // @coderef-semantic marker for detection. Phase 2's regex-only path
    // accepted any @imports literal in the leading comment block; the
    // tighter detection is the right call. Fixture updated per dispatch
    // DISPATCH-2026-05-02-011 directive ("raw-header-import-placeholders
    // may need adjustment if RawHeaderImportFact deprecation changes its
    // shape — if so, fix the test, not the deprecation").
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
    const facts = await runRawHeaders(projectDir);
    expect(facts).toHaveLength(2);
    expect(facts.map(f => f.rawString).sort()).toEqual(['./baz:qux', 'foo:bar']);
    for (const fact of facts) {
      expect(fact.parseStatus).toBe('placeholder');
    }
  });

  it('emits zero placeholders when the file has no @imports header', async () => {
    const projectDir = await createProject({
      'src/no-header.ts': 'export const _ = 1;\n',
    });
    const facts = await runRawHeaders(projectDir);
    expect(facts).toHaveLength(0);
  });

  it('preserves rawString verbatim including special characters', async () => {
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
    const facts = await runRawHeaders(projectDir);
    expect(facts).toHaveLength(2);
    const strings = facts.map(f => f.rawString).sort();
    expect(strings).toEqual(['../../deep/path:helper', '@scope/pkg:default']);
  });
});
