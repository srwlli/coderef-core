#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability coderef-mcp-server
 * @exports buildToolHandlers, handlersFor, errorPayload, ToolHandlers
 */

/**
 * coderef-mcp-server — stdio MCP server exposing code-intelligence tools over
 * .coderef/ artifacts. Most tools are READ-only; a small set of WRITE tools
 * (reindex, rag_index) regenerate the .coderef/ substrate itself.
 *
 * REPO-AGNOSTIC per WO-MCP-REPO-AGNOSTIC-ANY-REPO-001 (2026-07-14):
 * project_root is REQUIRED on every tool; the server resolves and serves
 * whichever repo the caller names — pure CLI semantics. There is NO default
 * repo, NO cwd walk-up, NO env fallback; omitting project_root is a
 * schema-level rejection. One handler set (with its artifact cache) is
 * memoized per distinct canonical root (handlersFor registry); the launch
 * --project-dir arg is only an ANCHOR for resolving relative project_root
 * paths. Resolution failures return structured { error, project_root, hint }
 * envelopes (see RESOLUTION-DESIGN.md taxonomy) — never another repo's data.
 *
 * WRITE CONFINEMENT (contract): all writes (reindex, rag_index) are confined
 * to <project_root>/.coderef/ PER TOOL CALL — writes are per-repo, never
 * cached to the launch root. It NEVER mutates arbitrary source. This is
 * guaranteed structurally by DELEGATING to the existing populate / rag-index
 * pipelines (which only ever write .coderef/) rather than opening a new write
 * path or an output-dir argument. SOURCE mutation (coderef-rename --apply) is
 * deliberately NOT exposed: MCP offers rename only as a dry-run PREVIEW
 * (rename_preview).
 *
 * WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 Phase 3;
 * CLI/MCP parity Phase 6 (pack_context, rename_preview, rag_status, reindex,
 * rag_index).
 *
 * Built INSIDE coderef-core (not as an external consumer) so the graph read
 * path is typed against ExportedGraph from src/export/graph-exporter.ts —
 * a future edge-schema change becomes a COMPILE error here instead of the
 * silent wrong-answers the external Python coderef-context server produced
 * after the sourceId/targetId/relationship migration.
 *
 * Tools (compact pre-summarized responses — never raw graph dumps; responses
 * are consumed by LLM agents where tokens are the budget). READ tools unless
 * marked [.coderef-WRITE]:
 *   what_calls           - inbound resolved call edges to an element
 *   what_imports         - inbound resolved import edges to an element
 *   impact_of            - transitive inbound dependents (reverse BFS)
 *   what_this_calls      - outbound resolved call edges FROM an element
 *   what_this_imports    - outbound resolved import edges FROM an element
 *   what_this_depends_on - transitive outbound dependencies (forward BFS)
 *   path_between         - directed path(s) source->target (shortest | all)
 *   unresolved_edges     - enumerate non-resolved call/import edges + evidence
 *   source_of            - an element's source slice from disk (no RAG)
 *   find_all_references  - union call + import + type-only references
 *   find_element         - element lookup in .coderef/index.json
 *   codebase_summary     - totals, type distribution, header coverage, edges
 *   validation_status    - the locked 14-field validation report verbatim
 *   pack_context         - focus + dependency-closure context bundle (read)
 *   rename_preview       - dry-run symbol-rename plan (read; NO apply path)
 *   rag_status           - RAG index/vector metadata + health (read)
 *   reindex              - [.coderef-WRITE] regenerate the .coderef/ substrate
 *   rag_index            - [.coderef-WRITE] build the RAG index (local Ollama)
 *   map                  - [.coderef-WRITE] file-level map data + bundled viewer (.coderef/map/)
 *
 * Protocol discipline: stdout belongs to the MCP transport. ALL diagnostics
 * go to stderr (same rule as populate --json; see populate.ts P1-T3 fix).
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
// Standard subpath specifiers: TS (node10 resolution) finds types via the
// SDK's typesVersions map (dist/esm/*.d.ts); Node's CJS require resolves the
// same specifier via the exports map to dist/cjs/*. Do NOT import dist paths
// directly — typesVersions double-maps them and type resolution breaks.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { packContext } from '../context/context-packer.js';
import type { ExportedGraph } from '../export/graph-exporter.js';
// STUB-2CM92P: canonical ValidationReport shape (type-only — erased at compile,
// no runtime coupling), replacing the former hand-mirrored local interface that
// drifted from canonical and broke tsconfig.cli.json on every field change.
import type { ValidationReport } from '../pipeline/output-validator.js';
import { ALL_PATHS_MAX, CanonicalGraphQuery } from '../query/canonical-graph.js';
import { type EdgeConfidenceTier, classifyEdgeConfidence, meetsMinConfidence } from '../pipeline/edge-confidence.js';
import { type EgoGraph, egoGraphOf } from '../query/ego-graph.js';
import { type SymbolContext, assembleSymbolContext } from '../query/symbol-context.js';
import { computeTestsForChange } from '../query/tests-for-change.js';
import { parseDiffToChangedElements } from '../query/changed-elements.js';
import { searchAst, computeNotSearchedCounts, AST_SEARCH_LANG_EXTENSIONS, type AstSearchFile, type AstSearchElement } from '../search/ast-search.js';
import { listLanguageFilesOnDisk } from '../search/language-files.js';
import { computeTypeHierarchy, type TypeHierarchyDirection } from '../query/type-hierarchy.js';
import { extractExportsManifest, diffApiSurface, type ExportsManifest, type ManifestElement } from '../query/api-diff.js';
import {
  parseRulesSpec, projectLayerEdges, checkDependencyRules,
  type DependencyRulesNode, type DependencyRulesEdge,
} from '../query/dependency-rules.js';
import { isTestLikeFile } from '../map/graph-analytics.js';
import { type StalenessResult, checkStaleness } from '../query/staleness-check.js';
import {
  type ResponseFormat,
  isConcise,
  paginate,
  shapeResponse,
} from './mcp-response-format.js';
import {
  type SearchLane,
  classifyQuery,
  lexicalSearch,
} from '../integration/rag/search-router.js';
import { planRename } from '../refactor/rename-planner.js';
import { normalizeSlashes } from '../utils/path-normalize.js';
// P6 CLI/MCP parity (WO-...-CLI-MCP-PARITY-001): the two .coderef/-WRITE tools
// (reindex, rag_index) and rag_status DELEGATE to the existing CLI pipelines'
// EXTRACTED cores — never a new write path. These functions write ONLY under
// <projectDir>/.coderef/. Source mutation (rename --apply) stays CLI-ONLY: MCP
// exposes rename only as a PREVIEW (rename_preview), no apply arg.
import { defaultPopulateArgs, runPopulate } from './populate.js';
import { defaultRagIndexArgs, runRagIndex } from './rag-index.js';
import { readRagStatus } from './rag-status.js';
// Agent parity for coderef-map (WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 P5):
// the MCP map tool shares the CLI's extracted emission core — one write path,
// confined to <projectDir>/.coderef/map/.
import { generateMap } from '../map/emit-map.js';
import { emitSkeleton } from '../map/skeleton-map.js';
import type { MapMetrics } from '../map/engineering-metrics.js';
import { type MapMetricsDelta, type MetricsFamilyDelta, diffMapMetrics } from '../map/metrics-delta.js';

type ExportedNode = ExportedGraph['nodes'][number];
type ExportedEdge = ExportedGraph['edges'][number];

const SERVER_NAME = 'coderef-core';
const SERVER_VERSION = '1.0.0';
const DEFAULT_LIMIT = 25;

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
const MAX_LIMIT = 100;

// ---- index.json element shape (subset we surface) -----------------------------

interface IndexElement {
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

interface IndexData {
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

interface ArtifactCache {
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

function emptyCache(): ArtifactCache {
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
 * dist/src/cli/coderef-mcp-server.js, so its sibling is dist/src/cli/populate.js.
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
    path.join(__dirname, 'populate.js'),                                  // dist run: sibling
    path.join(__dirname, '..', '..', 'dist', 'src', 'cli', 'populate.js'),// src/cli run: <repo>/dist/...
    path.join(__dirname, '..', '..', '..', 'dist', 'src', 'cli', 'populate.js'), // deep-nested run
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
class BuildHintError extends Error {
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

function loadGraph(projectDir: string, cache: ArtifactCache): ExportedGraph {
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

function loadIndex(projectDir: string, cache: ArtifactCache): IndexData {
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

function loadValidationReport(projectDir: string): ValidationReport {
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
function loadCanonical(projectDir: string, cache: ArtifactCache): CanonicalGraphQuery {
  const graph = loadGraph(projectDir, cache);
  if (!cache.canonical) {
    cache.canonical = new CanonicalGraphQuery(graph);
  }
  return cache.canonical;
}

// ---- element resolution --------------------------------------------------------

interface Resolution {
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
function resolveNodes(query: string, graph: ExportedGraph): Resolution {
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

function nodeSummary(node: ExportedNode): Record<string, unknown> {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    file: node.file,
    line: node.line,
  };
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

/** Ambiguity envelope: >5 matches means the query needs narrowing. */
function ambiguous(query: string, matches: ExportedNode[]): Record<string, unknown> {
  return {
    error: 'ambiguous_element',
    query,
    match_count: matches.length,
    hint: 'Narrow the query — pass a full codeRefId (see candidates) or a file-qualified name.',
    candidates: matches.slice(0, 5).map(nodeSummary),
  };
}

