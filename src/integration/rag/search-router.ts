/**
 * @coderef-semantic: 1.0.0
 * @layer integration
 * @capability lexical-first-search-router
 * @exports SearchLane, QueryShape, QueryClassification, RouterHit, LexicalSearchResult, LexicalSearchOptions, SymbolTableElement, classifyQuery, lexicalSearch
 */

/**
 * search-router — the lexical-first query router
 * (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 9, lexical-first-search-router).
 *
 * Sourcegraph-Cody-post-embeddings / Repoformer-selective-retrieval pattern. Today
 * rag_search ALWAYS embeds the query and hard-requires .coderef/rag-index.json, so a
 * literal-identifier query (LRUCache.get, serializeFactSet, --stale-only) pays a
 * network embed round-trip and FAILS HARD when Ollama is down or the repo was only
 * populate'd, never rag-index'd. Most agent queries are symbol-shaped and should get
 * a deterministic answer from the SYMBOL TABLE with no embedding dependency.
 *
 * This module is the PURE core of the router. It does NOT retrieve embeddings, open
 * a vector store, or touch a daemon — the impure embedding-lane fallback stays in the
 * callers (the rag_search MCP handler and the rag-search CLI). Two pure pieces:
 *
 *   1. classifyQuery(query) — a deterministic heuristic: is the query SYMBOL-SHAPED
 *      (a bare identifier / a dotted Receiver.method / a --flag / a quoted-exact
 *      phrase) or CONCEPTUAL (multi-word natural language)? Symbol-shaped queries get
 *      the lexical lane; conceptual queries get the embedding lane (when available).
 *
 *   2. lexicalSearch(elements, query, opts) — build a BM25 index over the symbol
 *      table (index.json elements as an {id, metadata} corpus, via the existing
 *      corpus-agnostic SparseRetriever), boost exact-name matches, and return ranked
 *      hits with lane:'lexical'. ZERO embedding, ZERO rag-index, ZERO daemon — a pure
 *      function of the passed-in already-loaded index + query, byte-deterministic.
 *
 * It lives beside sparse-retriever.ts / semantic-search.ts (the integration/rag lane
 * it composes) rather than under src/query, because src/query is a root-tsconfig
 * scope that excludes src/integration — the pure router imports the BM25 substrate,
 * so it belongs in the same CLI-build scope as that substrate and its consumers.
 *
 * LEXICAL-FIRST CONTRACT (basis ruling): the lexical lane runs FIRST unconditionally
 * (in-process BM25 over a few-thousand-element symbol table is sub-millisecond and
 * never needs a daemon). The embedding lane is the GATED fallback — reached only for
 * conceptual queries when the rag-index + provider are available. When the embedding
 * lane is unavailable (daemon down / no rag-index), the caller DEGRADES to lexical-
 * only and STILL ANSWERS (lane:'lexical', degraded:true) instead of the old hard
 * error. A symbol query never fails because Ollama is down.
 *
 * SURFACES, NOT VERDICTS. `lane` reports HOW the answer was retrieved (provenance),
 * never a quality claim. lane:'lexical' means "answered from the symbol table without
 * embeddings", NOT "lower-quality answer". An empty lexical result is "no symbol-table
 * match", never fabricated.
 *
 * ANY-REPO. The symbol-table corpus is built from name/type/file (+ optional
 * layer/capability/documentation), NOT from semantic-header presence — so a
 * header-less repo still answers, decoupling search quality from headers existing.
 * Deterministic: no Date.now / Math.random anywhere in this module.
 */

import {
  SparseRetriever,
  type SparseHit,
} from './sparse-retriever.js';
import type { CodeChunkMetadata } from '../vector/vector-store.js';

/** Which retrieval lane produced (or should produce) the answer. */
export type SearchLane = 'lexical' | 'semantic' | 'hybrid';

/** The coarse syntactic shape a query was classified into. */
export type QueryShape =
  | 'identifier' // a bare identifier: `authenticate`, `LRUCache`
  | 'member' // a dotted member access: `LRUCache.get`, `foo.bar`
  | 'flag' // a CLI-flag-like token: `--stale-only`
  | 'quoted' // a fully-quoted exact phrase: `"exact match"`
  | 'phrase'; // multi-word natural language: `how does auth work`

