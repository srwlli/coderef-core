// mcp-response-format.ts — the PURE, reusable response-shaping module for the
// coderef-core MCP server (Phase 6, STUB-8H3YV0).
//
// Two composable, ADDITIVE levers over the MCP READ surface, both implemented
// here ONCE so every list tool shares one implementation:
//
//   1. response_format: 'concise' | 'detailed' — a per-tool VERBOSITY projection.
//      concise  = envelope counts (total/returned/truncated/offset/has_more) +
//                 a `format:'concise'` marker + the item array reduced to identity
//                 fields (id/name/file/line), dropping heavy per-item evidence.
//      detailed = today's full shape, byte-for-byte.
//
//   2. paginate(items, offset, limit) — generalized offset pagination, built on
//      the SAME clamp semantics as coderef-mcp-server's clampLimit (default 25,
//      cap 100). Emits { offset, limit, total, has_more } — a strict
//      generalization of the pre-existing unresolved_edges {total,offset,returned,
//      truncated} envelope.
//
// SURFACES-NOT-VERDICTS: a concise response reports what the tool KNOWS in summary
// form — it is a VERBOSITY choice over the SAME known facts, never a filter that
// changes what is true and never a quality verdict. Every projection is
// total-preserving: concise drops BODY detail, not counts/provenance. An agent
// that reads `total` on a concise response sees the identical number it would on
// the detailed response.
//
// DETERMINISM: no Date.now / Math.random anywhere. Identical inputs -> byte-
// identical output. Pure functions; the only state is what the caller passes in.

// ---- pagination clamp constants (mirror coderef-mcp-server.ts) -----------------
// Kept in lock-step with DEFAULT_LIMIT=25 / MAX_LIMIT=100 in coderef-mcp-server.ts.
// Exported so a single source of truth is importable by the server + tests; the
// server's own clampLimit stays as-is (byte-unchanged) and delegates limit
// clamping through paginate() where pagination is wired.
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

/**
 * Clamp a caller-supplied limit into [1, MAX_LIMIT], defaulting to DEFAULT_LIMIT
 * when absent/non-finite. Byte-identical semantics to coderef-mcp-server's
 * clampLimit (undefined|NaN -> DEFAULT_LIMIT; else max(1, min(MAX_LIMIT, floor))).
 */
export function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

/** Clamp an offset into [0, +inf): absent/negative/non-finite -> 0. */
export function clampOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
}

export interface Page<T> {
  /** The offset..offset+limit window of `items`. */
  page: T[];
  /** The clamped offset actually applied (>= 0). */
  offset: number;
  /** The clamped limit actually applied ([1, MAX_LIMIT]). */
  limit: number;
  /** The TRUE pre-page count of `items` (never the sliced length). */
  total: number;
  /** True iff a further page exists: offset + page.length < total. */
  has_more: boolean;
}

/**
 * Slice `items` into an offset/limit window, reporting the true pre-page total
 * and a forward has_more signal.
 *
 * - offset is clamped to [0, +inf); an offset past the end yields an EMPTY page
 *   with has_more=false (never an error — a past-the-end page is a valid answer).
 * - limit is clamped through clampLimit (default 25, cap 100). A limit above the
 *   cap is clamped, NOT rejected.
 * - total is ALWAYS items.length (the pre-page count) — no silent truncation, so
 *   an agent can always tell there is a next page.
 * - absent offset (=> 0) + absent limit (=> DEFAULT_LIMIT) reproduces the current
 *   first-page behavior.
 */
export function paginate<T>(items: readonly T[], offset?: number, limit?: number): Page<T> {
  const total = items.length;
  const off = clampOffset(offset);
  const lim = clampLimit(limit);
  const page = items.slice(off, off + lim);
  return {
    page,
    offset: off,
    limit: lim,
    total,
    has_more: off + page.length < total,
  };
}

export type ResponseFormat = 'concise' | 'detailed';

/** The concise identity-field set — the nodeSummary-grade projection. */
export interface ConciseIdentity {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  file?: unknown;
  line?: unknown;
}

/**
 * Normalize a possibly-undefined response_format arg to a concrete value.
 * Default is DETAILED (opt-in concise) per the P6-T1 default-verbosity contract:
 * absent response_format preserves today's full shape byte-for-byte.
 */
export function resolveResponseFormat(fmt: ResponseFormat | undefined): ResponseFormat {
  return fmt === 'concise' ? 'concise' : 'detailed';
}

/** True when the caller asked for the concise projection. */
export function isConcise(fmt: ResponseFormat | undefined): boolean {
  return fmt === 'concise';
}

/**
 * Reduce one item object to its identity fields (id/name/type/file/line), keeping
 * only the keys that are actually present. Deterministic key order. Heavy
 * per-item evidence (callee/receiver/scope/specifier/candidates/at/confidence/…)
 * is dropped in concise mode — the identity is enough to re-query for detail.
 */
export function conciseItem(item: Record<string, unknown>): ConciseIdentity {
  const out: ConciseIdentity = {};
  if ('id' in item) out.id = item.id;
  if ('name' in item) out.name = item.name;
  if ('type' in item) out.type = item.type;
  if ('file' in item) out.file = item.file;
  if ('line' in item) out.line = item.line;
  return out;
}

/**
 * Project a full list-envelope down to its concise form.
 *
 * Preserves every count/provenance key on the envelope (total, returned,
 * truncated, offset, limit, has_more, element, relationship, direction,
 * min_confidence, status_breakdown, filters, …) and REPLACES the named item
 * array(s) with their identity-only projection. Adds `format:'concise'` so the
 * shape is self-describing. When called on a detailed envelope the caller has
 * already decided to emit concise; this never inspects response_format itself.
 *
 * `itemKeys` names the array-valued keys to reduce (e.g. ['callers'], ['files',
 * 'sample_dependencies']). Any listed key whose value is an array of objects is
 * mapped through conciseItem; a listed key that is absent or not an array is left
 * untouched (defensive — never throws on shape drift).
 *
 * TOTAL-PRESERVING: counts are copied verbatim; only body detail shrinks.
 */
export function projectConcise(
  envelope: Record<string, unknown>,
  itemKeys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...envelope, format: 'concise' };
  for (const key of itemKeys) {
    const val = out[key];
    if (Array.isArray(val)) {
      out[key] = val.map(entry =>
        entry && typeof entry === 'object' ? conciseItem(entry as Record<string, unknown>) : entry,
      );
    }
  }
  return out;
}

/**
 * Convenience wrapper: return `envelope` unchanged for 'detailed', or its concise
 * projection for 'concise'. The single call site pattern for a list handler:
 *
 *   return shapeResponse({ ...fullEnvelope }, response_format, ['callers']);
 *
 * Absent response_format => 'detailed' => byte-identical to the pre-Phase-6 shape.
 */
export function shapeResponse(
  envelope: Record<string, unknown>,
  fmt: ResponseFormat | undefined,
  itemKeys: readonly string[],
): Record<string, unknown> {
  return isConcise(fmt) ? projectConcise(envelope, itemKeys) : envelope;
}
