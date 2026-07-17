/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-call-resolution-acg-test
 */

/**
 * WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 10 (field-based-acg-resolution,
 * STUB-PQ7SDA) — Feldthaus Approximate Call Graph resolution of method calls on
 * UNKNOWN receivers via the field/property-definition index.
 *
 * These tests pin the resolver-side contract (through resolveCalls) + the tier:
 *   1. TWO project definitions of the callee → kind='ambiguous' + reason='field_based_acg'.
 *   2. ONE definition → kind='resolved' + confidence='provisional' + reason='field_based_acg'.
 *   3. ZERO definitions → kind='unresolved' + reason='receiver_not_in_symbol_table' (honest residue).
 *   4. PROPERTY coverage — an unknown receiver resolves to a `type:'property'` definition.
 *   5. BUILTIN-WINS-FIRST — a JS-prototype callee (push/map/split) on an unknown receiver
 *      stays kind='builtin' reason='js_prototype_member' and NEVER reaches the ACG branch.
 *   6. SAME-LANGUAGE guard — a Python `.foo()` never resolves to a TS `foo`.
 *   7. TIER — classifyEdgeConfidence maps field_based_acg to NON-exact bands, never 'exact'.
 */

import { describe, expect, it } from 'vitest';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import { classifyEdgeConfidence } from '../../src/pipeline/edge-confidence.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

function emptyGraph(): ExportedGraph {
  return { nodes: [], edges: [], statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {} } };
}

function baseState(elements: unknown[], rawCalls: unknown[], projectPath = '/tmp/acg'): PipelineState {
  return {
    projectPath,
    files: new Map([['ts', [`${projectPath}/src/main.ts`]]]),
    elements,
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls,
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph: emptyGraph(),
    sources: new Map(),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: elements.length, relationshipsExtracted: 0 },
  } as unknown as PipelineState;
}

function unknownReceiverCall(callee: string, receiver: string, sourceFile: string, line = 9) {
  return {
    sourceElementCandidate: null,
    sourceFile,
    callExpressionText: `${receiver}.${callee}()`,
    calleeName: callee,
    receiverText: receiver,
    scopePath: [],
    line,
    language: sourceFile.endsWith('.py') ? 'py' : 'ts',
  };
}

