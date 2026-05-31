/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-output-validation-semantic-headers-test
 */

/**
 * Phase 6 — output-validation-semantic-headers integration test (AC-03).
 *
 * Three sub-tests, one per SH-* check. Each runs the validator twice — once
 * with strictHeaders:false (default) and once with strictHeaders:true.
 * Default mode: violations produce warnings[] >= 1, errors[]==[], ok=true.
 * Strict mode: same violations produce errors[] >= 1
 * (kind='header_drift_strict'), ok=false.
 *
 * Inline state fixtures use stamped headerStatus on synthetic ElementData
 * entries — same shape as orchestrator.ts:476-480 stamps.
 */

import { describe, expect, it } from 'vitest';
import {
  validatePipelineState,
  type ValidatePipelineStateOptions,
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

function emptyGraph(): ExportedGraph {
  return {
    version: 'phase5', exportedAt: 0, nodes: [], edges: [],
    statistics: { nodeCount: 0, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
  };
}

function graphWithFileGrain(files: Array<{ file: string; status: HeaderStatus }>): ExportedGraph {
  return {
    version: 'phase5', exportedAt: 0,
    nodes: files.map(({ file, status }) => ({
      id: `@File/${file}`,
      type: 'file',
      name: `@File/${file}`,
      file,
      line: 1,
      metadata: { codeRefId: `@File/${file}`, codeRefIdNoLine: `@File/${file}`, fileGrain: true, headerStatus: status },
    })),
    edges: [],
    statistics: { nodeCount: files.length, edgeCount: 0, edgesByType: {}, densityRatio: 0 },
  };
}

function stampedElement(file: string, status: HeaderStatus, headerFact?: HeaderFact): ElementData {
  return {
    name: 'X',
    type: 'function',
    file,
    line: 1,
    column: 1,
    exported: false,
    sourceLanguage: 'ts',
    codeRefId: `@Fn/${file}#X:1`,
    uuid: `uuid-${file}`,
    headerStatus: status,
    headerFact,
  } as ElementData;
}

function makeState(elements: ElementData[], extras: Partial<PipelineState> = {}): PipelineState {
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
    ...extras,
  };
}

describe('Phase 6 SH-1: layer_in_enum', () => {
  it('PASS: defined file with layer in enum produces no warning/error', () => {
    const fact: HeaderFact = { sourceFile: 'src/x.ts', layer: 'utility' };
    const state = makeState([stampedElement('src/x.ts', 'defined', fact)]);
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'defined' }]);
    const def = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(def.warnings.filter(w => w.check === 'layer_in_enum')).toEqual([]);
    expect(def.errors).toEqual([]);
    const strict = validatePipelineState(state, graph, { layerEnum, strictHeaders: true });
    expect(strict.errors.filter(e => e.check === 'layer_in_enum')).toEqual([]);
    expect(strict.ok).toBe(true);
  });

  it('FAIL default: bad layer → warnings[] only, ok=true', () => {
    const fact: HeaderFact = { sourceFile: 'src/x.ts', layer: 'not-a-real-layer' };
    const state = makeState([stampedElement('src/x.ts', 'defined', fact)]);
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'defined' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(r.warnings.filter(w => w.check === 'layer_in_enum').length).toBe(1);
    expect(r.errors.filter(e => e.check === 'layer_in_enum')).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('FAIL strict: bad layer → errors[kind=header_drift_strict], ok=false', () => {
    const fact: HeaderFact = { sourceFile: 'src/x.ts', layer: 'not-a-real-layer' };
    const state = makeState([stampedElement('src/x.ts', 'defined', fact)]);
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'defined' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: true });
    const violations = r.errors.filter(e => e.check === 'layer_in_enum');
    expect(violations.length).toBe(1);
    expect(violations[0].kind).toBe('header_drift_strict');
    expect(r.ok).toBe(false);
  });
});

describe('Phase 6 SH-2: exports_match_ast (headerStatus=stale)', () => {
  it('PASS: no stale files → no warning', () => {
    const state = makeState([stampedElement('src/x.ts', 'defined')]);
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'defined' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(r.warnings.filter(w => w.check === 'exports_match_ast')).toEqual([]);
  });

  it('FAIL default: stale file → warnings[], ok=true', () => {
    const state = makeState([stampedElement('src/x.ts', 'stale')]);
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'stale' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(r.warnings.filter(w => w.check === 'exports_match_ast').length).toBe(1);
    expect(r.ok).toBe(true);
  });

  it('FAIL strict: stale file → errors[kind=header_drift_strict], ok=false', () => {
    const state = makeState([stampedElement('src/x.ts', 'stale')]);
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'stale' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: true });
    const violations = r.errors.filter(e => e.check === 'exports_match_ast');
    expect(violations.length).toBe(1);
    expect(violations[0].kind).toBe('header_drift_strict');
    expect(r.ok).toBe(false);
  });
});

