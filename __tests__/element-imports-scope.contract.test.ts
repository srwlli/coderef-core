/**
 * @coderef-contract element.imports is PER-ELEMENT, and TS import bindings exist.
 *
 * WO-ELEMENT-IMPORTS-ASSIGNS-THE-WHOLE-FILE-IMPORT-LIST-001 phase 1 (TKT-SCBB58).
 *
 * Two defects, one seam, proven by measurement before this file was written:
 *
 * 1. REPAIR. `relationship-extractor.ts` had TWO import extractors. The legacy
 *    `extractImports` resolved the import clause with
 *    `node.childForFieldName('import_clause')`, which tree-sitter-typescript
 *    returns NULL for — so its entire specifiers/default/namespace block was
 *    unreachable and `element.imports[].specifiers` was ALWAYS []. The raw-facts
 *    path in the same class already looked the node up by TYPE and carried a
 *    comment explaining exactly why. One fixed, one not, nothing testing the seam.
 *    Measured: 26/26 import entries across four importing files carried empty
 *    specifiers, including files whose source plainly reads `import { X } from`.
 *
 * 2. NARROW. Both scanner legs assigned the WHOLE FILE's import list to EVERY
 *    element in the file. Measured across 256 src files: 2,445 of 2,778 elements
 *    carried imports, 11,578 entries attached, and in ALL 203 files that have
 *    imports every element carried a byte-identical copy. The live consequence is
 *    in `clones.ts:247`, which gates triviality on `importSources(el.imports)
 *    .length === 0` — so in any file with imports, NO element could ever be
 *    trivial. 193 elements qualified; 1,264 should.
 *
 * The narrowing rule is deliberately CONSERVATIVE (keep on any whole-word match
 * of a bound local name in the element body). The error directions are not
 * symmetric: a false KEEP retains an unused import, which is the status quo and
 * harmless; a false DROP discards an import the element genuinely uses, which is
 * data loss. Cases (f) and (g) pin that conservatism so a later "tightening"
 * cannot quietly turn it into resolution it is not.
 */
import { describe, it, expect } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { scanFileWithTreeSitter } from '../src/scanner/tree-sitter-file-scan.js';
import type { ElementData } from '../src/types/types.js';

/**
 * Scan through the REAL production entry point. `scanFileWithTreeSitter` is what
 * `scanner.ts:1160` and `scanner-worker.ts:72` call — deliberately NOT a local
 * reimplementation. A test file carrying its own copy of production logic is the
 * defect the predecessor workorder had to delete in phase 6.
 */
