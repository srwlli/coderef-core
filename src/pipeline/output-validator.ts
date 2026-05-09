/**
 * @coderef-semantic: 1.0.0
 * @exports ValidationError, ValidationWarning, ValidationReport, ValidationResult, ValidatePipelineStateOptions, validatePipelineState, buildFileHeaderStatusMap
 * @used_by src/cli/populate.ts, src/pipeline/types.ts, __tests__/pipeline/output-validation-determinism.test.ts, __tests__/pipeline/output-validation-graph-integrity.test.ts, __tests__/pipeline/output-validation-semantic-headers.test.ts
 */

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

  const headerDrifts = checkSemanticHeaders(state, graph, options);
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

  // SH-1 mismatch count is derived from the header-drift surface (not
  // recomputable from state alone — needs options.layerEnum). buildReport
  // returns 0 for this field and we patch it here so buildReport stays
  // self-contained.
  const layerMismatchFiles = new Set<string>();
  for (const drift of headerDrifts) {
    if (drift.check === 'layer_in_enum' && drift.offendingFile) {
      layerMismatchFiles.add(drift.offendingFile);
    }
  }
  const report: ValidationReport = {
    ...buildReport(state, graph),
    header_layer_mismatch_count: layerMismatchFiles.size,
  };

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    report,
  };
}

/**
 * Six graph integrity checks (always fail-hard).
 *
 *   GI-1 node ID uniqueness                — kind: 'graph_integrity'
 *   GI-2 resolved edge endpoint existence  — kind: 'graph_integrity'
 *   GI-3 no dangling resolved edges        — kind: 'phase5_demotion' (R-PHASE-6-E)
 *   GI-4 valid relationship enum           — kind: 'graph_integrity'
 *   GI-5 valid resolutionStatus enum       — kind: 'graph_integrity'
 *   GI-6 no duplicate node identities      — kind: 'graph_integrity'
 *
 * GI-3 runs BEFORE GI-2 per R-PHASE-6-E mitigation: a resolved edge with
 * `targetId` undefined trips GI-3 (phase5_demotion) so future debugging
 * lands on the resolver's demotion logic rather than the validator.
 *
 * GI-6 NOTE (ORCHESTRATOR sequence, real-world Option B): the original
 * spec said "no two nodes share name AND file". TypeScript codebases
 * legitimately have multiple nested functions sharing name+file across
 * different enclosing scopes (e.g. seven distinct `traverse` functions
 * nested inside different methods of tree-sitter-scanner.ts at distinct
 * lines). Reframed to "no two nodes share full (name, file, line) tuple":
 * the line discriminator catches genuine identity collisions while
 * tolerating nested-function naming. This is a structural sanity check
 * distinct from GI-1's id-uniqueness check (a future codeRefId scheme
 * change could decouple id from line).
 */