function notFound(query: string): Record<string, unknown> {
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

function isTestFile(file: string | undefined): boolean {
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

function isDemoFile(file: string | undefined): boolean {
  return DEMO_FILE_RE.test(normalizeSlashes((file ?? '')));
}

/**
 * The confidence TIER of a canonical edge (Phase 3). Prefers the tier the
 * builder stamped onto the edge; falls back to recomputing it from
 * (resolutionStatus, reason, evidence.confidence) so a pre-Phase-3 graph.json
 * (no `confidence` field) still yields a correct tier. Pure + deterministic.
 */
function edgeConfidenceOf(edge: ExportedGraph['edges'][number]): EdgeConfidenceTier {
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
function computeChangedElements(
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

export function buildToolHandlers(projectDir: string): ToolHandlers {
  const cache = emptyCache();

  /** Inbound resolved edges of one relationship kind, across all of an element's nodes. */
  function inboundByKind(
    query: string,
    kind: 'call' | 'import',
    limit: number | undefined,
    minConfidence?: EdgeConfidenceTier,
    offset?: number,
    responseFormat?: ResponseFormat,
  ): Record<string, unknown> {
    const graph = loadGraph(projectDir, cache);
    const { nodes: matches, byFile } = resolveNodes(query, graph);
    if (matches.length === 0) return notFound(query);
    if (!byFile && matches.length > 5) return ambiguous(query, matches);

    // Phase 6: collect the FULL matching set, then window it via the shared
    // paginate() helper so offset can page past the first `limit`. total counts
    // inbound EDGES (a caller invoking the target twice counts twice).
    const all: Array<Record<string, unknown>> = [];
    for (const node of matches) {
      for (const edge of cache.inbound.get(node.id) ?? []) {
        if (edge.relationship !== kind) continue;
        // Phase 3: confidence tier is a within-resolved-set filter. cache.inbound
        // holds only resolved edges, so min_confidence differentiates exact vs
        // heuristic (provisional single-candidate); it never resurfaces
        // non-resolved edges. Prefer the builder-stamped tier; fall back to the
        // pure classifier for a pre-Phase-3 graph.json.
        const confidence = edgeConfidenceOf(edge);
        if (!meetsMinConfidence(confidence, minConfidence)) continue;
        const source = edge.sourceId ? cache.nodeById.get(edge.sourceId) : undefined;
        // P3-T4: pass through the rich per-edge evidence the resolver already
        // computed and graph.json already persists (previously dropped). For a
        // call edge that is receiverText.calleeName() at scopePath — this lets
        // an agent see HOW the call is written without re-reading the source.
        const ev = edge.evidence as
          | { calleeName?: string; receiverText?: string; scopePath?: string; originSpecifier?: string }
          | undefined;
        all.push({
          ...(source ? nodeSummary(source) : { id: edge.sourceId }),
          at: edge.sourceLocation
            ? `${edge.sourceLocation.file}:${edge.sourceLocation.line}`
            : undefined,
          confidence,
          ...(kind === 'call' && ev?.calleeName !== undefined && { callee: ev.calleeName }),
          ...(kind === 'call' && ev?.receiverText ? { receiver: ev.receiverText } : {}),
          ...(kind === 'call' && ev?.scopePath ? { scope: ev.scopePath } : {}),
          ...(kind === 'import' && ev?.originSpecifier !== undefined && { specifier: ev.originSpecifier }),
        });
      }
    }
    const paged = paginate(all, offset, limit);
    const itemKey = kind === 'call' ? 'callers' : 'importers';
    const envelope: Record<string, unknown> = {
      element: byFile ? [`(all ${matches.length} elements of) ${query}`] : matches.map(m => m.id),
      relationship: kind,
      ...(minConfidence ? { min_confidence: minConfidence } : {}),
      total: paged.total,
      offset: paged.offset,
      limit: paged.limit,
      returned: paged.page.length,
      // `truncated` retained for back-compat (more-exists-beyond-this-window);
      // `has_more` is the forward paging signal.
      truncated: paged.has_more,
      has_more: paged.has_more,
      [itemKey]: paged.page,
    };
    return shapeResponse(envelope, responseFormat, [itemKey]);
  }

  /**
   * Outbound resolved edges of one relationship kind (the FORWARD direction:
   * what the element calls/imports), delegated to CanonicalGraphQuery so the
   * file-grain expansion + direction semantics match coderef-query exactly.
   * Reuses the same notFound/ambiguous envelope + limit clamp as inboundByKind.
   */
  function outboundByKind(
    query: string,
    kind: 'call' | 'import',
    limit: number | undefined,
    offset?: number,
    responseFormat?: ResponseFormat,
  ): Record<string, unknown> {
    const engine = loadCanonical(projectDir, cache);
    const resolution = engine.resolve(query);
    if (resolution.nodes.length === 0) return notFound(query);
    if (!resolution.byFile && resolution.nodes.length > 5) return ambiguous(query, resolution.nodes);

    const neighbors = kind === 'call' ? engine.calleesOf(resolution) : engine.importsOf(resolution);
    // NOTE on `total` semantics vs the inbound mirror (what_calls/what_imports):
    // calleesOf/importsOf dedupe by neighbor id, so `total` here is the count of
    // DISTINCT outbound targets. The inbound tools count EDGES (inboundByKind
    // does total++ per edge), so a caller that invokes the target twice counts
    // twice there. Comparing what_calls(X).total to what_this_calls(X).total is
    // therefore edge-count vs distinct-node-count — surfaced in each tool's
    // description so agents don't read the two as the same scale.
    const all = neighbors.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      file: n.file,
      line: n.line,
    }));
    const paged = paginate(all, offset, limit);
    const itemKey = kind === 'call' ? 'callees' : 'imports';
    const envelope: Record<string, unknown> = {
      element: resolution.byFile
        ? [`(all ${resolution.nodes.length} elements of) ${query}`]
        : resolution.nodes.map(n => n.id),
      relationship: kind,
      direction: 'outbound',
      total: paged.total,
      offset: paged.offset,
      limit: paged.limit,
      returned: paged.page.length,
      truncated: paged.has_more,
      has_more: paged.has_more,
      [itemKey]: paged.page,
    };
    return shapeResponse(envelope, responseFormat, [itemKey]);
  }

  return {
    what_calls({ element, limit, offset, min_confidence, response_format }) {
      return inboundByKind(element, 'call', limit, min_confidence, offset, response_format);
    },

    what_this_calls({ element, limit, offset, response_format }) {
      return outboundByKind(element, 'call', limit, offset, response_format);
    },

    what_this_imports({ element, limit, offset, response_format }) {
      return outboundByKind(element, 'import', limit, offset, response_format);
    },

    what_this_depends_on({ element, max_depth, limit, offset, response_format }) {
      const engine = loadCanonical(projectDir, cache);
      const depthCap = Math.max(1, Math.min(10, max_depth ?? 5));
      const resolution = engine.resolve(element);
      if (resolution.nodes.length === 0) return notFound(element);
      if (!resolution.byFile && resolution.nodes.length > 5) return ambiguous(element, resolution.nodes);

      // Transitive outbound over resolved call+import edges: what this element
      // depends on, directly and indirectly (forward BFS, file-grain expanded).
      const deps = engine.dependenciesOf(resolution, depthCap);
      const fileCounts = new Map<string, number>();
      for (const dep of deps) {
        const f = dep.file ?? '(unknown)';
        fileCounts.set(f, (fileCounts.get(f) ?? 0) + 1);
      }
      const files = [...fileCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([file, count]) => ({ file, elements: count }));
      // Phase 6: `files` (affected-files ranking) is the paged list.
      const paged = paginate(files, offset, limit);
      const envelope: Record<string, unknown> = {
        element: resolution.byFile
          ? [`(all ${resolution.nodes.length} elements of) ${element}`]
          : resolution.nodes.map(n => n.id),
        direction: 'outbound',
        max_depth: depthCap,
        transitive_dependencies: deps.length,
        affected_files: paged.total,
        offset: paged.offset,
        limit: paged.limit,
        files: paged.page,
        files_truncated: paged.has_more,
        has_more: paged.has_more,
        sample_dependencies: deps.slice(0, Math.min(10, paged.limit)).map(d => ({
          id: d.id, name: d.name, type: d.type, file: d.file, line: d.line,
        })),
      };
      return shapeResponse(envelope, response_format, ['files', 'sample_dependencies']);
    },

    path_between({ source, target, mode, max_depth, limit, offset, response_format }) {
      const engine = loadCanonical(projectDir, cache);
      const pathMode = mode ?? 'shortest';
      const sourceRes = engine.resolve(source);
      const targetRes = engine.resolve(target);
      if (sourceRes.nodes.length === 0) return notFound(source);
      if (targetRes.nodes.length === 0) return notFound(target);
      if (!sourceRes.byFile && sourceRes.nodes.length > 5) return ambiguous(source, sourceRes.nodes);
      if (!targetRes.byFile && targetRes.nodes.length > 5) return ambiguous(target, targetRes.nodes);

      if (pathMode === 'all') {
        // allPaths caps internally at ALL_PATHS_MAX (50); depth default 5.
        // `total` therefore maxes out at ALL_PATHS_MAX — surface that boundary
        // (internal_cap_hit) so an agent never reads a capped 50 as "exactly 50
        // paths exist" (no silent upstream truncation).
        const depthCap = Math.max(1, Math.min(10, max_depth ?? 5));
        const results = engine.allPaths(sourceRes, targetRes, depthCap);
        const mapped = results.map(r => ({
          length: r.length,
          nodes: r.path.map(n => ({ id: n.id, name: n.name, type: n.type, file: n.file, line: n.line })),
        }));
        // Phase 6: paths is the paged list. total is the true path count (bounded
        // by ALL_PATHS_MAX, flagged via internal_cap_hit).
        const paged = paginate(mapped, offset, limit);
        const envelope: Record<string, unknown> = {
          source,
          target,
          mode: 'all',
          max_depth: depthCap,
          total: paged.total,
          offset: paged.offset,
          limit: paged.limit,
          returned: paged.page.length,
          truncated: paged.has_more,
          has_more: paged.has_more,
          internal_cap_hit: results.length >= ALL_PATHS_MAX,
          paths: paged.page,
        };
        // paths carry nested node arrays (not top-level identity fields), so
        // concise is the pagination + a self-describing marker here.
        if (isConcise(response_format)) envelope.format = 'concise';
        return envelope;
      }

      const depthCap = Math.max(1, Math.min(20, max_depth ?? 10));
      const result = engine.shortestPath(sourceRes, targetRes, depthCap);
      return {
        source,
        target,
        mode: 'shortest',
        max_depth: depthCap,
        found: result.found,
        length: result.length,
        path: result.found
          ? result.path.map(n => ({ id: n.id, name: n.name, type: n.type, file: n.file, line: n.line }))
          : [],
      };
    },

    what_imports({ element, limit, offset, response_format }) {
      return inboundByKind(element, 'import', limit, undefined, offset, response_format);
    },

    impact_of({ element, max_depth, limit, offset, min_confidence, response_format }) {
      const graph = loadGraph(projectDir, cache);
      const cap = clampLimit(limit);
      const depthCap = Math.max(1, Math.min(10, max_depth ?? 3));
      const { nodes: matches, byFile } = resolveNodes(element, graph);
      if (matches.length === 0) return notFound(element);
      if (!byFile && matches.length > 5) return ambiguous(element, matches);

      // Reverse BFS over resolved call+import edges: who (transitively)
      // depends on this? Export edges are containment, not consumption —
      // a file exporting X is not "impacted by" X (v2 hygiene).
      // Phase 3: min_confidence tightens the traversal WITHIN the resolved set
      // (cache.inbound is resolved-only) — e.g. exact-only drops provisional
      // single-candidate hops. It does not resurface non-resolved edges.
      const visited = new Set<string>(matches.map(m => m.id));
      const byDepth: number[] = [];
      let frontier = matches.map(m => m.id);
      const dependents: ExportedNode[] = [];
      for (let depth = 1; depth <= depthCap && frontier.length > 0; depth++) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const edge of cache.inbound.get(id) ?? []) {
            if (edge.relationship !== 'call' && edge.relationship !== 'import') continue;
            if (!meetsMinConfidence(edgeConfidenceOf(edge), min_confidence)) continue;
            const src = edge.sourceId!;
            if (visited.has(src)) continue;
            visited.add(src);
            next.push(src);
            const node = cache.nodeById.get(src);
            if (node) dependents.push(node);
          }
        }
        byDepth.push(next.length);
        frontier = next;
      }

      const fileCounts = new Map<string, number>();
      for (const dep of dependents) {
        const f = dep.file ?? '(unknown)';
        fileCounts.set(f, (fileCounts.get(f) ?? 0) + 1);
      }
      const files = [...fileCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([file, count]) => ({ file, elements: count }));

      // Phase 6: `files` is the paged list here (the affected-files ranking).
      // paginate() windows it via offset/limit; total/has_more report the true
      // affected-files count. sample_dependents stays a fixed 10-item preview.
      const paged = paginate(files, offset, limit);
      const envelope: Record<string, unknown> = {
        element: byFile
          ? [`(all ${matches.length} elements of) ${element}`]
          : matches.map(m => m.id),
        max_depth: depthCap,
        ...(min_confidence ? { min_confidence } : {}),
        transitive_dependents: dependents.length,
        dependents_by_depth: byDepth,
        affected_files: paged.total,
        offset: paged.offset,
        limit: paged.limit,
        files: paged.page,
        // files_truncated retained for back-compat; has_more is the paging signal.
        files_truncated: paged.has_more,
        has_more: paged.has_more,
        sample_dependents: dependents.slice(0, Math.min(10, paged.limit)).map(nodeSummary),
      };
      return shapeResponse(envelope, response_format, ['files', 'sample_dependents']);
    },

    find_element({ query, type, limit, offset, response_format }) {
      const index = loadIndex(projectDir, cache);
      const q = query.toLowerCase();
      let elements = index.elements.filter(
        e =>
          e.name === query ||
          e.codeRefId === query ||
          e.name?.toLowerCase().includes(q) ||
          e.file?.toLowerCase().includes(q) ||
          e.codeRefId?.toLowerCase().includes(q),
      );
      if (type) elements = elements.filter(e => e.type === type);
      // Exact-name matches first so `find_element foo` surfaces foo() above foobar().
      elements.sort((a, b) => Number(b.name === query) - Number(a.name === query));
      const full = elements.map(e => ({
        id: e.codeRefId,
        name: e.name,
        type: e.type,
        file: e.file,
        line: e.line,
        exported: e.exported ?? false,
        headerStatus: e.headerStatus ?? 'missing',
        ...(e.layer !== undefined && { layer: e.layer }),
        ...(e.capability !== undefined && { capability: e.capability }),
      }));
      const paged = paginate(full, offset, limit);
      const envelope: Record<string, unknown> = {
        query,
        type_filter: type ?? null,
        total: paged.total,
        offset: paged.offset,
        limit: paged.limit,
        returned: paged.page.length,
        truncated: paged.has_more,
        has_more: paged.has_more,
        elements: paged.page,
      };
      return shapeResponse(envelope, response_format, ['elements']);
    },

    codebase_summary() {
      const index = loadIndex(projectDir, cache);
      const graph = loadGraph(projectDir, cache);
      let report: ValidationReport | null = null;
      try {
        report = loadValidationReport(projectDir);
      } catch {
        // validation-report.json is optional for the summary — coverage
        // falls back to counting index headerStatus below.
      }
      const byStatus: Record<string, number> = {};
      for (const e of index.elements) {
        const s = e.headerStatus ?? 'missing';
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }
      const defined = byStatus['defined'] ?? 0;
      const total = index.elements.length;
      return {
        project_dir: projectDir,
        generated_at: index.generatedAt ?? null,
        total_elements: index.totalElements ?? total,
        elements_by_type: index.elementsByType ?? {},
        header_coverage: {
          pct:
            report?.header_coverage_pct ??
            (total > 0 ? Math.round((defined / total) * 1000) / 10 : 0),
          by_status: byStatus,
        },
        graph: {
          nodes: graph.statistics?.nodeCount ?? graph.nodes.length,
          edges: graph.statistics?.edgeCount ?? graph.edges.length,
          edges_by_type: graph.statistics?.edgesByType ?? {},
        },
        // Resolution reconciliation (STUB-CXZ7VZ, Phase 5): codebase_summary's
        // graph.edges counts ALL emitted edges, while validation_status reports
        // resolved-only (valid_edge_count) — an agent reading only this tool
        // over-trusts density. These rates (canonical, from the ValidationReport)
        // make the two tools agree. null when no validation-report.json exists
        // (report is optional here — the try/catch above tolerates its absence).
        resolution: {
          resolution_rate: report?.resolution_rate ?? null,
          resolved_of_resolvable: report?.resolved_of_resolvable ?? null,
          ambiguous_rate: report?.ambiguous_rate ?? null,
          provisional_rate: report?.provisional_rate ?? null,
          resolved_edges: report?.valid_edge_count ?? null,
          total_call_edges: report
            ? report.valid_edge_count +
              report.unresolved_count +
              report.ambiguous_count +
              report.external_count +
              report.builtin_count
            : null,
        },
      };
    },

    hotspots({ limit, offset, src_only, response_format }) {
      const graph = loadGraph(projectDir, cache);
      const srcOnly = src_only ?? true;

      const fanIn = new Map<string, number>();
      const fanOut = new Map<string, number>();
      for (const edge of graph.edges) {
        if (edge.resolutionStatus !== 'resolved' || !edge.targetId || !edge.sourceId) continue;
        if (edge.relationship !== 'call' && edge.relationship !== 'import') continue;
        if (srcOnly && (edge.evidence as { testOrigin?: boolean } | undefined)?.testOrigin === true) continue;
        fanIn.set(edge.targetId, (fanIn.get(edge.targetId) ?? 0) + 1);
        fanOut.set(edge.sourceId, (fanOut.get(edge.sourceId) ?? 0) + 1);
      }

      const ranked: Array<Record<string, unknown> & { score: number }> = [];
      const ids = new Set<string>([...fanIn.keys(), ...fanOut.keys()]);
      for (const id of ids) {
        const node = cache.nodeById.get(id);
        if (!node) continue;
        // src_only excludes test files AND demo/example scaffolding (STUB-4NYW5W):
        // both pollute the architectural leverage signal. src_only=false still ranks
        // everything. Demo elements are dropped at the ranking stage only — fan-in/out
        // is still computed over the full resolved graph above.
        if (srcOnly && (isTestFile(node.file) || isDemoFile(node.file))) continue;
        const fi = fanIn.get(id) ?? 0;
        const fo = fanOut.get(id) ?? 0;
        ranked.push({ ...nodeSummary(node), fan_in: fi, fan_out: fo, score: fi + fo });
      }
      ranked.sort((a, b) => b.score - a.score);

      const paged = paginate(ranked, offset, limit);
      const envelope: Record<string, unknown> = {
        src_only: srcOnly,
        total_ranked: paged.total,
        offset: paged.offset,
        limit: paged.limit,
        returned: paged.page.length,
        truncated: paged.has_more,
        has_more: paged.has_more,
        hotspots: paged.page,
      };
      return shapeResponse(envelope, response_format, ['hotspots']);
    },

    cycles({ limit, offset, relationship, response_format }) {
      const graph = loadGraph(projectDir, cache);

      // Forward adjacency over resolved call/import edges (export edges are
      // containment and cannot form dependency cycles worth surfacing).
      const adj = new Map<string, Array<{ to: string; edge: ExportedEdge }>>();
      for (const edge of graph.edges) {
        if (edge.resolutionStatus !== 'resolved' || !edge.targetId || !edge.sourceId) continue;
        const rel = edge.relationship;
        if (relationship ? rel !== relationship : rel !== 'call' && rel !== 'import') continue;
        const list = adj.get(edge.sourceId);
        const entry = { to: edge.targetId, edge };
        if (list) list.push(entry);
        else adj.set(edge.sourceId, [entry]);
      }

      // Iterative Tarjan SCC (explicit stack — graphs here can chain deep).
      let counter = 0;
      const index = new Map<string, number>();
      const lowlink = new Map<string, number>();
      const onStack = new Set<string>();
      const stack: string[] = [];
      const sccs: string[][] = [];

      for (const start of adj.keys()) {
        if (index.has(start)) continue;
        const work: Array<{ id: string; childIdx: number }> = [{ id: start, childIdx: 0 }];
        while (work.length > 0) {
          const frame = work[work.length - 1];
          const { id } = frame;
          if (frame.childIdx === 0) {
            index.set(id, counter);
            lowlink.set(id, counter);
            counter++;
            stack.push(id);
            onStack.add(id);
          }
          const children = adj.get(id) ?? [];
          let recursed = false;
          while (frame.childIdx < children.length) {
            const child = children[frame.childIdx].to;
            frame.childIdx++;
            if (!index.has(child)) {
              work.push({ id: child, childIdx: 0 });
              recursed = true;
              break;
            }
            if (onStack.has(child)) {
              lowlink.set(id, Math.min(lowlink.get(id)!, index.get(child)!));
            }
          }
          if (recursed) continue;
          if (lowlink.get(id) === index.get(id)) {
            const scc: string[] = [];
            for (;;) {
              const w = stack.pop()!;
              onStack.delete(w);
              scc.push(w);
              if (w === id) break;
            }
            if (scc.length > 1) sccs.push(scc);
          }
          work.pop();
          if (work.length > 0) {
            const parent = work[work.length - 1];
            lowlink.set(parent.id, Math.min(lowlink.get(parent.id)!, lowlink.get(id)!));
          }
        }
      }

      sccs.sort((a, b) => b.length - a.length);
      // Phase 6: paginate the full SCC list; map only the windowed slice.
      const pagedSccs = paginate(sccs, offset, limit);
      const cycles = pagedSccs.page.map(scc => {
        const memberSet = new Set(scc);
        let sample: ExportedEdge | undefined;
        for (const id of scc) {
          sample = (adj.get(id) ?? []).find(e => memberSet.has(e.to))?.edge;
          if (sample) break;
        }
        return {
          size: scc.length,
          members: scc.slice(0, 10).map(id => {
            const node = cache.nodeById.get(id);
            return node ? nodeSummary(node) : { id };
          }),
          members_truncated: scc.length > 10,
          sample_edge: sample
            ? {
                from: sample.sourceId,
                to: sample.targetId,
                at: sample.sourceLocation
                  ? `${sample.sourceLocation.file}:${sample.sourceLocation.line}`
                  : undefined,
              }
            : undefined,
        };
      });

      // cycles carry nested member summaries (already nodeSummary-grade identity
      // fields), so concise here is the pagination + a self-describing marker; the
      // members are the identity-bearing part and stay intact.
      const envelope: Record<string, unknown> = {
        relationship: relationship ?? 'call+import',
        total_cycles: pagedSccs.total,
        offset: pagedSccs.offset,
        limit: pagedSccs.limit,
        returned: cycles.length,
        truncated: pagedSccs.has_more,
        has_more: pagedSccs.has_more,
        cycles,
        ...(isConcise(response_format) ? { format: 'concise' } : {}),
      };
      return envelope;
    },

    what_exports({ file, limit, offset, response_format }) {
      const graph = loadGraph(projectDir, cache);
      const norm = (f: string | undefined) => normalizeSlashes((f ?? ''));
      const query = norm(file).replace(/^@File\//, '');

      // Group export edges by their owning file.
      const byFile = new Map<string, ExportedEdge[]>();
      for (const edge of graph.edges) {
        if (edge.relationship !== 'export' || edge.resolutionStatus !== 'resolved' || !edge.targetId) continue;
        const owner =
          norm(edge.sourceLocation?.file) ||
          norm(edge.sourceId?.replace(/^@File\//, ''));
        if (!owner) continue;
        const list = byFile.get(owner);
        if (list) list.push(edge);
        else byFile.set(owner, [edge]);
      }

      let matchedFiles = byFile.has(query) ? [query] : [];
      if (matchedFiles.length === 0) {
        const q = query.toLowerCase();
        matchedFiles = [...byFile.keys()].filter(f => f.toLowerCase().includes(q));
      }
      if (matchedFiles.length === 0) {
        return {
          error: 'file_not_found',
          query: file,
          hint: 'No export edges for that file. Pass a project-relative path; re-run the pipeline if the graph is stale.',
        };
      }
      if (matchedFiles.length > 5) {
        return {
          error: 'ambiguous_file',
          query: file,
          match_count: matchedFiles.length,
          hint: 'Narrow the file path — multiple files match.',
          candidates: matchedFiles.slice(0, 5),
        };
      }

      const exports: Array<Record<string, unknown>> = [];
      for (const f of matchedFiles) {
        for (const edge of byFile.get(f)!) {
          const target = cache.nodeById.get(edge.targetId!);
          exports.push(target ? nodeSummary(target) : { id: edge.targetId });
        }
      }
      const paged = paginate(exports, offset, limit);
      const envelope: Record<string, unknown> = {
        file: matchedFiles.length === 1 ? matchedFiles[0] : matchedFiles,
        total: paged.total,
        offset: paged.offset,
        limit: paged.limit,
        returned: paged.page.length,
        truncated: paged.has_more,
        has_more: paged.has_more,
        exports: paged.page,
      };
      return shapeResponse(envelope, response_format, ['exports']);
    },

    diff_impact({ ref, max_depth, limit, offset, response_format }) {
      const graph = loadGraph(projectDir, cache);
      const depthCap = Math.max(1, Math.min(10, max_depth ?? 3));
      const gitRef = ref ?? 'HEAD';

      // Shared front half (diff -> changed elements) — see computeChangedElements.
      const changed = computeChangedElements(projectDir, cache, gitRef);
      if ('error' in changed) return changed.error;
      const { changedElements, changedFileCount } = changed;

      // Union reverse BFS over resolved call+import edges.
      const seeds = [...changedElements.keys()].filter(id => cache.nodeById.has(id));
      const visited = new Set<string>(seeds);
      let frontier = seeds;
      const dependents: ExportedNode[] = [];
      for (let depth = 1; depth <= depthCap && frontier.length > 0; depth++) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const edge of cache.inbound.get(id) ?? []) {
            if (edge.relationship !== 'call' && edge.relationship !== 'import') continue;
            const src = edge.sourceId!;
            if (visited.has(src)) continue;
            visited.add(src);
            next.push(src);
            const node = cache.nodeById.get(src);
            if (node) dependents.push(node);
          }
        }
        frontier = next;
      }
      void graph;

      const fileCounts = new Map<string, number>();
      for (const dep of dependents) {
        const f = dep.file ?? '(unknown)';
        fileCounts.set(f, (fileCounts.get(f) ?? 0) + 1);
      }
      const files = [...fileCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([file, count]) => ({ file, elements: count }));

      // Phase 6: `files` (affected-files ranking) is the paged list.
      const paged = paginate(files, offset, limit);
      const envelope: Record<string, unknown> = {
        ref: gitRef,
        changed_files: changedFileCount,
        changed_elements: changedElements.size,
        changed_element_sample: [...changedElements.values()].slice(0, Math.min(20, paged.limit)).map(e => ({
          id: e.codeRefId, name: e.name, type: e.type, file: e.file, line: e.line,
        })),
        max_depth: depthCap,
        transitive_dependents: dependents.length,
        affected_files: paged.total,
        offset: paged.offset,
        limit: paged.limit,
        files: paged.page,
        files_truncated: paged.has_more,
        has_more: paged.has_more,
      };
      return shapeResponse(envelope, response_format, ['files', 'changed_element_sample']);
    },

    tests_for_change({ ref, max_depth, limit, offset, response_format }) {
      loadGraph(projectDir, cache);
      const depthCap = Math.max(1, Math.min(10, max_depth ?? 3));
      const gitRef = ref ?? 'HEAD';

      // Shared front half (diff -> changed elements) — same seam diff_impact uses.
      const changed = computeChangedElements(projectDir, cache, gitRef);
      if ('error' in changed) return changed.error;
      const { changedElements, changedFileCount } = changed;

      // PURE join: reverse-BFS the changed elements to the test-file elements
      // that reach them. Delegates ranking to src/query/tests-for-change.ts.
      const selection = computeTestsForChange({
        changedElementIds: changedElements.keys(),
        nodeById: cache.nodeById,
        inbound: cache.inbound,
        isTestFile: isTestLikeFile,
        maxDepth: depthCap,
      });

      // `tests` (the ranked test-element list) is the paged surface.
      const paged = paginate(selection.tests, offset, limit);
      const envelope: Record<string, unknown> = {
        ref: gitRef,
        changed_files: changedFileCount,
        changed_elements: changedElements.size,
        changed_element_sample: [...changedElements.values()].slice(0, Math.min(20, paged.limit)).map(e => ({
          id: e.codeRefId, name: e.name, type: e.type, file: e.file, line: e.line,
        })),
        max_depth: depthCap,
        // absence = no-data: 0 selected tests means "no test-file element with a
        // recorded edge-path to the change", NEVER "untested" or "safe to skip".
        test_file_count: selection.test_file_count,
        selected_tests: selection.total,
        test_files: selection.files,
        offset: paged.offset,
        limit: paged.limit,
        tests: paged.page,
        tests_truncated: paged.has_more,
        has_more: paged.has_more,
        note:
          'Ranked test-file elements reaching the diff through resolved call/import edges (depth 1 = direct). Absence is no-data, not "untested".',
      };
      return shapeResponse(envelope, response_format, ['tests', 'test_files', 'changed_element_sample']);
    },

    async ast_search({ query, lang, limit, offset, response_format }) {
      // Element set = index.json (start-line attribution, same seam tests_for_change uses).
      const index = loadIndex(projectDir, cache);
      const elements: AstSearchElement[] = index.elements.map(e => ({
        file: e.file,
        line: e.line,
        codeRefId: e.codeRefId,
        name: e.name,
      }));

      // File set = the distinct source files for the requested language, read
      // from disk at this impure CLI edge (searchAst itself stays pure over the
      // supplied content). Files that no longer exist are skipped (best-effort).
      const wantExt = String(lang).toLowerCase();
      const indexedFiles = new Set<string>();  // distinct lang files present in the index
      const searchedFiles: string[] = [];      // index lang files actually read
      const files: AstSearchFile[] = [];
      for (const el of index.elements) {
        const ext = path.extname(el.file).slice(1).toLowerCase();
        if (ext !== wantExt || indexedFiles.has(el.file)) continue;
        indexedFiles.add(el.file);
        try {
          const abs = path.isAbsolute(el.file) ? el.file : path.join(projectDir, el.file);
          files.push({ file: el.file, content: fs.readFileSync(abs, 'utf8') });
          searchedFiles.push(el.file);
        } catch {
          // Unreadable/deleted file contributes no matches (counted below).
        }
      }

      // REC-002: not-searched visibility. Walk the project for on-disk files of
      // this language and compare against the indexed/searched sets so the caller
      // can tell "zero matches" apart from "this file was never searched".
      const onDiskFiles = listLanguageFilesOnDisk(projectDir, wantExt);
      const skip = computeNotSearchedCounts(onDiskFiles, [...indexedFiles], searchedFiles);

      const cap = clampLimit(limit);
      const result = await searchAst({ lang: wantExt, query, files, elements, limit: MAX_LIMIT });

      // Page the (already deterministically sorted) match list.
      const paged = paginate(result.matches, offset, cap);
      const envelope: Record<string, unknown> = {
        language: result.language,
        query: result.query,
        files_searched: files.length,
        // absence=no-data made explicit: files that exist on disk for this
        // language but carry no index element (never searched), and indexed
        // files that could not be read at search time.
        files_skipped_no_index: skip.filesSkippedNoIndex,
        files_skipped_unreadable: skip.filesSkippedUnreadable,
        total_matches: result.totalMatches,
        // absence = no-data: 0 matches means "this syntactic shape was not found"
        // (or the query/language was unusable, see `reason`), never a verdict.
        ...(result.reason ? { reason: result.reason } : {}),
        offset: paged.offset,
        limit: paged.limit,
        matches: paged.page,
        matches_truncated: paged.has_more || result.truncated,
        has_more: paged.has_more,
        note: result.note,
      };
      return shapeResponse(envelope, response_format, ['matches']);
    },

    // type_hierarchy (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P5): supertypes
    // (extends/implements a type points UP to) + subtypes (types pointing DOWN to it),
    // over the heritage edges the pipeline now populates. Absence=no-data.
    type_hierarchy({ element, direction, max_depth, limit, offset, response_format }) {
      const graph = loadGraph(projectDir, cache);
      const { nodes: matches, byFile } = resolveNodes(element, graph);
      if (matches.length === 0) return notFound(element);
      if (!byFile && matches.length > 5) return ambiguous(element, matches);

      // Build heritage adjacency ONCE from the loaded graph: forward (source->edges,
      // toward supertypes) + reverse (target->edges, toward subtypes). Only
      // extends/implements edges participate — the Phase 5 populated types.
      const supertypeEdges = new Map<string, ExportedEdge[]>();
      const subtypeEdges = new Map<string, ExportedEdge[]>();
      for (const edge of graph.edges) {
        if (edge.type !== 'extends' && edge.type !== 'implements') continue;
        const src = edge.sourceId ?? edge.source;
        const tgt = edge.targetId ?? edge.target;
        if (src) {
          const l = supertypeEdges.get(src);
          if (l) l.push(edge); else supertypeEdges.set(src, [edge]);
        }
        if (tgt) {
          const l = subtypeEdges.get(tgt);
          if (l) l.push(edge); else subtypeEdges.set(tgt, [edge]);
        }
      }

      const dir: TypeHierarchyDirection =
        direction === 'up' || direction === 'down' || direction === 'both' ? direction : 'both';

      // Seed with the first resolved node id; a byFile match uses that node too.
      const seedId = matches[0].id;
      const result = computeTypeHierarchy({
        element: seedId,
        direction: dir,
        nodeById: cache.nodeById,
        supertypeEdges,
        subtypeEdges,
        maxDepth: max_depth,
      });

      const cap = clampLimit(limit);
      const pagedSuper = paginate(result.supertypes, offset, cap);
      const pagedSub = paginate(result.subtypes, offset, cap);
      const envelope: Record<string, unknown> = {
        element: seedId,
        element_resolved: result.element_resolved,
        direction: result.direction,
        // absence = no-data: empty supertypes/subtypes means "no recorded heritage
        // edge for this element", never "this type has no hierarchy".
        supertype_count: result.supertypes.length,
        subtype_count: result.subtypes.length,
        supertypes: pagedSuper.page,
        subtypes: pagedSub.page,
        offset: pagedSuper.offset,
        limit: pagedSuper.limit,
        has_more: pagedSuper.has_more || pagedSub.has_more,
        truncated: result.truncated || pagedSuper.has_more || pagedSub.has_more,
        note: result.note,
      };
      return shapeResponse(envelope, response_format, ['supertypes', 'subtypes']);
    },

    // api_diff (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P6): diff the
    // EXPORTED API surface against a snapshot baseline, mirroring map_metrics_delta's
    // snapshot-sidecar model (NOT a git-ref re-parse — the OLD breaking-change-detector
    // call-site path stays gated). snapshot:true copies the current exports manifest to
    // a .coderef-confined sidecar; a bare call diffs the "baseline" sidecar vs the
    // current index. Surfaces-not-verdicts + absence=no-data: a missing baseline is
    // declared no-data, never a fabricated all-added/all-removed report.
    api_diff({ before, after, snapshot, snapshot_label, limit, offset, response_format }) {
      const crefDir = path.join(projectDir, '.coderef');
      const snapPath = (label: string) =>
        path.join(crefDir, `api-manifest-${label.replace(/[^A-Za-z0-9._-]/g, '_')}.json`);

      // The current exports manifest, projected from index.json (the same element
      // set find_element / tests_for_change read). NEVER recomputes elements.
      const currentManifest = (): ExportsManifest => {
        const index = loadIndex(projectDir, cache);
        return extractExportsManifest(index.elements as unknown as ManifestElement[]);
      };

      // Load a manifest sidecar written by an earlier snapshot (an ExportsManifest).
      const loadManifestFrom = (p: string): ExportsManifest | undefined => {
        if (!fs.existsSync(p)) return undefined;
        try {
          const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (parsed && typeof parsed === 'object' && 'exports' in parsed) return parsed as ExportsManifest;
          return undefined;
        } catch {
          return undefined;
        }
      };

      // SNAPSHOT mode: copy the current manifest to a named sidecar (pure read/copy).
      if (snapshot) {
        const label = snapshot_label && snapshot_label.length ? snapshot_label : 'baseline';
        const manifest = currentManifest();
        const out = snapPath(label);
        fs.writeFileSync(out, JSON.stringify(manifest, null, 2), 'utf8');
        return {
          action: 'snapshot',
          ok: true,
          snapshot_label: label,
          snapshot_path: normalizeSlashes(out),
          schema_version: manifest.schemaVersion,
          exported_count: Object.keys(manifest.exports).length,
          hint: `Snapshot saved. Change the API, then diff: api_diff({ before: "${label}" }) compares this snapshot to the current exports.`,
          writes_confined_to: normalizeSlashes(crefDir),
        };
      }

      // DELTA mode. BEFORE: an explicit path, else the named snapshot sidecar
      // (default label 'baseline'). AFTER: an explicit path, else the current index.
      const beforeIsPath = before && (before.includes('/') || before.includes('\\') || before.endsWith('.json'));
      const beforePath = before ? (beforeIsPath ? path.resolve(projectDir, before) : snapPath(before)) : snapPath('baseline');
      const beforeManifest = loadManifestFrom(beforePath);
      const afterManifest = after ? loadManifestFrom(path.resolve(projectDir, after)) : currentManifest();

      // No baseline snapshot -> honest no-data, NEVER a false "0 breaking changes".
      const diff = diffApiSurface({ before: beforeManifest, after: afterManifest });
      const cap = clampLimit(limit);
      const pagedAdded = paginate(diff.added, offset, cap);
      const pagedRemoved = paginate(diff.removed, offset, cap);
      const pagedChanged = paginate(diff.changed, offset, cap);

      const envelope: Record<string, unknown> = {
        action: 'delta',
        ok: !diff.noData,
        schema_version: diff.schemaVersion,
        before_path: normalizeSlashes(beforePath),
        no_data: diff.noData,
        // Decomposed change vector — NO composite breaking-count verdict.
        added_count: diff.added.length,
        removed_count: diff.removed.length,
        changed_count: diff.changed.length,
        unchanged_count: diff.unchangedCount,
        added: pagedAdded.page,
        removed: pagedRemoved.page,
        changed: pagedChanged.page,
        offset: pagedAdded.offset,
        limit: pagedAdded.limit,
        has_more: pagedAdded.has_more || pagedRemoved.has_more || pagedChanged.has_more,
        warnings: diff.warnings,
        note: diff.noData
          ? `${diff.note} No baseline snapshot at ${normalizeSlashes(beforePath)} — run api_diff({ snapshot: true }) first.`
          : diff.note,
      };
      return shapeResponse(envelope, response_format, ['added', 'removed', 'changed']);
    },

    // dependency_rules (P7): check DECLARED architecture constraints (an optional
    // .coderef/rules.json — forbid/allow layer-pairs) against the OBSERVED
    // declared-layer edges in graph.json. Read-only, mirrors validation_status's
    // report shape. Surfaces-not-verdicts (no composite score) + absence=no-data
    // (no rules.json -> no_data:true, never a false all-pass). MCP has no exit
    // code — the CLI --gate flag owns the CI gate; the tool only reports.
    dependency_rules({ limit, offset, response_format }) {
      const crefDir = path.join(projectDir, '.coderef');
      const graph = loadGraph(projectDir, cache);
      const layerEdges = projectLayerEdges(
        graph.nodes as unknown as DependencyRulesNode[],
        graph.edges as unknown as DependencyRulesEdge[],
      );

      const rulesPath = path.join(crefDir, 'rules.json');
      if (!fs.existsSync(rulesPath)) {
        return {
          action: 'gate',
          ok: true,
          no_data: true,
          schema_version: '1.0.0',
          rule_count: 0,
          violated_count: 0,
          satisfied_count: 0,
          not_applicable_count: 0,
          observed_layer_edge_count: layerEdges.length,
          rules: [],
          warnings: [],
          note:
            `no .coderef/rules.json — declare forbid/allow layer-pair constraints to enable ` +
            `the gate. Observed ${layerEdges.length} declared-layer dependency edge(s).`,
        };
      }

      let rulesRaw: unknown;
      try {
        rulesRaw = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      } catch (err) {
        return {
          action: 'gate',
          ok: false,
          no_data: true,
          error: 'rules_json_invalid',
          hint: `.coderef/rules.json is not valid JSON: ${String(err instanceof Error ? err.message : err).slice(0, 200)}`,
        };
      }

      const spec = parseRulesSpec(rulesRaw);
      const report = checkDependencyRules({ rules: spec, layerEdges });
      const cap = clampLimit(limit);
      const paged = paginate(report.rules, offset, cap);
      const envelope: Record<string, unknown> = {
        action: 'gate',
        ok: report.violatedCount === 0,
        no_data: false,
        schema_version: report.schemaVersion,
        rule_count: report.ruleCount,
        violated_count: report.violatedCount,
        satisfied_count: report.satisfiedCount,
        not_applicable_count: report.notApplicableCount,
        observed_layer_edge_count: layerEdges.length,
        rules: paged.page,
        offset: paged.offset,
        limit: paged.limit,
        has_more: paged.has_more,
        warnings: report.warnings,
        note: report.note,
      };
      return shapeResponse(envelope, response_format, ['rules']);
    },

    async rag_search({ query, limit, offset, hybrid, expand, neighbor_limit, lane, response_format }) {
      const cap = clampLimit(limit);
      const off = offset === undefined || !Number.isFinite(offset) ? 0 : Math.max(0, Math.floor(offset));
      const neighborCap = neighbor_limit === undefined
        ? 10
        : Math.max(1, Math.min(MAX_LIMIT, Math.floor(neighbor_limit)));

      // Phase 9 (lexical-first-search-router, STUB-014M9C): classify the query
      // and route the LEXICAL lane FIRST. A symbol-shaped query (a bare
      // identifier / dotted Receiver.method / --flag / quoted-exact) is answered
      // from the symbol table (index.json) via in-process BM25 with ZERO Ollama
      // and ZERO rag-index dependency. The embedding lane is the gated fallback
      // for conceptual (multi-word) queries. When the embedding lane is
      // unavailable (daemon down / no rag-index), we DEGRADE to the lexical lane
      // and still answer — the old hard error:'embedding_unavailable' /
      // 'rag_index_missing' becomes a graceful lane:'lexical', degraded:true.
      const cls = classifyQuery(query);
      const laneMode: 'auto' | 'lexical' | 'semantic' = lane ?? 'auto';
      const forceLexical = laneMode === 'lexical';
      const forceSemantic = laneMode === 'semantic';
      const wantSemantic = !forceLexical && (forceSemantic || !cls.isSymbolShaped);

      // Ego-graph expansion (Phase 4): when expand is set, load the canonical
      // graph ONCE and attach each hit's 1-hop neighborhood. Shared by both lanes.
      let engine: CanonicalGraphQuery | null = null;
      if (expand) {
        try {
          engine = loadCanonical(projectDir, cache);
        } catch {
          engine = null;
        }
      }
      const attachNeighbors = (hit: Record<string, unknown>, id: unknown, name: unknown): void => {
        if (!engine) return;
        // Resolve the hit to a graph node. Prefer the coderefId; fall back to the
        // element name. ALWAYS attach when expand is set — a non-resolving hit
        // yields neighbors.resolved=false, so absence is SURFACED (no-data).
        const resolveKey = typeof id === 'string' ? id : (typeof name === 'string' ? name : '');
        const neighbors: EgoGraph = egoGraphOf(engine, engine.resolve(resolveKey), { cap: neighborCap });
        hit.neighbors = neighbors;
      };

      // The LEXICAL lane — pure BM25 over the symbol table, no embeddings, no
      // daemon. Used as the primary path for symbol-shaped queries AND as the
      // graceful-degrade fallback when the embedding lane is unavailable.
      const runLexical = (laneTag: SearchLane, degraded: boolean, degradeReason?: string): Record<string, unknown> => {
        let index: IndexData;
        try {
          index = loadIndex(projectDir, cache);
        } catch (e: any) {
          // No index.json at all — nothing the lexical lane can answer from.
          return {
            error: 'index_missing',
            hint: `No symbol table at ${path.join(projectDir, '.coderef', 'index.json')}. Run populate/reindex first.`,
            detail: String(e?.message ?? e).slice(0, 200),
          };
        }
        // Over-fetch to cover the requested offset window, then page.
        const lex = lexicalSearch(index.elements, query, { topK: off + cap });
        const allHits = lex.results.map((r) => {
          const hit: Record<string, unknown> = {
            id: r.id,
            name: r.name,
            file: r.file,
            line: r.line,
            score: r.score,
          };
          attachNeighbors(hit, r.id, r.name);
          return hit;
        });
        const paged = paginate(allHits, off, cap);
        const envelope: Record<string, unknown> = {
          query,
          lane: laneTag,
          routing_reason: degraded && degradeReason ? degradeReason : lex.routing_reason,
          ...(degraded ? { degraded: true } : {}),
          ...(expand ? { expanded: true, neighbor_limit: neighborCap } : {}),
          total: paged.total,
          offset: paged.offset,
          limit: paged.limit,
          returned: paged.page.length,
          has_more: paged.has_more,
          results: paged.page,
        };
        return shapeResponse(envelope, response_format, ['results']);
      };

      // Symbol-shaped (or explicitly forced lexical): answer from the symbol
      // table with no embedding path at all.
      if (!wantSemantic) {
        return runLexical('lexical', false);
      }

      // Conceptual query (or forced semantic): attempt the embedding lane, but
      // degrade to lexical instead of hard-erroring when it is unavailable.
      const indexMetaPath = path.join(projectDir, '.coderef', 'rag-index.json');
      let meta: { provider?: string; store?: string };
      try {
        meta = JSON.parse(fs.readFileSync(indexMetaPath, 'utf8'));
      } catch {
        return runLexical(
          'lexical',
          true,
          `no RAG index for the semantic lane — answered from the symbol table (lexical fallback). Run rag-index to enable embedding search. (${cls.reason})`,
        );
      }
      // Provider/store from index metadata — the key-aware invariant: query
      // embeddings MUST come from the same model that built the index.
      const provider = meta.provider ?? 'ollama';
      const store = meta.store ?? 'sqlite';
      try {
        // Shared factory (P1-10): provider/store construction sourced from
        // MODEL_REGISTRY. The index's own metadata still picks the provider
        // so query embeddings always match the index.
        const { createLLMProvider, createVectorStore } = await import('../integration/llm/provider-factory.js');
        let llmProvider: any;
        try {
          llmProvider = await createLLMProvider(provider === 'openai' ? 'openai' : 'ollama');
        } catch (keyErr) {
          // Provider could not start (daemon down / missing key) — degrade to
          // the lexical lane instead of the old hard error.
          return runLexical(
            'lexical',
            true,
            `embedding provider ${provider} could not start — answered from the symbol table (lexical fallback): ${keyErr instanceof Error ? keyErr.message : String(keyErr)}`,
          );
        }
        const vectorStore = await createVectorStore(store, projectDir, llmProvider, { warnTag: 'coderef-mcp' });
        await vectorStore.initialize();
        const { SemanticSearchService } = await import('../integration/rag/semantic-search.js');
        const searchService = new SemanticSearchService(llmProvider, vectorStore);
        // STUB-Q7MRD6: hybrid dense+BM25 RRF fusion, on by default; callers can
        // pass hybrid=false to force embedding-only (A/B).
        // Phase 6: fetch enough to cover the requested offset window. topK is the
        // retrieval depth; offset then pages within it. A bare call (offset unset)
        // requests exactly `cap` — byte-identical to pre-Phase-6.
        const useHybrid = hybrid ?? true;
        const response = await searchService.search(query, { topK: off + cap, hybrid: useHybrid });
        const results = (response?.results ?? response ?? []) as any[];
        const allHits = results.map((r: any) => {
          const id = r.metadata?.coderefId ?? r.id;
          const name = r.metadata?.name;
          const hit: Record<string, unknown> = {
            id,
            name,
            file: r.metadata?.file,
            line: r.metadata?.line,
            score: typeof r.score === 'number' ? Math.round(r.score * 1000) / 1000 : r.score,
            snippet: typeof r.metadata?.sourceCode === 'string'
              ? r.metadata.sourceCode.slice(0, 200)
              : (typeof r.content === 'string' ? r.content.slice(0, 200) : undefined),
          };
          attachNeighbors(hit, id, name);
          return hit;
        });
        // Phase 6: page within the retrieved set. total is the retrieved-result
        // count (topK depth); has_more true when a further page is in-hand.
        const paged = paginate(allHits, off, cap);
        // The lane tag reflects what actually ran: hybrid fuses the BM25 leg with
        // the dense leg, embedding-only is pure semantic.
        const laneTag: SearchLane = useHybrid ? 'hybrid' : 'semantic';
        const envelope: Record<string, unknown> = {
          query,
          lane: laneTag,
          routing_reason: cls.reason,
          provider,
          store,
          hybrid: useHybrid,
          ...(expand ? { expanded: true, neighbor_limit: neighborCap } : {}),
          total: paged.total,
          offset: paged.offset,
          limit: paged.limit,
          returned: paged.page.length,
          has_more: paged.has_more,
          results: paged.page,
        };
        return shapeResponse(envelope, response_format, ['results']);
      } catch (e: any) {
        // The embedding lane failed mid-flight (store init, embed call, etc.) —
        // degrade to the lexical lane rather than returning a hard error.
        return runLexical(
          'lexical',
          true,
          `embedding search failed (${provider}) — answered from the symbol table (lexical fallback): ${String(e?.message ?? e).slice(0, 200)}`,
        );
      }
    },

    validation_status() {
      let report: ValidationReport;
      try {
        report = loadValidationReport(projectDir);
      } catch (e: any) {
        return {
          error: 'validation_report_missing',
          detail: String(e?.message ?? e),
          hint: 'Run the pipeline (coderef-pipeline / populate-coderef) to produce .coderef/validation-report.json.',
        };
      }
      return {
        // The locked 14-field report, verbatim (additive stability rule —
        // src/pipeline/output-validator.ts).
        report,
        summary: {
          header_coverage_pct: report.header_coverage_pct,
          resolved_edges: report.valid_edge_count,
          // STUB-CXZ7VZ Phase 5: canonical resolution rates (from the report),
          // the SAME fields codebase_summary's resolution block surfaces — so
          // the two tools agree on how many call edges resolve. resolution_rate
          // is over all-emitted call edges; resolved_of_resolvable excludes
          // external/builtin (correctly-not-fabricated project edges).
          resolution_rate: report.resolution_rate,
          resolved_of_resolvable: report.resolved_of_resolvable,
          // STUB-6CWWHQ Phase 2: the provisional-trust slice of resolved_edges
          // (single_candidate_unknown_receiver). Sub-count of resolved_edges;
          // undefined on pre-bump artifacts that predate the field. Provisional
          // edges are audited here (aggregate) — they no longer appear in
          // unresolved_edges since they resolve.
          provisional_edges: report.provisional_count,
          unresolved_edges: report.unresolved_count,
          header_problems:
            report.header_missing_count +
            report.header_stale_count +
            report.header_partial_count +
            report.header_layer_mismatch_count +
            report.header_export_mismatch_count,
        },
      };
    },

    unresolved_edges({ relationship, status, file, reason, offset, limit, response_format }) {
      const graph = loadGraph(projectDir, cache);

      // The non-resolved universe. validation_status exposes only the AGGREGATE
      // counts of these (unresolved_count/ambiguous_count/external_count/
      // builtin_count in the locked report); this tool ENUMERATES the actual
      // edges with their persisted evidence so an agent can see WHICH call/import
      // could not be resolved and WHY. The status filter defaults to the two
      // "honesty" dispositions (unresolved + ambiguous); external/builtin are
      // available on request but are usually expected noise (npm/stdlib).
      // STUB-6CWWHQ Phase 2: provisional edges (single_candidate_unknown_receiver)
      // now resolve, so they are NOT in this non-resolved universe — they are
      // audited via validation_status (provisional_edges) and by reading the
      // resolved edges' evidence.confidence, not enumerated here.
      const NON_RESOLVED = new Set(['unresolved', 'ambiguous', 'external', 'builtin']);
      const wantStatus = status ?? null; // null → unresolved + ambiguous only
      const normFile = file ? normalizeSlashes(file).replace(/^@File\//, '') : null;
      const reasonQ = reason ? reason.toLowerCase() : null;

      // status breakdown over the FULL non-resolved population (pre-facet),
      // so an agent sees the shape of the whole set even when paginating a slice.
      const status_breakdown: Record<string, number> = {};
      const matched: ExportedEdge[] = [];
      for (const edge of graph.edges) {
        const st = edge.resolutionStatus;
        if (!NON_RESOLVED.has(st)) continue;
        status_breakdown[st] = (status_breakdown[st] ?? 0) + 1;

        // Facet filters (all AND-combined).
        if (wantStatus ? st !== wantStatus : st !== 'unresolved' && st !== 'ambiguous') continue;
        if (relationship && edge.relationship !== relationship) continue;
        if (edge.relationship !== 'call' && edge.relationship !== 'import') continue;
        if (normFile) {
          const ef = normalizeSlashes(edge.sourceLocation?.file ?? '');
          if (ef !== normFile && !ef.includes(normFile)) continue;
        }
        if (reasonQ && !(edge.reason ?? '').toLowerCase().includes(reasonQ)) continue;
        matched.push(edge);
      }

      // Phase 6: this tool's pre-existing offset now runs through the SHARED
      // paginate() helper — one pagination implementation across all list tools.
      // Slice the raw edges first (cheap), then map only the window.
      const paged = paginate(matched, offset, limit);
      const edges = paged.page.map(edge => {
        const ev = edge.evidence as Record<string, unknown> | undefined;
        const src = edge.sourceId ? cache.nodeById.get(edge.sourceId) : undefined;
        const out: Record<string, unknown> = {
          relationship: edge.relationship,
          status: edge.resolutionStatus,
          from: src ? { id: src.id, name: src.name, type: src.type } : { id: edge.sourceId },
          at: edge.sourceLocation
            ? `${edge.sourceLocation.file}:${edge.sourceLocation.line}`
            : undefined,
          // Evidence passthrough — the persisted per-kind detail. calls carry
          // calleeName/receiverText; imports carry originSpecifier.
          callee: ev?.calleeName as string | undefined,
          receiver: ev?.receiverText as string | undefined,
          specifier: ev?.originSpecifier as string | undefined,
          reason: edge.reason ?? (ev?.reason as string | undefined),
        };
        // P2-T3: for ambiguous edges, surface the competing symbols so an agent
        // sees exactly which candidate codeRefIds the resolver could not choose
        // between. This is the engine's signature honesty feature made visible.
        if (edge.resolutionStatus === 'ambiguous') {
          const cands = edge.candidates ?? (ev?.candidates as string[] | undefined) ?? [];
          out.candidates = cands.map(id => {
            const n = cache.nodeById.get(id);
            return n ? { id: n.id, name: n.name, file: n.file, line: n.line } : { id };
          });
        }
        return out;
      });

      const envelope: Record<string, unknown> = {
        total: paged.total,
        offset: paged.offset,
        limit: paged.limit,
        returned: edges.length,
        // Preserve the pre-Phase-6 `truncated` meaning (more-beyond-this-window)
        // and add has_more as the shared forward paging signal.
        truncated: paged.has_more,
        has_more: paged.has_more,
        filters: {
          relationship: relationship ?? null,
          status: wantStatus ?? '(unresolved+ambiguous)',
          file: file ?? null,
          reason: reason ?? null,
        },
        status_breakdown,
        edges,
      };
      // edges carry from/candidates nested objects (not top-level identity), so
      // concise here reduces the from-node and drops evidence passthrough.
      if (isConcise(response_format)) {
        envelope.format = 'concise';
        envelope.edges = edges.map(e => ({
          relationship: e.relationship,
          status: e.status,
          from: e.from,
          at: e.at,
        }));
      }
      return envelope;
    },

    source_of({ element, context, max_chars }) {
      const index = loadIndex(projectDir, cache);
      // Resolve the element from index.json (source-of works on the element
      // record, which carries the authoritative file+line — 100% coverage).
      const q = element.toLowerCase();
      let matches = index.elements.filter(
        e => e.codeRefId === element || e.name === element,
      );
      if (matches.length === 0) {
        matches = index.elements.filter(
          e =>
            e.codeRefId?.toLowerCase().includes(q) ||
            e.name?.toLowerCase().includes(q),
        );
      }
      if (matches.length === 0) return notFound(element);
      if (matches.length > 5) {
        return {
          error: 'ambiguous_element',
          query: element,
          match_count: matches.length,
          hint: 'Narrow the query — pass a full codeRefId. Candidates below.',
          candidates: matches.slice(0, 5).map(e => ({
            id: e.codeRefId, name: e.name, type: e.type, file: e.file, line: e.line,
          })),
        };
      }
      const el = matches[0];
      // index.json stores an ABSOLUTE file path for some elements and a
      // project-relative one for others; normalize to an on-disk path.
      const relFile = normalizeSlashes(el.file ?? '');
      const absFile = path.isAbsolute(el.file ?? '')
        ? (el.file as string)
        : path.join(projectDir, relFile);
      let fileContent: string;
      try {
        fileContent = fs.readFileSync(absFile, 'utf8');
      } catch (e: any) {
        return {
          error: 'source_unavailable',
          query: element,
          file: el.file,
          detail: String(e?.message ?? e).slice(0, 200),
          hint: 'The element resolved but its source file could not be read (moved/deleted? re-run the pipeline).',
        };
      }
      // Bounded line-window slice around the element's start line — the same
      // approach chunk-converter uses for RAG (index.json carries a start line
      // only, no end, so a context window is the honest, RAG-free body view).
      const lines = fileContent.split('\n');
      const ctx = Math.max(0, Math.min(200, context ?? 40));
      const startLine = el.line ?? 1;
      const lo = Math.max(0, startLine - 1);
      const hi = Math.min(lines.length, startLine - 1 + ctx);
      let snippet = lines.slice(lo, hi).join('\n');
      const capChars = Math.max(1, Math.min(20000, max_chars ?? 4000));
      let charTruncated = false;
      if (snippet.length > capChars) {
        snippet = snippet.slice(0, capChars);
        charTruncated = true;
      }
      const lineTruncated = hi < lines.length && (hi - lo) >= ctx;
      return {
        element: el.codeRefId ?? el.name,
        name: el.name,
        type: el.type,
        file: el.file,
        start_line: startLine,
        end_line: lo + (snippet.split('\n').length),
        lines_returned: snippet.split('\n').length,
        line_truncated: lineTruncated,
        char_truncated: charTruncated,
        source: snippet,
      };
    },

    find_all_references({ element, limit, offset, response_format }) {
      const graph = loadGraph(projectDir, cache);
      const { nodes: matches, byFile } = resolveNodes(element, graph);
      if (matches.length === 0) return notFound(element);
      if (!byFile && matches.length > 5) return ambiguous(element, matches);

      const targetIds = new Set(matches.map(m => m.id));
      const targetFiles = new Set(matches.map(m => normalizeSlashes(m.file ?? '')).filter(Boolean));

      const callRefs: Array<Record<string, unknown>> = [];
      const importRefs: Array<Record<string, unknown>> = [];
      // Inbound RESOLVED call + import sites in one pass (the traversable refs).
      for (const id of targetIds) {
        for (const edge of cache.inbound.get(id) ?? []) {
          const src = edge.sourceId ? cache.nodeById.get(edge.sourceId) : undefined;
          const ref = {
            ...(src ? nodeSummary(src) : { id: edge.sourceId }),
            at: edge.sourceLocation
              ? `${edge.sourceLocation.file}:${edge.sourceLocation.line}`
              : undefined,
          };
          if (edge.relationship === 'call') callRefs.push(ref);
          else if (edge.relationship === 'import') importRefs.push(ref);
        }
      }

      // typeOnly imports are ADDITIVE, NON-TRAVERSABLE references (RISK-06):
      // the engine emits them as resolutionStatus='typeOnly' edges with NO
      // targetId (module-grain), so they never entered cache.inbound and are
      // invisible to what_imports. We surface them here matched by the imported
      // module resolving to the target element's file — best-effort, clearly
      // labelled, and WITHOUT reclassifying them or touching validation counts.
      const typeRefs: Array<Record<string, unknown>> = [];
      if (targetFiles.size > 0) {
        for (const edge of graph.edges) {
          if (edge.resolutionStatus !== 'typeOnly') continue;
          const spec = (edge.evidence as { originSpecifier?: string } | undefined)?.originSpecifier ?? '';
          // Resolve the import specifier's basename against the target file's
          // basename — a heuristic module match (no resolver rerun on read).
          const specBase = normalizeSlashes(spec).replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/,'').split('/').pop() ?? '';
          if (!specBase) continue;
          const hit = [...targetFiles].some(f => {
            const fBase = f.replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/,'').split('/').pop() ?? '';
            return fBase === specBase;
          });
          if (!hit) continue;
          typeRefs.push({
            from: edge.sourceId,
            specifier: spec,
            at: edge.sourceLocation ? `${edge.sourceLocation.file}:${edge.sourceLocation.line}` : undefined,
            traversable: false,
          });
        }
      }

      const total = callRefs.length + importRefs.length + typeRefs.length;
      // Phase 6: the three parallel ref lists page under one shared offset/limit
      // window. has_more is true if ANY list has more beyond the window.
      const pagedCalls = paginate(callRefs, offset, limit);
      const pagedImports = paginate(importRefs, offset, limit);
      const pagedTypes = paginate(typeRefs, offset, limit);
      const anyMore = pagedCalls.has_more || pagedImports.has_more || pagedTypes.has_more;
      const envelope: Record<string, unknown> = {
        element: byFile
          ? [`(all ${matches.length} elements of) ${element}`]
          : matches.map(m => m.id),
        total_references: total,
        call_site_count: callRefs.length,
        import_site_count: importRefs.length,
        type_reference_count: typeRefs.length,
        offset: pagedCalls.offset,
        limit: pagedCalls.limit,
        note: typeRefs.length > 0
          ? 'type_references are import-type-only edges (resolutionStatus=typeOnly): additive + non-traversable; matched heuristically by module basename. Validation counts unchanged.'
          : undefined,
        call_sites: pagedCalls.page,
        import_sites: pagedImports.page,
        type_references: pagedTypes.page,
        truncated: anyMore,
        has_more: anyMore,
      };
      return shapeResponse(envelope, response_format, ['call_sites', 'import_sites']);
    },

    symbol_context({ element, include_source, cap, response_format }) {
      // Consolidated card (Phase 7). A JOIN over the substrate the sibling
      // tools already expose — no new resolution/analysis. Load graph + index +
      // query engine ONCE, resolve the subject with the shared envelope, then
      // hand the already-loaded pieces to the pure assembler.
      const graph = loadGraph(projectDir, cache);
      const index = loadIndex(projectDir, cache);
      const engine = loadCanonical(projectDir, cache);
      const { nodes: matches, byFile } = resolveNodes(element, graph);
      if (matches.length === 0) return notFound(element);
      // symbol_context is a SINGLE-symbol card: a whole-file query (or >5
      // matches) is an ambiguity to narrow, not an aggregate to join.
      if (byFile || matches.length > 1) return ambiguous(element, matches);
      const node = matches[0];

      // Match the resolved node to its index element (header/layer/capability
      // presence live in index.json). Prefer codeRefId, else name+file+line.
      const nodeFile = normalizeSlashes(node.file ?? '');
      const indexElement =
        index.elements.find(e => e.codeRefId && e.codeRefId === node.id) ??
        index.elements.find(
          e =>
            e.name === node.name &&
            normalizeSlashes(e.file ?? '') === nodeFile &&
            (node.line === undefined || e.line === node.line),
        );

      // Inbound RESOLVED edges targeting this node — the same reverse-adjacency
      // cache what_calls/find_all_references read. Feeds refs + test-linkage.
      const inboundEdges = cache.inbound.get(node.id) ?? [];

      // Element-file mtime vs graph.json mtime = the staleness heuristic (NOT
      // the Phase-8 hash manifest). Absolute-or-relative index path normalized
      // the same way source_of does.
      let elementFileMtimeMs: number | null = null;
      try {
        const absFile = path.isAbsolute(node.file ?? '')
          ? (node.file as string)
          : path.join(projectDir, nodeFile);
        elementFileMtimeMs = fs.statSync(absFile).mtimeMs;
      } catch {
        elementFileMtimeMs = null; // freshness unknown → treated as not-stale
      }
      const graphMtimeMs = cache.graphMtimeMs;

      const card: SymbolContext = assembleSymbolContext(
        {
          node,
          indexElement,
          query: engine,
          inboundEdges,
          resolveSource: (sourceId: string) => {
            const n = cache.nodeById.get(sourceId);
            return n ? { id: n.id, name: n.name, type: n.type, file: n.file, line: n.line } : undefined;
          },
          isTestFile,
          elementFileMtimeMs,
          graphMtimeMs,
        },
        { cap: clampLimit(cap) },
      );

      // include_source (opt-in): attach a bounded signature/body slice — the
      // same RAG-free line-window approach source_of uses — so the card can
      // stand alone for understand-before-edit. Inlined (not a this.source_of
      // call) to avoid method-binding fragility; the handler object has no
      // other cross-method references.
      let source: Record<string, unknown> | undefined;
      if (include_source) {
        try {
          const absFile = path.isAbsolute(node.file ?? '')
            ? (node.file as string)
            : path.join(projectDir, nodeFile);
          const lines = fs.readFileSync(absFile, 'utf8').split('\n');
          const startLine = node.line ?? 1;
          const ctx = 40; // signature-grade window (source_of default)
          const lo = Math.max(0, startLine - 1);
          const hi = Math.min(lines.length, lo + ctx);
          let snippet = lines.slice(lo, hi).join('\n');
          let charTruncated = false;
          if (snippet.length > 4000) {
            snippet = snippet.slice(0, 4000);
            charTruncated = true;
          }
          source = {
            file: node.file,
            start_line: startLine,
            lines_returned: snippet.split('\n').length,
            line_truncated: hi < lines.length && hi - lo >= ctx,
            char_truncated: charTruncated,
            source: snippet,
          };
        } catch (e: any) {
          source = {
            error: 'source_unavailable',
            file: node.file,
            detail: String(e?.message ?? e).slice(0, 200),
          };
        }
      }

      const envelope: Record<string, unknown> = {
        element: node.id,
        identity: card.identity,
        header: card.header,
        neighborhood: card.neighborhood,
        references: card.references,
        test_linkage: card.test_linkage,
        staleness: card.staleness,
        ...(source ? { source } : {}),
      };
      // Concise is a genuine token cut, not a marker: it keeps every COUNT +
      // identity + header + staleness, and reduces each list facet to its
      // {total, returned, truncated} summary — dropping the neighbor/site
      // arrays an agent can page in via the neighbor tools when it actually
      // needs them. Same surfaces-not-verdicts rule as Phase 6: counts/total
      // are never lost; only body detail is. The source slice is dropped too.
      if (isConcise(response_format)) {
        const dirSummary = (d: { neighbors: unknown[]; total: number; truncated: boolean }) => ({
          returned: d.neighbors.length,
          total: d.total,
          truncated: d.truncated,
        });
        return {
          element: node.id,
          identity: card.identity,
          header: card.header,
          neighborhood: {
            resolved: card.neighborhood.resolved,
            callers: dirSummary(card.neighborhood.callers),
            callees: dirSummary(card.neighborhood.callees),
            imports: dirSummary(card.neighborhood.imports),
            importedBy: dirSummary(card.neighborhood.importedBy),
          },
          references: {
            call_site_count: card.references.call_site_count,
            import_site_count: card.references.import_site_count,
            total: card.references.total,
          },
          test_linkage: { test_ref_count: card.test_linkage.test_ref_count },
          staleness: card.staleness,
          format: 'concise' as const,
        };
      }
      return envelope;
    },

    // ---- CLI/MCP parity (WO-...-CLI-MCP-PARITY-001 P6) ----------------------
    // pack_context + rename_preview are READ tools (they only load
    // .coderef/graph.json + read source). rename_preview is PREVIEW-ONLY: no
    // apply arg, no write — source mutation lives exclusively on the
    // coderef-rename CLI. See buildToolHandlers header + the registerTool blocks.

    pack_context({ element, token_budget, full_deps, include_callers }) {
      // Wrap the clean substrate export. full_deps=true opts back into full
      // dependency windows (compressDeps=false); default compresses deps.
      // include_callers=true (Phase 4, ego-graph) also packs the focus's 1-hop
      // inbound callers (who calls it), signature-compressed — the
      // understand-before-edit view. Default off = bundle byte-unchanged.
      try {
        const result = packContext(projectDir, element, {
          tokenBudget: token_budget,
          compressDeps: full_deps ? false : undefined,
          includeCallers: include_callers ?? false,
        });
        return { bundle: result.bundle, manifest: result.manifest };
      } catch (e: any) {
        // packContext throws Error('focus not found: ...') on a miss — surface
        // the same clean not-found envelope the resolved-edge tools use.
        const msg = String(e?.message ?? e);
        if (/focus not found/i.test(msg)) return notFound(element);
        return { error: 'pack_failed', query: element, detail: msg.slice(0, 300) };
      }
    },

    rename_preview({ old_name, new_name, min_confidence }) {
      // Dry-run ONLY. planRename reads the canonical graph and returns the plan
      // (sites/typeOnlyRefs/ambiguities). It writes NOTHING. There is
      // deliberately NO apply path here — a stray apply-arg regression would be
      // caught by the mcp-server test's write-confinement guard.
      // Phase 3: each site carries its confidence tier (declaration sites are
      // 'exact'; reference sites echo their edge tier). min_confidence tightens
      // the reference sites to the threshold — e.g. 'exact' leaves only the
      // auto-apply-safe sites, dropping provisional single-candidate ones.
      try {
        const plan = planRename(projectDir, old_name, new_name, min_confidence);
        // Tier tally so an agent can see the safe-vs-review split at a glance.
        const byConfidence: Record<string, number> = {};
        for (const s of plan.sites) byConfidence[s.confidence] = (byConfidence[s.confidence] ?? 0) + 1;
        return {
          old_name: plan.oldName,
          new_name: plan.newName,
          preview_only: true,
          apply_hint: 'To apply, run the coderef-rename CLI (--apply). MCP is preview-only.',
          ...(plan.minConfidence ? { min_confidence: plan.minConfidence } : {}),
          target_ids: plan.targetIds,
          site_count: plan.sites.length,
          sites_by_confidence: byConfidence,
          sites: plan.sites,
          type_only_refs: plan.typeOnlyRefs,
          ambiguities: plan.ambiguities,
        };
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (/symbol not found/i.test(msg)) return notFound(old_name);
        return { error: 'rename_preview_failed', query: old_name, detail: msg.slice(0, 300) };
      }
    },

    map({ refresh, format, token_budget, git } = {}) {
      // .coderef-WRITE (confined to <projectDir>/.coderef/map/). Same bounded
      // build-if-missing substrate contract as every other tool: loadGraph
      // runs ensureArtifacts first (auto-populate under the file ceiling,
      // actionable BuildHintError above it). The map itself regenerates when
      // forced (refresh=true), absent, or older than graph.json — so agents
      // always read a data.json consistent with the current graph.
      loadGraph(projectDir, cache);
      const graphPath = path.join(projectDir, '.coderef', 'graph.json');
      const dataPath = path.join(projectDir, '.coderef', 'map', 'data.json');
      const htmlPath = path.join(projectDir, '.coderef', 'map', 'graph.html');
      const stale =
        !fs.existsSync(dataPath) ||
        !fs.existsSync(htmlPath) ||
        fs.statSync(dataPath).mtimeMs < fs.statSync(graphPath).mtimeMs;
      // The git-behavioral block is OPT-IN and only produced by a git-enabled
      // generation (extractGitHistory runs in generateMap). A cached data.json
      // never carries it, so git:true forces a regeneration even when fresh.
      let data;
      let refreshed = false;
      let gitReason: string | undefined;
      if (git) {
        const gen = generateMap(projectDir, undefined, { git: true });
        data = gen.data;
        gitReason = gen.gitReason;
        refreshed = true;
      } else if (refresh || stale) {
        data = generateMap(projectDir).data;
        refreshed = true;
      } else {
        data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      }
      // Skeleton format: same emission wrapper the CLI --skeleton flag uses
      // (one write path). Returned INLINE — the whole point is a
      // prompt-injectable orientation artifact without a second read.
      let skeleton;
      if (format === 'skeleton') {
        skeleton = emitSkeleton(
          projectDir,
          data,
          undefined,
          token_budget !== undefined ? { tokenBudget: token_budget } : undefined,
        );
      }
      return {
        data_path: normalizeSlashes(dataPath),
        graph_html_path: normalizeSlashes(htmlPath),
        refreshed,
        generated_at: data.meta?.generatedAt ?? null,
        node_count: data.nodes.length,
        edge_count: data.edges.length,
        hotspot_count: data.overlays?.hotspots?.length ?? 0,
        cycle_count: data.overlays?.cycles?.length ?? 0,
        // Analytics summary (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P1); null when
        // reading an older data.json without the analytics block.
        community_count: data.analytics?.communityCount ?? null,
        isolated_count: data.analytics?.deadCode?.isolated?.length ?? null,
        // Edge-evidence summary (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P2); null
        // when reading a pre-1.2 data.json without evidence blocks.
        evidence_edge_count: Array.isArray(data.edges)
          ? (data.edges.some((e: any) => e.evidence)
              ? data.edges.filter((e: any) => e.evidence).length
              : null)
          : null,
        // Layer-drift summary (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P3); null
        // when reading a pre-1.3 data.json without the drift block.
        drift_outlier_count: data.drift ? (data.drift.outliers?.length ?? 0) : null,
        declared_layer_count: data.drift
          ? Object.keys(data.drift.coverage?.byLayer ?? {}).length
          : null,
        // Engineering-metrics summary (WO-MAP-GRAPH-ANALYTICS-MODULE-001 P4);
        // null when reading a pre-1.4 data.json without the metrics block.
        untested_src_count: data.metrics
          ? (data.metrics.testLinkage?.summary?.srcWithoutTestEdgeCount ?? 0)
          : null,
        undocumented_file_count: data.metrics
          ? (data.metrics.documentation?.summary?.filesWithNonDefinedCount ?? 0)
          : null,
        // Git-behavioral summary (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2);
        // opt-in via git:true. null when not requested or the block is absent
        // (non-git repo / git absent / empty history — see git_block_reason).
        git_commits_scanned: data.git ? (data.git.window?.commitsScanned ?? 0) : null,
        churn_hotspot_count: data.git ? (data.git.churnHotspots?.summary?.scoredFileCount ?? 0) : null,
        coupling_drift_count: data.git ? (data.git.couplingDrift?.summary?.driftPairCount ?? 0) : null,
        git_block_reason: git ? (data.git ? null : (gitReason ?? 'no_history')) : null,
        // Ownership/knowledge summary (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001
        // P2); rides the same opt-in git:true switch. null when not requested or the
        // block is absent (non-git repo, git absent, empty history, or a window with
        // no author fields — the git_block_reason above explains the shared cause).
        ownership_file_count: data.ownership ? (data.ownership.summary?.filesWithAuthorship ?? 0) : null,
        single_author_file_count: data.ownership ? (data.ownership.summary?.singleAuthorFileCount ?? 0) : null,
        warnings: data.meta?.warnings ?? [],
        // Skeleton block (format:'skeleton' only) — token-budgeted plaintext
        // repo map, inline for direct prompt injection.
        ...(skeleton
          ? {
              format: 'skeleton',
              skeleton_text: skeleton.text,
              skeleton_estimated_tokens: skeleton.estimatedTokens,
              skeleton_token_budget: skeleton.tokenBudget,
              skeleton_included_files: skeleton.includedFiles,
              skeleton_omitted_files: skeleton.omittedFiles,
              skeleton_path: normalizeSlashes(skeleton.skeletonPath),
              skeleton_warnings: skeleton.warnings,
            }
          : {}),
        hint:
          'data_path is the same file-level MapData the viewer renders (nodes=files with embedded elements, edges=resolved file deps carrying per-edge evidence: provenance classes, line-sorted samples, ambiguous-candidate counts; hotspot/cycle overlays, graph-analytics block: communities/centrality/bridges/coupling/dead-code candidates; drift block: declared @layer coverage, layer->layer dependency matrix, per-community layer composition, layer-outlier files — surfaces, not verdicts). Open graph_html_path in a browser for the visual map, or read data.json directly. Pass format:"skeleton" for a token-budgeted plaintext orientation map returned inline (skeleton_text).',
        writes_confined_to: path.join(projectDir, '.coderef', 'map'),
      };
    },

    map_metrics_delta({ before, after, snapshot, snapshot_label, response_format } = {}) {
      // .coderef-WRITE (snapshot mode only, confined to <projectDir>/.coderef/map/).
      // The five MapMetrics families ride in .coderef/map/data.json (data.metrics),
      // written by the map tool. This tool NEVER recomputes metrics — it reads two
      // MapMetrics snapshots and diffs them (a pure JOIN over existing substrate).
      const mapDir = path.join(projectDir, '.coderef', 'map');
      const dataPath = path.join(mapDir, 'data.json');
      const snapPath = (label: string) =>
        path.join(mapDir, `metrics-snapshot-${label.replace(/[^A-Za-z0-9._-]/g, '_')}.json`);

      // Read the current data.metrics, regenerating the map when data.json is
      // absent/stale (mirrors the map handler's build-if-missing contract).
      const currentMetrics = (): MapMetrics | undefined => {
        loadGraph(projectDir, cache);
        const graphPath = path.join(projectDir, '.coderef', 'graph.json');
        const stale =
          !fs.existsSync(dataPath) ||
          fs.statSync(dataPath).mtimeMs < fs.statSync(graphPath).mtimeMs;
        const data = stale
          ? generateMap(projectDir).data
          : JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        return (data as { metrics?: MapMetrics }).metrics;
      };

      // Load a MapMetrics from an explicit path: a snapshot sidecar (bare
      // MapMetrics) OR a full data.json (its .metrics block). Returns undefined
      // when the file is absent or carries no metrics (pre-1.4 map) — the caller
      // surfaces that as declared no-data, never a throw.
      const loadMetricsFrom = (p: string): MapMetrics | undefined => {
        if (!fs.existsSync(p)) return undefined;
        try {
          const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (parsed && typeof parsed === 'object' && 'metrics' in parsed) {
            return (parsed as { metrics?: MapMetrics }).metrics;
          }
          // A bare snapshot sidecar IS a MapMetrics (has the five families).
          if (parsed && typeof parsed === 'object' && 'testLinkage' in parsed) {
            return parsed as MapMetrics;
          }
          return undefined;
        } catch {
          return undefined;
        }
      };

      // SNAPSHOT mode: copy the current data.metrics to a named sidecar (a pure
      // read/copy — no diff). Confined to .coderef/map/.
      if (snapshot) {
        const label = snapshot_label && snapshot_label.length ? snapshot_label : 'baseline';
        const metrics = currentMetrics();
        if (!metrics) {
          return {
            action: 'snapshot',
            ok: false,
            warning:
              'no metrics block in .coderef/map/data.json (pre-1.4 map or empty repo) — nothing to snapshot',
            data_path: normalizeSlashes(dataPath),
            writes_confined_to: normalizeSlashes(mapDir),
          };
        }
        const out = snapPath(label);
        fs.writeFileSync(out, JSON.stringify(metrics, null, 2), 'utf8');
        return {
          action: 'snapshot',
          ok: true,
          snapshot_label: label,
          snapshot_path: normalizeSlashes(out),
          schema_version: metrics.schemaVersion,
          hint: `Snapshot saved. Refactor, then diff: map_metrics_delta({ before: "${label}" }) compares this snapshot to the current map.`,
          writes_confined_to: normalizeSlashes(mapDir),
        };
      }

      // DELTA mode. Resolve BEFORE: an explicit path, else the named snapshot
      // sidecar (default label 'baseline'). Resolve AFTER: an explicit path, else
      // the current data.metrics.
      const beforeIsPath = before && (before.includes('/') || before.includes('\\') || before.endsWith('.json'));
      const beforePath = before ? (beforeIsPath ? path.resolve(projectDir, before) : snapPath(before)) : snapPath('baseline');
      const beforeMetrics = loadMetricsFrom(beforePath);

      const afterMetrics = after ? loadMetricsFrom(path.resolve(projectDir, after)) : currentMetrics();

      const missing: string[] = [];
      if (!beforeMetrics) {
        missing.push(
          before
            ? `before (${normalizeSlashes(beforePath)})`
            : `before (no snapshot at ${normalizeSlashes(snapPath('baseline'))} — run map_metrics_delta({ snapshot: true }) first)`,
        );
      }
      if (!afterMetrics) {
        missing.push(after ? `after (${normalizeSlashes(path.resolve(projectDir, after))})` : 'after (current map has no metrics block — pre-1.4 or empty repo)');
      }
      if (missing.length) {
        return {
          action: 'delta',
          ok: false,
          warning: `metrics snapshot unavailable: ${missing.join('; ')}`,
          hint: 'Snapshot the baseline first: map_metrics_delta({ snapshot: true }), refactor, then map_metrics_delta({}).',
          before_path: normalizeSlashes(beforePath),
        };
      }

      const delta: MapMetricsDelta = diffMapMetrics(beforeMetrics, afterMetrics);

      const envelope: Record<string, unknown> = {
        action: 'delta',
        ok: true,
        schema_version: delta.schemaVersion,
        before_path: normalizeSlashes(beforePath),
        // The five decomposed family deltas — NEVER summed into a composite score.
        testLinkage: delta.testLinkage,
        documentation: delta.documentation,
        unresolvedRefs: delta.unresolvedRefs,
        largestModules: delta.largestModules,
        mostDependencies: delta.mostDependencies,
        warnings: delta.warnings,
        note: delta.note,
        hint: 'A decomposed per-family factor vector — NO composite score. Each family reports direction (PROVENANCE, not a verdict) + its own scalar/Record/ranking deltas. A regression in one family is never hidden by a gain in another.',
      };

      // Concise: per-family direction + noData only; drop the scalar/Record/ranking
      // detail. Counts/provenance (schema_version, warnings) preserved.
      if (isConcise(response_format)) {
        const dir = (f: MetricsFamilyDelta) => ({ noData: f.noData, direction: f.direction });
        return {
          action: 'delta',
          ok: true,
          format: 'concise',
          schema_version: delta.schemaVersion,
          testLinkage: dir(delta.testLinkage),
          documentation: dir(delta.documentation),
          unresolvedRefs: dir(delta.unresolvedRefs),
          largestModules: dir(delta.largestModules),
          mostDependencies: dir(delta.mostDependencies),
          warnings: delta.warnings,
          note: delta.note,
        };
      }
      return envelope;
    },

    async rag_status() {
      // Read-only: delegates to the extracted readRagStatus (reads only
      // .coderef/rag-index.json + coderef-vectors.json). Reports cleanly when no
      // index exists (health='missing', metadata=null) — never throws for that.
      try {
        const status = await readRagStatus(projectDir);
        return { ...status };
      } catch (e: any) {
        return {
          error: 'rag_status_failed',
          detail: String(e?.message ?? e).slice(0, 300),
        };
      }
    },

    async reindex({ incremental } = {}) {
      // .coderef-WRITE: DELEGATES to the extracted runPopulate, which writes
      // ONLY under <projectDir>/.coderef/ (no new write path, no output-dir
      // arg). `incremental` is accepted for CLI-ergonomic parity, but a graph-
      // safe incremental populate needs a changed-file list the MCP surface
      // does not carry; with none supplied the pipeline runs a full rebuild
      // (populate's default) — always safe and complete. Reported as `mode`.
      try {
        const summary = await runPopulate(defaultPopulateArgs(projectDir), {
          programmatic: true,
        });
        return {
          ...summary,
          mode: 'full',
          incremental_requested: incremental ?? false,
          writes_confined_to: path.join(projectDir, '.coderef'),
        };
      } catch (e: any) {
        return {
          error: 'reindex_failed',
          detail: String(e?.message ?? e).slice(0, 500),
          hint: 'Populate failed (validation gate, missing source, or layer enum). See server stderr for the specific validation errors.',
        };
      }
    },

    async rag_index(args: { concurrency?: number; embed_cache?: boolean } = {}) {
      // .coderef-WRITE: DELEGATES to the extracted runRagIndex over LOCAL Ollama
      // (defaultRagIndexArgs pins provider='ollama' — NO cloud fallback). Writes
      // only .coderef/rag-index.json + the vector store. Errors CLEANLY when the
      // embedder/Ollama is unreachable (mirrors rag_search's embedding_unavailable
      // envelope) instead of crashing the server.
      try {
        // Thread P5 knobs over the local-only defaults: concurrency (Ollama
        // embed pool; undefined -> provider default) and embed_cache (chunk
        // cache; defaults ON unless explicitly false).
        const ragArgs = defaultRagIndexArgs(projectDir);
        if (typeof args.concurrency === 'number') {
          ragArgs.concurrency = args.concurrency;
        }
        if (typeof args.embed_cache === 'boolean') {
          ragArgs.embedCache = args.embed_cache;
        }
        const summary = await runRagIndex(ragArgs, {
          programmatic: true,
        });
        // The orchestrator catches embedding failures INTERNALLY and returns
        // status='failed' with zero chunks rather than throwing — the exact
        // shape produced when Ollama is unreachable (every batch embed fails).
        // Surface that as a clean embedding_unavailable envelope so an agent
        // never mistakes a zero-chunk failed run for a successful index.
        if (summary.status === 'failed' || summary.chunksIndexed === 0) {
          return {
            error: 'embedding_unavailable',
            provider: 'ollama',
            status: summary.status,
            chunksIndexed: summary.chunksIndexed,
            chunksFailed: summary.chunksFailed,
            hint: 'No chunks were embedded. Is Ollama running with the embedding model pulled? (ollama serve; ollama pull nomic-embed-text). Also ensure populate-coderef ran first so .coderef/validation-report.json exists.',
          };
        }
        return {
          ...summary,
          provider: 'ollama',
          writes_confined_to: path.join(projectDir, '.coderef'),
        };
      } catch (e: any) {
        // A THROW (e.g. validation gate refused, RAG deps missing) also lands
        // here — surfaced cleanly, never crashing the server.
        return {
          error: 'embedding_unavailable',
          provider: 'ollama',
          detail: String(e?.message ?? e).slice(0, 300),
          hint: 'Is Ollama running with the embedding model pulled? (ollama serve; ollama pull nomic-embed-text). Also ensure populate-coderef ran first so .coderef/validation-report.json exists.',
        };
      }
    },
  };
}

