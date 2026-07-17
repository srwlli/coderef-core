/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability mcp-response-format-pagination-tests
 */

/**
 * Phase 6 (STUB-8H3YV0) — pure tests for the shared response-shaping module.
 *
 * These pin the two levers in isolation from the MCP server:
 *   - paginate()      — offset/limit windowing, true total, has_more, clamp reuse
 *   - projectConcise  — total-preserving identity-field projection, determinism
 *   - resolveResponseFormat / isConcise — default-verbosity contract (opt-in concise)
 *
 * Per-tool wiring (response_format/offset actually reaching handlers) is pinned in
 * __tests__/mcp-server.test.ts against the fixture graph.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  clampLimit,
  clampOffset,
  conciseItem,
  isConcise,
  paginate,
  projectConcise,
  resolveResponseFormat,
  shapeResponse,
} from '../../src/cli/mcp-response-format.js';

// ---- clamp constants stay in lock-step with the server ------------------------

describe('clamp constants', () => {
  it('mirror the server DEFAULT_LIMIT / MAX_LIMIT', () => {
    expect(DEFAULT_LIMIT).toBe(25);
    expect(MAX_LIMIT).toBe(100);
  });

  it('clampLimit: undefined/NaN -> DEFAULT_LIMIT; else clamped to [1, MAX_LIMIT]', () => {
    expect(clampLimit(undefined)).toBe(25);
    expect(clampLimit(NaN)).toBe(25);
    expect(clampLimit(0)).toBe(1); // floor is 1
    expect(clampLimit(10)).toBe(10);
    expect(clampLimit(1000)).toBe(100); // capped, NOT rejected
    expect(clampLimit(3.9)).toBe(3); // floored
  });

  it('clampOffset: undefined/negative/NaN -> 0; else floored', () => {
    expect(clampOffset(undefined)).toBe(0);
    expect(clampOffset(-5)).toBe(0);
    expect(clampOffset(NaN)).toBe(0);
    expect(clampOffset(7.9)).toBe(7);
  });
});

// ---- paginate() ---------------------------------------------------------------

describe('paginate', () => {
  const items = Array.from({ length: 250 }, (_, i) => ({ id: i }));

  it('windows the correct slice and reports the TRUE pre-page total', () => {
    const p = paginate(items, 0, 25);
    expect(p.total).toBe(250); // true count, not the sliced length
    expect(p.offset).toBe(0);
    expect(p.limit).toBe(25);
    expect(p.page.map(x => x.id)).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(p.has_more).toBe(true);
  });

  it('offset advances the window; has_more flips at the last page', () => {
    const second = paginate(items, 25, 25);
    expect(second.page[0].id).toBe(25);
    expect(second.page.at(-1)!.id).toBe(49);
    expect(second.has_more).toBe(true);

    const last = paginate(items, 225, 25);
    expect(last.page[0].id).toBe(225);
    expect(last.page.length).toBe(25);
    expect(last.has_more).toBe(false); // 225 + 25 === 250
  });

  it('has_more is true iff offset + page.length < total', () => {
    const p = paginate(items, 240, 25); // only 10 remain
    expect(p.page.length).toBe(10);
    expect(p.has_more).toBe(false);
  });

  it('offset past the end yields an EMPTY page with has_more=false (never an error)', () => {
    const p = paginate(items, 10_000, 25);
    expect(p.page).toEqual([]);
    expect(p.total).toBe(250); // still the true count — no silent truncation
    expect(p.has_more).toBe(false);
  });

  it('honors clampLimit: a limit above the cap is clamped, not rejected', () => {
    const p = paginate(items, 0, 5000);
    expect(p.limit).toBe(100); // MAX_LIMIT
    expect(p.page.length).toBe(100);
    expect(p.has_more).toBe(true);
  });

  it('absent offset + limit reproduces first-page defaults (offset 0, limit 25)', () => {
    const p = paginate(items);
    expect(p.offset).toBe(0);
    expect(p.limit).toBe(25);
    expect(p.page.length).toBe(25);
  });

  it('is deterministic — identical inputs give byte-identical windows', () => {
    expect(paginate(items, 30, 15)).toEqual(paginate(items, 30, 15));
  });

  it('handles an empty list without error', () => {
    const p = paginate([], 0, 25);
    expect(p.total).toBe(0);
    expect(p.page).toEqual([]);
    expect(p.has_more).toBe(false);
  });
});

// ---- default-verbosity contract ----------------------------------------------

describe('response_format default contract', () => {
  it('resolveResponseFormat defaults to detailed (concise is OPT-IN)', () => {
    expect(resolveResponseFormat(undefined)).toBe('detailed');
    expect(resolveResponseFormat('detailed')).toBe('detailed');
    expect(resolveResponseFormat('concise')).toBe('concise');
  });

  it('isConcise is true only for an explicit concise request', () => {
    expect(isConcise(undefined)).toBe(false);
    expect(isConcise('detailed')).toBe(false);
    expect(isConcise('concise')).toBe(true);
  });
});

// ---- conciseItem / projectConcise --------------------------------------------

describe('conciseItem', () => {
  it('keeps only present identity fields, dropping body detail', () => {
    const full = {
      id: '@Fn/x', name: 'foo', type: 'function', file: 'src/x.ts', line: 3,
      callee: 'bar', receiver: 'this', scope: 'X.foo', confidence: 'exact', at: 'src/x.ts:3',
    };
    expect(conciseItem(full)).toEqual({
      id: '@Fn/x', name: 'foo', type: 'function', file: 'src/x.ts', line: 3,
    });
  });

  it('omits identity keys that are absent (no undefined injection)', () => {
    expect(conciseItem({ id: 'a', file: 'f' })).toEqual({ id: 'a', file: 'f' });
  });
});

describe('projectConcise', () => {
  const full = {
    element: ['@Fn/src/util.ts#helper:10'],
    relationship: 'call',
    total: 490,
    offset: 0,
    limit: 25,
    returned: 25,
    truncated: true,
    has_more: true,
    callers: Array.from({ length: 25 }, (_, i) => ({
      id: `@Fn/c${i}`, name: `c${i}`, type: 'function', file: `src/c${i}.ts`, line: i,
      callee: 'helper', receiver: 'this', confidence: 'exact', at: `src/c${i}.ts:${i}`,
    })),
  };

  it('preserves EVERY count/provenance key (total-preserving)', () => {
    const concise = projectConcise(full, ['callers']);
    expect(concise.total).toBe(490); // never dropped
    expect(concise.returned).toBe(25);
    expect(concise.truncated).toBe(true);
    expect(concise.has_more).toBe(true);
    expect(concise.offset).toBe(0);
    expect(concise.limit).toBe(25);
    expect(concise.relationship).toBe('call');
    expect(concise.format).toBe('concise'); // self-describing marker
  });

  it('reduces the named item array to identity fields, dropping body detail', () => {
    const concise = projectConcise(full, ['callers']) as any;
    for (const c of concise.callers) {
      expect(Object.keys(c).sort()).toEqual(['file', 'id', 'line', 'name', 'type']);
      expect(c.callee).toBeUndefined();
      expect(c.confidence).toBeUndefined();
    }
  });

  it('is deterministic — same envelope -> byte-identical concise output', () => {
    expect(projectConcise(full, ['callers'])).toEqual(projectConcise(full, ['callers']));
  });

  it('leaves a listed key that is absent or not an array untouched (no throw on drift)', () => {
    const weird = { total: 1, notAnArray: 42 };
    const concise = projectConcise(weird, ['callers', 'notAnArray']) as any;
    expect(concise.total).toBe(1);
    expect(concise.notAnArray).toBe(42);
    expect(concise.format).toBe('concise');
  });

  it('does not mutate the input envelope', () => {
    const snapshot = JSON.parse(JSON.stringify(full));
    projectConcise(full, ['callers']);
    expect(full).toEqual(snapshot);
  });
});

describe('shapeResponse', () => {
  const env = { total: 3, items: [{ id: 'a', name: 'a', extra: 1 }] };

  it('detailed / absent leaves the envelope byte-unchanged', () => {
    expect(shapeResponse(env, undefined, ['items'])).toEqual(env);
    expect(shapeResponse(env, 'detailed', ['items'])).toEqual(env);
    // reference-equality is fine (no copy) for the detailed path
    expect(shapeResponse(env, 'detailed', ['items'])).toBe(env);
  });

  it('concise projects the named arrays and adds the marker', () => {
    const out = shapeResponse(env, 'concise', ['items']) as any;
    expect(out.total).toBe(3);
    expect(out.format).toBe('concise');
    expect(out.items).toEqual([{ id: 'a', name: 'a' }]); // extra dropped
  });
});
