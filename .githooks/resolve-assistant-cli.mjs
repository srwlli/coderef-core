#!/usr/bin/env node
/**
 * resolve-assistant-cli.mjs — shell entry point for the bootstrap.
 *
 * WO-REPO-SAFE-SHARED-PRECOMMIT-CHASSIS-001 P2-T3.
 *
 * Exists so the hook can invoke a FILE instead of `node -e '<script>'`. The
 * inline form has to build a file:// URL from a Windows path inside a
 * single-quoted sh string, which means backslash escaping that survives both
 * layers — it broke during authoring and the failure surfaced as a node syntax
 * error, not as anything resembling "could not find ASSISTANT". A file has
 * nothing to escape.
 *
 * Prints the resolved absolute path on stdout, the reason on stderr. Exit 1
 * means unresolved; the hook treats that as a LOUD SKIP, not a refusal — a
 * missing sibling checkout is an environment gap, and blocking every commit on
 * a machine that has not cloned ASSISTANT would punish the wrong thing.
 */

import { main } from "./_resolve-assistant.mjs";

const fromRepoRoot = process.argv[2] || process.cwd();

try {
  await main(fromRepoRoot);
} catch (e) {
  process.stderr.write(String((e && e.message) || e) + "\n");
  process.exit(1);
}