function checkGraphIntegrity(graph: ExportedGraph): ValidationError[] {
  const errors: ValidationError[] = [];

  // GI-1: node ID uniqueness.
  const nodeIdSet = new Set<string>();
  const duplicateIdCounts = new Map<string, number>();
  for (const node of graph.nodes) {
    if (nodeIdSet.has(node.id)) {
      duplicateIdCounts.set(node.id, (duplicateIdCounts.get(node.id) ?? 1) + 1);
    } else {
      nodeIdSet.add(node.id);
    }
  }
  for (const [duplicateId, count] of duplicateIdCounts) {
    errors.push({
      kind: 'graph_integrity',
      check: 'node_id_uniqueness',
      offendingId: duplicateId,
      details: { duplicateId, count },
    });
  }

  // GI-6: no duplicate node identities — full (name, file, line) tuple
  // collision (Option B reframe). The line discriminator tolerates nested
  // functions sharing name+file across distinct lines while still catching
  // genuine identity collisions (two emissions of the same element at the
  // same line).
  const identityToIds = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (node.name === undefined || node.file === undefined) continue;
    if (node.line === undefined) continue;
    const key = `${node.name}\u0000${node.file}\u0000${node.line}`;
    const ids = identityToIds.get(key) ?? [];
    ids.push(node.id);
    identityToIds.set(key, ids);
  }
  for (const [key, ids] of identityToIds) {
    if (ids.length < 2) continue;
    const parts = key.split('\u0000');
    const name = parts[0];
    const file = parts[1];
    const line = Number(parts[2]);
    errors.push({
      kind: 'graph_integrity',
      check: 'no_duplicate_node_identities',
      details: { name, file, line, ids },
    });
  }

  for (const edge of graph.edges) {
    const edgeId = edge.id ?? '<edge-without-id>';

    // GI-4: valid relationship enum.
    if (edge.relationship !== undefined && !VALID_RELATIONSHIPS.has(edge.relationship)) {
      errors.push({
        kind: 'graph_integrity',
        check: 'valid_relationship_enum',
        offendingId: edgeId,
        details: { edgeId, relationship: edge.relationship },
      });
    }

    // GI-5: valid resolutionStatus enum.
    if (
      edge.resolutionStatus !== undefined
      && !VALID_RESOLUTION_STATUSES.has(edge.resolutionStatus)
    ) {
      errors.push({
        kind: 'graph_integrity',
        check: 'valid_resolution_status_enum',
        offendingId: edgeId,
        details: { edgeId, resolutionStatus: edge.resolutionStatus },
      });
    }

    if (edge.resolutionStatus !== 'resolved') continue;

    // GI-3: no dangling resolved edges (Phase 5 honest-demotion invariant).
    // Runs BEFORE GI-2 so missing-targetId surfaces as phase5_demotion.
    if (edge.targetId === undefined) {
      errors.push({
        kind: 'phase5_demotion',
        check: 'no_dangling_resolved_edges',
        offendingId: edgeId,
        details: { edgeId, sourceId: edge.sourceId },
      });
      continue;
    }

    // GI-2: resolved edge endpoint existence.
    if (edge.sourceId === undefined || !nodeIdSet.has(edge.sourceId)) {
      errors.push({
        kind: 'graph_integrity',
        check: 'resolved_edge_endpoint_existence',
        offendingId: edgeId,
        details: { edgeId, missing: 'sourceId', value: edge.sourceId },
      });
    }
    if (!nodeIdSet.has(edge.targetId)) {
      errors.push({
        kind: 'graph_integrity',
        check: 'resolved_edge_endpoint_existence',
        offendingId: edgeId,
        details: { edgeId, missing: 'targetId', value: edge.targetId },
      });
    }
  }

  return errors;
}

/**
 * Three semantic-header checks (warn-by-default; promoted by caller under
 * --strict-headers).
 *
 *   SH-1 layer_in_enum         — file with headerStatus='defined' must have
 *                                a layer that appears in options.layerEnum
 *   SH-2 exports_match_ast     — file with headerStatus='stale' (already
 *                                downgraded by Phase 2.5 cross-check at
 *                                orchestrator.ts:467-473). Phase 6 reads
 *                                the status, does NOT re-run the check.
 *   SH-3 imports_non_unresolved — every HeaderImportFact for a file with
 *                                headerStatus='defined' must map to a
 *                                non-'unresolved' ImportResolution.
 *                                Implicit exemption: files without any
 *                                @imports declarations.
 *
 * Returns ValidationWarning[] in default mode. Caller promotes each entry
 * to ValidationError{ kind:'header_drift_strict' } when
 * options.strictHeaders === true.
 */
