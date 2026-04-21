/**
 * Graph-Aware Re-Ranker
 * P3-T3: Re-ranks search results using CodeRef's dependency graph knowledge
 *
 * This is a key differentiator of CodeRef's RAG system: it combines semantic
 * similarity with structural importance from the dependency graph to provide
 * more relevant results.
 */

import type { DependencyGraph } from '../../analyzer/graph-builder.js';
import type { SearchResult } from './semantic-search.js';

/**
 * Options for re-ranking
 */
export interface ReRankingOptions {
  /** Weight for dependency count (0-1, default: 0.2) */
  dependencyWeight?: number;

  /** Weight for dependent count (0-1, default: 0.3) */
  dependentWeight?: number;

  /** Weight for test coverage (0-1, default: 0.2) */
  coverageWeight?: number;

  /** Weight for complexity penalty (0-1, default: 0.1) */
  complexityWeight?: number;

  /** Weight for semantic similarity (0-1, default: 0.2) */
  semanticWeight?: number;

  /** Query-specific boost strategy */
  queryStrategy?: QueryStrategy;

  /** Maximum boost factor (default: 2.0) */
  maxBoost?: number;

  /** Minimum score threshold (default: 0.0) */
  minScore?: number;
}

/**
 * Query strategy for specialized boosting
 */
export type QueryStrategy =
  | 'general' // No special strategy
  | 'centrality' // Boost high-centrality nodes
  | 'quality' // Boost well-tested, low-complexity code
  | 'usage' // Boost frequently used code
  | 'recent' // Boost recently modified code
  | 'public' // Boost exported/public APIs;

/**
 * Re-ranked result with explanation
 */
export interface ReRankedResult extends SearchResult {
  /** Original semantic score */
  originalScore: number;

  /** Final re-ranked score */
  rerankedScore: number;

  /** Boost factor applied */
  boostFactor: number;

  /** Explanation of ranking factors */
  explanation: RankingExplanation;
}

/**
 * Explanation of how score was calculated
 */
export interface RankingExplanation {
  /** Semantic similarity contribution */
  semanticScore: number;

  /** Dependency graph contribution */
  graphScore: number;

  /** Quality metrics contribution */
  qualityScore: number;

  /** Breakdown of factors */
  factors: {
    dependencyBoost?: number;
    dependentBoost?: number;
    coverageBoost?: number;
    complexityPenalty?: number;
    queryBoost?: number;
  };
}

/**
 * Graph statistics for a node
 */
interface NodeGraphStats {
  dependencyCount: number;
  dependentCount: number;
  centrality: number; // PageRank-like centrality
  depth: number; // Depth in dependency tree
}

/**
 * Re-ranks search results using dependency graph
 */
export class GraphReRanker {
  private graph?: DependencyGraph;

  constructor(graph?: DependencyGraph) {
    this.graph = graph;
  }

  /**
   * Set or update the dependency graph
   */
  setGraph(graph: DependencyGraph): void {
    this.graph = graph;
  }

  /**
   * Re-rank search results
   */
  rerank(
    results: SearchResult[],
    options?: ReRankingOptions
  ): ReRankedResult[] {
    if (!this.graph) {
      // No graph available, return results as-is
      return results.map((r) => this.toReRankedResult(r, 1.0, {}));
    }

    const opts: Required<ReRankingOptions> = {
      dependencyWeight: options?.dependencyWeight ?? 0.2,
      dependentWeight: options?.dependentWeight ?? 0.3,
      coverageWeight: options?.coverageWeight ?? 0.2,
      complexityWeight: options?.complexityWeight ?? 0.1,
      semanticWeight: options?.semanticWeight ?? 0.2,
      queryStrategy: options?.queryStrategy ?? 'general',
      maxBoost: options?.maxBoost ?? 2.0,
      minScore: options?.minScore ?? 0.0
    };

    // Normalize weights to sum to 1.0
    const totalWeight =
      opts.dependencyWeight +
      opts.dependentWeight +
      opts.coverageWeight +
      opts.complexityWeight +
      opts.semanticWeight;

    const normalizedWeights = {
      dependencyWeight: opts.dependencyWeight / totalWeight,
      dependentWeight: opts.dependentWeight / totalWeight,
      coverageWeight: opts.coverageWeight / totalWeight,
      complexityWeight: opts.complexityWeight / totalWeight,
      semanticWeight: opts.semanticWeight / totalWeight
    };

    // Calculate re-ranked scores
    const reranked = results.map((result) => {
      const factors = this.calculateRankingFactors(result, opts);
      const graphScore = this.calculateGraphScore(factors);
      const qualityScore = this.calculateQualityScore(factors);
      const semanticScore = result.score * normalizedWeights.semanticWeight;

      // Combined score
      let rerankedScore = semanticScore + graphScore + qualityScore;

      // Apply query-specific boost
      const queryBoost = this.calculateQueryBoost(result, opts.queryStrategy);
      rerankedScore *= (1.0 + queryBoost);

      // Cap at maxBoost
      const boostFactor = Math.min(rerankedScore / result.score, opts.maxBoost);
      rerankedScore = result.score * boostFactor;

      // Apply minimum threshold
      if (rerankedScore < opts.minScore) {
        rerankedScore = 0;
      }

      return {
        ...result,
        originalScore: result.score,
        rerankedScore,
        boostFactor,
        score: rerankedScore, // Update score
        explanation: {
          semanticScore,
          graphScore,
          qualityScore,
          factors
        }
      };
    });

    // Sort by re-ranked score
    reranked.sort((a, b) => b.rerankedScore - a.rerankedScore);

    return reranked;
  }

