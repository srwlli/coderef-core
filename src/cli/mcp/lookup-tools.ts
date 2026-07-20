/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability mcp-lookup-tools
 * @exports buildLookupTools
 */

/**
 * Lookup/summary tool family: find_element, codebase_summary,
 * validation_status, source_of, symbol_context, type_hierarchy.
 * Extracted VERBATIM from the coderef-mcp-server monolith
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1) — handler bodies, response
 * envelopes, and pagination semantics unchanged; tool registration stays in
 * coderef-mcp-server.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ValidationReport } from '../../pipeline/output-validator.js';
import { type SymbolContext, assembleSymbolContext } from '../../query/symbol-context.js';
import { computeTypeHierarchy, type TypeHierarchyDirection } from '../../query/type-hierarchy.js';
import { normalizeSlashes } from '../../utils/path-normalize.js';
import { isConcise, paginate, shapeResponse } from '../mcp-response-format.js';
import {
  type ExportedEdge,
  type HandlerContext,
  type ToolHandlers,
  ambiguous,
  clampLimit,
  isTestFile,
  loadCanonical,
  loadGraph,
  loadIndex,
  loadValidationReport,
  notFound,
  resolveNodes,
} from './shared.js';

export type LookupTools = Pick<
  ToolHandlers,
  'find_element' | 'codebase_summary' | 'validation_status' | 'source_of' | 'symbol_context' | 'type_hierarchy'
>;

export function buildLookupTools(ctx: HandlerContext): LookupTools {
  const { projectDir, cache } = ctx;

  return {

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
  };
}
