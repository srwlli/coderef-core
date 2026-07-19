/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability clones-query-tests
 */

/**
 * Pure computeCloneSurface tests (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P10).
 *
 * No grammar, no I/O — the projection is pure over a synthetic element set.
 * Asserts signature grouping, arity/param/import sensitivity, minGroupSize,
 * determinism, sort order, pagination, the disclosure fields (signature_basis +
 * elements_without_signature), absence=no-data, and the surfaces-not-verdicts
 * contract (no duplication score/grade/verdict).
 */

import { describe, it, expect } from 'vitest';
import {
  computeCloneSurface,
  CLONE_SCHEMA_VERSION,
  SIGNATURE_BASIS,
  type CloneElement,
} from '../../src/query/clones.js';

// Two elements sharing an identical structural signature (a clone pair).
const clonePair: CloneElement[] = [
  { name: 'handler', type: 'function', file: 'src/a.ts', line: 10, codeRefId: '@Fn/a.ts#handler:10', parameters: ['req', 'res'], imports: [{ source: 'express', line: 1 }] },
  { name: 'handler', type: 'function', file: 'src/b.ts', line: 5, codeRefId: '@Fn/b.ts#handler:5', parameters: ['req', 'res'], imports: [{ source: 'express', line: 9 }] },
];

