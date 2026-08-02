/**
 * _resolve-assistant.mjs — the BOOTSTRAP half of CORE's hook resolution.
 *
 * WO-REPO-SAFE-SHARED-PRECOMMIT-CHASSIS-001 P2-T3.
 *
 * THE CHICKEN-AND-EGG THIS SOLVES. The authoritative resolver lives in ASSISTANT
 * (SKILLS/WORKFLOW/_shared/resolve-assistant-root.mjs), so it cannot be imported
 * until ASSISTANT has been found. Something in CORE has to take the first step.
 *
 * SO THIS FILE IS DELIBERATELY THE SMALLEST POSSIBLE STEP. It looks for a
 * directory that merely CONTAINS the real resolver, then imports it and lets
 * THAT module make the actual ruling. The authoritative marker list stays in
 * exactly one place; duplicating it here would create two definitions of "is
 * this the ASSISTANT repo" that drift apart silently — the same class of defect
 * the parent WO exists to close.
 *
 * The probe below is intentionally NOT a verification. Finding this one file
 * proves nothing about whether the checkout is complete or current; that
 * judgement belongs to resolveAssistantRoot(), which checks three markers
 * spanning three parts of the repo and refuses a near-miss by name.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// The one file we need in order to hand off. Not a completeness check.
const HANDOFF = path.join("SKILLS", "WORKFLOW", "_shared", "resolve-assistant-root.mjs");

function candidates(fromRepoRoot) {
  const out = [];
  const env = process.env.CODEREF_ASSISTANT_ROOT;
  if (env) out.push(path.resolve(env));
  const start = path.resolve(fromRepoRoot);
  out.push(path.resolve(start, "..", "ASSISTANT"));
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
    out.push(path.join(dir, "ASSISTANT"));
  }
  return out;
}

export async function main(fromRepoRoot) {
  const tried = [];
  for (const c of candidates(fromRepoRoot)) {
    tried.push(c);
    const handoff = path.join(c, HANDOFF);
    if (!fs.existsSync(handoff)) continue;

    // Hand off. resolveAssistantRoot() re-derives the answer under its own
    // marker rules and THROWS on a near-miss — so a stale or half-copied tree
    // is refused there, with a message naming what is absent, rather than being
    // waved through here because one file happened to exist.
    const mod = await import(pathToFileURL(handoff).href);
    const resolved = mod.resolveAssistantRoot(fromRepoRoot);
    process.stdout.write(resolved);
    return resolved;
  }

  throw new Error(
    `no ASSISTANT checkout carrying ${HANDOFF} was found. Looked in:\n` +
    tried.map((t) => `  ${t}`).join("\n") +
    `\nSet CODEREF_ASSISTANT_ROOT=<abs path> if it lives outside the expected layout.`
  );
}
