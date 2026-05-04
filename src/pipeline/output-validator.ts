/**
 * Phase 6 Output Validator
 *
 * WO-PIPELINE-OUTPUT-VALIDATION-001
 *
 * Single chokepoint validator function (DR-PHASE-6-A): one new file at
 * src/pipeline/output-validator.ts. Called from src/cli/populate.ts AFTER
 * orchestrator.run() returns and BEFORE the generator loop, so it precedes
 * every write surface (index.json, graph.json, semantic-registry.json,
 * exports/graph.json).
 *
 * Phase 6 is read-only over PipelineState + ExportedGraph. NO mutation of
 * state.elements, state.importResolutions, state.callResolutions, or
 * state.graph. NO file I/O. NO process.exit. NO console output. The caller
 * (populate.ts) owns output and exit-code semantics (DR-PHASE-6-B).
 *
 * Invariants enforced:
 *   GI-1 node ID uniqueness — Set<string>(graph.nodes.map(n=>n.id)).size === nodes.length
 *   GI-2 resolved edge endpoint existence — every edge with
 *        resolutionStatus='resolved' has both sourceId and targetId in
 *        graph.nodes id set
 *   GI-3 no dangling resolved edges — every resolved edge has targetId
 *        defined (Phase 5 honest-demotion invariant; R-PHASE-6-E)
 *   GI-4 valid relationship enum — edge.relationship in
 *        {import, call, export, header-import}
 *   GI-5 valid resolutionStatus enum — edge.resolutionStatus in
 *        {resolved, unresolved, ambiguous, external, builtin, dynamic,
 *         typeOnly, stale}
 *   GI-6 no duplicate node identities — no two nodes share both name AND file
 *
 * Header drift checks (warn by default; fail-hard under --strict-headers):
 *   SH-1 layer_in_enum — every file with headerStatus='defined' has a
 *        layer that appears in options.layerEnum
 *   SH-2 exports_match_ast — files with headerStatus='stale' (already
 *        downgraded by Phase 2.5 cross-check at orchestrator.ts:467-473)
 *        are surfaced as warnings; Phase 6 reads the status, does NOT
 *        re-run the cross-check
 *   SH-3 imports_non_unresolved — every HeaderImportFact for a file with
 *        headerStatus='defined' must map to a non-unresolved
 *        ImportResolution; absence of @imports is implicit exemption
 *
 * Validation report (R-PHASE-6-C — schema is now a public artifact contract,
 * additive-only after ship):
 *   valid_edge_count, unresolved_count, ambiguous_count, external_count,
 *   builtin_count, header_defined_count, header_missing_count,
 *   header_stale_count, header_partial_count, header_layer_mismatch_count,
 *   header_export_mismatch_count
 *
 * File-grain header counts (R-PHASE-6-F): headerStatus is stamped per
 * element by orchestrator.ts:476-480. The 4 header_*_count fields and the
 * 2 header_*_mismatch_count fields are FILE-grain — built via
 * Map<file, HeaderStatus> taking the canonical status per file.
 */

import type { PipelineState } from './types.js';
import type { ExportedGraph } from '../export/graph-exporter.js';
import type { HeaderStatus, LayerEnum } from './element-taxonomy.js';

/**
 * Validation error — graph integrity violation OR strict-headers-promoted
 * header drift. Always causes ValidationResult.ok=false and a non-zero CLI
 * exit (handled by caller).
 */
export interface ValidationError {
  /**
   * graph_integrity — GI-1, GI-2, GI-4, GI-5, GI-6 (always fail-hard).
   * phase5_demotion — GI-3 specifically (Phase 5 honest-demotion invariant).
   * header_drift_strict — SH-1/SH-2/SH-3 promoted under --strict-headers.
   */
  kind: 'graph_integrity' | 'phase5_demotion' | 'header_drift_strict';
  /** Stable check name (e.g. 'node_id_uniqueness'). */
  check: string;
  /** Optional offender — edge id, node id, or canonical codeRefId. */
  offendingId?: string;
  /** Optional offender — file path for header-drift kinds. */
  offendingFile?: string;
  /** Structured details keyed by check (see GI-* / SH-* error_shape specs). */
  details: Record<string, unknown>;
}

/**
 * Validation warning — header drift in default mode. Does NOT cause
 * ValidationResult.ok=false; emitted to stderr by caller. Promoted to
 * ValidationError under --strict-headers.
 */
export interface ValidationWarning {
  /** Always 'header_drift' in Phase 6. */
  kind: 'header_drift';
  /** Stable check name (e.g. 'layer_in_enum'). */
  check: string;
  /** Offending file (header-drift checks are file-scoped). */
  offendingFile?: string;
  /** Structured details keyed by check. */
  details: Record<string, unknown>;
}

/**
 * Locked 11-field validation report (R-PHASE-6-C).
 *
 * SCHEMA STABILITY: these field names are now a public artifact contract
 * (CI dashboards, downstream tools). Field names are LOCKED — additive-only
 * future changes; no rename, no drop, without an explicit ORCHESTRATOR
 * sign-off. All fields are required numbers (use 0 for empty categories,
 * never undefined / null / string).
 *
 * File-grain header counts (R-PHASE-6-F): the 6 header_* fields count
 * FILES, not elements (one element per multi-element file would otherwise
 * triple-count).
 */
