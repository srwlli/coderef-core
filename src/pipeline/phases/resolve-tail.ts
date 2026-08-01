/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability pipeline-resolve-tail-phases
 * @exports legacyGraphPhase, collectDocsPhase, resolveImportsPhase, resolveCallsPhase, constructGraphPhase, scipOverlayPhase, resolveTailPhases
 * @used_by src/pipeline/orchestrator.ts
 */

/**
 * The shared resolve/construct tail of the pipeline, as phases
 * (WO-DECOUPLE-PIPELINEORCHESTRATOR-VIA-PHASE-MIDDLEWARE-REFACTOR-ORCHESTRATOR-TS-001
 * Phase 1). These are THIN ADAPTERS over the existing pure functions —
 * resolveImports / resolveCalls / constructGraph keep their pass-1-before-pass-2
 * discipline untouched; the phases only own sequencing and context wiring.
 *
 * Consumed by BOTH orchestrator paths (full run() and the incremental path),
 * which is exactly the parity-by-shared-code the old assembleAndResolve()
 * duplication approximated by hand.
 */

import logger from '../../utils/logger.js';
import { resolveImports } from '../import-resolver.js';
import { resolveCalls } from '../call-resolver.js';
import { constructGraph } from '../graph-builder.js';
import { collectDocFacts } from '../doc-ingest.js';
import { applyScipOverlay } from '../scip-overlay.js';
import type { ImportRelationship, CallRelationship, HeritageRelationship } from '../types.js';
import type { ElementData } from '../../types/types.js';
import type { ExportedGraph } from '../../export/graph-exporter.js';
import { pipelineStateOf, type PipelinePhase } from './types.js';

/** Builder signature for the legacy file-grain graph (stays a private orchestrator method). */
export type LegacyGraphBuilder = (
  elements: ElementData[],
  imports: ImportRelationship[],
  calls: CallRelationship[],
  heritage: HeritageRelationship[],
  projectPath: string,
) => ExportedGraph;

/** Step 4: legacy buildGraph — superseded by constructGraph below, but still the seed object. */
export function legacyGraphPhase(build: LegacyGraphBuilder): PipelinePhase {
  return {
    name: 'legacy-graph',
    run(ctx) {
      if (ctx.chainLogs && ctx.verbose) logger.info('[PipelineOrchestrator] Building dependency graph...');
      ctx.graph = build(ctx.elements, ctx.imports, ctx.calls, ctx.heritage, ctx.projectPath);
    },
  };
}

/**
 * Step 4.4: governing-doc facts. Repo-global collection — deliberately NOT part
 * of the per-file bundles, so the incremental path re-collects identically
 * (parity by construction).
 */
export function collectDocsPhase(): PipelinePhase {
  return {
    name: 'collect-docs',
    run(ctx) {
      const docIngest = collectDocFacts(ctx.projectPath);
      ctx.docs = docIngest.docs;
      if (ctx.chainLogs && ctx.verbose && (docIngest.docs.length > 0 || docIngest.skipped.length > 0)) {
        logger.info(
          `[PipelineOrchestrator] Doc ingest: ${docIngest.docs.length} doc fact(s), ` +
            `${docIngest.skipped.length} skipped.`,
        );
      }
    },
  };
}

/**
 * Step 4.5: Phase 3 — resolve imports against export tables. Pure function
 * over state; pass 1 (export tables) completes for ALL files before pass 2
 * (resolution) begins for ANY file.
 */
export function resolveImportsPhase(): PipelinePhase {
  return {
    name: 'resolve-imports',
    run(ctx) {
      if (ctx.chainLogs && ctx.verbose) logger.info('[PipelineOrchestrator] Resolving imports (Phase 3)...');
      ctx.importResolutions = resolveImports(pipelineStateOf(ctx));
    },
  };
}

/**
 * Step 4.6: Phase 4 — resolve calls against the project-wide symbol table plus
 * state.importResolutions (cross-phase seam from Phase 3). Pure function; same
 * two-pass discipline.
 */
export function resolveCallsPhase(): PipelinePhase {
  return {
    name: 'resolve-calls',
    run(ctx) {
      if (ctx.chainLogs && ctx.verbose) logger.info('[PipelineOrchestrator] Resolving calls (Phase 4)...');
      ctx.callResolutions = resolveCalls(pipelineStateOf(ctx));
    },
  };
}

/**
 * Step 4.7: Phase 5 — canonical graph construction + the atomic swap. The
 * legacy graph object is mutated in place (Object.assign) so every reference
 * downstream sees the canonical result — identical to the inline swap this
 * replaces.
 */
export function constructGraphPhase(): PipelinePhase {
  return {
    name: 'construct-graph',
    run(ctx) {
      if (ctx.chainLogs && ctx.verbose) logger.info('[PipelineOrchestrator] Constructing canonical graph (Phase 5)...');
      const v2Graph = constructGraph(pipelineStateOf(ctx));
      Object.assign(ctx.graph, {
        nodes: v2Graph.nodes,
        edges: v2Graph.edges,
        statistics: v2Graph.statistics,
        version: v2Graph.version,
        exportedAt: v2Graph.exportedAt,
      });
    },
  };
}

/**
 * Step 4.8: SCIP live resolution overlay (opt-in via options.scipIndex).
 * Post-resolution overlay; no-regress by construction. Absent scipIndex =
 * zero behavior change.
 */
export function scipOverlayPhase(): PipelinePhase {
  return {
    name: 'scip-overlay',
    run(ctx) {
      if (!ctx.options.scipIndex) return;
      const overlayStats = applyScipOverlay(ctx.graph, ctx.options.scipIndex, ctx.projectPath);
      if (ctx.verbose) {
        logger.info(
          `[PipelineOrchestrator] SCIP overlay: flipped ${overlayStats.flipped_total} ` +
            `edge(s) (unresolved ${overlayStats.flipped_unresolved}, ambiguous ` +
            `${overlayStats.flipped_ambiguous}) over ${overlayStats.scip_references} ` +
            `SCIP reference(s); ${overlayStats.already_resolved} site(s) already resolved; ` +
            `${overlayStats.no_target_mapping} reference(s) had no unique node mapping (not flipped).`,
        );
      }
    },
  };
}

/**
 * The canonical shared tail: legacy graph -> docs -> imports -> calls ->
 * canonical graph [-> SCIP overlay]. The overlay leg is caller-composed:
 * run() includes it (Step 4.8); the incremental path historically did NOT
 * run the overlay (assembleAndResolve carried no applyScipOverlay call), so
 * it composes with includeScipOverlay:false to stay byte-identical.
 */
export function resolveTailPhases(
  build: LegacyGraphBuilder,
  opts: { includeScipOverlay: boolean },
): PipelinePhase[] {
  const phases = [
    legacyGraphPhase(build),
    collectDocsPhase(),
    resolveImportsPhase(),
    resolveCallsPhase(),
    constructGraphPhase(),
  ];
  if (opts.includeScipOverlay) phases.push(scipOverlayPhase());
  return phases;
}
