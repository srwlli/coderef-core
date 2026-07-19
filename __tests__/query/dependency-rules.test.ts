import { describe, it, expect } from 'vitest';
import {
  parseRulesSpec,
  projectLayerEdges,
  checkDependencyRules,
  DEPENDENCY_RULES_SCHEMA_VERSION,
  type DependencyRulesNode,
  type DependencyRulesEdge,
} from '../../src/query/dependency-rules.js';

/**
 * dependency-rules pure tests (WO-CODE-INTELLIGENCE-GENRE-FEATURES-PROGRAM-001 P7).
 * Mirrors the api-diff / layer-drift pure-projection test shape: no I/O, no git.
 * Surfaces-not-verdicts (no composite score) + absence handling are load-bearing.
 */

function node(id: string, layer: string | undefined, file?: string): DependencyRulesNode {
  return { id, file: file ?? id, metadata: layer ? { layer } : null };
}
function edge(source: string, target: string, weight?: number): DependencyRulesEdge {
  return { source, target, weight };
}

describe('parseRulesSpec', () => {
  it('parses forbid + allow pairs', () => {
    const spec = parseRulesSpec({ forbid: [{ from: 'service', to: 'cli' }], allow: [{ from: 'cli', to: 'service' }] });
    expect(spec.forbid).toEqual([{ from: 'service', to: 'cli' }]);
    expect(spec.allow).toEqual([{ from: 'cli', to: 'service' }]);
    expect(spec.warnings).toEqual([]);
  });

  it('accepts snake_case aliases (forbidden/allowed)', () => {
    const spec = parseRulesSpec({ forbidden: [{ from: 'a', to: 'b' }], allowed: [{ from: 'c', to: 'd' }] });
    expect(spec.forbid).toEqual([{ from: 'a', to: 'b' }]);
    expect(spec.allow).toEqual([{ from: 'c', to: 'd' }]);
  });

  it('never throws on a malformed shape — warns and drops bad entries', () => {
    const spec = parseRulesSpec({ forbid: [{ from: 'ok', to: 'ok2' }, { from: 42 }, 'nope'] });
    expect(spec.forbid).toEqual([{ from: 'ok', to: 'ok2' }]);
    expect(spec.warnings.length).toBe(2);
  });

  it('non-object input is treated as empty with a warning', () => {
    const spec = parseRulesSpec('not an object');
    expect(spec.forbid).toEqual([]);
    expect(spec.allow).toEqual([]);
    expect(spec.warnings.length).toBe(1);
  });
});

describe('projectLayerEdges', () => {
  const nodes = [node('a', 'service'), node('b', 'cli'), node('c', 'service'), node('u', undefined)];

  it('aggregates distinct layer-pair edges with counts + samples', () => {
    const edges = [edge('a', 'b'), edge('c', 'b'), edge('b', 'a')];
    const le = projectLayerEdges(nodes, edges);
    const svcToCli = le.find(e => e.sourceLayer === 'service' && e.targetLayer === 'cli')!;
    expect(svcToCli.edgeCount).toBe(2);
    expect(svcToCli.sampleEdges.length).toBe(2);
    const cliToSvc = le.find(e => e.sourceLayer === 'cli' && e.targetLayer === 'service')!;
    expect(cliToSvc.edgeCount).toBe(1);
  });

  it('ignores edges touching an unlayered or missing endpoint', () => {
    const edges = [edge('a', 'u'), edge('a', ''), edge('a', 'missing')];
    const le = projectLayerEdges(nodes, edges);
    expect(le).toEqual([]);
  });

  it('is sorted by (sourceLayer, targetLayer)', () => {
    const edges = [edge('b', 'a'), edge('a', 'b')];
    const le = projectLayerEdges(nodes, edges);
    expect(le.map(e => `${e.sourceLayer}->${e.targetLayer}`)).toEqual(['cli->service', 'service->cli']);
  });
});

