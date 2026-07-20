/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability mcp-map-tools
 * @exports buildMapTools
 */

/**
 * Map/orientation tool family: map (file-level MapData + viewer emission),
 * orient (one-call first-turn orientation), map_metrics_delta (verified-
 * refactor family deltas). orient composes across families — its
 * codebase_summary/hotspots legs are INJECTED as siblings by the composer in
 * coderef-mcp-server.ts (was this.* in the monolith).
 * Extracted VERBATIM from the coderef-mcp-server monolith
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1) — handler bodies, response
 * envelopes, and pagination semantics unchanged; tool registration stays in
 * coderef-mcp-server.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateMap } from '../../map/emit-map.js';
import { emitSkeleton } from '../../map/skeleton-map.js';
import type { MapMetrics } from '../../map/engineering-metrics.js';
import { type MapMetricsDelta, type MetricsFamilyDelta, diffMapMetrics } from '../../map/metrics-delta.js';
import {
  type OrientHotspot,
  type OrientSkeletonBlock,
  ORIENT_DEFAULT_TOKEN_BUDGET,
  composeOrient,
  condenseValidation,
  skeletonBudgetFor,
} from '../../query/orient.js';
import { checkStaleness, readVectorStaleness } from '../../query/staleness-check.js';
import { normalizeSlashes } from '../../utils/path-normalize.js';
import { isConcise } from '../mcp-response-format.js';
import {
  type HandlerContext,
  type ToolHandlers,
  loadGraph,
  loadValidationReport,
} from './shared.js';

export type MapTools = Pick<ToolHandlers, 'map' | 'orient' | 'map_metrics_delta'>;

/** Sibling handlers orient composes across families (injected by the composer). */
export interface MapToolSiblings {
  codebase_summary: ToolHandlers['codebase_summary'];
  hotspots: ToolHandlers['hotspots'];
}

export function buildMapTools(ctx: HandlerContext, siblings: MapToolSiblings): MapTools {
  const { projectDir, cache } = ctx;

  const tools: MapTools = {

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

    orient({ token_budget } = {}) {
      // One-call first-turn orientation (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001
      // P4, REC-003): a pure JOIN over the existing blocks — skeleton map,
      // codebase_summary, validation report, BOTH staleness axes, top-10
      // hotspots — composed and token-fitted by src/query/orient.ts. No new
      // substrate, no new write path (the skeleton ride-along write is the map
      // tool's own, confined to .coderef/map/). Absent blocks land in no_data.
      const budget =
        typeof token_budget === 'number' && Number.isFinite(token_budget) && token_budget > 0
          ? Math.floor(token_budget)
          : ORIENT_DEFAULT_TOKEN_BUDGET;
      let skeleton: OrientSkeletonBlock | null = null;
      try {
        const m = tools.map({ format: 'skeleton', token_budget: skeletonBudgetFor(budget) }) as Record<string, any>;
        if (typeof m.skeleton_text === 'string') {
          skeleton = {
            text: m.skeleton_text,
            estimated_tokens: m.skeleton_estimated_tokens ?? 0,
            token_budget: m.skeleton_token_budget ?? skeletonBudgetFor(budget),
            included_files: m.skeleton_included_files ?? 0,
            omitted_files: m.skeleton_omitted_files ?? 0,
            warnings: m.skeleton_warnings ?? [],
          };
        }
      } catch {
        // skeleton unavailable — composeOrient names it in no_data
      }
      let summary: Record<string, unknown> | null = null;
      try {
        summary = siblings.codebase_summary();
      } catch {
        // index/graph unavailable — no_data
      }
      let validation: Record<string, unknown> | null = null;
      try {
        validation = condenseValidation(loadValidationReport(projectDir) as unknown as Record<string, unknown>);
      } catch {
        // validation-report.json absent — no_data
      }
      let staleness: Record<string, unknown> | null = null;
      try {
        staleness = checkStaleness(projectDir) as unknown as Record<string, unknown>;
      } catch {
        // checkStaleness never throws by contract; belt-and-suspenders
      }
      const vector_staleness = readVectorStaleness(projectDir) as unknown as Record<string, unknown> | null;
      let hotspots: OrientHotspot[] | null = null;
      try {
        const h = siblings.hotspots({ limit: 10 }) as Record<string, any>;
        if (Array.isArray(h.hotspots)) {
          hotspots = h.hotspots.map((x: any) => ({
            id: String(x.id ?? ''),
            name: x.name ?? null,
            file: x.file ?? null,
            line: x.line ?? null,
            fan_in: x.fan_in ?? 0,
            fan_out: x.fan_out ?? 0,
            score: x.score ?? 0,
          }));
        }
      } catch {
        // graph unavailable — no_data
      }
      return composeOrient({
        skeleton,
        summary,
        validation,
        staleness,
        vector_staleness,
        hotspots,
        token_budget: budget,
      }) as unknown as Record<string, unknown>;
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
  };
  return tools;
}
