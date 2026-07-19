import { describe, it, expect } from 'vitest';
import {
  extractExportsManifest,
  diffApiSurface,
  API_MANIFEST_SCHEMA_VERSION,
  type ManifestElement,
  type ExportsManifest,
} from '../../src/query/api-diff.js';

/**
 * api-diff pure tests (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 6).
 * Mirrors the metrics-delta / type-hierarchy pure-projection test shape: no I/O,
 * no git — every case supplies two manifests (or element arrays) and asserts the
 * decomposed diff. Surfaces-not-verdicts + absence=no-data are load-bearing.
 */

function el(over: Partial<ManifestElement>): ManifestElement {
  return {
    name: 'fn',
    type: 'function',
    file: 'src/a.ts',
    exported: true,
    parameters: [],
    codeRefIdNoLine: undefined,
    ...over,
  };
}

describe('extractExportsManifest', () => {
  it('includes only exported elements', () => {
    const m = extractExportsManifest([
      el({ name: 'pub', exported: true }),
      el({ name: 'priv', exported: false }),
      el({ name: 'undef', exported: undefined }),
    ]);
    const names = Object.values(m.exports).map(e => e.name).sort();
    expect(names).toEqual(['pub']);
    expect(m.schemaVersion).toBe(API_MANIFEST_SCHEMA_VERSION);
  });

  it('captures param arity from the parameters array, null when absent', () => {
    const m = extractExportsManifest([
      el({ name: 'two', parameters: [{}, {}] }),
      el({ name: 'noParams', parameters: undefined }),
    ]);
    const byName = Object.fromEntries(Object.values(m.exports).map(e => [e.name, e]));
    expect(byName.two.paramArity).toBe(2);
    expect(byName.noParams.paramArity).toBeNull();
  });

  it('keys by codeRefIdNoLine when present, else file+name', () => {
    const m = extractExportsManifest([
      el({ name: 'x', codeRefIdNoLine: 'CREF/x' }),
      el({ name: 'y', file: 'src/b.ts' }),
    ]);
    expect(Object.keys(m.exports)).toContain('CREF/x');
    expect(Object.keys(m.exports).some(k => k.includes('src/b.ts') && k.includes('y'))).toBe(true);
  });

  it('normalizes backslash file paths to forward slashes in the key', () => {
    const m = extractExportsManifest([el({ name: 'z', file: 'src\\win\\z.ts' })]);
    const key = Object.keys(m.exports)[0];
    expect(key).not.toContain('\\');
    expect(key).toContain('src/win/z.ts');
  });
});

