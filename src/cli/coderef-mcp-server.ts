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

// Decomposed per WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1: the artifact
// cache/loaders + shared helpers live in ./mcp/shared.ts and the 36 tool
// handlers in six per-family modules under ./mcp/ (graph, lookup, verify, rag,
// context, map). This file keeps the public surface (buildToolHandlers,
// handlersFor, errorPayload, ToolHandlers, attachStaleness, SERVER_*), the
// per-repo registry, and ALL 36 server.registerTool blocks — tool names, input
// schemas, and response envelopes are byte-identical to the pre-split server.
import * as fs from 'fs';
import * as path from 'path';
// Standard subpath specifiers: TS (node10 resolution) finds types via the
// SDK's typesVersions map (dist/esm/*.d.ts); Node's CJS require resolves the
// same specifier via the exports map to dist/cjs/*. Do NOT import dist paths
// directly — typesVersions double-maps them and type resolution breaks.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { AST_SEARCH_LANG_EXTENSIONS } from '../search/ast-search.js';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  type HandlerContext,
  type ToolHandlers,
  BuildHintError,
  attachStaleness,
  emptyCache,
} from './mcp/shared.js';
import { buildContextTools } from './mcp/context-tools.js';
import { buildGraphTools } from './mcp/graph-tools.js';
import { buildLookupTools } from './mcp/lookup-tools.js';
import { buildMapTools } from './mcp/map-tools.js';
import { buildRagTools } from './mcp/rag-tools.js';
import { buildVerifyTools } from './mcp/verify-tools.js';

// Re-exported for the behavioral tests + external consumers — the public
// surface is unchanged by the decomposition (definitions now in mcp/shared.ts).
export { attachStaleness };
export type { ToolHandlers };

const SERVER_NAME = 'coderef-core';
const SERVER_VERSION = '1.0.0';
// Registered-tool count surfaced in the instructions string + startup log.
// Bump when adding/removing a tool registration below — the mcp-server test
// counts registrations in this file and fails on drift.
export const SERVER_TOOL_COUNT = 36;
// Agent-facing usage contract delivered through the MCP initialize handshake
// (ServerOptions.instructions). This is the ONE surface every connected agent
// receives automatically, so it carries the load-bearing rules that were
// previously learned only by failing (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 P1).
export const SERVER_INSTRUCTIONS = `CodeRef code-intelligence server — ${SERVER_TOOL_COUNT} tools over a repo's .coderef/ artifacts (index, call/import graph, semantic map, RAG vectors).

USAGE CONTRACT:
1. Every tool REQUIRES project_root (absolute path to the target repo). There is no default repo — the server serves whichever indexed repo you name.
2. If .coderef/ is missing or stale, run the reindex tool first (or the populate-coderef CLI). Every read response carries a staleness block — reindex when it warns.
3. Orient before you grep: call orient first — ONE token-budgeted envelope composing the skeleton map, codebase_summary, validation numbers, both staleness axes, and top hotspots. (The granular map format:"skeleton" / codebase_summary / validation_status calls remain for piecemeal reads.) That replaces 10-15 blind file reads.
4. Prefer graph tools over grep for structure questions: what_calls / impact_of (who breaks if I change X), cycles / hotspots (risk), find_element + symbol_context (definitions and neighbors), rag_search (concept search — check rag_status freshness first).
4b. Verify before you commit: tests_for_change returns the ranked tests reaching your diff PLUS a ready-to-run command — run those first, not the whole suite. change_dossier composes the full pre-flight (blast radius + selected tests + exported-API delta + rule mismatches) in one call.
5. Surfaces, not verdicts: results show WHERE to look, never WHAT is wrong — read the files before concluding. An empty result means NO RESOLVED DATA, not "none exist"; check unresolved_edges and validation_status before trusting a negative.
6. Write scope: no tool here writes source files. rename --apply is CLI-only by design; MCP exposes rename_preview only. Index writes (reindex, rag_index, map) are confined to .coderef/.`;

// ---- tool handlers (composed from the mcp/ per-family modules) ------------------

