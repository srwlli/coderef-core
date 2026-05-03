import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

const VALID_KINDS = new Set([
  'resolved',
  'unresolved',
  'external',
  'ambiguous',
  'dynamic',
  'typeOnly',
  'stale',
]);

describe('Phase 3 import-resolution shape (AC-01 integration)', () => {
  it('every RawImportFact specifier and every HeaderImportFact produces exactly one ImportResolution with a valid kind', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-shape-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'helper.ts'),
      'export function helperFn() { return 1; }\nexport function other() { return 2; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'consumer.ts'),
      [
        '/**',
        ' * @coderef-semantic:1.0.0',
        ' * @layer utility',
        ' * @capability foo-bar',
        ' * @exports run',
        ' * @imports ["./helper:helperFn", "./helper:other"]',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        "import { helperFn, other as otherAlias } from './helper';",
        "import * as ns from './helper';",
        'export function run() { return helperFn() + otherAlias() + Object.keys(ns).length; }',
        '',
      ].join('\n'),
      'utf-8',
    );
    await fs.writeFile(path.join(dir, 'package.json'), '{"name":"t","dependencies":{}}', 'utf-8');

    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });

    // Expected resolutions: 2 named (helperFn, otherAlias) + 1 namespace (ns)
    // = 3 from AST imports; 2 HeaderImportFacts → 2 from header. Total 5.
    const expectedAstBindings = 0
      + state.rawImports
        .filter(f => !f.dynamic)
        .reduce((sum, f) => {
          let n = f.specifiers.length + (f.defaultImport ? 1 : 0) + (f.namespaceImport ? 1 : 0);
          if (n === 0) n = 1; // side-effect import emits one record
          return sum + n;
        }, 0)
      + state.rawImports.filter(f => f.dynamic).length;

    const expectedTotal = expectedAstBindings + state.headerImportFacts.length;
    expect(state.importResolutions).toHaveLength(expectedTotal);

    for (const r of state.importResolutions) {
      expect(VALID_KINDS).toContain(r.kind);
    }
  });
});
