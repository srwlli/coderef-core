/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-go-graph-ground-truth-test
 */

/**
 * Go graph ground-truth (WO-AGENT-NATIVE-CAPABILITY-GAPS-001 P6).
 *
 * Proves Go is now a REAL call+import+export graph (not scan-only). Mirrors
 * __tests__/pipeline/graph-ground-truth.test.ts: known Go call/import/export
 * edges resolve to node-id endpoints; an unknown (stdlib) call is an explicit
 * unresolved fact; a duplicate top-level name resolves as ambiguous with
 * candidates. Resolver discipline holds — nothing is guessed (RISK-03).
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';

type GraphEdge = ExportedGraph['edges'][number];

const created: string[] = [];

async function makeGoProject(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-go-gt-'));
  created.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, content, 'utf8');
  }
  return dir;
}

async function runGoGraph(dir: string): Promise<ExportedGraph> {
  const state = await new PipelineOrchestrator().run(dir, {
    outputDir: path.join(dir, '.coderef'),
    languages: ['go'],
    mode: 'minimal',
  });
  return state.graph;
}

function nodeIds(graph: ExportedGraph): Set<string> {
  return new Set(graph.nodes.map(n => n.id));
}

afterEach(async () => {
  while (created.length) {
    const d = created.pop()!;
    try { await fs.rm(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

describe('Go graph ground truth', () => {
  it('resolves a cross-file Go call to node-id endpoints', async () => {
    const dir = await makeGoProject({
      'util.go': 'package main\nfunc Helper(x int) int { return x + 1 }\n',
      'main.go': 'package main\nfunc Run() int { return Helper(41) }\n',
    });
    const graph = await runGoGraph(dir);

    const edge = graph.edges.find(
      e => e.relationship === 'call' && e.resolutionStatus === 'resolved' &&
        (e.evidence as { calleeName?: string } | undefined)?.calleeName === 'Helper',
    ) as GraphEdge | undefined;
    expect(edge).toBeDefined();
    const ids = nodeIds(graph);
    expect(ids.has(edge!.sourceId ?? '')).toBe(true);
    expect(ids.has(edge!.targetId ?? '')).toBe(true);
    // Run (main.go) -> Helper (util.go): a genuine cross-file resolved edge.
    expect(edge!.sourceId).toContain('Run');
    expect(edge!.targetId).toContain('Helper');
  }, 60_000);

  it('emits import + export edges for Go', async () => {
    const dir = await makeGoProject({
      'main.go': 'package main\nimport "fmt"\nfunc Run() { fmt.Println("hi") }\ntype Widget struct{ N int }\n',
    });
    const graph = await runGoGraph(dir);

    // export edges for the capitalized top-level names (Run, Widget).
    const exportTargets = graph.edges
      .filter(e => e.relationship === 'export' && e.resolutionStatus === 'resolved')
      .map(e => e.targetId ?? '');
    expect(exportTargets.some(t => t.includes('Run'))).toBe(true);
    expect(exportTargets.some(t => t.includes('Widget'))).toBe(true);

    // an import edge exists for the fmt package.
    const importEdge = graph.edges.find(
      e => e.relationship === 'import' &&
        (e.evidence as { originSpecifier?: string } | undefined)?.originSpecifier === 'fmt',
    );
    expect(importEdge).toBeDefined();
  }, 60_000);

  it('marks an unknown (stdlib) call as an explicit unresolved fact — never guessed', async () => {
    const dir = await makeGoProject({
      'main.go': 'package main\nimport "fmt"\nfunc Run() { fmt.Println("hi") }\n',
    });
    const graph = await runGoGraph(dir);

    const printlnEdge = graph.edges.find(
      e => e.relationship === 'call' &&
        (e.evidence as { calleeName?: string } | undefined)?.calleeName === 'Println',
    ) as GraphEdge | undefined;
    expect(printlnEdge).toBeDefined();
    // fmt.Println is not a project symbol → must NOT be resolved.
    expect(printlnEdge!.resolutionStatus).not.toBe('resolved');
    const reason = printlnEdge!.reason
      ?? (printlnEdge!.evidence as { reason?: string } | undefined)?.reason;
    expect(reason).toEqual(expect.any(String));
  }, 60_000);

  it('resolves a duplicate top-level Go name as ambiguous with candidates', async () => {
    const dir = await makeGoProject({
      'a.go': 'package main\nfunc Helper(x int) int { return x + 1 }\n',
      'b.go': 'package main\nfunc Helper(x int) int { return x + 2 }\n',
      'main.go': 'package main\nfunc Run() int { return Helper(41) }\n',
    });
    const graph = await runGoGraph(dir);

    const edge = graph.edges.find(
      e => e.relationship === 'call' &&
        (e.evidence as { calleeName?: string } | undefined)?.calleeName === 'Helper',
    ) as GraphEdge | undefined;
    expect(edge).toBeDefined();
    expect(edge!.resolutionStatus).toBe('ambiguous');
    const candidates =
      (edge!.evidence as { candidates?: string[] } | undefined)?.candidates ?? [];
    expect(candidates).toHaveLength(2);
    expect(candidates.some(c => c.includes('a.go'))).toBe(true);
    expect(candidates.some(c => c.includes('b.go'))).toBe(true);
  }, 60_000);

  it('does not leak Go symbols across the language-family guard', async () => {
    // A Go call to Helper must never resolve to a same-named symbol in a TS
    // file (STUB-M3GE4S). Here there is no Go Helper at all → the call stays
    // unresolved rather than binding to anything foreign.
    const dir = await makeGoProject({
      'main.go': 'package main\nfunc Run() int { return Helper(1) }\n',
    });
    const graph = await runGoGraph(dir);
    const helperCall = graph.edges.find(
      e => e.relationship === 'call' &&
        (e.evidence as { calleeName?: string } | undefined)?.calleeName === 'Helper',
    ) as GraphEdge | undefined;
    expect(helperCall).toBeDefined();
    expect(helperCall!.resolutionStatus).not.toBe('resolved');
  }, 60_000);
});
