/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability shared-cli-flag-parsing
 * @constraint no process.exit inside parseFlags (pure); failUsage is the only exit point
 * @exports FlagKind, FlagSpec, ParsedFlags, parseFlags, failUsage
 * @used_by src/cli/rag-search.ts, src/cli/rag-index.ts, src/cli/rag-eval.ts, src/cli/rag-status.ts
 * @generated 2026-07-02T00:00:00Z
 */

/**
 * Shared CLI flag parsing — WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3
 * (P2-18). The RAG-family CLIs each carried a copy-pasted hand-rolled parser
 * where only SOME flags understood `--flag=value`: the rest matched the key
 * but read the NEXT token as the value, silently swallowing an unrelated
 * argument (`--top-k=5 --json` parsed topK=NaN and ate `--json`). Numeric
 * flags were also parseInt'd without NaN checks.
 *
 * Contract:
 * - `--flag=value` and `--flag value` are BOTH accepted for every value flag.
 * - Aliases (`-k`) behave identically to their canonical flag.
 * - `int`/`float` flags reject non-numeric values into `errors` (no NaN
 *   escapes into program state).
 * - Unknown `--flags` collect into `errors` — a typo'd flag is an error, not
 *   a silently-ignored token.
 * - Tokens not starting with `-` collect into `positionals`.
 * - parseFlags never exits; callers decide (failUsage prints to stderr and
 *   exits 1 — the shared exit-code contract).
 */

export type FlagKind = 'string' | 'int' | 'float' | 'boolean';

export interface FlagSpec {
  kind: FlagKind;
  /** Short/long aliases, e.g. ['-k'] for 'top-k'. */
  aliases?: string[];
}

export interface ParsedFlags {
  /** Keyed by the canonical spec name (e.g. 'top-k'). */
  values: Map<string, string | number | boolean>;
  positionals: string[];
  errors: string[];
}

export function parseFlags(
  argv: string[],
  spec: Record<string, FlagSpec>,
): ParsedFlags {
  // alias/flag token -> canonical name
  const lookup = new Map<string, string>();
  for (const [name, s] of Object.entries(spec)) {
    lookup.set(`--${name}`, name);
    for (const alias of s.aliases ?? []) {
      lookup.set(alias, name);
    }
  }

  const result: ParsedFlags = { values: new Map(), positionals: [], errors: [] };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (!token.startsWith('-')) {
      result.positionals.push(token);
      continue;
    }

    // Split --flag=value
    let key = token;
    let inlineValue: string | undefined;
    const eq = token.indexOf('=');
    if (token.startsWith('--') && eq !== -1) {
      key = token.slice(0, eq);
      inlineValue = token.slice(eq + 1);
    }

    const name = lookup.get(key);
    if (!name) {
      result.errors.push(`Unknown flag: ${key}`);
      continue;
    }

    const kind = spec[name].kind;
    if (kind === 'boolean') {
      if (inlineValue !== undefined) {
        result.values.set(name, inlineValue !== 'false');
      } else {
        result.values.set(name, true);
      }
      continue;
    }

    const raw = inlineValue ?? argv[++i];
    if (raw === undefined) {
      result.errors.push(`Flag ${key} expects a value`);
      continue;
    }

    if (kind === 'int' || kind === 'float') {
      const num = kind === 'int' ? parseInt(raw, 10) : parseFloat(raw);
      if (Number.isNaN(num)) {
        result.errors.push(`Flag ${key} expects a number, got '${raw}'`);
        continue;
      }
      result.values.set(name, num);
      continue;
    }

    result.values.set(name, raw);
  }

  return result;
}

/**
 * Shared error/exit contract: print each error to stderr tagged with the
 * CLI's name and exit 1.
 */
export function failUsage(tag: string, errors: string[]): never {
  for (const e of errors) {
    console.error(`[${tag}] ${e}`);
  }
  console.error(`[${tag}] Use --help for usage.`);
  process.exit(1);
}