function checkSemanticHeaders(
  state: PipelineState,
  graph: ExportedGraph,
  options: ValidatePipelineStateOptions,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const fileToStatus = buildFileHeaderStatusMap(graph);
  const fileToHeaderFact = buildFileHeaderFactMap(state);
  const layerEnum = options.layerEnum;

  // SH-1: @layer in enum (only files with headerStatus='defined').
  for (const [file, status] of fileToStatus) {
    if (status !== 'defined') continue;
    const headerFact = fileToHeaderFact.get(file);
    if (headerFact?.layer === undefined) continue;
    if (!layerEnum.includes(headerFact.layer)) {
      warnings.push({
        kind: 'header_drift',
        check: 'layer_in_enum',
        offendingFile: file,
        details: {
          file,
          layer: headerFact.layer,
          knownLayers: layerEnum.slice(),
        },
      });
    }
  }

  // SH-2: @exports match AST — surface every file with headerStatus='stale'.
  for (const [file, status] of fileToStatus) {
    if (status !== 'stale') continue;
    warnings.push({
      kind: 'header_drift',
      check: 'exports_match_ast',
      offendingFile: file,
      details: { file, headerStatus: 'stale' },
    });
  }

  // SH-3: @imports non-unresolved or exempt.
  // For each HeaderImportFact in a file with headerStatus='defined', look up
  // any ImportResolution matching (sourceFile, originSpecifier=module,
  // localName=symbol). If every matching resolution kind is 'unresolved',
  // emit a warning. Files without HeaderImportFacts are implicitly exempt.
  const importResolutionsByKey = new Map<string, string[]>();
  for (const ir of state.importResolutions) {
    const key = `${ir.sourceFile}\u0000${ir.originSpecifier}\u0000${ir.localName}`;
    const kinds = importResolutionsByKey.get(key) ?? [];
    kinds.push(ir.kind);
    importResolutionsByKey.set(key, kinds);
  }
  const unresolvedByFile = new Map<string, Array<{ module: string; symbol: string }>>();
  for (const fact of state.headerImportFacts) {
    const status = fileToStatus.get(fact.sourceFile);
    if (status !== 'defined') continue;
    const key = `${fact.sourceFile}\u0000${fact.module}\u0000${fact.symbol}`;
    const kinds = importResolutionsByKey.get(key);
    // No matching resolution at all → unresolved by absence.
    // All matching resolutions are 'unresolved' → unresolved.
    // Otherwise (any non-unresolved match) → exempt.
    const allUnresolved = kinds === undefined || kinds.every(k => k === 'unresolved');
    if (allUnresolved) {
      const list = unresolvedByFile.get(fact.sourceFile) ?? [];
      list.push({ module: fact.module, symbol: fact.symbol });
      unresolvedByFile.set(fact.sourceFile, list);
    }
  }
  for (const [file, unresolvedImports] of unresolvedByFile) {
    warnings.push({
      kind: 'header_drift',
      check: 'imports_non_unresolved',
      offendingFile: file,
      details: { file, unresolvedImports },
    });
  }

  return warnings;
}

/**
 * Build a Map<file, HeaderFact> from state.elements (R-PHASE-6-F). Like
 * buildFileHeaderStatusMap, takes the first element's headerFact per file.
 * Every element from a given file shares the same headerFact reference
 * (orchestrator.ts:476-480), so first-seen is deterministic.
 */
function buildFileHeaderFactMap(state: PipelineState): Map<string, NonNullable<typeof state.elements[number]['headerFact']>> {
  const fileToHeaderFact = new Map<
    string,
    NonNullable<typeof state.elements[number]['headerFact']>
  >();
  for (const element of state.elements) {
    if (element.headerFact !== undefined && !fileToHeaderFact.has(element.file)) {
      fileToHeaderFact.set(element.file, element.headerFact);
    }
  }
  return fileToHeaderFact;
}

/**
 * Build the 11-field validation report from state + graph (R-PHASE-6-C
 * locked schema, R-PHASE-6-F file-grain header counts).
 *
 *   valid_edge_count         — edges with resolutionStatus='resolved'
 *   unresolved_count         — edges with resolutionStatus='unresolved'
 *   ambiguous_count          — edges with resolutionStatus='ambiguous'
 *   external_count           — edges with resolutionStatus='external'
 *   builtin_count            — edges with resolutionStatus='builtin'
 *   header_defined_count     — files with headerStatus='defined'
 *   header_missing_count     — files with headerStatus='missing'
 *   header_stale_count       — files with headerStatus='stale'
 *   header_partial_count     — files with headerStatus='partial'
 *   header_layer_mismatch_count  — files with defined-but-bad-layer (SH-1)
 *   header_export_mismatch_count — files with headerStatus='stale' (SH-2)
 *
 * Layer/export mismatch counts are recomputed inline rather than passed in
 * to keep buildReport self-contained against the validator's pure-function
 * contract.
 */