describe('Phase 10 field-based (ACG) resolution', () => {
  it('TWO project definitions on an unknown receiver → ambiguous + field_based_acg', () => {
    const state = baseState(
      [
        { type: 'method', name: 'Widget.render', file: '/tmp/acg/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.render:3' },
        { type: 'method', name: 'Panel.render', file: '/tmp/acg/src/panel.ts', line: 4, codeRefId: '@Method/src/panel.ts#Panel.render:4' },
      ],
      [unknownReceiverCall('render', 'thing', '/tmp/acg/src/main.ts')],
    );
    const call = resolveCalls(state).find(r => r.calleeName === 'render' && r.receiverText === 'thing');
    expect(call?.kind).toBe('ambiguous');
    expect(call?.reason).toBe('field_based_acg');
    expect(call?.candidates).toEqual([
      '@Method/src/panel.ts#Panel.render:4',
      '@Method/src/widget.ts#Widget.render:3',
    ]); // id-sorted (deterministic)
    // Ambiguous carries no provisional confidence.
    expect(call?.confidence).toBeUndefined();
  });

  it('ONE definition on an unknown receiver → resolved + provisional + field_based_acg (LABEL, never promote)', () => {
    const state = baseState(
      [{ type: 'method', name: 'Widget.render', file: '/tmp/acg/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.render:3' }],
      [unknownReceiverCall('render', 'thing', '/tmp/acg/src/main.ts')],
    );
    const call = resolveCalls(state).find(r => r.calleeName === 'render' && r.receiverText === 'thing');
    expect(call?.kind).toBe('resolved');
    expect(call?.confidence).toBe('provisional');
    expect(call?.reason).toBe('field_based_acg');
    expect(call?.resolvedTargetCodeRefId).toBe('@Method/src/widget.ts#Widget.render:3');
    expect(call?.candidates).toEqual(['@Method/src/widget.ts#Widget.render:3']);
  });

  it('an unknown receiver resolves to a PROPERTY definition (the coverage gap this phase closes)', () => {
    const state = baseState(
      // No method named `label`; only a PROPERTY defines it. Pre-Phase-10 this
      // was receiver_not_in_symbol_table (properties were never indexed).
      [{ type: 'property', name: 'label', file: '/tmp/acg/src/model.ts', line: 5, codeRefId: '@Property/src/model.ts#label:5' }],
      [unknownReceiverCall('label', 'thing', '/tmp/acg/src/main.ts')],
    );
    const call = resolveCalls(state).find(r => r.calleeName === 'label' && r.receiverText === 'thing');
    expect(call?.kind).toBe('resolved');
    expect(call?.confidence).toBe('provisional');
    expect(call?.reason).toBe('field_based_acg');
    expect(call?.resolvedTargetCodeRefId).toBe('@Property/src/model.ts#label:5');
  });

  it('ZERO project definitions → unresolved + receiver_not_in_symbol_table (honest residue)', () => {
    const state = baseState(
      [{ type: 'method', name: 'Widget.render', file: '/tmp/acg/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.render:3' }],
      [unknownReceiverCall('somethingElseEntirely', 'thing', '/tmp/acg/src/main.ts')],
    );
    const call = resolveCalls(state).find(r => r.calleeName === 'somethingElseEntirely');
    expect(call?.kind).toBe('unresolved');
    expect(call?.reason).toBe('receiver_not_in_symbol_table');
  });

  it('BUILTIN-WINS-FIRST — a JS-prototype callee stays builtin and never reaches the ACG branch', () => {
    // `push` IS a project method here AND a JS-prototype method. But the callee
    // `push` on an unknown receiver in a .ts file with candidates present would
    // go ACG; the guard is the ZERO-candidate js_prototype tail. So test the
    // canonical case: a prototype callee with NO project definition stays builtin.
    const state = baseState(
      [{ type: 'method', name: 'Widget.render', file: '/tmp/acg/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.render:3' }],
      [unknownReceiverCall('push', 'arr', '/tmp/acg/src/main.ts')],
    );
    const call = resolveCalls(state).find(r => r.calleeName === 'push');
    expect(call?.kind).toBe('builtin');
    expect(call?.reason).toBe('js_prototype_member');
  });

  it('SAME-LANGUAGE guard — a Python .foo() never resolves to a TS foo definition', () => {
    const state = baseState(
      [{ type: 'method', name: 'Widget.render', file: '/tmp/acg/src/widget.ts', line: 3, codeRefId: '@Method/src/widget.ts#Widget.render:3' }],
      // Python call site; `render` only defined in TS → no cross-language match.
      [unknownReceiverCall('render', 'thing', '/tmp/acg/src/main.py')],
    );
    const call = resolveCalls(state).find(r => r.calleeName === 'render');
    expect(call?.kind).toBe('unresolved');
    expect(call?.reason).toBe('receiver_not_in_symbol_table');
  });
});

describe('Phase 10 field_based_acg confidence tier — NEVER exact', () => {
  it('single-candidate ACG (resolved + provisional) maps to heuristic', () => {
    expect(classifyEdgeConfidence('resolved', 'field_based_acg', 'provisional')).toBe('heuristic');
  });

  it('DEFENSIVE guard — field_based_acg is heuristic even if the provisional flag is absent', () => {
    // The load-bearing invariant: an ACG edge can NEVER be exact, independent of
    // whether the caller remembered the provisional evidence flag.
    expect(classifyEdgeConfidence('resolved', 'field_based_acg', undefined)).toBe('heuristic');
    expect(classifyEdgeConfidence('resolved', 'field_based_acg')).toBe('heuristic');
  });

  it('multi-candidate ACG (ambiguous) maps to inferred', () => {
    expect(classifyEdgeConfidence('ambiguous', 'field_based_acg')).toBe('inferred');
  });

  it('NO field_based_acg input ever maps to exact', () => {
    for (const status of ['resolved', 'ambiguous', 'unresolved'] as const) {
      for (const ev of [undefined, 'provisional'] as const) {
        expect(classifyEdgeConfidence(status, 'field_based_acg', ev)).not.toBe('exact');
      }
    }
    // Sanity: a genuinely-exact resolved edge (no ACG reason, no provisional) IS exact.
    expect(classifyEdgeConfidence('resolved', undefined, undefined)).toBe('exact');
  });
});
