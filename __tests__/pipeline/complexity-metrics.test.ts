/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability ast-complexity-metrics-tests
 */

/**
 * AST-accurate complexity metrics (WO-EXTEND-THE-CLONE-SURFACE-P10 P2).
 *
 * Every expectation below is HAND-COMPUTED against the pinned metric spec in
 * src/pipeline/extractors/complexity-metrics.ts (cyclomatic = decisions + 1;
 * cognitive = Sonar-subset with nesting penalty, else-if flat; nestingDepth =
 * max enclosing control structures). Fixtures run through the LIVE extractor
 * so they also prove the push-site wiring fills ElementData.complexity for
 * function-like kinds and leaves it absent on classes/interfaces (the
 * disclosed-fallback discipline downstream relies on that absence).
 * Grammar-dependent assertions gate on a one-time availability probe
 * (mirrors clone-substrate.test.ts).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ElementExtractor } from '../../src/pipeline/extractors/element-extractor.js';
import { GrammarRegistry } from '../../src/pipeline/grammar-registry.js';
import type { ElementData } from '../../src/types/types.js';

async function grammarAvailable(ext: string): Promise<boolean> {
  try {
    const p = await GrammarRegistry.getInstance().getParser(ext);
    return p !== null;
  } catch {
    return false;
  }
}

async function extract(ext: string, lang: string, src: string, file = `mem.${ext}`): Promise<ElementData[]> {
  const parser = await GrammarRegistry.getInstance().getParser(ext);
  if (!parser) return [];
  const tree = parser.parse(src);
  return new ElementExtractor().extract(tree.rootNode, file, src, lang);
}

const byName = (els: ElementData[], name: string) => els.find((e) => e.name === name);

describe('complexity metrics — TS (hand-computed fixtures)', () => {
  let ts = false;
  beforeAll(async () => { ts = await grammarAvailable('ts'); });

  it('counts the full decision-node set; switch default excluded', async () => {
    if (!ts) return;
    const src = [
      'export function cc(a, b) {',
      '  if (a && b) {',
      '    return 1;',
      '  } else if (a || b) {',
      '    return 2;',
      '  }',
      '  for (const x of [1, 2]) {',
      '    while (b) {',
      '      b = a ? 1 : 2;',
      '    }',
      '  }',
      '  try {',
      '    a();',
      '  } catch (e) {',
      '    return 3;',
      '  }',
      '  switch (a) {',
      '    case 1: break;',
      '    case 2: break;',
      '    default: break;',
      '  }',
      '  return 0;',
      '}',
    ].join('\n');
    const el = byName(await extract('ts', 'ts', src), 'cc');
    // cyclomatic: 1 base + if + && + else-if + || + for-of + while + ternary
    //             + catch + 2 case labels (default EXCLUDED) = 11
    expect(el?.complexity?.cyclomatic).toBe(11);
    // cognitive: if+1, &&+1, else-if+1(flat), ||+1, for+1, while+2(nested),
    //            ternary+3(nested x2), catch+1, switch+1 = 12
    expect(el?.complexity?.cognitive).toBe(12);
    // deepest chain: for(1) > while(2) > ternary(3)
    expect(el?.complexity?.nestingDepth).toBe(3);
  });

  it('nesting penalty + plain-else flat increment', async () => {
    if (!ts) return;
    const src = [
      'export function cog(a) {',
      '  if (a) {',
      '    if (a > 1) {',
      '      return 2;',
      '    }',
      '  } else {',
      '    return 3;',
      '  }',
      '  return 0;',
      '}',
    ].join('\n');
    const el = byName(await extract('ts', 'ts', src), 'cog');
    expect(el?.complexity?.cyclomatic).toBe(3); // base + 2 ifs (else adds 0)
    expect(el?.complexity?.cognitive).toBe(4); // outer if +1, inner if +2 (nested), plain else +1
    expect(el?.complexity?.nestingDepth).toBe(2);
  });

  it('flat body floors at cyclomatic 1 / cognitive 0 / depth 0', async () => {
    if (!ts) return;
    const el = byName(await extract('ts', 'ts', 'export function flat(a, b) { return a + b; }\n'), 'flat');
    expect(el?.complexity).toEqual({ cyclomatic: 1, nestingDepth: 0, cognitive: 0 });
  });

  it('function-like kinds get complexity; classes/interfaces do not (kind gate)', async () => {
    if (!ts) return;
    const src = [
      'export function fn(x) { if (x) { return x; } return 0; }',
      'export interface Shape { x: number; }',
      'export class Box {',
      '  get(v) { return v ? 1 : 0; }',
      '}',
    ].join('\n');
    const els = await extract('ts', 'ts', src);
    expect(byName(els, 'fn')?.complexity?.cyclomatic).toBe(2);
    expect(byName(els, 'Shape')?.complexity).toBeUndefined();
    expect(byName(els, 'Box')?.complexity).toBeUndefined();
    // the method INSIDE the class is function-like and gets metrics
    expect(byName(els, 'Box.get')?.complexity?.cyclomatic).toBe(2); // base + ternary
  });

  it('deterministic across runs', async () => {
    if (!ts) return;
    const src = 'export function d(a) { if (a && a > 1) { return 1; } return 0; }\n';
    const a = byName(await extract('ts', 'ts', src), 'd');
    const b = byName(await extract('ts', 'ts', src), 'd');
    expect(a?.complexity).toEqual(b?.complexity);
  });
});

describe('complexity metrics — Python (hand-computed fixtures)', () => {
  let py = false;
  beforeAll(async () => { py = await grammarAvailable('py'); });

  it('counts if/and/elif/or/else/for/while/ternary/except', async () => {
    if (!py) return;
    const src = [
      'def pf(a, b):',
      '    if a and b:',
      '        return 1',
      '    elif a or b:',
      '        return 2',
      '    else:',
      '        return 3',
      '    for x in a:',
      '        while b:',
      '            b = 1 if a else 2',
      '    try:',
      '        a()',
      '    except ValueError:',
      '        return 4',
      '    return 0',
      '',
    ].join('\n');
    const el = byName(await extract('py', 'py', src), 'pf');
    // cyclomatic: 1 + if + and + elif + or + for + while + conditional + except = 9
    expect(el?.complexity?.cyclomatic).toBe(9);
    // cognitive: if+1, and+1, elif+1, or+1, else+1, for+1, while+2, cond+3, except+1 = 12
    expect(el?.complexity?.cognitive).toBe(12);
    expect(el?.complexity?.nestingDepth).toBe(3); // for > while > conditional
  });

  it('comprehension for/guard clauses count', async () => {
    if (!py) return;
    const src = 'def comp(xs):\n    return [x for x in xs if x]\n';
    const el = byName(await extract('py', 'py', src), 'comp');
    expect(el?.complexity?.cyclomatic).toBe(3); // base + for_in_clause + if_clause
    expect(el?.complexity?.cognitive).toBe(2); // for +1 (depth 0), guard +1 flat
    expect(el?.complexity?.nestingDepth).toBe(1);
  });
});

describe('complexity metrics — Go (hand-computed fixture)', () => {
  let go = false;
  beforeAll(async () => { go = await grammarAvailable('go'); });

  it('counts if/&&/for/case; default_case excluded; switch head is cognitive-only', async () => {
    if (!go) return;
    const src = [
      'package m',
      'func GF(a bool, b int) int {',
      '  if a && b > 0 {',
      '    return 1',
      '  }',
      '  for i := 0; i < b; i++ {',
      '    b--',
      '  }',
      '  switch b {',
      '  case 1:',
      '    return 2',
      '  default:',
      '    return 3',
      '  }',
      '  return 0',
      '}',
      '',
    ].join('\n');
    const el = byName(await extract('go', 'go', src), 'GF');
    expect(el?.complexity?.cyclomatic).toBe(5); // 1 + if + && + for + expression_case
    expect(el?.complexity?.cognitive).toBe(4); // if+1, &&+1, for+1, switch+1
    expect(el?.complexity?.nestingDepth).toBe(1);
  });
});
