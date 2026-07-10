#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-coderef-pack
 */

/**
 * coderef-pack — pack a focus element and its dependency closure into a single
 * token-budgeted context bundle over the canonical `.coderef/graph.json`.
 *
 * Resolves <focus> on the graph, reads its source window UNCOMPRESSED as the
 * first block, then walks its transitive outbound dependencies (closest-first)
 * compressing each with the structure-preserving primitive and admitting them
 * while a running token total stays under budget (src/context/context-packer.ts).
 *
 * STDOUT carries the bundle only (so it can be piped); the manifest summary
 * (included/dropped counts, est tokens vs budget, compression ratio, dropped
 * ids) goes to STDERR — mirroring the populate/mcp stdout-discipline
 * convention. Read-only, local only — no LLM, no network.
 */

import { parseArgs } from 'node:util';
import { CanonicalGraphError } from '../query/canonical-graph.js';
import { packContext } from '../context/context-packer.js';

function printHelp(): void {
  console.log(`
coderef-pack — pack a focus element + its dependency closure into a token-budgeted bundle

Usage:
  coderef-pack <focus> [--token-budget N] [--project-dir <dir>]

Arguments:
  <focus>              Focus element (codeRefId, element name, or file path)

Options:
  --token-budget N     Token budget for the bundle (default: 8000)
  --full-deps          Include dependency bodies uncompressed (default: deps are
                       compressed to their signature skeleton)
  --project-dir, -p    Project root containing .coderef/graph.json (default: cwd)
  --help               Print this help

STDOUT is the bundle (pipeable); the manifest summary is written to STDERR.
The graph is produced by the populate pipeline. If .coderef/graph.json is
missing or stale, re-run populate first.
`.trim());
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: {
      'token-budget': { type: 'string' },
      'full-deps':    { type: 'boolean', default: false },
      'project-dir':  { type: 'string' },
      p:              { type: 'string' },
      help:           { type: 'boolean', default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help) { printHelp(); process.exit(0); }

  const focus = positionals[0];
  if (!focus) {
    console.error('Error: <focus> is required');
    printHelp();
    process.exit(1);
  }

  const projectDir =
    (values['project-dir'] as string | undefined) ??
    (values.p as string | undefined) ??
    process.cwd();

  let tokenBudget = 8000;
  const rawBudget = values['token-budget'] as string | undefined;
  if (typeof rawBudget === 'string' && rawBudget.length > 0) {
    const parsed = parseInt(rawBudget, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      console.error(`Error: --token-budget must be a positive integer (got "${rawBudget}")`);
      process.exit(1);
    }
    tokenBudget = parsed;
  }

  let result;
  try {
    result = packContext(projectDir, focus, {
      tokenBudget,
      compressDeps: values['full-deps'] ? false : true,
    });
  } catch (err) {
    if (err instanceof CanonicalGraphError) {
      console.error(`Pack error: ${err.message}`);
      process.exit(1);
    }
    console.error(`Pack error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
    return;
  }

  const { bundle, manifest } = result;

  // STDOUT: the bundle only (pipeable).
  console.log(bundle);

  // STDERR: the manifest summary (diagnostics).
  console.error(`coderef-pack: ${manifest.focus}`);
  console.error(`project: ${projectDir}`);
  console.error(
    `included: ${manifest.included.length}  dropped: ${manifest.dropped.length}  ` +
      `est tokens: ${manifest.estTokens}/${manifest.budget}  ` +
      `compression ratio: ${manifest.compressionRatio.toFixed(3)}`,
  );
  if (manifest.dropped.length > 0) {
    console.error(`dropped ids (${manifest.dropped.length}):`);
    for (const d of manifest.dropped) console.error(`  ${d.id} (~${d.estTokens} tok)`);
  }
}

main().catch((err: unknown) => {
  console.error('coderef-pack error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
