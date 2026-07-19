/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability element-extractor-docstring-tests
 */

/**
 * Element-extractor docstring capture (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P8).
 *
 * Proves the LIVE extractor now fills the long-declared ElementData.docstring
 * slot: a leading /** *\/ JSDoc for JS/TS (including the export_statement-wrapped
 * case, which was the seam trap), and the first string-literal statement for
 * Python. Absence -> undefined (never ''), so "no docstring" stays a
 * distinguishable fact. Grammar-dependent assertions gate on a one-time
 * availability probe (mirrors ast-search.test.ts / git-history.test.ts).
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

async function extract(ext: string, lang: string, src: string): Promise<ElementData[]> {
  const parser = await GrammarRegistry.getInstance().getParser(ext);
  if (!parser) return [];
  const tree = parser.parse(src);
  return new ElementExtractor().extract(tree.rootNode, `mem.${ext}`, src, lang);
}

const byName = (els: ElementData[], name: string) => els.find((e) => e.name === name);

describe('element-extractor docstring capture — TS/JS', () => {
  let ts = false;
  beforeAll(async () => { ts = await grammarAvailable('ts'); });

  it('captures a leading JSDoc on an EXPORTED function (export_statement wrapper seam)', async () => {
    if (!ts) return;
    const src = '/**\n * Adds two numbers.\n */\nexport function add(a, b) { return a + b; }\n';
    const el = byName(await extract('ts', 'ts', src), 'add');
    expect(el?.docstring).toBe('Adds two numbers.');
  });

  it('captures a leading JSDoc on a BARE (non-exported) function', async () => {
    if (!ts) return;
    const src = '/** Bare doc. */\nfunction bare() {}\n';
    const el = byName(await extract('ts', 'ts', src), 'bare');
    expect(el?.docstring).toBe('Bare doc.');
  });

  it('leaves docstring undefined when there is NO leading comment (absence=no-data, never "")', async () => {
    if (!ts) return;
    const src = 'export function nodoc() {}\n';
    const el = byName(await extract('ts', 'ts', src), 'nodoc');
    expect(el?.docstring).toBeUndefined();
  });

  it('does NOT treat a leading // line comment as a docstring', async () => {
    if (!ts) return;
    const src = '// just a line comment\nfunction lined() {}\n';
    const el = byName(await extract('ts', 'ts', src), 'lined');
    expect(el?.docstring).toBeUndefined();
  });

  it('captures a JSDoc on a class and an interface', async () => {
    if (!ts) return;
    const src =
      '/** A widget. */\nexport class Widget {}\n\n/** A shape. */\nexport interface Shape { x: number; }\n';
    const els = await extract('ts', 'ts', src);
    expect(byName(els, 'Widget')?.docstring).toBe('A widget.');
    expect(byName(els, 'Shape')?.docstring).toBe('A shape.');
  });
});

describe('element-extractor docstring capture — Python', () => {
  let py = false;
  beforeAll(async () => { py = await grammarAvailable('py'); });

  it('captures a triple-quoted function docstring with quotes stripped', async () => {
    if (!py) return;
    const src = 'def greet(n):\n    """Say hello to n."""\n    return n\n';
    const el = byName(await extract('py', 'py', src), 'greet');
    expect(el?.docstring).toBe('Say hello to n.');
  });

  it('captures a class docstring', async () => {
    if (!py) return;
    const src = 'class Foo:\n    """A foo."""\n    pass\n';
    const el = byName(await extract('py', 'py', src), 'Foo');
    expect(el?.docstring).toBe('A foo.');
  });

  it('leaves docstring undefined for a def with no docstring', async () => {
    if (!py) return;
    const src = 'def nodoc():\n    return 1\n';
    const el = byName(await extract('py', 'py', src), 'nodoc');
    expect(el?.docstring).toBeUndefined();
  });
});
