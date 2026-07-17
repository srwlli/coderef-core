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
  what_calls(args: { element: string; limit?: number; min_confidence?: EdgeConfidenceTier }): Record<string, unknown>;
  what_imports(args: { element: string; limit?: number }): Record<string, unknown>;
  impact_of(args: { element: string; max_depth?: number; limit?: number; min_confidence?: EdgeConfidenceTier }): Record<string, unknown>;
  find_element(args: { query: string; type?: string; limit?: number }): Record<string, unknown>;
  codebase_summary(): Record<string, unknown>;
  validation_status(): Record<string, unknown>;
  // v2 tools (WO-MCP-V2-TOOLS-AND-PS-VALIDATION-001 P1)
  hotspots(args: { limit?: number; src_only?: boolean }): Record<string, unknown>;
  cycles(args: { limit?: number; relationship?: 'call' | 'import' }): Record<string, unknown>;
  what_exports(args: { file: string; limit?: number }): Record<string, unknown>;
  // v2 flow tools (P2)
  diff_impact(args: { ref?: string; max_depth?: number; limit?: number }): Record<string, unknown>;
  rag_search(args: { query: string; limit?: number; hybrid?: boolean }): Promise<Record<string, unknown>>;
  // agent-native outbound + path tools (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P1)
  what_this_calls(args: { element: string; limit?: number }): Record<string, unknown>;
  what_this_imports(args: { element: string; limit?: number }): Record<string, unknown>;
  what_this_depends_on(args: { element: string; max_depth?: number; limit?: number }): Record<string, unknown>;
  path_between(args: { source: string; target: string; mode?: 'shortest' | 'all'; max_depth?: number; limit?: number }): Record<string, unknown>;
  // agent-native non-resolved-edge exposure (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P2)
  unresolved_edges(args: {
    relationship?: 'call' | 'import';
    status?: 'unresolved' | 'ambiguous' | 'external' | 'builtin';
    file?: string;
    reason?: string;
    offset?: number;
    limit?: number;
  }): Record<string, unknown>;
  // agent-native source-body + find-all-references (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P3)
  source_of(args: { element: string; context?: number; max_chars?: number }): Record<string, unknown>;
  find_all_references(args: { element: string; limit?: number }): Record<string, unknown>;
  // CLI/MCP parity (WO-...-CLI-MCP-PARITY-001 P6).
  // READ tools — wrap a clean substrate export, return synchronously.
  pack_context(args: { element: string; token_budget?: number; full_deps?: boolean }): Record<string, unknown>;
  rename_preview(args: { old_name: string; new_name: string; min_confidence?: EdgeConfidenceTier }): Record<string, unknown>;
  // .coderef-WRITE / status tools — async (delegate to the extracted pipelines /
  // async status readout). Writes are confined to <projectDir>/.coderef/.
  rag_status(): Promise<Record<string, unknown>>;
  reindex(args: { incremental?: boolean }): Promise<Record<string, unknown>>;
  rag_index(): Promise<Record<string, unknown>>;
  // Agent parity for coderef-map (WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 P5;
  // git-behavioral opt-in WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 P2).
  map(args: { refresh?: boolean; format?: string; token_budget?: number; git?: boolean }): Record<string, unknown>;
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

