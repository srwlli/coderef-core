/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability scip-overlay-no-regress-proof
 */

/**
 * Unit + no-regress coverage for the LIVE SCIP resolution overlay
 * (WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 2, STUB-BQQJSY).
 *
 * The overlay contract (scip-overlay.ts, post the phase-2 /discover ruling —
 * option C):
 *   - flips ONLY unresolved / ambiguous CALL edges → resolved with SCIP
 *     provenance (evidence.kind:'scip', scipSymbol, confidence:'provisional',
 *     reason:'scip_resolved', candidates cleared, tier recomputed → 'heuristic')
 *     AND ONLY when the reference's symbol maps — via its SCIP definition
 *     occurrence — to exactly ONE graph node, whose real id is stamped as
 *     `targetId` (GI-3/GI-2 by construction);
 *   - a reference with no unique symbol→node mapping flips NOTHING and is
 *     counted in `no_target_mapping`;
 *   - SCIP `local N` monikers are document-scoped — they never bind across
 *     documents;
 *   - NEVER touches an already-resolved edge (no-regress by construction);
 *   - NEVER invents an edge from a SCIP occurrence with no co-located CodeRef
 *     edge (the delta's `absent` class);
 *   - a null / empty index flips nothing and returns zeroed no_data stats —
 *     byte-identical to the no-`--scip` path.
 *
 * These tests operate DIRECTLY on the pure applyScipOverlay function with
 * hand-built ExportedGraph + ScipIndexShape objects — no filesystem, no I/O.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyScipOverlay } from '../../src/pipeline/scip-overlay.js';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import { toRepoRelativePosix } from '../../src/utils/path-normalize.js';
import type { ScipIndexShape } from '../../src/pipeline/types.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

const ROOT = path.join('C:', 'Users', 'x', 'repo');

/** The default test symbol + its definition coordinates (src/lib.ts line 3). */
const SYM = 'scip go typescript . `helper`().';
const DEF_SEGS = ['src', 'lib.ts'];
const DEF_LINE = 3; // 1-indexed node line; the SCIP def range uses DEF_LINE - 1
const DEF_NODE_ID = '@Fn/src/lib.ts#helper:3';

/** Build a minimal in-repo absolute source path (graph edge form). */
function absFile(...segs: string[]): string {
  return path.join(ROOT, ...segs);
}

/** Repo-relative SCIP relativePath with the host's native separator. */
function scipRel(...segs: string[]): string {
  return segs.join(path.sep);
}

/** The graph node SYM's definition occurrence maps onto. */
function defNode(
  over: Partial<ExportedGraph['nodes'][number]> = {},
): ExportedGraph['nodes'][number] {
  return {
    id: DEF_NODE_ID,
    type: 'function',
    name: 'helper',
    file: absFile(...DEF_SEGS),
    line: DEF_LINE,
    ...over,
  };
}

/** Minimal ExportedGraph edge; legacy source/target/type filled to satisfy the type. */
function edge(over: Partial<ExportedGraph['edges'][number]>): ExportedGraph['edges'][number] {
  return {
    id: over.id ?? 'e0',
    sourceId: over.sourceId ?? 'src#0',
    relationship: 'call',
    resolutionStatus: 'unresolved',
    reason: 'receiver_not_in_symbol_table',
    sourceLocation: { file: absFile('src', 'main.ts'), line: 10 },
    // legacy compat (required):
    source: over.source ?? 'src#0',
    target: over.target ?? '',
    type: over.type ?? 'call',
    ...over,
  };
}

/** Minimal ExportedGraph wrapping the given edges (+ optional nodes). */
function graphOf(
  edges: ExportedGraph['edges'],
  nodes: ExportedGraph['nodes'] = [],
): ExportedGraph {
  return {
    version: '1.0.0',
    exportedAt: 0,
    nodes,
    edges,
    statistics: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      edgesByType: {},
      densityRatio: 0,
    },
  };
}

/**
 * A SCIP index with one REFERENCE occurrence at (relPath, 0-indexed line) plus
 * the symbol's DEFINITION occurrence in src/lib.ts at DEF_LINE — pair it with
 * a graph carrying defNode() for a mappable, flippable setup.
 */
