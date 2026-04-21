/**
 * Fuzzy Resolver - Detect moved/renamed code elements
 * Phase 5, Task P5-T3: Fuzzy Resolution for Drift Detection
 *
 * Provides:
 * - Multi-metric string similarity (name, path, signature)
 * - Element matching despite drift
 * - Confidence scoring
 */

import { GraphNode } from '../analyzer/graph-builder.js';

/**
 * Represents a potential match with confidence score
 */
export interface FuzzyMatch {
  originalElementId: string;
  matchedElementId: string;
  matchedElement: GraphNode;
  similarity: number;
  metrics: {
    nameSimilarity: number;
    pathSimilarity: number;
    signatureSimilarity: number;
  };
  confidence: number;
  reason: string;
}

/**
 * Represents drift detection result
 */
export interface DriftResult {
  sourceElementId: string;
  sourceElement: GraphNode | null;
  matches: FuzzyMatch[];
  hasMatch: boolean;
  matchFound: boolean;
}

export class FuzzyResolver {
  private elements: Map<string, GraphNode>;
  private similarityThreshold: number = 0.85;
  private matchCache: Map<string, FuzzyMatch[]> = new Map();

  constructor(elements: Map<string, GraphNode>, threshold: number = 0.85) {
    this.elements = elements;
    this.similarityThreshold = threshold;
  }

  /**
   * Find potential matches for moved/renamed element
   */
  findMovedElements(elementId: string, maxMatches: number = 10): DriftResult {
    const cacheKey = `drift:${elementId}`;

    // Check cache
    if (this.matchCache.has(cacheKey)) {
      const cached = this.matchCache.get(cacheKey)!;
      return {
        sourceElementId: elementId,
        sourceElement: this.elements.get(elementId) || null,
        matches: cached.slice(0, maxMatches),
        hasMatch: cached.length > 0,
        matchFound: cached.some((m) => m.similarity >= this.similarityThreshold),
      };
    }

    const sourceElement = this.elements.get(elementId);

    if (!sourceElement) {
      return {
        sourceElementId: elementId,
        sourceElement: null,
        matches: [],
        hasMatch: false,
        matchFound: false,
      };
    }

    // Multi-metric similarity matching
    const matches: FuzzyMatch[] = [];

    for (const [candId, candidate] of this.elements.entries()) {
      if (candId === elementId) continue; // Skip self

      const nameSim = this.calculateNameSimilarity(sourceElement.id, candidate.id);
      const pathSim = sourceElement.file && candidate.file ?
        this.calculatePathSimilarity(sourceElement.file, candidate.file) : 0.5;
      const sigSim = this.calculateSignatureSimilarity(
        JSON.stringify(sourceElement.metadata),
        JSON.stringify(candidate.metadata)
      );

      const { similarity, confidence } = this.calculateCombinedSimilarity(nameSim, pathSim, sigSim);

      if (similarity >= this.similarityThreshold) {
        matches.push({
          originalElementId: elementId,
          matchedElementId: candId,
          matchedElement: candidate,
          similarity,
          metrics: {
            nameSimilarity: nameSim,
            pathSimilarity: pathSim,
            signatureSimilarity: sigSim,
          },
          confidence,
          reason: this.generateMatchReason(sourceElement, candidate, nameSim, pathSim),
        });
      }
    }

    // Sort by similarity descending
    matches.sort((a, b) => b.similarity - a.similarity);

    // Cache and return
    this.matchCache.set(cacheKey, matches);

    return {
      sourceElementId: elementId,
      sourceElement,
      matches: matches.slice(0, maxMatches),
      hasMatch: matches.length > 0,
      matchFound: matches.some((m) => m.similarity >= this.similarityThreshold),
    };
  }

