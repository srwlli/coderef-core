/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability tests-for-change
 * @exports TestForChangeSite, TestsForChange, TestsForChangeInputs, computeTestsForChange, RunnerManifest, DetectedTestRunner, RunCommandBlock, detectTestRunner, buildRunCommand, computeRunCommand
 * @used_by src/cli/coderef-mcp-server.ts, src/cli/coderef-query.ts
 */

/**
 * tests-for-change — diff-to-test-selection projection
 * (Meta predictive test selection / Bazel TIA / Launchable pattern,
 * WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 Phase 1).
 *
 * Closes the agent verify-loop. After an edit, the agent wants ONE answer:
 * "which tests exercise the code I just changed?" — so it runs 6 tests, not
 * the whole 1900-test suite. Everything needed to answer that already exists:
 *   - diff_impact already maps a git diff onto the set of changed ELEMENTS and
 *     does a union reverse-BFS over resolved call+import edges to find the
 *     transitive dependents.
 *   - symbol-context.test_linkage already defines "a test ref" as an inbound
 *     edge whose SOURCE FILE is a test file (via isTestLikeFile).
 *   - graph-analytics.isTestLikeFile is the single canonical test heuristic.
 *
 * This module JOINS them: run the same reverse-BFS the diff_impact tool runs,
 * but instead of returning every dependent file, filter the reached set to the
 * elements that live in TEST files, and rank them by how directly they reach a
 * changed element. A PURE join, not new analysis.
 *
 * PURE. No I/O, no `Date.now`/`Math.random`, deterministic — identical inputs
 * yield a byte-identical result. The caller loads graph.json + parses the diff
 * (the exact machinery diff_impact already owns) and passes the changed-element
 * ids + the reverse adjacency + an isTestFile predicate; this function walks and
 * ranks.
 *
 * SURFACES, NOT VERDICTS. `tests[]` is what the graph KNOWS reaches the change
 * through recorded resolved edges. An empty result is NO-DATA ("no test-file
 * element with a recorded edge-path to the changed code"), NEVER "untested" and
 * NEVER "safe to skip verification". Absence is no-data — the same contract the
 * rest of the map family holds.
 */

import type { ExportedGraph } from '../export/graph-exporter.js';

type ExportedNode = ExportedGraph['nodes'][number];
type ExportedEdge = ExportedGraph['edges'][number];

/**
 * One selected test-file element, with the distance at which it reaches a
 * changed element. `depth: 1` = the test element directly references a changed
 * element (its call/import edge targets the change); higher depth = it reaches
 * the change transitively through N src elements.
 */
export interface TestForChangeSite {
  /** codeRefId of the test-file element (the caller/importer in a test file). */
  id: string;
  name?: string;
  type: string;
  /** The test file this element lives in. */
  file?: string;
  line?: number;
  /** Shortest reverse-edge distance from this element to any changed element. */
  depth: number;
}

/** The ranked test selection for a set of changed elements. */
export interface TestsForChange {
  /** How many changed elements seeded the traversal (present in the graph). */
  changed_element_count: number;
  /** How many DISTINCT test FILES the selected elements span. */
  test_file_count: number;
  /** Total selected test-file elements (before any pagination the caller adds). */
  total: number;
  /**
   * Selected test-file elements, ranked: shallowest depth first (most direct
   * linkage), then by file, then by line — a deterministic total order.
   */
  tests: TestForChangeSite[];
  /** The distinct test files, shallowest-reaching depth first then lexical. */
  files: Array<{ file: string; element_count: number; min_depth: number }>;
}

/**
 * Inputs a real handler assembles — the SAME primitives diff_impact already
 * has in hand (the parsed graph's node map, the reverse adjacency, the changed
 * element id set) plus the canonical test-file predicate.
 */
export interface TestsForChangeInputs {
  /** codeRefIds of the elements the diff touched (diff_impact's changedElements keys). */
  changedElementIds: Iterable<string>;
  /** id -> node, for resolving a reached id to its file/name/type. */
  nodeById: Map<string, ExportedNode>;
  /** Reverse adjacency over RESOLVED edges: targetId -> inbound edges. */
  inbound: Map<string, ExportedEdge[]>;
  /** Canonical test-file predicate (graph-analytics.isTestLikeFile). */
  isTestFile: (file: string | undefined) => boolean;
  /** Max reverse-BFS depth. Mirrors diff_impact's depthCap. Default 3, clamped 1..10. */
  maxDepth?: number;
}

