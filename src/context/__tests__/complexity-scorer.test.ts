/**
 * Tests for ComplexityScorer
 *
 * WO-EXTEND-THE-CLONE-SURFACE-P10 P2 contract:
 * - REAL inputs when persisted: LOC from endLine span, parameterCount from
 *   element.parameters, cyclomatic/cognitive/nesting from the extract-time
 *   AST metrics (ElementData.complexity), metric_source 'ast'.
 * - Disclosed fallbacks when absent: type-keyed LOC estimate (8 method /
 *   6 function), type-keyed param estimate (2/1), cyclomatic 1,
 *   metric_source 'estimated'. The former fabrications (LOC from call count,
 *   file-wide regex CC) are RETIRED — registered sources change nothing.
 * - Envelope back-compat: name/type/file/line/metrics/riskLevel unchanged.
 *
 * Originally part of WO-FILE-IMPACT-SCANNER-001 (coverage suite).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComplexityScorer } from '../complexity-scorer.js';
import type { ElementData } from '../types.js';

describe('ComplexityScorer', () => {
  let scorer: ComplexityScorer;

  beforeEach(() => {
    scorer = new ComplexityScorer();
  });

  const astElement = (overrides: Partial<ElementData> = {}): ElementData => ({
    name: 'realFunc',
    type: 'function',
    file: 'test.ts',
    line: 10,
    endLine: 29,
    exported: true,
    parameters: ['a', 'b', 'c'] as any,
    complexity: { cyclomatic: 7, nestingDepth: 2, cognitive: 9 },
    ...overrides,
  });

  describe('Constructor', () => {
    it('should initialize without errors', () => {
      expect(scorer).toBeDefined();
      expect(scorer).toBeInstanceOf(ComplexityScorer);
    });
  });

  describe('scoreElement() — persisted AST inputs', () => {
    it('uses the real endLine span for LOC', () => {
      const result = scorer.scoreElement(astElement());
      expect(result.metrics.loc).toBe(20); // 29 - 10 + 1
    });

    it('uses the real parameter list for parameterCount', () => {
      const result = scorer.scoreElement(astElement());
      expect(result.metrics.parameterCount).toBe(3);

      const empty = scorer.scoreElement(astElement({ parameters: [] as any }));
      expect(empty.metrics.parameterCount).toBe(0);
    });

    it('uses the persisted cyclomatic and passes cognitive/nesting through', () => {
      const result = scorer.scoreElement(astElement());
      expect(result.metrics.cyclomaticComplexity).toBe(7);
      expect(result.metrics.cognitiveComplexity).toBe(9);
      expect(result.metrics.nestingDepth).toBe(2);
    });

    it('stamps metric_source ast', () => {
      const result = scorer.scoreElement(astElement());
      expect(result.metrics.metric_source).toBe('ast');
    });

    it('keeps the back-compat envelope shape', () => {
      const result = scorer.scoreElement(astElement());
      expect(result).toMatchObject({
        name: 'realFunc',
        type: 'function',
        file: 'test.ts',
        line: 10,
      });
      expect(result.metrics.complexityScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.complexityScore).toBeLessThanOrEqual(10);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    it('classifies a maxed-out element as critical', () => {
      const heavy = astElement({
        line: 1,
        endLine: 200, // loc 200 -> locScore 1
        parameters: Array.from({ length: 10 }, (_, i) => `p${i}`) as any,
        complexity: { cyclomatic: 15, nestingDepth: 6, cognitive: 30 },
      });
      const result = scorer.scoreElement(heavy);
      expect(result.metrics.complexityScore).toBe(9); // 0.3 + 0.4 + 0.2 -> 9
      expect(result.riskLevel).toBe('critical');
    });
  });

  describe('scoreElement() — disclosed fallbacks (no persisted data)', () => {
    const bare = (type: ElementData['type']): ElementData => ({
      name: 'bare',
      type,
      file: 'test.ts',
      line: 1,
      exported: false,
    });

    it('falls back to type-keyed LOC estimates', () => {
      expect(scorer.scoreElement(bare('function')).metrics.loc).toBe(6);
      expect(scorer.scoreElement(bare('method')).metrics.loc).toBe(8);
    });

    it('falls back to type-keyed parameter estimates', () => {
      expect(scorer.scoreElement(bare('function')).metrics.parameterCount).toBe(1);
      expect(scorer.scoreElement(bare('method')).metrics.parameterCount).toBe(2);
    });

    it('falls back to cyclomatic 1 and stamps metric_source estimated', () => {
      const result = scorer.scoreElement(bare('function'));
      expect(result.metrics.cyclomaticComplexity).toBe(1);
      expect(result.metrics.metric_source).toBe('estimated');
      expect(result.metrics.cognitiveComplexity).toBeUndefined();
      expect(result.metrics.nestingDepth).toBeUndefined();
    });

    it('LOC estimate ignores fabricated call-count inflation (retired heuristic)', () => {
      const withCalls: ElementData = {
        ...bare('function'),
        calls: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      };
      // Former behavior: max(2, 8) * 2 = 16. Now: honest type-keyed estimate.
      expect(scorer.scoreElement(withCalls).metrics.loc).toBe(6);
    });
  });

  describe('addSource() — retained API, no longer feeds scoring', () => {
    it('accepts sources without throwing', () => {
      expect(() => {
        scorer.addSource('file1.ts', 'const a = 1;');
        scorer.addSource('file1.ts', 'const b = 2;'); // overwrite
      }).not.toThrow();
    });

    it('registered source does NOT change cyclomatic (file-wide regex retired)', () => {
      scorer.addSource('test.ts', [
        'function noise() {',
        '  if (a) { } if (b) { } if (c) { }',
        '  for (;;) { } while (x) { }',
        '}',
      ].join('\n'));

      const bare: ElementData = { name: 'bare', type: 'function', file: 'test.ts', line: 1, exported: false };
      // Former behavior: file-wide regex -> CC 6+ for EVERY element in the file.
      expect(scorer.scoreElement(bare).metrics.cyclomaticComplexity).toBe(1);
      expect(scorer.scoreElement(bare).metrics.metric_source).toBe('estimated');
    });
  });

  describe('scoreElements()', () => {
    it('should score multiple elements preserving order', () => {
      const elements: ElementData[] = [
        astElement({ name: 'func1' }),
        { name: 'func2', type: 'function', file: 'test.ts', line: 10, exported: false },
        { name: 'func3', type: 'method', file: 'test.ts', line: 20, exported: false },
      ];

      const results = scorer.scoreElements(elements);
      expect(results).toHaveLength(3);
      expect(results.map(r => r.name)).toEqual(['func1', 'func2', 'func3']);
      expect(results[0].metrics.metric_source).toBe('ast');
      expect(results[1].metrics.metric_source).toBe('estimated');
    });

    it('should return empty array for empty input', () => {
      expect(scorer.scoreElements([])).toEqual([]);
    });

    it('should handle mixed element types', () => {
      const elements: ElementData[] = [
        { name: 'func', type: 'function', file: 'test.ts', line: 1, exported: false },
        { name: 'method', type: 'method', file: 'test.ts', line: 5, exported: false },
        { name: 'class', type: 'class', file: 'test.ts', line: 10, exported: true },
      ];

      const results = scorer.scoreElements(elements);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.metrics).toBeDefined();
        expect(result.riskLevel).toBeDefined();
      });
    });
  });

  describe('getStatistics()', () => {
    it('should return zero stats for empty array', () => {
      expect(scorer.getStatistics([])).toEqual({
        minComplexity: 0,
        maxComplexity: 0,
        avgComplexity: 0,
        medianComplexity: 0,
        highRiskCount: 0,
        criticalRiskCount: 0,
      });
    });

    it('should calculate statistics over persisted metrics', () => {
      const elements: ElementData[] = [
        astElement({ name: 'light', complexity: { cyclomatic: 1, nestingDepth: 0, cognitive: 0 }, line: 1, endLine: 3 }),
        astElement({ name: 'heavy', line: 1, endLine: 200, parameters: Array.from({ length: 10 }, (_, i) => `p${i}`) as any, complexity: { cyclomatic: 15, nestingDepth: 6, cognitive: 30 } }),
      ];

      const stats = scorer.getStatistics(elements);
      expect(stats.minComplexity).toBeLessThanOrEqual(stats.maxComplexity);
      expect(stats.maxComplexity).toBe(9);
      expect(stats.criticalRiskCount).toBe(1);
    });

    it('should calculate median for odd and even counts', () => {
      const mk = (n: string): ElementData => ({ name: n, type: 'function', file: 'test.ts', line: 1, exported: false });
      expect(scorer.getStatistics([mk('a'), mk('b'), mk('c')]).medianComplexity).toBeGreaterThanOrEqual(0);
      expect(scorer.getStatistics([mk('a'), mk('b'), mk('c'), mk('d')]).medianComplexity).toBeGreaterThanOrEqual(0);
    });
  });
});
