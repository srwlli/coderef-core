/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability mcp-shared-substrate
 * @exports ToolHandlers, HandlerContext, ArtifactCache, IndexElement, IndexData, emptyCache, attachStaleness, BuildHintError, loadGraph, loadIndex, loadValidationReport, loadCanonical, resolveNodes, nodeSummary, clampLimit, ambiguous, notFound, isTestFile, isDemoFile, edgeConfidenceOf, computeChangedElements, DEFAULT_LIMIT, MAX_LIMIT
 */

/**
 * Shared substrate for the coderef-mcp-server tool families — extracted
 * VERBATIM from the pre-split monolith (WO-DECOMPOSE-CODEREF-MCP-SERVER-
 * MONOLITH-001 P1): the mtime-invalidated per-repo ArtifactCache, the bounded
 * build-if-missing loaders (ensureArtifacts -> loadGraph/loadIndex/
 * loadCanonical), the Phase-8 staleness attach, element resolution +
 * ambiguity/not-found envelopes, test/demo-file detection, edge-confidence
 * tiering, the shared diff->changed-elements front half, and the ToolHandlers
 * contract every family implements a slice of. Semantics unchanged; the only
 * edit is findPopulateBin's __dirname candidates (this file lives one
 * directory deeper than the old monolith).
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ExportedGraph } from '../../export/graph-exporter.js';
import type { ValidationReport } from '../../pipeline/output-validator.js';
import { CanonicalGraphQuery } from '../../query/canonical-graph.js';
import { type EdgeConfidenceTier, classifyEdgeConfidence } from '../../pipeline/edge-confidence.js';
import { type StalenessResult, checkStaleness } from '../../query/staleness-check.js';
import { parseDiffToChangedElements } from '../../query/changed-elements.js';
import { normalizeSlashes } from '../../utils/path-normalize.js';
import type { ResponseFormat } from '../mcp-response-format.js';

export type ExportedNode = ExportedGraph['nodes'][number];
export type ExportedEdge = ExportedGraph['edges'][number];

export const DEFAULT_LIMIT = 25;

// ---- build-if-missing bounds (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P4) ----------
// RISK-04: auto-build must be BOUNDED. Above this source-file ceiling the server
// returns a "run populate first" hint instead of spawning a potentially long
// in-process build (which would block the tool call / risk a hang).
const AUTO_BUILD_FILE_CEILING = 4000;
// Hard wall-clock cap on the spawned populate build (ms). A build that exceeds
// this is killed and surfaced as a clear error, never an indefinite hang.
const AUTO_BUILD_TIMEOUT_MS = 10 * 60 * 1000;
// Source extensions counted for staleness + the file-ceiling check.
const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|cpp|cc|h|hpp)$/;
export const MAX_LIMIT = 100;

// ---- index.json element shape (subset we surface) -----------------------------

export interface IndexElement {
  type: string;
  name: string;
  file: string;
  line: number;
  exported?: boolean;
  headerStatus?: string;
  codeRefId?: string;
  layer?: string;
  capability?: string;
  [key: string]: unknown;
}

export interface IndexData {
  schemaVersion?: string;
  generatedAt?: string;
  totalElements?: number;
  elementsByType?: Record<string, number>;
  elements: IndexElement[];
}

// ValidationReport is imported (type-only) from output-validator.ts at the top
// of this file (STUB-2CM92P) — the former hand-mirrored local interface lived
// here and is now retired.

// ---- artifact cache (mtime-invalidated) ----------------------------------------

export interface ArtifactCache {
  graph: ExportedGraph | null;
  graphMtimeMs: number;
  index: IndexData | null;
  indexMtimeMs: number;
  /** Reverse adjacency over resolved edges: targetId -> source edges. */
  inbound: Map<string, ExportedEdge[]>;
  nodeById: Map<string, ExportedNode>;
  /**
   * Canonical-graph query engine (outbound + path traversal), built lazily
   * from the same graph.json the cache already parsed. Reused rather than
   * re-implemented so the direction-correct forward/path semantics stay
   * pinned by src/query/__tests__/canonical-graph.test.ts. Invalidated
   * together with `graph` on mtime change.
   */
  canonical: CanonicalGraphQuery | null;
  /**
   * Build-if-missing guard (P4): once a spawned populate build has run in this
   * server's lifetime we do NOT auto-build again on the same absent/stale
   * condition — prevents a rebuild loop if the build produced nothing usable.
   * Reset only when a fresh build is deliberately triggered by staleness.
   */
  buildAttempted: boolean;
}

