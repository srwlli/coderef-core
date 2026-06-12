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

      // Reverse BFS over resolved edges: who (transitively) depends on this?
      const visited = new Set<string>(matches.map(m => m.id));
      const byDepth: number[] = [];
      let frontier = matches.map(m => m.id);
      const dependents: ExportedNode[] = [];
      for (let depth = 1; depth <= depthCap && frontier.length > 0; depth++) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const edge of cache.inbound.get(id) ?? []) {
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

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[coderef-mcp] v${SERVER_VERSION} on stdio — project: ${projectDir} (6 read-only tools)`,
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