function buildReport(state: PipelineState, graph: ExportedGraph): ValidationReport {
  let valid_edge_count = 0;
  let unresolved_count = 0;
  let ambiguous_count = 0;
  let external_count = 0;
  let builtin_count = 0;
  for (const edge of graph.edges) {
    switch (edge.resolutionStatus) {
      case 'resolved':
        valid_edge_count++;
        break;
      case 'unresolved':
        unresolved_count++;
        break;
      case 'ambiguous':
        ambiguous_count++;
        break;
      case 'external':
        external_count++;
        break;
      case 'builtin':
        builtin_count++;
        break;
      default:
        break;
    }
  }

  const fileToStatus = buildFileHeaderStatusMap(graph);
  let header_defined_count = 0;
  let header_missing_count = 0;
  let header_stale_count = 0;
  let header_partial_count = 0;
  for (const status of fileToStatus.values()) {
    switch (status) {
      case 'defined':
        header_defined_count++;
        break;
      case 'missing':
        header_missing_count++;
        break;
      case 'stale':
        header_stale_count++;
        break;
      case 'partial':
        header_partial_count++;
        break;
      default:
        break;
    }
  }

  const fileToHeaderFact = buildFileHeaderFactMap(state);
  // header_export_mismatch_count == header_stale_count by SH-2 definition.
  const header_export_mismatch_count = header_stale_count;
  // header_layer_mismatch_count: defined-but-not-in-enum (SH-1).
  let header_layer_mismatch_count = 0;
  // Note: the validator caller supplies layerEnum to checkSemanticHeaders
  // but buildReport runs without options — so we cannot recompute SH-1 here.
  // Instead, the count is derived by the caller in validatePipelineState
  // and patched into the report. See validatePipelineState.
  void fileToHeaderFact;

  return {
    valid_edge_count,
    unresolved_count,
    ambiguous_count,
    external_count,
    builtin_count,
    header_defined_count,
    header_missing_count,
    header_stale_count,
    header_partial_count,
    header_layer_mismatch_count,
    header_export_mismatch_count,
  };
}

/**
 * Build a Map<file, HeaderStatus> from file-grain graph nodes (R-PHASE-6-F,
 * WO-RAG-INDEX-TWO-GRAIN-DROP-002). graph-builder.ts stamps headerStatus onto
 * file-grain pseudo-nodes (metadata.fileGrain===true) using first-seen-wins
 * per file — same policy as the prior state.elements iteration. Only file-grain
 * nodes carry headerStatus; element-grain nodes are skipped.
 *
 * Exported for use by tasks 1.8 / 1.9 implementations and unit tests.
 */
export function buildFileHeaderStatusMap(graph: ExportedGraph): Map<string, HeaderStatus> {
  const fileToStatus = new Map<string, HeaderStatus>();
  for (const node of graph.nodes) {
    if (!node.metadata?.fileGrain) continue;
    const hs = node.metadata?.headerStatus;
    if (hs !== undefined && node.file !== undefined && !fileToStatus.has(node.file)) {
      fileToStatus.set(node.file, hs as HeaderStatus);
    }
  }
  return fileToStatus;
}

/** Re-exported relationship enum for downstream test fixtures. */
export const VALID_EDGE_RELATIONSHIPS = VALID_RELATIONSHIPS;

/** Re-exported resolutionStatus enum for downstream test fixtures. */
export const VALID_EDGE_RESOLUTION_STATUSES = VALID_RESOLUTION_STATUSES;
