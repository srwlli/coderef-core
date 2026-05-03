import { describe, expect, it } from 'vitest';
import { resolveCalls, buildSymbolTable, resolveCallsAgainstTable } from '../../src/pipeline/call-resolver.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

function makeState(): PipelineState {
  const graph: ExportedGraph = {
    nodes: [],
    edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {} },
  };
  return {
    projectPath: '/tmp/order',
    files: new Map([['ts', ['/tmp/order/src/a.ts', '/tmp/order/src/b.ts']]]),
    elements: [
      {
        type: 'function', name: 'fnA', file: '/tmp/order/src/a.ts', line: 1,
        codeRefId: '@Fn/src/a.ts#fnA:1',
      },
      {
        type: 'function', name: 'fnB', file: '/tmp/order/src/b.ts', line: 1,
        codeRefId: '@Fn/src/b.ts#fnB:1',
      },
    ],
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [
      {
        sourceElementCandidate: null,
        sourceFile: '/tmp/order/src/a.ts',
        callExpressionText: 'fnB()',
        calleeName: 'fnB',
        receiverText: null,
        scopePath: [],
        line: 3,
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
    sources: new Map([
      ['/tmp/order/src/a.ts', 'export function fnA() { return fnB(); }\n'],
      ['/tmp/order/src/b.ts', 'export function fnB() { return 1; }\n'],
    ]),
    options: {},
    metadata: { startTime: 0, filesScanned: 2, elementsExtracted: 2, relationshipsExtracted: 0 },
  };
}

describe('Phase 4 call-resolution two-pass ordering (AC-09 INVARIANT)', () => {
  it('after buildSymbolTable returns, the SymbolTable instance receives ZERO writes during resolveCallsAgainstTable', () => {
    const state = makeState();
    const table = buildSymbolTable(state);

    // Wrap THIS specific Map instance's set so writes during pass 2 are
    // detected. Reads (.get) are unrestricted — pass 2 reads the table
    // by design. Pass 2 must NOT write (would mean pass 1 didn't fully
    // build the table before pass 2 began consuming it).
    let writesDuringPassTwo = 0;
    const realSet = table.set.bind(table);
    table.set = ((key, value) => {
      writesDuringPassTwo++;
      return realSet(key, value);
    }) as typeof table.set;

    resolveCallsAgainstTable(state, table);

    expect(writesDuringPassTwo).toBe(0);
  });

  it('resolveCalls completes without interleaving (smoke check)', () => {
    const state = makeState();
    expect(() => resolveCalls(state)).not.toThrow();
  });
});
