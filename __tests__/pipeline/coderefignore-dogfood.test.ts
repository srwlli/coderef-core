/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability coderefignore-dogfood-tests
 */

/**
 * Dogfood self-check (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 P5,
 * STUB-ZNG5YK): coderef-core ships scan-scope noise exclusions in its OWN
 * .coderefignore. This suite pins the committed file itself — a future edit
 * that adds a bare top-level source-dir name (the buildCandidates basename
 * trap: a bare "utils/" pattern matches the basename of EVERY walked entry at
 * ANY depth, silently dropping src/utils/) fails HERE (vitest), not as a
 * mysteriously shrunken index three scans later.
 *
 * The root-unique filename patterns (demo-all-modules.ts, create_wo.py) are
 * machine-verified against the live tree: if a nested twin ever appears, the
 * suite fails and the pattern must become path-qualified.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { loadIgnorePatterns, shouldIgnorePath } from '../../src/pipeline/ignore-rules.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const IGNORE_FILE = path.join(REPO_ROOT, '.coderefignore');

/** The P5 scan-scope exclusion block, exactly as shipped. */
const P5_PATTERNS = [
  'coderef/DEAD-LETTER/',
  'scripts/doc-gen/',
  'scripts/setup-coderef-dir/',
  'scripts/generate-intelligence.js',
  'assets/map-viewer/',
  'utils/fs.ts',
  'utils/fs.js',
  'examples/nextjs-api-route.ts',
  'demo-all-modules.ts',
  'create_wo.py',
  'tools/coderef_ui.py',
];

/**
 * Single-segment filename patterns allowed ONLY because they are verified
 * unique to the repo root (bare-name matching is then harmless). Verified
 * live by the nested-twin walk below.
 */
const ROOT_UNIQUE_ALLOWLIST = ['demo-all-modules.ts', 'create_wo.py'];

/**
 * Top-level SOURCE dir names that must never appear as a bare ignore pattern —
 * the basename trap would drop same-named dirs at any depth (src/utils/ etc.).
 * Build-artifact bare names (dist/, coverage/, node_modules/) stay legitimate:
 * dropping those at any depth is the intent.
 */
const PROTECTED_BARE_NAMES = new Set(
  ['src', 'scripts', 'utils', 'tools', 'examples', 'assets', 'docs', 'coderef', '__tests__'].flatMap(
    (n) => [n, `${n}/`]
  )
);

function fileLines(): string[] {
  // Mirror normalizePattern semantics: trim, drop empties and #-comment lines.
  return fs
    .readFileSync(IGNORE_FILE, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

function isPathQualified(pattern: string): boolean {
  return pattern.replace(/\/+$/, '').includes('/');
}

/** Walk the working tree (skipping build/vendor dirs) collecting basename hits. */
function collectBasenameHits(names: Set<string>): string[] {
  const SKIP_DIRS = new Set([
    'node_modules', '.git', 'dist', 'build', 'coverage', 'out', 'temp', 'tmp',
    '.coderef', '.nyc_output', '.cache',
  ]);
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (names.has(entry.name)) {
        hits.push(path.relative(REPO_ROOT, path.join(dir, entry.name)).split(path.sep).join('/'));
      }
    }
  };
  walk(REPO_ROOT);
  return hits;
}

function ignores(relPath: string, isDirectory: boolean, patterns: string[]): boolean {
  const abs = path.join(REPO_ROOT, relPath);
  return shouldIgnorePath(REPO_ROOT, abs, path.basename(abs), isDirectory, patterns);
}

