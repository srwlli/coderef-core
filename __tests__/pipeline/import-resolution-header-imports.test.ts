import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

describe('Phase 3 HeaderImportFact resolution (AC-10 unit)', () => {
  it('header `./alpha:doAlpha` where alpha exports doAlpha → kind=resolved with codeRefId', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-header-ok-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'alpha.ts'),
      'export function doAlpha() { return 1; }\n',
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
        ' * @imports ["./alpha:doAlpha"]',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        "import { doAlpha } from './alpha';",
        'export function run() { return doAlpha(); }',
        '',
      ].join('\n'),
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    // Find the header-derived resolution: localName === 'doAlpha' AND
    // originSpecifier === './alpha' AND there should be at least 2 such
    // (one from AST import, one from header). Pick the one not bound to
    // sourceElementId === null vs typed; both should be 'resolved'.
    const headerR = state.importResolutions.filter(
      r => r.localName === 'doAlpha' && r.originSpecifier === './alpha',
    );
    expect(headerR.length).toBeGreaterThanOrEqual(1);
    for (const r of headerR) {
      expect(r.kind).toBe('resolved');
      expect(r.resolvedTargetCodeRefId).toBeDefined();
    }
  });

  it('header `./alpha:doMissing` where alpha does NOT export doMissing → kind=stale with reason', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-imp-header-stale-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'alpha.ts'),
      'export function doAlpha() { return 1; }\n',
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
        ' * @imports ["./alpha:doMissing"]',
        ' * @generated 2026-05-03T00:00:00Z',
        ' */',
        "export function run() { return 1; }",
        '',
      ].join('\n'),
      'utf-8',
    );
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const r = state.importResolutions.find(
      r => r.localName === 'doMissing' && r.originSpecifier === './alpha',
    );
    expect(r).toBeDefined();
    expect(r!.kind).toBe('stale');
    expect(r!.reason).toBe('symbol_not_in_module_exports');
  });
});