// ---- per-repo handler registry (WO-MCP-REPO-AGNOSTIC-ANY-REPO-001) ---------------
// The server is REPO-AGNOSTIC: every tool call names its target repo via a
// REQUIRED project_root argument (pure CLI semantics — no hidden default, no
// cwd walk-up, no env fallback; operator-locked 2026-07-14). handlersFor
// resolves + validates the root, then memoizes one buildToolHandlers per
// DISTINCT canonical root so repeated calls reuse the mtime-invalidated
// artifact cache. buildToolHandlers itself is unchanged — it remains the
// per-repo factory this registry calls.

/** Tagged error for project_root resolution failures — mapped to the
 * structured error envelope at the tool-call boundary (never a raw throw). */
class RootResolutionError extends Error {
  constructor(
    public code:
      | 'project_root_nonexistent'
      | 'project_root_access_denied'
      | 'project_root_symlink_loop'
      | 'project_root_symlink_broken',
    public hint: string,
  ) {
    super(code);
    this.name = 'RootResolutionError';
  }
}

const handlerRegistry = new Map<string, ToolHandlers>();

/**
 * Resolve a caller-supplied project_root to a canonical on-disk directory.
 * Relative paths resolve against the anchor (launch --project-dir, default
 * cwd); absolute paths ignore the anchor. Symlinks are canonicalized via
 * fs.realpathSync — native OS loop detection (ELOOP) rather than a
 * hand-rolled hop walk (RESOLUTION-DESIGN.md ADJ-01; same error contract).
 */