async function scan(name: string, src: string): Promise<ElementData[]> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-imports-scope-'));
  try {
    const f = path.join(dir, name);
    fs.writeFileSync(f, src, 'utf8');
    return await scanFileWithTreeSitter(f, src);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const byName = (els: ElementData[], n: string) => els.find((e) => e.name === n);
const sourcesOf = (el?: ElementData) => (el?.imports ?? []).map((i) => i.source).sort();

describe('element.imports scope contract', () => {
  // ---- (1) REPAIR: TS import bindings are actually extracted -----------------

  it('(a) populates named specifiers on a TS import', async () => {
    const els = await scan(
      'a.ts',
      `import { alpha, beta } from './mod.js';
export function useAlpha(): void { alpha(); beta(); }
`
    );
    const fn = byName(els, 'useAlpha');
    const mod = (fn?.imports ?? []).find((i) => i.source === './mod.js');
    expect(mod, 'the ./mod.js import should be attached').toBeDefined();
    expect(mod!.specifiers).toEqual(expect.arrayContaining(['alpha', 'beta']));
  });

  it('(b) populates the default import name on a TS import', async () => {
    const els = await scan(
      'b.ts',
      `import Def from './def.js';
export function useDef(): void { Def(); }
`
    );
    const fn = byName(els, 'useDef');
    const mod = (fn?.imports ?? []).find((i) => i.source === './def.js');
    expect(mod).toBeDefined();
    expect(mod!.default).toBe('Def');
  });

  it('(c) populates the namespace alias on a TS import', async () => {
    const els = await scan(
      'c.ts',
      `import * as NS from './ns.js';
export function useNs(): void { NS.go(); }
`
    );
    const fn = byName(els, 'useNs');
    const mod = (fn?.imports ?? []).find((i) => i.source === './ns.js');
    expect(mod).toBeDefined();
    expect((mod as { namespace?: string }).namespace).toBe('NS');
  });

  // ---- (2) NARROW: imports belong to the element that uses them --------------

  it('(d) gives two elements only the imports each actually references', async () => {
    const els = await scan(
      'd.ts',
      `import { alpha } from './a.js';
import { beta } from './b.js';

export function usesAlpha(): void { alpha(); }

export function usesBeta(): void { beta(); }
`
    );
    expect(sourcesOf(byName(els, 'usesAlpha'))).toEqual(['./a.js']);
    expect(sourcesOf(byName(els, 'usesBeta'))).toEqual(['./b.js']);
  });

  it('(e) attaches NO imports to an element that references none', async () => {
    const els = await scan(
      'e.ts',
      `import { alpha } from './a.js';

export function usesAlpha(): void { alpha(); }

export function selfContained(x: number): number { return x * 2; }
`
    );
    expect(sourcesOf(byName(els, 'selfContained'))).toEqual([]);
    // and the element that DOES use it is unaffected
    expect(sourcesOf(byName(els, 'usesAlpha'))).toEqual(['./a.js']);
  });

  it('(f) CONSERVATIVELY keeps a side-effect import that binds no names', async () => {
    const els = await scan(
      'f.ts',
      `import './register-side-effects.js';

export function plain(x: number): number { return x + 1; }
`
    );
    // Nothing is bound, so nothing can be matched against the body. Dropping it
    // would be a guess; keeping it is the safe direction.
    expect(sourcesOf(byName(els, 'plain'))).toEqual(['./register-side-effects.js']);
  });

  it('(g) CONSERVATIVELY keeps a dynamic import', async () => {
    const els = await scan(
      'g.ts',
      `export async function loader(): Promise<unknown> {
  const m = await import('./dynamic.js');
  return m;
}
`
    );
    const fn = byName(els, 'loader');
    expect((fn?.imports ?? []).some((i) => i.dynamic === true)).toBe(true);
  });

  it('(h) narrows on the JS leg too, not just TS', async () => {
    const els = await scan(
      'h.js',
      `import { alpha } from './a.js';
import { beta } from './b.js';

export function usesAlpha() { return alpha(); }

export function usesBeta() { return beta(); }
`
    );
    expect(sourcesOf(byName(els, 'usesAlpha'))).toEqual(['./a.js']);
    expect(sourcesOf(byName(els, 'usesBeta'))).toEqual(['./b.js']);
  });

  it('(i) lets a self-contained element be TRIVIAL inside a file that has imports', async () => {
    // This is the measured downstream defect. clones.ts:247 gates triviality on
    // paramNames(el.parameters).length === 0 && importSources(el.imports).length === 0.
    // Asserted on the INPUT clones.ts reads rather than by calling isTrivial(),
    // so this test does not re-implement the predicate it is protecting.
    const els = await scan(
      'i.ts',
      `import { alpha } from './a.js';

export function usesAlpha(): void { alpha(); }

export function noParamsNoImports(): number { return 42; }
`
    );
    const trivial = byName(els, 'noParamsNoImports');
    expect(trivial).toBeDefined();
    const params = Array.isArray(trivial!.parameters) ? trivial!.parameters.length : 0;
    expect(params).toBe(0);
    expect(sourcesOf(trivial)).toEqual([]);
  });

  it('(j) does not attach an identical import array to every element of a file', async () => {
    const els = await scan(
      'j.ts',
      `import { alpha } from './a.js';
import { beta } from './b.js';

export function usesAlpha(): void { alpha(); }

export function usesBeta(): void { beta(); }

export function usesNeither(): number { return 0; }
`
    );
    const named = ['usesAlpha', 'usesBeta', 'usesNeither']
      .map((n) => byName(els, n))
      .filter(Boolean) as ElementData[];
    expect(named.length).toBe(3);
    const signatures = new Set(named.map((e) => JSON.stringify(sourcesOf(e))));
    // Before the fix every element carried a byte-identical whole-file list, so
    // this set had exactly one member in all 203 importing files measured.
    expect(signatures.size).toBeGreaterThan(1);
  });
});