describe('checkDependencyRules', () => {
  const nodes = [node('a', 'service'), node('b', 'cli'), node('c', 'domain')];

  it('forbid rule with a matching observed edge -> violated, edge named', () => {
    const layerEdges = projectLayerEdges(nodes, [edge('a', 'b')]); // service -> cli
    const spec = parseRulesSpec({ forbid: [{ from: 'service', to: 'cli' }] });
    const report = checkDependencyRules({ rules: spec, layerEdges });
    expect(report.violatedCount).toBe(1);
    const r = report.rules[0];
    expect(r.status).toBe('violated');
    expect(r.violatingEdges[0].sourceLayer).toBe('service');
    expect(r.violatingEdges[0].targetLayer).toBe('cli');
    expect(report.schemaVersion).toBe(DEPENDENCY_RULES_SCHEMA_VERSION);
  });

  it('forbid rule with no matching edge -> satisfied', () => {
    const layerEdges = projectLayerEdges(nodes, [edge('b', 'a')]); // cli -> service
    const spec = parseRulesSpec({ forbid: [{ from: 'service', to: 'cli' }] });
    const report = checkDependencyRules({ rules: spec, layerEdges });
    expect(report.rules[0].status).toBe('satisfied');
    expect(report.violatedCount).toBe(0);
  });

  it('forbid rule whose layers are absent -> not_applicable', () => {
    const layerEdges = projectLayerEdges(nodes, [edge('b', 'a')]); // only cli+service present
    const spec = parseRulesSpec({ forbid: [{ from: 'parser', to: 'formatter' }] });
    const report = checkDependencyRules({ rules: spec, layerEdges });
    expect(report.rules[0].status).toBe('not_applicable');
    expect(report.notApplicableCount).toBe(1);
  });

  it('allow-list violation: a source-layer edge to a disallowed target -> violated', () => {
    // cli depends on service (allowed) AND domain (NOT in allow-set) -> violation.
    const layerEdges = projectLayerEdges(nodes, [edge('b', 'a'), edge('b', 'c')]);
    const spec = parseRulesSpec({ allow: [{ from: 'cli', to: 'service' }] });
    const report = checkDependencyRules({ rules: spec, layerEdges });
    const r = report.rules[0];
    expect(r.status).toBe('violated');
    expect(r.violatingEdges.some(e => e.targetLayer === 'domain')).toBe(true);
    expect(r.violatingEdges.some(e => e.targetLayer === 'service')).toBe(false);
  });

  it('allow rule for a layer with no outbound edges -> not_applicable', () => {
    const layerEdges = projectLayerEdges(nodes, [edge('b', 'a')]); // only cli has outbound
    const spec = parseRulesSpec({ allow: [{ from: 'domain', to: 'service' }] });
    const report = checkDependencyRules({ rules: spec, layerEdges });
    expect(report.rules[0].status).toBe('not_applicable');
  });

  it('is deterministic — identical inputs yield byte-identical output', () => {
    const layerEdges = projectLayerEdges(nodes, [edge('a', 'b'), edge('b', 'c')]);
    const spec = parseRulesSpec({ forbid: [{ from: 'service', to: 'cli' }, { from: 'cli', to: 'domain' }] });
    const r1 = checkDependencyRules({ rules: spec, layerEdges });
    const r2 = checkDependencyRules({ rules: spec, layerEdges });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('never emits a composite health score', () => {
    const layerEdges = projectLayerEdges(nodes, [edge('a', 'b')]);
    const spec = parseRulesSpec({ forbid: [{ from: 'service', to: 'cli' }] });
    const report = checkDependencyRules({ rules: spec, layerEdges });
    expect(report).not.toHaveProperty('score');
    expect(report).not.toHaveProperty('healthScore');
    expect(report.note).toMatch(/SURFACES, NOT VERDICTS|not a quality score/i);
  });

  it('empty rule set -> empty report, not a fabricated pass', () => {
    const layerEdges = projectLayerEdges(nodes, [edge('a', 'b')]);
    const report = checkDependencyRules({ rules: parseRulesSpec({}), layerEdges });
    expect(report.ruleCount).toBe(0);
    expect(report.violatedCount).toBe(0);
    expect(report.note).toMatch(/no rules declared/i);
  });
});
