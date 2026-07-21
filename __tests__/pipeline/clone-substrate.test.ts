/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability clone-substrate-capture-tests
 */

/**
 * Clone substrate capture (WO-EXTEND-THE-CLONE-SURFACE-P10-SRC-QUERY-CLONES-001 P1).
 *
 * Proves the LIVE extractor persists endLine + normalizedBodyHash +
 * normalizedBodyLength (+ astFingerprint on function-like kinds) from the one
 * tree-sitter parse it already runs — zero extra I/O. The load-bearing
 * invariants: the hash is computed over the BODY (name/signature excluded, so
 * a renamed copy still matches), comment/whitespace differences do NOT change
 * it, and the fingerprint kind-gate keeps non-function kinds hash-only.
 * Grammar-dependent assertions gate on a one-time availability probe (mirrors
 * element-extractor-docstring.test.ts).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ElementExtractor } from '../../src/pipeline/extractors/element-extractor.js';
import { GrammarRegistry } from '../../src/pipeline/grammar-registry.js';
import { computeCloneSurface, type CloneElement } from '../../src/query/clones.js';
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

describe('clone substrate capture — TS', () => {
  let ts = false;
  beforeAll(async () => { ts = await grammarAvailable('ts'); });

  it('persists endLine spanning the full declaration', async () => {
    if (!ts) return;
    const src = 'export function span(a, b) {\n  const t = a + b;\n  return t;\n}\n';
    const el = byName(await extract('ts', 'ts', src), 'span');
    expect(el?.line).toBe(1);
    expect(el?.endLine).toBe(4);
    expect(typeof el?.normalizedBodyHash).toBe('string');
    expect(el?.normalizedBodyHash).toHaveLength(32);
    expect(el?.normalizedBodyLength).toBeGreaterThan(0);
  });

  it('hash is body-only and comment/whitespace-invariant: renamed copy with different comments matches', async () => {
    if (!ts) return;
    const srcA = 'export function alpha(a, b) {\n  // adds the numbers\n  const total = a + b;\n  return total;\n}\n';
    const srcB = 'export function beta(a, b) {\n  /* different comment style */\n  const total = a + b;\n\n\n  return total;\n}\n';
    const a = byName(await extract('ts', 'ts', srcA, 'a.ts'), 'alpha');
    const b = byName(await extract('ts', 'ts', srcB, 'b.ts'), 'beta');
    expect(a?.normalizedBodyHash).toBeDefined();
    expect(a?.normalizedBodyHash).toBe(b?.normalizedBodyHash);
    expect(a?.normalizedBodyLength).toBe(b?.normalizedBodyLength);
  });

  it('different bodies hash differently', async () => {
    if (!ts) return;
    const a = byName(await extract('ts', 'ts', 'function one() { return 1; }\n'), 'one');
    const b = byName(await extract('ts', 'ts', 'function two() { return 2; }\n'), 'two');
    expect(a?.normalizedBodyHash).not.toBe(b?.normalizedBodyHash);
  });

  it('astFingerprint present on function-like kinds, ABSENT on interface/type (kind gate)', async () => {
    if (!ts) return;
    const src =
      'export function fn(x) { if (x) { return x; } return null; }\n' +
      'export interface Shape { x: number; }\n' +
      'export type Alias = string;\n' +
      'export class Box { get(): number { return 1; } }\n';
    const els = await extract('ts', 'ts', src);
    const fn = byName(els, 'fn');
    expect(fn?.astFingerprint).toBeDefined();
    expect(Object.keys(fn!.astFingerprint!).length).toBeGreaterThan(0);
    expect(fn!.astFingerprint!['if_statement']).toBe(1);
    expect(byName(els, 'Shape')?.astFingerprint).toBeUndefined();
    expect(byName(els, 'Alias')?.astFingerprint).toBeUndefined();
    // class: hash + endLine only; its METHOD is function-like and fingerprinted
    const box = byName(els, 'Box');
    expect(box?.normalizedBodyHash).toBeDefined();
    expect(box?.astFingerprint).toBeUndefined();
    expect(byName(els, 'Box.get')?.astFingerprint).toBeDefined();
  });

  it('fingerprint keys are sorted (deterministic serialization)', async () => {
    if (!ts) return;
    const el = byName(await extract('ts', 'ts', 'function s(x) { if (x) { call(); } return x; }\nfunction call() {}\n'), 's');
    const keys = Object.keys(el!.astFingerprint!);
    expect(keys).toEqual([...keys].sort());
  });

  it('E2E: extractor output feeds the lexical pass — renamed copies group', async () => {
    if (!ts) return;
    const srcA = 'export function origHandler(req, res) {\n  const out = req.body;\n  res.send(out);\n}\n';
    const srcB = 'export function pastedHandler(req, res) {\n  // pasted\n  const out = req.body;\n  res.send(out);\n}\n';
    const els = [
      ...(await extract('ts', 'ts', srcA, 'src/a.ts')),
      ...(await extract('ts', 'ts', srcB, 'src/b.ts')),
    ];
    const s = computeCloneSurface({ elements: els as unknown as CloneElement[], pass: 'lexical' });
    expect(s.no_data).toBe(false);
    expect(s.summary.total_groups).toBe(1);
    expect(s.lexical_groups![0].members.map((m) => m.name).sort()).toEqual(['origHandler', 'pastedHandler']);
  });

  it('E2E: near-miss pass pairs similar-but-not-identical bodies from live extraction', async () => {
    if (!ts) return;
    const srcA =
      'export function procA(list) {\n  const out = [];\n  for (const item of list) {\n    if (item.ok) { out.push(item.value); }\n  }\n  return out;\n}\n';
    const srcB =
      'export function procB(rows) {\n  const acc = [];\n  for (const row of rows) {\n    if (row.ok) { acc.push(row.name); }\n  }\n  acc.sort();\n  return acc;\n}\n';
    const els = [
      ...(await extract('ts', 'ts', srcA, 'src/a.ts')),
      ...(await extract('ts', 'ts', srcB, 'src/b.ts')),
    ];
    const s = computeCloneSurface({
      elements: els as unknown as CloneElement[],
      pass: 'near_miss',
      similarityThreshold: 0.8,
    });
    expect(s.no_data).toBe(false);
    expect(s.near_miss_pairs!.length).toBe(1);
    const pair = s.near_miss_pairs![0];
    expect([pair.a.name, pair.b.name].sort()).toEqual(['procA', 'procB']);
    expect(pair.similarity).toBeGreaterThanOrEqual(0.8);
    expect(pair.similarity).toBeLessThan(1);
  });
});

describe('clone substrate capture — Python', () => {
  let py = false;
  beforeAll(async () => { py = await grammarAvailable('py'); });

  it('persists the substrate for Python functions (docstring counts as a body statement, comments stripped)', async () => {
    if (!py) return;
    const srcA = 'def first(a, b):\n    # comment\n    total = a + b\n    return total\n';
    const srcB = 'def second(a, b):\n    total = a + b\n    return total\n';
    const a = byName(await extract('py', 'py', srcA, 'a.py'), 'first');
    const b = byName(await extract('py', 'py', srcB, 'b.py'), 'second');
    expect(a?.endLine).toBe(4);
    expect(a?.normalizedBodyHash).toBeDefined();
    expect(a?.normalizedBodyHash).toBe(b?.normalizedBodyHash);
    expect(a?.astFingerprint).toBeDefined();
  });
});
