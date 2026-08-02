/**
 * @coderef-contract rag-search enforces CODEREF_RAG_LOCAL_ONLY through the ONE canonical predicate.
 *
 * WO-ELEMENT-IMPORTS-ASSIGNS-THE-WHOLE-FILE-IMPORT-LIST-001 phase 2 (STUB-MJ6VT7).
 *
 * The predicate existed FOUR times: rag-config.ts:144 (canonical, exported),
 * rag-index.ts (collapsed by the predecessor workorder), rag-search.ts, and a
 * private copy inside a test file. Measured this phase across a 22-case input
 * matrix — unset, "", 0/false/no and their case variants, 1/true/TRUE/yes, plus
 * "off"/"disabled"/"-1"/"00"/" "/"0 "/"null" — all four agreed on every input.
 * So this was drift RISK, never live drift, and collapsing it is a runtime no-op.
 *
 * WHY IT COULD DRIFT is the part that needed fixing. `rag-search.ts` had ZERO
 * exports and called `main()` unconditionally at module load, so importing it
 * from a test parsed process.argv and process.exit()-ed the runner. The seam was
 * live — rag-search is a published bin — but unreachable. Every previous attempt
 * to pin this contract therefore asserted a PRIVATE COPY of the predicate rather
 * than the CLI that uses it, which proves nothing and is exactly the shape the
 * predecessor workorder had to delete from the rag-index test.
 *
 * Its own siblings already knew better: rag-index.ts, rag-status.ts and
 * rag-eval.ts all guard `main()` behind `require.main === module` and export
 * their surface. rag-search was the only one of the four rag-* CLIs that did not.
 *
 * So this file asserts the REAL exported guard from rag-search.ts, not the
 * canonical predicate in isolation. `isLocalOnly()` on its own is already covered
 * by __tests__/rag-index-cli.test.ts; re-asserting it here would add coverage of
 * rag-config and none of rag-search.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { assertLocalOnlyAllows } from '../src/cli/rag-search.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI_DIR = path.join(HERE, '..', 'src', 'cli');

let savedLocalOnly: string | undefined;

beforeEach(() => {
  savedLocalOnly = process.env.CODEREF_RAG_LOCAL_ONLY;
  delete process.env.CODEREF_RAG_LOCAL_ONLY;
});

afterEach(() => {
  if (savedLocalOnly === undefined) delete process.env.CODEREF_RAG_LOCAL_ONLY;
  else process.env.CODEREF_RAG_LOCAL_ONLY = savedLocalOnly;
});

describe('rag-search local-only guard — the CLI is importable at all', () => {
  it('(a) importing rag-search does NOT run the CLI', () => {
    // The import at the top of this file is the assertion. Before the
    // `require.main === module` guard, loading this module ran main(), which
    // parsed an empty argv, printed "Error: Query is required" and called
    // process.exit(2) — taking the test runner with it. Reaching this line at
    // all is the proof; the expect() below just makes that explicit.
    expect(typeof assertLocalOnlyAllows).toBe('function');
  });
});

describe('rag-search local-only guard — provider decisions', () => {
  it('(b) allows any provider when local-only is unset', () => {
    expect(assertLocalOnlyAllows('openai')).toBeNull();
    expect(assertLocalOnlyAllows('anthropic')).toBeNull();
    expect(assertLocalOnlyAllows('ollama')).toBeNull();
  });

  it('(c) refuses openai under local-only, naming the raw value', () => {
    process.env.CODEREF_RAG_LOCAL_ONLY = '1';
    const msg = assertLocalOnlyAllows('openai');
    expect(msg).toMatch(/local-only mode is enabled/);
    expect(msg).toContain('CODEREF_RAG_LOCAL_ONLY=1');
    expect(msg).toContain("provider 'openai'");
  });

  it('(d) refuses anthropic under local-only', () => {
    process.env.CODEREF_RAG_LOCAL_ONLY = '1';
    expect(assertLocalOnlyAllows('anthropic')).toMatch(/local-only mode is enabled/);
  });

  it('(e) still allows the local provider under local-only', () => {
    // ollama is what a bare run selects anyway (STUB-MN7E0G pinned local as the
    // unconditional default), so enabling local-only must change nothing for it.
    process.env.CODEREF_RAG_LOCAL_ONLY = '1';
    expect(assertLocalOnlyAllows('ollama')).toBeNull();
  });
});

describe('rag-search local-only guard — the predicate is the canonical one', () => {
  // Driven through the CLI's OWN guard, so these cases pin what rag-search does,
  // not what rag-config does. The enabling/disabling values are the canonical
  // predicate's: only "0"/"false"/"no" (any case) and unset/empty disable it.
  it.each([
    ['1', true],
    ['true', true],
    ['TRUE', true],
    ['yes', true],
    ['0', false],
    ['false', false],
    ['FALSE', false],
    ['no', false],
    ['No', false],
    ['', false],
  ])('(f) CODEREF_RAG_LOCAL_ONLY=%j -> enforced=%s', (value, enforced) => {
    process.env.CODEREF_RAG_LOCAL_ONLY = value as string;
    const refused = assertLocalOnlyAllows('openai') !== null;
    expect(refused).toBe(enforced);
  });

  it.each(['off', 'disabled', '-1', '00'])(
    '(g) treats %j as ENABLED — surprising, but canonical and unchanged',
    (value) => {
      // Measured in P2-T1: the inline copy this phase deleted agreed with the
      // canonical predicate on every one of these. Pinned so the surprise is a
      // recorded contract rather than a latent difference someone "fixes" in one
      // copy only — which is how this predicate reached four copies. It also errs
      // toward local-only, the safe direction where no cloud keys exist.
      process.env.CODEREF_RAG_LOCAL_ONLY = value;
      expect(assertLocalOnlyAllows('openai')).not.toBeNull();
    }
  );
});

describe('rag-search local-only guard — no CLI re-derives the predicate', () => {
  it('(h) no src/cli/*.ts hand-rolls the CODEREF_RAG_LOCAL_ONLY comparison chain', () => {
    // A source-text guard, and it is honest about being one: it cannot prove
    // behaviour, only that a fifth copy has not reappeared. That is the actual
    // regression this phase is defending against — the predicate was never
    // wrong, it was duplicated.
    const offenders: string[] = [];
    for (const name of fs.readdirSync(CLI_DIR)) {
      if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
      const src = fs.readFileSync(path.join(CLI_DIR, name), 'utf8');
      if (!src.includes('CODEREF_RAG_LOCAL_ONLY')) continue;
      // The canonical predicate's signature: comparing the lowercased env value
      // against the three disabling literals.
      if (/toLowerCase\(\)\s*!==\s*'(?:0|false|no)'/.test(src)) offenders.push(name);
    }
    expect(offenders, `these re-derive isLocalOnly(): ${offenders.join(', ')}`).toEqual([]);
  });

  it('(i) rag-search imports the canonical isLocalOnly', () => {
    const src = fs.readFileSync(path.join(CLI_DIR, 'rag-search.ts'), 'utf8');
    expect(src).toMatch(/import\s*\{[^}]*\bisLocalOnly\b[^}]*\}\s*from\s*'[^']*rag-config\.js'/);
  });
});
