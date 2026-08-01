/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability pipeline-phase-contract
 * @exports PipelineContext, PipelinePhase, runPhases, pipelineStateOf
 * @used_by src/pipeline/orchestrator.ts, src/pipeline/phases/resolve-tail.ts
 */

/**
 * Phase-middleware contract for the pipeline orchestrator
 * (WO-DECOUPLE-PIPELINEORCHESTRATOR-VIA-PHASE-MIDDLEWARE-REFACTOR-ORCHESTRATOR-TS-001).
 *
 * PipelineContext is the mutable accumulator both orchestrator paths already
 * built by hand (the fact arrays, bundles, graph, resolutions). PipelineState
 * remains the PUBLIC return shape — the context is internal wiring only.
 *
 * Deliberately minimal: a sequential executor over a phase-list literal. No
 * hooks, no events, no dynamic registration — ordering stays explicit at each
 * call site, and a new pass (e.g. cross-repo workspace linkage) is one
 * phase-list insertion.
 */

import type {
  PipelineOptions,
  PipelineState,
  ImportRelationship,
  CallRelationship,
  HeritageRelationship,
  RawImportFact,
  RawCallFact,
  RawExportFact,
  HeaderFact,
  HeaderImportFact,
  HeaderParseError,
  ImportResolution,
  CallResolution,
} from '../types.js';
import type { DocFact } from '../doc-ingest.js';
import type { RouteFact, FrontendCallFact } from '../extractors/route-extractor.js';
import type { FileFactBundle } from '../symbol-table-cache.js';
import type { ElementData } from '../../types/types.js';
import type { ExportedGraph } from '../../export/graph-exporter.js';

/** Mutable per-run accumulator shared by every phase. */
export interface PipelineContext {
  projectPath: string;
  options: PipelineOptions;
  verbose: boolean;
  /**
   * Whether the resolve-tail phases emit their step logs. run() historically
   * logged "Resolving imports (Phase 3)..." etc.; the incremental path did
   * not. Kept as a flag so CLI output stays byte-identical on both paths.
   */
  chainLogs: boolean;
  startTime: number;

  files: Map<string, string[]>;
  /** Pre-cache-filter file total — scan-progress logging denominator. */
  totalFiles: number;
  elements: ElementData[];
  imports: ImportRelationship[];
  calls: CallRelationship[];
  heritage: HeritageRelationship[];
  rawImports: RawImportFact[];
  rawCalls: RawCallFact[];
  rawExports: RawExportFact[];
  headerFacts: Map<string, HeaderFact>;
  headerImportFacts: HeaderImportFact[];
  headerParseErrors: HeaderParseError[];
  routes: RouteFact[];
  frontendCalls: FrontendCallFact[];
  sources: Map<string, string>;

  /** Per-file bundles + insertion order (fact-set persistence input). */
  factBundles: Map<string, FileFactBundle>;
  fileOrder: string[];

  docs: DocFact[];
  graph: ExportedGraph;
  importResolutions: ImportResolution[];
  callResolutions: CallResolution[];
  filesScanned: number;
}

/** One sequential pipeline step. Phases mutate ctx; ordering is the contract. */
export interface PipelinePhase {
  name: string;
  run(ctx: PipelineContext): Promise<void> | void;
}

/** Sequential executor — phases run in list order, each to completion. */
export async function runPhases(phases: PipelinePhase[], ctx: PipelineContext): Promise<void> {
  for (const phase of phases) {
    await phase.run(ctx);
  }
}

/**
 * Project the context onto the PipelineState shape the pure resolve/construct
 * functions consume. Same object identities (arrays/maps/graph are shared, not
 * copied) — mutation semantics match the hand-built states this replaces.
 */
export function pipelineStateOf(ctx: PipelineContext): PipelineState {
  return {
    projectPath: ctx.projectPath,
    files: ctx.files,
    elements: ctx.elements,
    imports: ctx.imports,
    calls: ctx.calls,
    heritage: ctx.heritage,
    rawImports: ctx.rawImports,
    rawCalls: ctx.rawCalls,
    rawExports: ctx.rawExports,
    headerFacts: ctx.headerFacts,
    headerImportFacts: ctx.headerImportFacts,
    headerParseErrors: ctx.headerParseErrors,
    importResolutions: ctx.importResolutions,
    callResolutions: ctx.callResolutions,
    routes: ctx.routes,
    frontendCalls: ctx.frontendCalls,
    docs: ctx.docs,
    graph: ctx.graph,
    sources: ctx.sources,
    options: ctx.options,
    metadata: {
      startTime: ctx.startTime,
      filesScanned: ctx.filesScanned,
      elementsExtracted: ctx.elements.length,
      relationshipsExtracted: ctx.imports.length + ctx.calls.length,
    },
  };
}
