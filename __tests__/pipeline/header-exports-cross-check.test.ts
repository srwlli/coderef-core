import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const created: string[] = [];

async function project(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-header-xcheck-'));
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

function buildHeader(exportsList: string): string {
  return [
    '/**',
    ' * @coderef-semantic:1.0.0',
    ' * @layer utility',
    ' * @capability foo-bar',
    ` * @exports ${exportsList}`,
    ' * @imports []',
    ' * @generated 2026-05-03T00:00:00Z',
    ' */',
    '',
  ].join('\n');
}

describe('Phase 2.5 header @exports vs AST cross-check (AC-05)', () => {
  afterEach(async () => {
    await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
  });

  it('matching @exports vs AST -> headerStatus=defined', async () => {
    const dir = await project({
      'src/m.ts': buildHeader('alpha, beta') + 'export function alpha() {}\nexport function beta() {}\n',
    });
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const elem = state.elements.find(e => e.name === 'alpha');
    expect(elem?.headerStatus).toBe('defined');
  });

  it('header lists symbol not in AST -> headerStatus=stale', async () => {
    const dir = await project({
      'src/m.ts': buildHeader('alpha, missing') + 'export function alpha() {}\n',
    });
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const elem = state.elements.find(e => e.name === 'alpha');
    expect(elem?.headerStatus).toBe('stale');
  });

  it('AST has export not in @exports -> headerStatus=stale (AST is source of truth)', async () => {
    const dir = await project({
      'src/m.ts':
        buildHeader('alpha') + 'export function alpha() {}\nexport function extra() {}\n',
    });
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    const elem = state.elements.find(e => e.name === 'alpha');
    expect(elem?.headerStatus).toBe('stale');
  });

  // Regression: WO-FIX-EXPORTS-RAWEXPORTS-STALENESS-MISMATCH-001
  // rawExports (tree-sitter pass) captures `export enum` declarations; the element extractor
  // does not. Before the fix, the staleness check used rawExports and would flag
  // headerStatus=stale for files whose @exports header correctly omits enum names.
  // After the fix, astSet comes from element.exports (same source as header-generator),
  // so a file with only function exports listed in @exports is correctly headerStatus=defined.
  it('false-stale fix: enum export not in @exports -> headerStatus=defined (not stale)', async () => {
    const dir = await project({
      'src/m.ts':
        buildHeader('alpha') +
        'export function alpha() {}\nexport enum Mode { A, B }\n',
    });
    const state = await new PipelineOrchestrator().run(dir, {
      outputDir: path.join(dir, '.coderef'),
      languages: ['ts'],
      mode: 'minimal',
    });
    // alpha is in @exports; Mode (enum) is not tracked by element extractor.
    // With fix: astSet = element.exports = [alpha] → matches headerSet → defined.
    const elem = state.elements.find(e => e.name === 'alpha');
    expect(elem?.headerStatus).toBe('defined');
  });
});