export function emptyCache(): ArtifactCache {
  return {
    graph: null,
    graphMtimeMs: 0,
    index: null,
    indexMtimeMs: 0,
    inbound: new Map(),
    nodeById: new Map(),
    canonical: null,
    buildAttempted: false,
  };
}

/**
 * Locate the populate-coderef CLI bin. The MCP server runs from
 * dist/src/cli/mcp/shared.js, so the CLI bins live one directory up (dist/src/cli/).
 * Returns null when it cannot be found (source-mode / unbuilt) — the caller
 * then surfaces a clear "run populate first" hint rather than auto-building.
 */
function findPopulateBin(): string | null {
  // Built (normal) run: __dirname = <repo>/dist/src/cli, sibling populate.js.
  // Source/test run (vitest): __dirname = <repo>/src/cli, no built sibling — so
  // also probe the built copy by walking up to a plausible repo root. The repo
  // root is 2 levels above BOTH src/cli and dist/src/cli's parent-of-parent, so
  // derive it and join dist/src/cli/populate.js.
  const candidates = [
    path.join(__dirname, '..', 'populate.js'),                            // dist run: dist/src/cli/mcp -> parent dir
    path.join(__dirname, '..', '..', '..', 'dist', 'src', 'cli', 'populate.js'),      // src/cli/mcp run: <repo>/dist/...
    path.join(__dirname, '..', '..', '..', '..', 'dist', 'src', 'cli', 'populate.js'), // deep-nested run
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      // try next
    }
  }
  return null;
}

/** Newest source-file mtime under projectDir + a count, bounded walk (skips .coderef, node_modules, .git). */
function scanSources(projectDir: string): { newestMtimeMs: number; count: number } {
  let newest = 0;
  let count = 0;
  const SKIP = new Set(['.coderef', 'node_modules', '.git', 'dist', '.vscode', 'coverage']);
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        walk(path.join(dir, e.name));
      } else if (e.isFile() && SOURCE_EXT_RE.test(e.name)) {
        count++;
        try {
          const m = fs.statSync(path.join(dir, e.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch {
          // ignore unreadable file
        }
      }
    }
  };
  walk(projectDir);
  return { newestMtimeMs: newest, count };
}

// ---- Phase-8 staleness attach (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001) ------
// Every read response carries a `staleness` block reporting whether any source
// file has changed since graph.json was built (authoritative hash-manifest basis;
// mtime fallback when no manifest). Computed once per (root, graph.json mtime) and
// cached so a hot server does not re-walk/re-hash on every tool call.

interface StalenessCacheEntry {
  graphMtimeMs: number;
  result: StalenessResult;
}
const stalenessCache = new Map<string, StalenessCacheEntry>();

/** Compute (or reuse) the staleness verdict for a repo, keyed on graph.json mtime. */
function computeStaleness(projectDir: string): StalenessResult | null {
  const graphPath = path.join(projectDir, '.coderef', 'graph.json');
  let graphMtimeMs: number;
  try {
    graphMtimeMs = fs.statSync(graphPath).mtimeMs;
  } catch {
    return null; // no graph.json — nothing to report a freshness baseline against
  }
  const cached = stalenessCache.get(projectDir);
  if (cached && cached.graphMtimeMs === graphMtimeMs) return cached.result;
  const result = checkStaleness(projectDir);
  stalenessCache.set(projectDir, { graphMtimeMs, result });
  return result;
}

/**
 * Attach the compact staleness block to a successful tool payload, in place.
 * Additive + non-clobbering: skips error envelopes (they carry an `error` key) and
 * never overwrites a handler's own `staleness` field. The block is small by design
 * — `{ stale, stale_count }` always, plus `stale_files_sample`/`basis`/`hint`/`note`
 * only when stale — so it is format-agnostic (no response_format gating needed).
 * Best-effort: any failure leaves the payload untouched (a freshness check must
 * never break a read tool).
 */
