#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability coderef-mcp-server
 * @exports buildToolHandlers, ToolHandlers
 */

/**
 * coderef-mcp-server — stdio MCP server exposing read-only code-intelligence
 * tools over .coderef/ artifacts.
 *
 * WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 Phase 3.
 *
 * Built INSIDE coderef-core (not as an external consumer) so the graph read
 * path is typed against ExportedGraph from src/export/graph-exporter.ts —
 * a future edge-schema change becomes a COMPILE error here instead of the
 * silent wrong-answers the external Python coderef-context server produced
 * after the sourceId/targetId/relationship migration.
 *
 * Tools (all read-only, compact pre-summarized responses — never raw graph
 * dumps; responses are consumed by LLM agents where tokens are the budget):
 *   what_calls        - inbound resolved call edges to an element
 *   what_imports      - inbound resolved import edges to an element
 *   impact_of         - transitive inbound dependents (reverse BFS)
 *   find_element      - element lookup in .coderef/index.json
 *   codebase_summary  - totals, type distribution, header coverage, edges
 *   validation_status - the locked 14-field validation report verbatim
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
import type { ExportedGraph } from '../export/graph-exporter.js';

type ExportedNode = ExportedGraph['nodes'][number];
type ExportedEdge = ExportedGraph['edges'][number];

const SERVER_NAME = 'coderef-core';
const SERVER_VERSION = '1.0.0';
const DEFAULT_LIMIT = 25;
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

/**
 * The locked 14-field validation report (output-validator.ts additive rule).
 * The two *_src_count fields (STUB-K5YBFN) are optional so the server stays
 * compatible with pre-bump 12-field artifacts on disk.
 */
interface ValidationReport {
  valid_edge_count: number;
  unresolved_count: number;
  ambiguous_count: number;
  external_count: number;
  builtin_count: number;
  unresolved_src_count?: number;
  ambiguous_src_count?: number;
  header_defined_count: number;
  header_missing_count: number;
  header_stale_count: number;
  header_partial_count: number;
  header_layer_mismatch_count: number;
  header_export_mismatch_count: number;
  header_coverage_pct: number;
}

// ---- artifact cache (mtime-invalidated) ----------------------------------------

interface ArtifactCache {
  graph: ExportedGraph | null;
  graphMtimeMs: number;
  index: IndexData | null;
  indexMtimeMs: number;
  /** Reverse adjacency over resolved edges: targetId -> source edges. */
  inbound: Map<string, ExportedEdge[]>;
  nodeById: Map<string, ExportedNode>;
}

function emptyCache(): ArtifactCache {
  return {
    graph: null,
    graphMtimeMs: 0,
    index: null,
    indexMtimeMs: 0,
    inbound: new Map(),
    nodeById: new Map(),
  };
}