function scipRef(relPath: string, zeroIndexedLine: number, symbol = SYM): ScipIndexShape {
  return {
    documents: [
      {
        relativePath: relPath,
        occurrences: [
          { range: [zeroIndexedLine, 0, zeroIndexedLine, 6], symbol, isDefinition: false },
        ],
      },
      {
        relativePath: scipRel(...DEF_SEGS),
        occurrences: [
          { range: [DEF_LINE - 1, 0, DEF_LINE - 1, 6], symbol, isDefinition: true },
        ],
      },
    ],
  };
}

describe('applyScipOverlay — no-data / absence', () => {
  it('returns zeroed no_data stats and mutates nothing for a null index', () => {
    const g = graphOf([edge({ resolutionStatus: 'unresolved' })]);
    const before = JSON.stringify(g);
    const stats = applyScipOverlay(g, null, ROOT);
    expect(stats.no_data).toBe(true);
    expect(stats.flipped_total).toBe(0);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('returns zeroed no_data stats for an undefined index', () => {
    const g = graphOf([edge({ resolutionStatus: 'unresolved' })]);
    const before = JSON.stringify(g);
    const stats = applyScipOverlay(g, undefined, ROOT);
    expect(stats.no_data).toBe(true);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('returns zeroed no_data stats for an empty-documents index', () => {
    const g = graphOf([edge({ resolutionStatus: 'unresolved' })]);
    const before = JSON.stringify(g);
    const stats = applyScipOverlay(g, { documents: [] }, ROOT);
    expect(stats.no_data).toBe(true);
    expect(JSON.stringify(g)).toBe(before);
  });
});

describe('applyScipOverlay — flips unresolved → resolved with SCIP provenance', () => {
  it('flips a co-located unresolved edge, stamps the mapped node id as targetId + heuristic tier', () => {
    // edge at line 10 (1-indexed); SCIP occurrence at 0-indexed line 9 → 1-indexed 10.
    const g = graphOf(
      [
        edge({
          id: 'e1',
          resolutionStatus: 'unresolved',
          sourceLocation: { file: absFile('src', 'main.ts'), line: 10 },
        }),
      ],
      [defNode()],
    );
    const stats = applyScipOverlay(g, scipRef(scipRel('src', 'main.ts'), 9), ROOT);

    expect(stats.no_data).toBe(false);
    expect(stats.flipped_unresolved).toBe(1);
    expect(stats.flipped_ambiguous).toBe(0);
    expect(stats.flipped_total).toBe(1);
    expect(stats.no_target_mapping).toBe(0);

    const e = g.edges[0];
    expect(e.resolutionStatus).toBe('resolved');
    expect(e.reason).toBe('scip_resolved');
    expect(e.evidence?.kind).toBe('scip');
    expect(e.evidence?.confidence).toBe('provisional');
    expect(typeof e.evidence?.scipSymbol).toBe('string');
    // Honest provenance band: the def-site → node join is positional.
    expect(e.confidence).toBe('heuristic');
    // The REAL mapped node id — GI-3 (defined) and GI-2 (in node set) hold.
    expect(e.targetId).toBe(DEF_NODE_ID);
    // candidates cleared on a now-resolved edge.
    expect(e.candidates).toBeUndefined();
  });

  it('preserves prior evidence keys while stamping SCIP provenance', () => {
    const g = graphOf(
      [
        edge({
          id: 'e2',
          resolutionStatus: 'unresolved',
          evidence: { originSpecifier: './helper', priorKey: 'keep-me' },
          sourceLocation: { file: absFile('src', 'main.ts'), line: 5 },
        }),
      ],
      [defNode()],
    );
    applyScipOverlay(g, scipRef(scipRel('src', 'main.ts'), 4), ROOT);
    const e = g.edges[0];
    expect(e.evidence?.priorKey).toBe('keep-me');
    expect(e.evidence?.originSpecifier).toBe('./helper');
    expect(e.evidence?.kind).toBe('scip');
    expect(e.targetId).toBe(DEF_NODE_ID);
  });

  it('flips an ambiguous edge and counts it as flipped_ambiguous', () => {
    const g = graphOf(
      [
        edge({
          id: 'e3',
          resolutionStatus: 'ambiguous',
          candidates: ['a#1', 'b#2'],
          sourceLocation: { file: absFile('src', 'main.ts'), line: 7 },
        }),
      ],
      [defNode()],
    );
    const stats = applyScipOverlay(g, scipRef(scipRel('src', 'main.ts'), 6), ROOT);
    expect(stats.flipped_ambiguous).toBe(1);
    expect(stats.flipped_unresolved).toBe(0);
    expect(g.edges[0].resolutionStatus).toBe('resolved');
    expect(g.edges[0].targetId).toBe(DEF_NODE_ID);
    expect(g.edges[0].candidates).toBeUndefined();
  });
});

describe('applyScipOverlay — target mapping guards (no mapping ⇒ no flip)', () => {
  it('does NOT flip when the symbol has no definition occurrence in the index', () => {
    const g = graphOf(
      [
        edge({
          id: 'nm1',
          resolutionStatus: 'unresolved',
          sourceLocation: { file: absFile('src', 'main.ts'), line: 10 },
        }),
      ],
      [defNode()],
    );
    // Reference only — the index carries no definition for SYM.
    const scip: ScipIndexShape = {
      documents: [
        {
          relativePath: scipRel('src', 'main.ts'),
          occurrences: [{ range: [9, 0, 9, 6], symbol: SYM, isDefinition: false }],
        },
      ],
    };
    const before = JSON.stringify(g);
    const stats = applyScipOverlay(g, scip, ROOT);
    expect(stats.flipped_total).toBe(0);
    expect(stats.no_target_mapping).toBe(1);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('does NOT flip when no graph node sits at the definition site', () => {
    // Definition exists in the index, but the graph has NO node at src/lib.ts:3.
    const g = graphOf(
      [
        edge({
          id: 'nm2',
          resolutionStatus: 'unresolved',
          sourceLocation: { file: absFile('src', 'main.ts'), line: 10 },
        }),
      ],
      [], // no nodes at all
    );
    const before = JSON.stringify(g);
    const stats = applyScipOverlay(g, scipRef(scipRel('src', 'main.ts'), 9), ROOT);
    expect(stats.flipped_total).toBe(0);
    expect(stats.no_target_mapping).toBe(1);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('does NOT flip when TWO distinct nodes share the definition site (ambiguous mapping)', () => {
    const g = graphOf(
      [
        edge({
          id: 'nm3',
          resolutionStatus: 'unresolved',
          sourceLocation: { file: absFile('src', 'main.ts'), line: 10 },
        }),
      ],
      [defNode(), defNode({ id: '@Fn/src/lib.ts#other:3', name: 'other' })],
    );
    const stats = applyScipOverlay(g, scipRef(scipRel('src', 'main.ts'), 9), ROOT);
    expect(stats.flipped_total).toBe(0);
    expect(stats.no_target_mapping).toBe(1);
    expect(g.edges[0].resolutionStatus).toBe('unresolved');
  });

  it("does NOT bind a `local N` symbol across documents (SCIP local scoping)", () => {
    // `local 5` DEFINED in src/lib.ts (with a node there); a reference using
    // the same `local 5` string in src/main.ts is a DIFFERENT symbol per the
    // SCIP spec — it must not map to lib.ts's node.
    const g = graphOf(
      [
        edge({
          id: 'nm4',
          resolutionStatus: 'unresolved',
          sourceLocation: { file: absFile('src', 'main.ts'), line: 10 },
        }),
      ],
      [defNode()],
    );
    const scip: ScipIndexShape = {
      documents: [
        {
          relativePath: scipRel('src', 'lib.ts'),
          occurrences: [
            { range: [DEF_LINE - 1, 0, DEF_LINE - 1, 6], symbol: 'local 5', isDefinition: true },
          ],
        },
        {
          relativePath: scipRel('src', 'main.ts'),
          occurrences: [{ range: [9, 0, 9, 6], symbol: 'local 5', isDefinition: false }],
        },
      ],
    };
    const stats = applyScipOverlay(g, scip, ROOT);
    expect(stats.flipped_total).toBe(0);
    expect(stats.no_target_mapping).toBe(1);
    expect(g.edges[0].resolutionStatus).toBe('unresolved');
  });
});

describe('applyScipOverlay — no-regress: never touch resolved, never invent', () => {
  it('leaves an already-resolved co-located edge byte-identical', () => {
    const resolved = edge({
      id: 'e4',
      resolutionStatus: 'resolved',
      targetId: 'helper#1',
      reason: 'exact_match',
      confidence: 'exact',
      sourceLocation: { file: absFile('src', 'main.ts'), line: 3 },
    });
    const g = graphOf([resolved], [defNode()]);
    const snapshot = JSON.stringify(resolved);
    const stats = applyScipOverlay(g, scipRef(scipRel('src', 'main.ts'), 2), ROOT);

    expect(stats.flipped_total).toBe(0);
    expect(stats.already_resolved).toBe(1);
    expect(JSON.stringify(g.edges[0])).toBe(snapshot);
    // The baseline resolved edge is untouched: targetId present, tier exact.
    expect(g.edges[0].targetId).toBe('helper#1');
    expect(g.edges[0].confidence).toBe('exact');
  });

  it('does NOT invent a flip from a SCIP occurrence with no co-located edge (absent class)', () => {
    // graph edge at line 10; SCIP occurrence at a DIFFERENT line (20) and a
    // DIFFERENT file — neither co-locates, so nothing flips.
    const g = graphOf([
      edge({ id: 'e5', resolutionStatus: 'unresolved', sourceLocation: { file: absFile('src', 'main.ts'), line: 10 } }),
    ]);
    const scip: ScipIndexShape = {
      documents: [
        { relativePath: scipRel('src', 'main.ts'), occurrences: [{ range: [19, 0, 19, 6], symbol: 's', isDefinition: false }] },
        { relativePath: scipRel('src', 'other.ts'), occurrences: [{ range: [9, 0, 9, 6], symbol: 's', isDefinition: false }] },
      ],
    };
    const before = JSON.stringify(g);
    const stats = applyScipOverlay(g, scip, ROOT);
    expect(stats.flipped_total).toBe(0);
    expect(JSON.stringify(g)).toBe(before);
    expect(g.edges).toHaveLength(1); // no edge invented
  });

  it('ignores SCIP definition occurrences (only references drive flips)', () => {
    const g = graphOf(
      [
        edge({ id: 'e6', resolutionStatus: 'unresolved', sourceLocation: { file: absFile('src', 'main.ts'), line: 4 } }),
      ],
      [defNode({ file: absFile('src', 'main.ts'), line: 4, id: '@Fn/src/main.ts#x:4' })],
    );
    const scip: ScipIndexShape = {
      documents: [
        {
          relativePath: scipRel('src', 'main.ts'),
          occurrences: [{ range: [3, 0, 3, 6], symbol: 's', isDefinition: true }],
        },
      ],
    };
    const stats = applyScipOverlay(g, scip, ROOT);
    expect(stats.flipped_total).toBe(0);
    expect(g.edges[0].resolutionStatus).toBe('unresolved');
  });

  it('never flips a builtin/external/typeOnly/dynamic edge (only unresolved/ambiguous)', () => {
    for (const status of ['builtin', 'external', 'typeOnly', 'dynamic', 'stale'] as const) {
      const g = graphOf(
        [
          edge({ id: `e-${status}`, resolutionStatus: status, sourceLocation: { file: absFile('src', 'main.ts'), line: 8 } }),
        ],
        [defNode()],
      );
      const before = JSON.stringify(g);
      const stats = applyScipOverlay(g, scipRef(scipRel('src', 'main.ts'), 7), ROOT);
      expect(stats.flipped_total).toBe(0);
      expect(JSON.stringify(g)).toBe(before);
    }
  });
});

describe('applyScipOverlay — precedence + double-count guards', () => {
  it('prefers the resolved edge when a resolved and an unresolved edge share a site', () => {
    // Two edges at the same (file, line): one already resolved, one unresolved.
    // The site is "already resolved" → the unresolved edge is NOT flipped
    // (mirrors the delta's prefer-resolved precedence; no-regress).
    const loc = { file: absFile('src', 'main.ts'), line: 12 };
    const resolved = edge({ id: 'r', resolutionStatus: 'resolved', targetId: 't#1', confidence: 'exact', sourceLocation: loc });
    const unresolved = edge({ id: 'u', resolutionStatus: 'unresolved', sourceLocation: loc });
    const g = graphOf([resolved, unresolved], [defNode()]);
    const stats = applyScipOverlay(g, scipRef(scipRel('src', 'main.ts'), 11), ROOT);

    expect(stats.flipped_total).toBe(0);
    expect(stats.already_resolved).toBeGreaterThanOrEqual(1);
    expect(g.edges.find(e => e.id === 'u')!.resolutionStatus).toBe('unresolved');
    expect(g.edges.find(e => e.id === 'r')!.resolutionStatus).toBe('resolved');
  });

  it('flips a site at most once even with two SCIP references at that site', () => {
    const g = graphOf(
      [
        edge({ id: 'e7', resolutionStatus: 'unresolved', sourceLocation: { file: absFile('src', 'main.ts'), line: 6 } }),
      ],
      [defNode()],
    );
    // Both references use SYM (defined in src/lib.ts → defNode). The first
    // flips the edge; the second sees a now-resolved site.
    const scip: ScipIndexShape = {
      documents: [
        {
          relativePath: scipRel('src', 'main.ts'),
          occurrences: [
            { range: [5, 0, 5, 6], symbol: SYM, isDefinition: false },
            { range: [5, 8, 5, 14], symbol: SYM, isDefinition: false },
          ],
        },
        {
          relativePath: scipRel(...DEF_SEGS),
          occurrences: [
            { range: [DEF_LINE - 1, 0, DEF_LINE - 1, 6], symbol: SYM, isDefinition: true },
          ],
        },
      ],
    };
    const stats = applyScipOverlay(g, scip, ROOT);
    expect(stats.flipped_total).toBe(1); // flipped once
    expect(stats.already_resolved).toBe(1); // second occurrence sees a now-resolved edge
    expect(g.edges[0].resolutionStatus).toBe('resolved');
    expect(g.edges[0].targetId).toBe(DEF_NODE_ID);
  });
});

describe('applyScipOverlay — B-3 path co-location', () => {
  it('matches an ABSOLUTE graph path against a repo-RELATIVE SCIP path (the B-3 collapse)', () => {
    // The whole point of the B-3 normalizer: graph edges carry absolute
    // sourceLocation.file; SCIP carries repo-relative relativePath. Without the
    // normalizer these never match. With it, they co-locate and the flip lands.
    // The NODE side goes through the same normalizer (absolute node.file vs the
    // definition document's relative path).
    const g = graphOf(
      [
        edge({
          id: 'e8',
          resolutionStatus: 'unresolved',
          sourceLocation: { file: absFile('src', 'pipeline', 'x.ts'), line: 42 },
        }),
      ],
      [defNode()],
    );
    const stats = applyScipOverlay(g, scipRef(scipRel('src', 'pipeline', 'x.ts'), 41), ROOT);
    expect(stats.flipped_total).toBe(1);
    expect(g.edges[0].resolutionStatus).toBe('resolved');
    expect(g.edges[0].targetId).toBe(DEF_NODE_ID);
  });
});

/**
 * End-to-end no-regress proof (plan.json P2-T5 parts a + b), driven through the
 * real PipelineOrchestrator over a tiny on-disk fixture:
 *   (a) WITHOUT scipIndex → the emitted graph is byte-identical (the guard
 *       `if (options.scipIndex)` never even calls the overlay).
 *   (b) WITH a scipIndex whose reference targets an unresolved call's exact
 *       (file, line) and whose definition occurrence lands on a REAL baseline
 *       node → every baseline resolved edge is byte-identical, resolved count
 *       is strictly >= baseline, and the targeted edge now carries
 *       evidence.kind 'scip' + that node's real id as targetId. Coordinates are
 *       DERIVED from the baseline graph (not hard-coded) so the proof is robust
 *       to fixture drift.
 */
describe('applyScipOverlay — orchestrator end-to-end no-regress (plan.json a+b)', () => {
  const created: string[] = [];
  afterEach(async () => {
    await Promise.all(created.splice(0).map(d => fs.rm(d, { recursive: true, force: true })));
  });

  /** A fixture with a guaranteed unresolved call (notDefined()) + a resolved one. */
  async function makeFixture(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-scip-overlay-'));
    created.push(dir);
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(dir, 'src', 'helper.ts'),
      'export function helperFn() { return 1; }\n',
      'utf-8',
    );
    await fs.writeFile(
      path.join(dir, 'src', 'main.ts'),
      [
        "import { helperFn } from './helper';",
        'export function run() {',
        '  helperFn();',
        '  notDefined();',
        '  return 1;',
        '}',
        '',
      ].join('\n'),
      'utf-8',
    );
    return dir;
  }

  /** Stable identity of a resolved edge for set-comparison. */
  function resolvedKey(e: ExportedGraph['edges'][number]): string {
    return JSON.stringify([e.id, e.sourceId, e.targetId, e.resolutionStatus, e.reason, e.confidence]);
  }

  it('(a) without scipIndex the graph is byte-identical to the baseline run', async () => {
    const dir = await makeFixture();
    const opts = { outputDir: path.join(dir, '.coderef'), languages: ['ts'] as const, mode: 'minimal' as const };

    const baseline = await new PipelineOrchestrator().run(dir, { ...opts });
    const noScip = await new PipelineOrchestrator().run(dir, { ...opts });

    // exportedAt is a timestamp; compare the edge/node substance, not the clock.
    const strip = (g: ExportedGraph) => JSON.stringify({ nodes: g.nodes, edges: g.edges, statistics: g.statistics });
    expect(strip(noScip.graph)).toBe(strip(baseline.graph));
  });

  it('(b) with scipIndex targeting an unresolved call: resolved edges preserved, target flips to scip with a real node targetId', async () => {
    const dir = await makeFixture();
    const opts = { outputDir: path.join(dir, '.coderef'), languages: ['ts'] as const, mode: 'minimal' as const };

    // Baseline (no overlay).
    const baseline = await new PipelineOrchestrator().run(dir, { ...opts });
    const baselineEdges = baseline.graph.edges;
    const baselineResolved = baselineEdges.filter(e => e.resolutionStatus === 'resolved');
    const baselineResolvedKeys = baselineResolved.map(resolvedKey).sort();

    // Find an unresolved CALL edge to target with a synthetic SCIP occurrence.
    const target = baselineEdges.find(
      e => e.resolutionStatus === 'unresolved' && e.relationship === 'call' && e.sourceLocation,
    );
    expect(target, 'fixture must produce an unresolved call edge').toBeTruthy();
    const loc = target!.sourceLocation!;

    // Pick a REAL baseline node to serve as the SCIP definition site — the
    // overlay must map the symbol's definition occurrence onto this node and
    // stamp its id as the flipped edge's targetId. The node must be ALONE at
    // its (file, line) site, or the overlay's ambiguous-mapping guard would
    // (correctly) refuse to map it.
    const siteOf = (n: ExportedGraph['nodes'][number]) =>
      `${toRepoRelativePosix(n.file!, dir)}:${n.line}`;
    const located = baseline.graph.nodes.filter(
      n => typeof n.file === 'string' && typeof n.line === 'number',
    );
    const siteCounts = new Map<string, number>();
    for (const n of located) siteCounts.set(siteOf(n), (siteCounts.get(siteOf(n)) ?? 0) + 1);
    const defTarget = located.find(n => siteCounts.get(siteOf(n)) === 1);
    expect(defTarget, 'fixture must produce a node alone at its file:line site').toBeTruthy();

    // Build a SCIP index whose reference occurrence co-locates with that edge
    // and whose definition occurrence co-locates with the chosen node. Ranges
    // are 0-indexed so line - 1.
    const scipSymbol = 'scip typescript . notDefined().';
    const scipIndex: ScipIndexShape = {
      documents: [
        {
          relativePath: toRepoRelativePosix(loc.file, dir),
          occurrences: [
            { range: [loc.line - 1, 0, loc.line - 1, 8], symbol: scipSymbol, isDefinition: false },
          ],
        },
        {
          relativePath: toRepoRelativePosix(defTarget!.file!, dir),
          occurrences: [
            { range: [defTarget!.line! - 1, 0, defTarget!.line! - 1, 8], symbol: scipSymbol, isDefinition: true },
          ],
        },
      ],
    };

    const withScip = await new PipelineOrchestrator().run(dir, { ...opts, scipIndex });
    const afterEdges = withScip.graph.edges;
    const afterResolved = afterEdges.filter(e => e.resolutionStatus === 'resolved');

    // (b1) resolved count is strictly >= baseline (the overlay only ever raises).
    expect(afterResolved.length).toBeGreaterThanOrEqual(baselineResolved.length);

    // (b2) every baseline resolved edge is still present and unchanged — no
    // regression. Each baseline resolved key must still appear post-overlay.
    const afterKeys = new Set(afterEdges.filter(e => e.resolutionStatus === 'resolved').map(resolvedKey));
    for (const k of baselineResolvedKeys) {
      expect(afterKeys.has(k), `baseline resolved edge must survive overlay: ${k}`).toBe(true);
    }

    // (b3) the targeted edge flipped to resolved with SCIP provenance and a
    // REAL node id as targetId (GI-3 + GI-2 hold on the emitted graph).
    const flipped = afterEdges.find(e => e.id === target!.id);
    expect(flipped!.resolutionStatus).toBe('resolved');
    expect(flipped!.reason).toBe('scip_resolved');
    expect(flipped!.evidence?.kind).toBe('scip');
    expect(flipped!.confidence).toBe('heuristic');
    expect(flipped!.targetId).toBe(defTarget!.id);
    const nodeIds = new Set(withScip.graph.nodes.map(n => n.id));
    expect(nodeIds.has(flipped!.targetId!)).toBe(true);
  });
});