export function attachStaleness(payload: Record<string, unknown>, project_root: string, anchor: string): void {
  try {
    if (payload == null || typeof payload !== 'object') return;
    if ('error' in payload) return; // never annotate an error envelope
    if ('staleness' in payload) return; // handler already set it — do not clobber
    const canonical = fs.realpathSync(path.resolve(anchor, project_root));
    const result = computeStaleness(canonical);
    if (!result) return;
    payload.staleness = result.stale
      ? result // full block when stale: count + sample + basis + hint + note
      : { stale: false, stale_count: 0, basis: result.basis }; // compact when fresh
  } catch {
    // best-effort — leave the payload as-is
  }
}

/**
 * Tagged error carrying an agent-facing hint. loadGraph/loadIndex throw this
 * when artifacts are absent/stale AND auto-build is not possible or not
 * appropriate (bin missing, or file-count over the ceiling). The tool-call
 * wrapper already surfaces thrown errors; this makes the message actionable.
 */
export class BuildHintError extends Error {
  constructor(public hint: string, public detail?: string) {
    super(hint);
    this.name = 'BuildHintError';
  }
}

/**
 * Build-if-missing / build-if-stale (P4, ADJ-02: spawn the populate CLI).
 * Called at the top of loadGraph/loadIndex. Returns silently when the artifacts
 * are present + fresh. When absent (or source is newer than graph.json AND the
 * repo is under the file ceiling), spawns `node populate.js <projectDir>` ONCE
 * to produce them via the exact tested persist path. Throws BuildHintError when
 * it cannot/should not auto-build (bin missing, over ceiling, or build failed).
 */
function ensureArtifacts(projectDir: string, cache: ArtifactCache): void {
  const graphPath = path.join(projectDir, '.coderef', 'graph.json');
  const indexPath = path.join(projectDir, '.coderef', 'index.json');
  const graphExists = fs.existsSync(graphPath);
  const indexExists = fs.existsSync(indexPath);

  let reason: 'absent' | 'stale' | null = null;
  if (!graphExists || !indexExists) {
    reason = 'absent';
  } else {
    // Staleness: any source file newer than graph.json → stale (bounded).
    const graphMtime = fs.statSync(graphPath).mtimeMs;
    const { newestMtimeMs, count } = scanSources(projectDir);
    if (newestMtimeMs > graphMtime) {
      if (count > AUTO_BUILD_FILE_CEILING) {
        // Over the ceiling: do NOT auto-rebuild (RISK-04). Serve the stale
        // artifacts but tell the agent they're stale + how to refresh.
        console.error(
          `[coderef-mcp] artifacts STALE (${count} source files > ${AUTO_BUILD_FILE_CEILING} ceiling) — serving existing graph.json; run populate to refresh.`,
        );
        return;
      }
      reason = 'stale';
    }
  }

  if (reason === null) return; // present + fresh

  // Guard: only auto-build once per (absent) condition to avoid a rebuild loop.
  if (reason === 'absent' && cache.buildAttempted) {
    throw new BuildHintError(
      'coderef_artifacts_missing',
      `.coderef/ artifacts are still absent after a build attempt at ${projectDir}. Run 'populate-coderef ${projectDir}' manually and check its output.`,
    );
  }

  const { count } = scanSources(projectDir);
  if (reason === 'absent' && count > AUTO_BUILD_FILE_CEILING) {
    throw new BuildHintError(
      'repo_too_large_for_auto_build',
      `${count} source files exceed the ${AUTO_BUILD_FILE_CEILING} auto-build ceiling. Run 'populate-coderef ${projectDir}' once; subsequent tool calls will use the built index.`,
    );
  }

  const bin = findPopulateBin();
  if (!bin) {
    throw new BuildHintError(
      'coderef_artifacts_missing',
      `No .coderef/ index at ${projectDir} and the populate CLI could not be located for auto-build. Run 'populate-coderef ${projectDir}' first.`,
    );
  }

  console.error(
    `[coderef-mcp] .coderef/ ${reason} — building index in-process (first call may be slow)…`,
  );
  cache.buildAttempted = true;
  const res = spawnSync('node', [bin, projectDir], {
    cwd: projectDir,
    encoding: 'utf8',
    timeout: AUTO_BUILD_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'ignore', 'inherit'], // populate diagnostics → our stderr
  });
  if (res.error || res.status !== 0) {
    throw new BuildHintError(
      'coderef_build_failed',
      `Auto-build via populate failed: ${String(res.error?.message ?? `exit ${res.status}`).slice(0, 200)}. Run 'populate-coderef ${projectDir}' manually.`,
    );
  }
  if (!fs.existsSync(graphPath) || !fs.existsSync(indexPath)) {
    throw new BuildHintError(
      'coderef_build_incomplete',
      `populate completed but ${!fs.existsSync(graphPath) ? 'graph.json' : 'index.json'} was not produced. Check the populate output.`,
    );
  }
  console.error('[coderef-mcp] build complete.');
  // A fresh build means the mtime cache is stale — force a re-read below.
  cache.graphMtimeMs = 0;
  cache.indexMtimeMs = 0;
}

