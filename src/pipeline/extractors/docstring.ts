/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability docstring-extraction
 * @exports extractLeadingJsDoc, extractPythonDocstring
 * @used_by src/pipeline/extractors/element-extractor.ts
 */

/**
 * Docstring extraction helpers (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P8).
 *
 * Fills the long-declared-but-unimplemented `ElementData.docstring` slot from the
 * LIVE extractor (element-extractor.ts). Two language shapes:
 *
 * - JS/TS/JSX: a leading block comment `/** ... *\/` immediately preceding the
 *   declaration. CRITICAL: an `export function f` declaration is wrapped in an
 *   `export_statement`, so `previousNamedSibling` on the inner declaration is
 *   null — we climb to the export wrapper first (verified by live tree-sitter
 *   probe). Without the climb, exported functions (the bulk of the public
 *   surface) capture nothing.
 *
 * - Python: the docstring is the first string-literal statement in the body
 *   (ported reference logic from the orphaned src/scanner/tree-sitter-scanner.ts,
 *   which is dead relative to the canonical pipeline).
 *
 * PURE over the supplied node. Never throws. Absence -> undefined (never '',
 * never a guess) so "no docstring" stays a distinguishable fact.
 */

import type Parser from 'tree-sitter';

/**
 * Extract a leading JSDoc/TSDoc block comment for a JS/TS/JSX declaration node.
 * Returns the trimmed comment body, or undefined when there is no leading
 * `/** *\/` block. Line comments (`//`) and plain block comments that do not
 * open with `/**` are intentionally NOT treated as docstrings.
 */
export function extractLeadingJsDoc(node: Parser.SyntaxNode): string | undefined {
  // Climb to the export_statement wrapper when present: `export function f`
  // parses as export_statement > function_declaration, and the leading comment
  // is the previous sibling of the WRAPPER, not the inner declaration.
  const anchor =
    node.parent && node.parent.type === 'export_statement' ? node.parent : node;

  const prev = anchor.previousNamedSibling;
  if (!prev || prev.type !== 'comment') return undefined;

  const raw = prev.text;
  if (!raw.startsWith('/**')) return undefined;

  return stripJsDocDelimiters(raw);
}

/**
 * Strip `/** ... *\/` delimiters and the leading ` * ` gutter from each line,
 * returning the trimmed doc body. Deterministic; no I/O.
 */
function stripJsDocDelimiters(raw: string): string | undefined {
  // Drop the opening /** and trailing */, then per-line strip a leading
  // optional-whitespace `*` gutter (the classic JSDoc star column).
  const inner = raw
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '');

  const lines = inner.split('\n').map((line) => line.replace(/^\s*\*?\s?/, ''));

  const body = lines.join('\n').trim();
  return body.length > 0 ? body : undefined;
}

/**
 * Extract a Python docstring: the first string-literal statement in the node's
 * body. Returns the trimmed content with surrounding triple/single quotes
 * removed, or undefined when the first body statement is not a string.
 * Ported from the reference logic in the orphaned tree-sitter-scanner.ts.
 */
export function extractPythonDocstring(node: Parser.SyntaxNode): string | undefined {
  const bodyNode = node.childForFieldName('body');
  if (!bodyNode) return undefined;

  const firstChild = bodyNode.namedChildren[0];
  if (!firstChild || firstChild.type !== 'expression_statement') return undefined;

  const stringNode = firstChild.namedChildren[0];
  if (!stringNode || stringNode.type !== 'string') return undefined;

  const stripped = stringNode.text
    .replace(/^('''|""")\s*/, '')
    .replace(/\s*('''|""")$/, '')
    .replace(/^["']\s*/, '')
    .replace(/\s*["']$/, '')
    .trim();

  return stripped.length > 0 ? stripped : undefined;
}