function loadGraph(projectDir: string, cache: ArtifactCache): ExportedGraph {
  const graphPath = path.join(projectDir, '.coderef', 'graph.json');
  const stat = fs.statSync(graphPath); // throws if missing — surfaced as tool error
  if (cache.graph && stat.mtimeMs === cache.graphMtimeMs) {
    return cache.graph;
  }
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8')) as ExportedGraph;
  cache.graph = graph;
  cache.graphMtimeMs = stat.mtimeMs;

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

  const qPath = query.replace(/\\/g, '/').replace(/^@File\//, '');
  const byFile = graph.nodes.filter(n => (n.file ?? '').replace(/\\/g, '/') === qPath);
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
  what_calls(args: { element: string; limit?: number }): Record<string, unknown>;
  what_imports(args: { element: string; limit?: number }): Record<string, unknown>;
  impact_of(args: { element: string; max_depth?: number; limit?: number }): Record<string, unknown>;
  find_element(args: { query: string; type?: string; limit?: number }): Record<string, unknown>;
  codebase_summary(): Record<string, unknown>;
  validation_status(): Record<string, unknown>;
  // v2 tools (WO-MCP-V2-TOOLS-AND-PS-VALIDATION-001 P1)
  hotspots(args: { limit?: number; src_only?: boolean }): Record<string, unknown>;
  cycles(args: { limit?: number; relationship?: 'call' | 'import' }): Record<string, unknown>;
  what_exports(args: { file: string; limit?: number }): Record<string, unknown>;
  // v2 flow tools (P2)
  diff_impact(args: { ref?: string; max_depth?: number; limit?: number }): Record<string, unknown>;
  rag_search(args: { query: string; limit?: number }): Promise<Record<string, unknown>>;
}

/** Test-origin file detection (mirrors graph-builder's TEST_ORIGIN_RE). */
const TEST_FILE_RE = /__tests__|\.test\.|\.spec\./;

function isTestFile(file: string | undefined): boolean {
  return TEST_FILE_RE.test((file ?? '').replace(/\\/g, '/'));
}

export function buildToolHandlers(projectDir: string): ToolHandlers {
  const cache = emptyCache();

  /** Inbound resolved edges of one relationship kind, across all of an element's nodes. */
  function inboundByKind(
    query: string,
    kind: 'call' | 'import',
    limit: number,
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
        total++;
        if (hits.length >= limit) continue;
        const source = edge.sourceId ? cache.nodeById.get(edge.sourceId) : undefined;
        hits.push({
          ...(source ? nodeSummary(source) : { id: edge.sourceId }),
          at: edge.sourceLocation
            ? `${edge.sourceLocation.file}:${edge.sourceLocation.line}`
            : undefined,
        });
      }
    }
    return {
      element: byFile ? [`(all ${matches.length} elements of) ${query}`] : matches.map(m => m.id),
      relationship: kind,
      total,
      returned: hits.length,
      truncated: total > hits.length,
      [kind === 'call' ? 'callers' : 'importers']: hits,
    };
  }

  return {
    what_calls({ element, limit }) {
      return inboundByKind(element, 'call', clampLimit(limit));
    },

    what_imports({ element, limit }) {
      return inboundByKind(element, 'import', clampLimit(limit));
    },

    impact_of({ element, max_depth, limit }) {
      const graph = loadGraph(projectDir, cache);
      const cap = clampLimit(limit);
      const depthCap = Math.max(1, Math.min(10, max_depth ?? 3));
      const { nodes: matches, byFile } = resolveNodes(element, graph);
      if (matches.length === 0) return notFound(element);
      if (!byFile && matches.length > 5) return ambiguous(element, matches);

      // Reverse BFS over resolved call+import edges: who (transitively)
      // depends on this? Export edges are containment, not consumption —
      // a file exporting X is not "impacted by" X (v2 hygiene).
      const visited = new Set<string>(matches.map(m => m.id));
      const byDepth: number[] = [];
      let frontier = matches.map(m => m.id);
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
        if (srcOnly && isTestFile(node.file)) continue;
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
      const norm = (f: string | undefined) => (f ?? '').replace(/\\/g, '/');
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
          currentFile = f === '/dev/null' ? null : f.replace(/^b\//, '').replace(/\\/g, '/');
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
        const f = (e.file ?? '').replace(/\\/g, '/');
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

    async rag_search({ query, limit }) {
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
        let llmProvider: any;
        if (provider === 'openai') {
          const { OpenAIProvider } = await import('../integration/llm/openai-provider.js');
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            return { error: 'embedding_unavailable', detail: 'index was built with openai but OPENAI_API_KEY is not set' };
          }
          llmProvider = new OpenAIProvider({ apiKey, model: process.env.CODEREF_OPENAI_MODEL || 'gpt-4-turbo-preview' });
        } else {
          const { OllamaProvider } = await import('../integration/llm/ollama-provider.js');
          llmProvider = new OllamaProvider({
            apiKey: process.env.CODEREF_LLM_API_KEY || 'ollama',
            baseUrl: process.env.CODEREF_LLM_BASE_URL || 'http://localhost:11434',
            model: process.env.CODEREF_LLM_MODEL || 'qwen2.5:7b-instruct',
          });
        }
        const { SQLiteVectorStore } = await import('../integration/vector/sqlite-store.js');
        const storagePath =
          process.env.CODEREF_SQLITE_PATH || path.join(projectDir, '.coderef', 'coderef-vectors.json');
        const vectorStore = new SQLiteVectorStore({
          storagePath,
          dimension: llmProvider.getEmbeddingDimensions(),
        });
        await vectorStore.initialize();
        const { SemanticSearchService } = await import('../integration/rag/semantic-search.js');
        const searchService = new SemanticSearchService(llmProvider, vectorStore);
        const response = await searchService.search(query, { topK: cap });
        const results = (response?.results ?? response ?? []) as any[];
        return {
          query,
          provider,
          store,
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
  };
}

// ---- MCP wiring -----------------------------------------------------------------

function toContent(payload: Record<string, unknown>) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
}

async function main(): Promise<void> {
  // --project-dir/-p or positional arg; default cwd (matches sibling CLIs).
  const argv = process.argv.slice(2);
  let projectDir = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--project-dir' || arg === '-p') projectDir = argv[++i];
    else if (arg.startsWith('--project-dir=')) projectDir = arg.slice('--project-dir='.length);
    else if (!arg.startsWith('-')) projectDir = arg;
  }
  projectDir = path.resolve(projectDir);

  const handlers = buildToolHandlers(projectDir);
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  const elementArg = z
    .string()
    .describe('Element to query: codeRefId (e.g. "@Fn/src/foo.ts#bar:12"), element name, or file path fragment');
  const limitArg = z.number().optional().describe(`Max results (default ${DEFAULT_LIMIT}, cap ${MAX_LIMIT})`);

  server.registerTool(
    'what_calls',
    {
      title: 'What calls this element',
      description:
        'List the resolved call sites that invoke the given element (inbound call edges from .coderef/graph.json). Compact: caller id/name/file/line plus call location.',
      inputSchema: { element: elementArg, limit: limitArg },
    },
    async ({ element, limit }) => toContent(handlers.what_calls({ element, limit })),
  );

  server.registerTool(
    'what_imports',
    {
      title: 'What imports this element',
      description:
        'List the modules/elements that import the given element (inbound resolved import edges).',
      inputSchema: { element: elementArg, limit: limitArg },
    },
    async ({ element, limit }) => toContent(handlers.what_imports({ element, limit })),
  );

  server.registerTool(
    'impact_of',
    {
      title: 'Impact analysis',
      description:
        'Transitive inbound dependents of an element via reverse BFS over resolved edges — what breaks if this changes. Returns dependent counts by depth and affected files.',
      inputSchema: {
        element: elementArg,
        max_depth: z.number().optional().describe('BFS depth cap, 1-10 (default 3)'),
        limit: limitArg,
      },
    },
    async ({ element, max_depth, limit }) =>
      toContent(handlers.impact_of({ element, max_depth, limit })),
  );

  server.registerTool(
    'find_element',
    {
      title: 'Find element',
      description:
        'Look up code elements in .coderef/index.json by name, codeRefId, or file substring. Returns id/type/file/line/exported/headerStatus (+layer/capability when annotated).',
      inputSchema: {
        query: z.string().describe('Name, codeRefId, or file path substring'),
        type: z.string().optional().describe('Filter by element type (function, class, interface, ...)'),
        limit: limitArg,
      },
    },
    async ({ query, type, limit }) => toContent(handlers.find_element({ query, type, limit })),
  );

  server.registerTool(
    'codebase_summary',
    {
      title: 'Codebase summary',
      description:
        'High-level intelligence snapshot: element totals by type, header coverage, graph node/edge counts by relationship.',
      inputSchema: {},
    },
    async () => toContent(handlers.codebase_summary()),
  );

  server.registerTool(
    'validation_status',
    {
      title: 'Validation status',
      description:
        'The pipeline validation report (locked 14-field schema) from .coderef/validation-report.json, plus a compact summary.',
      inputSchema: {},
    },
    async () => toContent(handlers.validation_status()),
  );

  server.registerTool(
    'hotspots',
    {
      title: 'Hotspots',
      description:
        'Rank elements by fan-in + fan-out over resolved call/import edges. src_only (default true) excludes test-origin edges and test-file elements so architectural load-bearers rank first.',
      inputSchema: {
        limit: limitArg,
        src_only: z
          .boolean()
          .optional()
          .describe('Exclude test-origin edges + test-file elements (default true)'),
      },
    },
    async ({ limit, src_only }) => toContent(handlers.hotspots({ limit, src_only })),
  );

  server.registerTool(
    'cycles',
    {
      title: 'Dependency cycles',
      description:
        'Strongly-connected components over resolved call/import edges (Tarjan). Returns cycle membership and a sample in-cycle edge per cycle, largest first.',
      inputSchema: {
        limit: limitArg,
        relationship: z
          .enum(['call', 'import'])
          .optional()
          .describe('Restrict to one edge kind (default: both)'),
      },
    },
    async ({ limit, relationship }) => toContent(handlers.cycles({ limit, relationship })),
  );

  server.registerTool(
    'what_exports',
    {
      title: 'What a file exports',
      description:
        'List the exported elements of a file via resolved export edges. Accepts a project-relative path or a path fragment (ambiguity envelope when several files match).',
      inputSchema: {
        file: z.string().describe('Project-relative file path (or fragment), e.g. "src/pipeline/call-resolver.ts"'),
        limit: limitArg,
      },
    },
    async ({ file, limit }) => toContent(handlers.what_exports({ file, limit })),
  );

  server.registerTool(
    'diff_impact',
    {
      title: 'Diff impact',
      description:
        'PR blast-radius in one call: map a git diff (default: working tree vs HEAD) to changed elements via index.json line ranges, then union transitive inbound dependents over resolved call/import edges.',
      inputSchema: {
        ref: z.string().optional().describe('Git ref to diff against (default HEAD; e.g. "main", "HEAD~3")'),
        max_depth: z.number().optional().describe('BFS depth cap, 1-10 (default 3)'),
        limit: limitArg,
      },
    },
    async ({ ref, max_depth, limit }) => toContent(handlers.diff_impact({ ref, max_depth, limit })),
  );

  server.registerTool(
    'rag_search',
    {
      title: 'Semantic code search',
      description:
        'Semantic search over the RAG index. Reads provider/store from .coderef/rag-index.json metadata so query embeddings always match the index model. Errors cleanly when no index exists or the embedder is unavailable.',
      inputSchema: {
        query: z.string().describe('Natural-language query, e.g. "where are import specifiers resolved"'),
        limit: limitArg,
      },
    },
    async ({ query, limit }) => toContent(await handlers.rag_search({ query, limit })),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[coderef-mcp] v${SERVER_VERSION} on stdio — project: ${projectDir} (11 read-only tools)`,
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
