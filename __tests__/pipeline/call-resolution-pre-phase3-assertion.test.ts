import { describe, expect, it } from 'vitest';
import { resolveCalls } from '../../src/pipeline/call-resolver.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

function makeStateWithoutImportResolutions(): PipelineState {
  const graph: ExportedGraph = {
    nodes: [],
    edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {} },
  };
  return {
    projectPath: '/tmp/p3',
    files: new Map(),
    elements: [],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    // Deliberately set to null to test cross-phase ordering halt-and-throw.
    importResolutions: null as unknown as PipelineState['importResolutions'],
    callResolutions: [],
    graph,
    sources: new Map(),
    options: {},
    metadata: { startTime: 0, filesScanned: 0, elementsExtracted: 0, relationshipsExtracted: 0 },
  };
}

describe('Phase 4 cross-phase ordering halt-and-throw (R-PHASE-4-B INVARIANT)', () => {
  it('resolveCalls throws explicit Error when state.importResolutions is null', () => {
    const state = makeStateWithoutImportResolutions();
    expect(() => resolveCalls(state)).toThrowError(/Phase 3 must run first/);
  });

  it('resolveCalls throws explicit Error when state.importResolutions is undefined', () => {
    const state = makeStateWithoutImportResolutions();
    state.importResolutions = undefined as unknown as PipelineState['importResolutions'];
    expect(() => resolveCalls(state)).toThrowError(/Phase 3 must run first/);
  });
});
