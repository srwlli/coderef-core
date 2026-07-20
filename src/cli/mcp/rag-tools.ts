/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability mcp-rag-tools
 * @exports buildRagTools
 */

/**
 * RAG/search + substrate-write tool family: rag_search (lexical-first
 * router), rag_status, reindex, rag_index. The two .coderef-WRITE tools
 * delegate to the extracted populate / rag-index pipelines — never a new
 * write path; local Ollama only.
 * Extracted VERBATIM from the coderef-mcp-server monolith
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P1) — handler bodies, response
 * envelopes, and pagination semantics unchanged; tool registration stays in
 * coderef-mcp-server.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CanonicalGraphQuery } from '../../query/canonical-graph.js';
import { type EgoGraph, egoGraphOf } from '../../query/ego-graph.js';
import { readVectorStaleness } from '../../query/staleness-check.js';
import { type SearchLane, classifyQuery, lexicalSearch } from '../../integration/rag/search-router.js';
import { paginate, shapeResponse } from '../mcp-response-format.js';
import { defaultPopulateArgs, runPopulate } from '../populate.js';
import { defaultRagIndexArgs, runRagIndex } from '../rag-index.js';
import { readRagStatus } from '../rag-status.js';
import {
  MAX_LIMIT,
  type HandlerContext,
  type IndexData,
  type ToolHandlers,
  clampLimit,
  loadCanonical,
  loadIndex,
} from './shared.js';

export type RagTools = Pick<ToolHandlers, 'rag_search' | 'rag_status' | 'reindex' | 'rag_index'>;

export function buildRagTools(ctx: HandlerContext): RagTools {
  const { projectDir, cache } = ctx;

  return {

    async rag_search({ query, limit, offset, hybrid, expand, neighbor_limit, lane, response_format }) {
      // P4 vector-staleness WARN (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001,
      // REC-006): computed once per call, attached to every successful envelope
      // (both lanes — a lexical answer to a semantic-intent query still benefits
      // from knowing the vectors are stale). null (absent stamps) attaches nothing.
      const vecStale = readVectorStaleness(projectDir);
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
          ...(vecStale ? { vector_staleness: vecStale } : {}),
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
        const { createLLMProvider, createVectorStore } = await import('../../integration/llm/provider-factory.js');
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
        const { SemanticSearchService } = await import('../../integration/rag/semantic-search.js');
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
          ...(vecStale ? { vector_staleness: vecStale } : {}),
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

    async rag_status() {
      // Read-only: delegates to the extracted readRagStatus (reads only
      // .coderef/rag-index.json + coderef-vectors.json). Reports cleanly when no
      // index exists (health='missing', metadata=null) — never throws for that.
      try {
        const status = await readRagStatus(projectDir);
        // P4 vector-staleness WARN (REC-006): the freshness axis rag_status
        // exists to answer — attached whenever both stamps are readable.
        const vecStale = readVectorStaleness(projectDir);
        return { ...status, ...(vecStale ? { vector_staleness: vecStale } : {}) };
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
