/**
 * DISPATCH-2026-04-29-006: Schema Alignment Tests
 *
 * Validates:
 * (1) related[] field transform: file → path, confidence → confidence_score
 * (2) rules[] field normalization: string + structured object formats
 * (3) Backward compatibility: both old and new formats accepted
 */

import { describe, it, expect } from 'vitest';
import { IndexGenerator } from '../index-generator.js';

describe('IndexGenerator - Schema Alignment (DISPATCH-2026-04-29-006)', () => {
  const generator = new IndexGenerator();

  describe('normalizeRelatedField', () => {
    it('should transform file → path and confidence → confidence_score', () => {
      const input = [
        { file: 'src/utils.ts', confidence: 0.95, reason: 'same module' }
      ];

      const normalized = (generator as any).normalizeRelatedField(input);

      expect(normalized).toHaveLength(1);
      expect(normalized[0]).toEqual({
        path: 'src/utils.ts',
        confidence_score: 0.95,
        reason: 'same module'
      });
      expect(normalized[0].file).toBeUndefined();
      expect(normalized[0].confidence).toBeUndefined();
    });

    it('should handle path field (new format) without transformation', () => {
      const input = [
        { path: 'src/services/auth.ts', confidence_score: 0.92 }
      ];

      const normalized = (generator as any).normalizeRelatedField(input);

      expect(normalized[0]).toEqual({
        path: 'src/services/auth.ts',
        confidence_score: 0.92
      });
    });

    it('should convert legacy string format to object with path', () => {
      const input = ['src/models/user.ts'];

      const normalized = (generator as any).normalizeRelatedField(input);

      expect(normalized[0]).toEqual({
        path: 'src/models/user.ts',
        confidence_score: 1.0
      });
    });

    it('should default missing confidence_score to 1.0', () => {
      const input = [
        { file: 'src/utils.ts' }
      ];

      const normalized = (generator as any).normalizeRelatedField(input);

      expect(normalized[0].confidence_score).toBe(1.0);
    });

    it('should handle empty related array', () => {
      const normalized = (generator as any).normalizeRelatedField([]);
      expect(normalized).toEqual([]);
    });

    it('should handle null/undefined related field', () => {
      expect((generator as any).normalizeRelatedField(null)).toEqual([]);
      expect((generator as any).normalizeRelatedField(undefined)).toEqual([]);
    });
  });

  describe('normalizeRulesField', () => {
    it('should preserve structured rule objects', () => {
      const input = [
        { rule: 'pure-function', description: 'no side effects', severity: 'error' }
      ];

      const normalized = (generator as any).normalizeRulesField(input);

      expect(normalized[0]).toEqual({
        rule: 'pure-function',
        description: 'no side effects',
        severity: 'error'
      });
    });

    it('should parse string format "rule: description"', () => {
      const input = [
        'pure-function: no side effects',
        'timezone-aware: all operations use UTC internally'
      ];

      const normalized = (generator as any).normalizeRulesField(input);

      expect(normalized).toHaveLength(2);
      expect(normalized[0]).toEqual({
        rule: 'pure-function',
        description: 'no side effects',
        severity: 'error'
      });
      expect(normalized[1]).toEqual({
        rule: 'timezone-aware',
        description: 'all operations use UTC internally',
        severity: 'error'
      });
    });

    it('should handle rule string without description (no colon)', () => {
      const input = ['immutable'];

      const normalized = (generator as any).normalizeRulesField(input);

      expect(normalized[0]).toEqual({
        rule: 'immutable',
        severity: 'error'
      });
    });

    it('should default missing severity to "error"', () => {
      const input = [
        { rule: 'no-circular-deps' }
      ];

      const normalized = (generator as any).normalizeRulesField(input);

      expect(normalized[0].severity).toBe('error');
    });

    it('should handle mixed string and object formats', () => {
      const input = [
        'auth-required: must authenticate before execution',
        { rule: 'validation', description: 'all inputs must be validated', severity: 'warning' }
      ];

      const normalized = (generator as any).normalizeRulesField(input);

      expect(normalized).toHaveLength(2);
      expect(normalized[0]).toEqual({
        rule: 'auth-required',
        description: 'must authenticate before execution',
        severity: 'error'
      });
      expect(normalized[1]).toEqual({
        rule: 'validation',
        description: 'all inputs must be validated',
        severity: 'warning'
      });
    });

    it('should handle empty rules array', () => {
      const normalized = (generator as any).normalizeRulesField([]);
      expect(normalized).toEqual([]);
    });

    it('should handle null/undefined rules field', () => {
      expect((generator as any).normalizeRulesField(null)).toEqual([]);
      expect((generator as any).normalizeRulesField(undefined)).toEqual([]);
    });
  });
});
