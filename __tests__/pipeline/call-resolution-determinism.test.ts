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
});