function resolveProjectRoot(project_root: string, anchor: string): string {
  const resolved = path.resolve(anchor, project_root);
  let canonical: string;
  try {
    canonical = fs.realpathSync(resolved);
  } catch (e: any) {
    const code = e?.code;
    if (code === 'ELOOP') {
      throw new RootResolutionError(
        'project_root_symlink_loop',
        `circular symlink detected resolving ${resolved} — fix the link chain`,
      );
    }
    if (code === 'EACCES' || code === 'EPERM') {
      throw new RootResolutionError(
        'project_root_access_denied',
        `permission denied at ${resolved} — check directory permissions`,
      );
    }
    // ENOENT: distinguish a broken symlink (the path ENTRY exists as a link
    // whose target is missing) from a plainly nonexistent path.
    let isBrokenLink = false;
    let linkTarget = '(unreadable)';
    try {
      if (fs.lstatSync(resolved).isSymbolicLink()) {
        isBrokenLink = true;
        try {
          linkTarget = fs.readlinkSync(resolved);
        } catch {
          // keep placeholder
        }
      }
    } catch {
      // lstat ENOENT too → plainly nonexistent
    }
    if (isBrokenLink) {
      throw new RootResolutionError(
        'project_root_symlink_broken',
        `${resolved} is a symlink to a nonexistent target: ${linkTarget}`,
      );
    }
    throw new RootResolutionError(
      'project_root_nonexistent',
      `${resolved} does not exist — create the dir or check the path`,
    );
  }
  if (!fs.statSync(canonical).isDirectory()) {
    throw new RootResolutionError(
      'project_root_nonexistent',
      `${canonical} is not a directory — project_root must be the repo root containing .coderef/`,
    );
  }
  return canonical;
}

