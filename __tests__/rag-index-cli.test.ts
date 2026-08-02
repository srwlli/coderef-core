/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability rag-index-cli-test
 */

/**
 * rag-index CLI contract tests.
 *
 * WO-ELEMENTEXTRACTOR-REVISITS-RUST-IMPL-AND-JAVA-OR-C-001 phase 6
 * (TKT-GERVWS / STUB-5SBBAT).
 *
 * WHAT THIS FILE USED TO BE. It carried a PRIVATE re-implementation of
 * parseArgs — "so we can test arg parsing without spawning a child process" —
 * and asserted that copy. The copy had gone stale months earlier, and the
 * fifteen green tests were describing a CLI that no longer existed. MEASURED
 * against the real parser, the two disagreed in six distinct ways:
 *
 *   1. provider default: production 'ollama', the copy 'openai'
 *   2. store default:    production 'json',   the copy 'sqlite'
 *   3. five flags the copy had never heard of — --coverage-floor,
 *      --strict-coverage, --include-headerless, --concurrency, --embed-cache
 *   4. because of (3), `--concurrency 8` made the copy read `8` as a POSITIONAL
 *      and set projectDir='8'. Not merely uncovered — actively wrong.
 *   5. `--project-dir /a /b`: production honours the flag (/a), the copy let
 *      the trailing positional win (/b)
 *   6. an unknown flag: production exits 1 via failUsage, the copy silently
 *      ignored it
 *
 * (1) is the one that matters most. This repository is Ollama-local-only by
 * standing policy — no cloud LLM keys, ever. The test suite was asserting that
 * the default provider IS the cloud one, so a regression that re-pointed
 * rag-index at OpenAI would have turned this file GREEN rather than red. A test
 * that inverts the policy it exists to protect is worse than no test.
 *
 * WHAT IT IS NOW. It imports the production `parseArgs` (exported for exactly
 * this reason) and asserts the CURRENT contract. There is no second parser left
 * in this file to drift.
 *
 * The same applied to local-only enforcement: this file had a fourth hand-rolled
 * copy of the CODEREF_RAG_LOCAL_ONLY predicate. rag-index.ts now calls the
 * canonical `isLocalOnly()` from rag-config.ts, so testing that function tests
 * the code the CLI actually runs.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { parseArgs, defaultRagIndexArgs } from '../src/cli/rag-index.js';
import { isLocalOnly } from '../src/integration/rag/rag-config.js';

const ENV_KEYS = ['CODEREF_LLM_PROVIDER', 'CODEREF_RAG_LOCAL_ONLY'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe('rag-index CLI - parseArgs defaults (the stale-copy divergences)', () => {
  it('provider defaults to LOCAL ollama, never a cloud provider', () => {
    // Divergence 1, and a standing policy of this repository. The old private
    // copy asserted 'openai' here.
    expect(parseArgs([]).provider).toBe('ollama');
  });

  it('a merely-present OPENAI_API_KEY does NOT flip the default to cloud', () => {
    // resolveRagProvider is --provider > CODEREF_LLM_PROVIDER > 'ollama'. An
    // incidental key in the shell must never silently bill a bare run.
    process.env.OPENAI_API_KEY = 'sk-incidental-not-a-selection';
    try {
      expect(parseArgs([]).provider).toBe('ollama');
    } finally {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('store defaults to json', () => {
    // Divergence 2. The copy said 'sqlite', and did not even admit 'json' into
    // its type union.
    expect(parseArgs([]).store).toBe('json');
  });

  it('exposes the five flags the private copy had never heard of', () => {
    // Divergence 3.
    const a = parseArgs([]);
    expect(a.coverageFloor).toBe(0);
    expect(a.strictCoverage).toBe(false);
    expect(a.includeHeaderless).toBe(false);
    expect(a.concurrency).toBeUndefined();
    expect(a.embedCache, 'embed cache is ON by default').toBe(true);
  });
});

describe('rag-index CLI - parseArgs flag handling', () => {
  it('CODEREF_LLM_PROVIDER is honoured, and --provider overrides it', () => {
    process.env.CODEREF_LLM_PROVIDER = 'ollama';
    expect(parseArgs([]).provider).toBe('ollama');
    expect(parseArgs(['--provider', 'anthropic']).provider).toBe('anthropic');
    expect(parseArgs(['--provider=anthropic']).provider).toBe('anthropic');
  });

  it('provider names are lowercased', () => {
    expect(parseArgs(['--provider', 'OpenAI']).provider).toBe('openai');
  });

  it('accepts json, sqlite, pinecone, chroma as stores', () => {
    // 'sqlite' is a DEPRECATED alias that provider-factory maps back to the
    // JSON file store (provider-factory.ts:174) — it stays accepted here so
    // existing invocations do not start erroring at the parse boundary.
    for (const s of ['json', 'sqlite', 'pinecone', 'chroma'] as const) {
      expect(parseArgs(['--store', s]).store).toBe(s);
    }
  });

  it('an unknown --store warns and falls back to json, not sqlite', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseArgs(['--store', 'redis']).store).toBe('json');
    expect(warn.mock.calls.map(c => String(c[0])).join(' ')).toContain('Unknown store: redis');
  });

  it('--project-dir WINS over a trailing positional', () => {
    // Divergence 5: the copy let the last positional win, so any invocation
    // mixing the two disagreed with production about which directory to index.
    expect(parseArgs(['--project-dir', '/a', '/b']).projectDir).toBe('/a');
    expect(parseArgs(['--project-dir=/eq/path']).projectDir).toBe('/eq/path');
    expect(parseArgs(['/only/positional']).projectDir).toBe('/only/positional');
  });

  it('--concurrency takes its value as a NUMBER, not as the project dir', () => {
    // Divergence 4, the sharpest one: to the private copy `--concurrency` was
    // an unknown flag and `8` was a bare positional, so it returned
    // projectDir='8'.
    const a = parseArgs(['--concurrency', '8']);
    expect(a.concurrency).toBe(8);
    expect(a.projectDir).not.toBe('8');
  });

  it('--concurrency below 1 warns and falls back to the provider default', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseArgs(['--concurrency', '0']).concurrency).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('--coverage-floor takes a number; out-of-range warns and is ignored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseArgs(['--coverage-floor', '80']).coverageFloor).toBe(80);
    expect(parseArgs(['--coverage-floor', '150']).coverageFloor).toBe(0);
    expect(warn).toHaveBeenCalled();
  });

  it('--no-embed-cache disables the chunk-grain cache', () => {
    expect(parseArgs(['--no-embed-cache']).embedCache).toBe(false);
    expect(parseArgs(['--embed-cache']).embedCache).toBe(true);
  });

  it('boolean flags and their shorthands', () => {
    expect(parseArgs(['--reset']).reset).toBe(true);
    expect(parseArgs(['--strict-coverage']).strictCoverage).toBe(true);
    expect(parseArgs(['--include-headerless']).includeHeaderless).toBe(true);
    expect(parseArgs(['--verbose']).verbose).toBe(true);
    expect(parseArgs(['-v']).verbose).toBe(true);
    expect(parseArgs(['--json']).json).toBe(true);
    expect(parseArgs(['-j']).json).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('--lang splits on comma, -l shorthand works', () => {
    expect(parseArgs(['--lang', 'ts,tsx']).languages).toEqual(['ts', 'tsx']);
    expect(parseArgs(['-l', 'py']).languages).toEqual(['py']);
    expect(parseArgs([]).languages).toBeUndefined();
  });

  it('an unknown flag is REJECTED, not silently ignored', () => {
    // Divergence 6. failUsage() prints and calls process.exit(1); the private
    // copy's default branch dropped unknown flags on the floor, so a typo like
    // `--lanugage ts` would have indexed the whole repo instead of erroring.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    expect(() => parseArgs(['--totally-bogus'])).toThrow('process.exit(1)');
    expect(err.mock.calls.map(c => String(c[0])).join(' ')).toContain('totally-bogus');
    exit.mockRestore();
  });

  it('--help suppresses the unknown-flag rejection', () => {
    // `rag-index --bogus --help` must still print usage rather than exit(1) —
    // parseArgs only calls failUsage when help was NOT requested.
    expect(parseArgs(['--totally-bogus', '--help']).help).toBe(true);
  });
});

describe('rag-index CLI - defaultRagIndexArgs (the MCP rag_index path)', () => {
  it('pins local Ollama + the JSON store, with no cloud fallback', () => {
    const a = defaultRagIndexArgs('/some/project');
    expect(a.provider).toBe('ollama');
    expect(a.store).toBe('json');
    expect(a.projectDir).toBe('/some/project');
    expect(a.reset, 'programmatic runs must not wipe an existing index').toBe(false);
    expect(a.json, 'stdout belongs to the MCP transport').toBe(true);
    expect(a.embedCache).toBe(true);
  });

  it('agrees with parseArgs([]) on every default the two share', () => {
    // The CLI and MCP surfaces enter the SAME runRagIndex; if these two ever
    // disagree, one of the surfaces is quietly running a different pipeline.
    // reset/json/verbose are intentionally different (documented above), so the
    // comparison is scoped to the shared-contract fields.
    const cli = parseArgs([]);
    const mcp = defaultRagIndexArgs(process.cwd());
    for (const k of ['provider', 'store', 'coverageFloor', 'strictCoverage',
      'includeHeaderless', 'concurrency', 'embedCache'] as const) {
      expect(mcp[k], `default mismatch on '${k}'`).toEqual(cli[k]);
    }
  });
});

describe('rag-index CLI - local-only enforcement', () => {
  // isLocalOnly() is the function rag-index.ts:333 actually calls. This file
  // used to assert a private copy of the predicate instead, which proved
  // nothing about the CLI.
  it.each([
    ['1', true],
    ['true', true],
    ['yes', true],
    ['TRUE', true],
    ['0', false],
    ['false', false],
    ['no', false],
    ['', false],
  ])('CODEREF_RAG_LOCAL_ONLY=%j -> %s', (value, expected) => {
    process.env.CODEREF_RAG_LOCAL_ONLY = value as string;
    expect(isLocalOnly()).toBe(expected);
  });

  it('is off when the variable is unset', () => {
    delete process.env.CODEREF_RAG_LOCAL_ONLY;
    expect(isLocalOnly()).toBe(false);
  });

  it('local-only does not constrain the DEFAULT provider, which is already local', () => {
    process.env.CODEREF_RAG_LOCAL_ONLY = '1';
    // The gate in runRagIndex rejects openai/anthropic; ollama is what a bare
    // run selects anyway, so enabling local-only changes nothing for it.
    expect(parseArgs([]).provider).toBe('ollama');
  });
});
