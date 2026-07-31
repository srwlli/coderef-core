/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-bin-alias-deprecation
 * @exports BinAlias, invokedBinName, warnIfLegacyBinName
 * @used_by src/cli/validate-routes.ts, src/cli/scan-frontend-calls.ts
 */

/**
 * Legacy-bin-name deprecation notice.
 *
 * WO-API-SURFACE-MAPPING-RECONNECT-AND-GRAPH-ELEVATION-001 Phase 4, operator
 * ruling DR-007 option (A): rename-with-aliases. Both keys stay in package.json
 * pointing at the SAME dist entry for one minor version; invoking through the
 * old name still works and prints a deprecation notice.
 *
 * THERE IS NO ALIAS PRECEDENT IN THIS PACKAGE (RISK-010) — this module
 * establishes the mechanism rather than following one, so it is deliberately the
 * simplest thing that works: two bin keys -> one dist entry, and a warning keyed
 * off `process.argv[1]`'s basename. No shim file, no wrapper process, no
 * indirection that a future reader has to unwind.
 *
 * Why argv[1] and not an env var or an extra flag: npm/npx writes one shim per
 * bin KEY, and each shim invokes the same script with argv[1] set to its own
 * path. That basename is therefore the only signal that records WHICH name the
 * caller actually typed, and it costs nothing to read.
 *
 * The notice goes to STDERR, never stdout. Both of these bins can be asked for
 * machine-readable output on stdout, and a deprecation line mixed into a JSON
 * report would break the consumer this warning is meant to help.
 *
 * SCOPE: `populate-coderef` is deliberately NOT renamed. It is the most-invoked
 * bin in the fleet and its rename is a separate blast radius this workorder does
 * not absorb (DR-007 out_of_scope).
 */

import * as path from 'path';

export interface BinAlias {
  /** The deprecated bin name, as it appears in package.json today. */
  legacy: string;
  /** The canonical replacement. */
  canonical: string;
}

/**
 * The bin name the caller actually typed, derived from the npm/npx shim path.
 *
 * Returns undefined when argv[1] is absent (embedded/`node -e` execution), which
 * callers must treat as "unknown", never as "the legacy name".
 */
export function invokedBinName(argv: readonly string[] = process.argv): string | undefined {
  const entry = argv[1];
  if (typeof entry !== 'string' || entry.length === 0) return undefined;
  return path.basename(entry).replace(/\.(js|cjs|mjs|ts|cmd|ps1|exe)$/i, '');
}

/**
 * Print a one-line deprecation notice to stderr when this process was invoked
 * through `alias.legacy`. Returns true when the notice fired, so a caller (or a
 * test) can assert on it.
 *
 * Silent — and returns false — for the canonical bin name and for an absent
 * argv[1] (embedded / `node -e` execution), which is treated as UNKNOWN, never
 * as the legacy name.
 *
 * KNOWN AND ACCEPTED: it also fires for a direct `node dist/src/cli/<legacy>.js`
 * run. The dist ENTRY FILE keeps its original name — only the package.json bin
 * KEY was added — so a basename check genuinely cannot tell a legacy-shim
 * invocation from a direct script run. Distinguishing them would mean renaming
 * the dist entry and updating every internal reference to it, which is a much
 * larger change than the notice is worth. Running an internal dist path directly
 * is not a supported public invocation, and a spurious line on stderr there
 * costs nothing.
 */
export function warnIfLegacyBinName(
  alias: BinAlias,
  argv: readonly string[] = process.argv,
  write: (message: string) => void = message => process.stderr.write(message),
): boolean {
  if (invokedBinName(argv) !== alias.legacy) return false;
  write(
    `[deprecated] "${alias.legacy}" is deprecated and will be removed in the next minor ` +
    `version. Use "${alias.canonical}" instead — same binary, same flags, ` +
    `coderef-namespaced name.\n`,
  );
  return true;
}

export default warnIfLegacyBinName;
