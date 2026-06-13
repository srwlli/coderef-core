/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability scanner-export-classification-test
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { PipelineState } from '../../src/pipeline/types.js';

const created: string[] = [];
afterEach(async () => {
  await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
});

async function scanFixture(mainTs: string): Promise<PipelineState> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-scan-export-'));
  created.push(dir);
  await fs.mkdir(path.join(dir, 'src'), { recursive: true });
  await fs.writeFile(path.join(dir, 'src', 'main.ts'), mainTs, 'utf-8');
  return new PipelineOrchestrator().run(dir, {
    outputDir: path.join(dir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });
}

describe('scanner export classification (STUB-5WVGHD)', () => {
  it('nested elements do NOT inherit the parent export flag', async () => {
    const state = await scanFixture([
      'export function outer(): number {',
      '  function inner(): number { return 1; }',
      '  const innerArrow = (): number => 2;',
      '  return inner() + innerArrow();',
      '}',
    ].join('\n') + '\n');

    const outer = state.elements.find(e => e.name === 'outer');
    expect(outer, 'outer element').toBeDefined();
    expect(outer!.exported).toBe(true);

    const inner = state.elements.find(e => e.name === 'outer.inner');
    expect(inner, 'nested function element').toBeDefined();
    expect(inner!.exported, 'nested fn must not inherit parent export').toBe(false);

    const innerArrow = state.elements.find(e => e.name === 'innerArrow');
    expect(innerArrow, 'nested arrow element').toBeDefined();
    expect(innerArrow!.exported, 'nested arrow must not inherit parent export').toBe(false);
  });

  it('exported multi-line const declarations are extracted as exported constants', async () => {
    const state = await scanFixture([
      "export const BIG_SET = new Set<string>([",
      "  'alpha',",
      "  'beta',",
      "]);",
      "const PRIVATE_SET = new Set(['gamma']);",
      "export const SMALL = 1;",
      "export const m = BIG_SET.size + PRIVATE_SET.size + SMALL;",
    ].join('\n') + '\n');

    const big = state.elements.find(e => e.name === 'BIG_SET');
    expect(big, 'BIG_SET element').toBeDefined();
    expect(big!.type).toBe('constant');
    expect(big!.exported).toBe(true);

    const priv = state.elements.find(e => e.name === 'PRIVATE_SET');
    expect(priv, 'PRIVATE_SET element').toBeDefined();
    expect(priv!.exported).toBe(false);

    const small = state.elements.find(e => e.name === 'SMALL');
    expect(small, 'SMALL element (existing single-line behavior)').toBeDefined();
    expect(small!.exported).toBe(true);
  });

  it('top-level export classification is unchanged for functions/classes/interfaces', async () => {
    const state = await scanFixture([
      'export function pub(): number { return 1; }',
      'function priv(): number { return 2; }',
      'export class Box { open(): number { return pub() + priv(); } }',
      'export interface Shape { area: number }',
    ].join('\n') + '\n');

    expect(state.elements.find(e => e.name === 'pub')!.exported).toBe(true);
    expect(state.elements.find(e => e.name === 'priv')!.exported).toBe(false);
    expect(state.elements.find(e => e.name === 'Box')!.exported).toBe(true);
    expect(state.elements.find(e => e.name === 'Shape')!.exported).toBe(true);
    const method = state.elements.find(e => e.name === 'Box.open');
    expect(method, 'method element').toBeDefined();
    expect(method!.exported).toBe(false);
  });
});
