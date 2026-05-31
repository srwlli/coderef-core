#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability stamp-on-write-header-enforcement
 */

/**
 * Stamp-on-write header enforcement (WO-RAG-HEADER-COVERAGE-ENFORCE-AND-
 * SURFACE-001, P3 / option A).
 *
 * Pre-commit-hook backend: given a list of source files, fail if any lacks a
 * canonical `@coderef-semantic` header. This is the per-file PREVENTION layer
 * — it stops a header-less file from being committed in the first place, so
 * the rag-index coverage floor (P1) and the populate --enforce-headers gate
 * become the backstop rather than the only line of defense.
 *
 * Bypass note: a pre-commit hook is bypassable (`git commit --no-verify`) and
 * misses non-commit paths (generated files, external contributors). That gap
 * is intentional and covered by the P1 rag-index floor, which catches a
 * header-less file regardless of HOW it landed. Layered prevention + a gate
 * backstop, per the WO analysis (RISK-02).
 *
 * The core check is a pure function (checkFilesForHeaders) so it is unit-
 * testable without git or a filesystem; the CLI wrapper at the bottom wires
 * it to argv + fs for hook use.
 */

import { readFileSync } from 'node:fs';

/**
 * Canonical @coderef-semantic header detector. Mirrors
 * HeaderGenerator.hasSemanticHeader (src/semantic/header-generator.ts:407)
 * — match `@coderef-semantic: <digit>` (space before version) in either a
 * block (` * @coderef-semantic: 1`) or line (`// @coderef-semantic: 1`)
 * comment. The space requirement excludes string-literal mentions like
 * `@coderef-semantic:1.0.0` that appear in test fixtures.
 *
 * @param {string} content
 * @returns {boolean}
 */
export function hasSemanticHeader(content) {
  return (
    /^\s*\*\s*@coderef-semantic:\s+\d/m.test(content) ||
    /^\/\/\s*@coderef-semantic:\s+\d/m.test(content)
  );
}

/**
 * Should a path be checked for a header? Source files only — skip declaration
 * files, tests, and non-source extensions. Conservative: when unsure, skip
 * (the gate backstop still catches anything that slips through).
 *
 * @param {string} file
 * @returns {boolean}
 */
export function isEnforceableSourceFile(file) {
  const f = file.replace(/\\/g, '/');
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) return false;
  if (f.endsWith('.d.ts')) return false;
  if (/(^|\/)(__tests__|node_modules|dist)\//.test(f)) return false;
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(f)) return false;
  return true;
}

/**
 * Pure check: returns the subset of `files` that are enforceable source files
 * lacking a header. `readFn(file) -> string` is injected so this is testable
 * without touching disk.
 *
 * @param {string[]} files
 * @param {(file: string) => string} readFn
 * @returns {{ checked: string[], missing: string[] }}
 */
export function checkFilesForHeaders(files, readFn) {
  const checked = [];
  const missing = [];
  for (const file of files) {
    if (!isEnforceableSourceFile(file)) continue;
    checked.push(file);
    let content = '';
    try {
      content = readFn(file);
    } catch {
      // Unreadable (deleted/renamed in the same commit) — skip, not a miss.
      continue;
    }
    if (!hasSemanticHeader(content)) missing.push(file);
  }
  return { checked, missing };
}

// ---- CLI wrapper (pre-commit hook entry) --------------------------------
// Usage: node scripts/check-header-coverage.mjs <file> [<file> ...]
// Exit 0 when every enforceable file has a header; exit 1 listing the misses.
// Typical hook line:
//   git diff --cached --name-only --diff-filter=ACM | xargs node scripts/check-header-coverage.mjs
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') ?? '');

if (isMain) {
  const files = process.argv.slice(2);
  const { checked, missing } = checkFilesForHeaders(files, (f) =>
    readFileSync(f, 'utf-8'),
  );
  if (missing.length > 0) {
    console.error(
      `[check-header-coverage] ${missing.length} of ${checked.length} ` +
        `source file(s) are missing a @coderef-semantic header:`,
    );
    for (const f of missing) console.error(`  - ${f}`);
    console.error(
      `Stamp them with: npx populate-coderef . --source-headers ` +
        `(or commit with --no-verify to bypass; the rag-index coverage floor ` +
        `is the backstop).`,
    );
    process.exit(1);
  }
  if (checked.length > 0) {
    console.log(
      `[check-header-coverage] OK — ${checked.length} source file(s) carry a header.`,
    );
  }
  process.exit(0);
}
