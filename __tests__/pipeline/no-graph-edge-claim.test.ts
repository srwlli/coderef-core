import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { PipelineState } from '../../src/pipeline/types.js';

const createdProjects: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-no-graph-edge-'));
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

async function runState(projectDir: string): Promise<PipelineState> {
  return new PipelineOrchestrator().run(projectDir, {
    outputDir: path.join(projectDir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
}

const FORBIDDEN_KEYS: ReadonlyArray<string> = ['targetId', 'resolvedTo', 'edgeId'];

function assertNoForbiddenKeys(records: ReadonlyArray<Record<string, unknown>>): void {
  for (const record of records) {
    for (const key of FORBIDDEN_KEYS) {
      expect(record).not.toHaveProperty(key);
    }
  }
}

describe('Phase 2 no-graph-edge-claim invariant', () => {
  afterEach(async () => {
    await Promise.all(
      createdProjects.splice(0).map(d => fs.rm(d, { recursive: true, force: true })),
    );
  });

  it('every raw fact lacks fields that name a graph node ID as endpoint', async () => {
    const projectDir = await createProject({
      'src/alpha.ts': 'export function actual() { return 1; }\n',
      'src/beta.ts': [
        "import { actual } from './alpha';",
        "import { useState as useS } from 'react';",
        '/**',
        ' * @imports ["./alpha:actual"]',
        ' */',
        'class Service {',
        '  save(x: string) { return x; }',
        '}',
        'export function run() {',
        '  const obj = new Service();',
        "  obj.save('hi');",
        '  return actual();',
        '}',
        'export default class D {}',
        '',
      ].join('\n'),
    });
    const state = await runState(projectDir);

    expect(
      state.rawImports.length +
        state.rawCalls.length +
        state.rawExports.length +
        state.headerImportFacts.length,
    ).toBeGreaterThan(0);

    assertNoForbiddenKeys(state.rawImports as unknown as Record<string, unknown>[]);
    assertNoForbiddenKeys(state.rawCalls as unknown as Record<string, unknown>[]);
    assertNoForbiddenKeys(state.rawExports as unknown as Record<string, unknown>[]);
    assertNoForbiddenKeys(state.headerImportFacts as unknown as Record<string, unknown>[]);
  });
});
