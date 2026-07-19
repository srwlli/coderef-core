/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability docstrings
 * @exports DocstringItem, DocstringSummary, DocstringSurface, DocstringInputs, computeDocstringSurface, DOCSTRING_SCHEMA_VERSION
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * docstrings — per-element docstring presence + text projection
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 8).
 *
 * Surfaces the `ElementData.docstring` slot that Phase 8's live-extractor wiring
 * now fills (a leading `/** *\/` JSDoc for JS/TS, or the first string-literal
 * statement for Python). Answers "is this element documented, and what does its
 * docstring say?" at ELEMENT grain, attributed to codeRefId so a hit pipes into
 * the graph tools.
 *
 * PURE. No I/O, no `Date.now`/`Math.random`, deterministic — identical inputs
 * yield a byte-identical result. The caller loads .coderef/index.json elements
 * and passes them in.
 *
 * SURFACES, NOT VERDICTS. `coverageRatio` is a PROVENANCE ratio (documented /
 * total), NOT a quality score or grade — there is deliberately no letter/health
 * verdict. ABSENCE = NO-DATA: an element whose `docstring` is undefined reports
 * `hasDocstring:false` with the text omitted (distinguishable from a scanned
 * empty case); an empty element set returns `{ no_data: true }`, never a false
 * "0% documented" over nothing.
 *
 * COMPLEMENTS, does not replace, the FILE-grain regex JSDocCoverage in
 * src/analyzer/docs-analyzer.ts (that surface is coarser + not codeRefId-keyed).
 */

export const DOCSTRING_SCHEMA_VERSION = '1.0.0';

/** Minimal element shape this projection needs (subset of ElementData). */
export interface DocstringElement {
  type?: string;
  name: string;
  file: string;
  line?: number;
  codeRefId?: string;
  docstring?: string;
}

/** One per-element docstring fact. */
export interface DocstringItem {
  codeRefId: string | null;
  name: string;
  kind: string;
  file: string;
  line: number | null;
  hasDocstring: boolean;
  /** Present only when hasDocstring is true (absence = no-data, never ''). */
  docstring?: string;
}

/** Roll-up counts. coverageRatio is provenance, NOT a quality grade. */
export interface DocstringSummary {
  total: number;
  documented: number;
  undocumented: number;
  coverageRatio: number;
}

export interface DocstringSurface {
  items: DocstringItem[];
  summary: DocstringSummary;
  no_data: boolean;
  truncated: boolean;
  schema_version: string;
  note: string;
}

export interface DocstringInputs {
  elements: DocstringElement[];
  /** Optional case-insensitive substring filter over element name. */
  filter?: string;
  /** Optional: true -> documented only, false -> undocumented only, undefined -> all. */
  documented?: boolean;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 100;

const NOTE =
  'Element-grain docstring surface: coverageRatio is provenance (documented/total), ' +
  'NOT a quality score. hasDocstring:false is no-data (undocumented is a fact, never a guess). ' +
  'Complements the file-grain JSDocCoverage in docs-analyzer.ts.';

/**
 * Project per-element docstring presence + text, with a coverage roll-up.
 * Deterministic: items key-sorted by (file asc, line asc, name asc). The summary
 * is computed over the FILTERED set (before pagination) so counts reflect the
 * query, and pagination only bounds the returned items.
 */
export function computeDocstringSurface(inputs: DocstringInputs): DocstringSurface {
  const { elements, filter, documented, limit = DEFAULT_LIMIT, offset = 0 } = inputs;

  if (!elements || elements.length === 0) {
    return {
      items: [],
      summary: { total: 0, documented: 0, undocumented: 0, coverageRatio: 0 },
      no_data: true,
      truncated: false,
      schema_version: DOCSTRING_SCHEMA_VERSION,
      note: NOTE,
    };
  }

  const needle = filter ? filter.toLowerCase() : null;

  const projected: DocstringItem[] = elements
    .filter((el) => (needle ? el.name.toLowerCase().includes(needle) : true))
    .map((el) => {
      const hasDoc = typeof el.docstring === 'string' && el.docstring.length > 0;
      const item: DocstringItem = {
        codeRefId: el.codeRefId ?? null,
        name: el.name,
        kind: el.type ?? 'unknown',
        file: el.file,
        line: typeof el.line === 'number' ? el.line : null,
        hasDocstring: hasDoc,
      };
      if (hasDoc) item.docstring = el.docstring;
      return item;
    })
    .filter((item) => (documented === undefined ? true : item.hasDocstring === documented));

  // Deterministic sort: file, then line, then name.
  projected.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      a.name.localeCompare(b.name),
  );

  const documentedCount = projected.filter((i) => i.hasDocstring).length;
  const total = projected.length;
  const summary: DocstringSummary = {
    total,
    documented: documentedCount,
    undocumented: total - documentedCount,
    coverageRatio: total > 0 ? documentedCount / total : 0,
  };

  const page = projected.slice(offset, offset + limit);
  const truncated = offset + limit < projected.length;

  return {
    items: page,
    summary,
    no_data: false,
    truncated,
    schema_version: DOCSTRING_SCHEMA_VERSION,
    note: NOTE,
  };
}