describe('computeCloneSurface', () => {
  it('groups elements that share (kind, name, arity, params, import-sources)', () => {
    const s = computeCloneSurface({ elements: clonePair });
    expect(s.no_data).toBe(false);
    expect(s.summary.total_groups).toBe(1);
    expect(s.groups[0].size).toBe(2);
    expect(s.groups[0].signature.name).toBe('handler');
    expect(s.groups[0].signature.arity).toBe(2);
    expect(s.summary.clustered_elements).toBe(2);
  });

  it('ignores import LINE differences (source-only signature)', () => {
    // clonePair has express imported at line 1 vs line 9 — still one group.
    const s = computeCloneSurface({ elements: clonePair });
    expect(s.summary.total_groups).toBe(1);
    expect(s.groups[0].signature.imports).toEqual(['express']);
  });

  it('does NOT group same-name elements with different arity', () => {
    const els: CloneElement[] = [
      { name: 'f', type: 'function', file: 'a.ts', line: 1, parameters: ['x'] },
      { name: 'f', type: 'function', file: 'b.ts', line: 1, parameters: ['x', 'y'] },
    ];
    const s = computeCloneSurface({ elements: els });
    expect(s.summary.total_groups).toBe(0);
  });

  it('does NOT group elements that differ in import sources', () => {
    const els: CloneElement[] = [
      { name: 'g', type: 'function', file: 'a.ts', line: 1, parameters: ['x'], imports: [{ source: 'fs' }] },
      { name: 'g', type: 'function', file: 'b.ts', line: 1, parameters: ['x'], imports: [{ source: 'path' }] },
    ];
    const s = computeCloneSurface({ elements: els });
    expect(s.summary.total_groups).toBe(0);
  });

  it('honors minGroupSize (a size-2 candidate is dropped at minGroupSize=3)', () => {
    const s = computeCloneSurface({ elements: clonePair, minGroupSize: 3 });
    expect(s.summary.total_groups).toBe(0);
  });

  it('returns no_data:true for an empty element set (never a false 0 clones)', () => {
    const s = computeCloneSurface({ elements: [] });
    expect(s.no_data).toBe(true);
    expect(s.summary.total_elements).toBe(0);
    expect(s.groups).toEqual([]);
  });

  it('is deterministic — identical inputs yield byte-identical output', () => {
    const a = JSON.stringify(computeCloneSurface({ elements: clonePair }));
    const b = JSON.stringify(computeCloneSurface({ elements: clonePair }));
    expect(a).toBe(b);
  });

  it('sorts groups by size descending', () => {
    const els: CloneElement[] = [
      // a 3-member group (kind+name+arity+no-params+no-imports -> thin but shared)
      { name: 'big', type: 'function', file: 'c.ts', line: 3, parameters: ['p'], imports: [{ source: 'x' }] },
      { name: 'big', type: 'function', file: 'a.ts', line: 1, parameters: ['p'], imports: [{ source: 'x' }] },
      { name: 'big', type: 'function', file: 'b.ts', line: 2, parameters: ['p'], imports: [{ source: 'x' }] },
      // a 2-member group
      { name: 'small', type: 'function', file: 'd.ts', line: 1, parameters: ['q'], imports: [{ source: 'y' }] },
      { name: 'small', type: 'function', file: 'e.ts', line: 1, parameters: ['q'], imports: [{ source: 'y' }] },
    ];
    const s = computeCloneSurface({ elements: els });
    expect(s.groups.map((g) => g.size)).toEqual([3, 2]);
    // members within the big group sorted by (file, line, name)
    expect(s.groups[0].members.map((m) => m.file)).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('paginates with a truncation flag', () => {
    const els: CloneElement[] = [
      { name: 'g1', type: 'function', file: 'a.ts', line: 1, parameters: ['a'], imports: [{ source: 'x' }] },
      { name: 'g1', type: 'function', file: 'b.ts', line: 1, parameters: ['a'], imports: [{ source: 'x' }] },
      { name: 'g2', type: 'function', file: 'c.ts', line: 1, parameters: ['b'], imports: [{ source: 'y' }] },
      { name: 'g2', type: 'function', file: 'd.ts', line: 1, parameters: ['b'], imports: [{ source: 'y' }] },
    ];
    const s = computeCloneSurface({ elements: els, limit: 1, offset: 0 });
    expect(s.groups).toHaveLength(1);
    expect(s.truncated).toBe(true);
    const s2 = computeCloneSurface({ elements: els, limit: 1, offset: 1 });
    expect(s2.groups).toHaveLength(1);
    expect(s2.truncated).toBe(false);
  });

  it('DISCLOSURE: counts elements with no params AND no imports as elements_without_signature', () => {
    const els: CloneElement[] = [
      { name: 'thin', type: 'variable', file: 'a.ts', line: 1 },                       // no params, no imports -> thin
      { name: 'rich', type: 'function', file: 'b.ts', line: 1, parameters: ['x'], imports: [{ source: 'x' }] },
    ];
    const s = computeCloneSurface({ elements: els });
    expect(s.summary.elements_without_signature).toBe(1);
    expect(s.summary.signature_basis).toEqual(SIGNATURE_BASIS);
    expect([...s.summary.signature_basis]).toEqual(['kind', 'name', 'arity', 'param-name-shingle', 'import-source-set']);
  });

  it('carries the schema version and exposes NO composite score/grade/verdict', () => {
    const s = computeCloneSurface({ elements: clonePair });
    expect(s.schema_version).toBe(CLONE_SCHEMA_VERSION);
    // surfaces-not-verdicts: a clone group is co-location-of-shape, not a defect.
    expect(s.summary).not.toHaveProperty('grade');
    expect(s.summary).not.toHaveProperty('score');
    expect(s.summary).not.toHaveProperty('duplication_score');
    expect(s).not.toHaveProperty('verdict');
  });

  it('carries codeRefId on group members', () => {
    const s = computeCloneSurface({ elements: clonePair });
    const ids = s.groups[0].members.map((m) => m.codeRefId).sort();
    expect(ids).toEqual(['@Fn/a.ts#handler:10', '@Fn/b.ts#handler:5']);
  });

  it('tolerates the {name} param-object union and string import fallback', () => {
    const els: CloneElement[] = [
      { name: 'u', type: 'function', file: 'a.ts', line: 1, parameters: [{ name: 'x' }, { name: 'y' }], imports: ['lodash'] },
      { name: 'u', type: 'function', file: 'b.ts', line: 1, parameters: ['x', 'y'], imports: [{ source: 'lodash' }] },
    ];
    // param-object [{name:'x'},{name:'y'}] normalizes to ['x','y']; string import 'lodash' === {source:'lodash'}
    const s = computeCloneSurface({ elements: els });
    expect(s.summary.total_groups).toBe(1);
    expect(s.groups[0].size).toBe(2);
  });
});
