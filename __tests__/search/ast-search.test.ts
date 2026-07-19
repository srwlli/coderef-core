/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability ast-search-tests
 */

/**
 * ast_search structural-search tests (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P3).
 *
 * Exercised over SYNTHETIC in-memory files (no repo scan) against the REAL
 * tree-sitter TypeScript grammar loaded through the same GrammarRegistry seam
 * the scanner uses. The grammar is a hard dependency, but every grammar-
 * dependent assertion is gated on a one-time availability probe so a broken
 * native build degrades to a skip rather than a red suite (mirrors the
 * gitAvailable() gate in git-history.test.ts).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  searchAst,
  computeNotSearchedCounts,
  AST_SEARCH_DEFAULT_LIMIT,
  AST_SEARCH_LANG_EXTENSIONS,
  type AstSearchElement,
} from '../../src/search/ast-search.js';
import { GrammarRegistry } from '../../src/pipeline/grammar-registry.js';
import { EXTENSION_TO_LANGUAGE } from '../../src/pipeline/types.js';

/** Can we actually load the TS grammar in this environment? */
async function tsGrammarAvailable(): Promise<boolean> {
  try {
    const p = await GrammarRegistry.getInstance().getParser('ts');
    return p !== null;
  } catch {
    return false;
  }
}

// A structural shape ripgrep cannot express: an `await` inside a for-of loop
// body. `for (const x of xs)` parses as a `for_in_statement`, and the await
// sits inside an `expression_statement` within the loop's `statement_block`.
const AWAIT_IN_LOOP_QUERY =
  '(for_in_statement body: (statement_block (expression_statement (await_expression) @await)))';
// A valid query that finds nothing in code with no top-level `throw` — used to
// exercise the normal (non-degraded) empty path.
const THROW_QUERY = '(throw_statement) @throw';

describe('searchAst — degradation paths (pure, no grammar needed)', () => {
  it('unsupported language -> reason:"unsupported_language", empty, no throw', async () => {
    const r = await searchAst({
      lang: 'cobol',
      query: '(x)',
      files: [{ file: 'a.cbl', content: 'IDENTIFICATION DIVISION.' }],
    });
    expect(r.reason).toBe('unsupported_language');
    expect(r.matches).toEqual([]);
    expect(r.totalMatches).toBe(0);
  });

  it('never throws on a malformed request', async () => {
    await expect(
      searchAst({ lang: 'ts', query: '((((', files: [{ file: 'a.ts', content: 'const x = 1;' }] }),
    ).resolves.toBeDefined();
  });
});

