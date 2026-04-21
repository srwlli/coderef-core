/**
 * Answer Generation Service
 * P4-T2: Orchestrates the complete Q&A pipeline
 *
 * This is the main entry point for asking questions. It:
 * 1. Searches for relevant code
 * 2. Re-ranks with graph awareness
 * 3. Builds context
 * 4. Generates answer with LLM
 * 5. Calculates confidence
 */

import type { LLMProvider } from '../llm/llm-provider.js';
import type { VectorStore } from '../vector/vector-store.js';
import type { DependencyGraph } from '../../analyzer/graph-builder.js';
import {
  SemanticSearchService,
  type SearchOptions,
  type QueryContext,
  type SearchResponse
} from './semantic-search.js';
import {
  GraphReRanker,
  type ReRankingOptions,
  type ReRankedResult
} from './graph-reranker.js';
import {
  ContextBuilder,
  type ContextBuilderOptions,
  type BuiltContext
} from './context-builder.js';
import {
  PromptTemplateBuilder,
  type PromptVariables
} from './prompt-templates.js';

/**
 * Options for answer generation
 */
export interface AnswerOptions {
  /** Search options */
  searchOptions?: SearchOptions;

  /** Re-ranking options */
  rerankingOptions?: ReRankingOptions;

  /** Context building options */
  contextOptions?: ContextBuilderOptions;

  /** Completion options for LLM */
  completionOptions?: {
    temperature?: number;
    maxTokens?: number;
  };

  /** Query context for better results */
  queryContext?: QueryContext;

  /** User preferences */
  preferences?: PromptVariables['preferences'];
}

/**
 * Generated answer with metadata
 */
export interface Answer {
  /** The generated answer text */
  answer: string;

  /** Question that was asked */
  question: string;

  /** Source code references used */
  sources: ReRankedResult[];

  /** Confidence score (0-1) */
  confidence: number;

  /** Confidence explanation */
  confidenceReasoning: string;

  /** Suggested follow-up questions */
  relatedQuestions?: string[];

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Token usage */
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Context that was provided to LLM */
  context: BuiltContext;

  /** Metadata */
  metadata?: {
    searchTime: number;
    rerankingTime: number;
    contextBuildTime: number;
    llmTime: number;
    questionType: string;
  };
}

/**
 * Service for generating answers to code questions
 */
export class AnswerGenerationService {
  private llmProvider: LLMProvider;
  private searchService: SemanticSearchService;
  private reranker: GraphReRanker;
  private contextBuilder: ContextBuilder;
  private promptBuilder: PromptTemplateBuilder;

  constructor(
    llmProvider: LLMProvider,
    vectorStore: VectorStore,
    graph?: DependencyGraph
  ) {
    this.llmProvider = llmProvider;
    this.searchService = new SemanticSearchService(llmProvider, vectorStore);
    this.reranker = new GraphReRanker(graph);
    this.contextBuilder = new ContextBuilder();
    this.promptBuilder = new PromptTemplateBuilder();
  }

  /**
   * Update the dependency graph for re-ranking
   */
  setGraph(graph: DependencyGraph): void {
    this.reranker.setGraph(graph);
  }

