import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const FORBIDDEN: ReadonlyArray<string> = [
  'resolvedTo',
  'targetId',
  'edgeId',
  'resolutionStatus',
  'resolved',
];

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

function assertNoForbidden(records: ReadonlyArray<Record<string, unknown>>): void {
  for (const record of records) {
    for (const key of FORBIDDEN) {
      expect(record).not.toHaveProperty(key);
    }
  }
}

describe('Phase 2.5 boundary INVARIANT: no import resolution (AC-12)', () => {
  it('header import facts and raw import facts have no resolution-shaped fields', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-no-resolution-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'consumer.ts'),
      [
        '/**',
        ' * @coderef-semantic:1.0.0',
        ' * @layer utility',
        ' * @capability foo-bar',
        ' * @exports run',
        ' * @imports ["./helper:helperFn", "react:useState"]',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        "import { useState } from 'react';",
        "import { helperFn } from './helper';",
        'export function run() { return helperFn(useState); }',
        '',
      ].join('\n'),
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    expect(
      state.headerImportFacts.length + state.rawImports.length + state.rawHeaderImports.length,
    ).toBeGreaterThan(0);

    assertNoForbidden(state.headerImportFacts as unknown as Record<string, unknown>[]);
    assertNoForbidden(state.rawImports as unknown as Record<string, unknown>[]);
    assertNoForbidden(state.rawHeaderImports as unknown as Record<string, unknown>[]);
  });
});
