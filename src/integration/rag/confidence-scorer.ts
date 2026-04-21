/**
 * Confidence Scorer
 * P4-T4: Advanced confidence scoring for answer quality assessment
 *
 * Provides detailed confidence analysis based on:
 * - Retrieval quality
 * - Source diversity
 * - Answer completeness
 * - Historical performance
 */

import type { Answer } from './answer-generation-service.js';
import type { ReRankedResult } from './graph-reranker.js';
import type { BuiltContext } from './context-builder.js';

/**
 * Detailed confidence breakdown
 */
export interface ConfidenceBreakdown {
  /** Overall confidence score (0-1) */
  overall: number;

  /** Individual component scores */
  components: {
    /** Retrieval quality score (0-1) */
    retrievalQuality: number;

    /** Source diversity score (0-1) */
    sourceDiversity: number;

    /** Answer completeness score (0-1) */
    answerCompleteness: number;

    /** LLM certainty score (0-1) */
    llmCertainty: number;

    /** Code quality score (0-1) */
    codeQuality: number;
  };

  /** Confidence level category */
  level: 'very-high' | 'high' | 'medium' | 'low' | 'very-low';

  /** Detailed explanation */
  explanation: string;

  /** Factors affecting confidence */
  factors: {
    positive: string[];
    negative: string[];
  };

  /** Recommendations */
  recommendations?: string[];
}

/**
 * Options for confidence scoring
 */
export interface ConfidenceScoringOptions {
  /** Weight for retrieval quality (default: 0.3) */
  retrievalWeight?: number;

  /** Weight for source diversity (default: 0.2) */
  diversityWeight?: number;

  /** Weight for answer completeness (default: 0.2) */
  completenessWeight?: number;

  /** Weight for LLM certainty (default: 0.15) */
  llmWeight?: number;

  /** Weight for code quality (default: 0.15) */
  qualityWeight?: number;
}

/**
 * Historical performance tracking
 */
interface PerformanceMetrics {
  totalAnswers: number;
  avgConfidence: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
}

/**
 * Advanced confidence scoring service
 */
export class ConfidenceScorer {
  private performanceHistory: PerformanceMetrics = {
    totalAnswers: 0,
    avgConfidence: 0,
    highConfidenceCount: 0,
    lowConfidenceCount: 0
  };