export function loadGraph(projectDir: string, cache: ArtifactCache): ExportedGraph {
  ensureArtifacts(projectDir, cache);
  const graphPath = path.join(projectDir, '.coderef', 'graph.json');
  const stat = fs.statSync(graphPath); // throws if missing — surfaced as tool error
  if (cache.graph && stat.mtimeMs === cache.graphMtimeMs) {
    return cache.graph;
  }
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8')) as ExportedGraph;
  cache.graph = graph;
  cache.graphMtimeMs = stat.mtimeMs;
  cache.canonical = null; // invalidate the query engine; rebuilt lazily below

  cache.nodeById = new Map();
  for (const node of graph.nodes) cache.nodeById.set(node.id, node);

  // Reverse adjacency over RESOLVED edges only — unresolved/external/builtin
  // edges have no targetId to traverse.
  cache.inbound = new Map();
  for (const edge of graph.edges) {
    if (edge.resolutionStatus !== 'resolved' || !edge.targetId || !edge.sourceId) continue;
    const list = cache.inbound.get(edge.targetId);
    if (list) list.push(edge);
    else cache.inbound.set(edge.targetId, [edge]);
  }
  console.error(
    `[coderef-mcp] graph.json loaded: ${graph.nodes.length} nodes, ${graph.edges.length} edges`,
  );
  return graph;
}