describe.runIf(await tsGrammarAvailable())('searchAst — structural matches over real tree-sitter', () => {
  it('finds an await inside a loop (a shape ripgrep cannot express)', async () => {
    const content = [
      'async function drain(xs) {',          // line 1
      '  for (const x of xs) {',              // line 2
      '    await handle(x);',                 // line 3 — the hit
      '  }',                                  // line 4
      '}',                                    // line 5
      'async function once(x) {',            // line 6
      '  await handle(x);',                   // line 7 — NOT in a loop, must not match
      '}',                                    // line 8
    ].join('\n');

    const r = await searchAst({
      lang: 'ts',
      query: AWAIT_IN_LOOP_QUERY,
      files: [{ file: 'drain.ts', content }],
    });

    expect(r.reason).toBeUndefined();
    expect(r.totalMatches).toBe(1);
    const m = r.matches[0];
    expect(m.file).toBe('drain.ts');
    expect(m.startLine).toBe(3); // the await on line 3, never the line-7 await
    expect(m.captureName).toBe('await');
    expect(m.snippet).toContain('await');
  });

  it('attributes a match to the enclosing element codeRefId (and null outside any element)', async () => {
    const content = [
      'async function drain(xs) {', // line 1
      '  for (const x of xs) {',     // line 2
      '    await handle(x);',        // line 3
      '  }',                         // line 4
      '}',                           // line 5
    ].join('\n');

    // Synthetic index element: drain() starts at line 1. The match on line 3 is
    // enclosed by it (no next element -> extends to EOF).
    const elements: AstSearchElement[] = [
      { file: 'drain.ts', line: 1, codeRefId: '@Function/drain.ts:drain', name: 'drain' },
    ];

    const attributed = await searchAst({
      lang: 'ts',
      query: AWAIT_IN_LOOP_QUERY,
      files: [{ file: 'drain.ts', content }],
      elements,
    });
    expect(attributed.matches[0].codeRefId).toBe('@Function/drain.ts:drain');
    expect(attributed.matches[0].enclosingElement).toBe('drain');

    // With NO elements supplied, attribution is null (absence = no-data), never a guess.
    const unattributed = await searchAst({
      lang: 'ts',
      query: AWAIT_IN_LOOP_QUERY,
      files: [{ file: 'drain.ts', content }],
      elements: [],
    });
    expect(unattributed.matches[0].codeRefId).toBeNull();
  });

  it('attributes to the TIGHTEST enclosing element (next-declaration boundary)', async () => {
    const content = [
      'function first() {',          // line 1
      '  return 1;',                 // line 2
      '}',                           // line 3
      'async function second(xs) {', // line 4
      '  for (const x of xs) {',     // line 5
      '    await handle(x);',        // line 6 — belongs to second(), not first()
      '  }',                         // line 7
      '}',                           // line 8
    ].join('\n');
    const elements: AstSearchElement[] = [
      { file: 'm.ts', line: 1, codeRefId: '@Function/m.ts:first', name: 'first' },
      { file: 'm.ts', line: 4, codeRefId: '@Function/m.ts:second', name: 'second' },
    ];
    const r = await searchAst({
      lang: 'ts',
      query: AWAIT_IN_LOOP_QUERY,
      files: [{ file: 'm.ts', content }],
      elements,
    });
    expect(r.matches[0].codeRefId).toBe('@Function/m.ts:second');
  });

  it('malformed S-expression query -> reason:"invalid_query", no throw', async () => {
    const r = await searchAst({
      lang: 'ts',
      query: '(for_statement body: (_ (await_expression',
      files: [{ file: 'a.ts', content: 'for (;;) { await x; }' }],
    });
    expect(r.reason).toBe('invalid_query');
    expect(r.matches).toEqual([]);
    expect(r.totalMatches).toBe(0);
  });

  it('no structural match -> empty result, NO reason (a normal empty is not a degradation)', async () => {
    const r = await searchAst({
      lang: 'ts',
      query: THROW_QUERY,
      files: [{ file: 'ok.ts', content: 'function ok(){ return 1; }' }],
    });
    // No throw statement -> zero matches, but the query + language were valid.
    expect(r.reason).toBeUndefined();
    expect(r.matches).toEqual([]);
    expect(r.totalMatches).toBe(0);
  });

  it('is deterministic across multi-file, multi-match input (stable sort)', async () => {
    const files = [
      { file: 'z.ts', content: 'async function z(xs){ for(const x of xs){ await a(x); } }' },
      { file: 'a.ts', content: 'async function a(xs){ for(const x of xs){ await b(x); } }' },
    ];
    const r1 = await searchAst({ lang: 'ts', query: AWAIT_IN_LOOP_QUERY, files });
    const r2 = await searchAst({ lang: 'ts', query: AWAIT_IN_LOOP_QUERY, files: [...files].reverse() });
    // Sorted file asc regardless of input order.
    expect(r1.matches.map(m => m.file)).toEqual(['a.ts', 'z.ts']);
    expect(JSON.stringify(r1.matches)).toBe(JSON.stringify(r2.matches));
  });

  it('caps results at the limit and reports truncation', async () => {
    // Five awaits-in-loops across five files; limit 2 -> truncated with note.
    const files = Array.from({ length: 5 }, (_, i) => ({
      file: `f${i}.ts`,
      content: `async function f${i}(xs){ for(const x of xs){ await g(x); } }`,
    }));
    const r = await searchAst({ lang: 'ts', query: AWAIT_IN_LOOP_QUERY, files, limit: 2 });
    expect(r.totalMatches).toBe(5);
    expect(r.matches).toHaveLength(2);
    expect(r.truncated).toBe(true);
    expect(r.note).toMatch(/capped/i);
  });

  it('default limit is AST_SEARCH_DEFAULT_LIMIT', async () => {
    const r = await searchAst({
      lang: 'ts',
      query: AWAIT_IN_LOOP_QUERY,
      files: [{ file: 'a.ts', content: 'async function a(xs){ for(const x of xs){ await g(x); } }' }],
    });
    expect(r.truncated).toBe(false);
    expect(AST_SEARCH_DEFAULT_LIMIT).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// P3 remediation (WO-...-GENRE-FEATURES-PROGRAM-001 Phase 4)
// REC-001 lang-enum coverage + REC-002 not-searched visibility. Pure — no
// grammar needed, so these run unconditionally.
// ---------------------------------------------------------------------------

describe('REC-001 — ast_search accepted-language set (drift guard)', () => {
  it('AST_SEARCH_LANG_EXTENSIONS === the EXTENSION_TO_LANGUAGE key set (no drift)', () => {
    // The MCP `lang` enum is built from AST_SEARCH_LANG_EXTENSIONS. This guard
    // fails the moment either side gains/loses a language without the other,
    // which is exactly how the enum previously drifted narrower than the loader.
    const accepted = [...AST_SEARCH_LANG_EXTENSIONS].sort();
    const loaderKeys = Object.keys(EXTENSION_TO_LANGUAGE).sort();
    expect(accepted).toEqual(loaderKeys);
  });

  it('includes cc, cxx, c++, h (the extensions the old literal enum omitted)', () => {
    for (const ext of ['cc', 'cxx', 'c++', 'h']) {
      expect(AST_SEARCH_LANG_EXTENSIONS).toContain(ext);
    }
  });

  it('every accepted extension resolves to a real grammar language (no dead enum member)', () => {
    for (const ext of AST_SEARCH_LANG_EXTENSIONS) {
      expect(EXTENSION_TO_LANGUAGE[ext]).toBeTruthy();
    }
  });
});

describe('REC-002 — computeNotSearchedCounts (not-searched visibility)', () => {
  it('counts on-disk language files that carry no index element', () => {
    // a.ts + b.ts are indexed (and searched); c.ts is on disk but not indexed.
    const onDisk = ['a.ts', 'b.ts', 'c.ts'];
    const indexed = ['a.ts', 'b.ts'];
    const searched = ['a.ts', 'b.ts'];
    const r = computeNotSearchedCounts(onDisk, indexed, searched);
    expect(r.filesSkippedNoIndex).toBe(1); // c.ts
    expect(r.filesSkippedUnreadable).toBe(0);
  });

  it('counts indexed files that could not be read at search time', () => {
    // b.ts is indexed but was not successfully read (deleted/unreadable).
    const onDisk = ['a.ts', 'b.ts'];
    const indexed = ['a.ts', 'b.ts'];
    const searched = ['a.ts'];
    const r = computeNotSearchedCounts(onDisk, indexed, searched);
    expect(r.filesSkippedNoIndex).toBe(0);
    expect(r.filesSkippedUnreadable).toBe(1); // b.ts
  });

  it('is zero on a fully-indexed, fully-read tree (absence is truly no-match)', () => {
    const files = ['a.ts', 'b.ts', 'c.ts'];
    const r = computeNotSearchedCounts(files, files, files);
    expect(r.filesSkippedNoIndex).toBe(0);
    expect(r.filesSkippedUnreadable).toBe(0);
  });

  it('dedupes repeated on-disk entries (never double-counts a skip)', () => {
    const onDisk = ['a.ts', 'c.ts', 'c.ts', 'c.ts'];
    const indexed = ['a.ts'];
    const searched = ['a.ts'];
    const r = computeNotSearchedCounts(onDisk, indexed, searched);
    expect(r.filesSkippedNoIndex).toBe(1); // c.ts counted once
  });
});
