#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-coderef-rename
 */

/**
 * coderef-rename — project-wide symbol rename over the canonical
 * `.coderef/graph.json`.
 *
 * Resolves <old> to its declaration + reference sites (planRename), then
 * rewrites word-boundary occurrences of <old> on each attributed line
 * (applyRename). The graph is line-grained (no column), so the applier
 * re-tokenizes each line and applies a SHADOW GUARD: a line with more
 * `\b old \b` tokens than the graph attributed is flagged ambiguous and left
 * unchanged unless --force-ambiguous.
 *
 * DRY RUN is the default: it prints target ids, per-file site counts, total
 * sites, and ambiguities, and writes NOTHING. --apply performs atomic writes
 * (write `<file>.tmp` then rename). Local only — no LLM, no network.
 */

import { parseArgs } from 'node:util';
import { CanonicalGraphError } from '../query/canonical-graph.js';
import { planRename } from '../refactor/rename-planner.js';
import { applyRename } from '../refactor/rename-applier.js';

function printHelp(): void {
  console.log(`
coderef-rename — rename a symbol project-wide over .coderef/graph.json

Usage:
  coderef-rename <old> <new> [--apply] [--force-ambiguous] [--project-dir <dir>]

Arguments:
  <old>              Symbol to rename (codeRefId, element name, or file path)
  <new>              New name

Options:
  --apply            Perform the rewrite (default: DRY RUN — writes nothing)
  --force-ambiguous  Rewrite lines flagged as shadow-ambiguous instead of skipping them
  --project-dir, -p  Project root containing .coderef/graph.json (default: cwd)
  --help             Print this help

The graph is produced by the populate pipeline. If .coderef/graph.json is
missing or stale, re-run populate first. Line granularity means the applier
re-tokenizes each attributed line; lines with more textual tokens than the
graph attributed are reported ambiguous and skipped unless --force-ambiguous.
`.trim());
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      apply:            { type: 'boolean', default: false },
      'force-ambiguous': { type: 'boolean', default: false },
      'project-dir':    { type: 'string' },
      p:                { type: 'string' },
      help:             { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) { printHelp(); process.exit(0); }

  const oldName = positionals[0];
  const newName = positionals[1];
  if (!oldName || !newName) {
    console.error('Error: both <old> and <new> are required');
    printHelp();
    process.exit(1);
  }

  const projectDir =
    (values['project-dir'] as string | undefined) ??
    (values.p as string | undefined) ??
    process.cwd();

  const apply = values.apply === true;
  const forceAmbiguous = values['force-ambiguous'] === true;

  let plan;
  try {
    plan = planRename(projectDir, oldName, newName);
  } catch (err) {
    if (err instanceof CanonicalGraphError) {
      console.error(`Rename error: ${err.message}`);
      process.exit(1);
    }
    console.error(`Rename error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
    return;
  }

  const result = applyRename(plan, { apply, forceAmbiguous });

  // Report header.
  console.log(`coderef-rename: ${oldName} -> ${newName}${apply ? '' : '  (DRY RUN)'}`);
  console.log(`project: ${projectDir}`);
  console.log(`target ids (${plan.targetIds.length}):`);
  for (const id of plan.targetIds.slice(0, 20)) console.log(`  ${id}`);
  if (plan.targetIds.length > 20) console.log(`  ... (+${plan.targetIds.length - 20} more)`);

  // Per-file summary.
  console.log(`\nfiles (${result.previews.length}):`);
  for (const p of result.previews) {
    console.log(`  ${p.file} — ${p.rewrites} rewrites, ${p.ambiguous.length} ambiguous`);
  }

  // Ambiguities detail.
  if (result.ambiguities > 0) {
    console.log(`\nambiguities (${result.ambiguities}):`);
    for (const p of result.previews) {
      for (const a of p.ambiguous) {
        console.log(`  ${p.file}:${a.line} — ${a.reason}`);
      }
    }
  }

  console.log(
    `\ntotal: ${result.totalRewrites} rewrites across ${result.previews.length} files, ` +
      `${result.ambiguities} ambiguous`,
  );

  if (apply) {
    console.log(`\napplied (${result.appliedFiles.length}):`);
    for (const f of result.appliedFiles) console.log(`  ${f}`);
    if (result.halted) {
      console.error(
        `\nHALTED at ${result.halted.file}: ${result.halted.error}\n` +
          `${result.appliedFiles.length} file(s) were already written (listed above) — ` +
          `review/revert them as needed.`,
      );
      process.exit(1);
    }
  } else {
    console.log('\n(dry run — no files written; pass --apply to write)');
  }
}

main().catch((err: unknown) => {
  console.error('coderef-rename error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