describe('coderefignore dogfood — the committed .coderefignore scan-scope block', () => {
  it('exists and loadIgnorePatterns surfaces every P5 exclusion pattern', async () => {
    expect(fs.existsSync(IGNORE_FILE)).toBe(true);
    const patterns = await loadIgnorePatterns(REPO_ROOT, undefined, undefined);
    for (const p of P5_PATTERNS) {
      expect(patterns, `P5 pattern missing from parsed .coderefignore: "${p}"`).toContain(p);
    }
  });

  it('every P5 pattern is path-qualified or an allowlisted root-unique filename', () => {
    for (const p of P5_PATTERNS) {
      const ok = isPathQualified(p) || ROOT_UNIQUE_ALLOWLIST.includes(p);
      expect(ok, `pattern "${p}" is neither path-qualified nor allowlisted root-unique`).toBe(true);
    }
  });

  it('bare-name guard: no pattern in the file equals a protected top-level source dir name', () => {
    for (const line of fileLines()) {
      expect(
        PROTECTED_BARE_NAMES.has(line),
        `bare source-dir pattern "${line}" would drop same-named dirs at ANY depth (e.g. src/utils/)`
      ).toBe(false);
    }
  });

  it('root-unique filenames really are root-unique (nested-twin walk)', () => {
    // The guard's invariant is "no NESTED twin may shadow a root-unique
    // pattern" — zero copies is a safe state (P7 deleted the root
    // demo-all-modules.ts; its pattern stays as a re-introduction guard).
    const hits = collectBasenameHits(new Set(ROOT_UNIQUE_ALLOWLIST));
    for (const name of ROOT_UNIQUE_ALLOWLIST) {
      const nested = hits.filter((h) => h.endsWith(`/${name}`));
      expect(nested, `nested twin(s) of root-unique pattern ${name}: ${nested.join(', ')}`).toEqual([]);
      const rootCopies = hits.filter((h) => h === name);
      expect(rootCopies.length, `duplicate root hits for ${name}`).toBeLessThanOrEqual(1);
    }
  });

  it('the trap is real (mechanism pin): a bare "utils/" pattern WOULD drop src/utils', () => {
    // Documents WHY the guard exists. If candidate-building ever stops
    // basename-matching at depth, this pin flags that the rule needs re-review.
    expect(ignores('src/utils', true, ['utils/'])).toBe(true);
  });

  it('keeps protected source paths IN scope under the shipped patterns', async () => {
    const patterns = await loadIgnorePatterns(REPO_ROOT, undefined, undefined);
    expect(ignores('src/utils', true, patterns)).toBe(false);
    expect(ignores('src/utils/path-normalize.ts', false, patterns)).toBe(false);
    expect(ignores('src/context/example-extractor.ts', false, patterns)).toBe(false);
    expect(ignores('src/cli/mcp/shared.ts', false, patterns)).toBe(false);
    // scripts/ is NOT blanket-dropped — only the named tooling subpaths are.
    expect(ignores('scripts/scan-cli/test_scan_cli.test.ts', false, patterns)).toBe(false);
  });

  it('excludes the censused noise paths under the shipped patterns', async () => {
    const patterns = await loadIgnorePatterns(REPO_ROOT, undefined, undefined);
    expect(ignores('coderef/DEAD-LETTER', true, patterns)).toBe(true);
    // Dir patterns exclude by WALK-TIME PRUNING: the matched directory entry is
    // skipped (orchestrator.ts walker `continue`s), so files inside are never
    // candidates at all. Asserting on the dir entry IS the exclusion contract —
    // shouldIgnorePath('scripts/doc-gen/utils.js') alone would return false.
    expect(ignores('scripts/doc-gen', true, patterns)).toBe(true);
    expect(ignores('scripts/setup-coderef-dir', true, patterns)).toBe(true);
    expect(ignores('scripts/generate-intelligence.js', false, patterns)).toBe(true);
    expect(ignores('assets/map-viewer', true, patterns)).toBe(true);
    expect(ignores('utils/fs.ts', false, patterns)).toBe(true);
    expect(ignores('utils/fs.js', false, patterns)).toBe(true);
    expect(ignores('examples/nextjs-api-route.ts', false, patterns)).toBe(true);
    expect(ignores('demo-all-modules.ts', false, patterns)).toBe(true);
    expect(ignores('create_wo.py', false, patterns)).toBe(true);
    expect(ignores('tools/coderef_ui.py', false, patterns)).toBe(true);
  });

  it('default .coderef/ pattern keeps any stray .coderef dir scanner-invisible (incl. nested)', async () => {
    const patterns = await loadIgnorePatterns(REPO_ROOT, undefined, undefined);
    expect(ignores('.coderef', true, patterns)).toBe(true);
    // The P5-T3 stray: a re-materialized src/.coderef stays out of the universe.
    expect(ignores('src/.coderef', true, patterns)).toBe(true);
  });
});
