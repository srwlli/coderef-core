/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability canonical-graph-query-test
 */

/**
 * Direction-semantics regression tests for the canonical-graph query engine
 * (WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2, P1-7).
 *
 * The retired legacy stack answered "what calls X?" with X's CALLEES
 * (inverted semantics, query-executor.ts:160-178 pre-deletion) and filtered
 * plural edge vocabulary ('calls'/'imports') against canonical singular
 * values ('call'/'import') — silent empty results. Every assertion here pins
 * the direction of one relationship so neither bug class can return.
 *
 * Fixture shape (all edges resolutionStatus='resolved' unless noted):
 *   alpha (src/a.ts) --call-->  beta (src/b.ts) --call--> gamma (src/c.ts)
 *   @File/src/a.ts   --import-> beta
 *   @File/src/b.ts   --import-> gamma
 *   @File/src/a.ts   --import-> (unresolved, no targetId)  // never traversed
 */

import { describe, it, expect } from 'vitest';
import { CanonicalGraphQuery } from '../canonical-graph.js';
import type { ExportedGraph } from '../../export/graph-exporter.js';

function fixtureGraph(): ExportedGraph {
  const nodes: ExportedGraph['nodes'] = [
    { id: '@File/src/a.ts', type: 'file', name: 'a.ts', file: 'src/a.ts' },
    { id: '@File/src/b.ts', type: 'file', name: 'b.ts', file: 'src/b.ts' },
    { id: '@File/src/c.ts', type: 'file', name: 'c.ts', file: 'src/c.ts' },
    {
      id: '@Fn/src/a.ts#alpha:1',
      type: 'function',
      name: 'alpha',
      file: 'src/a.ts',
      line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/a.ts#alpha' },
    },
    {
      id: '@Fn/src/b.ts#beta:1',
      type: 'function',
      name: 'beta',
      file: 'src/b.ts',
      line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/b.ts#beta' },
    },
    {
      id: '@Fn/src/c.ts#gamma:1',
      type: 'function',
      name: 'gamma',
      file: 'src/c.ts',
      line: 1,
      metadata: { codeRefIdNoLine: '@Fn/src/c.ts#gamma' },
    },
  ];
  const edges: ExportedGraph['edges'] = [
    {
      id: 'e1',
      sourceId: '@Fn/src/a.ts#alpha:1',
      targetId: '@Fn/src/b.ts#beta:1',
      relationship: 'call',
      resolutionStatus: 'resolved',
      source: '@Fn/src/a.ts#alpha:1',
      target: '@Fn/src/b.ts#beta:1',
      type: 'call',
    },
    {
      id: 'e2',
      sourceId: '@Fn/src/b.ts#beta:1',
      targetId: '@Fn/src/c.ts#gamma:1',
      relationship: 'call',
      resolutionStatus: 'resolved',
      source: '@Fn/src/b.ts#beta:1',
      target: '@Fn/src/c.ts#gamma:1',
      type: 'call',
    },
    {
      id: 'e3',
      sourceId: '@File/src/a.ts',
      targetId: '@Fn/src/b.ts#beta:1',
      relationship: 'import',
      resolutionStatus: 'resolved',
      source: '@File/src/a.ts',
      target: '@Fn/src/b.ts#beta:1',
      type: 'import',
    },
    {
      id: 'e4',
      sourceId: '@File/src/b.ts',
      targetId: '@Fn/src/c.ts#gamma:1',
      relationship: 'import',
      resolutionStatus: 'resolved',
      source: '@File/src/b.ts',
      target: '@Fn/src/c.ts#gamma:1',
      type: 'import',
    },
    {
      id: 'e5',
      sourceId: '@File/src/a.ts',
      relationship: 'import',
      resolutionStatus: 'unresolved',
      reason: 'relative_target_not_in_project',
      source: '@File/src/a.ts',
      target: '',
      type: 'import',
    },
  ];
  return {
    version: '1.0.0',
    exportedAt: 0,
    nodes,
    edges,
    statistics: { nodeCount: nodes.length, edgeCount: edges.length, edgesByType: {}, densityRatio: 0 },
  };
}

