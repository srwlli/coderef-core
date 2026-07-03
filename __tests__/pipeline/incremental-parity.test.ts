/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-incremental-parity-test
 */

/**
 * P5 CORRECTNESS GATE (WO-AGENT-NATIVE-CAPABILITY-GAPS-001, RISK-02).
 *
 * The reason Phase 5 exists: prove that a graph-safe INCREMENTAL populate
 * (re-scan only changed files, resolve against the persisted full fact set)
 * yields a resolved-edge set BYTE-IDENTICAL to a FULL rebuild of the same
 * on-disk state. If these ever diverge, the incremental path has lost
 * cross-file resolution — the exact corruption trap the hard_constraint warns
 * about. A divergence here MUST fail CI.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

const created: string[] = [];

async function makeProject(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-incr-parity-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, content, 'utf8');
  }
  return dir;
}

afterEach(async () => {
  while (created.length) {
    const d = created.pop()!;
    try { await fs.rm(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

/** Canonical, order-independent signature of the RESOLVED edges of a graph. */
function resolvedEdgeSignature(graph: ExportedGraph): string[] {
  return graph.edges
    .filter(e => e.resolutionStatus === 'resolved')
    .map(e => `${e.relationship}|${e.sourceId ?? ''}|${e.targetId ?? ''}`)
    .sort();
}

/** Full signature over ALL edges (incl. non-resolved) for a stricter compare. */
function fullEdgeSignature(graph: ExportedGraph): string[] {
  return graph.edges
    .map(e => `${e.relationship}|${e.resolutionStatus}|${e.sourceId ?? ''}|${e.targetId ?? ''}|${e.reason ?? ''}`)
    .sort();
}

describe('incremental parity (RISK-02 correctness gate)', () => {
  it('a single-file edit via runIncremental yields a resolved-edge set byte-identical to a full rebuild', async () => {
    // 3-file project with CROSS-FILE calls + imports: main -> util.helper,
    // main -> svc.serve; svc -> util.helper. The edited file (main) calls a
    // symbol defined in an UNCHANGED file (util) — the case naive incremental
    // corrupts (util's exports would be absent from a changed-only universe).
    const util = 'export function helper(x) { return x + 1; }\nexport function unused() { return 0; }\n';
    const svc = "import { helper } from './util.js';\nexport function serve() { return helper(41); }\n";
    const mainV1 = "import { helper } from './util.js';\nimport { serve } from './svc.js';\nexport function run() { return helper(1) + serve(); }\n";

    const dir = await makeProject({
      'src/util.ts': util,
      'src/svc.ts': svc,
      'src/main.ts': mainV1,
    });
    const opts = { outputDir: path.join(dir, '.coderef'), languages: ['ts'], mode: 'minimal' as const };

    // 1) FULL build v1 — persists the fact set.
    await new PipelineOrchestrator().run(dir, opts);

    // 2) EDIT main.ts: add a new cross-file call to util.helper (still resolving
    //    against the UNCHANGED util.ts) plus a call to the unchanged svc.serve.
    const mainV2 =
      "import { helper } from './util.js';\n" +
      "import { serve } from './svc.js';\n" +
      'export function run() { return helper(2) + serve(); }\n' +
      'export function extra() { return helper(99); }\n';
    await fs.writeFile(path.join(dir, 'src', 'main.ts'), mainV2, 'utf8');

    // 3) INCREMENTAL: re-scan only main.ts, resolve against the persisted full set.
    const incState = await new PipelineOrchestrator().runIncremental(
      dir,
      [path.join(dir, 'src', 'main.ts')],
      opts,
    );

    // 4) FULL rebuild of the SAME edited on-disk state (the ground truth).
    const fullState = await new PipelineOrchestrator().run(dir, opts);

    // PARITY: resolved-edge sets must be byte-identical.
    const incResolved = resolvedEdgeSignature(incState.graph);
    const fullResolved = resolvedEdgeSignature(fullState.graph);
    expect(incResolved).toEqual(fullResolved);

    // Stronger: the FULL edge signature (incl. non-resolved reasons) matches too.
    expect(fullEdgeSignature(incState.graph)).toEqual(fullEdgeSignature(fullState.graph));

    // And the edit actually took effect (extra() -> helper cross-file call present).
    const hasExtraToHelper = incState.graph.edges.some(
      e => e.relationship === 'call' && e.resolutionStatus === 'resolved' &&
        (e.sourceId ?? '').includes('extra') && (e.targetId ?? '').includes('helper'),
    );
    expect(hasExtraToHelper).toBe(true);
  }, 60_000);

  it('falls back to a full build when no fact set has been persisted', async () => {
    const dir = await makeProject({
      'src/a.ts': 'export function lone() { return 1; }\n',
    });
    const opts = { outputDir: path.join(dir, '.coderef'), languages: ['ts'], mode: 'minimal' as const };
    // No prior run() → no fact set. runIncremental must fall back to a full build.
    const state = await new PipelineOrchestrator().runIncremental(dir, [path.join(dir, 'src', 'a.ts')], opts);
    expect(state.graph.nodes.some(n => n.name === 'lone')).toBe(true);
  }, 60_000);

  it('a deleted file is dropped from the incremental graph, matching a full rebuild', async () => {
    const dir = await makeProject({
      'src/util.ts': 'export function helper() { return 1; }\n',
      'src/main.ts': "import { helper } from './util.js';\nexport function run() { return helper(); }\n",
      'src/gone.ts': 'export function doomed() { return 0; }\n',
    });
    const opts = { outputDir: path.join(dir, '.coderef'), languages: ['ts'], mode: 'minimal' as const };
    await new PipelineOrchestrator().run(dir, opts);

    // Delete gone.ts on disk, then run incremental with it in deletedFiles.
    await fs.rm(path.join(dir, 'src', 'gone.ts'));
    const incState = await new PipelineOrchestrator().runIncremental(
      dir, [], opts, [path.join(dir, 'src', 'gone.ts')],
    );
    const fullState = await new PipelineOrchestrator().run(dir, opts);

    expect(incState.graph.nodes.some(n => n.name === 'doomed')).toBe(false);
    expect(resolvedEdgeSignature(incState.graph)).toEqual(resolvedEdgeSignature(fullState.graph));
  }, 60_000);
});
