/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability change-dossier
 * @exports ChangeDossierImpact, ChangeDossierTests, ChangeDossierApi, ChangeDossierRules, ChangeDossierInputs, ChangeDossierEnvelope, condenseImpact, condenseTests, condenseApiDiff, condenseRules, composeChangeDossier
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-analyze.ts
 */

/**
 * change-dossier — the pre-flight envelope for a proposed change
 * (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 P5, REC-007).
 *
 * One call composing the four verify surfaces the tool family already
 * computes separately:
 *   - diff_impact        -> blast radius (changed elements + transitive dependents)
 *   - tests_for_change   -> ranked test selection + the ready-to-run command
 *   - api_diff           -> exported-API delta vs the snapshot baseline
 *   - dependency_rules   -> declared-constraint mismatches
 *
 * A PURE JOIN, exactly the orient pattern (src/query/orient.ts): the caller
 * (MCP handler / coderef-analyze CLI) runs the four legs it already owns and
 * passes their envelopes through the condensers; composeChangeDossier is a
 * deterministic assembly with NO I/O — identical inputs yield a byte-identical
 * envelope.
 *
 * SURFACES, NOT VERDICTS. The dossier names WHERE to look before a commit —
 * it never green-lights, blocks, or scores a change. ABSENCE = NO-DATA: a leg
 * that could not run (no git, no baseline snapshot, no rules.json) is either
 * named in `no_data` (leg absent entirely) or carried with its own honest
 * no_data flag (leg ran, had nothing to compare) — never guessed.
 */

/** Condensed diff_impact leg: blast radius toplines + top affected files. */
export interface ChangeDossierImpact {
  changed_files: number | null;
  changed_elements: number | null;
  max_depth: number | null;
  transitive_dependents: number | null;
  affected_files: number | null;
  top_files: Array<{ file: string; elements: number }>;
}

/** Condensed tests_for_change leg: selection toplines + the run command. */
export interface ChangeDossierTests {
  test_file_count: number | null;
  selected_tests: number | null;
  test_files: Array<{ file: string; element_count: number; min_depth: number }>;
  run_command: string | null;
  runner?: string;
  run_command_source?: string;
  run_command_no_data?: string;
}

/** Condensed api_diff leg (delta mode): decomposed change vector. */
export interface ChangeDossierApi {
  no_data: boolean;
  added_count: number | null;
  removed_count: number | null;
  changed_count: number | null;
  unchanged_count: number | null;
  added: unknown[];
  removed: unknown[];
  changed: unknown[];
  note?: string;
}

/** Condensed dependency_rules leg: rule tallies + the violated rules. */
export interface ChangeDossierRules {
  no_data: boolean;
  rule_count: number | null;
  violated_count: number | null;
  satisfied_count: number | null;
  not_applicable_count: number | null;
  violated_rules: unknown[];
  note?: string;
}

/** Inputs the composing edge assembles — condensed legs, null = leg absent. */
export interface ChangeDossierInputs {
  /** The git ref the diff-scoped legs ran against (e.g. "HEAD"). */
  ref: string;
  impact: ChangeDossierImpact | null;
  tests: ChangeDossierTests | null;
  api: ChangeDossierApi | null;
  rules: ChangeDossierRules | null;
  /** Leg-level failure disclosures (e.g. "diff_impact: git_diff_failed"). */
  warnings?: string[];
}

/** The composed dossier envelope. */
export interface ChangeDossierEnvelope {
  dossier: 'change';
  ref: string;
  impact: ChangeDossierImpact | null;
  tests: ChangeDossierTests | null;
  api_diff: ChangeDossierApi | null;
  dependency_rules: ChangeDossierRules | null;
  /** Legs absent entirely, in fixed order — never silently dropped. */
  no_data: string[];
  warnings: string[];
  note: string;
}

const asNum = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Condense a diff_impact envelope. Null in/error envelope -> null out. */
export function condenseImpact(env: Record<string, unknown> | null | undefined): ChangeDossierImpact | null {
  if (!env || typeof env !== 'object' || 'error' in env) return null;
  const files = asArr(env.files) as Array<{ file: string; elements: number }>;
  return {
    changed_files: asNum(env.changed_files),
    changed_elements: asNum(env.changed_elements),
    max_depth: asNum(env.max_depth),
    transitive_dependents: asNum(env.transitive_dependents),
    affected_files: asNum(env.affected_files),
    top_files: files.slice(0, 10),
  };
}