  /**
   * Calculate detailed confidence breakdown for an answer
   */
  calculateConfidence(
    answer: Answer,
    options?: ConfidenceScoringOptions
  ): ConfidenceBreakdown {
    const opts: Required<ConfidenceScoringOptions> = {
      retrievalWeight: options?.retrievalWeight ?? 0.3,
      diversityWeight: options?.diversityWeight ?? 0.2,
      completenessWeight: options?.completenessWeight ?? 0.2,
      llmWeight: options?.llmWeight ?? 0.15,
      qualityWeight: options?.qualityWeight ?? 0.15
    };

    // Calculate component scores
    const retrievalQuality = this.scoreRetrievalQuality(answer.sources);
    const sourceDiversity = this.scoreSourceDiversity(answer.sources);
    const answerCompleteness = this.scoreAnswerCompleteness(
      answer.answer,
      answer.context
    );
    const llmCertainty = this.scoreLLMCertainty(answer);
    const codeQuality = this.scoreCodeQuality(answer.sources);

    // Calculate weighted overall score
    const overall =
      retrievalQuality * opts.retrievalWeight +
      sourceDiversity * opts.diversityWeight +
      answerCompleteness * opts.completenessWeight +
      llmCertainty * opts.llmWeight +
      codeQuality * opts.qualityWeight;

    // Determine confidence level
    const level = this.determineConfidenceLevel(overall);

    // Generate explanation and factors
    const { explanation, factors } = this.generateExplanation(
      overall,
      {
        retrievalQuality,
        sourceDiversity,
        answerCompleteness,
        llmCertainty,
        codeQuality
      },
      answer
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(overall, factors, answer);

    // Update performance history
    this.updatePerformanceHistory(overall);

    return {
      overall,
      components: {
        retrievalQuality,
        sourceDiversity,
        answerCompleteness,
        llmCertainty,
        codeQuality
      },
      level,
      explanation,
      factors,
      recommendations
    };
  }

  /**
   * Score retrieval quality based on search results
   */
  private scoreRetrievalQuality(sources: ReRankedResult[]): number {
    if (sources.length === 0) {
      return 0;
    }

    // Average relevance score
    const avgRelevance =
      sources.reduce((sum, s) => sum + s.score, 0) / sources.length;

    // Penalty for low top score
    const topScore = sources[0]?.score || 0;
    const topScoreFactor = topScore > 0.7 ? 1.0 : 0.8;

    // Bonus for multiple high-quality sources
    const highQualitySources = sources.filter((s) => s.score > 0.7).length;
    const diversityBonus = Math.min(highQualitySources / 3, 0.2);

    return Math.min(1.0, avgRelevance * topScoreFactor + diversityBonus);
  }

  /**
   * Score source diversity
   */
  private scoreSourceDiversity(sources: ReRankedResult[]): number {
    if (sources.length === 0) {
      return 0;
    }

    const uniqueFiles = new Set(sources.map((s) => s.metadata.file)).size;
    const uniqueTypes = new Set(sources.map((s) => s.metadata.type)).size;

    // Normalize scores
    const fileScore = Math.min(uniqueFiles / 5, 1.0);
    const typeScore = Math.min(uniqueTypes / 3, 1.0);

    return (fileScore + typeScore) / 2;
  }

  /**
   * Score answer completeness
   */
  private scoreAnswerCompleteness(
    answer: string,
    context: BuiltContext
  ): number {
    let score = 0.5; // Base score

    // Check answer length (not too short, not too long)
    if (answer.length >= 200 && answer.length <= 2000) {
      score += 0.2;
    } else if (answer.length < 100) {
      score -= 0.2;
    }

    // Check for CodeRef citations
    const coderefCount = (answer.match(/@\w+\/[\w\/-]+#\w+:\d+/g) || []).length;
    if (coderefCount > 0) {
      score += Math.min(coderefCount / context.resultCount, 0.3);
    }

    // Check for structured content
    if (answer.includes('**')) {
      score += 0.1; // Has formatting
    }

    // Check for related questions
    if (answer.toLowerCase().includes('related question')) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score LLM certainty
   */
  private scoreLLMCertainty(answer: Answer): number {
    let score = 0.5;

    // Check finish reason
    if (answer.tokenUsage.completionTokens > 0) {
      // Answer was not truncated
      score += 0.3;
    }

    // Check for uncertainty phrases
    const uncertainPhrases = [
      "i'm not sure",
      'might be',
      'possibly',
      'unclear',
      'not enough information'
    ];

    const lowerAnswer = answer.answer.toLowerCase();
    const uncertaintyCount = uncertainPhrases.filter((phrase) =>
      lowerAnswer.includes(phrase)
    ).length;

    if (uncertaintyCount > 0) {
      score -= uncertaintyCount * 0.15;
    } else {
      // No uncertainty phrases is good
      score += 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score code quality of sources
   */
  private scoreCodeQuality(sources: ReRankedResult[]): number {
    if (sources.length === 0) {
      return 0.5; // Neutral if no sources
    }

    let totalScore = 0;
    let countWithMetrics = 0;

    for (const source of sources) {
      let sourceScore = 0.5; // Base score

      // Test coverage bonus
      if (source.metadata.coverage !== undefined) {
        sourceScore += (source.metadata.coverage / 100) * 0.3;
        countWithMetrics++;
      }

      // Complexity penalty
      if (source.metadata.complexity !== undefined) {
        const complexityPenalty = Math.min(source.metadata.complexity / 50, 0.2);
        sourceScore -= complexityPenalty;
        countWithMetrics++;
      }

      // Documentation bonus
      if (source.metadata.documentation) {
        sourceScore += 0.2;
      }

      totalScore += Math.max(0, Math.min(1, sourceScore));
    }

    return totalScore / sources.length;
  }

  /**
   * Determine confidence level category
   */
  private determineConfidenceLevel(
    score: number
  ): ConfidenceBreakdown['level'] {
    if (score >= 0.8) return 'very-high';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    if (score >= 0.2) return 'low';
    return 'very-low';
  }

  /**
   * Generate explanation and factors
   */
  private generateExplanation(
    overall: number,
    components: ConfidenceBreakdown['components'],
    answer: Answer
  ): Pick<ConfidenceBreakdown, 'explanation' | 'factors'> {
    const positive: string[] = [];
    const negative: string[] = [];

    // Analyze components
    if (components.retrievalQuality > 0.7) {
      positive.push('High-quality search results');
    } else if (components.retrievalQuality < 0.4) {
      negative.push('Low relevance search results');
    }

    if (components.sourceDiversity > 0.6) {
      positive.push('Diverse sources from multiple files');
    } else if (components.sourceDiversity < 0.3) {
      negative.push('Limited source diversity');
    }

    if (components.answerCompleteness > 0.7) {
      positive.push('Well-structured, complete answer');
    } else if (components.answerCompleteness < 0.4) {
      negative.push('Answer may be incomplete');
    }

    if (components.llmCertainty > 0.7) {
      positive.push('LLM expressed high certainty');
    } else if (components.llmCertainty < 0.4) {
      negative.push('LLM expressed uncertainty');
    }

    if (components.codeQuality > 0.6) {
      positive.push('Well-tested, documented code sources');
    }

    // Generate explanation
    const level = this.determineConfidenceLevel(overall);
    const percentage = (overall * 100).toFixed(0);

    let explanation = `${level.toUpperCase()} confidence (${percentage}%). `;

    if (positive.length > 0) {
      explanation += `Strengths: ${positive.join(', ')}. `;
    }

    if (negative.length > 0) {
      explanation += `Concerns: ${negative.join(', ')}.`;
    }

    return {
      explanation,
      factors: { positive, negative }
    };
  }

  /**
   * Generate recommendations for improving confidence
   */
  private generateRecommendations(
    overall: number,
    factors: ConfidenceBreakdown['factors'],
    answer: Answer
  ): string[] {
    const recommendations: string[] = [];

    // Low confidence recommendations
    if (overall < 0.5) {
      recommendations.push(
        'Consider rephrasing your question with more specific keywords'
      );

      if (answer.sources.length < 3) {
        recommendations.push(
          'Try a broader search or check if relevant code has been indexed'
        );
      }
    }

    // No CodeRef citations
    const hasCoderefs = answer.answer.includes('@');
    if (!hasCoderefs && answer.sources.length > 0) {
      recommendations.push(
        'Answer lacks CodeRef citations - may be less actionable'
      );
    }

    // Low source diversity
    if (factors.negative.includes('Limited source diversity')) {
      recommendations.push(
        'Consider exploring related files or components'
      );
    }

    return recommendations;
  }

  /**
   * Update performance history
   */
  private updatePerformanceHistory(confidence: number): void {
    this.performanceHistory.totalAnswers++;

    // Update running average
    const prevTotal = this.performanceHistory.avgConfidence *
      (this.performanceHistory.totalAnswers - 1);
    this.performanceHistory.avgConfidence =
      (prevTotal + confidence) / this.performanceHistory.totalAnswers;

    // Update counts
    if (confidence >= 0.7) {
      this.performanceHistory.highConfidenceCount++;
    } else if (confidence < 0.4) {
      this.performanceHistory.lowConfidenceCount++;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceMetrics {
    return { ...this.performanceHistory };
  }

  /**
   * Reset performance history
   */
  resetPerformanceHistory(): void {
    this.performanceHistory = {
      totalAnswers: 0,
      avgConfidence: 0,
      highConfidenceCount: 0,
      lowConfidenceCount: 0
    };
  }

  /**
   * Compare confidence across multiple answers
   */
  compareConfidence(answers: Answer[]): {
    best: Answer;
    worst: Answer;
    avgConfidence: number;
    variance: number;
  } {
    const confidences = answers.map((a) => a.confidence);

    const best = answers.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    const worst = answers.reduce((worst, current) =>
      current.confidence < worst.confidence ? current : worst
    );

    const avgConfidence =
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    // Calculate variance
    const variance =
      confidences.reduce(
        (sum, c) => sum + Math.pow(c - avgConfidence, 2),
        0
      ) / confidences.length;

    return { best, worst, avgConfidence, variance };
  }
}