/**
 * Compute the ranked test selection for a set of changed elements.
 *
 * Walks the reverse call+import graph from every changed element (breadth-first,
 * so the FIRST time a node is reached is its shortest depth), collecting the
 * ids that live in test files. Only `call` and `import` relationships are
 * followed — the exact edge filter diff_impact and symbol-context use — so the
 * projection stays pinned to the resolved dependency graph, not header/export
 * bookkeeping edges.
 */
export function computeTestsForChange(inputs: TestsForChangeInputs): TestsForChange {
  const { nodeById, inbound, isTestFile } = inputs;
  const depthCap = Math.max(1, Math.min(10, inputs.maxDepth ?? 3));

  // Seed with changed elements that actually exist as graph nodes. An id in the
  // diff that has no node (e.g. a comment-only or non-code change) contributes
  // no traversal — it is simply not counted as a seed.
  const seeds: string[] = [];
  const seedSet = new Set<string>();
  for (const id of inputs.changedElementIds) {
    if (nodeById.has(id) && !seedSet.has(id)) {
      seedSet.add(id);
      seeds.push(id);
    }
  }

  // Reverse BFS. `bestDepth` records the shortest distance at which each node is
  // reached; a node is only expanded the first (shallowest) time it is seen, so
  // the recorded depth is minimal and the walk terminates.
  const bestDepth = new Map<string, number>();
  let frontier = seeds;
  for (const id of seeds) bestDepth.set(id, 0);

  for (let depth = 1; depth <= depthCap && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of inbound.get(id) ?? []) {
        if (edge.relationship !== 'call' && edge.relationship !== 'import') continue;
        const src = edge.sourceId;
        if (!src || bestDepth.has(src)) continue;
        bestDepth.set(src, depth);
        next.push(src);
      }
    }
    frontier = next;
  }

  // Filter the reached set to test-file elements. The seeds themselves (depth 0)
  // are the changed code, not tests — a changed element that happens to live in
  // a test file is still "the change", not a selected test, so depth 0 is
  // excluded from the selection.
  const sites: TestForChangeSite[] = [];
  for (const [id, depth] of bestDepth) {
    if (depth === 0) continue;
    const node = nodeById.get(id);
    if (!node) continue;
    if (!isTestFile(node.file)) continue;
    sites.push({
      id,
      ...(node.name !== undefined ? { name: node.name } : {}),
      type: node.type,
      ...(node.file !== undefined ? { file: node.file } : {}),
      ...(node.line !== undefined ? { line: node.line } : {}),
      depth,
    });
  }

  // Deterministic total order: shallowest first (most direct linkage), then file,
  // then line, then id — so identical inputs yield a byte-identical ranking.
  sites.sort(
    (a, b) =>
      a.depth - b.depth ||
      (a.file ?? '').localeCompare(b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0) ||
      a.id.localeCompare(b.id),
  );

  // Per-file rollup: element count + the shallowest depth any of its elements
  // reaches the change (a file's "best" linkage to the diff).
  const fileAgg = new Map<string, { count: number; minDepth: number }>();
  for (const s of sites) {
    const f = s.file ?? '(unknown)';
    const agg = fileAgg.get(f);
    if (agg) {
      agg.count += 1;
      if (s.depth < agg.minDepth) agg.minDepth = s.depth;
    } else {
      fileAgg.set(f, { count: 1, minDepth: s.depth });
    }
  }
  const files = [...fileAgg.entries()]
    .map(([file, agg]) => ({ file, element_count: agg.count, min_depth: agg.minDepth }))
    .sort((a, b) => a.min_depth - b.min_depth || a.file.localeCompare(b.file));

  return {
    changed_element_count: seeds.length,
    test_file_count: files.length,
    total: sites.length,
    tests: sites,
    files,
  };
}

// ---------------------------------------------------------------------------
// run_command emission (WO-CODE-INTELLIGENCE-LEVERAGE-WIRING-PROGRAM-001 P5,
// REC-004): turn the ranked test-FILE selection into ONE ready-to-run command
// line. Detection reads the project's package.json manifest (scripts.test
// first, then declared runner dependencies); the command is only ever built
// from a RECOGNIZED runner — an unrecognizable test script or an absent
// manifest is honest no-data, NEVER a guessed command line. Both edges (the
// MCP tests_for_change handler and the coderef-analyze CLI mirror) call the
// same computeRunCommand joiner so they cannot drift.
// ---------------------------------------------------------------------------