/** Condense a tests_for_change envelope (with its P5 run_command block). */
export function condenseTests(env: Record<string, unknown> | null | undefined): ChangeDossierTests | null {
  if (!env || typeof env !== 'object' || 'error' in env) return null;
  const files = asArr(env.test_files) as Array<{ file: string; element_count: number; min_depth: number }>;
  return {
    test_file_count: asNum(env.test_file_count),
    selected_tests: asNum(env.selected_tests),
    test_files: files.slice(0, 10),
    run_command: typeof env.run_command === 'string' ? env.run_command : null,
    ...(typeof env.runner === 'string' ? { runner: env.runner } : {}),
    ...(typeof env.run_command_source === 'string' ? { run_command_source: env.run_command_source } : {}),
    ...(typeof env.run_command_no_data === 'string' ? { run_command_no_data: env.run_command_no_data } : {}),
  };
}

/**
 * Condense an api_diff DELTA envelope. A no_data baseline-missing result is
 * KEPT (no_data:true is a surface — "no snapshot to compare", not an absent
 * leg); only a null/error envelope condenses to null.
 */
export function condenseApiDiff(env: Record<string, unknown> | null | undefined): ChangeDossierApi | null {
  if (!env || typeof env !== 'object' || 'error' in env) return null;
  return {
    no_data: env.no_data === true,
    added_count: asNum(env.added_count),
    removed_count: asNum(env.removed_count),
    changed_count: asNum(env.changed_count),
    unchanged_count: asNum(env.unchanged_count),
    added: asArr(env.added).slice(0, 5),
    removed: asArr(env.removed).slice(0, 5),
    changed: asArr(env.changed).slice(0, 5),
    ...(typeof env.note === 'string' ? { note: env.note } : {}),
  };
}

/**
 * Condense a dependency_rules envelope. Like api_diff, a no-rules.json
 * no_data result is KEPT as an honest surface; null/error -> null.
 */
export function condenseRules(env: Record<string, unknown> | null | undefined): ChangeDossierRules | null {
  if (!env || typeof env !== 'object' || 'error' in env) return null;
  const rules = asArr(env.rules) as Array<{ status?: string }>;
  return {
    no_data: env.no_data === true,
    rule_count: asNum(env.rule_count),
    violated_count: asNum(env.violated_count),
    satisfied_count: asNum(env.satisfied_count),
    not_applicable_count: asNum(env.not_applicable_count),
    violated_rules: rules.filter(r => r && r.status === 'violated').slice(0, 5),
    ...(typeof env.note === 'string' ? { note: env.note } : {}),
  };
}

/**
 * Compose the dossier. PURE + deterministic: fixed leg order, fixed no_data
 * naming order, warnings passed through sorted-stable (input order kept).
 */
export function composeChangeDossier(inputs: ChangeDossierInputs): ChangeDossierEnvelope {
  const noData: string[] = [];
  if (!inputs.impact) noData.push('diff_impact');
  if (!inputs.tests) noData.push('tests_for_change');
  if (!inputs.api) noData.push('api_diff');
  if (!inputs.rules) noData.push('dependency_rules');

  return {
    dossier: 'change',
    ref: inputs.ref,
    impact: inputs.impact ?? null,
    tests: inputs.tests ?? null,
    api_diff: inputs.api ?? null,
    dependency_rules: inputs.rules ?? null,
    no_data: noData,
    warnings: [...(inputs.warnings ?? [])],
    note:
      'Pre-flight surfaces for a proposed change: blast radius, tests reaching the diff ' +
      '(with a ready-to-run command when a runner is detectable), exported-API delta vs the ' +
      'snapshot baseline, and declared-rule mismatches. Surfaces, not verdicts — the dossier ' +
      'names WHERE to look before committing, never a merge decision. Absent legs are named ' +
      'in no_data; a leg with its own no_data:true ran but had nothing to compare.',
  };
}
