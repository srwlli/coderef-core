/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-call-resolution-provisional-tier-test
 */

/**
 * STUB-6CWWHQ (WO-RESOLVER-SYMBOL-TABLE-DEDUP-FIX-001 Phase 2) —
 * confidence-tiered resolution.
 *
 * The single_candidate_unknown_receiver case (an unknown receiver whose method
 * name has EXACTLY one candidate in the same language family) was previously
 * parked kind='ambiguous' by guardrail-4. Phase 2 resolves it to that one
 * candidate but LABELS it confidence='provisional' — guardrail-4 preserved
 * (a MULTI-candidate unknown receiver still stays ambiguous), the lone
 * candidate kept for audit.
 *
 * These tests pin the flip and its guardrail boundary:
 *   1. one candidate  → resolved + provisional + candidates.length===1
 *   2. two candidates → STILL ambiguous (guardrail-4 not weakened)
 */

import { describe, expect, it } from 'vitest';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

function emptyGraph(): ExportedGraph {
  return { nodes: [], edges: [], statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {} } };
}

function baseState(elements: unknown[], rawCalls: unknown[]): PipelineState {
  return {
    projectPath: '/tmp/prov',
    files: new Map([['ts', ['/tmp/prov/src/main.ts']]]),
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

// An unknown receiver (`thing`) calling a method (`render`) that exists as a
// method on EXACTLY ONE class in the project.
function singleCandidateState(): PipelineState {
  return baseState(
    [
      {
        type: 'method', name: 'Widget.render',
        file: '/tmp/prov/src/widget.ts', line: 3,
        codeRefId: '@Method/src/widget.ts#Widget.render:3',
      },
    ],
    [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/prov/src/main.ts',
        callExpressionText: 'thing.render()',
        calleeName: 'render',
        receiverText: 'thing',
        scopePath: [],
        line: 9,
        language: 'ts',
      },
    ],
  );
}

// The SAME method name owned by TWO distinct classes — an unknown receiver
// cannot be disambiguated, so guardrail-4 keeps this ambiguous.
function twoCandidateState(): PipelineState {
  return baseState(
    [
      {
        type: 'method', name: 'Widget.render',
        file: '/tmp/prov/src/widget.ts', line: 3,
        codeRefId: '@Method/src/widget.ts#Widget.render:3',
      },
      {
        type: 'method', name: 'Panel.render',
        file: '/tmp/prov/src/panel.ts', line: 7,
        codeRefId: '@Method/src/panel.ts#Panel.render:7',
      },
    ],
    [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/prov/src/main.ts',
        callExpressionText: 'thing.render()',
        calleeName: 'render',
        receiverText: 'thing',
        scopePath: [],
        line: 9,
        language: 'ts',
      },
    ],
  );
}

describe('Phase 4 confidence-tiered resolution (STUB-6CWWHQ)', () => {
  it('single candidate on an unknown receiver resolves as provisional (keeps candidate for audit)', () => {
    const out = resolveCalls(singleCandidateState());
    const call = out.find(r => r.calleeName === 'render' && r.receiverText === 'thing');
    expect(call).toBeDefined();
    // Pre-fix: kind==='ambiguous'. Phase 2 flips this exact case.
    expect(call?.kind).toBe('resolved');
    expect(call?.confidence).toBe('provisional');
    expect(call?.resolvedTargetCodeRefId).toBe('@Method/src/widget.ts#Widget.render:3');
    // The lone candidate is retained for audit — exactly one, no dup.
    expect(call?.candidates).toEqual(['@Method/src/widget.ts#Widget.render:3']);
    expect(call?.reason).toBe('single_candidate_unknown_receiver');
  });

  it('two candidates on an unknown receiver STAY ambiguous (guardrail-4 preserved)', () => {
    const out = resolveCalls(twoCandidateState());
    const call = out.find(r => r.calleeName === 'render' && r.receiverText === 'thing');
    expect(call).toBeDefined();
    // Multi-candidate unknown receiver must NOT be resolved or labeled provisional.
    expect(call?.kind).toBe('ambiguous');
    expect(call?.confidence).toBeUndefined();
    expect(call?.resolvedTargetCodeRefId).toBeUndefined();
    expect(call?.candidates?.length).toBe(2);
  });
});
