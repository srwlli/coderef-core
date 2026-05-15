/**
 * @coderef-semantic: 1.0.0
 * @exports FuzzyMatch, DriftResult, FuzzyResolver
 */





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
   * Calculate name similarity using Jaro-Winkler distance
   * Optimized for identifier matching with prefix weighting
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    if (name1 === name2) return 1.0;
    if (!name1 || !name2) return 0.0;

    // Jaro similarity
    const jaro = this.calculateJaroDistance(name1, name2);

    // Jaro-Winkler: boost for common prefix (up to 4 chars)
    const prefixLen = this.commonPrefixLength(name1, name2, 4);
    const winklerBoost = prefixLen * 0.1 * (1 - jaro);

    return Math.min(jaro + winklerBoost, 1.0);
  }

  /**
   * Calculate Jaro distance between two strings
   */
  private calculateJaroDistance(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;

    if (len1 === 0 || len2 === 0) return 0.0;

    // Match window
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;

    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matches within window
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    return ((matches / len1) + (matches / len2) + ((matches - transpositions / 2) / matches)) / 3;
  }

  /**
   * Calculate common prefix length (capped at maxLen)
   */
  private commonPrefixLength(s1: string, s2: string, maxLen: number): number {
    let len = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length, maxLen); i++) {
      if (s1[i] === s2[i]) len++;
      else break;
    }
    return len;
  }

  /**
   * Calculate path similarity with directory structure awareness
   * Weights: filename (40%), directory overlap (35%), file extension (15%), depth similarity (10%)
   */
  private calculatePathSimilarity(path1: string, path2: string): number {
    if (path1 === path2) return 1.0;
    if (!path1 || !path2) return 0.0;

    const normalized1 = path1.replace(/\\/g, '/');
    const normalized2 = path2.replace(/\\/g, '/');

    const parts1 = normalized1.split('/');
    const parts2 = normalized2.split('/');

    // Extract filenames and extensions
    const file1 = parts1.pop() || '';
    const file2 = parts2.pop() || '';
    const ext1 = file1.includes('.') ? file1.split('.').pop() : '';
    const ext2 = file2.includes('.') ? file2.split('.').pop() : '';
    const name1 = file1.includes('.') ? file1.slice(0, file1.lastIndexOf('.')) : file1;
    const name2 = file2.includes('.') ? file2.slice(0, file2.lastIndexOf('.')) : file2;

    // 1. Filename similarity (40%)
    const filenameSim = this.calculateNameSimilarity(name1, name2);

    // 2. Directory overlap (35%)
    const dirSet1 = new Set(parts1);
    const dirSet2 = new Set(parts2);
    const intersection = new Set([...dirSet1].filter(x => dirSet2.has(x)));
    const union = new Set([...dirSet1, ...dirSet2]);
    const dirOverlap = union.size > 0 ? intersection.size / union.size : 0;

    // 3. Extension match (15%)
    const extMatch = ext1 === ext2 ? 1.0 : (ext1 && ext2) ? 0.0 : 0.5;

    // 4. Depth similarity (10%)
    const depthDiff = Math.abs(parts1.length - parts2.length);
    const depthSim = 1.0 / (1 + depthDiff * 0.1);

    return filenameSim * 0.40 + dirOverlap * 0.35 + extMatch * 0.15 + depthSim * 0.10;
  }

  /**
   * Calculate signature similarity by comparing metadata structure
   * Compares: parameters, return type, async status, exported status
   */
  private calculateSignatureSimilarity(sig1: string | undefined, sig2: string | undefined): number {
    if (!sig1 || !sig2) return 0.5; // Neutral if no signature
    if (sig1 === sig2) return 1.0;

    try {
      const meta1 = JSON.parse(sig1);
      const meta2 = JSON.parse(sig2);

      let score = 0.0;
      let factors = 0;

      // Compare async status (25% weight)
      if (meta1.isAsync !== undefined || meta2.isAsync !== undefined) {
        score += (meta1.isAsync === meta2.isAsync) ? 0.25 : 0.0;
        factors++;
      }

      // Compare exported status (25% weight)
      if (meta1.exported !== undefined || meta2.exported !== undefined) {
        score += (meta1.exported === meta2.exported) ? 0.25 : 0.0;
        factors++;
      }

      // Compare parameter count (25% weight)
      const params1 = meta1.parameters?.length ?? 0;
      const params2 = meta2.parameters?.length ?? 0;
      if (params1 > 0 || params2 > 0) {
        const paramDiff = Math.abs(params1 - params2);
        score += Math.max(0, 0.25 - paramDiff * 0.05);
        factors++;
      }

      // Compare element type (25% weight)
      if (meta1.type && meta2.type) {
        score += (meta1.type === meta2.type) ? 0.25 : 0.0;
        factors++;
      }

      return factors > 0 ? score : 0.5;
    } catch {
      // Fallback: string similarity if parsing fails
      return this.calculateNameSimilarity(sig1, sig2);
    }
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