describe('diffApiSurface', () => {
  const mk = (els: ManifestElement[]): ExportsManifest => extractExportsManifest(els);

  it('detects an added export', () => {
    const before = mk([el({ name: 'keep', codeRefIdNoLine: 'k' })]);
    const after = mk([el({ name: 'keep', codeRefIdNoLine: 'k' }), el({ name: 'newer', codeRefIdNoLine: 'n' })]);
    const d = diffApiSurface({ before, after });
    expect(d.noData).toBe(false);
    expect(d.added.map(c => c.name)).toEqual(['newer']);
    expect(d.added[0].direction).toBe('added');
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
    expect(d.unchangedCount).toBe(1);
  });

  it('detects a removed export', () => {
    const before = mk([el({ name: 'keep', codeRefIdNoLine: 'k' }), el({ name: 'gone', codeRefIdNoLine: 'g' })]);
    const after = mk([el({ name: 'keep', codeRefIdNoLine: 'k' })]);
    const d = diffApiSurface({ before, after });
    expect(d.removed.map(c => c.name)).toEqual(['gone']);
    expect(d.removed[0].direction).toBe('removed');
    expect(d.removed[0].before).toEqual({ paramArity: 0 });
    expect(d.added).toEqual([]);
  });

  it('detects a signature (param-arity) change', () => {
    const before = mk([el({ name: 'f', codeRefIdNoLine: 'f', parameters: [{}] })]);
    const after = mk([el({ name: 'f', codeRefIdNoLine: 'f', parameters: [{}, {}, {}] })]);
    const d = diffApiSurface({ before, after });
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0]).toMatchObject({
      name: 'f',
      changeType: 'changed',
      direction: 'changed',
      before: { paramArity: 1 },
      after: { paramArity: 3 },
    });
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  it('reports an unchanged surface as an empty diff (not all-added)', () => {
    const m = mk([el({ name: 'a', codeRefIdNoLine: 'a' }), el({ name: 'b', codeRefIdNoLine: 'b' })]);
    const d = diffApiSurface({ before: m, after: m });
    expect(d.noData).toBe(false);
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
    expect(d.unchangedCount).toBe(2);
  });

  it('ABSENCE = NO-DATA: a missing baseline is no_data, NOT every export removed', () => {
    const after = mk([el({ name: 'a', codeRefIdNoLine: 'a' })]);
    const d = diffApiSurface({ before: undefined, after });
    expect(d.noData).toBe(true);
    // The load-bearing assertion: NOT reported as all-added/all-removed.
    expect(d.added).toEqual([]);
    expect(d.removed).toEqual([]);
    expect(d.changed).toEqual([]);
    expect(d.warnings.some(w => /BEFORE manifest absent/.test(w))).toBe(true);
  });

  it('surfaces a schemaVersion mismatch as a warning but still diffs', () => {
    const before: ExportsManifest = { schemaVersion: '0.9.0', exports: { a: { name: 'a', kind: 'function', file: 'src/a.ts', paramArity: 0 } } };
    const after = mk([el({ name: 'a', codeRefIdNoLine: 'a2', file: 'src/a.ts' })]);
    const d = diffApiSurface({ before, after });
    expect(d.schemaVersion.match).toBe(false);
    expect(d.warnings.some(w => /schemaVersion mismatch/.test(w))).toBe(true);
  });

  it('is deterministic — identical inputs yield byte-identical output', () => {
    const before = mk([el({ name: 'b', codeRefIdNoLine: 'b' }), el({ name: 'a', codeRefIdNoLine: 'a' })]);
    const after = mk([el({ name: 'c', codeRefIdNoLine: 'c', file: 'src/z.ts' }), el({ name: 'a2', codeRefIdNoLine: 'a2', file: 'src/a.ts' })]);
    const d1 = diffApiSurface({ before, after });
    const d2 = diffApiSurface({ before, after });
    expect(JSON.stringify(d1)).toBe(JSON.stringify(d2));
  });

  it('sorts added/removed by (file, name)', () => {
    const before = mk([]);
    const after = mk([
      el({ name: 'zeta', codeRefIdNoLine: 'z', file: 'src/a.ts' }),
      el({ name: 'alpha', codeRefIdNoLine: 'al', file: 'src/a.ts' }),
      el({ name: 'mid', codeRefIdNoLine: 'm', file: 'src/b.ts' }),
    ]);
    const d = diffApiSurface({ before, after });
    expect(d.added.map(c => `${c.file}:${c.name}`)).toEqual(['src/a.ts:alpha', 'src/a.ts:zeta', 'src/b.ts:mid']);
  });

  it('never emits a composite breaking-count score', () => {
    const before = mk([el({ name: 'keep', codeRefIdNoLine: 'k' }), el({ name: 'gone', codeRefIdNoLine: 'g' })]);
    const after = mk([el({ name: 'keep', codeRefIdNoLine: 'k' }), el({ name: 'newer', codeRefIdNoLine: 'n' })]);
    const d = diffApiSurface({ before, after });
    // Only decomposed counts exist — no single "breaking" verdict field.
    expect(d).not.toHaveProperty('breakingCount');
    expect(d).not.toHaveProperty('score');
    expect(d.note).toMatch(/SURFACES, NOT VERDICTS/);
  });
});