export function buildToolHandlers(projectDir: string): ToolHandlers {
  const cache = emptyCache();

  /** Inbound resolved edges of one relationship kind, across all of an element's nodes. */
  function inboundByKind(
    query: string,
    kind: 'call' | 'import',
    limit: number,
    minConfidence?: EdgeConfidenceTier,
  ): Record<string, unknown> {
    const graph = loadGraph(projectDir, cache);
    const { nodes: matches, byFile } = resolveNodes(query, graph);
    if (matches.length === 0) return notFound(query);
    if (!byFile && matches.length > 5) return ambiguous(query, matches);

    const hits: Array<Record<string, unknown>> = [];
    let total = 0;
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
        total++;
        if (hits.length >= limit) continue;
        const source = edge.sourceId ? cache.nodeById.get(edge.sourceId) : undefined;
        // P3-T4: pass through the rich per-edge evidence the resolver already
        // computed and graph.json already persists (previously dropped). For a
        // call edge that is receiverText.calleeName() at scopePath — this lets
        // an agent see HOW the call is written without re-reading the source.
        const ev = edge.evidence as
          | { calleeName?: string; receiverText?: string; scopePath?: string; originSpecifier?: string }
          | undefined;
        hits.push({
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
    return {
      element: byFile ? [`(all ${matches.length} elements of) ${query}`] : matches.map(m => m.id),
      relationship: kind,
      ...(minConfidence ? { min_confidence: minConfidence } : {}),
      total,
      returned: hits.length,
      truncated: total > hits.length,
      [kind === 'call' ? 'callers' : 'importers']: hits,
    };
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
    limit: number,
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
    const total = neighbors.length;
    const hits = neighbors.slice(0, limit).map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      file: n.file,
      line: n.line,
    }));
    return {
      element: resolution.byFile
        ? [`(all ${resolution.nodes.length} elements of) ${query}`]
        : resolution.nodes.map(n => n.id),
      relationship: kind,
      direction: 'outbound',
      total,
      returned: hits.length,
      truncated: total > hits.length,
      [kind === 'call' ? 'callees' : 'imports']: hits,
    };
  }

  return {
    what_calls({ element, limit, min_confidence }) {
      return inboundByKind(element, 'call', clampLimit(limit), min_confidence);
    },

    what_this_calls({ element, limit }) {
      return outboundByKind(element, 'call', clampLimit(limit));
    },

    what_this_imports({ element, limit }) {
      return outboundByKind(element, 'import', clampLimit(limit));
    },

    what_this_depends_on({ element, max_depth, limit }) {
      const engine = loadCanonical(projectDir, cache);
      const cap = clampLimit(limit);
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
      return {
        element: resolution.byFile
          ? [`(all ${resolution.nodes.length} elements of) ${element}`]
          : resolution.nodes.map(n => n.id),
        direction: 'outbound',
        max_depth: depthCap,
        transitive_dependencies: deps.length,
        affected_files: files.length,
        files: files.slice(0, cap),
        files_truncated: files.length > cap,
        sample_dependencies: deps.slice(0, Math.min(10, cap)).map(d => ({
          id: d.id, name: d.name, type: d.type, file: d.file, line: d.line,
        })),
      };
    },

    path_between({ source, target, mode, max_depth, limit }) {
      const engine = loadCanonical(projectDir, cache);
      const cap = clampLimit(limit);
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
        return {
          source,
          target,
          mode: 'all',
          max_depth: depthCap,
          total: results.length,
          returned: Math.min(cap, results.length),
          truncated: results.length > cap,
          internal_cap_hit: results.length >= ALL_PATHS_MAX,
          paths: results.slice(0, cap).map(r => ({
            length: r.length,
            nodes: r.path.map(n => ({ id: n.id, name: n.name, type: n.type, file: n.file, line: n.line })),
          })),
        };
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

    what_imports({ element, limit }) {
      return inboundByKind(element, 'import', clampLimit(limit));
    },

    impact_of({ element, max_depth, limit, min_confidence }) {
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

      return {
        element: byFile
          ? [`(all ${matches.length} elements of) ${element}`]
          : matches.map(m => m.id),
        max_depth: depthCap,
        ...(min_confidence ? { min_confidence } : {}),
        transitive_dependents: dependents.length,
        dependents_by_depth: byDepth,
        affected_files: files.length,
        files: files.slice(0, cap),
        files_truncated: files.length > cap,
        sample_dependents: dependents.slice(0, Math.min(10, cap)).map(nodeSummary),
      };
    },

    find_element({ query, type, limit }) {
      const index = loadIndex(projectDir, cache);
      const cap = clampLimit(limit);
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
      return {
        query,
        type_filter: type ?? null,
        total: elements.length,
        returned: Math.min(cap, elements.length),
        truncated: elements.length > cap,
        elements: elements.slice(0, cap).map(e => ({
          id: e.codeRefId,
          name: e.name,
          type: e.type,
          file: e.file,
          line: e.line,
          exported: e.exported ?? false,
          headerStatus: e.headerStatus ?? 'missing',
          ...(e.layer !== undefined && { layer: e.layer }),
          ...(e.capability !== undefined && { capability: e.capability }),
        })),
      };
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

    hotspots({ limit, src_only }) {
      const graph = loadGraph(projectDir, cache);
      const cap = clampLimit(limit);
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

      return {
        src_only: srcOnly,
        total_ranked: ranked.length,
        returned: Math.min(cap, ranked.length),
        truncated: ranked.length > cap,
        hotspots: ranked.slice(0, cap),
      };
    },

    cycles({ limit, relationship }) {
      const graph = loadGraph(projectDir, cache);
      const cap = clampLimit(limit);

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
      const cycles = sccs.slice(0, cap).map(scc => {
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

      return {
        relationship: relationship ?? 'call+import',
        total_cycles: sccs.length,
        returned: cycles.length,
        truncated: sccs.length > cycles.length,
        cycles,
      };
    },

    what_exports({ file, limit }) {
      const graph = loadGraph(projectDir, cache);
      const cap = clampLimit(limit);
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
      return {
        file: matchedFiles.length === 1 ? matchedFiles[0] : matchedFiles,
        total: exports.length,
        returned: Math.min(cap, exports.length),
        truncated: exports.length > cap,
        exports: exports.slice(0, cap),
      };
    },

    diff_impact({ ref, max_depth, limit }) {
      const graph = loadGraph(projectDir, cache);
      const index = loadIndex(projectDir, cache);
      const cap = clampLimit(limit);
      const depthCap = Math.max(1, Math.min(10, max_depth ?? 3));
      const gitRef = ref ?? 'HEAD';

      // Read-only git: diff the working tree (or a ref range) with zero
      // context so hunk headers map cleanly onto line ranges.
      const gitArgs = ['diff', '-U0', '--no-color'];
      if (gitRef !== 'WORKTREE') gitArgs.push(gitRef);
      const res = spawnSync('git', [...gitArgs, '--'], {
        cwd: projectDir,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      if (res.error || res.status !== 0) {
        return {
          error: 'git_diff_failed',
          ref: gitRef,
          detail: String(res.error?.message ?? res.stderr ?? `exit ${res.status}`).slice(0, 300),
          hint: 'Pass a valid git ref (default HEAD = working tree vs last commit).',
        };
      }

      // Parse +++ b/<file> and @@ -a,b +c,d @@ new-side ranges.
      const changedRanges = new Map<string, Array<[number, number]>>();
      let currentFile: string | null = null;
      for (const line of res.stdout.split('\n')) {
        if (line.startsWith('+++ ')) {
          const f = line.slice(4).trim();
          currentFile = f === '/dev/null' ? null : normalizeSlashes(f.replace(/^b\//, ''));
          continue;
        }
        const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
        if (m && currentFile) {
          const start = parseInt(m[1], 10);
          const count = m[2] !== undefined ? parseInt(m[2], 10) : 1;
          const list = changedRanges.get(currentFile) ?? [];
          list.push([start, start + Math.max(count, 1) - 1]);
          changedRanges.set(currentFile, list);
        }
      }

      // Map changed ranges to enclosing elements: per file, an element owns
      // [its line, next element's line) — the closest preceding element.
      const byFile = new Map<string, IndexElement[]>();
      for (const e of index.elements) {
        const f = normalizeSlashes((e.file ?? ''));
        const list = byFile.get(f);
        if (list) list.push(e);
        else byFile.set(f, [e]);
      }
      for (const list of byFile.values()) list.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

      const changedElements = new Map<string, IndexElement>();
      for (const [file, ranges] of changedRanges) {
        const elements = byFile.get(file);
        if (!elements) continue;
        for (const [lo, hi] of ranges) {
          for (let i = 0; i < elements.length; i++) {
            const start = elements[i].line ?? 0;
            const end = i + 1 < elements.length ? (elements[i + 1].line ?? Infinity) - 1 : Infinity;
            if (start <= hi && end >= lo && elements[i].codeRefId) {
              changedElements.set(elements[i].codeRefId!, elements[i]);
            }
          }
        }
      }

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

      return {
        ref: gitRef,
        changed_files: changedRanges.size,
        changed_elements: changedElements.size,
        changed_element_sample: [...changedElements.values()].slice(0, Math.min(20, cap)).map(e => ({
          id: e.codeRefId, name: e.name, type: e.type, file: e.file, line: e.line,
        })),
        max_depth: depthCap,
        transitive_dependents: dependents.length,
        affected_files: files.length,
        files: files.slice(0, cap),
        files_truncated: files.length > cap,
      };
    },

    async rag_search({ query, limit, hybrid }) {
      const cap = clampLimit(limit);
      const indexMetaPath = path.join(projectDir, '.coderef', 'rag-index.json');
      let meta: { provider?: string; store?: string };
      try {
        meta = JSON.parse(fs.readFileSync(indexMetaPath, 'utf8'));
      } catch {
        return {
          error: 'rag_index_missing',
          hint: `No RAG index at ${indexMetaPath}. Run rag-index first; the tool reads provider/store from its metadata so query embeddings always match the index.`,
        };
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
          return {
            error: 'embedding_unavailable',
            detail: `index was built with ${provider} but its provider could not start: ${keyErr instanceof Error ? keyErr.message : String(keyErr)}`,
          };
        }
        const vectorStore = await createVectorStore(store, projectDir, llmProvider, { warnTag: 'coderef-mcp' });
        await vectorStore.initialize();
        const { SemanticSearchService } = await import('../integration/rag/semantic-search.js');
        const searchService = new SemanticSearchService(llmProvider, vectorStore);
        // STUB-Q7MRD6: hybrid dense+BM25 RRF fusion, on by default; callers can
        // pass hybrid=false to force embedding-only (A/B).
        const response = await searchService.search(query, { topK: cap, hybrid: hybrid ?? true });
        const results = (response?.results ?? response ?? []) as any[];
        return {
          query,
          provider,
          store,
          hybrid: hybrid ?? true,
          total: results.length,
          results: results.slice(0, cap).map((r: any) => ({
            id: r.metadata?.coderefId ?? r.id,
            name: r.metadata?.name,
            file: r.metadata?.file,
            line: r.metadata?.line,
            score: typeof r.score === 'number' ? Math.round(r.score * 1000) / 1000 : r.score,
            snippet: typeof r.metadata?.sourceCode === 'string'
              ? r.metadata.sourceCode.slice(0, 200)
              : (typeof r.content === 'string' ? r.content.slice(0, 200) : undefined),
          })),
        };
      } catch (e: any) {
        return {
          error: 'embedding_unavailable',
          provider,
          detail: String(e?.message ?? e).slice(0, 300),
          hint: provider === 'ollama'
            ? 'Is Ollama running with the embedding model pulled? (ollama serve; ollama pull nomic-embed-text)'
            : 'Check provider credentials and network.',
        };
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

    unresolved_edges({ relationship, status, file, reason, offset, limit }) {
      const graph = loadGraph(projectDir, cache);
      const cap = clampLimit(limit);
      const start = offset !== undefined && Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;

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

      const total = matched.length;
      const page = matched.slice(start, start + cap);
      const edges = page.map(edge => {
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

      return {
        total,
        offset: start,
        returned: edges.length,
        truncated: start + edges.length < total,
        filters: {
          relationship: relationship ?? null,
          status: wantStatus ?? '(unresolved+ambiguous)',
          file: file ?? null,
          reason: reason ?? null,
        },
        status_breakdown,
        edges,
      };
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

    find_all_references({ element, limit }) {
      const graph = loadGraph(projectDir, cache);
      const cap = clampLimit(limit);
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
      return {
        element: byFile
          ? [`(all ${matches.length} elements of) ${element}`]
          : matches.map(m => m.id),
        total_references: total,
        call_site_count: callRefs.length,
        import_site_count: importRefs.length,
        type_reference_count: typeRefs.length,
        note: typeRefs.length > 0
          ? 'type_references are import-type-only edges (resolutionStatus=typeOnly): additive + non-traversable; matched heuristically by module basename. Validation counts unchanged.'
          : undefined,
        call_sites: callRefs.slice(0, cap),
        import_sites: importRefs.slice(0, cap),
        type_references: typeRefs.slice(0, cap),
        truncated:
          callRefs.length > cap || importRefs.length > cap || typeRefs.length > cap,
      };
    },

    // ---- CLI/MCP parity (WO-...-CLI-MCP-PARITY-001 P6) ----------------------
    // pack_context + rename_preview are READ tools (they only load
    // .coderef/graph.json + read source). rename_preview is PREVIEW-ONLY: no
    // apply arg, no write — source mutation lives exclusively on the
    // coderef-rename CLI. See buildToolHandlers header + the registerTool blocks.

    pack_context({ element, token_budget, full_deps }) {
      // Wrap the clean substrate export. full_deps=true opts back into full
      // dependency windows (compressDeps=false); default compresses deps.
      try {
        const result = packContext(projectDir, element, {
          tokenBudget: token_budget,
          compressDeps: full_deps ? false : undefined,
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

    async rag_index() {
      // .coderef-WRITE: DELEGATES to the extracted runRagIndex over LOCAL Ollama
      // (defaultRagIndexArgs pins provider='ollama' — NO cloud fallback). Writes
      // only .coderef/rag-index.json + the vector store. Errors CLEANLY when the
      // embedder/Ollama is unreachable (mirrors rag_search's embedding_unavailable
      // envelope) instead of crashing the server.
      try {
        const summary = await runRagIndex(defaultRagIndexArgs(projectDir), {
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
   * resolution/handler error into the structured envelope (P2-T4). */
  const perRepo = async (
    project_root: string,
    fn: (h: ToolHandlers) => Record<string, unknown> | Promise<Record<string, unknown>>,
  ) => {
    try {
      return toContent(await fn(handlersFor(project_root, anchor)));
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
        'List the resolved call sites that invoke the given element (inbound call edges from .coderef/graph.json). Compact: caller id/name/file/line plus call location and confidence tier. `total` counts inbound EDGES (a caller invoking the target twice counts twice) — the outbound mirror what_this_calls counts DISTINCT targets. Pass min_confidence to keep only callers at/above a tier (e.g. exact drops provisional single-candidate calls).',
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg, min_confidence: minConfidenceArg },
    },
    async ({ project_root, element, limit, min_confidence }) =>
      perRepo(project_root, h => h.what_calls({ element, limit, min_confidence })),
  );

  server.registerTool(
    'what_imports',
    {
      title: 'What imports this element',
      description:
        'List the modules/elements that import the given element (inbound resolved import edges). `total` counts inbound EDGES — the outbound mirror what_this_imports counts DISTINCT targets.',
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg },
    },
    async ({ project_root, element, limit }) =>
      perRepo(project_root, h => h.what_imports({ element, limit })),
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
        min_confidence: minConfidenceArg,
      },
    },
    async ({ project_root, element, max_depth, limit, min_confidence }) =>
      perRepo(project_root, h => h.impact_of({ element, max_depth, limit, min_confidence })),
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
      },
    },
    async ({ project_root, query, type, limit }) =>
      perRepo(project_root, h => h.find_element({ query, type, limit })),
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
        src_only: z
          .boolean()
          .optional()
          .describe('Exclude test-origin edges + test-file elements (default true)'),
      },
    },
    async ({ project_root, limit, src_only }) =>
      perRepo(project_root, h => h.hotspots({ limit, src_only })),
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
        relationship: z
          .enum(['call', 'import'])
          .optional()
          .describe('Restrict to one edge kind (default: both)'),
      },
    },
    async ({ project_root, limit, relationship }) =>
      perRepo(project_root, h => h.cycles({ limit, relationship })),
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
          .describe('Attach the git-behavioral block (opt-in): churn×size hotspots + change-coupling drift (co-change pairs with no static edge). Forces a git-enabled regeneration. Returns git_commits_scanned, churn_hotspot_count, coupling_drift_count (null + git_block_reason on a non-git repo). Surfaces, not verdicts.'),
      },
    },
    async ({ project_root, refresh, format, token_budget, git }) =>
      perRepo(project_root, h => h.map({ refresh, format, token_budget, git })),
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
      },
    },
    async ({ project_root, file, limit }) =>
      perRepo(project_root, h => h.what_exports({ file, limit })),
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
      },
    },
    async ({ project_root, ref, max_depth, limit }) =>
      perRepo(project_root, h => h.diff_impact({ ref, max_depth, limit })),
  );

  server.registerTool(
    'rag_search',
    {
      title: 'Semantic code search',
      description:
        'Semantic search over the RAG index. Hybrid by default: fuses a dense/embedding leg with a sparse/BM25 lexical leg via reciprocal-rank fusion (better recall on exact-identifier queries). Reads provider/store from .coderef/rag-index.json metadata so query embeddings always match the index model. Errors cleanly when no index exists or the embedder is unavailable. Pass hybrid=false to force embedding-only.',
      inputSchema: {
        project_root: projectRootArg,
        query: z.string().describe('Natural-language query, e.g. "where are import specifiers resolved"'),
        limit: limitArg,
        hybrid: z.boolean().optional().describe('Hybrid dense+BM25 fusion (default true). Set false for embedding-only retrieval.'),
      },
    },
    async ({ project_root, query, limit, hybrid }) =>
      perRepo(project_root, h => h.rag_search({ query, limit, hybrid })),
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
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg },
    },
    async ({ project_root, element, limit }) =>
      perRepo(project_root, h => h.what_this_calls({ element, limit })),
  );

  server.registerTool(
    'what_this_imports',
    {
      title: 'What this element imports',
      description:
        'Outbound (forward) direction: list the resolved elements/modules that the given element (or its file) IMPORTS. The mirror of what_imports (which is inbound). `total` counts DISTINCT imported targets (deduped); the inbound what_imports counts edges.',
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg },
    },
    async ({ project_root, element, limit }) =>
      perRepo(project_root, h => h.what_this_imports({ element, limit })),
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
      },
    },
    async ({ project_root, element, max_depth, limit }) =>
      perRepo(project_root, h => h.what_this_depends_on({ element, max_depth, limit })),
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
      },
    },
    async ({ project_root, source, target, mode, max_depth, limit }) =>
      perRepo(project_root, h => h.path_between({ source, target, mode, max_depth, limit })),
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
        offset: z.number().optional().describe('Pagination offset into the matched set (default 0)'),
        limit: limitArg,
      },
    },
    async ({ project_root, relationship, status, file, reason, offset, limit }) =>
      perRepo(project_root, h =>
        h.unresolved_edges({ relationship, status, file, reason, offset, limit }),
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
      inputSchema: { project_root: projectRootArg, element: elementArg, limit: limitArg },
    },
    async ({ project_root, element, limit }) =>
      perRepo(project_root, h => h.find_all_references({ element, limit })),
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
        'READ. Build a single context bundle for a focus element: the focus source (uncompressed, first) + its transitive dependency closure, admitted closest-first while a running token total stays under budget. Dependencies are signature-compressed by default; pass full_deps=true for full dependency windows. Returns { bundle, manifest }; manifest.dropped records anything trimmed. Reads .coderef/graph.json + source; writes nothing.',
      inputSchema: {
        project_root: projectRootArg,
        element: z.string().describe('Focus element: codeRefId or element name to pack context around'),
        token_budget: z.number().optional().describe('Max bundle tokens (default 8000). Deps are admitted closest-first until this fills.'),
        full_deps: z.boolean().optional().describe('Include FULL dependency source windows instead of the default signature-compressed skeletons.'),
      },
    },
    async ({ project_root, element, token_budget, full_deps }) =>
      perRepo(project_root, h => h.pack_context({ element, token_budget, full_deps })),
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
        'WRITE (.coderef/ only). Build the semantic RAG index for this project using LOCAL Ollama embeddings (no cloud LLM). Writes .coderef/rag-index.json + the vector store; nothing outside .coderef/. Requires populate-coderef to have run first (reads validation-report.json). Errors cleanly (embedding_unavailable) when Ollama is unreachable — the server keeps running. Returns { status, chunksIndexed, provider, store, durationMs, indexPath }.',
      inputSchema: { project_root: projectRootArg },
    },
    async ({ project_root }) => perRepo(project_root, h => h.rag_index()),
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