/** The package.json slice runner detection reads. */
export interface RunnerManifest {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** A recognized test runner + how to invoke it with explicit file args. */
export interface DetectedTestRunner {
  /** Canonical runner name (vitest | jest | mocha | playwright | node-test). */
  runner: string;
  /** Invocation prefix a file list is appended to (e.g. "npx vitest run"). */
  invoke: string;
  /** Detection provenance (e.g. "package.json scripts.test"). */
  source: string;
}

/**
 * The additive response block both edges spread into their envelopes.
 * `run_command` is null whenever a command cannot be stated truthfully, with
 * `run_command_no_data` naming why (absence = no-data, never a guess).
 */
export interface RunCommandBlock {
  run_command: string | null;
  runner?: string;
  run_command_source?: string;
  run_command_no_data?: string;
}

// Recognized runners, checked in order. The invoke prefixes are the file-arg
// forms (vitest needs `run` for a non-watch one-shot; jest/mocha take files
// directly; playwright filters by file args; node --test takes file paths).
const RUNNER_PATTERNS: ReadonlyArray<{ runner: string; invoke: string; scriptRe: RegExp }> = [
  { runner: 'vitest', invoke: 'npx vitest run', scriptRe: /\bvitest\b/ },
  { runner: 'jest', invoke: 'npx jest', scriptRe: /\bjest\b/ },
  { runner: 'playwright', invoke: 'npx playwright test', scriptRe: /\bplaywright\b/ },
  { runner: 'mocha', invoke: 'npx mocha', scriptRe: /\bmocha\b/ },
  { runner: 'node-test', invoke: 'node --test', scriptRe: /\bnode\s+--test\b/ },
];

/**
 * Detect the project's test runner from its package.json manifest. PURE.
 * scripts.test wins (it is the project's own declared entrypoint); a test
 * script that names no recognized runner returns null — we cannot append file
 * args to a script we cannot parameterize, and guessing is worse than no-data.
 * With no test script, a declared vitest/jest/playwright/mocha dependency
 * (dev or prod) is accepted as the runner.
 */
export function detectTestRunner(manifest: RunnerManifest | null | undefined): DetectedTestRunner | null {
  if (!manifest || typeof manifest !== 'object') return null;
  const testScript = manifest.scripts?.test;
  if (typeof testScript === 'string' && testScript.trim().length > 0) {
    for (const p of RUNNER_PATTERNS) {
      if (p.scriptRe.test(testScript)) {
        return { runner: p.runner, invoke: p.invoke, source: 'package.json scripts.test' };
      }
    }
    return null;
  }
  for (const depField of ['devDependencies', 'dependencies'] as const) {
    const deps = manifest[depField];
    if (!deps) continue;
    for (const p of RUNNER_PATTERNS) {
      if (p.runner !== 'node-test' && Object.prototype.hasOwnProperty.call(deps, p.runner)) {
        return { runner: p.runner, invoke: p.invoke, source: `package.json ${depField}.${p.runner}` };
      }
    }
  }
  return null;
}

/** Quote a path for a command line only when it needs it. */
function quoteArg(file: string): string {
  return /\s/.test(file) ? `"${file}"` : file;
}

/**
 * Build the ready-to-run command for a detected runner + the selected test
 * files (already ranked shallowest-linkage first). PURE + deterministic.
 */
export function buildRunCommand(runner: DetectedTestRunner, testFiles: string[]): string | null {
  if (testFiles.length === 0) return null;
  return `${runner.invoke} ${testFiles.map(quoteArg).join(' ')}`;
}

/**
 * The single joiner both edges spread into their response envelopes:
 * manifest + selected test files -> the additive run_command block.
 */
export function computeRunCommand(
  manifest: RunnerManifest | null | undefined,
  testFiles: string[],
): RunCommandBlock {
  const detected = detectTestRunner(manifest);
  if (!detected) {
    return {
      run_command: null,
      run_command_no_data:
        'no recognized test runner (package.json scripts.test / declared runner dependency) — command not guessed',
    };
  }
  const command = buildRunCommand(detected, testFiles);
  if (command === null) {
    return {
      run_command: null,
      runner: detected.runner,
      run_command_source: detected.source,
      run_command_no_data: 'no selected test files — nothing to run (no-data, not "safe to skip")',
    };
  }
  return { run_command: command, runner: detected.runner, run_command_source: detected.source };
}
