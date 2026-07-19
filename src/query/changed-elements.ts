/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability diff-changed-elements
 * @exports ChangedElement, ChangedElementsResult, parseDiffToChangedElements
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * changed-elements — the shared "git diff -> changed index elements" front half
 * (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 1).
 *
 * diff_impact (MCP) and tests_for_change (MCP + the coderef-analyze CLI mirror)
 * both need the SAME first step: take a unified `git diff -U0` and attribute
 * each changed line-range to its enclosing index element. This module is that
 * step, extracted so the two entry points cannot drift on how a diff becomes a
 * set of changed elements.
 *
 * PURE. It does NO git and NO file I/O — the caller runs `git diff` (each entry
 * point already owns a spawn) and passes the raw diff text in. This function
 * only parses + attributes, so it is deterministic and unit-testable without a
 * repo.
 */

/** Minimal element shape this module needs (a subset of the index element). */
export interface ChangedElement {
  file?: string;
  line?: number;
  codeRefId?: string;
  name?: string;
  type?: string;
}

export interface ChangedElementsResult {
  /** codeRefId -> element, for every element a changed range fell inside. */
  changedElements: Map<string, ChangedElement>;
  /** How many distinct files the diff touched (new-side). */
  changedFileCount: number;
}

/** Normalize path separators to forward slashes for cross-platform matching. */
function normSlashes(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Parse a unified `git diff -U0 --no-color` and attribute each new-side hunk
 * range to its enclosing element. Per file, an element owns
 * `[its line, next element's line)` — the closest preceding element.
 *
 * @param diffText  stdout of `git diff -U0 --no-color [ref] --`
 * @param elements  the index elements (index.json `elements[]`)
 */
export function parseDiffToChangedElements(
  diffText: string,
  elements: ChangedElement[],
): ChangedElementsResult {
  // Parse +++ b/<file> and @@ -a,b +c,d @@ new-side ranges.
  const changedRanges = new Map<string, Array<[number, number]>>();
  let currentFile: string | null = null;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ ')) {
      const f = line.slice(4).trim();
      currentFile = f === '/dev/null' ? null : normSlashes(f.replace(/^b\//, ''));
      continue;
    }
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (m && currentFile) {
      const start = parseInt(m[1], 10);
      const count = m[2] !== undefined ? parseInt(m[2], 10) : 1;
      const list = changedRanges.get(currentFile) ?? [];
      list.push([start, start + Math.max(count, 1) - 1]);
      changedRanges.set(currentFile, list);
    }
  }

  // Map changed ranges to enclosing elements.
  const byFile = new Map<string, ChangedElement[]>();
  for (const e of elements) {
    const f = normSlashes(e.file ?? '');
    const list = byFile.get(f);
    if (list) list.push(e);
    else byFile.set(f, [e]);
  }
  for (const list of byFile.values()) list.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));

  const changedElements = new Map<string, ChangedElement>();
  for (const [file, ranges] of changedRanges) {
    const els = byFile.get(file);
    if (!els) continue;
    for (const [lo, hi] of ranges) {
      for (let i = 0; i < els.length; i++) {
        const start = els[i].line ?? 0;
        const end = i + 1 < els.length ? (els[i + 1].line ?? Infinity) - 1 : Infinity;
        if (start <= hi && end >= lo && els[i].codeRefId) {
          changedElements.set(els[i].codeRefId!, els[i]);
        }
      }
    }
  }

  return { changedElements, changedFileCount: changedRanges.size };
}