export interface ValidationReport {
  /** Edges with resolutionStatus='resolved' that pass GI-2 and GI-3. */
  valid_edge_count: number;
  /** Edges with resolutionStatus='unresolved'. */
  unresolved_count: number;
  /** Edges with resolutionStatus='ambiguous'. */
  ambiguous_count: number;
  /** Edges with resolutionStatus='external'. */
  external_count: number;
  /** Edges with resolutionStatus='builtin'. */
  builtin_count: number;
  /** Unique files with headerStatus='defined'. */
  header_defined_count: number;
  /** Unique files with headerStatus='missing'. */
  header_missing_count: number;
  /** Unique files with headerStatus='stale'. */
  header_stale_count: number;
  /** Unique files with headerStatus='partial'. */
  header_partial_count: number;
  /** Unique files with headerStatus='defined' AND layer not in enum (SH-1). */
  header_layer_mismatch_count: number;
  /** Unique files with headerStatus='stale' (SH-2; export drift). */
  header_export_mismatch_count: number;
}

/**
 * Validator return type (DR-PHASE-6-B).
 *
 * ok=true iff errors.length===0. warnings may be non-empty when ok=true;
 * they reflect header drift in default-mode runs. Caller logs warnings to
 * stderr and continues to generators.
 */
export interface ValidationResult {
  /** True iff errors.length===0. Caller maps to exit code (0 vs 1). */
  ok: boolean;
  /** Always-fail-hard graph integrity violations + strict-promoted drift. */
  errors: ValidationError[];
  /** Default-mode header drift surfaces; caller logs and continues. */
  warnings: ValidationWarning[];
  /** 11-field locked report. Always populated, even on ok=false. */
  report: ValidationReport;
}

/**
 * Validator options. Pure-function discipline — caller passes layerEnum
 * (loaded from ASSISTANT/STANDARDS/layers.json) so validator never reaches
 * filesystem. strictHeaders=true promotes header drift from warnings to
 * errors.
 */
export interface ValidatePipelineStateOptions {
  /** Default false. When true, header-drift checks become hard errors. */
  strictHeaders?: boolean;
  /**
   * Required. Layer enum from ASSISTANT/STANDARDS/layers.json. Caller
   * loads via element-taxonomy.loadLayerEnum().
   */
  layerEnum: readonly LayerEnum[];
}

/** Canonical EdgeRelationship enum (mirrors graph-builder.ts EdgeRelationship). */
const VALID_RELATIONSHIPS = new Set<string>([
  'import',
  'call',
  'export',
  'header-import',
]);

/** Canonical EdgeResolutionStatus enum (mirrors graph-builder.ts EdgeResolutionStatus). */
const VALID_RESOLUTION_STATUSES = new Set<string>([
  'resolved',
  'unresolved',
  'ambiguous',
  'external',
  'builtin',
  'dynamic',
  'typeOnly',
  'stale',
]);

/**
 * Phase 6 chokepoint. Read-only over (state, graph). Pure: no fs, no
 * process.exit, no console. Returns ValidationResult; caller decides what
 * to do with errors[] / warnings[] / report.
 *
 * Stub at task 1.3 — always returns ok=true with empty errors/warnings and
 * a zero-filled report. Tasks 1.7/1.8/1.9 flesh out the three sub-checks
 * (after ORCHESTRATOR review at checkpoint 1.6).
 */
export function validatePipelineState(
  state: PipelineState,
  graph: ExportedGraph,
  options: ValidatePipelineStateOptions,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const integrityErrors = checkGraphIntegrity(graph);
  errors.push(...integrityErrors);

  const headerDrifts = checkSemanticHeaders(state, options);
  if (options.strictHeaders) {
    for (const drift of headerDrifts) {
      errors.push({
        kind: 'header_drift_strict',
        check: drift.check,
        offendingFile: drift.offendingFile,
        details: drift.details,
      });
    }
  } else {
    warnings.push(...headerDrifts);
  }

  const report = buildReport(state, graph);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    report,
  };
}

/**
 * Six graph integrity checks (always fail-hard). Stub at 1.3 — task 1.7
 * flesh out.
 */
function checkGraphIntegrity(_graph: ExportedGraph): ValidationError[] {
  return [];
}

/**
 * Three semantic-header checks (warn-by-default; promoted by caller under
 * --strict-headers). Stub at 1.3 — task 1.8 flesh out.
 */
function checkSemanticHeaders(
  _state: PipelineState,
  _options: ValidatePipelineStateOptions,
): ValidationWarning[] {
  return [];
}

/**
 * Build the 11-field validation report from state + graph. Stub at 1.3 —
 * task 1.9 flesh out.
 */
function buildReport(_state: PipelineState, _graph: ExportedGraph): ValidationReport {
  return {
    valid_edge_count: 0,
    unresolved_count: 0,
    ambiguous_count: 0,
    external_count: 0,
    builtin_count: 0,
    header_defined_count: 0,
    header_missing_count: 0,
    header_stale_count: 0,
    header_partial_count: 0,
    header_layer_mismatch_count: 0,
    header_export_mismatch_count: 0,
  };
}

/**
 * Build a Map<file, HeaderStatus> from state.elements (R-PHASE-6-F).
 * headerStatus is stamped per element by orchestrator.ts:476-480, but
 * the report fields are file-grain. First-seen-wins per file (every
 * element from a given file shares the same headerStatus, so this is
 * deterministic).
 *
 * Exported for use by tasks 1.8 / 1.9 implementations and unit tests.
 */
export function buildFileHeaderStatusMap(state: PipelineState): Map<string, HeaderStatus> {
  const fileToStatus = new Map<string, HeaderStatus>();
  for (const element of state.elements) {
    if (element.headerStatus !== undefined && !fileToStatus.has(element.file)) {
      fileToStatus.set(element.file, element.headerStatus);
    }
  }
  return fileToStatus;
}

/** Re-exported relationship enum for downstream test fixtures. */
export const VALID_EDGE_RELATIONSHIPS = VALID_RELATIONSHIPS;

/** Re-exported resolutionStatus enum for downstream test fixtures. */
export const VALID_EDGE_RESOLUTION_STATUSES = VALID_RESOLUTION_STATUSES;