  /**
   * Calculate name similarity (Jaro-Winkler distance)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    // TODO: Implement using string-similarity library (Jaro-Winkler)
    // For now, return simple character overlap similarity
    if (name1 === name2) return 1.0;
    if (!name1 || !name2) return 0.0;

    // Simple similarity: ratio of common characters
    const common = Math.min(name1.length, name2.length);
    return common / Math.max(name1.length, name2.length);
  }

  /**
   * Calculate path similarity
   */
  private calculatePathSimilarity(path1: string, path2: string): number {
    // TODO: Implement path-based similarity
    // Consider directory structure and file names
    if (path1 === path2) return 1.0;
    if (!path1 || !path2) return 0.0;

    // Simple split-based similarity
    const parts1 = path1.split(/[\\/]/);
    const parts2 = path2.split(/[\\/]/);

    let matchingParts = 0;
    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      if (parts1[i] === parts2[i]) matchingParts++;
    }

    return matchingParts / Math.max(parts1.length, parts2.length);
  }

  /**
   * Calculate signature similarity (function/class signature)
   */
  private calculateSignatureSimilarity(sig1: string | undefined, sig2: string | undefined): number {
    // TODO: Implement signature-based similarity
    if (!sig1 || !sig2) return 0.5; // Neutral if no signature
    if (sig1 === sig2) return 1.0;

    return this.calculateNameSimilarity(sig1, sig2);
  }

  /**
   * Combine multiple similarity metrics
   */
  private calculateCombinedSimilarity(
    nameSim: number,
    pathSim: number,
    signatureSim: number
  ): { similarity: number; confidence: number } {
    // Weighted average: 50% name, 30% path, 20% signature
    const combined = nameSim * 0.5 + pathSim * 0.3 + signatureSim * 0.2;

    // Confidence is higher if multiple metrics agree
    const variance =
      Math.abs(nameSim - combined) + Math.abs(pathSim - combined) + Math.abs(signatureSim - combined);
    const confidence = 1.0 - Math.min(variance / 3, 1.0);

    return { similarity: combined, confidence };
  }

  /**
   * Find all elements with similarity above threshold
   */
  findSimilarElements(
    elementId: string,
    threshold?: number
  ): Array<{ element: GraphNode; similarity: number }> {
    const element = this.elements.get(elementId);
    if (!element) return [];

    const thresh = threshold || this.similarityThreshold;
    const similar: Array<{ element: GraphNode; similarity: number }> = [];

    // Similarity scoring across all elements
    for (const [candId, candidate] of this.elements.entries()) {
      if (candId === elementId) continue;

      const nameSim = this.calculateNameSimilarity(element.id, candidate.id);
      const pathSim = element.file && candidate.file ?
        this.calculatePathSimilarity(element.file, candidate.file) : 0.5;
      const sigSim = this.calculateSignatureSimilarity(
        JSON.stringify(element.metadata),
        JSON.stringify(candidate.metadata)
      );

      const { similarity } = this.calculateCombinedSimilarity(nameSim, pathSim, sigSim);

      if (similarity >= thresh) {
        similar.push({ element: candidate, similarity });
      }
    }

    // Sort by similarity descending
    similar.sort((a, b) => b.similarity - a.similarity);
    return similar;
  }

  /**
   * Generate human-readable match reason
   */
  private generateMatchReason(
    source: GraphNode,
    candidate: GraphNode,
    nameSim: number,
    pathSim: number
  ): string {
    const reasons: string[] = [];

    if (nameSim > 0.85) reasons.push('Similar name');
    if (pathSim > 0.7) reasons.push('Similar path');
    if (source.type === candidate.type) reasons.push('Same type');

    return reasons.length > 0 ? reasons.join(', ') : 'Possible match';
  }

  /**
   * Set similarity threshold
   */
  setSimilarityThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Similarity threshold must be between 0 and 1');
    }
    this.similarityThreshold = threshold;
    this.matchCache.clear();
  }

  /**
   * Clear match cache
   */
  clearCache(): void {
    this.matchCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, any> {
    return {
      cacheSize: this.matchCache.size,
      threshold: this.similarityThreshold,
      totalElements: this.elements.size,
    };
  }
}

export default FuzzyResolver;
