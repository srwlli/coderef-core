/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability mcp-graph-tools
 * @exports buildGraphTools
 */

/**
 * Graph-walk tool family: the inbound/outbound/path traversal surface over
 * resolved call/import edges — what_calls, what_imports, impact_of,
 * what_this_calls, what_this_imports, what_this_depends_on, path_between,
 * cycles, hotspots, what_exports, unresolved_edges, find_all_references.
 * Extracted VERBATIM from the coderef-mcp-server monolith
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1) — handler bodies, response
 * envelopes, and pagination semantics unchanged; tool registration stays in
 * coderef-mcp-server.ts.
 */

import { ALL_PATHS_MAX } from '../../query/canonical-graph.js';
import { type EdgeConfidenceTier, meetsMinConfidence } from '../../pipeline/edge-confidence.js';
import { normalizeSlashes } from '../../utils/path-normalize.js';
import {
  type ResponseFormat,
  isConcise,
  paginate,
  shapeResponse,
} from '../mcp-response-format.js';
import {
  type ExportedEdge,
  type ExportedNode,
  type HandlerContext,
  type ToolHandlers,
  ambiguous,
  clampLimit,
  edgeConfidenceOf,
  isDemoFile,
  isTestFile,
  loadCanonical,
  loadGraph,
  nodeSummary,
  notFound,
  resolveNodes,
} from './shared.js';

export type GraphTools = Pick<
  ToolHandlers,
  | 'what_calls' | 'what_imports' | 'impact_of'
  | 'what_this_calls' | 'what_this_imports' | 'what_this_depends_on'
  | 'path_between' | 'cycles' | 'hotspots' | 'what_exports'
  | 'unresolved_edges' | 'find_all_references'
>;

export function buildGraphTools(ctx: HandlerContext): GraphTools {
  const { projectDir, cache } = ctx;

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
  };
}
