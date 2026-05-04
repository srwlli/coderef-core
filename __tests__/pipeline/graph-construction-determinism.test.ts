import { describe, expect, it } from 'vitest';
import { constructGraph } from '../../src/pipeline/graph-builder.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

function makeState(): PipelineState {
  const graph: ExportedGraph = {
    version: '1.0.0',
    exportedAt: 0,
    nodes: [],
    edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
  };
  return {
    projectPath: '/tmp/det',
    files: new Map([['ts', ['/tmp/det/src/main.ts']]]),
    elements: [
      {
        type: 'function', name: 'helperFn',
        file: '/tmp/det/src/main.ts', line: 1,
        codeRefId: '@Fn/src/main.ts#helperFn:1',
      },
      {
        type: 'function', name: 'run',
        file: '/tmp/det/src/main.ts', line: 5,
        codeRefId: '@Fn/src/main.ts#run:5',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [
      {
        sourceFile: '/tmp/det/src/main.ts',
        importerCodeRefId: '@Fn/src/main.ts#run:5',
        localName: 'helperFn',
        originSpecifier: './helper',
        kind: 'resolved',
        resolvedTargetCodeRefId: '@Fn/src/main.ts#helperFn:1',
        resolvedModuleFile: '/tmp/det/src/helper.ts',
      },
    ],
    callResolutions: [
      {
        sourceFile: '/tmp/det/src/main.ts',
        callerCodeRefId: '@Fn/src/main.ts#run:5',
        calleeName: 'helperFn',
        receiverText: null,
        scopePath: ['run'],
        line: 6,
        kind: 'resolved',
        resolvedTargetCodeRefId: '@Fn/src/main.ts#helperFn:1',
      },
    ],
    graph,
    sources: new Map([['/tmp/det/src/main.ts', 'function helperFn() {}\n']]),
    options: {},
    metadata: { startTime: 0, filesScanned: 1, elementsExtracted: 2, relationshipsExtracted: 0 },
  };
}

describe('Phase 5 graph-construction determinism (AC-08 INVARIANT)', () => {
  it('100 invocations on identical state produce deepStrictEqual outputs (idempotency)', () => {
    const state = makeState();
    const first = constructGraph(state);
    // exportedAt is Date.now() and varies — strip for comparison.
    const stripExportedAt = (g: ExportedGraph) => ({ ...g, exportedAt: 0 });
    const baseline = stripExportedAt(first);
    for (let i = 0; i < 100; i++) {
      const out = stripExportedAt(constructGraph(state));
      expect(out).toStrictEqual(baseline);
    }
  });

  it('does not mutate state.elements / importResolutions / callResolutions (purity)', () => {
    const state = makeState();
    Object.freeze(state.elements);
    Object.freeze(state.importResolutions);
    Object.freeze(state.callResolutions);
    expect(() => constructGraph(state)).not.toThrow();
  });

  it('deterministic edge ids — same (source, relationship, target, location) tuple yields same id', () => {
    const state = makeState();
    const first = constructGraph(state);
    const second = constructGraph(state);
    const firstIds = first.edges.map(e => e.id);
    const secondIds = second.edges.map(e => e.id);
    expect(firstIds).toStrictEqual(secondIds);
  });
});
