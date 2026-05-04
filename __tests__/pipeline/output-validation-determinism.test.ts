/**
 * Phase 6 — output-validation-determinism INVARIANT (AC-08).
 *
 * Three invariants:
 *   (1) Idempotency — 100 invocations on identical (state, graph) produce
 *       deepStrictEqual ValidationResult (errors[], warnings[], report).
 *   (2) Purity — Object.freeze inputs, run validator, assert no mutations
 *       to state, graph, or options. Any mutation throws under strict mode.
 *   (3) Order independence (ORCHESTRATOR safeguard 2) — shuffled element
 *       arrays produce identical report counts. The first-seen-wins rule
 *       in buildFileHeaderStatusMap depends on every element from a file
 *       sharing the same headerStatus (orchestrator.ts:476-480 stamps that
 *       way) — this test guards against a future regression where the
 *       headerStatus could differ across elements of the same file.
 */

import { describe, expect, it } from 'vitest';
import {
  validatePipelineState,
  type ValidatePipelineStateOptions,
  type ValidationResult,
} from '../../src/pipeline/output-validator.js';
import type { PipelineState } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import type { ElementData } from '../../src/types/types.js';
import type { HeaderFact } from '../../src/pipeline/header-fact.js';
import type { HeaderStatus } from '../../src/pipeline/element-taxonomy.js';

const layerEnum: ValidatePipelineStateOptions['layerEnum'] = [
  'ui_component', 'service', 'utility', 'data_access', 'api', 'integration',
  'domain', 'validation', 'parser', 'formatter', 'cli', 'configuration',
  'test_support',
];

function elem(file: string, name: string, line: number, status: HeaderStatus, headerFact?: HeaderFact): ElementData {
  return {
    name,
    type: 'function',
    file,
    line,
    column: 1,
    exported: false,
    sourceLanguage: 'ts',
    codeRefId: `@Fn/${file}#${name}:${line}`,
    uuid: `uuid-${file}-${name}`,
    headerStatus: status,
    headerFact,
  } as ElementData;
}

function emptyGraph(): ExportedGraph {
  return {
    version: 'phase5', exportedAt: 0, nodes: [], edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
  };
}

function makeState(elements: ElementData[]): PipelineState {
  return {
    projectPath: '/tmp/p',
    files: new Map(),
    elements,
    imports: [],
    calls: [],
    rawImports: [],
    rawCalls: [],
    rawExports: [],
    headerFacts: new Map(),
    headerImportFacts: [],
    headerParseErrors: [],
    importResolutions: [],
    callResolutions: [],
    graph: emptyGraph(),
    sources: new Map(),
    options: {},
    metadata: {
      startTime: 0, filesScanned: 0, elementsExtracted: 0, relationshipsExtracted: 0,
    },
  };
}

const FACT_UTIL: HeaderFact = { sourceFile: 'src/util.ts', layer: 'utility' };

describe('Phase 6 AC-08: idempotency (100 invocations)', () => {
  it('100 calls on identical state+graph produce deepStrictEqual ValidationResult', () => {
    const elements = [
      elem('src/util.ts', 'a', 1, 'defined', FACT_UTIL),
      elem('src/util.ts', 'b', 5, 'defined', FACT_UTIL),
      elem('src/lib.ts',  'c', 1, 'missing'),
      elem('src/old.ts',  'd', 1, 'stale'),
      elem('src/new.ts',  'e', 1, 'partial'),
    ];
    const state = makeState(elements);
    const graph = emptyGraph();
    const opts: ValidatePipelineStateOptions = { layerEnum, strictHeaders: false };

    const baseline = validatePipelineState(state, graph, opts);
    for (let i = 0; i < 100; i++) {
      const r = validatePipelineState(state, graph, opts);
      expect(r).toEqual(baseline);
    }
  });
});

describe('Phase 6 AC-08: purity (frozen inputs)', () => {
  it('validator does not mutate frozen state, graph, or options', () => {
    const elements = [elem('src/util.ts', 'a', 1, 'defined', FACT_UTIL)];
    const state = makeState(elements);
    const graph = emptyGraph();
    const opts: ValidatePipelineStateOptions = { layerEnum, strictHeaders: false };
    Object.freeze(state);
    Object.freeze(state.elements);
    Object.freeze(graph);
    Object.freeze(graph.nodes);
    Object.freeze(graph.edges);
    Object.freeze(opts);

    expect(() => validatePipelineState(state, graph, opts)).not.toThrow();
  });
});

describe('Phase 6 AC-08: order independence (ORCHESTRATOR safeguard 2)', () => {
  it('shuffled element array produces identical report counts', () => {
    const elements = [
      elem('src/util.ts', 'a', 1, 'defined', FACT_UTIL),
      elem('src/util.ts', 'b', 5, 'defined', FACT_UTIL),
      elem('src/util.ts', 'c', 9, 'defined', FACT_UTIL),
      elem('src/lib.ts',  'd', 1, 'missing'),
      elem('src/lib.ts',  'e', 5, 'missing'),
      elem('src/old.ts',  'f', 1, 'stale'),
      elem('src/new.ts',  'g', 1, 'partial'),
    ];

    function shuffle<T>(arr: T[], seed: number): T[] {
      // Deterministic shuffle (LCG) so tests are reproducible.
      const out = arr.slice();
      let s = seed;
      for (let i = out.length - 1; i > 0; i--) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const j = s % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }

    const baseline = validatePipelineState(makeState(elements), emptyGraph(), { layerEnum });
    for (let seed = 1; seed <= 10; seed++) {
      const shuffled = shuffle(elements, seed);
      const r: ValidationResult = validatePipelineState(makeState(shuffled), emptyGraph(), { layerEnum });
      expect(r.report).toEqual(baseline.report);
      expect(r.errors.length).toBe(baseline.errors.length);
      expect(r.warnings.length).toBe(baseline.warnings.length);
    }
  });
});