/** The result of classifying a raw query string. Pure + deterministic. */
export interface QueryClassification {
  /** True when the query should be answered from the lexical (symbol-table) lane first. */
  isSymbolShaped: boolean;
  /** The coarse syntactic shape detected. */
  shape: QueryShape;
  /** One-line human-readable reason (the routing_reason surfaced to agents). */
  reason: string;
}

/**
 * A single lexical-lane hit. Identity fields mirror the rag_search hit shape
 * (id/name/file/line/score) so the handler can emit them without a second lookup.
 */
export interface RouterHit {
  id: string;
  name?: string;
  file?: string;
  line?: number;
  type?: string;
  /** BM25 (fused with exact-name boost) score, rounded for stable output. */
  score: number;
}

/** The lexical lane's ranked answer. `lane` is always 'lexical' from this pure path. */
export interface LexicalSearchResult {
  lane: 'lexical';
  results: RouterHit[];
  /** The classification's reason, threaded through as the response routing_reason. */
  routing_reason: string;
}

/** The symbol-table element the lexical corpus is built from (index.json element subset). */
export interface SymbolTableElement {
  type: string;
  name: string;
  file: string;
  line: number;
  exported?: boolean;
  codeRefId?: string;
  layer?: string;
  capability?: string;
  documentation?: string;
  [key: string]: unknown;
}

export interface LexicalSearchOptions {
  /** Max hits to return (default 10). */
  topK?: number;
  /**
   * Multiplier applied to a hit whose element name matches the query EXACTLY
   * (case-insensitive) — the "exact identifier should win" boost. Default 3.
   * Deterministic; applied after BM25 so ties still break on id.
   */
  exactNameBoost?: number;
}

const DEFAULT_TOP_K = 10;
const DEFAULT_EXACT_BOOST = 3;

/** A single-token identifier (optionally dotted member access): `foo`, `Foo`, `foo.bar`, `LRUCache.get`. */
const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
/** A CLI-flag-like token: `--stale-only`, `-k`. */
const FLAG_RE = /^-{1,2}[A-Za-z][\w-]*$/;

/**
 * Classify a raw query into a lane-routing decision. PURE + deterministic.
 *
 * Symbol-shaped (⇒ lexical lane first):
 *   - a fully double- or single-quoted phrase (an explicit exact-match request),
 *   - a single whitespace-free token that is a CLI flag (`--foo`),
 *   - a single whitespace-free token that is an identifier or dotted member
 *     access (`authenticate`, `LRUCache.get`).
 * Conceptual (⇒ embedding lane when available):
 *   - anything with internal whitespace that is not a quoted phrase — multi-word
 *     natural language.
 */
export function classifyQuery(query: string): QueryClassification {
  const raw = (query ?? '').trim();

  // Fully-quoted exact phrase — an explicit "match this literally" request.
  if (
    raw.length >= 2 &&
    ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")))
  ) {
    return {
      isSymbolShaped: true,
      shape: 'quoted',
      reason: 'quoted exact phrase — answered from the symbol table (lexical lane)',
    };
  }

  // Single token (no internal whitespace) — the symbol-shaped fast lane.
  if (raw.length > 0 && !/\s/.test(raw)) {
    if (FLAG_RE.test(raw)) {
      return {
        isSymbolShaped: true,
        shape: 'flag',
        reason: `flag-like token "${raw}" — answered from the symbol table (lexical lane)`,
      };
    }
    if (IDENTIFIER_RE.test(raw)) {
      const shape: QueryShape = raw.includes('.') ? 'member' : 'identifier';
      return {
        isSymbolShaped: true,
        shape,
        reason:
          shape === 'member'
            ? `dotted member access "${raw}" — answered from the symbol table (lexical lane)`
            : `bare identifier "${raw}" — answered from the symbol table (lexical lane)`,
      };
    }
    // A single token that is neither a flag nor an identifier (e.g. a URL,
    // punctuation) — still whitespace-free, so the lexical lane can attempt it,
    // but it is not a clean identifier. Treat as symbol-shaped (lexical-first)
    // since there is nothing conceptual about a single token.
    return {
      isSymbolShaped: true,
      shape: 'identifier',
      reason: `single token "${raw}" — attempted from the symbol table (lexical lane)`,
    };
  }

  // Multi-word (or empty) — natural-language phrase; route to the embedding lane
  // when it is available.
  return {
    isSymbolShaped: false,
    shape: 'phrase',
    reason:
      'multi-word natural-language query — routed to the semantic (embedding) lane when available',
  };
}