  /**
   * Generate answer to a question
   */
  async generateAnswer(
    question: string,
    options?: AnswerOptions
  ): Promise<Answer> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    try {
      // Step 1: Search for relevant code
      const searchStart = Date.now();
      const searchResponse = await this.searchService.search(
        question,
        options?.searchOptions,
        options?.queryContext
      );
      timings.searchTime = Date.now() - searchStart;

      // Check if we got any results
      if (searchResponse.results.length === 0) {
        return this.generateNoResultsAnswer(question, startTime);
      }

      // Step 2: Re-rank with graph awareness
      const rerankStart = Date.now();
      const reranked = this.reranker.rerank(
        searchResponse.results,
        options?.rerankingOptions
      );
      timings.rerankingTime = Date.now() - rerankStart;

      // Step 3: Build context
      const contextStart = Date.now();
      const context = this.contextBuilder.buildContext(
        reranked,
        options?.contextOptions
      );
      timings.contextBuildTime = Date.now() - contextStart;

      // Step 4: Build prompt
      const promptVariables: PromptVariables = {
        question,
        context: context.markdown,
        preferences: options?.preferences
      };

      const { systemPrompt, userPrompt, questionType } =
        this.promptBuilder.buildPrompt(promptVariables);

      // Step 5: Generate answer with LLM
      const llmStart = Date.now();
      const llmResponse = await this.llmProvider.complete(userPrompt, {
        temperature: options?.completionOptions?.temperature ?? 0.3,
        maxTokens: options?.completionOptions?.maxTokens ?? 2000
      });
      timings.llmTime = Date.now() - llmStart;

      // Step 6: Calculate confidence
      const confidence = this.calculateConfidence(
        reranked,
        llmResponse,
        context
      );

      // Step 7: Extract related questions (if present in response)
      const relatedQuestions = this.extractRelatedQuestions(llmResponse.text);

      const processingTimeMs = Date.now() - startTime;

      return {
        answer: llmResponse.text,
        question,
        sources: reranked,
        confidence: confidence.score,
        confidenceReasoning: confidence.reasoning,
        relatedQuestions,
        processingTimeMs,
        tokenUsage: {
          promptTokens: llmResponse.usage.promptTokens,
          completionTokens: llmResponse.usage.completionTokens,
          totalTokens: llmResponse.usage.totalTokens
        },
        context,
        metadata: {
          searchTime: timings.searchTime,
          rerankingTime: timings.rerankingTime,
          contextBuildTime: timings.contextBuildTime,
          llmTime: timings.llmTime,
          questionType
        }
      };
    } catch (error: any) {
      throw new Error(`Answer generation failed: ${error.message}`);
    }
  }

  /**
   * Generate answer when no results found
   */
  private generateNoResultsAnswer(
    question: string,
    startTime: number
  ): Answer {
    return {
      answer:
        "I couldn't find any relevant code for that question. This could mean:\n" +
        '- The codebase has not been indexed yet\n' +
        '- The question is about code that does not exist\n' +
        '- Try rephrasing your question with different keywords',
      question,
      sources: [],
      confidence: 0,
      confidenceReasoning:
        'No relevant code found in the index',
      processingTimeMs: Date.now() - startTime,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      context: {
        markdown: '',
        resultCount: 0,
        estimatedTokens: 0,
        includedResults: []
      }
    };
  }

  /**
   * Calculate confidence score for the answer
   */
  private calculateConfidence(
    sources: ReRankedResult[],
    llmResponse: any,
    context: BuiltContext
  ): { score: number; reasoning: string } {
    const factors: string[] = [];
    let score = 0.5; // Base confidence

    // Factor 1: Search result quality (40% weight)
    if (sources.length > 0) {
      const avgScore = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
      const searchQuality = avgScore * 0.4;
      score += searchQuality;

      if (avgScore > 0.8) {
        factors.push('high-quality search results');
      } else if (avgScore < 0.5) {
        factors.push('low-quality search results');
        score -= 0.1;
      }
    } else {
      score = 0.1;
      factors.push('no relevant code found');
    }

    // Factor 2: Number of sources (20% weight)
    if (sources.length >= 5) {
      score += 0.1;
      factors.push('multiple relevant sources');
    } else if (sources.length === 1) {
      score -= 0.05;
      factors.push('limited sources');
    }

    // Factor 3: Context quality (20% weight)
    if (context.resultCount > 0) {
      const hasCode = context.includedResults.some(
        (r) => r.metadata.documentation || r.snippet
      );
      if (hasCode) {
        score += 0.1;
        factors.push('detailed code context');
      }
    }

    // Factor 4: LLM finish reason (20% weight)
    if (llmResponse.finishReason === 'stop') {
      score += 0.1;
      factors.push('complete response');
    } else if (llmResponse.finishReason === 'length') {
      score -= 0.05;
      factors.push('response truncated');
    }

    // Normalize to 0-1 range
    score = Math.max(0, Math.min(1, score));

    const reasoning = `Confidence: ${(score * 100).toFixed(0)}% (${factors.join(', ')})`;

    return { score, reasoning };
  }

  /**
   * Extract related questions from LLM response
   */
  private extractRelatedQuestions(response: string): string[] | undefined {
    const relatedSection = response.match(
      /\*\*Related Questions\*\*:?\s*([\s\S]*?)(?:\n\n|$)/i
    );

    if (!relatedSection) {
      return undefined;
    }

    const questions = relatedSection[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter((q) => q.length > 0);

    return questions.length > 0 ? questions : undefined;
  }

  /**
   * Generate multiple answer variations
   *
   * Useful for getting diverse perspectives or checking consistency
   */
  async generateVariations(
    question: string,
    count: number = 3,
    options?: AnswerOptions
  ): Promise<Answer[]> {
    const promises = Array.from({ length: count }, () =>
      this.generateAnswer(question, {
        ...options,
        completionOptions: {
          ...options?.completionOptions,
          temperature: 0.7 // Higher temperature for diversity
        }
      })
    );

    return Promise.all(promises);
  }

  /**
   * Validate answer quality
   *
   * Returns warnings about the generated answer
   */
  validateAnswer(answer: Answer): string[] {
    const warnings: string[] = [];

    // Check confidence
    if (answer.confidence < 0.3) {
      warnings.push('Very low confidence - answer may be unreliable');
    }

    // Check sources
    if (answer.sources.length === 0) {
      warnings.push('No source code references - answer not grounded in codebase');
    }

    // Check answer length
    if (answer.answer.length < 100) {
      warnings.push('Answer is very short - may lack detail');
    }

    // Check for CodeRef tags
    const coderefCount = (answer.answer.match(/@\w+\//g) || []).length;
    if (coderefCount === 0 && answer.sources.length > 0) {
      warnings.push('Answer does not cite sources with CodeRef tags');
    }

    // Check finish reason
    if (
      answer.tokenUsage.completionTokens > 0 &&
      answer.answer.endsWith('...')
    ) {
      warnings.push('Answer may be truncated');
    }

    return warnings;
  }

  /**
   * Analyze answer for quality metrics
   */
  analyzeAnswer(answer: Answer): {
    hasCodeRefs: boolean;
    codeRefCount: number;
    hasRelatedQuestions: boolean;
    answerLength: number;
    avgSourceRelevance: number;
    processingEfficiency: number;
  } {
    const coderefMatches = answer.answer.match(/@\w+\/[\w\/-]+#\w+:\d+/g);
    const codeRefCount = coderefMatches?.length || 0;

    const avgSourceRelevance =
      answer.sources.length > 0
        ? answer.sources.reduce((sum, s) => sum + s.score, 0) /
          answer.sources.length
        : 0;

    // Processing efficiency: tokens per millisecond
    const processingEfficiency =
      answer.tokenUsage.totalTokens / answer.processingTimeMs;

    return {
      hasCodeRefs: codeRefCount > 0,
      codeRefCount,
      hasRelatedQuestions: (answer.relatedQuestions?.length ?? 0) > 0,
      answerLength: answer.answer.length,
      avgSourceRelevance,
      processingEfficiency
    };
  }
}