describe('CanonicalGraphQuery direction semantics', () => {
  const q = new CanonicalGraphQuery(fixtureGraph());

  it('resolves by exact name, codeRefIdNoLine, and file path', () => {
    expect(q.resolve('beta').nodes.map(n => n.id)).toEqual(['@Fn/src/b.ts#beta:1']);
    expect(q.resolve('@Fn/src/b.ts#beta').nodes.map(n => n.id)).toEqual(['@Fn/src/b.ts#beta:1']);
    const byFile = q.resolve('src/b.ts');
    expect(byFile.byFile).toBe(true);
    expect(byFile.nodes.map(n => n.id)).toContain('@Fn/src/b.ts#beta:1');
    // Windows spelling resolves to the same file
    expect(q.resolve('src\\b.ts').byFile).toBe(true);
  });

  it('callersOf(beta) returns alpha — INBOUND, never the callee (legacy inversion regression)', () => {
    const callers = q.callersOf(q.resolve('beta')).map(n => n.name);
    expect(callers).toContain('alpha');
    expect(callers).not.toContain('gamma');
  });

  it('calleesOf(beta) returns gamma — OUTBOUND, never the caller', () => {
    const callees = q.calleesOf(q.resolve('beta')).map(n => n.name);
    expect(callees).toContain('gamma');
    expect(callees).not.toContain('alpha');
  });

  it('importersOf(beta) returns the importing FILE a.ts (inbound, file-grain)', () => {
    const importers = q.importersOf(q.resolve('beta')).map(n => n.id);
    expect(importers).toContain('@File/src/a.ts');
    expect(importers).not.toContain('@File/src/b.ts');
  });

  it('importsOf(src/a.ts) returns beta (outbound) and never traverses the unresolved edge', () => {
    const imports = q.importsOf(q.resolve('src/a.ts')).map(n => n.name);
    expect(imports).toContain('beta');
    expect(imports).not.toContain('gamma');
  });

  it('dependentsOf(gamma) walks INBOUND transitively: beta directly, alpha via beta', () => {
    const dependents = q.dependentsOf(q.resolve('gamma'), 5).map(n => n.name);
    expect(dependents).toContain('beta');
    expect(dependents).toContain('alpha');
    expect(dependents).not.toContain('gamma');
  });

  it('dependenciesOf(alpha) walks OUTBOUND transitively: beta directly, gamma via beta', () => {
    const dependencies = q.dependenciesOf(q.resolve('alpha'), 5).map(n => n.name);
    expect(dependencies).toContain('beta');
    expect(dependencies).toContain('gamma');
    expect(dependencies).not.toContain('alpha');
  });

  it('dependentsOf and dependenciesOf are not mirror images (direction is load-bearing)', () => {
    const dependentsOfAlpha = q.dependentsOf(q.resolve('alpha'), 5).map(n => n.name);
    expect(dependentsOfAlpha).not.toContain('beta');
    expect(dependentsOfAlpha).not.toContain('gamma');
  });

  it('shortestPath(alpha -> gamma) finds the 2-hop call chain', () => {
    const result = q.shortestPath(q.resolve('alpha'), q.resolve('gamma'));
    expect(result.found).toBe(true);
    const names = result.path.map(n => n.name);
    expect(names[0]).toBe('alpha');
    expect(names[names.length - 1]).toBe('gamma');
  });

  it('shortestPath(gamma -> alpha) does NOT exist (edges are directed)', () => {
    const result = q.shortestPath(q.resolve('gamma'), q.resolve('alpha'));
    expect(result.found).toBe(false);
  });

  it('allPaths(alpha -> gamma) returns at least one path ending at gamma', () => {
    const results = q.allPaths(q.resolve('alpha'), q.resolve('gamma'), 6);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.path[r.path.length - 1].name).toBe('gamma');
    }
  });
});
