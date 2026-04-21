/**
 * IMP-CORE-044: Frontend Update Generator Tests
 *
 * Test suite for automated frontend call update generation.
 */

import { describe, it, expect } from 'vitest';
import type { FrontendCall, MigrationMapping } from '../types/types.js';
import {
  getConfidenceLevel,
  calculatePathConfidence,
  generateUpdateSuggestions,
  batchProcessCalls,
  generateGitPatch,
  generateUpdateReport,
  exportBatchResults,
  CONFIDENCE_THRESHOLDS,
  type BatchUpdateResult,
  type FrontendUpdateSuggestion
} from './frontend-update-generator.js';

describe('Frontend Update Generator', () => {
  describe('getConfidenceLevel', () => {
    it('should return auto for 95%+ confidence', () => {
      expect(getConfidenceLevel(95)).toBe('auto');
      expect(getConfidenceLevel(100)).toBe('auto');
      expect(getConfidenceLevel(99)).toBe('auto');
    });

    it('should return suggest for 70-94% confidence', () => {
      expect(getConfidenceLevel(70)).toBe('suggest');
      expect(getConfidenceLevel(94)).toBe('suggest');
      expect(getConfidenceLevel(80)).toBe('suggest');
    });

    it('should return flag for <70% confidence', () => {
      expect(getConfidenceLevel(69)).toBe('flag');
      expect(getConfidenceLevel(0)).toBe('flag');
      expect(getConfidenceLevel(50)).toBe('flag');
    });
  });

  describe('calculatePathConfidence', () => {
    it('should return 100 for exact match', () => {
      const result = calculatePathConfidence(
        '/api/users',
        '/api/users',
        'GET',
        { confidence: 100, mappingRule: 'explicit' }
      );
      expect(result).toBe(100);
    });

    it('should boost explicit mappings', () => {
      const result = calculatePathConfidence(
        '/api/v1/users',
        '/api/v2/users',
        'GET',
        { confidence: 95, mappingRule: 'explicit' }
      );
      expect(result).toBe(100);
    });

    it('should use mapping confidence for pattern matches', () => {
      const result = calculatePathConfidence(
        '/api/v1/items',
        '/api/v2/items',
        'GET',
        { confidence: 80, mappingRule: 'pattern' }
      );
      expect(result).toBe(80);
    });

    it('should return 0 confidence for unmapped routes', () => {
      const result = calculatePathConfidence(
        '/api/users',
        '/api/v2/users',
        'GET',
        { confidence: 0, mappingRule: 'unmapped' }
      );
      expect(result).toBe(0);
    });

    it('should calculate structural similarity for similar paths with low mapping confidence', () => {
      const result = calculatePathConfidence(
        '/api/users',
        '/api/v2/users',
        'GET',
        { confidence: 30, mappingRule: 'similarity' }
      );
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(70);
    });
  });

  describe('generateUpdateSuggestions', () => {
    const mockCalls: FrontendCall[] = [
      {
        path: '/api/v1/users',
        method: 'GET',
        file: '/project/src/api.ts',
        line: 10,
        callType: 'fetch',
        confidence: 100
      },
      {
        path: '/api/v1/posts',
        method: 'POST',
        file: '/project/src/api.ts',
        line: 20,
        callType: 'axios',
        confidence: 100
      },
      {
        path: '/api/unknown',
        method: 'GET',
        file: '/project/src/api.ts',
        line: 30,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const mockConfig: MigrationMapping = {
      version: '1.0.0',
      name: 'v1→v2',
      mappings: {
        paths: {
          '/api/v1/users': '/api/v2/users'
        },
        patterns: [
          { find: '^/api/v1/(.*)$', replace: '/api/v2/$1' }
        ]
      },
      metadata: {
        source: 'v1',
        target: 'v2',
        createdAt: '2024-01-15T10:00:00Z',
        description: 'Test migration'
      }
    };

    it('should generate suggestions for all calls', () => {
      const suggestions = generateUpdateSuggestions(mockCalls, mockConfig);

      expect(suggestions).toHaveLength(3);
    });

    it('should mark explicit mappings as auto-apply', () => {
      const suggestions = generateUpdateSuggestions(mockCalls, mockConfig);
      const userSuggestion = suggestions.find(s => s.originalCall.path === '/api/v1/users');

      expect(userSuggestion?.canAutoApply).toBe(true);
      expect(userSuggestion?.confidenceLevel).toBe('auto');
      expect(userSuggestion?.mappingRule).toBe('explicit');
    });

    it('should mark pattern mappings as suggest', () => {
      const suggestions = generateUpdateSuggestions(mockCalls, mockConfig);
      const postSuggestion = suggestions.find(s => s.originalCall.path === '/api/v1/posts');

      expect(postSuggestion?.confidenceLevel).toBe('suggest');
      expect(postSuggestion?.mappingRule).toBe('pattern');
    });

    it('should flag unmapped calls', () => {
      const suggestions = generateUpdateSuggestions(mockCalls, mockConfig);
      const unknownSuggestion = suggestions.find(s => s.originalCall.path === '/api/unknown');

      expect(unknownSuggestion?.confidenceLevel).toBe('flag');
      expect(unknownSuggestion?.confidence).toBe(0);
    });
  });

  describe('batchProcessCalls', () => {
    const mockCalls: FrontendCall[] = [
      {
        path: '/api/v1/users',
        method: 'GET',
        file: '/project/src/api.ts',
        line: 10,
        callType: 'fetch',
        confidence: 100
      },
      {
        path: '/api/v1/posts',
        method: 'POST',
        file: '/project/src/api.ts',
        line: 20,
        callType: 'axios',
        confidence: 100
      },
      {
        path: '/api/unknown',
        method: 'GET',
        file: '/project/src/api.ts',
        line: 30,
        callType: 'fetch',
        confidence: 100
      }
    ];

    const mockConfig: MigrationMapping = {
      version: '1.0.0',
      name: 'v1→v2',
      mappings: {
        paths: {
          '/api/v1/users': '/api/v2/users'
        },
        patterns: [
          { find: '^/api/v1/(.*)$', replace: '/api/v2/$1' }
        ]
      },
      metadata: {
        source: 'v1',
        target: 'v2',
        createdAt: '2024-01-15T10:00:00Z',
        description: 'Test migration'
      }
    };

    it('should categorize calls correctly', () => {
      const result = batchProcessCalls(mockCalls, mockConfig);

      expect(result.totalCalls).toBe(3);
      expect(result.stats.auto).toBe(1); // Explicit mapping
      expect(result.stats.suggest).toBe(1); // Pattern match
      expect(result.stats.flag).toBe(1); // Unmapped
    });

    it('should populate autoUpdates array', () => {
      const result = batchProcessCalls(mockCalls, mockConfig);

      expect(result.autoUpdates).toHaveLength(1);
      expect(result.autoUpdates[0].originalCall.path).toBe('/api/v1/users');
    });

    it('should populate suggestedUpdates array', () => {
      const result = batchProcessCalls(mockCalls, mockConfig);

      expect(result.suggestedUpdates).toHaveLength(1);
      expect(result.suggestedUpdates[0].originalCall.path).toBe('/api/v1/posts');
    });

    it('should populate flaggedUpdates array', () => {
      const result = batchProcessCalls(mockCalls, mockConfig);

      expect(result.flaggedUpdates).toHaveLength(1);
      expect(result.flaggedUpdates[0].originalCall.path).toBe('/api/unknown');
    });

    it('should identify unmapped calls', () => {
      const result = batchProcessCalls(mockCalls, mockConfig);

      expect(result.unmappedCalls).toHaveLength(1);
      expect(result.unmappedCalls[0].path).toBe('/api/unknown');
    });
  });

  describe('generateGitPatch', () => {
    it('should generate valid git patch format', () => {
      const modifications = [
        {
          file: '/project/src/api.ts',
          line: 10,
          original: 'fetch("/api/v1/users")',
          replacement: 'fetch("/api/v2/users")',
          safe: true
        },
        {
          file: '/project/src/api.ts',
          line: 20,
          original: 'axios.post("/api/v1/posts")',
          replacement: 'axios.post("/api/v2/posts")',
          safe: true
        }
      ];

      const patch = generateGitPatch(modifications, '/project');

      expect(patch.filename).toContain('migration-frontend-updates');
      expect(patch.content).toContain('--- a/src/api.ts');
      expect(patch.content).toContain('+++ b/src/api.ts');
      expect(patch.content).toContain('-fetch("/api/v1/users")');
      expect(patch.content).toContain('+fetch("/api/v2/users")');
      expect(patch.additions).toBe(2);
      expect(patch.deletions).toBe(2);
    });

    it('should handle multiple files', () => {
      const modifications = [
        {
          file: '/project/src/api.ts',
          line: 10,
          original: 'fetch("/api/v1/users")',
          replacement: 'fetch("/api/v2/users")',
          safe: true
        },
        {
          file: '/project/src/services/data.ts',
          line: 5,
          original: 'get("/api/v1/data")',
          replacement: 'get("/api/v2/data")',
          safe: true
        }
      ];

      const patch = generateGitPatch(modifications, '/project');

      expect(patch.content).toContain('--- a/src/api.ts');
      expect(patch.content).toContain('--- a/src/services/data.ts');
    });
  });

  describe('generateUpdateReport', () => {
    const mockResult: BatchUpdateResult = {
      totalCalls: 10,
      autoUpdates: [
        {
          id: 'update-1',
          originalCall: {
            path: '/api/v1/users',
            method: 'GET',
            file: '/project/src/api.ts',
            line: 10,
            callType: 'fetch',
            confidence: 100
          },
          suggestedPath: '/api/v2/users',
          confidence: 100,
          confidenceLevel: 'auto',
          reason: 'Explicit mapping',
          mappingRule: 'explicit',
          canAutoApply: true
        }
      ],
      suggestedUpdates: [
        {
          id: 'update-2',
          originalCall: {
            path: '/api/v1/posts',
            method: 'POST',
            file: '/project/src/api.ts',
            line: 20,
            callType: 'axios',
            confidence: 100
          },
          suggestedPath: '/api/v2/posts',
          confidence: 80,
          confidenceLevel: 'suggest',
          reason: 'Pattern match',
          mappingRule: 'pattern',
          canAutoApply: false
        }
      ],
      flaggedUpdates: [
        {
          id: 'update-3',
          originalCall: {
            path: '/api/unknown',
            method: 'GET',
            file: '/project/src/api.ts',
            line: 30,
            callType: 'fetch',
            confidence: 100
          },
          suggestedPath: '/api/unknown',
          confidence: 0,
          confidenceLevel: 'flag',
          reason: 'No mapping found',
          mappingRule: 'none',
          canAutoApply: false
        }
      ],
      unmappedCalls: [],
      stats: {
        auto: 1,
        suggest: 1,
        flag: 1,
        unmapped: 0
      }
    };

    it('should include summary section', () => {
      const report = generateUpdateReport(mockResult);

      expect(report).toContain('# Frontend Migration Update Report');
      expect(report).toContain('**Total Calls Processed:** 10');
    });

    it('should include confidence breakdown', () => {
      const report = generateUpdateReport(mockResult);

      expect(report).toContain('## Summary by Confidence Level');
      expect(report).toContain('**Auto-apply (95%+):** 1 calls');
      expect(report).toContain('**Suggest (70-94%):** 1 calls');
      expect(report).toContain('**Flag (<70%):** 1 calls');
    });

    it('should include auto-apply details', () => {
      const report = generateUpdateReport(mockResult);

      expect(report).toContain('## Auto-Apply Updates');
      expect(report).toContain('/api/v1/users → /api/v2/users');
    });

    it('should include suggested updates', () => {
      const report = generateUpdateReport(mockResult);

      expect(report).toContain('## Suggested Updates (Review Recommended)');
      expect(report).toContain('/api/v1/posts → /api/v2/posts (80%)');
    });
  });

  describe('exportBatchResults', () => {
    const mockResult: BatchUpdateResult = {
      totalCalls: 3,
      autoUpdates: [],
      suggestedUpdates: [],
      flaggedUpdates: [],
      unmappedCalls: [],
      stats: {
        auto: 0,
        suggest: 0,
        flag: 0,
        unmapped: 0
      }
    };

    it('should export valid JSON structure', () => {
      const exported = exportBatchResults(mockResult);

      expect(exported).toHaveProperty('version');
      expect(exported).toHaveProperty('generatedAt');
      expect(exported).toHaveProperty('summary');
      expect(exported).toHaveProperty('updates');
      expect(exported).toHaveProperty('unmapped');
    });

    it('should include version info', () => {
      const exported = exportBatchResults(mockResult);

      expect(exported.version).toContain('IMP-CORE-044');
    });

    it('should include timestamp', () => {
      const exported = exportBatchResults(mockResult);

      expect(exported.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('CONFIDENCE_THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(CONFIDENCE_THRESHOLDS.AUTO).toBe(95);
      expect(CONFIDENCE_THRESHOLDS.SUGGEST).toBe(70);
      expect(CONFIDENCE_THRESHOLDS.FLAG).toBe(0);
    });
  });
});