/**
 * Per-repo handler factory: ONE mtime-invalidated ArtifactCache per canonical
 * root, shared by every family via HandlerContext. Handler bodies moved
 * verbatim to ./mcp/*-tools.ts; this spread composition is completeness-
 * checked against ToolHandlers at compile time (a missing handler is a type
 * error — same drift class the SERVER_TOOL_COUNT registration guard catches).
 */
export function buildToolHandlers(projectDir: string): ToolHandlers {
  const ctx: HandlerContext = { projectDir, cache: emptyCache() };
  const graph = buildGraphTools(ctx);
  const lookup = buildLookupTools(ctx);
  return {
    ...graph,
    ...lookup,
    ...buildVerifyTools(ctx),
    ...buildRagTools(ctx),
    ...buildContextTools(ctx),
    // orient composes across families (map + codebase_summary + hotspots) —
    // siblings are injected explicitly, replacing the monolith's this.* binding.
    ...buildMapTools(ctx, { codebase_summary: lookup.codebase_summary, hotspots: graph.hotspots }),
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

  // instructions ride the initialize handshake (ServerOptions, not Implementation) —
  // the SDK exposes them to every client as InitializeResult.instructions.
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

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
    'orient',
    {
      title: 'One-call repo orientation',
      description:
        '[.coderef-WRITE (skeleton ride-along), confined to .coderef/map/] The FIRST call on any repo: ONE token-budgeted envelope composing the skeleton map (centrality-ranked files + exported symbol signatures), codebase_summary toplines, validation trust numbers, BOTH staleness axes (source-vs-graph and vectors-vs-index), and the top-10 hotspots. Replaces the map format:"skeleton" -> codebase_summary -> validation_status -> hotspots opening sequence. Absent artifacts are named in no_data (never guessed); over-budget assemblies trim hotspots with declared warnings. Surfaces, not verdicts — read the cited files before concluding.',
      inputSchema: {
        project_root: projectRootArg,
        token_budget: z
          .number()
          .optional()
          .describe('Overall token budget for the envelope (default 2400). The skeleton text is fitted to budget minus a fixed structured-blocks reserve.'),
      },
    },
    async ({ project_root, token_budget }) => perRepo(project_root, h => h.orient({ token_budget })),
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
    'change_dossier',
    {
      title: 'Change dossier (pre-flight surfaces for a proposed change)',
      description:
        'The pre-commit pre-flight in ONE call: for a git diff (default: working tree vs HEAD), compose the four verify surfaces — diff_impact (blast radius: changed elements + transitive dependents + top affected files), tests_for_change (ranked test selection + a ready-to-run command when a runner is detectable), api_diff in delta mode (exported-API change vector vs the snapshot baseline), and dependency_rules (declared-constraint mismatches) — into one condensed envelope. Run it BEFORE writing a commit; run the dossier\'s run_command to execute the graph-selected tests first. SURFACES, NOT VERDICTS: the dossier names WHERE to look, never a merge decision — there is deliberately no composite risk score. ABSENCE = NO-DATA: a leg that could not run is named in no_data (with a warning naming why); a leg reporting its own no_data:true ran but had nothing to compare (e.g. no api_diff baseline snapshot, no rules.json) — neither is ever guessed around. Read-only: api_diff is composed in delta mode only (no snapshot write).',
      inputSchema: {
        project_root: projectRootArg,
        ref: z.string().optional().describe('Git ref to diff against (default HEAD; e.g. "main", "HEAD~3")'),
        max_depth: z.number().optional().describe('BFS depth cap for the impact/tests legs, 1-10 (default 3)'),
      },
    },
    async ({ project_root, ref, max_depth }) =>
      perRepo(project_root, h => h.change_dossier({ ref, max_depth })),
  );

  server.registerTool(
    'docstrings',
    {
      title: 'Docstring surface (per-element JSDoc / docstring capture)',
      description:
        'Surface the docstring for each code element — the leading /** */ JSDoc block for JS/TS/JSX, or the first string-literal statement for Python — attributed to its codeRefId so a hit pipes into the graph tools. Returns per-element {hasDocstring, docstring?} plus a coverage roll-up {total, documented, undocumented, coverageRatio}. SURFACES, NOT VERDICTS: coverageRatio is a PROVENANCE ratio (documented/total), NOT a quality score or grade. ABSENCE = NO-DATA: an element with no docstring reports hasDocstring:false with the text omitted (undocumented is a fact, never a guess); an empty element set returns no_data:true. Filter by name substring (element) and/or documented=true|false. Complements — does not replace — the file-grain regex JSDoc coverage in the docs analysis.',
      inputSchema: {
        project_root: projectRootArg,
        element: z.string().optional().describe('Case-insensitive substring filter over element name'),
        documented: z.boolean().optional().describe('true -> documented only; false -> undocumented only; omit -> all'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, element, documented, limit, offset, response_format }) =>
      perRepo(project_root, h => h.docstrings({ element, documented, limit, offset, response_format })),
  );

  server.registerTool(
    'clones',
    {
      title: 'Clone surface (structural-signature duplication groups)',
      description:
        'Surface elements that share the same STRUCTURAL SHAPE — a group is elements with an identical signature (kind, name, arity, sorted param-name shingle, sorted import-source set), computed from the index with no source re-read. Catches renamed copies, boilerplate handlers, and parallel test helpers. Returns clone groups [{signature, members:[{codeRefId,name,kind,file,line}], size}] plus a roll-up. SURFACES, NOT VERDICTS: a clone group is CO-LOCATION-of-shape, NOT a defect — there is deliberately no duplication score/grade/verdict. ABSENCE = NO-DATA: an empty element set returns no_data:true, never a false "0 clones". DISCLOSURE: signature_basis names the composing fields; elements_without_signature counts thin-signature (kind+name only) elements so a thin candidate is distinguishable from a richly-signatured singleton. Does NOT detect byte-level or AST-subtree near-misses (a tracked follow-up needs endLine + a body hash).',
      inputSchema: {
        project_root: projectRootArg,
        filter: z.string().optional().describe('Case-insensitive substring filter over element name'),
        min_group_size: z.number().optional().describe('Minimum members for a clone group (default 2, floor 2)'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, filter, min_group_size, limit, offset, response_format }) =>
      perRepo(project_root, h => h.clones({ filter, min_group_size, limit, offset, response_format })),
  );

  server.registerTool(
    'scip_resolution_delta',
    {
      title: 'SCIP resolution delta (what SCIP resolves that CodeRef did not)',
      description:
        "Quantify the precise-resolution LIFT a user-provided SCIP index (from an external scip-* indexer) gives over CodeRef's own tree-sitter heuristic. CodeRef's own resolution rate is only ~21.58% (most cross-file/cross-lib references are unresolved); SCIP is compiler-grade. For each SCIP-resolved reference whose co-located CodeRef edge is unresolved/ambiguous/absent, returns a delta row {codeRefId, scipSymbol, file, line, coderefStatus, scipStatus, provenance:'scip'} plus a roll-up. OPT-IN via scip_path; ABSENCE = NO-DATA (no .scip -> no_data:true, never a false '0 delta' that would falsely imply CodeRef's resolution is complete). SURFACES, NOT VERDICTS: a delta is a resolution-provenance GAIN, not a defect or grade (no score). READ-ONLY: does NOT feed the resolver or mutate edges — the live SCIP-into-resolver wiring is a deferred deep integration needing a real scip-typescript index.",
      inputSchema: {
        project_root: projectRootArg,
        scip_path: z.string().optional().describe('Absolute path to a .scip index file (opt-in; absent -> no_data)'),
        limit: limitArg,
        offset: offsetArg,
        response_format: responseFormatArg,
      },
    },
    async ({ project_root, scip_path, limit, offset, response_format }) =>
      perRepo(project_root, h => h.scip_resolution_delta({ scip_path, limit, offset, response_format })),
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
    `[coderef-mcp] v${SERVER_VERSION} on stdio — ${SERVER_TOOL_COUNT} tools, per-repo; project_root required per call; anchor: ${anchor}`,
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
