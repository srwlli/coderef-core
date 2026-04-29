/**
 * Unit tests for LLM enricher
 * Tests fallback behavior when API unavailable
 */

import { LLMEnricher, enrichMetadata } from './llm-enricher';
import type { EnrichmentRequest } from './llm-enricher';

describe('LLMEnricher', () => {
  const mockRequest: EnrichmentRequest = {
    file: 'src/utils.ts',
    exports: ['formatDate', 'parseDate'],
    imports: ['moment', 'timezone'],
    internalDeps: ['./validators'],
    externalDeps: ['moment', 'timezone'],
  };

  describe('Offline Fallback', () => {
    test('should use offline enrichment when LLM unavailable', async () => {
      // Create enricher without API key (forces fallback)
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich(mockRequest);

      expect(result).toHaveProperty('rules');
      expect(result).toHaveProperty('related');
      expect(result).toHaveProperty('constraints');
      expect(result.confidence).toBeLessThan(1);
    });

    test('should derive rules from exports pattern', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich(mockRequest);

      expect(result.rules).toContain('exports_public_api');
    });

    test('should detect framework integration', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich({
        ...mockRequest,
        externalDeps: [...mockRequest.externalDeps, 'react'],
      });

      expect(result.rules).toContain('framework_integrated');
    });

    test('should flag high external dependency count', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich({
        ...mockRequest,
        externalDeps: [
          'lodash',
          'moment',
          'axios',
          'react',
          'redux',
          'webpack',
        ],
      });

      expect(result.rules).toContain('high_external_deps');
    });

    test('should flag large API surface', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich({
        ...mockRequest,
        exports: Array.from({ length: 15 }, (_, i) => `func${i}`),
      });

      expect(result.constraints).toContain('large_api_surface');
    });

    test('should flag high coupling', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich({
        ...mockRequest,
        imports: Array.from({ length: 20 }, (_, i) => `dep${i}`),
      });

      expect(result.constraints).toContain('high_coupling');
    });
  });

  describe('Availability', () => {
    test('should report offline mode correctly', () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      expect(enricher.isAvailable()).toBe(false);
    });

    test('should report availability based on config', () => {
      // When disabled explicitly
      const enricher = new LLMEnricher({ enabled: false });
      expect(enricher.isAvailable()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty exports and imports', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich({
        file: 'test.ts',
        exports: [],
        imports: [],
        internalDeps: [],
        externalDeps: [],
      });

      expect(result.rules).toBeDefined();
      expect(Array.isArray(result.rules)).toBe(true);
    });

    test('should return valid confidence scores', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich(mockRequest);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Convenience API', () => {
    test('should work with enrichMetadata function', async () => {
      const result = await enrichMetadata(mockRequest, { apiKey: '' });

      expect(result.rules).toBeDefined();
      expect(result.related).toBeDefined();
      expect(result.constraints).toBeDefined();
    });
  });

  describe('Fallback Response Quality', () => {
    test('should include external dependencies in related', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich(mockRequest);

      // Should include some external deps in related
      expect(result.related.length).toBeGreaterThan(0);
    });

    test('should maintain consistent structure', async () => {
      const enricher = new LLMEnricher({ apiKey: '' });
      const result = await enricher.enrich(mockRequest);

      expect(Array.isArray(result.rules)).toBe(true);
      expect(Array.isArray(result.related)).toBe(true);
      expect(Array.isArray(result.constraints)).toBe(true);
      expect(typeof result.confidence).toBe('number');
    });
  });
});
