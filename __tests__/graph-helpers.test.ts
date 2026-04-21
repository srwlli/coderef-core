/**
 * Unit Tests for Graph Query Helpers
 *
 * Tests all 4 core query functions with sample graph data:
 * - getImportsForElement()
 * - getExportsForElement()
 * - getConsumersForElement()
 * - getDependenciesForElement()
 *
 * Context: WO-RESOURCE-SHEET-GRAPH-INTEGRATION-001, GRAPH-TEST-002
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  getImportsForElement,
  getExportsForElement,
  getConsumersForElement,
  getDependenciesForElement,
  getElementCharacteristics,
  calculateAutoFillRate,
  parseNodeId,
} from '../src/analyzer/graph-helpers.js';
import { DependencyGraph } from '../src/analyzer/graph-builder.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load sample graph fixture
let sampleGraph: DependencyGraph;
let fixtureData: any;

beforeAll(() => {
  const fixturePath = join(__dirname, 'fixtures/graph-helpers-test/sample-graph.json');
  fixtureData = JSON.parse(readFileSync(fixturePath, 'utf-8'));

  // Convert JSON fixture to DependencyGraph format
  sampleGraph = {
    nodes: new Map(fixtureData.nodes.map((node: any) => [node.id, node])),
    edges: fixtureData.edges,
    edgesBySource: new Map(),
    edgesByTarget: new Map(),
  };

  // Build edgesBySource and edgesByTarget indexes
  for (const edge of fixtureData.edges) {
    // edgesBySource
    if (!sampleGraph.edgesBySource.has(edge.source)) {
      sampleGraph.edgesBySource.set(edge.source, []);
    }
    sampleGraph.edgesBySource.get(edge.source)!.push(edge);

    // edgesByTarget
    if (!sampleGraph.edgesByTarget.has(edge.target)) {
      sampleGraph.edgesByTarget.set(edge.target, []);
    }
    sampleGraph.edgesByTarget.get(edge.target)!.push(edge);
  }
});

describe('parseNodeId', () => {
  it('should parse standard nodeId format', () => {
    const result = parseNodeId('services/auth.ts:AuthService');
    expect(result).toEqual({
      name: 'AuthService',
      file: 'services/auth.ts',
    });
  });

  it('should handle nodeId with colons in name', () => {
    const result = parseNodeId('utils/test.ts:func:name:with:colons');
    expect(result).toEqual({
      name: 'func:name:with:colons',
      file: 'utils/test.ts',
    });
  });

  it('should fallback to file if no element name', () => {
    const result = parseNodeId('utils/helpers.ts');
    expect(result).toEqual({
      name: 'utils/helpers.ts',
      file: 'utils/helpers.ts',
    });
  });
});

describe('getImportsForElement', () => {
  it('should return import sources for AuthService', () => {
    const imports = getImportsForElement(sampleGraph, 'services/auth.ts:AuthService');
    const expected = fixtureData.expectedQueryResults.getImportsForElement['services/auth.ts:AuthService'];

    expect(imports).toEqual(expect.arrayContaining(expected));
    expect(imports.length).toBe(expected.length);
  });

  it('should return import sources for LoginForm', () => {
    const imports = getImportsForElement(sampleGraph, 'components/LoginForm.tsx:LoginForm');
    const expected = fixtureData.expectedQueryResults.getImportsForElement['components/LoginForm.tsx:LoginForm'];

    expect(imports).toEqual(expect.arrayContaining(expected));
    expect(imports.length).toBe(expected.length);
  });

  it('should return import sources for Dashboard', () => {
    const imports = getImportsForElement(sampleGraph, 'pages/Dashboard.tsx:Dashboard');
    const expected = fixtureData.expectedQueryResults.getImportsForElement['pages/Dashboard.tsx:Dashboard'];

    expect(imports).toEqual(expect.arrayContaining(expected));
    expect(imports.length).toBe(expected.length);
  });

  it('should return empty array for element with no imports', () => {
    const imports = getImportsForElement(sampleGraph, 'utils/classNames.ts:classNames');
    expect(imports).toEqual([]);
  });

  it('should return empty array for missing nodeId', () => {
    const imports = getImportsForElement(sampleGraph, 'nonexistent/file.ts:NonexistentElement');
    expect(imports).toEqual([]);
  });

  it('should not return duplicates', () => {
    const imports = getImportsForElement(sampleGraph, 'services/auth.ts:AuthService');
    const uniqueImports = [...new Set(imports)];
    expect(imports.length).toBe(uniqueImports.length);
  });
});

describe('getExportsForElement', () => {
  it('should return exported symbols for AuthService', () => {
    const exports = getExportsForElement(sampleGraph, 'services/auth.ts:AuthService');
    const expected = fixtureData.expectedQueryResults.getExportsForElement['services/auth.ts:AuthService'];

    expect(exports).toEqual(expect.arrayContaining(expected));
    expect(exports.length).toBe(expected.length);
  });

  it('should return exported symbols for PrimaryButton', () => {
    const exports = getExportsForElement(sampleGraph, 'components/Button.tsx:PrimaryButton');
    const expected = fixtureData.expectedQueryResults.getExportsForElement['components/Button.tsx:PrimaryButton'];

    expect(exports).toEqual(expect.arrayContaining(expected));
    expect(exports.length).toBe(expected.length);
  });

  it('should handle both named and default exports', () => {
    const exports = getExportsForElement(sampleGraph, 'hooks/useAuth.ts:useAuth');
    expect(exports).toContain('useAuth'); // Both named and default
  });

  it('should return element name as fallback if no export metadata', () => {
    // Create a test node without export metadata
    const testGraph: DependencyGraph = {
      nodes: new Map([
        ['test.ts:testFunc', { id: 'test.ts:testFunc', name: 'testFunc', type: 'function', file: 'test.ts' }],
      ]),
      edges: [],
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };

    const exports = getExportsForElement(testGraph, 'test.ts:testFunc');
    expect(exports).toEqual(['testFunc']);
  });

  it('should return empty array for missing nodeId', () => {
    const exports = getExportsForElement(sampleGraph, 'nonexistent/file.ts:NonexistentElement');
    expect(exports).toEqual([]);
  });
});

describe('getConsumersForElement', () => {
  it('should return consumers for useAuth hook', () => {
    const consumers = getConsumersForElement(sampleGraph, 'hooks/useAuth.ts:useAuth');
    const expected = fixtureData.expectedQueryResults.getConsumersForElement['hooks/useAuth.ts:useAuth'];

    expect(consumers.length).toBe(expected.length);

    // Check that all expected consumers are present
    for (const expectedConsumer of expected) {
      const found = consumers.find((c) => c.name === expectedConsumer.name && c.file === expectedConsumer.file);
      expect(found).toBeDefined();
      expect(found?.line).toBe(expectedConsumer.line);
    }
  });

  it('should return consumers for AuthService', () => {
    const consumers = getConsumersForElement(sampleGraph, 'services/auth.ts:AuthService');
    const expected = fixtureData.expectedQueryResults.getConsumersForElement['services/auth.ts:AuthService'];

    expect(consumers.length).toBe(expected.length);

    for (const expectedConsumer of expected) {
      const found = consumers.find((c) => c.name === expectedConsumer.name && c.file === expectedConsumer.file);
      expect(found).toBeDefined();
    }
  });

  it('should return empty array for element with no consumers', () => {
    const consumers = getConsumersForElement(sampleGraph, 'theme/tokens.ts:tokens');
    expect(consumers).toEqual([]);
  });

  it('should return empty array for missing nodeId', () => {
    const consumers = getConsumersForElement(sampleGraph, 'nonexistent/file.ts:NonexistentElement');
    expect(consumers).toEqual([]);
  });

  it('should not return duplicate consumers', () => {
    const consumers = getConsumersForElement(sampleGraph, 'hooks/useAuth.ts:useAuth');
    const uniqueConsumers = consumers.filter(
      (c, index, self) => self.findIndex((sc) => sc.file === c.file && sc.name === c.name) === index
    );
    expect(consumers.length).toBe(uniqueConsumers.length);
  });
});

describe('getDependenciesForElement', () => {
  it('should return dependencies for AuthService', () => {
    const deps = getDependenciesForElement(sampleGraph, 'services/auth.ts:AuthService');
    const expected = fixtureData.expectedQueryResults.getDependenciesForElement['services/auth.ts:AuthService'];

    expect(deps.length).toBe(expected.length);

    for (const expectedDep of expected) {
      const found = deps.find((d) => d.name === expectedDep.name && d.file === expectedDep.file);
      expect(found).toBeDefined();
      expect(found?.line).toBe(expectedDep.line);
    }
  });

  it('should return dependencies for Dashboard', () => {
    const deps = getDependenciesForElement(sampleGraph, 'pages/Dashboard.tsx:Dashboard');
    const expected = fixtureData.expectedQueryResults.getDependenciesForElement['pages/Dashboard.tsx:Dashboard'];

    expect(deps.length).toBe(expected.length);

    for (const expectedDep of expected) {
      const found = deps.find((d) => d.name === expectedDep.name && d.file === expectedDep.file);
      expect(found).toBeDefined();
    }
  });

  it('should return empty array for element with no dependencies', () => {
    const deps = getDependenciesForElement(sampleGraph, 'theme/tokens.ts:tokens');
    expect(deps).toEqual([]);
  });

  it('should return empty array for missing nodeId', () => {
    const deps = getDependenciesForElement(sampleGraph, 'nonexistent/file.ts:NonexistentElement');
    expect(deps).toEqual([]);
  });

  it('should not return duplicate dependencies', () => {
    const deps = getDependenciesForElement(sampleGraph, 'services/auth.ts:AuthService');
    const uniqueDeps = deps.filter(
      (d, index, self) => self.findIndex((sd) => sd.file === d.file && sd.name === d.name) === index
    );
    expect(deps.length).toBe(uniqueDeps.length);
  });
});

describe('getElementCharacteristics', () => {
  it('should return complete characteristics for Dashboard', () => {
    const characteristics = getElementCharacteristics(sampleGraph, 'pages/Dashboard.tsx:Dashboard');

    expect(characteristics).toHaveProperty('imports');
    expect(characteristics).toHaveProperty('exports');
    expect(characteristics).toHaveProperty('consumers');
    expect(characteristics).toHaveProperty('dependencies');

    expect(Array.isArray(characteristics.imports)).toBe(true);
    expect(Array.isArray(characteristics.exports)).toBe(true);
    expect(Array.isArray(characteristics.consumers)).toBe(true);
    expect(Array.isArray(characteristics.dependencies)).toBe(true);
  });

  it('should match individual query results', () => {
    const nodeId = 'services/auth.ts:AuthService';
    const characteristics = getElementCharacteristics(sampleGraph, nodeId);

    const imports = getImportsForElement(sampleGraph, nodeId);
    const exports = getExportsForElement(sampleGraph, nodeId);
    const consumers = getConsumersForElement(sampleGraph, nodeId);
    const dependencies = getDependenciesForElement(sampleGraph, nodeId);

    expect(characteristics.imports).toEqual(imports);
    expect(characteristics.exports).toEqual(exports);
    expect(characteristics.consumers).toEqual(consumers);
    expect(characteristics.dependencies).toEqual(dependencies);
  });
});

describe('calculateAutoFillRate', () => {
  it('should return 100% for element with all fields populated', () => {
    const rate = calculateAutoFillRate(sampleGraph, 'services/auth.ts:AuthService');
    expect(rate).toBe(100);
  });

  it('should return 75% for element with 3/4 fields populated', () => {
    const rate = calculateAutoFillRate(sampleGraph, 'hooks/useProjects.ts:useProjects');
    expect(rate).toBeGreaterThanOrEqual(25); // At least exports should be populated
  });

  it('should return 0% for missing element', () => {
    const rate = calculateAutoFillRate(sampleGraph, 'nonexistent/file.ts:NonexistentElement');
    expect(rate).toBe(0);
  });

  it('should return value between 0 and 100', () => {
    const rate = calculateAutoFillRate(sampleGraph, 'components/Button.tsx:PrimaryButton');
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });
});

describe('Edge Cases', () => {
  it('should handle graph with no edges', () => {
    const emptyGraph: DependencyGraph = {
      nodes: new Map([
        ['test.ts:testFunc', { id: 'test.ts:testFunc', name: 'testFunc', type: 'function', file: 'test.ts' }],
      ]),
      edges: [],
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };

    const imports = getImportsForElement(emptyGraph, 'test.ts:testFunc');
    const consumers = getConsumersForElement(emptyGraph, 'test.ts:testFunc');
    const deps = getDependenciesForElement(emptyGraph, 'test.ts:testFunc');

    expect(imports).toEqual([]);
    expect(consumers).toEqual([]);
    expect(deps).toEqual([]);
  });

  it('should handle graph with no nodes', () => {
    const emptyGraph: DependencyGraph = {
      nodes: new Map(),
      edges: [],
      edgesBySource: new Map(),
      edgesByTarget: new Map(),
    };

    const exports = getExportsForElement(emptyGraph, 'test.ts:testFunc');
    expect(exports).toEqual([]);
  });

  it('should handle circular dependencies', () => {
    // Create a graph with circular dependency: A -> B -> A
    const circularGraph: DependencyGraph = {
      nodes: new Map([
        ['a.ts:A', { id: 'a.ts:A', name: 'A', type: 'function', file: 'a.ts', line: 1 }],
        ['b.ts:B', { id: 'b.ts:B', name: 'B', type: 'function', file: 'b.ts', line: 1 }],
      ]),
      edges: [
        { source: 'a.ts:A', target: 'b.ts:B', type: 'calls' },
        { source: 'b.ts:B', target: 'a.ts:A', type: 'calls' },
      ],
      edgesBySource: new Map([
        ['a.ts:A', [{ source: 'a.ts:A', target: 'b.ts:B', type: 'calls' }]],
        ['b.ts:B', [{ source: 'b.ts:B', target: 'a.ts:A', type: 'calls' }]],
      ]),
      edgesByTarget: new Map([
        ['a.ts:A', [{ source: 'b.ts:B', target: 'a.ts:A', type: 'calls' }]],
        ['b.ts:B', [{ source: 'a.ts:A', target: 'b.ts:B', type: 'calls' }]],
      ]),
    };

    const consumersA = getConsumersForElement(circularGraph, 'a.ts:A');
    const depsA = getDependenciesForElement(circularGraph, 'a.ts:A');

    expect(consumersA).toHaveLength(1);
    expect(depsA).toHaveLength(1);
    expect(consumersA[0].name).toBe('B');
    expect(depsA[0].name).toBe('B');
  });
});