export function loadIndex(projectDir: string, cache: ArtifactCache): IndexData {
  ensureArtifacts(projectDir, cache);
  const indexPath = path.join(projectDir, '.coderef', 'index.json');
  const stat = fs.statSync(indexPath);
  if (cache.index && stat.mtimeMs === cache.indexMtimeMs) {
    return cache.index;
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as IndexData;
  cache.index = index;
  cache.indexMtimeMs = stat.mtimeMs;
  console.error(`[coderef-mcp] index.json loaded: ${index.elements.length} elements`);
  return index;
}

export function loadValidationReport(projectDir: string): ValidationReport {
  const reportPath = path.join(projectDir, '.coderef', 'validation-report.json');
  return JSON.parse(fs.readFileSync(reportPath, 'utf8')) as ValidationReport;
}

/**
 * Lazily build (and cache) the CanonicalGraphQuery engine from the graph the
 * artifact cache already loaded. loadGraph() must run first (it refreshes the
 * cache + nulls `canonical` on mtime change); this wraps the same in-memory
 * ExportedGraph in the direction-correct outbound/path query engine used by
 * coderef-query, avoiding a second parse or a divergent adjacency map.
 */
export function loadCanonical(projectDir: string, cache: ArtifactCache): CanonicalGraphQuery {
  const graph = loadGraph(projectDir, cache);
  if (!cache.canonical) {
    cache.canonical = new CanonicalGraphQuery(graph);
  }
  return cache.canonical;
}

// ---- element resolution --------------------------------------------------------

export interface Resolution {
  nodes: ExportedNode[];
  /**
   * True when the query named a whole file — every element in that file is
   * a legitimate target (impact/calls aggregate over them), NOT an
   * ambiguity to refuse.
   */
  byFile: boolean;
}

/**
 * Resolve a free-form query (codeRefId, element name, or file path) to graph
 * nodes. Precedence: exact id, exact codeRefIdNoLine, exact name, exact file
 * path (slash-normalized — returns ALL elements of the file), then
 * case-insensitive substring over id/name/file.
 */
export function resolveNodes(query: string, graph: ExportedGraph): Resolution {
  const exact = graph.nodes.filter(n => n.id === query);
  if (exact.length > 0) return { nodes: exact, byFile: false };

  const noLine = graph.nodes.filter(n => n.metadata?.codeRefIdNoLine === query);
  if (noLine.length > 0) return { nodes: noLine, byFile: false };

  const byName = graph.nodes.filter(n => n.name === query);
  if (byName.length > 0) return { nodes: byName, byFile: false };

  const qPath = normalizeSlashes(query).replace(/^@File\//, '');
  const byFile = graph.nodes.filter(n => normalizeSlashes((n.file ?? '')) === qPath);
  if (byFile.length > 0) return { nodes: byFile, byFile: true };

  const q = query.toLowerCase();
  return {
    nodes: graph.nodes.filter(
      n =>
        n.id.toLowerCase().includes(q) ||
        (n.name ?? '').toLowerCase().includes(q) ||
        (n.file ?? '').toLowerCase().includes(q),
    ),
    byFile: false,
  };
}

export function nodeSummary(node: ExportedNode): Record<string, unknown> {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    file: node.file,
    line: node.line,
  };
}

export function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

/** Ambiguity envelope: >5 matches means the query needs narrowing. */
export function ambiguous(query: string, matches: ExportedNode[]): Record<string, unknown> {
  return {
    error: 'ambiguous_element',
    query,
    match_count: matches.length,
    hint: 'Narrow the query — pass a full codeRefId (see candidates) or a file-qualified name.',
    candidates: matches.slice(0, 5).map(nodeSummary),
  };
}

export function notFound(query: string): Record<string, unknown> {
  return {
    error: 'element_not_found',
    query,
    hint: 'Try find_element with a shorter substring, or re-run the pipeline if the graph is stale.',
  };
}

// ---- tool handlers (exported for behavioral tests — P3-T4) ----------------------

export interface ToolHandlers {
  // Phase 6 (STUB-8H3YV0): list tools gain a shared response_format ('concise' |
  // 'detailed', default detailed = today's shape) verbosity projection and a
  // generalized offset for pagination. Absent params preserve current behavior.
  what_calls(args: { element: string; limit?: number; offset?: number; min_confidence?: EdgeConfidenceTier; response_format?: ResponseFormat }): Record<string, unknown>;
  what_imports(args: { element: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  impact_of(args: { element: string; max_depth?: number; limit?: number; offset?: number; min_confidence?: EdgeConfidenceTier; response_format?: ResponseFormat }): Record<string, unknown>;
  find_element(args: { query: string; type?: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  codebase_summary(): Record<string, unknown>;
  validation_status(): Record<string, unknown>;
  // v2 tools (WO-MCP-V2-TOOLS-AND-PS-VALIDATION-001 P1)
  hotspots(args: { limit?: number; offset?: number; src_only?: boolean; response_format?: ResponseFormat }): Record<string, unknown>;
  cycles(args: { limit?: number; offset?: number; relationship?: 'call' | 'import'; response_format?: ResponseFormat }): Record<string, unknown>;
  what_exports(args: { file: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  // v2 flow tools (P2)
  diff_impact(args: { ref?: string; max_depth?: number; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  // diff-to-test-selection (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P1)
  tests_for_change(args: { ref?: string; max_depth?: number; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  // structural AST pattern search (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P3)
  ast_search(args: { query: string; lang: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Promise<Record<string, unknown>>;
  // class/interface supertype+subtype hierarchy (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P5)
  type_hierarchy(args: { element: string; direction?: 'up' | 'down' | 'both'; max_depth?: number; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  // exported-API-surface diff over a snapshot baseline (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P6)
  api_diff(args: { before?: string; after?: string; snapshot?: boolean; snapshot_label?: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  // declared architecture-constraint check over observed layer edges (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P7)
  dependency_rules(args: { limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  change_dossier(args: { ref?: string; max_depth?: number }): Record<string, unknown>;
  // per-element docstring presence + text surface (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P8)
  docstrings(args: { element?: string; documented?: boolean; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  clones(args: { filter?: string; min_group_size?: number; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  scip_resolution_delta(args: { scip_path?: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  rag_search(args: { query: string; limit?: number; offset?: number; hybrid?: boolean; expand?: boolean; neighbor_limit?: number; lane?: 'auto' | 'lexical' | 'semantic'; response_format?: ResponseFormat }): Promise<Record<string, unknown>>;
  // agent-native outbound + path tools (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P1)
  what_this_calls(args: { element: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  what_this_imports(args: { element: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  what_this_depends_on(args: { element: string; max_depth?: number; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  path_between(args: { source: string; target: string; mode?: 'shortest' | 'all'; max_depth?: number; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  // agent-native non-resolved-edge exposure (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P2)
  unresolved_edges(args: {
    relationship?: 'call' | 'import';
    status?: 'unresolved' | 'ambiguous' | 'external' | 'builtin';
    file?: string;
    reason?: string;
    offset?: number;
    limit?: number;
    response_format?: ResponseFormat;
  }): Record<string, unknown>;
  // agent-native source-body + find-all-references (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P3)
  source_of(args: { element: string; context?: number; max_chars?: number }): Record<string, unknown>;
  find_all_references(args: { element: string; limit?: number; offset?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  // Consolidated symbol card (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P7):
  // ONE call joining identity + header presence + the 1-hop neighborhood +
  // references + test-linkage + mtime-staleness — the ~5-round-trip
  // understand-before-edit workflow collapsed to a single tool. A JOIN over
  // existing substrate, not new analysis. cap bounds each facet; include_source
  // opts in the signature slice; response_format honors the Phase 6 axis.
  symbol_context(args: { element: string; include_source?: boolean; cap?: number; response_format?: ResponseFormat }): Record<string, unknown>;
  // CLI/MCP parity (WO-...-CLI-MCP-PARITY-001 P6).
  // READ tools — wrap a clean substrate export, return synchronously.
  pack_context(args: { element: string; token_budget?: number; full_deps?: boolean; include_callers?: boolean }): Record<string, unknown>;
  rename_preview(args: { old_name: string; new_name: string; min_confidence?: EdgeConfidenceTier }): Record<string, unknown>;
  // .coderef-WRITE / status tools — async (delegate to the extracted pipelines /
  // async status readout). Writes are confined to <projectDir>/.coderef/.
  rag_status(): Promise<Record<string, unknown>>;
  orient(args: { token_budget?: number }): Record<string, unknown>;
  reindex(args: { incremental?: boolean }): Promise<Record<string, unknown>>;
  // concurrency: Ollama embed worker-pool size (speeds up indexing, output
  // unchanged). embed_cache: chunk-grain cache toggle (default ON).
  // WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P5.
  rag_index(args: { concurrency?: number; embed_cache?: boolean }): Promise<Record<string, unknown>>;
  // Agent parity for coderef-map (WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 P5;
  // git-behavioral opt-in WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2).
  map(args: { refresh?: boolean; format?: string; token_budget?: number; git?: boolean }): Record<string, unknown>;
  // Verified-refactor delta (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P11):
  // snapshot the five MapMetrics families, then diff before/after into a
  // DECOMPOSED per-family factor vector (never a composite score) so an agent can
  // PROVE a refactor improved the target family without regressing others. snapshot
  // copies the current data.metrics to a sidecar; before/after resolve from a
  // snapshot label or an explicit data.json path. response_format honors Phase 6.
  map_metrics_delta(args: {
    before?: string;
    after?: string;
    snapshot?: boolean;
    snapshot_label?: string;
    response_format?: ResponseFormat;
  }): Record<string, unknown>;
}

/** Test-origin file detection (mirrors graph-builder's TEST_ORIGIN_RE). */
const TEST_FILE_RE = /__tests__|\.test\.|\.spec\./;

export function isTestFile(file: string | undefined): boolean {
  return TEST_FILE_RE.test(normalizeSlashes((file ?? '')));
}

/**
 * Demo/example file detection (STUB-4NYW5W, WO-RESOLVER-SYMBOL-TABLE-DEDUP-FIX-001
 * Phase 4). Under src_only, demo/example scaffolding pollutes the hotspot leverage
 * signal — e.g. demo-all-modules.ts#main ranked in the src_only top-8 with fan_out 86,
 * a fan-out that reflects the demo touring every module, not real architectural load.
 *
 * PATH-ANCHORED, never a substring match: this must NOT drop a real src file whose
 * basename merely contains "example" (e.g. src/context/example-extractor.ts). The
 * first arm matches an `examples/` PATH SEGMENT; the second matches a `demo-` prefixed
 * BASENAME with a JS/TS extension (covers demo-*.ts and root demo-all-modules.ts).
 */
const DEMO_FILE_RE = /(^|\/)examples\/|(^|\/)demo-[^/]*\.(?:ts|tsx|js|jsx|mjs|cjs)$/;

export function isDemoFile(file: string | undefined): boolean {
  return DEMO_FILE_RE.test(normalizeSlashes((file ?? '')));
}

/**
 * The confidence TIER of a canonical edge (Phase 3). Prefers the tier the
 * builder stamped onto the edge; falls back to recomputing it from
 * (resolutionStatus, reason, evidence.confidence) so a pre-Phase-3 graph.json
 * (no `confidence` field) still yields a correct tier. Pure + deterministic.
 */
export function edgeConfidenceOf(edge: ExportedGraph['edges'][number]): EdgeConfidenceTier {
  if (typeof edge.confidence === 'string') return edge.confidence;
  const ev = edge.evidence as { confidence?: unknown } | undefined;
  const evidenceConfidence = typeof ev?.confidence === 'string' ? ev.confidence : undefined;
  return classifyEdgeConfidence(edge.resolutionStatus, edge.reason, evidenceConfidence);
}

/**
 * Map a git diff onto the set of changed INDEX ELEMENTS — the shared front half
 * of diff_impact AND tests_for_change (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001
 * Phase 1). Runs a zero-context read-only `git diff`, parses the new-side hunk
 * ranges, and attributes each range to its enclosing element (the closest
 * preceding element owns `[its line, next element's line)`). Returns the changed
 * elements keyed by codeRefId plus the changed-file count, or a structured
 * `error` envelope when the git diff fails. Extracted so the two tools cannot
 * drift on how a diff becomes a set of changed elements.
 */
export function computeChangedElements(
  projectDir: string,
  cache: ArtifactCache,
  gitRef: string,
): { changedElements: Map<string, IndexElement>; changedFileCount: number } | { error: Record<string, unknown> } {
  const index = loadIndex(projectDir, cache);

  // Read-only git: diff the working tree (or a ref range) with zero context so
  // hunk headers map cleanly onto line ranges.
  const gitArgs = ['diff', '-U0', '--no-color'];
  if (gitRef !== 'WORKTREE') gitArgs.push(gitRef);
  const res = spawnSync('git', [...gitArgs, '--'], {
    cwd: projectDir,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error || res.status !== 0) {
    return {
      error: {
        error: 'git_diff_failed',
        ref: gitRef,
        detail: String(res.error?.message ?? res.stderr ?? `exit ${res.status}`).slice(0, 300),
        hint: 'Pass a valid git ref (default HEAD = working tree vs last commit).',
      },
    };
  }

  // Shared parse: diff text -> changed index elements (single seam). The map
  // values are the very IndexElement objects passed in, so the cast is sound.
  const parsed = parseDiffToChangedElements(res.stdout, index.elements);
  return {
    changedElements: parsed.changedElements as Map<string, unknown> as Map<string, IndexElement>,
    changedFileCount: parsed.changedFileCount,
  };
}

/** Per-repo handler-construction context shared by the mcp/ tool families. */
export interface HandlerContext {
  projectDir: string;
  cache: ArtifactCache;
}
