/**
 * Integration tests for Q&A pipeline
 * Tests the complete flow from question to answer with CodeRef citations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnswerGenerationService } from '../../answer-generation-service.js';
import { ConversationManager } from '../../conversation-manager.js';
import type { LLMProvider, LLMResponse } from '../../../llm/llm-provider.js';
import type { VectorStore, QueryResult, VectorRecord } from '../../../vector/vector-store.js';

describe('Q&A Pipeline Integration', () => {
  let mockLLMProvider: LLMProvider;
  let mockVectorStore: VectorStore;
  let answerService: AnswerGenerationService;
  let conversationManager: ConversationManager;

  beforeEach(() => {
    // Mock LLM Provider
    mockLLMProvider = {
      complete: vi.fn().mockResolvedValue({
        text: 'Authentication is handled by the **@Fn/auth/login#authenticate:24** function. This function validates user credentials using **@Fn/utils/hash#hashPassword:10** for password hashing.\n\n**Related Questions**:\n- How do I implement logout?\n- What is the session timeout?',
        usage: {
          promptTokens: 500,
          completionTokens: 100,
          totalTokens: 600
        },
        finishReason: 'stop',
        model: 'mock-model'
      } as LLMResponse),
      embed: vi.fn().mockResolvedValue([Array(1536).fill(0.1)]),
      countTokens: vi.fn().mockReturnValue(100),
      getProviderName: vi.fn().mockReturnValue('mock-llm'),
      getModel: vi.fn().mockReturnValue('mock-model')
    };

    // Mock Vector Store with sample results
    mockVectorStore = {
      upsert: vi.fn(),
      query: vi.fn().mockResolvedValue({
        matches: [
          {
            id: '@Fn/auth/login#authenticate:24',
            score: 0.92,
            values: Array(1536).fill(0.1),
            metadata: {
              coderef: '@Fn/auth/login#authenticate:24',
              type: 'function',
              name: 'authenticate',
              file: '/auth/login.ts',
              line: 24,
              language: 'typescript',
              exported: true,
              dependentCount: 15,
              dependencyCount: 3,
              coverage: 90,
              complexity: 10,
              documentation: 'Authenticates a user with email and password'
            }
          },
          {
            id: '@Fn/utils/hash#hashPassword:10',
            score: 0.85,
            values: Array(1536).fill(0.2),
            metadata: {
              coderef: '@Fn/utils/hash#hashPassword:10',
              type: 'function',
              name: 'hashPassword',
              file: '/utils/hash.ts',
              line: 10,
              language: 'typescript',
              exported: true,
              dependentCount: 20,
              dependencyCount: 0,
              coverage: 95,
              complexity: 5
            }
          },
          {
            id: '@Fn/db/users#findUser:30',
            score: 0.80,
            values: Array(1536).fill(0.3),
            metadata: {
              coderef: '@Fn/db/users#findUser:30',
              type: 'function',
              name: 'findUser',
              file: '/db/users.ts',
              line: 30,
              language: 'typescript',
              exported: false,
              dependentCount: 10,
              dependencyCount: 2,
              coverage: 85,
              complexity: 8
            }
          }
        ],
        namespace: 'default'
      } as QueryResult),
      delete: vi.fn(),
      clear: vi.fn(),
      initialize: vi.fn(),
      stats: vi.fn().mockResolvedValue({
        recordCount: 100,
        dimension: 1536,
        indexName: 'test-index'
      }),
      getProviderName: vi.fn().mockReturnValue('mock-vector-store')
    };

    // Initialize services using actual constructor signature
    // AnswerGenerationService(llmProvider, vectorStore, graph?)
    answerService = new AnswerGenerationService(
      mockLLMProvider,
      mockVectorStore
    );

    conversationManager = new ConversationManager({
      maxHistoryLength: 10,
      maxHistoryTokens: 2000,
      sessionTimeoutMs: 3600000
    });
  });

  describe('Full Q&A Pipeline', () => {
    it('should complete full Q&A flow', async () => {
      const answer = await answerService.generateAnswer('How does authentication work?');

      // Verify search was performed
      expect(mockVectorStore.query).toHaveBeenCalled();

      // Verify LLM was called
      expect(mockLLMProvider.complete).toHaveBeenCalled();

      // Verify answer structure
      expect(answer.question).toBe('How does authentication work?');
      expect(answer.answer).toContain('@Fn/auth/login#authenticate:24');
      expect(answer.sources).toHaveLength(3);
      expect(answer.confidence).toBeGreaterThan(0);
      expect(answer.confidence).toBeLessThanOrEqual(1);
      expect(answer.tokenUsage.totalTokens).toBeGreaterThan(0);
      expect(answer.sources.length).toBeGreaterThan(0);
    });

    it('should include CodeRef citations in answer', async () => {
      const answer = await answerService.generateAnswer('authentication');

      // Verify CodeRef tags are present
      expect(answer.answer).toMatch(/@[A-Z][a-z]+\/[\w\/-]+#\w+:\d+/);
      expect(answer.answer).toContain('@Fn/auth/login#authenticate:24');
    });

    it('should extract related questions', async () => {
      const answer = await answerService.generateAnswer('authentication');

      expect(answer.relatedQuestions).toBeDefined();
      expect(Array.isArray(answer.relatedQuestions)).toBe(true);
      expect(answer.relatedQuestions!.length).toBeGreaterThan(0);
    });

    it('should calculate confidence score', async () => {
      const answer = await answerService.generateAnswer('authentication');

      expect(answer.confidence).toBeGreaterThan(0);
      expect(answer.confidence).toBeLessThanOrEqual(1);

      // High-quality results should have decent confidence
      expect(answer.confidence).toBeGreaterThan(0.5);
    });

    it('should apply graph-aware re-ranking', async () => {
      const answer = await answerService.generateAnswer('authentication', {
        rerankingOptions: {
          queryStrategy: 'centrality',
          maxBoost: 2.0
        }
      });

      // Verify sources were re-ranked
      expect(answer.sources).toHaveLength(3);
      expect(answer.sources[0].rerankedScore).toBeGreaterThanOrEqual(answer.sources[0].score);

      // Without a graph, boostFactor is exactly 1.0; with graph it would be > 1.0
      const authenticateSource = answer.sources.find(s => s.metadata.name === 'authenticate');
      expect(authenticateSource).toBeDefined();
      expect(authenticateSource!.boostFactor).toBeGreaterThanOrEqual(1.0);
    });

    it('should build context with proper formatting', async () => {
      const answer = await answerService.generateAnswer('authentication');

      // Verify context was built
      expect(answer.context).toBeDefined();
      expect(answer.context.markdown).toContain('# Code Search Results');
      expect(answer.context.resultCount).toBeGreaterThan(0);
      expect(answer.context.estimatedTokens).toBeGreaterThan(0);
    });

    it('should handle different query strategies', async () => {
      const strategies = ['semantic', 'centrality', 'quality', 'usage', 'public'];

      for (const strategy of strategies) {
        const answer = await answerService.generateAnswer('test query', {
          rerankingOptions: { queryStrategy: strategy as any }
        });

        expect(answer).toBeDefined();
        expect(answer.sources.length).toBeGreaterThan(0);
      }
    });

    it('should filter by language', async () => {
      const answer = await answerService.generateAnswer('test query', {
        searchOptions: { language: 'typescript' }
      });

      expect(mockVectorStore.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          filter: expect.objectContaining({ language: 'typescript' })
        })
      );
    });

    it('should limit results by topK', async () => {
      const answer = await answerService.generateAnswer('test query', {
        searchOptions: { topK: 5 }
      });

      expect(mockVectorStore.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ topK: 5 })
      );
    });
  });

  describe('Conversational Q&A', () => {
    it('should create and manage conversation sessions', () => {
      const session = conversationManager.createSession('user-123');

      expect(session.sessionId).toBeDefined();
      expect(session.messages).toHaveLength(0);
      expect(session.metadata?.userId).toBe('user-123');
    });

    it('should track conversation history', async () => {
      const session = conversationManager.createSession();
      const sessionId = session.sessionId;

      // First question
      conversationManager.addUserMessage(sessionId, 'How does authentication work?');
      const answer1 = await answerService.generateAnswer('How does authentication work?');
      conversationManager.addAssistantMessage(sessionId, answer1);

      // Second question
      conversationManager.addUserMessage(sessionId, 'Show me the login code');
      const answer2 = await answerService.generateAnswer('Show me the login code');
      conversationManager.addAssistantMessage(sessionId, answer2);

      // Verify history
      const history = conversationManager.getHistory(sessionId);
      expect(history).toHaveLength(4); // 2 user + 2 assistant messages
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });

    it('should format history for context', () => {
      const session = conversationManager.createSession();
      const sessionId = session.sessionId;

      conversationManager.addUserMessage(sessionId, 'First question');
      conversationManager.addUserMessage(sessionId, 'Second question');

      const formatted = conversationManager.getHistoryForContext(sessionId);

      expect(formatted).toContain('**User**: First question');
      expect(formatted).toContain('**User**: Second question');
    });

    it('should trim history when exceeding limits', () => {
      const manager = new ConversationManager({
        maxHistoryLength: 4, // Only keep 4 messages
        maxHistoryTokens: 10000
      });

      const session = manager.createSession();
      const sessionId = session.sessionId;

      // Add more than limit
      for (let i = 0; i < 10; i++) {
        manager.addUserMessage(sessionId, `Question ${i}`);
      }

      const history = manager.getHistory(sessionId);
      expect(history.length).toBeLessThanOrEqual(4);
    });

    it('should track session statistics', async () => {
      const session = conversationManager.createSession();
      const sessionId = session.sessionId;

      conversationManager.addUserMessage(sessionId, 'Question 1');
      const answer = await answerService.generateAnswer('Question 1');
      conversationManager.addAssistantMessage(sessionId, answer);

      const stats = conversationManager.getSessionStats(sessionId);

      expect(stats).toBeDefined();
      expect(stats!.messageCount).toBe(2);
      expect(stats!.questionCount).toBe(1);
      expect(stats!.totalTokens).toBeGreaterThan(0);
      expect(stats!.avgConfidence).toBeGreaterThan(0);
      expect(stats!.duration).toBeGreaterThanOrEqual(0);
    });

    it('should clear expired sessions', async () => {
      const manager = new ConversationManager({
        sessionTimeoutMs: 100 // 100ms timeout for testing
      });

      const session = manager.createSession();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleared = manager.clearExpiredSessions();
      expect(cleared).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM errors gracefully', async () => {
      mockLLMProvider.complete = vi.fn().mockRejectedValue(new Error('LLM error'));

      await expect(
        answerService.generateAnswer('test question')
      ).rejects.toThrow('LLM error');
    });

    it('should handle vector store errors gracefully', async () => {
      mockVectorStore.query = vi.fn().mockRejectedValue(new Error('Vector store error'));

      await expect(
        answerService.generateAnswer('test question')
      ).rejects.toThrow('Vector store error');
    });

    it('should handle no results scenario', async () => {
      mockVectorStore.query = vi.fn().mockResolvedValue({
        matches: [],
        namespace: 'default'
      } as QueryResult);

      const answer = await answerService.generateAnswer('non-existent code');

      // Should still generate an answer (LLM will say no results found)
      expect(answer).toBeDefined();
      expect(answer.sources).toHaveLength(0);
      expect(answer.confidence).toBeLessThan(0.5); // Low confidence
    });
  });

  describe('Performance', () => {
    it('should complete Q&A in reasonable time', async () => {
      const startTime = Date.now();

      await answerService.generateAnswer('test question');

      const duration = Date.now() - startTime;

      // Should complete within 5 seconds (with mocks it should be much faster)
      expect(duration).toBeLessThan(5000);
    });

    it('should track token usage', async () => {
      const answer = await answerService.generateAnswer('test question');

      expect(answer.tokenUsage.promptTokens).toBeGreaterThan(0);
      expect(answer.tokenUsage.completionTokens).toBeGreaterThan(0);
      expect(answer.tokenUsage.totalTokens).toBe(
        answer.tokenUsage.promptTokens + answer.tokenUsage.completionTokens
      );
    });
  });
});
