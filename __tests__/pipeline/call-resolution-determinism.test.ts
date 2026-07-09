/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-call-resolution-determinism-test
 */

import { describe, expect, it } from 'vitest';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

function makeState(): PipelineState {
  const graph: ExportedGraph = {
    nodes: [],
    edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {} },
  };
  return {
    projectPath: '/tmp/det',
    files: new Map([['ts', ['/tmp/det/src/main.ts']]]),
    elements: [
      {
        type: 'function', name: 'helperFn', file: '/tmp/det/src/main.ts', line: 1,
        codeRefId: '@Fn/src/main.ts#helperFn:1',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/det/src/main.ts',
        callExpressionText: 'helperFn()',
        calleeName: 'helperFn',
        receiverText: null,
        scopePath: [],
        line: 5,
        language: 'ts',
      },
    ],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph,
    sources: new Map([['/tmp/det/src/main.ts', 'export function helperFn() { return 1; }\nexport function run() {\n  helperFn();\n}\n']]),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 1, relationshipsExtracted: 0 },
  };
}

// STUB-1XDRTR / REC-001 (discovery gap): the Phase 1 DoD named BOTH
// call-resolution-ambiguous AND call-resolution-determinism as the tests to
// extend. The ambiguous test carries the unit-level de-dup regression; this
// fixture carries the DETERMINISM half — a state whose elements[] holds the
// same method element twice (the live duplicate-registration precondition),
// producing an ambiguous member call whose candidates[] would, pre-fix, list
// the identical codeRefId twice. It asserts (a) the candidate array is
// already de-duped and (b) that de-duped shape is STABLE across 100 runs.
// A regression that reintroduced order-dependent dup emission would pass the
// single-candidate idempotency test above but FAIL this one.
function makeDuplicateRegistrationState(): PipelineState {
  const graph: ExportedGraph = {
    nodes: [],
    edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {} },
  };
  const renderA = {
    type: 'method' as const,
    name: 'Widget.render',
    file: '/tmp/det/src/widget.ts',
    line: 3,
    codeRefId: '@Method/src/widget.ts#Widget.render:3',
  };
  const renderB = {
    type: 'method' as const,
    name: 'Panel.render',
    file: '/tmp/det/src/panel.ts',
    line: 7,
    codeRefId: '@Method/src/panel.ts#Panel.render:7',
  };
  return {
    projectPath: '/tmp/det',
    files: new Map([['ts', ['/tmp/det/src/widget.ts', '/tmp/det/src/panel.ts']]]),
    // renderA is present TWICE — the duplicate-registration precondition that
    // pre-fix bloated the bare-name 'render' entry list, and thus any
    // ambiguous candidates[] built from it.
    elements: [renderA, { ...renderA }, renderB],
    imports: [],
    calls: [],
    rawImports: [],
    // Unknown receiver, bare method name 'render' → ambiguous over the two
    // distinct owners (Widget.render, Panel.render), candidates[] populated.
    rawCalls: [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/det/src/main.ts',
        callExpressionText: 'thing.render()',
        calleeName: 'render',
        receiverText: 'thing',
        scopePath: [],
        line: 9,
        language: 'ts',
      },
    ],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph,
    sources: new Map(),
    options: {},
    metadata: { startTime: 0, filesScanned: 2, elementsExtracted: 3, relationshipsExtracted: 0 },
  } as unknown as PipelineState;
}

describe('Phase 4 call-resolution determinism (AC-08 INVARIANT)', () => {
  it('100 invocations on identical state produce deepStrictEqual outputs (idempotency)', () => {
    const state = makeState();
    const first = resolveCalls(state);
    for (let i = 0; i < 100; i++) {
      expect(resolveCalls(state)).toStrictEqual(first);
    }
  });

  it('does not mutate state.rawCalls / state.importResolutions / state.elements (purity)', () => {
    const state = makeState();
    Object.freeze(state.rawCalls);
    Object.freeze(state.importResolutions);
    Object.freeze(state.elements);
    expect(() => resolveCalls(state)).not.toThrow();
  });

  it('emits at least one resolution for the rawCall fixture', () => {
    const state = makeState();
    const out = resolveCalls(state);
    expect(out.length).toBe(state.rawCalls.length);
    expect(out[0].calleeName).toBe('helperFn');
  });

  // REC-001: de-dup invariant is deterministic — a duplicated element yields a
  // de-duped, stable candidate array across repeated runs (STUB-1XDRTR).
  it('duplicate-registration ambiguous candidates are de-duped AND stable across 100 runs', () => {
    const state = makeDuplicateRegistrationState();
    const first = resolveCalls(state);
    const call = first.find(r => r.calleeName === 'render' && r.receiverText === 'thing');
    expect(call).toBeDefined();
    expect(call?.kind).toBe('ambiguous');
    expect(call?.candidates).toBeDefined();
    // Pre-fix, renderA's duplicate registration would list its id twice here.
    expect(call?.candidates).toEqual([...new Set(call?.candidates)]);
    // Both distinct owners survive the de-dup (dedup removes duplicates, not
    // genuinely-distinct candidates).
    expect(call?.candidates).toEqual(
      expect.arrayContaining([
        '@Method/src/widget.ts#Widget.render:3',
        '@Method/src/panel.ts#Panel.render:7',
      ]),
    );
    // Determinism: the de-duped candidate array is byte-identical across runs.
    for (let i = 0; i < 100; i++) {
      expect(resolveCalls(state)).toStrictEqual(first);
    }
  });
});