/**
 * Per-repo handler registry: one memoized ToolHandlers per distinct canonical
 * root. Memoization happens only AFTER resolution succeeds — a failed
 * resolution caches nothing (errors never pollute the registry).
 * Exported for the repo-agnostic behavioral tests.
 */
export function handlersFor(project_root: string, anchor: string = process.cwd()): ToolHandlers {
  const canonical = resolveProjectRoot(project_root, anchor);
  let handlers = handlerRegistry.get(canonical);
  if (!handlers) {
    handlers = buildToolHandlers(canonical);
    handlerRegistry.set(canonical, handlers);
  }
  return handlers;
}

// ---- MCP wiring -----------------------------------------------------------------

function toContent(payload: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
}

/**
 * Convert any resolution or handler error into the structured per-repo error
 * envelope { error, project_root, hint } (RESOLUTION-DESIGN.md taxonomy).
 * NEVER falls back to another repo's data; never re-throws (a raw throw would
 * surface as an SDK-level error instead of this agent-actionable payload).
 * Exported for the repo-agnostic behavioral tests (they mirror perRepo:
 * handlersFor + errorPayload is exactly the tool-call boundary).
 */
export function errorPayload(e: unknown, project_root: string): Record<string, unknown> {
  if (e instanceof RootResolutionError) {
    return { error: e.code, project_root, hint: e.hint };
  }
  if (e instanceof BuildHintError) {
    // BuildHintError.hint carries the code-like tag from ensureArtifacts
    // (coderef_artifacts_missing / repo_too_large_for_auto_build /
    // coderef_build_failed / coderef_build_incomplete). Alias the incomplete
    // tag onto the taxonomy's artifact-scoped name.
    const code = e.hint === 'coderef_build_incomplete' ? 'coderef_artifacts_incomplete' : e.hint;
    return { error: code, project_root, hint: e.detail ?? e.hint };
  }
  if (e instanceof SyntaxError) {
    // JSON.parse failure inside loadGraph/loadIndex — corrupt artifacts.
    return {
      error: 'coderef_artifacts_corrupt',
      project_root,
      hint: `artifact JSON failed to parse (${String(e.message).slice(0, 120)}) — delete .coderef/ and rebuild with populate-coderef`,
    };
  }
  return {
    error: 'tool_failed',
    project_root,
    hint: String((e as { message?: unknown })?.message ?? e).slice(0, 300),
  };
}

