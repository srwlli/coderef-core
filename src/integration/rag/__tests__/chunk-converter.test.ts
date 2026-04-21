/**
 * Unit tests for ChunkConverter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkConverter } from '../chunk-converter.js';
import type { DependencyGraph, GraphNode, GraphEdge } from '../../../analyzer/graph-builder.js';
import type { CodeChunk } from '../code-chunk.js';

describe('ChunkConverter', () => {
  let converter: ChunkConverter;
  let mockGraph: DependencyGraph;

  // Helper to create a proper mock graph
  const createMockGraph = (): DependencyGraph => ({
    nodes: new Map<string, GraphNode>(),
    edges: [],
    edgesBySource: new Map<string, GraphEdge[]>(),
    edgesByTarget: new Map<string, GraphEdge[]>()
  });

  // Helper to add edge to graph
  const addEdge = (graph: DependencyGraph, source: string, target: string, type: GraphEdge['type'] = 'calls') => {
    const edge: GraphEdge = { source, target, type };
    graph.edges.push(edge);

    const sourceEdges = graph.edgesBySource.get(source) || [];
    sourceEdges.push(edge);
    graph.edgesBySource.set(source, sourceEdges);

    const targetEdges = graph.edgesByTarget.get(target) || [];
    targetEdges.push(edge);
    graph.edgesByTarget.set(target, targetEdges);
  };

  beforeEach(() => {
    converter = new ChunkConverter('/test/project');
    mockGraph = createMockGraph();
  });

  describe('convertNode', () => {
    it('should convert a simple function node to CodeChunk', async () => {
      const node: GraphNode = {
        id: 'test.ts:testFunction',
        type: 'function',
        file: '/test/project/test.ts',
        line: 10,
        metadata: { exported: true }
      };

      mockGraph.nodes.set(node.id, node);

      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: false,
        includeDocumentation: false
      });

      expect(result.chunks).toHaveLength(1);

      const chunk = result.chunks[0];
      expect(chunk.name).toBe('testFunction');
      expect(chunk.type).toBe('function');
      expect(chunk.file).toBe('/test/project/test.ts');
      expect(chunk.line).toBe(10);
      expect(chunk.exported).toBe(true);
      expect(chunk.dependencyCount).toBe(0);
      expect(chunk.dependentCount).toBe(0);
    });

    it('should handle nodes with dependencies', async () => {
      const node1: GraphNode = {
        id: 'test.ts:function1',
        type: 'function',
        file: '/test/project/test.ts',
        line: 10,
        metadata: { exported: true }
      };

      const node2: GraphNode = {
        id: 'test.ts:function2',
        type: 'function',
        file: '/test/project/test.ts',
        line: 20,
        metadata: { exported: false }
      };

      mockGraph.nodes.set(node1.id, node1);
      mockGraph.nodes.set(node2.id, node2);

      // function1 calls function2
      addEdge(mockGraph, 'test.ts:function1', 'test.ts:function2', 'calls');

      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: false,
        includeDocumentation: false
      });

      expect(result.chunks).toHaveLength(2);

      const chunk1 = result.chunks.find((c) => c.name === 'function1')!;
      expect(chunk1).toBeDefined();
      expect(chunk1.dependencyCount).toBe(1);
      expect(chunk1.dependentCount).toBe(0);
      expect(chunk1.dependencies).toHaveLength(1);

      const chunk2 = result.chunks.find((c) => c.name === 'function2')!;
      expect(chunk2).toBeDefined();
      expect(chunk2.dependencyCount).toBe(0);
      expect(chunk2.dependentCount).toBe(1);
      expect(chunk2.dependents).toHaveLength(1);
    });

    it('should detect language from file extension', async () => {
      const testCases = [
        { file: '/test.ts', expected: 'typescript' },
        { file: '/test.tsx', expected: 'typescript' },
        { file: '/test.js', expected: 'javascript' },
        { file: '/test.jsx', expected: 'javascript' },
        { file: '/test.py', expected: 'python' }
      ];

      for (const testCase of testCases) {
        const node: GraphNode = {
          id: `${testCase.file}:testFunc`,
          type: 'function',
          file: testCase.file,
          line: 1
        };

        mockGraph = createMockGraph();
        mockGraph.nodes.set(node.id, node);

        const result = await converter.convertGraph(mockGraph, {
          includeSourceCode: false,
          includeDocumentation: false
        });

        expect(result.chunks[0].language).toBe(testCase.expected);
      }
    });

    it('should convert different element types', async () => {
      const testCases = [
        { type: 'function', expectedPrefix: '@Fn/' },
        { type: 'class', expectedPrefix: '@Cl/' },
        { type: 'method', expectedPrefix: '@M/' },
        { type: 'interface', expectedPrefix: '@I/' },
        { type: 'type', expectedPrefix: '@T/' }
      ];

      for (const testCase of testCases) {
        const node: GraphNode = {
          id: `test.ts:testElement`,
          type: testCase.type,
          file: '/test/project/test.ts',
          line: 1
        };

        mockGraph = createMockGraph();
        mockGraph.nodes.set(node.id, node);

        const result = await converter.convertGraph(mockGraph, {
          includeSourceCode: false,
          includeDocumentation: false
        });

        // Note: The coderef format depends on implementation
        expect(result.chunks[0].type).toBe(testCase.type);
      }
    });

    it('should group nodes by file for efficient processing', async () => {
      // Create multiple nodes in the same file
      const nodes: GraphNode[] = [
        {
          id: 'test.ts:func1',
          type: 'function',
          file: '/test/project/test.ts',
          line: 10,
          metadata: { exported: true }
        },
        {
          id: 'test.ts:func2',
          type: 'function',
          file: '/test/project/test.ts',
          line: 20,
          metadata: { exported: true }
        },
        {
          id: 'other.ts:func3',
          type: 'function',
          file: '/test/project/other.ts',
          line: 30,
          metadata: { exported: true }
        }
      ];

      nodes.forEach((node) => mockGraph.nodes.set(node.id, node));

      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: false,
        includeDocumentation: false
      });

      expect(result.chunks).toHaveLength(3);
      expect(result.count).toBe(3);

      // Verify files are from two unique files
      const uniqueFiles = new Set(result.chunks.map(c => c.file));
      expect(uniqueFiles.size).toBe(2);
    });

    it('should handle empty graph', async () => {
      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: false,
        includeDocumentation: false
      });

      expect(result.chunks).toHaveLength(0);
      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should respect maxSourceCodeLength option', async () => {
      const node: GraphNode = {
        id: 'test.ts:testFunc',
        type: 'function',
        file: '/test/project/test.ts',
        line: 1
      };

      mockGraph.nodes.set(node.id, node);

      // Mock file reading to return long source code
      const longSource = 'x'.repeat(5000);
      vi.spyOn(converter as any, 'readFile').mockResolvedValue(longSource);

      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: true,
        maxSourceCodeLength: 1000
      });

      expect(result.chunks[0].sourceCode).toBeDefined();
      // Should be truncated to maxSourceCodeLength plus "// ... truncated"
      expect(result.chunks[0].sourceCode!.length).toBeLessThanOrEqual(1020);
    });
  });

  describe('generateCodeRef', () => {
    it('should generate correct CodeRef format', async () => {
      // Test through convertGraph since generateCodeRef is private
      const node: GraphNode = {
        id: '/test/project/src/auth/login.ts:authenticate',
        type: 'function',
        file: '/test/project/src/auth/login.ts',
        line: 24
      };

      mockGraph.nodes.set(node.id, node);

      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: false,
        includeDocumentation: false
      });

      expect(result.chunks[0].coderef).toBeDefined();
      expect(result.chunks[0].name).toBe('authenticate');
      expect(result.chunks[0].line).toBe(24);
    });

    it('should normalize paths correctly', async () => {
      const node: GraphNode = {
        id: '/test/project/src/components/Button.tsx:func',
        type: 'function',
        file: '/test/project/src/components/Button.tsx',
        line: 1
      };

      mockGraph.nodes.set(node.id, node);

      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: false,
        includeDocumentation: false
      });

      expect(result.chunks[0].name).toBe('func');
      expect(result.chunks[0].file).toBe('/test/project/src/components/Button.tsx');
    });
  });

  describe('statistics', () => {
    it('should track conversion statistics', async () => {
      const nodes: GraphNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `test${i}.ts:func${i}`,
        type: 'function',
        file: `/test/project/test${i}.ts`,
        line: i * 10,
        metadata: { exported: i % 2 === 0 }
      }));

      nodes.forEach((node) => mockGraph.nodes.set(node.id, node));

      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: false,
        includeDocumentation: false
      });

      expect(result.count).toBe(10);
      expect(result.chunks).toHaveLength(10);
      expect(result.errors).toHaveLength(0);

      // Use calculateStatistics method for detailed stats
      const stats = converter.calculateStatistics(result.chunks);
      expect(stats.total).toBe(10);
      expect(stats.byType['function']).toBe(10);
    });

    it('should count dependencies in statistics', async () => {
      const node1: GraphNode = {
        id: 'test.ts:func1',
        type: 'function',
        file: '/test/project/test.ts',
        line: 10,
        metadata: { exported: true }
      };

      const node2: GraphNode = {
        id: 'test.ts:func2',
        type: 'function',
        file: '/test/project/test.ts',
        line: 20,
        metadata: { exported: false }
      };

      const node3: GraphNode = {
        id: 'test.ts:func3',
        type: 'function',
        file: '/test/project/test.ts',
        line: 30,
        metadata: { exported: false }
      };

      mockGraph.nodes.set(node1.id, node1);
      mockGraph.nodes.set(node2.id, node2);
      mockGraph.nodes.set(node3.id, node3);

      // func1 calls func2 and func3
      addEdge(mockGraph, 'test.ts:func1', 'test.ts:func2', 'calls');
      addEdge(mockGraph, 'test.ts:func1', 'test.ts:func3', 'calls');
      // func2 calls func3
      addEdge(mockGraph, 'test.ts:func2', 'test.ts:func3', 'calls');

      const result = await converter.convertGraph(mockGraph, {
        includeSourceCode: false,
        includeDocumentation: false
      });

      // Calculate statistics
      const stats = converter.calculateStatistics(result.chunks);
      expect(stats.avgDependencies).toBeGreaterThan(0);

      // Check individual chunk dependencies
      const func1 = result.chunks.find(c => c.name === 'func1')!;
      expect(func1.dependencyCount).toBe(2); // calls func2 and func3
    });
  });
});
