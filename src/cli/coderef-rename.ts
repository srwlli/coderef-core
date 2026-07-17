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
import { type EdgeConfidenceTier, EDGE_CONFIDENCE_TIERS } from '../pipeline/edge-confidence.js';
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
  --min-confidence   Keep only reference sites at/above a confidence tier
                     (exact|strong|heuristic|inferred). exact leaves only the
                     auto-apply-safe sites, dropping provisional single-candidate
                     references. Edge provenance, not a verdict. Default: no filter.
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
      'min-confidence': { type: 'string' },
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

  // --min-confidence: optional tier floor on the reference sites (Phase 3).
  let minConfidence: EdgeConfidenceTier | undefined;
  const rawMinConfidence = values['min-confidence'] as string | undefined;
  if (rawMinConfidence !== undefined) {
    if (!EDGE_CONFIDENCE_TIERS.includes(rawMinConfidence as EdgeConfidenceTier)) {
      console.error(
        `Error: --min-confidence must be one of ${EDGE_CONFIDENCE_TIERS.join('|')} (got "${rawMinConfidence}")`,
      );
      process.exit(1);
    }
    minConfidence = rawMinConfidence as EdgeConfidenceTier;
  }

  let plan;
  try {
    plan = planRename(projectDir, oldName, newName, minConfidence);
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

  // Confidence-tier tally over the (possibly filtered) sites (Phase 3):
  // provenance, not a verdict — 'exact' is auto-apply-safe, lower tiers warrant
  // review. Ordered exact>strong>heuristic>inferred.
  const byConfidence = new Map<EdgeConfidenceTier, number>();
  for (const s of plan.sites) byConfidence.set(s.confidence, (byConfidence.get(s.confidence) ?? 0) + 1);
  const tierParts = EDGE_CONFIDENCE_TIERS
    .filter(t => byConfidence.has(t))
    .map(t => `${t}=${byConfidence.get(t)}`);
  console.log(
    `\nconfidence${plan.minConfidence ? ` (min ${plan.minConfidence})` : ''}: ` +
      (tierParts.length > 0 ? tierParts.join(', ') : '(no sites)'),
  );

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
