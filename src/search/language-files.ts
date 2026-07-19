/**
 * @fileoverview Bounded on-disk language-file enumeration for ast_search's
 * not-searched visibility (REC-002, WO-...-GENRE-FEATURES-PROGRAM-001 P3
 * remediation).
 *
 * @imports node:fs, node:path
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * This is the ONE impure edge that walks the project tree to count how many
 * files of a given extension exist on disk. ast_search's file set is derived
 * from index.json elements, so a source file with ZERO indexed elements is
 * never enumerated and is silently not searched. Comparing this on-disk list
 * against the indexed set lets the edges surface `files_skipped_no_index` —
 * making "zero matches" distinguishable from "this file was never searched".
 *
 * The walk is deliberately minimal + best-effort: it never throws, and it skips
 * the standard heavy/irrelevant directories so the count reflects real source
 * files, not vendored or build output. It is NOT a re-scan — no parsing, just a
 * directory traversal returning paths.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Directory names skipped during the walk. Mirrors the intent of the scanner's
 * DEFAULT_EXCLUDE_PATTERNS (kept as a local literal to avoid coupling the search
 * edge to the scanner's glob-shaped export). A file under any of these is not a
 * candidate source file for the not-searched count.
 */
const SKIP_DIRS = new Set<string>([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.turbo',
  'vendor',
  'target', // rust/java build output
  '__pycache__',
  '.venv',
  'venv',
  '.coderef',
]);

/** Max directory entries visited before the walk bails out (runaway guard). */
const MAX_ENTRIES = 200_000;

/**
 * Recursively list files under `rootDir` whose extension (without the dot)
 * equals `wantExt` (case-insensitive), skipping SKIP_DIRS. Returns paths in the
 * SAME form the caller will compare against index paths: relative to `rootDir`
 * with forward slashes (matching how index.json records `file`). Best-effort:
 * unreadable directories are skipped silently; never throws.
 *
 * @param rootDir Absolute project root to walk.
 * @param wantExt Extension to match, WITHOUT the leading dot (e.g. "ts", "cc").
 */
export function listLanguageFilesOnDisk(rootDir: string, wantExt: string): string[] {
  const want = wantExt.toLowerCase();
  const out: string[] = [];
  let budget = MAX_ENTRIES;

  const walk = (absDir: string): void => {
    if (budget <= 0) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return; // unreadable dir contributes nothing
    }
    for (const entry of entries) {
      if (budget-- <= 0) return;
      const abs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(abs);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (ext === want) {
          // Normalize to index.json's path form: relative + forward slashes.
          const rel = path.relative(rootDir, abs).split(path.sep).join('/');
          out.push(rel);
        }
      }
    }
  };

  walk(rootDir);
  return out;
}