describe('Phase 6 SH-3: imports_non_unresolved', () => {
  it('PASS: defined file with HeaderImportFact mapping to resolved ImportResolution → no warning', () => {
    const state = makeState([stampedElement('src/x.ts', 'defined')], {
      headerImportFacts: [{ sourceFile: 'src/x.ts', module: './alpha', symbol: 'doAlpha', line: 1 }],
      importResolutions: [{
        sourceFile: 'src/x.ts',
        importerCodeRefId: null,
        localName: 'doAlpha',
        originSpecifier: './alpha',
        kind: 'resolved',
      }],
    });
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'defined' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(r.warnings.filter(w => w.check === 'imports_non_unresolved')).toEqual([]);
  });

  it('FAIL default: unresolved HeaderImportFact → warnings[], ok=true', () => {
    const state = makeState([stampedElement('src/x.ts', 'defined')], {
      headerImportFacts: [{ sourceFile: 'src/x.ts', module: './ghost', symbol: 'gone', line: 1 }],
      importResolutions: [{
        sourceFile: 'src/x.ts',
        importerCodeRefId: null,
        localName: 'gone',
        originSpecifier: './ghost',
        kind: 'unresolved',
      }],
    });
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'defined' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    const violations = r.warnings.filter(w => w.check === 'imports_non_unresolved');
    expect(violations.length).toBe(1);
    expect(r.ok).toBe(true);
  });

  it('FAIL strict: unresolved HeaderImportFact → errors[kind=header_drift_strict], ok=false', () => {
    const state = makeState([stampedElement('src/x.ts', 'defined')], {
      headerImportFacts: [{ sourceFile: 'src/x.ts', module: './ghost', symbol: 'gone', line: 1 }],
      importResolutions: [{
        sourceFile: 'src/x.ts',
        importerCodeRefId: null,
        localName: 'gone',
        originSpecifier: './ghost',
        kind: 'unresolved',
      }],
    });
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'defined' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: true });
    const violations = r.errors.filter(e => e.check === 'imports_non_unresolved');
    expect(violations.length).toBe(1);
    expect(violations[0].kind).toBe('header_drift_strict');
    expect(r.ok).toBe(false);
  });

  it('EXEMPT: defined file with NO HeaderImportFacts → no warning', () => {
    const state = makeState([stampedElement('src/x.ts', 'defined')]);
    const graph = graphWithFileGrain([{ file: 'src/x.ts', status: 'defined' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: true });
    expect(r.warnings.filter(w => w.check === 'imports_non_unresolved')).toEqual([]);
    expect(r.errors.filter(e => e.check === 'imports_non_unresolved')).toEqual([]);
  });
});

describe('header_coverage_pct (WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001 P1)', () => {
  it('is 100 when every file is defined', () => {
    const state = makeState([
      stampedElement('src/a.ts', 'defined'),
      stampedElement('src/b.ts', 'defined'),
    ]);
    const graph = graphWithFileGrain([
      { file: 'src/a.ts', status: 'defined' },
      { file: 'src/b.ts', status: 'defined' },
    ]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(r.report.header_coverage_pct).toBe(100);
  });

  it('is 0 when no file is defined', () => {
    const state = makeState([stampedElement('src/a.ts', 'missing')]);
    const graph = graphWithFileGrain([{ file: 'src/a.ts', status: 'missing' }]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(r.report.header_coverage_pct).toBe(0);
  });

  it('counts defined / (defined+missing+stale+partial) across all statuses', () => {
    // 1 defined of 4 total files => 25%.
    const state = makeState([
      stampedElement('src/a.ts', 'defined'),
      stampedElement('src/b.ts', 'missing'),
      stampedElement('src/c.ts', 'stale'),
      stampedElement('src/d.ts', 'partial'),
    ]);
    const graph = graphWithFileGrain([
      { file: 'src/a.ts', status: 'defined' },
      { file: 'src/b.ts', status: 'missing' },
      { file: 'src/c.ts', status: 'stale' },
      { file: 'src/d.ts', status: 'partial' },
    ]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(r.report.header_defined_count).toBe(1);
    expect(r.report.header_coverage_pct).toBe(25);
  });

  it('rounds to two decimals (1 of 3 => 33.33)', () => {
    const state = makeState([
      stampedElement('src/a.ts', 'defined'),
      stampedElement('src/b.ts', 'missing'),
      stampedElement('src/c.ts', 'missing'),
    ]);
    const graph = graphWithFileGrain([
      { file: 'src/a.ts', status: 'defined' },
      { file: 'src/b.ts', status: 'missing' },
      { file: 'src/c.ts', status: 'missing' },
    ]);
    const r = validatePipelineState(state, graph, { layerEnum, strictHeaders: false });
    expect(r.report.header_coverage_pct).toBe(33.33);
  });

  it('is 100 (vacuous) for an empty graph with no file-grain nodes', () => {
    const state = makeState([]);
    const r = validatePipelineState(state, emptyGraph(), { layerEnum, strictHeaders: false });
    expect(r.report.header_coverage_pct).toBe(100);
  });
});