async function main(): Promise<void> {
  // --project-dir/-p or positional arg — DEMOTED to an optional DEFAULT ANCHOR
  // (WO-MCP-REPO-AGNOSTIC-ANY-REPO-001): it is used ONLY to resolve a RELATIVE
  // per-call project_root (path.resolve(anchor, project_root)); an absolute
  // project_root ignores it. It NEVER binds the tools to a default repo — a
  // call without project_root is schema-rejected regardless of the anchor.
  const argv = process.argv.slice(2);
  let anchor = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--project-dir' || arg === '-p') anchor = argv[++i];
    else if (arg.startsWith('--project-dir=')) anchor = arg.slice('--project-dir='.length);
    else if (!arg.startsWith('-')) anchor = arg;
  }
  anchor = path.resolve(anchor);

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  /** Route one tool call to its named repo's handlers; convert every
   * resolution/handler error into the structured envelope (P2-T4). On success,
   * attach the Phase-8 staleness block (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001
   * / STUB-G5PDE9) so EVERY read response reports whether the graph predates a
   * recent source edit — the stub's "every MCP response reports stale-file count".
   * Additive + non-clobbering: never overwrites a handler's own field, never
   * attached to an error envelope, and best-effort (a freshness-check failure
   * degrades to no block, never breaks the tool). */
  const perRepo = async (
    project_root: string,
    fn: (h: ToolHandlers) => Record<string, unknown> | Promise<Record<string, unknown>>,
  ) => {
    try {
      const payload = await fn(handlersFor(project_root, anchor));
      attachStaleness(payload, project_root, anchor);
      return toContent(payload);
    } catch (e) {
      return toContent(errorPayload(e, project_root));
    }
  };

  const projectRootArg = z
    .string()
    .describe(
      'REQUIRED. Absolute or anchor-relative path to the target repo root (the directory containing .coderef/). The server serves whichever indexed repo you name — pure CLI semantics, no default repo.',
    );
  const elementArg = z
    .string()
    .describe('Element to query: codeRefId (e.g. "@Fn/src/foo.ts#bar:12"), element name, or file path fragment');
  const limitArg = z.number().optional().describe(`Max results (default ${DEFAULT_LIMIT}, cap ${MAX_LIMIT})`);
  // Phase 6 (STUB-8H3YV0): shared response_format + offset args, threaded onto
  // every list-returning tool so agent-discovery descriptions stay uniform.
  const offsetArg = z
    .number()
    .optional()
    .describe(
      `Pagination offset into the full result set (default 0). Page with offset+limit; the response reports {offset, limit, total, has_more} so you can tell when a next page exists (total is always the true pre-page count).`,
    );
  const responseFormatArg = z
    .enum(['concise', 'detailed'])
    .optional()
    .describe(
      `Verbosity of the response (default 'detailed' = full shape). 'concise' returns counts + identity fields (id/name/file/line) only, dropping per-item body detail for a ~1/3 token cut — request concise first, escalate to detailed only when you need the extra fields. A verbosity choice over the SAME facts (counts/total preserved), never a filter or a quality verdict.`,
    );
  const minConfidenceArg = z
    .enum(['exact', 'strong', 'heuristic', 'inferred'])
    .optional()
    .describe(
      'Confidence-tier floor (Phase 3): keep only edges/sites whose tier >= this. exact>strong>heuristic>inferred. ' +
      'Reports edge PROVENANCE, not a quality verdict. Because traversal is already resolved-only, this differentiates ' +
      'exact vs heuristic (provisional single-candidate) WITHIN the resolved set — it does not resurface unresolved edges. Omit for no filter.',
    );

  server.registerTool(
    'what_calls',
    {
      title: 'What calls this element',
      description:
        'List the resolved call sites that invoke the given element (inbound call edges from .coderef/graph.json). Compact: caller id/name/file/line plus call location and confidence tier. `total` counts inbound EDGES (a caller invoking the target twice counts twice) — the outbound mirror what_this_calls counts DISTINCT targets. Pass min_confidence to keep only callers at/above a tier (e.g. exact drops provisional single-candidate calls). Pass response_format:"concise" for a ~1/3-lighter identity-only response, and offset to page past the limit on a hot symbol (the response reports {offset,limit,total,has_more}).',
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg, offset: offsetArg, min_confidence: minConfidenceArg, response_format: responseFormatArg },
    },
    async ({ project_root, element, limit, offset, min_confidence, response_format }) =>
      perRepo(project_root, h => h.what_calls({ element, limit, offset, min_confidence, response_format })),
  );

  server.registerTool(
    'what_imports',
    {
      title: 'What imports this element',
      description:
        'List the modules/elements that import the given element (inbound resolved import edges). `total` counts inbound EDGES — the outbound mirror what_this_imports counts DISTINCT targets.',
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg, offset: offsetArg, response_format: responseFormatArg },
    },
    async ({ project_root, element, limit, offset, response_format }) =>
      perRepo(project_root, h => h.what_imports({ element, limit, offset, response_format })),
  );

  server.registerTool(
    'impact_of',
    {
      title: 'Impact analysis',
      description:
        'Transitive inbound dependents of an element via reverse BFS over resolved edges — what breaks if this changes. Returns dependent counts by depth and affected files. Pass min_confidence to tighten the traversal to a tier floor (e.g. exact drops provisional single-candidate hops) — within the resolved set, so counts shrink monotonically as the floor rises.',
      inputSchema: {
        project_root: projectRootArg,
        element: elementArg,
        max_depth: z.number().optional().describe('BFS depth cap, 1-10 (default 3)'),
        limit: limitArg,
        offset: offsetArg,
        min_confidence: minConfidenceArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, element, max_depth, limit, offset, min_confidence, response_format }) =>
      perRepo(project_root, h => h.impact_of({ element, max_depth, limit, offset, min_confidence, response_format })),
  );

  server.registerTool(
    'find_element',
    {
      title: 'Find element',
      description:
        'Look up code elements in .coderef/index.json by name, codeRefId, or file substring. Returns id/type/file/line/exported/headerStatus (+layer/capability when annotated).',
      inputSchema: {
        project_root: projectRootArg,
        query: z.string().describe('Name, codeRefId, or file path substring'),
        type: z.string().optional().describe('Filter by element type (function, class, interface, ...)'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, query, type, limit, offset, response_format }) =>
      perRepo(project_root, h => h.find_element({ query, type, limit, offset, response_format })),
  );

  server.registerTool(
    'codebase_summary',
    {
      title: 'Codebase summary',
      description:
        'High-level intelligence snapshot: element totals by type, header coverage, graph node/edge counts by relationship.',
      inputSchema: { project_root: projectRootArg },
    },
    async ({ project_root }) => perRepo(project_root, h => h.codebase_summary()),
  );

  server.registerTool(
    'validation_status',
    {
      title: 'Validation status',
      description:
        'The pipeline validation report (locked 14-field schema) from .coderef/validation-report.json, plus a compact summary.',
      inputSchema: { project_root: projectRootArg },
    },
    async ({ project_root }) => perRepo(project_root, h => h.validation_status()),
  );

  server.registerTool(
    'hotspots',
    {
      title: 'Hotspots',
      description:
        'Rank elements by fan-in + fan-out over resolved call/import edges. src_only (default true) excludes test-origin edges and test-file elements so architectural load-bearers rank first.',
      inputSchema: {
        project_root: projectRootArg,
        limit: limitArg,
        offset: offsetArg,
        src_only: z
          .boolean()
          .optional()
          .describe('Exclude test-origin edges + test-file elements (default true)'),
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, limit, offset, src_only, response_format }) =>
      perRepo(project_root, h => h.hotspots({ limit, offset, src_only, response_format })),
  );

  server.registerTool(
    'cycles',
    {
      title: 'Dependency cycles',
      description:
        'Strongly-connected components over resolved call/import edges (Tarjan). Returns cycle membership and a sample in-cycle edge per cycle, largest first.',
      inputSchema: {
        project_root: projectRootArg,
        limit: limitArg,
        offset: offsetArg,
        relationship: z
          .enum(['call', 'import'])
          .optional()
          .describe('Restrict to one edge kind (default: both)'),
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, limit, offset, relationship, response_format }) =>
      perRepo(project_root, h => h.cycles({ limit, offset, relationship, response_format })),
  );

  server.registerTool(
    'map',
    {
      title: 'Repository map (file-level)',
      description:
        '[.coderef-WRITE, confined to .coderef/map/] Generate or refresh the file-level repository map: .coderef/map/data.json (nodes=files with embedded element detail, edges=aggregated resolved deps with per-edge evidence blocks: provenance classes, line samples, ambiguous-candidate counts; hotspot/cycle overlays, analytics block: communities/centrality/bridges/coupling/dead-code candidates; drift block: declared @layer coverage, layer->layer matrix, per-community layer composition + purity, layer-outlier files; metrics block: test linkage, per-file header-status tallies, unresolved-reference counts, largest modules, most dependencies — surfaces, not verdicts) plus the bundled interactive graph.html viewer. Same data the coderef-map CLI emits — agents query data.json; humans open graph.html. Auto-refreshes when older than graph.json. format:"skeleton" additionally returns a token-budgeted plaintext repo map inline (centrality-ranked files + exported symbol signatures) — the fastest first call for repo orientation. git:true additionally attaches a git-behavioral block (opt-in): churn×module-size hotspots and change-coupling drift (file pairs that co-change in git history but have NO static import/call edge — candidate hidden dependencies invisible to impact_of). Requires a git work tree; on a non-git repo the block is absent and git_block_reason explains why. Surfaces, not verdicts.',
      inputSchema: {
        project_root: projectRootArg,
        refresh: z.boolean().optional().describe('Force regeneration even if the map is fresh (default: regenerate only when absent or older than graph.json)'),
        format: z
          .enum(['skeleton'])
          .optional()
          .describe('skeleton = additionally return a token-budgeted plaintext repo map inline (skeleton_text): files ranked by dependency centrality with exported symbol signatures, every truncation declared. Prompt-injectable agent orientation; also written to .coderef/map/skeleton.md.'),
        token_budget: z
          .number()
          .optional()
          .describe('Token budget the skeleton text is fitted to (default 1600; only with format:"skeleton")'),
        git: z
          .boolean()
          .optional()
          .describe('Attach the git-behavioral block (opt-in): churn×size hotspots + change-coupling drift (co-change pairs with no static edge). ALSO attaches the ownership/knowledge block: per-file author concentration (dominant-author share = bus-factor proxy), distinct authors, last-touched age — "one author, long-untouched" fragility signal for refactor calibration. Forces a git-enabled regeneration. Returns git_commits_scanned, churn_hotspot_count, coupling_drift_count, ownership_file_count, single_author_file_count (all null + git_block_reason on a non-git repo or an author-less window). Surfaces, not verdicts.'),
      },
    },
    async ({ project_root, refresh, format, token_budget, git }) =>
      perRepo(project_root, h => h.map({ refresh, format, token_budget, git })),
  );

  server.registerTool(
    'map_metrics_delta',
    {
      title: 'Verified-refactor metrics delta',
      description:
        '[.coderef-WRITE (snapshot mode only), confined to .coderef/map/] The CodeScene verified-refactor loop: snapshot the five map metric families (test linkage, documentation/header coverage, unresolved references, largest modules, most dependencies), refactor, then diff to PROVE the target family improved WITHOUT regressing others. snapshot:true copies the current data.metrics to a named sidecar (default label "baseline"). With no snapshot flag it DIFFS: before (a snapshot label or an explicit data.json path; default the "baseline" snapshot) vs after (the current map, or an explicit path). Returns a DECOMPOSED per-family factor vector — one delta record per family (summary-scalar deltas + per-status Record deltas + ranked-list membership entered/left/rankChanged) plus a per-family direction label. There is deliberately NO composite score: a regression in one family is never hidden by a gain in another. The direction label is PROVENANCE (which way the surface moved), not a quality verdict — surfaces, not verdicts. A schemaVersion mismatch or a family absent on one side is surfaced as a warning + no-data, never a fabricated diff.',
      inputSchema: {
        project_root: projectRootArg,
        before: z
          .string()
          .optional()
          .describe('BEFORE snapshot: a snapshot label (e.g. "baseline") OR a data.json/snapshot path. Default: the "baseline" snapshot sidecar.'),
        after: z
          .string()
          .optional()
          .describe('AFTER snapshot: a data.json/snapshot path. Default: the current .coderef/map/data.json metrics.'),
        snapshot: z
          .boolean()
          .optional()
          .describe('Snapshot mode: copy the current data.metrics to a named sidecar (a pure read/copy, no diff). Snapshot BEFORE refactoring, then diff AFTER.'),
        snapshot_label: z
          .string()
          .optional()
          .describe('Label for the snapshot sidecar (default "baseline"); only with snapshot:true.'),
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, before, after, snapshot, snapshot_label, response_format }) =>
      perRepo(project_root, h => h.map_metrics_delta({ before, after, snapshot, snapshot_label, response_format })),
  );

  server.registerTool(
    'what_exports',
    {
      title: 'What a file exports',
      description:
        'List the exported elements of a file via resolved export edges. Accepts a project-relative path or a path fragment (ambiguity envelope when several files match).',
      inputSchema: {
        project_root: projectRootArg,
        file: z.string().describe('Project-relative file path (or fragment), e.g. "src/pipeline/call-resolver.ts"'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, file, limit, offset, response_format }) =>
      perRepo(project_root, h => h.what_exports({ file, limit, offset, response_format })),
  );

  server.registerTool(
    'diff_impact',
    {
      title: 'Diff impact',
      description:
        'PR blast-radius in one call: map a git diff (default: working tree vs HEAD) to changed elements via index.json line ranges, then union transitive inbound dependents over resolved call/import edges.',
      inputSchema: {
        project_root: projectRootArg,
        ref: z.string().optional().describe('Git ref to diff against (default HEAD; e.g. "main", "HEAD~3")'),
        max_depth: z.number().optional().describe('BFS depth cap, 1-10 (default 3)'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, ref, max_depth, limit, offset, response_format }) =>
      perRepo(project_root, h => h.diff_impact({ ref, max_depth, limit, offset, response_format })),
  );

  server.registerTool(
    'tests_for_change',
    {
      title: 'Tests for change',
      description:
        'Diff-to-test-selection in one call: map a git diff (default: working tree vs HEAD) to changed elements, then return the TEST-FILE elements that reach them through resolved call/import edges — ranked by directness (depth 1 = a test directly references changed code). Closes the agent verify-loop: run the handful of tests that actually exercise your edit instead of the whole suite. Absence is NO-DATA — an empty result means "no test-file element with a recorded edge-path to the change", NOT "untested" and NOT "safe to skip verification".',
      inputSchema: {
        project_root: projectRootArg,
        ref: z.string().optional().describe('Git ref to diff against (default HEAD; e.g. "main", "HEAD~3")'),
        max_depth: z.number().optional().describe('Reverse-BFS depth cap, 1-10 (default 3)'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, ref, max_depth, limit, offset, response_format }) =>
      perRepo(project_root, h => h.tests_for_change({ ref, max_depth, limit, offset, response_format })),
  );

  server.registerTool(
    'ast_search',
    {
      title: 'Structural AST pattern search',
      description:
        'Syntax-aware structural search that ripgrep CANNOT express. You supply a tree-sitter S-EXPRESSION query (the query IS tree-sitter\'s own pattern grammar — no new pattern language) and a language, and each match returns file + line range + the matched source, ATTRIBUTED to the enclosing element\'s codeRefId so a hit pipes straight into what_calls / impact_of / symbol_context. Examples: `(for_statement body: (_ (await_expression)))` (an await inside a loop), `(catch_clause body: (statement_block) @b)` then inspect for emptiness. Surfaces, NOT verdicts: a match is a syntactic fact ("this shape occurs here"), never a defect. Absence is NO-DATA: an empty result — or reason:"invalid_query" / "unsupported_language" — means the shape was not found or the query was unusable, NOT that the code is correct.',
      inputSchema: {
        project_root: projectRootArg,
        query: z.string().describe('A tree-sitter S-expression query, e.g. `(for_statement body: (_ (await_expression)))`. Malformed queries degrade to reason:"invalid_query" (never an error).'),
        // REC-001: the accepted set is DERIVED from EXTENSION_TO_LANGUAGE (via
        // AST_SEARCH_LANG_EXTENSIONS) so this enum can never drift narrower than
        // the grammar loader again — previously a hand-maintained literal that
        // omitted cc/cxx/c++/h and rejected those files before searchAst ran.
        lang: z.enum([...AST_SEARCH_LANG_EXTENSIONS] as [string, ...string[]]).describe('Source language extension to search (derived from the supported grammar set: ts, tsx, js, jsx, py, go, rs, java, cpp, cc, cxx, c++, c, h). The query is compiled against this grammar; files of other extensions are skipped.'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, query, lang, limit, offset, response_format }) =>
      perRepo(project_root, h => h.ast_search({ query, lang, limit, offset, response_format })),
  );

  server.registerTool(
    'type_hierarchy',
    {
      title: 'Class/interface type hierarchy',
      description:
        'Supertypes and subtypes of a class or interface, over the extends/implements heritage edges the pipeline extracts. direction:"up" returns what the element EXTENDS/IMPLEMENTS (its ancestors); "down" returns what extends/implements the element (its descendants); "both" (default) returns each. Every related type carries its depth (1 = direct) and the heritage kind (extends|implements), attributed to a codeRefId so it pipes into what_calls / impact_of / symbol_context. Surfaces, NOT verdicts. Absence is NO-DATA: empty supertypes/subtypes means the graph has no recorded heritage edge for this element (e.g. it is not a class/interface, or its base is an external/unresolved type), NEVER "this type is flat". A supertype that did not resolve to a project element is returned with resolved:false rather than dropped.',
      inputSchema: {
        project_root: projectRootArg,
        element: z.string().describe('The class/interface to walk — a codeRefId or a bare type name resolved against the graph.'),
        direction: z.enum(['up', 'down', 'both']).optional().describe('up = supertypes (ancestors), down = subtypes (descendants), both = each. Default both.'),
        max_depth: z.number().int().positive().optional().describe('Max heritage-walk depth (default 10, clamped 1..25).'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, element, direction, max_depth, limit, offset, response_format }) =>
      perRepo(project_root, h => h.type_hierarchy({ element, direction, max_depth, limit, offset, response_format })),
  );

  server.registerTool(
    'api_diff',
    {
      title: 'Exported API surface diff (breaking-changes)',
      description:
        '[.coderef-WRITE (snapshot mode only, confined to .coderef/)] Diff the project\'s EXPORTED API surface against a snapshot baseline, mirroring map_metrics_delta\'s verified-change loop: snapshot:true copies the current exports manifest (every exported element\'s name + kind + parameter arity, keyed by codeRefId) to a named sidecar (default "baseline"); a bare call DIFFS the baseline snapshot vs the current index into a decomposed change vector — added exports, removed exports, and signature-changed exports (parameter-arity change). SURFACES, NOT VERDICTS: a removed or changed export is a CHANGE fact, NOT automatically a "breaking change" — there is deliberately NO composite breaking-count score, and the per-change direction (added/removed/changed) is PROVENANCE, not a quality verdict. ABSENCE = NO-DATA: with no baseline snapshot, the result is no_data:true with a warning (run api_diff({ snapshot: true }) first), NEVER a false "0 breaking changes". This replaces the old NOT-IMPLEMENTED breaking-changes gate; the git-ref call-site path is intentionally not used.',
      inputSchema: {
        project_root: projectRootArg,
        before: z
          .string()
          .optional()
          .describe('BEFORE manifest: a snapshot label (e.g. "baseline") OR a manifest .json path. Default: the "baseline" snapshot sidecar.'),
        after: z
          .string()
          .optional()
          .describe('AFTER manifest: a manifest .json path. Default: the current exports (from index.json).'),
        snapshot: z
          .boolean()
          .optional()
          .describe('Snapshot mode: copy the current exports manifest to a named sidecar (a pure read/copy, no diff). Snapshot BEFORE the API change, then diff AFTER.'),
        snapshot_label: z
          .string()
          .optional()
          .describe('Label for the snapshot sidecar (default "baseline"); only with snapshot:true.'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, before, after, snapshot, snapshot_label, limit, offset, response_format }) =>
      perRepo(project_root, h => h.api_diff({ before, after, snapshot, snapshot_label, limit, offset, response_format })),
  );

  server.registerTool(
    'dependency_rules',
    {
      title: 'Dependency-rules gate (declared architecture constraints)',
      description:
        'Check DECLARED architecture constraints against the OBSERVED declared-layer dependency edges. An optional .coderef/rules.json declares forbid layer-pairs (a dependency that MUST NOT exist, {from,to}) and/or allow-lists (a source layer may only depend on the listed targets); this checks them against the layer->layer edges projected from graph.json (each node\'s @layer header). Per rule: status satisfied | violated | not_applicable, with the offending edges named. SURFACES, NOT VERDICTS: a violation is a declared-constraint MISMATCH fact — there is deliberately NO composite architecture-health score. ABSENCE = NO-DATA: with no .coderef/rules.json the result is no_data:true (declare constraints to enable the gate), NEVER a false "all rules pass". Read-only report; the CI exit-code gate lives on the coderef-analyze --type=dependency-rules --gate CLI (MCP only reports).',
      inputSchema: {
        project_root: projectRootArg,
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, limit, offset, response_format }) =>
      perRepo(project_root, h => h.dependency_rules({ limit, offset, response_format })),
  );

  server.registerTool(
    'rag_search',
    {
      title: 'Code search (lexical-first router)',
      description:
        'Code search with a LEXICAL-FIRST router (Phase 9). A symbol-shaped query — a bare identifier (authenticateUser), a dotted member (LRUCache.get), a --flag, or a "quoted exact" phrase — is answered from the SYMBOL TABLE (index.json) via in-process BM25 with ZERO Ollama and ZERO rag-index dependency: it works on a populate-only repo and when the embedding daemon is down. A multi-word conceptual query routes to the embedding lane (hybrid dense+BM25 fusion) when a rag-index + provider are available; if they are not, it DEGRADES to the lexical lane and still answers (lane:"lexical", degraded:true) instead of erroring. Every response reports lane ("lexical" | "semantic" | "hybrid") + routing_reason — provenance of HOW you were answered, not a quality verdict. Force a lane with lane:"lexical"|"semantic" (default "auto"). Pass expand=true to attach each hit\'s 1-hop graph neighborhood (callers/callees/imports/importedBy, as signatures) inline. Neighbors carry a confidence tier; a hit not in the graph reports neighbors.resolved=false (absence = no-data).',
      inputSchema: {
        project_root: projectRootArg,
        query: z.string().describe('A symbol-shaped query (identifier / Receiver.method / --flag / "quoted exact") answers from the symbol table with no embeddings; a multi-word phrase routes to the embedding lane.'),
        limit: limitArg,
        offset: offsetArg,
        hybrid: z.boolean().optional().describe('Hybrid dense+BM25 fusion on the embedding lane (default true). Set false for embedding-only. Ignored on the lexical lane.'),
        lane: z.enum(['auto', 'lexical', 'semantic']).optional().describe('Force the routing lane. auto (default) = lexical-first for symbol-shaped queries, embedding for conceptual. lexical = always the symbol-table lane (no embeddings). semantic = force the embedding lane (degrades to lexical if unavailable).'),
        expand: z.boolean().optional().describe('Attach each hit\'s 1-hop graph neighborhood (callers/callees/imports/importedBy) as signatures. Default false (bare hits, byte-unchanged).'),
        neighbor_limit: z.number().optional().describe('Max neighbors per direction when expand=true (default 10). Excess is truncated with a per-direction total + flag.'),
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, query, limit, offset, hybrid, lane, expand, neighbor_limit, response_format }) =>
      perRepo(project_root, h => h.rag_search({ query, limit, offset, hybrid, expand, neighbor_limit, lane, response_format })),
  );

  // ---- agent-native outbound + path tools (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P1) ----
  // Forward direction ("what does X call/import/depend-on") + path queries,
  // wiring the already-built canonical-graph.ts traversal into MCP. Additive:
  // the inbound tools (what_calls/what_imports/impact_of) are unchanged.

  server.registerTool(
    'what_this_calls',
    {
      title: 'What this element calls',
      description:
        'Outbound (forward) direction: list the resolved elements that the given element CALLS. The mirror of what_calls (which is inbound). Compact callee id/name/file/line. `total` counts DISTINCT callees (deduped); the inbound what_calls counts edges. On a whole-file query, calls between two elements of the same file are omitted (intra-file self-references are not "what this file calls").',
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg, offset: offsetArg, response_format: responseFormatArg },
    },
    async ({ project_root, element, limit, offset, response_format }) =>
      perRepo(project_root, h => h.what_this_calls({ element, limit, offset, response_format })),
  );

  server.registerTool(
    'what_this_imports',
    {
      title: 'What this element imports',
      description:
        'Outbound (forward) direction: list the resolved elements/modules that the given element (or its file) IMPORTS. The mirror of what_imports (which is inbound). `total` counts DISTINCT imported targets (deduped); the inbound what_imports counts edges.',
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg, offset: offsetArg, response_format: responseFormatArg },
    },
    async ({ project_root, element, limit, offset, response_format }) =>
      perRepo(project_root, h => h.what_this_imports({ element, limit, offset, response_format })),
  );

  server.registerTool(
    'what_this_depends_on',
    {
      title: 'What this element depends on',
      description:
        'Transitive outbound dependencies of an element via forward BFS over resolved call+import edges — what this element relies on, directly and indirectly. The mirror of impact_of (which is inbound dependents). Returns dependency counts and affected files.',
      inputSchema: {
        project_root: projectRootArg,
        element: elementArg,
        max_depth: z.number().optional().describe('BFS depth cap, 1-10 (default 5)'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, element, max_depth, limit, offset, response_format }) =>
      perRepo(project_root, h => h.what_this_depends_on({ element, max_depth, limit, offset, response_format })),
  );

  server.registerTool(
    'path_between',
    {
      title: 'Path between two elements',
      description:
        'Trace a directed dependency path from source to target over resolved call+import edges. mode=shortest (default) returns the single shortest ordered chain; mode=all returns all simple paths (bounded — max 50 paths, depth default 5). In mode=all, internal_cap_hit=true signals the 50-path enumeration ceiling was reached (more paths may exist).',
      inputSchema: {
        project_root: projectRootArg,
        source: z.string().describe('Path start element: codeRefId, element name, or file path'),
        target: z.string().describe('Path end element: codeRefId, element name, or file path'),
        mode: z.enum(['shortest', 'all']).optional().describe('shortest (default) or all simple paths'),
        max_depth: z.number().optional().describe('Depth cap (shortest: default 10, max 20; all: default 5, max 10)'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, source, target, mode, max_depth, limit, offset, response_format }) =>
      perRepo(project_root, h => h.path_between({ source, target, mode, max_depth, limit, offset, response_format })),
  );

  // ---- non-resolved-edge exposure (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P2) ----
  // Enumerate the call/import edges the resolver could NOT resolve, with their
  // persisted evidence + (for ambiguous) the competing candidates. Aggregate
  // counts alone lived in validation_status; this makes each one inspectable.

  server.registerTool(
    'unresolved_edges',
    {
      title: 'List non-resolved edges',
      description:
        'Enumerate call/import edges that did NOT resolve, with their persisted evidence — the detail behind validation_status\'s aggregate counts. Default lists unresolved + ambiguous edges (the honesty dispositions); status=external|builtin surface expected npm/stdlib noise. For ambiguous edges, candidates[] shows the competing symbols the resolver could not choose between. Facets: relationship, status, file, reason (substring). Always paginated — total + status_breakdown reflect the full set; edges[] is one offset/limit page (default 25, cap 100).',
      inputSchema: {
        project_root: projectRootArg,
        relationship: z
          .enum(['call', 'import'])
          .optional()
          .describe('Restrict to one edge kind (default: both)'),
        status: z
          .enum(['unresolved', 'ambiguous', 'external', 'builtin'])
          .optional()
          .describe('Disposition filter (default: unresolved + ambiguous)'),
        file: z.string().optional().describe('Restrict to edges whose call/import site is in this file (path or fragment)'),
        reason: z.string().optional().describe('Substring match on the edge reason (e.g. "receiver_not_in_symbol_table")'),
        offset: offsetArg,
        limit: limitArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, relationship, status, file, reason, offset, limit, response_format }) =>
      perRepo(project_root, h =>
        h.unresolved_edges({ relationship, status, file, reason, offset, limit, response_format }),
      ),
  );

  // ---- source body + find-all-references (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P3) ----
  // Give agents an element's source WITHOUT RAG, and all references (call +
  // import + type-only) in one call. Additive: the existing tools are unchanged.

  server.registerTool(
    'source_of',
    {
      title: 'Source of an element',
      description:
        'Return an element\'s source directly from disk (no RAG/embedder), resolved by codeRefId or name via .coderef/index.json. A bounded line-window from the element\'s start line (index carries a start line only). Controls: context (lines, default 40, cap 200), max_chars (default 4000, cap 20000). Flags line_truncated / char_truncated when clipped.',
      inputSchema: {
        project_root: projectRootArg,
        element: elementArg,
        context: z.number().optional().describe('Lines to include from the start line (default 40, cap 200)'),
        max_chars: z.number().optional().describe('Byte cap on the returned slice (default 4000, cap 20000)'),
      },
    },
    async ({ project_root, element, context, max_chars }) =>
      perRepo(project_root, h => h.source_of({ element, context, max_chars })),
  );

  server.registerTool(
    'find_all_references',
    {
      title: 'Find all references',
      description:
        'Union the inbound references to an element in ONE call: resolved call-sites + resolved import-sites (traversable), PLUS type-only import references (resolutionStatus=typeOnly, additive + non-traversable, matched heuristically by module basename). Does NOT reclassify type-only edges or shift validation counts. Returns per-category counts + sites.',
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg, offset: offsetArg, response_format: responseFormatArg },
    },
    async ({ project_root, element, limit, offset, response_format }) =>
      perRepo(project_root, h => h.find_all_references({ element, limit, offset, response_format })),
  );

  server.registerTool(
    'symbol_context',
    {
      title: 'Symbol context card',
      description:
        'READ. One consolidated CARD for a symbol in a SINGLE call — the understand-before-edit view that today costs ~5 round-trips (find_element + source_of + what_calls + what_this_calls + what_imports). Joins: identity (id/name/type/file/line) + header presence (headerStatus/layer/capability/exported from the index) + neighborhood (callers/callees/imports/importedBy as signatures with confidence tiers, the 1-hop ego-graph) + references (call/import site counts + sample) + test_linkage (inbound refs from test files) + staleness (mtime heuristic: element file vs graph.json). A JOIN over existing data, not new analysis. Flags: include_source (attach a bounded signature/body slice), cap (per-facet max, default 25 cap 100), response_format (concise|detailed — concise drops the source slice + signals verbosity, counts preserved). Absence is no-data: header \'missing\', neighborhood resolved:false, 0 test refs each mean "nothing recorded", never a verdict. staleness is a cheap mtime hint, NOT the authoritative hash-manifest freshness contract.',
      inputSchema: {
        project_root: projectRootArg,
        element: elementArg,
        include_source: z.boolean().optional().describe('Attach a bounded signature/body slice of the element (like source_of). Default false.'),
        cap: z.number().optional().describe(`Per-facet max (neighborhood directions, ref/test samples). Default ${DEFAULT_LIMIT}, cap ${MAX_LIMIT}.`),
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, element, include_source, cap, response_format }) =>
      perRepo(project_root, h => h.symbol_context({ element, include_source, cap, response_format })),
  );

  // ---- CLI/MCP parity (WO-...-CLI-MCP-PARITY-001 P6) --------------------------
  // Three READ tools + two .coderef-WRITE tools. SAFETY CONTRACT:
  //  - rename_preview is DRY-RUN ONLY (no apply arg, writes nothing). Source
  //    mutation (coderef-rename --apply) stays CLI-only.
  //  - reindex + rag_index WRITE, but every byte is confined to
  //    <projectDir>/.coderef/ because they delegate to the populate / rag-index
  //    pipelines (which only write .coderef/) — never a new write path.

  server.registerTool(
    'pack_context',
    {
      title: 'Pack context bundle',
      description:
        'READ. Build a single context bundle for a focus element: the focus source (uncompressed, first) + its transitive dependency closure, admitted closest-first while a running token total stays under budget. Dependencies are signature-compressed by default; pass full_deps=true for full dependency windows. Pass include_callers=true to also pack the focus\'s 1-hop inbound callers (who calls it) signature-compressed — the understand-before-edit view. Returns { bundle, manifest }; manifest.dropped records anything trimmed. Reads .coderef/graph.json + source; writes nothing.',
      inputSchema: {
        project_root: projectRootArg,
        element: z.string().describe('Focus element: codeRefId or element name to pack context around'),
        token_budget: z.number().optional().describe('Max bundle tokens (default 8000). Deps are admitted closest-first until this fills.'),
        full_deps: z.boolean().optional().describe('Include FULL dependency source windows instead of the default signature-compressed skeletons.'),
        include_callers: z.boolean().optional().describe('Also pack the focus\'s 1-hop inbound callers (who calls it), signature-compressed, ahead of the outbound deps. Default false (bundle byte-unchanged).'),
      },
    },
    async ({ project_root, element, token_budget, full_deps, include_callers }) =>
      perRepo(project_root, h => h.pack_context({ element, token_budget, full_deps, include_callers })),
  );

  server.registerTool(
    'rename_preview',
    {
      title: 'Rename preview (dry-run)',
      description:
        'READ / PREVIEW-ONLY. Plan a project-wide symbol rename over .coderef/graph.json: returns declaration + reference SITES (call/import) each tagged with a confidence tier, a sites_by_confidence tally, type-only refs, and any ambiguities the applier would guard. Writes NOTHING and has NO apply path — source mutation stays exclusively on the coderef-rename CLI (--apply). Pass min_confidence=exact to keep only auto-apply-safe sites (drops provisional single-candidate references, which a human should review). Use this to inspect blast radius before running the CLI.',
      inputSchema: {
        project_root: projectRootArg,
        old_name: z.string().describe('Existing symbol name (or codeRefId) to rename'),
        new_name: z.string().describe('Proposed new name (used only to shape the plan; nothing is written)'),
        min_confidence: minConfidenceArg,
      },
    },
    async ({ project_root, old_name, new_name, min_confidence }) =>
      perRepo(project_root, h => h.rename_preview({ old_name, new_name, min_confidence })),
  );

  server.registerTool(
    'rag_status',
    {
      title: 'RAG index status',
      description:
        'READ. Report the RAG index + vector-store metadata and health from .coderef/rag-index.json + coderef-vectors.json: provider/store/model, chunk counts, index/vectors existence, and a healthy|partial|missing verdict. Reports cleanly (health="missing") when the project has not been indexed. Reads only; writes nothing.',
      inputSchema: { project_root: projectRootArg },
    },
    async ({ project_root }) => perRepo(project_root, h => h.rag_status()),
  );

  server.registerTool(
    'reindex',
    {
      title: 'Regenerate .coderef substrate (WRITE)',
      // WRITE tool: writes are CONFINED to <projectDir>/.coderef/ — it delegates
      // to the populate pipeline, which only writes there (no source mutation,
      // no output-dir arg).
      description:
        'WRITE (.coderef/ only). Regenerate the .coderef/ intelligence substrate (index/graph/validation-report/etc.) by running the populate pipeline for this project. All writes are confined to <projectDir>/.coderef/. Returns a compact summary (elements, files, edges, duration, outputPath). `incremental` is accepted for parity but a full rebuild is always run over MCP (no changed-file list is carried). Does NOT mutate source files.',
      inputSchema: {
        project_root: projectRootArg,
        incremental: z.boolean().optional().describe('Request an incremental rebuild (accepted for CLI parity; MCP runs a full rebuild since no changed-file list is supplied).'),
      },
    },
    async ({ project_root, incremental }) =>
      perRepo(project_root, h => h.reindex({ incremental })),
  );

  server.registerTool(
    'rag_index',
    {
      title: 'Build RAG index (WRITE, local Ollama)',
      // WRITE tool: writes are CONFINED to <projectDir>/.coderef/ — it delegates
      // to the rag-index pipeline (writes rag-index.json + the vector store
      // there). Local Ollama ONLY — no cloud LLM fallback.
      description:
        'WRITE (.coderef/ only). Build the semantic RAG index for this project using LOCAL Ollama embeddings (no cloud LLM). Writes .coderef/rag-index.json + the vector store; nothing outside .coderef/. Requires populate-coderef to have run first (reads validation-report.json). Errors cleanly (embedding_unavailable) when Ollama is unreachable — the server keeps running. Pass concurrency to size the Ollama embed worker pool (speeds up indexing; output unchanged). embed_cache (default true) serves byte-identical chunks from .coderef-embed-cache.json without re-embedding — additive over the file-grain incremental layer. Returns { status, chunksIndexed, provider, store, durationMs, indexPath, embedCacheHits, embedCacheMisses }.',
      inputSchema: {
        project_root: projectRootArg,
        concurrency: z
          .number()
          .optional()
          .describe('Max concurrent Ollama embedding requests (worker-pool size, clamped to [1,16]). Default: provider default (4) or CODEREF_EMBED_CONCURRENCY. Changes wall-clock only — the output vectors and their order are unchanged.'),
        embed_cache: z
          .boolean()
          .optional()
          .describe('Chunk-grain embedding cache (default true). When true, chunks whose exact embedding text was already embedded under the same model are served from the cache sidecar instead of being re-embedded (a cache hit is still INDEXED). Set false to force a full re-embed.'),
      },
    },
    async ({ project_root, concurrency, embed_cache }) =>
      perRepo(project_root, h => h.rag_index({ concurrency, embed_cache })),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[coderef-mcp] v${SERVER_VERSION} on stdio — 23 tools, per-repo; project_root required per call; anchor: ${anchor}`,
  );
}

// Only start the server when run as a bin — never on import (tests import
// buildToolHandlers without touching stdio).
if (require.main === module) {
  main().catch(e => {
    console.error('[coderef-mcp] Fatal:', e);
    process.exit(1);
  });
}
