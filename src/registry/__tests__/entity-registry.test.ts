/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability entity-registry-test
 */

/**
 * EntityRegistry identity tests (WO-REPO-REVIEW-2026-07-REMEDIATION-001
 * Phase 2, P1-12) — the module's FIRST tests.
 *
 * The load-bearing invariant: UUIDs key on slash-NORMALIZED file:name:line,
 * so Windows (`src\\a.ts`) and posix (`src/a.ts`) spellings of the same
 * element yield ONE identity. Before this phase they yielded two — silent
 * registry divergence on Windows.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityRegistry } from '../entity-registry.js';

describe('EntityRegistry identity normalization', () => {
  let registry: EntityRegistry;

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  it('generates the SAME UUID for Windows and posix spellings of one element', () => {
    const posix = registry.generateUUID('src/scanner/scanner.ts', 'scanCurrentElements', 42);
    const windows = registry.generateUUID('src\\scanner\\scanner.ts', 'scanCurrentElements', 42);
    expect(windows).toBe(posix);
  });

  it('generates DIFFERENT UUIDs for genuinely different elements', () => {
    const a = registry.generateUUID('src/a.ts', 'fn', 1);
    const b = registry.generateUUID('src/b.ts', 'fn', 1);
    const c = registry.generateUUID('src/a.ts', 'fn', 2);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('UUIDs are deterministic across registry instances', () => {
    const other = new EntityRegistry();
    expect(registry.generateUUID('src/a.ts', 'fn', 1)).toBe(other.generateUUID('src/a.ts', 'fn', 1));
  });

  it('register() dedups mixed-spelling registrations onto one entity', () => {
    const first = registry.register({ file: 'src/x.ts', name: 'thing', line: 7, type: 'function' } as any);
    const second = registry.register({ file: 'src\\x.ts', name: 'thing', line: 7, type: 'function' } as any);
    expect(second).toBe(first);
    expect(registry.getState().stats.totalEntities).toBe(1);
    expect(registry.getState().stats.distinctFiles).toBe(1);
  });

  it('getEntitiesByFile() finds entities regardless of query spelling', () => {
    registry.register({ file: 'src\\y.ts', name: 'alpha', line: 1, type: 'function' } as any);
    registry.register({ file: 'src/y.ts', name: 'beta', line: 9, type: 'function' } as any);

    const viaPosix = registry.getEntitiesByFile('src/y.ts');
    const viaWindows = registry.getEntitiesByFile('src\\y.ts');
    expect(viaPosix.map(e => e.name).sort()).toEqual(['alpha', 'beta']);
    expect(viaWindows.map(e => e.name).sort()).toEqual(['alpha', 'beta']);
  });

  it('lookup() matches register() identity', () => {
    const uuid = registry.register({ file: 'src/z.ts', name: 'gamma', line: 3, type: 'function' } as any);
    expect(registry.lookup({ file: 'src\\z.ts', name: 'gamma', line: 3 })).toBe(uuid);
  });

  it('emits valid RFC4122 v5-shaped UUIDs', () => {
    const uuid = registry.generateUUID('src/a.ts', 'fn', 1);
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
