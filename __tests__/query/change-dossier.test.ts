/**
 * change-dossier + run_command tests
 * (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 P5, REC-004 + REC-007).
 *
 * Pins the PURE seams both edges (MCP change_dossier / tests_for_change
 * handlers, coderef-analyze CLI mirrors) share: runner detection + run_command
 * emission (recognized runners only — never a guessed command), the four
 * condensers (null on absent/error envelopes, no_data KEPT as a surface), and
 * composeChangeDossier determinism + fixed no_data ordering + partial-surface
 * degradation.
 */

import { describe, it, expect } from 'vitest';
import {
  detectTestRunner,
  buildRunCommand,
  computeRunCommand,
  type RunnerManifest,
} from '../../src/query/tests-for-change.js';
import {
  condenseImpact,
  condenseTests,
  condenseApiDiff,
  condenseRules,
  composeChangeDossier,
  type ChangeDossierInputs,
} from '../../src/query/change-dossier.js';

// ---------------------------------------------------------------------------
// runner detection (REC-004)
// ---------------------------------------------------------------------------

describe('detectTestRunner', () => {
  it('detects vitest from scripts.test (the coderef-core shape: "npx vitest")', () => {
    const r = detectTestRunner({ scripts: { test: 'npx vitest' } });
    expect(r?.runner).toBe('vitest');
    expect(r?.invoke).toBe('npx vitest run');
    expect(r?.source).toBe('package.json scripts.test');
  });

  it('detects jest / playwright / mocha / node --test from scripts.test', () => {
    expect(detectTestRunner({ scripts: { test: 'jest --ci' } })?.runner).toBe('jest');
    expect(detectTestRunner({ scripts: { test: 'playwright test' } })?.runner).toBe('playwright');
    expect(detectTestRunner({ scripts: { test: 'mocha spec/' } })?.runner).toBe('mocha');
    expect(detectTestRunner({ scripts: { test: 'node --test test/' } })?.runner).toBe('node-test');
  });

  it('falls back to declared runner dependencies when there is no test script', () => {
    const dev = detectTestRunner({ devDependencies: { vitest: '^3.0.0' } });
    expect(dev?.runner).toBe('vitest');
    expect(dev?.source).toBe('package.json devDependencies.vitest');
    const prod = detectTestRunner({ dependencies: { jest: '^29.0.0' } });
    expect(prod?.runner).toBe('jest');
    expect(prod?.source).toBe('package.json dependencies.jest');
  });

  it('returns null on an unrecognized test script — never guesses a command seat', () => {
    // A bespoke script cannot take appended file args safely; deps are NOT
    // consulted when scripts.test exists (the project declared its entrypoint).
    expect(
      detectTestRunner({ scripts: { test: './run-my-tests.sh' }, devDependencies: { vitest: '^3' } }),
    ).toBeNull();
  });

  it('returns null on an absent or empty manifest', () => {
    expect(detectTestRunner(null)).toBeNull();
    expect(detectTestRunner(undefined)).toBeNull();
    expect(detectTestRunner({})).toBeNull();
  });
});

