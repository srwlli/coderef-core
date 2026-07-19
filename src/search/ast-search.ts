/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability ast-structural-search
 * @constraint one tree-sitter parse per file; content is caller-supplied (no disk re-read); grammar load is the single impure edge (mirrors scanner/tree-sitter-file-scan.ts)
 * @exports searchAst, AstSearchMatch, AstSearchResult, AstSearchOptions, AstSearchElement
 * @imports pipeline/grammar-registry:GrammarRegistry, pipeline/types:EXTENSION_TO_LANGUAGE
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * ast_search — structural AST pattern search (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P3).
 *
 * Syntax-aware structural queries ripgrep cannot express ("await inside a loop",
 * "empty catch"): the agent supplies a tree-sitter S-EXPRESSION query and a
 * language extension, and each match returns file + 1-based line range + the
 * matched snippet, ATTRIBUTED to the enclosing element's codeRefId so a hit
 * pipes straight into the graph tools (what_calls, impact_of, symbol_context).
 *
 * No new pattern language is invented — the query string IS tree-sitter's own
 * S-expression grammar. The grammar is loaded through the SAME GrammarRegistry
 * seam the scanner uses (src/scanner/tree-sitter-file-scan.ts); the Language for
 * the Query is derived from the loaded parser via parser.getLanguage(), so this
 * module adds no second loader.
 *
 * Discipline:
 * - Surfaces, not verdicts: a match is a SYNTACTIC FACT ("this shape occurs
 *   here"), never a defect verdict. The caller decides what it means.
 * - Absence = no-data: no match, an unsupported language, or a malformed query
 *   all return an empty match set + a `reason`, NEVER a throw and NEVER a guess.
 * - Deterministic: matches are sorted (file asc, startLine asc, captureName asc)
 *   and capped with a single truncation note.
 * - Pure over supplied content + elements — no disk reads inside the projection.
 *   The one impure edge is the async grammar load, isolated at the top.
 */

import Parser from 'tree-sitter';
import { GrammarRegistry } from '../pipeline/grammar-registry.js';
import { EXTENSION_TO_LANGUAGE, type LanguageExtension } from '../pipeline/types.js';

/** Default cap on returned matches (deterministic truncation). */
export const AST_SEARCH_DEFAULT_LIMIT = 100;

/** Max characters of matched source kept per snippet (longer is clamped + elided). */
const SNIPPET_MAX_CHARS = 400;

/** A file to search: path (used for ids + reporting) + already-read content. */
export interface AstSearchFile {
  file: string;
  content: string;
}

/**
 * The minimal element shape needed for codeRefId attribution — a subset of
 * ElementData. A match at (file, line) is attributed to the TIGHTEST element
 * whose [line, endLine] range encloses it. Callers pass index.json elements.
 */
export interface AstSearchElement {
  file: string;
  line: number;
  endLine?: number;
  codeRefId?: string;
  name?: string;
}

/** One structural match. */
export interface AstSearchMatch {
  file: string;
  /** 1-based start line of the captured node. */
  startLine: number;
  /** 1-based end line of the captured node. */
  endLine: number;
  /** The name of the S-expression capture that produced this hit (e.g. "@loop"). */
  captureName: string;
  /** The matched source text, clamped to SNIPPET_MAX_CHARS. */
  snippet: string;
  /** codeRefId of the enclosing element, or null when the match is not inside a known element (absence = no-data). */
  codeRefId: string | null;
  /** Name of the enclosing element, when attributed. */
  enclosingElement?: string;
}

export interface AstSearchResult {
  language: string;
  query: string;
  /** All matches after deterministic sort + truncation. */
  matches: AstSearchMatch[];
  /** Total matches found BEFORE the limit cap (>= matches.length). */
  totalMatches: number;
  /** True when totalMatches exceeded the limit and the tail was dropped. */
  truncated: boolean;
  /**
   * Why the result is shaped as it is. Present ONLY on a degraded/empty path:
   *   'invalid_query'        — the S-expression failed to compile
   *   'unsupported_language' — no grammar for the requested extension
   *   'grammar_unavailable'  — grammar failed to load at runtime
   * Absent on a normal (possibly empty) match result.
   */
  reason?: 'invalid_query' | 'unsupported_language' | 'grammar_unavailable';
  note: string;
}

export interface AstSearchOptions {
  /** Language extension (ts, tsx, js, jsx, py, go, rs, java, cpp, c, ...). */
  lang: string;
  /** The tree-sitter S-expression query string. */
  query: string;
  /** Files to search (content supplied — no disk reads here). */
  files: AstSearchFile[];
  /** Elements for codeRefId attribution (typically index.json elements). */
  elements?: AstSearchElement[];
  /** Max matches returned (default AST_SEARCH_DEFAULT_LIMIT). */
  limit?: number;
}

const SURFACE_NOTE =
  'A match is a syntactic fact (this shape occurs here), never a defect verdict. ' +
  'Absence is no-data: an empty result means the shape was not found (or the query/language was unusable), not that the code is correct.';

/** Build the per-file element index once: file -> elements sorted by line asc. */
function indexElementsByFile(elements: AstSearchElement[]): Map<string, AstSearchElement[]> {
  const byFile = new Map<string, AstSearchElement[]>();
  for (const el of elements) {
    const list = byFile.get(el.file);
    if (list) list.push(el);
    else byFile.set(el.file, [el]);
  }
  for (const list of byFile.values()) {
    list.sort((a, b) => a.line - b.line);
  }
  return byFile;
}

/**
 * Attribute a match line to the enclosing element in the same file, using the
 * canonical index.json line-attribution idiom (parseDiffToChangedElements):
 * index.json records only a start line, so an element's implied range is
 * [el.line, nextElement.line - 1] — "this declaration up to the next one".
 * An explicit endLine (supplied e.g. by tests) is honored when present.
 * `fileElements` MUST be pre-sorted by line asc. Returns null when the match
 * sits above the first element (absence = no-data).
 */
function attribute(
  fileElements: AstSearchElement[] | undefined,
  startLine: number,
): AstSearchElement | null {
  if (!fileElements || fileElements.length === 0) return null;
  let best: AstSearchElement | null = null;
  for (let i = 0; i < fileElements.length; i++) {
    const el = fileElements[i];
    const end =
      el.endLine ??
      (i + 1 < fileElements.length ? fileElements[i + 1].line - 1 : Number.POSITIVE_INFINITY);
    if (el.line <= startLine && startLine <= end) {
      // Elements are line-sorted; the last one whose range covers the line is
      // the tightest enclosing declaration.
      best = el;
    }
  }
  return best;
}

function clampSnippet(text: string): string {
  if (text.length <= SNIPPET_MAX_CHARS) return text;
  return text.slice(0, SNIPPET_MAX_CHARS) + '…';
}

/**
 * Run a structural AST search. Async ONLY for the one-time grammar load; the
 * per-file query + attribution is pure over supplied content.
 */
export async function searchAst(options: AstSearchOptions): Promise<AstSearchResult> {
  const { lang, query, files, elements = [] } = options;
  const limit = options.limit ?? AST_SEARCH_DEFAULT_LIMIT;
  const language = EXTENSION_TO_LANGUAGE[lang as LanguageExtension];

  const base: Omit<AstSearchResult, 'matches' | 'totalMatches' | 'truncated'> = {
    language: language ?? lang,
    query,
    note: SURFACE_NOTE,
  };

  if (!language) {
    return {
      ...base,
      matches: [],
      totalMatches: 0,
      truncated: false,
      reason: 'unsupported_language',
      note: `No tree-sitter grammar for language "${lang}". ${SURFACE_NOTE}`,
    };
  }

  // The single impure edge: load the grammar through the shared registry seam.
  const parser = await GrammarRegistry.getInstance().getParser(lang);
  if (!parser) {
    return {
      ...base,
      matches: [],
      totalMatches: 0,
      truncated: false,
      reason: 'grammar_unavailable',
      note: `Grammar for "${lang}" failed to load. ${SURFACE_NOTE}`,
    };
  }

  // Compile the S-expression query ONCE against the parser's language. A
  // malformed query throws here — degrade to no-data, never propagate.
  let compiled: Parser.Query;
  try {
    compiled = new Parser.Query(parser.getLanguage(), query);
  } catch (err) {
    return {
      ...base,
      matches: [],
      totalMatches: 0,
      truncated: false,
      reason: 'invalid_query',
      note:
        `Invalid tree-sitter S-expression query: ` +
        `${String(err instanceof Error ? err.message : err).slice(0, 200)}. ${SURFACE_NOTE}`,
    };
  }

  const elementsByFile = indexElementsByFile(elements);
  const all: AstSearchMatch[] = [];

  for (const { file, content } of files) {
    let tree;
    try {
      tree = parser.parse(content);
    } catch {
      // A file that fails to parse contributes no matches (best-effort, never throws).
      continue;
    }
    let captures: Parser.QueryCapture[];
    try {
      captures = compiled.captures(tree.rootNode);
    } catch {
      continue;
    }
    const fileElements = elementsByFile.get(file);
    for (const cap of captures) {
      const node = cap.node;
      const startLine = node.startPosition.row + 1; // tree-sitter rows are 0-based
      const endLine = node.endPosition.row + 1;
      const enclosing = attribute(fileElements, startLine);
      all.push({
        file,
        startLine,
        endLine,
        captureName: cap.name,
        snippet: clampSnippet(node.text),
        codeRefId: enclosing?.codeRefId ?? null,
        ...(enclosing?.name ? { enclosingElement: enclosing.name } : {}),
      });
    }
  }

  // Deterministic order independent of file/capture iteration.
  all.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.startLine - b.startLine ||
      a.captureName.localeCompare(b.captureName) ||
      a.endLine - b.endLine,
  );

  const totalMatches = all.length;
  const truncated = totalMatches > limit;
  const matches = truncated ? all.slice(0, limit) : all;

  return {
    ...base,
    matches,
    totalMatches,
    truncated,
    note: truncated
      ? `Showing ${limit} of ${totalMatches} matches (capped). ${SURFACE_NOTE}`
      : SURFACE_NOTE,
  };
}