/**
 * Build the {id, metadata} corpus the BM25 SparseRetriever indexes from the symbol
 * table. `id` is the coderef tag (codeRefId) when present, else the element name so
 * a header-less element (no codeRefId) is still indexable. The metadata mirrors
 * CodeChunkMetadata's lexical fields — the same fields lexicalSurface() reads.
 */
function toCorpusRecords(
  elements: readonly SymbolTableElement[],
): Array<{ id: string; metadata: CodeChunkMetadata }> {
  const records: Array<{ id: string; metadata: CodeChunkMetadata }> = [];
  for (const el of elements) {
    if (!el || !el.name) continue;
    const id = el.codeRefId ?? el.name;
    const metadata: CodeChunkMetadata = {
      coderef: el.codeRefId ?? el.name,
      type: el.type,
      name: el.name,
      file: el.file,
      line: el.line,
      // language is required by the type but unused by the lexical surface; the
      // symbol table does not carry it, so '' keeps the record valid without
      // fabricating a value.
      language: '',
      exported: el.exported,
      layer: el.layer,
      capability: el.capability,
      documentation: el.documentation,
    };
    records.push({ id, metadata });
  }
  return records;
}

/**
 * The lexical (symbol-table) lane. Builds a BM25 index over the symbol table and
 * returns ranked hits, with an exact-name boost so a query that IS an identifier
 * ranks that identifier's element first. PURE — no embedding, no vector store, no
 * daemon, no Date.now/Math.random. A query with no lexical match returns an empty
 * result (never an error, never a fabricated hit).
 */
export function lexicalSearch(
  elements: readonly SymbolTableElement[],
  query: string,
  opts: LexicalSearchOptions = {},
): LexicalSearchResult {
  const topK = opts.topK ?? DEFAULT_TOP_K;
  const boost = opts.exactNameBoost ?? DEFAULT_EXACT_BOOST;
  const routing_reason = classifyQuery(query).reason;

  const records = toCorpusRecords(elements);
  if (records.length === 0) {
    return { lane: 'lexical', results: [], routing_reason };
  }

  const retriever = SparseRetriever.fromRecords(records);
  // Over-fetch a little before the exact-name re-rank so a strong exact match that
  // BM25 ranked just outside topK is not lost before the boost is applied.
  const rawHits = retriever.search(query, Math.max(topK * 4, 40));

  // Exact-name boost: multiply the score of a hit whose element name equals the
  // query (case-insensitive, and — for a dotted query like `LRUCache.get` — whose
  // name equals the last dotted segment). Deterministic; ties still break on id.
  const qNorm = normalizeQueryForExactMatch(query);
  const boosted = rawHits.map((h: SparseHit) => {
    const name = typeof h.metadata?.name === 'string' ? h.metadata.name : '';
    const isExact = name.toLowerCase() === qNorm;
    return {
      hit: h,
      score: isExact ? h.score * boost : h.score,
    };
  });
  boosted.sort(
    (a, b) =>
      b.score - a.score ||
      (a.hit.id < b.hit.id ? -1 : a.hit.id > b.hit.id ? 1 : 0),
  );

  const results: RouterHit[] = boosted.slice(0, topK).map(({ hit, score }) => ({
    id: hit.id,
    name: typeof hit.metadata?.name === 'string' ? hit.metadata.name : undefined,
    file: typeof hit.metadata?.file === 'string' ? hit.metadata.file : undefined,
    line: typeof hit.metadata?.line === 'number' ? hit.metadata.line : undefined,
    type: typeof hit.metadata?.type === 'string' ? hit.metadata.type : undefined,
    score: Math.round(score * 1000) / 1000,
  }));

  return { lane: 'lexical', results, routing_reason };
}

/**
 * Normalize a query for exact-name comparison: strip surrounding quotes, and for a
 * dotted member access (`LRUCache.get`) compare against the LAST segment (`get`) —
 * the member being searched for — lowercased. Pure.
 */
function normalizeQueryForExactMatch(query: string): string {
  let q = (query ?? '').trim();
  if (
    q.length >= 2 &&
    ((q.startsWith('"') && q.endsWith('"')) || (q.startsWith("'") && q.endsWith("'")))
  ) {
    q = q.slice(1, -1);
  }
  const dot = q.lastIndexOf('.');
  if (dot > 0 && dot < q.length - 1) q = q.slice(dot + 1);
  return q.toLowerCase();
}
