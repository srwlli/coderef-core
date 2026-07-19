/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability docstrings-query-tests
 */

/**
 * Pure computeDocstringSurface tests (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P8).
 *
 * No grammar, no I/O — the projection is pure over a synthetic element set.
 * Asserts coverage roll-up, absence=no-data, determinism, filters, pagination,
 * and the surfaces-not-verdicts contract (no quality-grade field).
 */

import { describe, it, expect } from 'vitest';
import {
  computeDocstringSurface,
  DOCSTRING_SCHEMA_VERSION,
  type DocstringElement,
} from '../../src/query/docstrings.js';

const els: DocstringElement[] = [
  { type: 'function', name: 'add', file: 'a.ts', line: 10, codeRefId: '@Fn/a.ts#add:10', docstring: 'Adds.' },
  { type: 'function', name: 'sub', file: 'a.ts', line: 20, codeRefId: '@Fn/a.ts#sub:20' },
  { type: 'class', name: 'Widget', file: 'b.ts', line: 5, codeRefId: '@Cl/b.ts#Widget:5', docstring: 'A widget.' },
];

describe('computeDocstringSurface', () => {
  it('computes the coverage roll-up (documented / undocumented / ratio)', () => {
    const s = computeDocstringSurface({ elements: els });
    expect(s.summary.total).toBe(3);
    expect(s.summary.documented).toBe(2);
    expect(s.summary.undocumented).toBe(1);
    expect(s.summary.coverageRatio).toBeCloseTo(2 / 3);
    expect(s.no_data).toBe(false);
  });

  it('marks an undocumented element hasDocstring:false with the text omitted (never "")', () => {
    const s = computeDocstringSurface({ elements: els });
    const sub = s.items.find((i) => i.name === 'sub');
    expect(sub?.hasDocstring).toBe(false);
    expect(sub && 'docstring' in sub).toBe(false);
  });

  it('attaches the docstring text + codeRefId for a documented element', () => {
    const s = computeDocstringSurface({ elements: els });
    const add = s.items.find((i) => i.name === 'add');
    expect(add?.hasDocstring).toBe(true);
    expect(add?.docstring).toBe('Adds.');
    expect(add?.codeRefId).toBe('@Fn/a.ts#add:10');
  });

  it('returns no_data:true for an empty element set (never a false 0% coverage)', () => {
    const s = computeDocstringSurface({ elements: [] });
    expect(s.no_data).toBe(true);
    expect(s.summary.total).toBe(0);
    expect(s.items).toEqual([]);
  });

  it('filters documented=true / documented=false', () => {
    const only = computeDocstringSurface({ elements: els, documented: true });
    expect(only.items.map((i) => i.name).sort()).toEqual(['Widget', 'add']);
    const none = computeDocstringSurface({ elements: els, documented: false });
    expect(none.items.map((i) => i.name)).toEqual(['sub']);
  });

  it('filters by name substring (case-insensitive)', () => {
    const s = computeDocstringSurface({ elements: els, filter: 'WID' });
    expect(s.items.map((i) => i.name)).toEqual(['Widget']);
  });

  it('is deterministic — identical inputs yield byte-identical output', () => {
    const a = JSON.stringify(computeDocstringSurface({ elements: els }));
    const b = JSON.stringify(computeDocstringSurface({ elements: els }));
    expect(a).toBe(b);
  });

  it('sorts items by (file, line, name)', () => {
    const s = computeDocstringSurface({ elements: els });
    expect(s.items.map((i) => i.name)).toEqual(['add', 'sub', 'Widget']);
  });

  it('paginates with a truncation flag', () => {
    const s = computeDocstringSurface({ elements: els, limit: 2, offset: 0 });
    expect(s.items).toHaveLength(2);
    expect(s.truncated).toBe(true);
    const s2 = computeDocstringSurface({ elements: els, limit: 2, offset: 2 });
    expect(s2.items).toHaveLength(1);
    expect(s2.truncated).toBe(false);
  });

  it('carries the schema version and exposes NO composite quality grade', () => {
    const s = computeDocstringSurface({ elements: els });
    expect(s.schema_version).toBe(DOCSTRING_SCHEMA_VERSION);
    // surfaces-not-verdicts: coverageRatio is provenance; there is no grade/score/verdict field.
    expect(s.summary).not.toHaveProperty('grade');
    expect(s.summary).not.toHaveProperty('score');
    expect(s).not.toHaveProperty('verdict');
  });
});
