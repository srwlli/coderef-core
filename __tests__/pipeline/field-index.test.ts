/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-field-index-acg-test
 */

/**
 * WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 10 (field-based-acg-resolution,
 * STUB-PQ7SDA) — the PURE field/property-definition index that powers ACG
 * resolution of unknown-receiver method calls.
 *
 * These tests pin the index contract in isolation from the resolver:
 *   1. PURE determinism — same elements → byte-identical Map, candidates
 *      id-sorted, independent of element iteration order.
 *   2. PROPERTY coverage — a `type:'property'` element is indexed and looked up
 *      (the gap buildSymbolTable's method-only lookup never had).
 *   3. Method coverage — a `ClassName.method` element is indexed by its BARE
 *      method name.
 *   4. SAME-LANGUAGE guard — lookupField never crosses language families
 *      (a Python `.foo()` never resolves to a TS `foo`, STUB-M3GE4S).
 *   5. Absence = no-data — a name with zero definitions returns [], never a
 *      fabricated candidate.
 *   6. De-dup — the identical element offered twice is not double-counted.
 */

import { describe, expect, it } from 'vitest';
import { buildFieldIndex, lookupField, type FieldDef } from '../../src/pipeline/field-index.js';
import type { ElementData } from '../../src/types/types.js';

function elem(partial: Partial<ElementData> & { type: ElementData['type']; name: string; file: string }): ElementData {
  return { line: 1, ...partial } as ElementData;
}

const PROJECT = '/tmp/fi';

describe('Phase 10 field-index — buildFieldIndex / lookupField (ACG substrate)', () => {
  it('indexes both method AND property elements by bare property name', () => {
    const elements: ElementData[] = [
      elem({ type: 'method', name: 'Widget.render', file: '/tmp/fi/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.render:3' }),
      elem({ type: 'property', name: 'label', file: '/tmp/fi/src/model.ts', line: 5, codeRefId: '@Property/src/model.ts#label:5' }),
    ];
    const index = buildFieldIndex(elements, PROJECT);

    // Method indexed by its BARE name (qualifier stripped).
    const render = index.get('render');
    expect(render).toBeDefined();
    expect(render).toHaveLength(1);
    expect(render![0]).toMatchObject<Partial<FieldDef>>({
      propName: 'render',
      definingType: 'method',
      codeRefId: '@Method/src/widget.ts#Widget.render:3',
      language: 'js-ts',
    });

    // PROPERTY coverage — the gap this phase closes. A property IS indexed.
    const label = index.get('label');
    expect(label).toBeDefined();
    expect(label).toHaveLength(1);
    expect(label![0]).toMatchObject<Partial<FieldDef>>({
      propName: 'label',
      definingType: 'property',
      language: 'js-ts',
    });
  });

  it('is PURE + deterministic — candidate order is codeRefId-sorted, iteration-order-independent', () => {
    const a = elem({ type: 'method', name: 'A.run', file: '/tmp/fi/src/a.ts', line: 1, codeRefId: '@Method/src/a.ts#A.run:1' });
    const b = elem({ type: 'property', name: 'run', file: '/tmp/fi/src/b.ts', line: 2, codeRefId: '@Property/src/b.ts#run:2' });
    const c = elem({ type: 'method', name: 'C.run', file: '/tmp/fi/src/c.ts', line: 3, codeRefId: '@Method/src/c.ts#C.run:3' });

    const forward = buildFieldIndex([a, b, c], PROJECT).get('run')!.map(d => d.codeRefId);
    const shuffled = buildFieldIndex([c, a, b], PROJECT).get('run')!.map(d => d.codeRefId);

    // Byte-identical candidate ordering regardless of input order.
    expect(forward).toEqual(shuffled);
    // And it is the codeRefId-sorted order.
    expect(forward).toEqual([...forward].sort());
  });

  it('lookupField enforces the SAME-LANGUAGE guard (no cross-language resolution)', () => {
    const elements: ElementData[] = [
      elem({ type: 'method', name: 'Widget.get', file: '/tmp/fi/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.get:3' }),
      elem({ type: 'method', name: 'Model.get', file: '/tmp/fi/src/model.py', line: 4, codeRefId: '@Method/src/model.py#Model.get:4' }),
    ];
    const index = buildFieldIndex(elements, PROJECT);

    // A TS call site only sees the TS definition.
    const fromTs = lookupField(index, 'get', '/tmp/fi/src/main.ts');
    expect(fromTs.map(d => d.codeRefId)).toEqual(['@Method/src/widget.ts#Widget.get:3']);

    // A Python call site only sees the Python definition.
    const fromPy = lookupField(index, 'get', '/tmp/fi/src/main.py');
    expect(fromPy.map(d => d.codeRefId)).toEqual(['@Method/src/model.py#Model.get:4']);
  });

  it('returns an EMPTY set for a name with no same-language definition (absence = no-data)', () => {
    const index = buildFieldIndex(
      [elem({ type: 'method', name: 'Widget.render', file: '/tmp/fi/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.render:3' })],
      PROJECT,
    );
    // Unknown name.
    expect(lookupField(index, 'nonexistent', '/tmp/fi/src/main.ts')).toEqual([]);
    // Known name, wrong language family.
    expect(lookupField(index, 'render', '/tmp/fi/src/main.py')).toEqual([]);
  });

  it('de-dups the identical element offered twice', () => {
    const dup = elem({ type: 'method', name: 'Widget.render', file: '/tmp/fi/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.render:3' });
    const index = buildFieldIndex([dup, { ...dup }], PROJECT);
    expect(index.get('render')).toHaveLength(1);
  });

  it('ignores non-method/non-property elements (functions, classes, constants)', () => {
    const index = buildFieldIndex(
      [
        elem({ type: 'function', name: 'helper', file: '/tmp/fi/src/u.ts', line: 1, codeRefId: '@Fn/src/u.ts#helper:1' }),
        elem({ type: 'class', name: 'Widget', file: '/tmp/fi/src/u.ts', line: 2, codeRefId: '@Class/src/u.ts#Widget:2' }),
        elem({ type: 'constant', name: 'MAX', file: '/tmp/fi/src/u.ts', line: 3, codeRefId: '@Const/src/u.ts#MAX:3' }),
      ],
      PROJECT,
    );
    expect(index.size).toBe(0);
  });
});