describe('buildRunCommand + computeRunCommand', () => {
  const vitest = { runner: 'vitest', invoke: 'npx vitest run', source: 'package.json scripts.test' };

  it('builds the ready-to-run line from the ranked test files', () => {
    expect(buildRunCommand(vitest, ['__tests__/a.test.ts', '__tests__/b.test.ts'])).toBe(
      'npx vitest run __tests__/a.test.ts __tests__/b.test.ts',
    );
  });

  it('quotes paths containing spaces', () => {
    expect(buildRunCommand(vitest, ['my tests/a.test.ts'])).toBe('npx vitest run "my tests/a.test.ts"');
  });

  it('computeRunCommand: no recognized runner -> run_command null + explicit no-data, never a guess', () => {
    const block = computeRunCommand(null, ['__tests__/a.test.ts']);
    expect(block.run_command).toBeNull();
    expect(block.run_command_no_data).toContain('not guessed');
    expect(block.runner).toBeUndefined();
  });

  it('computeRunCommand: runner but zero selected files -> null command with the runner named', () => {
    const manifest: RunnerManifest = { scripts: { test: 'npx vitest' } };
    const block = computeRunCommand(manifest, []);
    expect(block.run_command).toBeNull();
    expect(block.runner).toBe('vitest');
    expect(block.run_command_no_data).toContain('no selected test files');
  });

  it('computeRunCommand: runner + files -> the command with provenance', () => {
    const manifest: RunnerManifest = { scripts: { test: 'npx vitest' } };
    const block = computeRunCommand(manifest, ['__tests__/query/orient.test.ts']);
    expect(block.run_command).toBe('npx vitest run __tests__/query/orient.test.ts');
    expect(block.runner).toBe('vitest');
    expect(block.run_command_source).toBe('package.json scripts.test');
    expect(block.run_command_no_data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// condensers
// ---------------------------------------------------------------------------

describe('condensers', () => {
  it('condenseImpact: null on absent or error envelope; toplines + top-10 files otherwise', () => {
    expect(condenseImpact(null)).toBeNull();
    expect(condenseImpact({ error: 'git_diff_failed' })).toBeNull();
    const c = condenseImpact({
      changed_files: 3,
      changed_elements: 7,
      max_depth: 3,
      transitive_dependents: 40,
      affected_files: 12,
      files: Array.from({ length: 12 }, (_, i) => ({ file: `src/f${i}.ts`, elements: 12 - i })),
    });
    expect(c?.changed_elements).toBe(7);
    expect(c?.transitive_dependents).toBe(40);
    expect(c?.top_files).toHaveLength(10);
    expect(c?.top_files[0]).toEqual({ file: 'src/f0.ts', elements: 12 });
  });

  it('condenseTests: carries the run_command block through', () => {
    expect(condenseTests(null)).toBeNull();
    const c = condenseTests({
      test_file_count: 2,
      selected_tests: 5,
      test_files: [{ file: '__tests__/a.test.ts', element_count: 3, min_depth: 1 }],
      run_command: 'npx vitest run __tests__/a.test.ts',
      runner: 'vitest',
      run_command_source: 'package.json scripts.test',
    });
    expect(c?.selected_tests).toBe(5);
    expect(c?.run_command).toBe('npx vitest run __tests__/a.test.ts');
    expect(c?.runner).toBe('vitest');
  });

  it('condenseApiDiff: KEEPS a no_data baseline-missing result as a surface', () => {
    expect(condenseApiDiff(null)).toBeNull();
    const noBaseline = condenseApiDiff({
      no_data: true, added_count: 0, removed_count: 0, changed_count: 0, unchanged_count: 0,
      added: [], removed: [], changed: [], note: 'no baseline manifest',
    });
    expect(noBaseline).not.toBeNull();
    expect(noBaseline?.no_data).toBe(true);
    const delta = condenseApiDiff({
      no_data: false, added_count: 2, removed_count: 1, changed_count: 0, unchanged_count: 90,
      added: [{ id: 'a' }, { id: 'b' }], removed: [{ id: 'c' }], changed: [],
    });
    expect(delta?.added_count).toBe(2);
    expect(delta?.removed).toHaveLength(1);
  });

  it('condenseRules: filters to the violated rules, keeps no_data honest', () => {
    expect(condenseRules(null)).toBeNull();
    const c = condenseRules({
      no_data: false, rule_count: 3, violated_count: 1, satisfied_count: 1, not_applicable_count: 1,
      rules: [
        { id: 'r1', status: 'satisfied' },
        { id: 'r2', status: 'violated' },
        { id: 'r3', status: 'not_applicable' },
      ],
    });
    expect(c?.violated_count).toBe(1);
    expect(c?.violated_rules).toEqual([{ id: 'r2', status: 'violated' }]);
  });
});

// ---------------------------------------------------------------------------
// composeChangeDossier
// ---------------------------------------------------------------------------

function fullInputs(): ChangeDossierInputs {
  return {
    ref: 'HEAD',
    impact: {
      changed_files: 2, changed_elements: 4, max_depth: 3,
      transitive_dependents: 9, affected_files: 5,
      top_files: [{ file: 'src/a.ts', elements: 3 }],
    },
    tests: {
      test_file_count: 1, selected_tests: 2,
      test_files: [{ file: '__tests__/a.test.ts', element_count: 2, min_depth: 1 }],
      run_command: 'npx vitest run __tests__/a.test.ts',
      runner: 'vitest',
      run_command_source: 'package.json scripts.test',
    },
    api: {
      no_data: false, added_count: 1, removed_count: 0, changed_count: 0, unchanged_count: 10,
      added: [{ id: 'x' }], removed: [], changed: [],
    },
    rules: {
      no_data: true, rule_count: 0, violated_count: 0, satisfied_count: 0,
      not_applicable_count: 0, violated_rules: [], note: 'no rules.json',
    },
    warnings: [],
  };
}

describe('composeChangeDossier', () => {
  it('is deterministic: identical inputs produce identical envelopes', () => {
    const a = composeChangeDossier(fullInputs());
    const b = composeChangeDossier(fullInputs());
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('carries every present leg; a leg with its own no_data stays present (ran, nothing to compare)', () => {
    const env = composeChangeDossier(fullInputs());
    expect(env.dossier).toBe('change');
    expect(env.impact?.transitive_dependents).toBe(9);
    expect(env.tests?.run_command).toContain('vitest');
    expect(env.api_diff?.added_count).toBe(1);
    expect(env.dependency_rules?.no_data).toBe(true); // present AND honestly empty
    expect(env.no_data).toEqual([]);
    expect(env.note).toContain('Surfaces, not verdicts');
  });

  it('names every absent leg in no_data in fixed order (never silently dropped)', () => {
    const env = composeChangeDossier({ ref: 'HEAD', impact: null, tests: null, api: null, rules: null });
    expect(env.no_data).toEqual(['diff_impact', 'tests_for_change', 'api_diff', 'dependency_rules']);
    expect(env.impact).toBeNull();
    expect(env.api_diff).toBeNull();
  });

  it('degrades partially: one failed leg is named in no_data with its warning, the rest survive', () => {
    const inputs = fullInputs();
    inputs.api = null; // e.g. manifest projection failed
    inputs.warnings = ['api_diff: manifest_unreadable'];
    const env = composeChangeDossier(inputs);
    expect(env.no_data).toEqual(['api_diff']);
    expect(env.warnings).toEqual(['api_diff: manifest_unreadable']);
    expect(env.tests?.selected_tests).toBe(2);
  });
});
