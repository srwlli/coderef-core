/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability rename-applier
 * @exports FilePreview, ApplyResult, writeTextAtomic, applyRename
 */

/**
 * rename-applier — turn a RenamePlan into per-file text rewrites.
 *
 * The canonical graph attributes reference sites at LINE granularity only (no
 * column — src/export/graph-exporter.ts:92). This applier therefore
 * re-tokenizes each affected line with a word-boundary regex
 * (`\b oldName \b`) and rewrites the word-boundary matches on that line.
 *
 * SHADOW GUARD (load-bearing): if a line's text contains MORE `\b oldName \b`
 * tokens than the graph attributed sites to that exact (file, line), the extra
 * token is a shadow/property/unrelated binding the graph did not point at —
 * rewriting it could corrupt an unrelated symbol. Such a line is flagged
 * AMBIGUOUS and left UNCHANGED (unless opts.forceAmbiguous). When matches <=
 * attributed sites, all word-boundary matches on the line are rewritten.
 *
 * Writes are atomic: writeTextAtomic mirrors coderef-watch.ts:245's
 * writeJsonAtomic (write `<target>.tmp`, then fs.renameSync — atomic on
 * Windows same-volume). Dry-run (apply=false) writes NOTHING and instead
 * returns oldText/newText per file for diffing.
 */

import * as fs from 'fs';
import type { RenamePlan, RenameSite } from './rename-planner.js';

export interface FilePreview {
  file: string;
  rewrites: number;
  ambiguous: Array<{ line: number; reason: string }>;
  newText?: string;
  oldText?: string;
}

export interface ApplyResult {
  previews: FilePreview[];
  totalRewrites: number;
  ambiguities: number;
  appliedFiles: string[];
  halted?: { file: string; error: string };
}

/** Escape a string for literal use inside a RegExp. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Atomic text write: write `<target>.tmp` (utf-8), then fs.renameSync onto the
 * target. Mirrors writeJsonAtomic in src/cli/coderef-watch.ts:245.
 */
export function writeTextAtomic(targetPath: string, text: string): void {
  const tmp = targetPath + '.tmp';
  fs.writeFileSync(tmp, text, { encoding: 'utf-8' });
  fs.renameSync(tmp, targetPath);
}

/**
 * Apply (or dry-run) a RenamePlan. Groups plan.sites by file, rewrites
 * word-boundary occurrences of oldName on each attributed line subject to the
 * shadow guard, and — when opts.apply — writes each changed file atomically.
 *
 * If a write throws, `halted` is set and processing stops immediately;
 * already-applied files remain in appliedFiles so the caller can report/revert.
 */
export function applyRename(
  plan: RenamePlan,
  opts: { apply: boolean; forceAmbiguous?: boolean },
): ApplyResult {
  const { oldName, newName } = plan;
  const force = opts.forceAmbiguous === true;

  // Group sites by file, and within a file count how many sites the graph
  // attributed to each 1-based line number.
  const byFile = new Map<string, Map<number, number>>();
  const fileOrder: string[] = [];
  for (const site of plan.sites as RenameSite[]) {
    let lines = byFile.get(site.file);
    if (!lines) {
      lines = new Map<number, number>();
      byFile.set(site.file, lines);
      fileOrder.push(site.file);
    }
    lines.set(site.line, (lines.get(site.line) ?? 0) + 1);
  }

  const previews: FilePreview[] = [];
  const appliedFiles: string[] = [];
  let totalRewrites = 0;
  let totalAmbiguities = 0;
  let halted: ApplyResult['halted'];

  for (const file of fileOrder) {
    const attributed = byFile.get(file)!;
    const preview: FilePreview = { file, rewrites: 0, ambiguous: [] };

    let oldText: string;
    try {
      oldText = fs.readFileSync(file, { encoding: 'utf-8' });
    } catch (err) {
      // A site pointing at an unreadable file is surfaced as ambiguous rather
      // than crashing the whole run; nothing is rewritten for it.
      preview.ambiguous.push({
        line: 0,
        reason: `unreadable: ${err instanceof Error ? err.message : String(err)}`,
      });
      totalAmbiguities += 1;
      previews.push(preview);
      continue;
    }

    const usesCrlf = oldText.includes('\r\n');
    const eol = usesCrlf ? '\r\n' : '\n';
    const lines = oldText.split(/\r?\n/);

    let fileRewrites = 0;
    const wordRe = new RegExp('\\b' + escapeRegExp(oldName) + '\\b', 'g');

    for (const [lineNo, attributedCount] of attributed) {
      const idx = lineNo - 1;
      if (idx < 0 || idx >= lines.length) {
        // Stale/out-of-range attribution: flag rather than silently drop.
        preview.ambiguous.push({ line: lineNo, reason: 'line out of range for current file' });
        totalAmbiguities += 1;
        continue;
      }
      const original = lines[idx];
      wordRe.lastIndex = 0;
      const matchCount = (original.match(wordRe) ?? []).length;
      if (matchCount === 0) {
        // Token no longer present on the attributed line (stale/edited file).
        preview.ambiguous.push({ line: lineNo, reason: `no "${oldName}" token on attributed line` });
        totalAmbiguities += 1;
        continue;
      }
      if (matchCount > attributedCount && !force) {
        // SHADOW GUARD: more textual tokens than the graph pointed at — skip.
        preview.ambiguous.push({
          line: lineNo,
          reason: `${matchCount} "${oldName}" tokens on line but graph attributed ${attributedCount} — possible shadow; skipped (use --force-ambiguous to rewrite)`,
        });
        totalAmbiguities += 1;
        continue;
      }
      // Rewrite ALL word-boundary matches on the line.
      wordRe.lastIndex = 0;
      lines[idx] = original.replace(wordRe, newName);
      fileRewrites += matchCount;
      if (matchCount > attributedCount && force) {
        // Forced through an ambiguous line — still record it for visibility.
        preview.ambiguous.push({
          line: lineNo,
          reason: `${matchCount} tokens vs ${attributedCount} attributed — forced`,
        });
        totalAmbiguities += 1;
      }
    }

    preview.rewrites = fileRewrites;
    totalRewrites += fileRewrites;

    if (fileRewrites === 0) {
      // Nothing changed in this file; still surface it (with any ambiguities).
      if (!opts.apply) {
        preview.oldText = oldText;
        preview.newText = oldText;
      }
      previews.push(preview);
      continue;
    }

    const newText = lines.join(eol);

    if (opts.apply) {
      try {
        writeTextAtomic(file, newText);
        appliedFiles.push(file);
      } catch (err) {
        halted = { file, error: err instanceof Error ? err.message : String(err) };
        previews.push(preview);
        return { previews, totalRewrites, ambiguities: totalAmbiguities, appliedFiles, halted };
      }
    } else {
      preview.oldText = oldText;
      preview.newText = newText;
    }

    previews.push(preview);
  }

  return { previews, totalRewrites, ambiguities: totalAmbiguities, appliedFiles, halted };
}
