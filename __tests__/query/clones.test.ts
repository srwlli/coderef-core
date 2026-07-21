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

  it('defaults to the structural pass (back-compat: pass omitted === P10 behavior)', () => {
    const s = computeCloneSurface({ elements: clonePair });
    expect(s.pass).toBe('structural');
    expect(s.lexical_groups).toBeUndefined();
    expect(s.near_miss_pairs).toBeUndefined();
  });
});

// ---- lexical pass (clone-surface WO P1: identical persisted body hashes) --------

const HASH_A = 'a'.repeat(32);
const HASH_B = 'b'.repeat(32);

// Same body, DIFFERENT names + files — the case the structural signature cannot see.
const lexicalPair: CloneElement[] = [
  { name: 'copyOne', type: 'function', file: 'src/a.ts', line: 1, endLine: 8, codeRefId: '@Fn/a.ts#copyOne:1', normalizedBodyHash: HASH_A, normalizedBodyLength: 120 },
  { name: 'copyTwo', type: 'function', file: 'src/b.ts', line: 10, endLine: 17, codeRefId: '@Fn/b.ts#copyTwo:10', normalizedBodyHash: HASH_A, normalizedBodyLength: 120 },
];

describe('computeCloneSurface — lexical pass', () => {
  it('groups elements with an IDENTICAL body hash across files, regardless of name', () => {
    const s = computeCloneSurface({ elements: lexicalPair, pass: 'lexical' });
    expect(s.pass).toBe('lexical');
    expect(s.no_data).toBe(false);
    expect(s.summary.total_groups).toBe(1);
    expect(s.lexical_groups).toHaveLength(1);
    expect(s.lexical_groups![0].bodyHash).toBe(HASH_A);
    expect(s.lexical_groups![0].normalizedLength).toBe(120);
    expect(s.lexical_groups![0].size).toBe(2);
    expect(s.lexical_groups![0].members.map((m) => m.name)).toEqual(['copyOne', 'copyTwo']);
    expect(s.lexical_groups![0].members.map((m) => m.endLine)).toEqual([8, 17]);
    expect(s.groups).toEqual([]); // structural slot empty for body passes
  });

  it('does NOT group different body hashes', () => {
    const els: CloneElement[] = [
      { name: 'x', type: 'function', file: 'a.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 50 },
      { name: 'y', type: 'function', file: 'b.ts', line: 1, normalizedBodyHash: HASH_B, normalizedBodyLength: 50 },
    ];
    const s = computeCloneSurface({ elements: els, pass: 'lexical' });
    expect(s.summary.total_groups).toBe(0);
  });

  it('DISCLOSURE: counts elements lacking a body hash and excludes them from grouping', () => {
    const els: CloneElement[] = [
      ...lexicalPair,
      { name: 'legacy', type: 'function', file: 'c.ts', line: 1 }, // old-index element, no substrate
    ];
    const s = computeCloneSurface({ elements: els, pass: 'lexical' });
    expect(s.summary.elements_with_body_data).toBe(2);
    expect(s.summary.elements_without_body_data).toBe(1);
    expect(s.summary.total_groups).toBe(1);
  });

  it('no_data:true when NO element carries body data (old index — never a fake 0 clones)', () => {
    const els: CloneElement[] = [
      { name: 'legacy1', type: 'function', file: 'a.ts', line: 1 },
      { name: 'legacy2', type: 'function', file: 'b.ts', line: 1 },
    ];
    const s = computeCloneSurface({ elements: els, pass: 'lexical' });
    expect(s.no_data).toBe(true);
    expect(s.summary.elements_with_body_data).toBe(0);
    expect(s.summary.elements_without_body_data).toBe(2);
    expect(s.lexical_groups).toEqual([]);
  });

  it('minBodyLength gates tiny bodies and DISCLOSES the excluded count', () => {
    const s = computeCloneSurface({ elements: lexicalPair, pass: 'lexical', minBodyLength: 200 });
    expect(s.summary.total_groups).toBe(0);
    expect(s.summary.elements_below_min_body_length).toBe(2);
    expect(s.no_data).toBe(false); // body data EXISTS; the gate is disclosed, not silent
  });

  it('paginates lexical groups with a truncation flag, sorted size desc then hash asc', () => {
    const els: CloneElement[] = [
      { name: 'a1', type: 'function', file: 'a.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 10 },
      { name: 'a2', type: 'function', file: 'b.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 10 },
      { name: 'a3', type: 'function', file: 'c.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 10 },
      { name: 'b1', type: 'function', file: 'd.ts', line: 1, normalizedBodyHash: HASH_B, normalizedBodyLength: 10 },
      { name: 'b2', type: 'function', file: 'e.ts', line: 1, normalizedBodyHash: HASH_B, normalizedBodyLength: 10 },
    ];
    const s = computeCloneSurface({ elements: els, pass: 'lexical', limit: 1 });
    expect(s.lexical_groups).toHaveLength(1);
    expect(s.lexical_groups![0].size).toBe(3);
    expect(s.truncated).toBe(true);
  });

  it('is deterministic — identical inputs yield byte-identical output', () => {
    const a = JSON.stringify(computeCloneSurface({ elements: lexicalPair, pass: 'lexical' }));
    const b = JSON.stringify(computeCloneSurface({ elements: lexicalPair, pass: 'lexical' }));
    expect(a).toBe(b);
  });
});

// ---- near-miss pass (clone-surface WO P1: similar persisted AST fingerprints) ---

const FP_A = { if_statement: 4, call_expression: 10, identifier: 30, return_statement: 2 }; // total 46
const FP_B = { if_statement: 4, call_expression: 9, identifier: 31, return_statement: 2 };  // total 46; L1 diff 2 -> sim ~0.9783
const FP_C = { for_statement: 8, call_expression: 2, identifier: 10 };                      // dissimilar

const nearMissSet: CloneElement[] = [
  { name: 'first', type: 'function', file: 'src/a.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 100, astFingerprint: FP_A },
  { name: 'second', type: 'function', file: 'src/b.ts', line: 1, normalizedBodyHash: HASH_B, normalizedBodyLength: 102, astFingerprint: FP_B },
  { name: 'third', type: 'function', file: 'src/c.ts', line: 1, normalizedBodyHash: 'c'.repeat(32), normalizedBodyLength: 40, astFingerprint: FP_C },
];

describe('computeCloneSurface — near_miss pass', () => {
  it('pairs similar fingerprints above the default 0.9 threshold; dissimilar stay out', () => {
    const s = computeCloneSurface({ elements: nearMissSet, pass: 'near_miss' });
    expect(s.pass).toBe('near_miss');
    expect(s.no_data).toBe(false);
    expect(s.near_miss_pairs).toHaveLength(1);
    const pair = s.near_miss_pairs![0];
    expect([pair.a.name, pair.b.name].sort()).toEqual(['first', 'second']);
    expect(pair.similarity).toBeCloseTo(1 - 2 / 92, 4);
    expect(s.summary.similarity_threshold).toBe(0.9);
  });

  it('a higher threshold excludes the pair (and is echoed clamped)', () => {
    const s = computeCloneSurface({ elements: nearMissSet, pass: 'near_miss', similarityThreshold: 0.99 });
    expect(s.near_miss_pairs).toHaveLength(0);
    expect(s.summary.similarity_threshold).toBe(0.99);
    const clamped = computeCloneSurface({ elements: nearMissSet, pass: 'near_miss', similarityThreshold: 7 });
    expect(clamped.summary.similarity_threshold).toBe(1);
  });

  it('EXCLUDES pairs with IDENTICAL body hashes (exact clones are lexical territory)', () => {
    const els: CloneElement[] = [
      { name: 'dupA', type: 'function', file: 'a.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 100, astFingerprint: FP_A },
      { name: 'dupB', type: 'function', file: 'b.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 100, astFingerprint: FP_A },
    ];
    const s = computeCloneSurface({ elements: els, pass: 'near_miss', similarityThreshold: 0.5 });
    expect(s.near_miss_pairs).toHaveLength(0);
  });

  it('does NOT compare across kinds or extension families', () => {
    const crossKind: CloneElement[] = [
      { name: 'f', type: 'function', file: 'a.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 100, astFingerprint: FP_A },
      { name: 'm', type: 'method', file: 'b.ts', line: 1, normalizedBodyHash: HASH_B, normalizedBodyLength: 100, astFingerprint: FP_A },
    ];
    expect(computeCloneSurface({ elements: crossKind, pass: 'near_miss' }).near_miss_pairs).toHaveLength(0);

    const crossFamily: CloneElement[] = [
      { name: 'f', type: 'function', file: 'a.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 100, astFingerprint: FP_A },
      { name: 'g', type: 'function', file: 'b.py', line: 1, normalizedBodyHash: HASH_B, normalizedBodyLength: 100, astFingerprint: FP_A },
    ];
    expect(computeCloneSurface({ elements: crossFamily, pass: 'near_miss' }).near_miss_pairs).toHaveLength(0);

    // ts vs js ARE one family
    const sameFamily: CloneElement[] = [
      { name: 'f', type: 'function', file: 'a.ts', line: 1, normalizedBodyHash: HASH_A, normalizedBodyLength: 100, astFingerprint: FP_A },
      { name: 'g', type: 'function', file: 'b.js', line: 1, normalizedBodyHash: HASH_B, normalizedBodyLength: 100, astFingerprint: FP_A },
    ];
    expect(computeCloneSurface({ elements: sameFamily, pass: 'near_miss', similarityThreshold: 0.99 }).near_miss_pairs).toHaveLength(1);
  });

  it('DISCLOSURE: counts elements without a fingerprint; all-missing -> no_data', () => {
    const mixed: CloneElement[] = [
      ...nearMissSet,
      { name: 'iface', type: 'interface', file: 'd.ts', line: 1, normalizedBodyHash: 'd'.repeat(32), normalizedBodyLength: 30 }, // no fingerprint (kind gate)
    ];
    const s = computeCloneSurface({ elements: mixed, pass: 'near_miss' });
    expect(s.summary.elements_with_body_data).toBe(3);
    expect(s.summary.elements_without_body_data).toBe(1);

    const none: CloneElement[] = [
      { name: 'legacy', type: 'function', file: 'a.ts', line: 1 },
    ];
    const empty = computeCloneSurface({ elements: none, pass: 'near_miss' });
    expect(empty.no_data).toBe(true);
    expect(empty.near_miss_pairs).toEqual([]);
  });

  it('carries NO composite score/grade/verdict (similarity is measured provenance)', () => {
    const s = computeCloneSurface({ elements: nearMissSet, pass: 'near_miss' });
    expect(s.summary).not.toHaveProperty('grade');
    expect(s.summary).not.toHaveProperty('score');
    expect(s).not.toHaveProperty('verdict');
  });

  it('is deterministic — identical inputs yield byte-identical output', () => {
    const a = JSON.stringify(computeCloneSurface({ elements: nearMissSet, pass: 'near_miss' }));
    const b = JSON.stringify(computeCloneSurface({ elements: nearMissSet, pass: 'near_miss' }));
    expect(a).toBe(b);
  });
});