  /**
   * Calculate ranking factors for a result
   */
  private calculateRankingFactors(
    result: SearchResult,
    options: Required<ReRankingOptions>
  ): RankingExplanation['factors'] {
    const factors: RankingExplanation['factors'] = {};

    // Dependency boost (more dependencies = more important)
    if (result.metadata.dependencyCount !== undefined) {
      const normalizedDeps = Math.min(result.metadata.dependencyCount / 10, 1);
      factors.dependencyBoost = normalizedDeps * options.dependencyWeight;
    }

    // Dependent boost (more dependents = more important)
    if (result.metadata.dependentCount !== undefined) {
      const normalizedDeps = Math.min(result.metadata.dependentCount / 10, 1);
      factors.dependentBoost = normalizedDeps * options.dependentWeight;
    }

    // Coverage boost (higher coverage = better quality)
    if (result.metadata.coverage !== undefined) {
      const normalizedCoverage = result.metadata.coverage / 100;
      factors.coverageBoost = normalizedCoverage * options.coverageWeight;
    }

    // Complexity penalty (higher complexity = harder to use)
    if (result.metadata.complexity !== undefined) {
      const normalizedComplexity = Math.min(result.metadata.complexity / 20, 1);
      factors.complexityPenalty = -normalizedComplexity * options.complexityWeight;
    }

    return factors;
  }

  /**
   * Calculate graph-based score
   */
  private calculateGraphScore(
    factors: RankingExplanation['factors']
  ): number {
    return (factors.dependencyBoost ?? 0) + (factors.dependentBoost ?? 0);
  }

  /**
   * Calculate quality-based score
   */
  private calculateQualityScore(
    factors: RankingExplanation['factors']
  ): number {
    return (factors.coverageBoost ?? 0) + (factors.complexityPenalty ?? 0);
  }

  /**
   * Calculate query-specific boost
   */
  private calculateQueryBoost(
    result: SearchResult,
    strategy: QueryStrategy
  ): number {
    switch (strategy) {
      case 'centrality':
        // Boost nodes with many dependents (central to the codebase)
        return (result.metadata.dependentCount ?? 0) / 100;

      case 'quality':
        // Boost well-tested, low-complexity code
        const coverage = (result.metadata.coverage ?? 0) / 100;
        const complexity = Math.max(0, 1 - (result.metadata.complexity ?? 0) / 20);
        return (coverage + complexity) / 2;

      case 'usage':
        // Boost frequently used code
        return (result.metadata.dependentCount ?? 0) / 50;

      case 'public':
        // Boost exported/public APIs
        return result.metadata.exported ? 0.3 : 0;

      case 'general':
      default:
        return 0;
    }
  }

  /**
   * Convert SearchResult to ReRankedResult
   */
  private toReRankedResult(
    result: SearchResult,
    boostFactor: number,
    factors: RankingExplanation['factors']
  ): ReRankedResult {
    return {
      ...result,
      originalScore: result.score,
      rerankedScore: result.score * boostFactor,
      boostFactor,
      explanation: {
        semanticScore: result.score,
        graphScore: 0,
        qualityScore: 0,
        factors
      }
    };
  }

  /**
   * Calculate node centrality (simplified PageRank)
   */
  private calculateCentrality(nodeId: string): number {
    if (!this.graph) {
      return 0;
    }

    // Simple centrality: ratio of dependents to total nodes
    const dependents = this.graph.edgesByTarget.get(nodeId) || [];
    return dependents.length / this.graph.nodes.size;
  }

  /**
   * Get query strategy from query text
   */
  static inferQueryStrategy(query: string): QueryStrategy {
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.includes('who uses') ||
      lowerQuery.includes('what calls') ||
      lowerQuery.includes('usage')
    ) {
      return 'usage';
    }

    if (
      lowerQuery.includes('public') ||
      lowerQuery.includes('exported') ||
      lowerQuery.includes('api')
    ) {
      return 'public';
    }

    if (
      lowerQuery.includes('quality') ||
      lowerQuery.includes('tested') ||
      lowerQuery.includes('coverage')
    ) {
      return 'quality';
    }

    if (
      lowerQuery.includes('important') ||
      lowerQuery.includes('central') ||
      lowerQuery.includes('key')
    ) {
      return 'centrality';
    }

    return 'general';
  }

  /**
   * Analyze re-ranking impact
   */
  analyzeReRankingImpact(
    original: SearchResult[],
    reranked: ReRankedResult[]
  ): {
    avgBoostFactor: number;
    positionChanges: number;
    topResultChanged: boolean;
    significantChanges: number;
  } {
    if (original.length === 0 || reranked.length === 0) {
      return {
        avgBoostFactor: 1.0,
        positionChanges: 0,
        topResultChanged: false,
        significantChanges: 0
      };
    }

    // Average boost factor
    const avgBoostFactor =
      reranked.reduce((sum, r) => sum + r.boostFactor, 0) / reranked.length;

    // Count position changes
    let positionChanges = 0;
    let significantChanges = 0;

    const originalOrder = original.map((r) => r.coderef);
    const rerankedOrder = reranked.map((r) => r.coderef);

    for (let i = 0; i < Math.min(originalOrder.length, rerankedOrder.length); i++) {
      const originalPos = originalOrder.indexOf(rerankedOrder[i]);
      if (originalPos !== i) {
        positionChanges++;
        if (Math.abs(originalPos - i) >= 3) {
          significantChanges++;
        }
      }
    }

    // Check if top result changed
    const topResultChanged = originalOrder[0] !== rerankedOrder[0];

    return {
      avgBoostFactor,
      positionChanges,
      topResultChanged,
      significantChanges
    };
  }
}
