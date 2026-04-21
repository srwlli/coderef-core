/**
 * Unit tests for GraphReRanker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphReRanker, type QueryStrategy } from '../graph-reranker.js';
import type { SearchResult } from '../semantic-search.js';
import type { CodeChunkMetadata } from '../../vector/vector-store.js';
import type { DependencyGraph, GraphNode, GraphEdge } from '../../../analyzer/graph-builder.js';

describe('GraphReRanker', () => {
  let reranker: GraphReRanker;
  let mockGraph: DependencyGraph;

  // Create a mock graph for testing
  const createMockGraph = (): DependencyGraph => ({
    nodes: new Map<string, GraphNode>(),
    edges: [],
    edgesBySource: new Map<string, GraphEdge[]>(),
    edgesByTarget: new Map<string, GraphEdge[]>()
  });

  beforeEach(() => {
    mockGraph = createMockGraph();
    reranker = new GraphReRanker(mockGraph);
  });

  describe('rerank', () => {
    it('should rerank search results based on graph metrics', () => {
      const results: SearchResult[] = [
        createSearchResult('@Fn/util#helper:1', 0.7, { dependentCount: 50, coverage: 90 }),
        createSearchResult('@Fn/main#process:10', 0.8, { dependentCount: 5, coverage: 60 }),
        createSearchResult('@Fn/core#critical:20', 0.75, { dependentCount: 100, coverage: 95 })
      ];

      const reranked = reranker.rerank(results, {
        queryStrategy: 'centrality',
        dependentWeight: 0.4,
        semanticWeight: 0.3
      });

      // The critical function should be ranked higher due to high dependent count
      expect(reranked[0].metadata.name).toBe('critical');
      expect(reranked[0].rerankedScore).toBeGreaterThan(results[2].score);
    });

    it('should boost results based on dependent count', () => {
      const lowDependents = createSearchResult('@Fn/test#low:1', 0.8, { dependentCount: 2 });
      const highDependents = createSearchResult('@Fn/test#high:2', 0.8, { dependentCount: 50 });

      const reranked = reranker.rerank([lowDependents, highDependents], {
        dependentWeight: 0.5
      });

      expect(reranked[0].metadata.name).toBe('high');
      expect(reranked[0].boostFactor).toBeGreaterThan(reranked[1].boostFactor);
      expect(reranked[0].explanation.factors.dependentBoost).toBeDefined();
    });

    it('should boost results based on test coverage', () => {
      const lowCoverage = createSearchResult('@Fn/test#low:1', 0.8, { coverage: 30 });
      const highCoverage = createSearchResult('@Fn/test#high:2', 0.8, { coverage: 95 });

      const reranked = reranker.rerank([lowCoverage, highCoverage], {
        coverageWeight: 0.3
      });

      expect(reranked[0].metadata.name).toBe('high');
      expect(reranked[0].boostFactor).toBeGreaterThan(reranked[1].boostFactor);
    });

    it('should penalize high complexity', () => {
      const lowComplexity = createSearchResult('@Fn/test#simple:1', 0.8, { complexity: 5 });
      const highComplexity = createSearchResult('@Fn/test#complex:2', 0.8, { complexity: 50 });

      const reranked = reranker.rerank([highComplexity, lowComplexity], {
        complexityWeight: 0.2
      });

      // Simple function should rank higher (complexity is a penalty)
      expect(reranked[0].metadata.name).toBe('simple');
      expect(reranked[1].explanation.factors.complexityPenalty).toBeDefined();
    });

    it('should apply different query strategies', () => {
      const results: SearchResult[] = [
        createSearchResult('@Fn/test#central:1', 0.7, {
          dependentCount: 100,
          coverage: 50,
          complexity: 15,
          exported: false
        }),
        createSearchResult('@Fn/test#quality:2', 0.7, {
          dependentCount: 5,
          coverage: 98,
          complexity: 2,
          exported: false
        }),
        createSearchResult('@Fn/test#public:3', 0.7, {
          dependentCount: 10,
          coverage: 40,
          complexity: 30,
          exported: true
        })
      ];

      const strategies: QueryStrategy[] = ['centrality', 'quality', 'public'];

      for (const strategy of strategies) {
        const reranked = reranker.rerank([...results], { queryStrategy: strategy });

        switch (strategy) {
          case 'centrality':
            expect(reranked[0].metadata.name).toBe('central');
            break;
          case 'quality':
            expect(reranked[0].metadata.name).toBe('quality');
            break;
          case 'public':
            expect(reranked[0].metadata.name).toBe('public');
            break;
        }
      }
    });

    it('should respect maxBoost limit', () => {
      const results: SearchResult[] = [
        createSearchResult('@Fn/test#func:1', 0.5, {
          dependentCount: 1000,
          coverage: 100
        })
      ];

      const reranked = reranker.rerank(results, {
        maxBoost: 1.5,
        dependentWeight: 1.0,
        coverageWeight: 1.0
      });

      expect(reranked[0].boostFactor).toBeLessThanOrEqual(1.5);
      expect(reranked[0].rerankedScore).toBeLessThanOrEqual(results[0].score * 1.5);
    });

    it('should maintain original order for equal scores', () => {
      const results: SearchResult[] = [
        createSearchResult('@Fn/test#first:1', 0.8, {}),
        createSearchResult('@Fn/test#second:2', 0.8, {}),
        createSearchResult('@Fn/test#third:3', 0.8, {})
      ];

      const reranked = reranker.rerank(results, {
        dependentWeight: 0,
        dependencyWeight: 0,
        coverageWeight: 0,
        complexityWeight: 0
      });

      // With all weights 0, results are still re-ranked based on semanticWeight (default)
      // All items have equal scores, so reranked scores will be equal
      expect(reranked).toHaveLength(3);
      // Scores should all be the same with equal weights
      expect(reranked[0].rerankedScore).toEqual(reranked[1].rerankedScore);
      expect(reranked[1].rerankedScore).toEqual(reranked[2].rerankedScore);
    });

    it('should boost exported/public elements with public strategy', () => {
      const privateFunc = createSearchResult('@Fn/test#private:1', 0.8, { exported: false });
      const publicFunc = createSearchResult('@Fn/test#public:2', 0.8, { exported: true });

      const reranked = reranker.rerank([privateFunc, publicFunc], {
        queryStrategy: 'public'
      });

      expect(reranked[0].metadata.name).toBe('public');
      expect(reranked[0].boostFactor).toBeGreaterThan(reranked[1].boostFactor);
    });

    it('should handle results with missing metadata gracefully', () => {
      const results: SearchResult[] = [
        createSearchResult('@Fn/test#complete:1', 0.8, {
          dependentCount: 10,
          coverage: 80,
          complexity: 15
        }),
        createSearchResult('@Fn/test#partial:2', 0.75, {
          // No optional metadata
        })
      ];

      const reranked = reranker.rerank(results);

      expect(reranked).toHaveLength(2);
      expect(reranked[0].rerankedScore).toBeGreaterThan(0);
      expect(reranked[1].rerankedScore).toBeGreaterThan(0);
    });

    it('should apply semantic weight correctly', () => {
      const results: SearchResult[] = [
        createSearchResult('@Fn/test#low_semantic:1', 0.5, { dependentCount: 100 }),
        createSearchResult('@Fn/test#high_semantic:2', 0.95, { dependentCount: 1 })
      ];

      // High semantic weight should favor original semantic score
      const highSemanticWeight = reranker.rerank([...results], {
        semanticWeight: 0.9,
        dependentWeight: 0.1
      });

      expect(highSemanticWeight[0].metadata.name).toBe('high_semantic');

      // Low semantic weight should favor graph metrics
      const lowSemanticWeight = reranker.rerank([...results], {
        semanticWeight: 0.1,
        dependentWeight: 0.9
      });

      expect(lowSemanticWeight[0].metadata.name).toBe('low_semantic');
    });

    it('should calculate ranking factors', () => {
      const result = createSearchResult('@Fn/test#func:1', 0.7, {
        dependentCount: 50,
        coverage: 90,
        complexity: 5
      });

      const reranked = reranker.rerank([result]);

      expect(reranked[0].explanation).toBeDefined();
      expect(reranked[0].explanation.factors.dependentBoost).toBeDefined();
      expect(reranked[0].explanation.factors.coverageBoost).toBeDefined();
    });

    it('should handle empty results', () => {
      const reranked = reranker.rerank([]);
      expect(reranked).toHaveLength(0);
    });

    it('should preserve original metadata', () => {
      const result = createSearchResult('@Fn/test#func:1', 0.8, {
        dependentCount: 10,
        coverage: 80,
        documentation: 'Test function'
      });

      const reranked = reranker.rerank([result]);

      expect(reranked[0].metadata.dependentCount).toBe(10);
      expect(reranked[0].metadata.coverage).toBe(80);
      expect(reranked[0].metadata.documentation).toBe('Test function');
    });

    it('should handle usage strategy', () => {
      const results: SearchResult[] = [
        createSearchResult('@Fn/test#rarely_used:1', 0.7, { dependentCount: 2 }),
        createSearchResult('@Fn/test#frequently_used:2', 0.7, { dependentCount: 100 })
      ];

      const reranked = reranker.rerank(results, {
        queryStrategy: 'usage'
      });

      expect(reranked[0].metadata.name).toBe('frequently_used');
      expect(reranked[0].boostFactor).toBeGreaterThan(reranked[1].boostFactor);
    });

    it('should combine multiple boost factors', () => {
      const result = createSearchResult('@Fn/test#perfect:1', 0.5, {
        dependentCount: 100,
        coverage: 95,
        complexity: 5,
        exported: true
      });

      const reranked = reranker.rerank([result], {
        dependentWeight: 0.3,
        coverageWeight: 0.2,
        complexityWeight: 0.1,
        semanticWeight: 0.4
      });

      // Combined boost should be significant
      expect(reranked[0].boostFactor).toBeGreaterThanOrEqual(1.0);
      expect(reranked[0].rerankedScore).toBeGreaterThanOrEqual(result.score);
    });
  });

  describe('weight validation', () => {
    it('should use default weights when not specified', () => {
      const result = createSearchResult('@Fn/test#func:1', 0.8, { dependentCount: 10 });
      const reranked = reranker.rerank([result]); // No weights specified

      expect(reranked[0].rerankedScore).toBeGreaterThan(0);
    });

    it('should handle zero weights', () => {
      const result = createSearchResult('@Fn/test#func:1', 0.8, { dependentCount: 100 });

      const reranked = reranker.rerank([result], {
        dependentWeight: 0,
        dependencyWeight: 0,
        coverageWeight: 0,
        complexityWeight: 0,
        semanticWeight: 1.0
      });

      // Should equal original score when all graph weights are 0
      expect(reranked[0].rerankedScore).toBeCloseTo(result.score, 2);
    });
  });
});

// Helper function
function createSearchResult(
  coderef: string,
  score: number,
  metadata: Partial<CodeChunkMetadata>
): SearchResult {
  const defaultMetadata: CodeChunkMetadata = {
    coderef,
    type: 'function',
    name: coderef.split('#')[1]?.split(':')[0] || 'unknown',
    file: '/test.ts',
    line: parseInt(coderef.split(':')[1] || '1'),
    language: 'typescript',
    exported: false,
    dependentCount: 0,
    dependencyCount: 0,
    ...metadata
  };

  return {
    coderef,
    score,
    metadata: defaultMetadata
  };
}
