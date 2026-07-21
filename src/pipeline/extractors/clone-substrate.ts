/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability clone-substrate-capture
 * @constraint zero extra I/O; computed from the defining node already in the extractor's hand
 * @exports captureCloneSubstrate, CLONE_FINGERPRINT_KINDS, CloneSubstrate
 * @used_by src/pipeline/extractors/element-extractor.ts
 */

/**
 * Clone substrate capture — WO-EXTEND-THE-CLONE-SURFACE-P10-SRC-QUERY-CLONES-001 P1.
 *
 * Computes, from the defining tree-sitter node the extractor ALREADY holds
 * (zero extra file reads, zero extra parses), the additive per-element fields
 * the richer clone passes in src/query/clones.ts consume:
 *
 * - `endLine` — 1-based end line of the defining node (the element's source
 *   span). Bonus consumer: ast-search.ts attribution honors an explicit
 *   element endLine when present, tightening its next-element-line heuristic.
 * - `normalizedBodyHash` — sha256 (32 hex chars) of the element's BODY text
 *   with COMMENT NODES cut by AST range (language-correct, never regex) and
 *   whitespace runs collapsed to single spaces. The body node is resolved via
 *   the grammar's `body` field (falling back to `value`, then `type`, then the
 *   whole node), so the element's NAME and signature are EXCLUDED — a renamed
 *   copy-paste still hashes identical (the NiCad fragment unit; identical hash
 *   = lexically identical normalized body, the CCFinder-style identity signal).
 * - `normalizedBodyLength` — length of that normalized text. Enables the
 *   min-body-length noise gate and near-miss candidate pruning downstream.
 * - `astFingerprint` — Deckard-style characteristic vector: sparse counts of
 *   RAW named node types across the subtree (comments excluded), keys sorted
 *   for deterministic serialization. FUNCTION-LIKE KINDS ONLY (function,
 *   method, hook, component): near-miss similarity is a function-body signal,
 *   and the kind gate keeps index growth bounded. Raw grammar type names mean
 *   vectors are only meaningfully comparable within one grammar family — the
 *   pure near-miss pass buckets candidates by file-extension family.
 *
 * Absence discipline: the regex-fallback scanner path never reaches this
 * module, so old or fallback-scanned indexes simply LACK these fields. The
 * clone passes disclose that as no-body-data / no_data — never a fake zero.
 */

import { createHash } from 'crypto';
import type Parser from 'tree-sitter';

/** Comment node types across the 10 supported grammars. */
const COMMENT_NODE_TYPES = new Set(['comment', 'line_comment', 'block_comment']);

/** Element kinds that get an astFingerprint (function-like bodies). */
export const CLONE_FINGERPRINT_KINDS: ReadonlySet<string> = new Set([
  'function',
  'method',
  'hook',
  'component',
]);

export interface CloneSubstrate {
  endLine: number;
  normalizedBodyHash: string;
  normalizedBodyLength: number;
  astFingerprint?: Record<string, number>;
}

/**
 * Capture the clone substrate for one element from its defining node.
 *
 * @param node        The DEFINING node (declaration/definition — not the name
 *                    identifier), so the hash spans the element's full body.
 * @param elementKind The element's ElementData.type — gates astFingerprint.
 */
export function captureCloneSubstrate(
  node: Parser.SyntaxNode,
  elementKind: string
): CloneSubstrate {
  const bodyNode = resolveBodyNode(node);
  const cuts: Array<[number, number]> = [];
  collectCommentRanges(bodyNode, bodyNode.startIndex, cuts);
  const normalized = normalizeBody(bodyNode.text, cuts);

  const substrate: CloneSubstrate = {
    endLine: node.endPosition.row + 1,
    normalizedBodyHash: createHash('sha256').update(normalized).digest('hex').slice(0, 32),
    normalizedBodyLength: normalized.length,
  };

  if (CLONE_FINGERPRINT_KINDS.has(elementKind)) {
    const counts: Record<string, number> = {};
    countNamedNodeTypes(bodyNode, counts);
    substrate.astFingerprint = Object.fromEntries(
      Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
  }

  return substrate;
}

/**
 * Resolve the BODY node of a defining node so the hash/fingerprint exclude the
 * element's name and signature (a renamed copy still matches). Grammar field
 * conventions: `body` (functions/methods/classes/interfaces across the 10
 * grammars), `value` (arrow-function fields, const declarators, type aliases),
 * `type` (go type_spec). Chained one level so a `value` that resolves to a
 * function expression contributes ITS body. Falls back to the whole node when
 * no field matches (hash still deterministic, just name-inclusive).
 */
function resolveBodyNode(node: Parser.SyntaxNode): Parser.SyntaxNode {
  let resolved =
    node.childForFieldName('body') ??
    node.childForFieldName('value') ??
    node.childForFieldName('type') ??
    node;
  if (
    (resolved.type === 'arrow_function' ||
      resolved.type === 'function' ||
      resolved.type === 'function_expression') &&
    resolved.childForFieldName('body')
  ) {
    resolved = resolved.childForFieldName('body')!;
  }
  return resolved;
}

/** Collect [start, end) ranges of comment nodes, relative to `base`. */
function collectCommentRanges(
  node: Parser.SyntaxNode,
  base: number,
  cuts: Array<[number, number]>
): void {
  if (COMMENT_NODE_TYPES.has(node.type)) {
    cuts.push([node.startIndex - base, node.endIndex - base]);
    return;
  }
  for (const child of node.children) {
    collectCommentRanges(child, base, cuts);
  }
}

/** Cut the comment ranges out of `text`, then collapse whitespace runs. */
function normalizeBody(text: string, cuts: Array<[number, number]>): string {
  let body = text;
  if (cuts.length > 0) {
    cuts.sort((a, b) => a[0] - b[0]);
    const parts: string[] = [];
    let cursor = 0;
    for (const [start, end] of cuts) {
      if (start > cursor) parts.push(text.slice(cursor, start));
      cursor = Math.max(cursor, end);
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    // Joining with a space keeps tokens separated where a comment sat between them.
    body = parts.join(' ');
  }
  return body.replace(/\s+/g, ' ').trim();
}

/** Count RAW named node types over the subtree, excluding comment nodes. */
function countNamedNodeTypes(
  node: Parser.SyntaxNode,
  counts: Record<string, number>
): void {
  if (COMMENT_NODE_TYPES.has(node.type)) return;
  if (node.isNamed) {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
  }
  for (const child of node.children) {
    countNamedNodeTypes(child, counts);
  }
}
