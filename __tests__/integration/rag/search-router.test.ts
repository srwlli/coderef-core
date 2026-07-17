/**
 * search-router tests (WO-AGENTIC-CODING-INTELLIGENCE-PROGRAM-001 Phase 9,
 * lexical-first-search-router, STUB-014M9C).
 *
 * The router core is PURE — classifyQuery + lexicalSearch are functions of a
 * passed-in already-loaded symbol table + a query string. No embedding, no vector
 * store, no daemon, no Date.now/Math.random. These tests pin:
 *   - classifyQuery determinism across the symbol-shaped forms vs conceptual phrases,
 *   - lexicalSearch exact-name ranking + camelCase-token matching,
 *   - an empty result on no match (never an error),
 *   - byte-determinism (identical inputs ⇒ identical results),
 *   - any-repo: a header-less element (no layer/capability/codeRefId) still matches.
 */

import { describe, expect, it } from 'vitest';
import {
  classifyQuery,
  lexicalSearch,
  type SymbolTableElement,
} from '../../../src/integration/rag/search-router.js';

/** A small synthetic symbol table — no .coderef read, no embeddings. */
const ELEMENTS: SymbolTableElement[] = [
  {
    type: 'function',
    name: 'authenticateUser',
    file: 'src/auth/login.ts',
    line: 24,
    exported: true,
    codeRefId: '@Fn/auth/login#authenticateUser:24',
    layer: 'service',
    capability: 'auth-login',
    documentation: 'Authenticate a user against the credential store.',
  },
  {
    type: 'method',
    name: 'get',
    file: 'src/cache/lru-cache.ts',
    line: 114,
    exported: true,
    codeRefId: '@Method/cache/LRUCache#get:114',
    layer: 'service',
    capability: 'lru-cache',
    documentation: 'Return the cached value for a key, or undefined.',
  },
  {
    type: 'class',
    name: 'LRUCache',
    file: 'src/cache/lru-cache.ts',
    line: 40,
    exported: true,
    codeRefId: '@Class/cache/LRUCache:40',
    layer: 'service',
    capability: 'lru-cache',
    documentation: 'A least-recently-used cache with bounded capacity.',
  },
  {
    // A header-less element: no codeRefId, no layer, no capability, no docs.
    // Any-repo case — must still be indexable + matchable on name/type/file.
    type: 'function',
    name: 'serializeFactSet',
    file: 'src/export/serialize.ts',
    line: 8,
  },
];

describe('Phase 9 — classifyQuery', () => {
  it('classifies a bare identifier as symbol-shaped (lexical lane)', () => {
    const c = classifyQuery('authenticateUser');
    expect(c.isSymbolShaped).toBe(true);
    expect(c.shape).toBe('identifier');
    expect(c.reason).toMatch(/lexical lane/);
  });

  it('classifies a dotted member access as symbol-shaped (member)', () => {
    const c = classifyQuery('LRUCache.get');
    expect(c.isSymbolShaped).toBe(true);
    expect(c.shape).toBe('member');
  });

  it('classifies a flag-like token as symbol-shaped (flag)', () => {
    const c = classifyQuery('--stale-only');
    expect(c.isSymbolShaped).toBe(true);
    expect(c.shape).toBe('flag');
  });

  it('classifies a fully-quoted phrase as symbol-shaped (quoted exact)', () => {
    const c = classifyQuery('"exact phrase here"');
    expect(c.isSymbolShaped).toBe(true);
    expect(c.shape).toBe('quoted');
  });

  it('classifies multi-word natural language as conceptual (semantic lane)', () => {
    const c = classifyQuery('how does authentication work');
    expect(c.isSymbolShaped).toBe(false);
    expect(c.shape).toBe('phrase');
    expect(c.reason).toMatch(/semantic .*lane/);
  });

  it('is deterministic — identical query ⇒ identical classification', () => {
    expect(classifyQuery('LRUCache.get')).toEqual(classifyQuery('LRUCache.get'));
    expect(classifyQuery('find the auth flow')).toEqual(
      classifyQuery('find the auth flow'),
    );
  });
});

describe('Phase 9 — lexicalSearch (symbol-table BM25, no embeddings)', () => {
  it('ranks the exact-name element first for an identifier query', () => {
    const r = lexicalSearch(ELEMENTS, 'authenticateUser');
    expect(r.lane).toBe('lexical');
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results[0].name).toBe('authenticateUser');
    expect(r.results[0].id).toBe('@Fn/auth/login#authenticateUser:24');
  });

  it('boosts the exact member for a dotted query (LRUCache.get ⇒ get first)', () => {
    const r = lexicalSearch(ELEMENTS, 'LRUCache.get');
    // The dotted query normalizes to its last segment `get` for the exact-name
    // boost, so the `get` method outranks the `LRUCache` class.
    expect(r.results[0].name).toBe('get');
  });

  it('matches a camelCase token against a compound identifier', () => {
    // `authenticate` should match `authenticateUser` via the identifier-aware
    // tokenizer (camelCase split), even though it is not an exact name.
    const r = lexicalSearch(ELEMENTS, 'authenticate');
    const names = r.results.map((h) => h.name);
    expect(names).toContain('authenticateUser');
  });

  it('returns an empty result (not an error) when nothing matches', () => {
    const r = lexicalSearch(ELEMENTS, 'zzzznotarealtokenxyz');
    expect(r.lane).toBe('lexical');
    expect(r.results).toEqual([]);
  });

  it('is byte-deterministic — identical inputs ⇒ identical results', () => {
    const a = lexicalSearch(ELEMENTS, 'LRUCache');
    const b = lexicalSearch(ELEMENTS, 'LRUCache');
    expect(a).toEqual(b);
  });

  it('any-repo: a header-less element (no codeRefId/layer/capability) still matches on name', () => {
    const r = lexicalSearch(ELEMENTS, 'serializeFactSet');
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results[0].name).toBe('serializeFactSet');
    // id falls back to the name when there is no codeRefId.
    expect(r.results[0].id).toBe('serializeFactSet');
  });

  it('empty symbol table ⇒ empty results, still lane:lexical (absence = no-data)', () => {
    const r = lexicalSearch([], 'anything');
    expect(r.lane).toBe('lexical');
    expect(r.results).toEqual([]);
  });

  it('threads the classification reason through as routing_reason', () => {
    const r = lexicalSearch(ELEMENTS, 'LRUCache');
    expect(r.routing_reason).toMatch(/lexical lane/);
  });
});
