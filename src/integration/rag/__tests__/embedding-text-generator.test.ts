/**
 * Unit tests for EmbeddingTextGenerator
 */

import { describe, it, expect } from 'vitest';
import { EmbeddingTextGenerator } from '../embedding-text-generator.js';
import type { CodeChunk } from '../code-chunk.js';

describe('EmbeddingTextGenerator', () => {
  let generator: EmbeddingTextGenerator;

  beforeEach(() => {
    generator = new EmbeddingTextGenerator();
  });

  describe('generate', () => {
    it('should generate embedding text with CodeRef tag', () => {
      const chunk: CodeChunk = {
        coderef: '@Fn/auth/login#authenticate:24',
        type: 'function',
        name: 'authenticate',
        file: '/test/auth/login.ts',
        line: 24,
        language: 'typescript',
        exported: true,
        dependencies: [],
        dependents: [],
        dependencyCount: 0,
        dependentCount: 0
      };

      const result = generator.generate(chunk);

      expect(result).toContain('CodeRef: @Fn/auth/login#authenticate:24');
      expect(result).toContain('function');
      expect(result).toContain('authenticate');
    });

    it('should include source code when provided', () => {
      const chunk: CodeChunk = {
        coderef: '@Fn/utils/format#formatDate:10',
        type: 'function',
        name: 'formatDate',
        file: '/test/utils/format.ts',
        line: 10,
        language: 'typescript',
        exported: true,
        sourceCode: 'function formatDate(date: Date): string {\n  return date.toISOString();\n}',
        dependencies: [],
        dependents: [],
        dependencyCount: 0,
        dependentCount: 0
      };

      const result = generator.generate(chunk, { includeSourceCode: true });

      expect(result).toContain('Implementation:');
      expect(result).toContain('function formatDate');
      expect(result).toContain('toISOString');
    });

    it('should include documentation when provided', () => {
      const chunk: CodeChunk = {
        coderef: '@Fn/api/users#getUser:15',
        type: 'function',
        name: 'getUser',
        file: '/test/api/users.ts',
        line: 15,
        language: 'typescript',
        exported: true,
        documentation: 'Fetches a user by ID from the database',
        dependencies: [],
        dependents: [],
        dependencyCount: 0,
        dependentCount: 0
      };

      const result = generator.generate(chunk, { includeDocumentation: true });

      expect(result).toContain('Documentation:');
      expect(result).toContain('Fetches a user by ID');
    });

    it('should include dependencies when present', () => {
      const chunk: CodeChunk = {
        coderef: '@Fn/services/auth#login:20',
        type: 'function',
        name: 'login',
        file: '/test/services/auth.ts',
        line: 20,
        language: 'typescript',
        exported: true,
        dependencies: [
          '@Fn/utils/hash#hashPassword:10',
          '@Fn/db/users#findUser:5',
          '@Fn/services/token#generateToken:15'
        ],
        dependents: [],
        dependencyCount: 3,
        dependentCount: 0
      };

      const result = generator.generate(chunk, { includeDependencies: true });

      expect(result).toContain('Dependencies (3):');
      expect(result).toContain('@Fn/utils/hash#hashPassword:10');
      expect(result).toContain('@Fn/db/users#findUser:5');
      expect(result).toContain('@Fn/services/token#generateToken:15');
    });

    it('should include dependents when present', () => {
      const chunk: CodeChunk = {
        coderef: '@Fn/utils/validate#validateEmail:8',
        type: 'function',
        name: 'validateEmail',
        file: '/test/utils/validate.ts',
        line: 8,
        language: 'typescript',
        exported: true,
        dependencies: [],
        dependents: [
          '@Fn/api/users#createUser:20',
          '@Fn/api/users#updateUser:35'
        ],
        dependencyCount: 0,
        dependentCount: 2
      };

      const result = generator.generate(chunk, { includeDependents: true });

      expect(result).toContain('Used by (2):');
      expect(result).toContain('@Fn/api/users#createUser:20');
      expect(result).toContain('@Fn/api/users#updateUser:35');
    });

    it('should limit dependencies to maxDependencies option', () => {
      const dependencies = Array.from({ length: 20 }, (_, i) => `@Fn/test#func${i}:${i}`);

      const chunk: CodeChunk = {
        coderef: '@Fn/test#main:1',
        type: 'function',
        name: 'main',
        file: '/test/main.ts',
        line: 1,
        language: 'typescript',
        exported: true,
        dependencies,
        dependents: [],
        dependencyCount: 20,
        dependentCount: 0
      };

      const result = generator.generate(chunk, {
        includeDependencies: true
      });

      // Implementation shows up to 10 dependencies
      expect(result).toContain('Dependencies (20):');
      expect(result).toContain('func0');
      expect(result).toContain('func9'); // Shows up to 10
      expect(result).not.toContain('func10'); // Beyond the 10 limit
    });

    it('should include quality metrics when provided', () => {
      const chunk: CodeChunk = {
        coderef: '@Fn/services/payment#processPayment:42',
        type: 'function',
        name: 'processPayment',
        file: '/test/services/payment.ts',
        line: 42,
        language: 'typescript',
        exported: true,
        complexity: 15,
        coverage: 85,
        dependencies: [],
        dependents: [],
        dependencyCount: 0,
        dependentCount: 0
      };

      const result = generator.generate(chunk);

      // Implementation uses "Metadata:" section with lowercase keys
      expect(result).toContain('Metadata:');
      expect(result).toContain('complexity: 15');
      expect(result).toContain('coverage: 85%');
    });

    it('should exclude source code when option is false', () => {
      const chunk: CodeChunk = {
        coderef: '@Fn/test#func:1',
        type: 'function',
        name: 'func',
        file: '/test.ts',
        line: 1,
        language: 'typescript',
        exported: false,
        sourceCode: 'function func() { return "test"; }',
        dependencies: [],
        dependents: [],
        dependencyCount: 0,
        dependentCount: 0
      };

      const result = generator.generate(chunk, { includeSourceCode: false });

      expect(result).not.toContain('Implementation:');
      expect(result).not.toContain('function func()');
    });

    it('should handle chunks with no optional fields', () => {
      const chunk: CodeChunk = {
        coderef: '@Fn/test#minimal:1',
        type: 'function',
        name: 'minimal',
        file: '/test.ts',
        line: 1,
        language: 'typescript',
        exported: false,
        dependencies: [],
        dependents: [],
        dependencyCount: 0,
        dependentCount: 0
      };

      const result = generator.generate(chunk);

      expect(result).toContain('CodeRef: @Fn/test#minimal:1');
      expect(result).toContain('function');
      expect(result).toContain('minimal');
      expect(result).not.toContain('Documentation:');
      expect(result).not.toContain('Implementation:');
      expect(result).not.toContain('Dependencies');
    });

    it('should use different type descriptions', () => {
      const types = [
        { type: 'function', expected: 'function' },
        { type: 'class', expected: 'class' },
        { type: 'method', expected: 'method' },
        { type: 'interface', expected: 'interface' },
        { type: 'type', expected: 'type' }
      ];

      for (const testCase of types) {
        const chunk: CodeChunk = {
          coderef: `@${testCase.type[0].toUpperCase()}/test#element:1`,
          type: testCase.type,
          name: 'element',
          file: '/test.ts',
          line: 1,
          language: 'typescript',
          exported: false,
          dependencies: [],
          dependents: [],
          dependencyCount: 0,
          dependentCount: 0
        };

        const result = generator.generate(chunk);
        expect(result.toLowerCase()).toContain(testCase.expected);
      }
    });
  });

  describe('generateQueryText', () => {
    it('should generate query text from question', () => {
      const result = generator.generateQueryText(
        'How do I authenticate a user?',
        {}
      );

      expect(result).toContain('How do I authenticate a user?');
    });

    it('should enhance query with context', () => {
      const result = generator.generateQueryText(
        'How does login work?',
        { language: 'typescript', type: 'function' }
      );

      // Implementation uses natural language: "looking for {type} in {language}"
      expect(result).toContain('How does login work?');
      expect(result).toContain('looking for function');
      expect(result).toContain('in typescript');
    });

    it('should handle query without context', () => {
      const result = generator.generateQueryText('test query', {});

      expect(result).toBe('test query');
    });

    it('should include multiple context fields', () => {
      const result = generator.generateQueryText(
        'test query',
        {
          language: 'python',
          type: 'class',
          file: 'models.py'
        }
      );

      // Implementation uses natural language style
      expect(result).toContain('test query');
      expect(result).toContain('looking for class');
      expect(result).toContain('in python');
      expect(result).toContain('from models.py');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const longText = 'x'.repeat(5000);
      const chunk: CodeChunk = {
        coderef: '@Fn/test#func:1',
        type: 'function',
        name: 'func',
        file: '/test.ts',
        line: 1,
        language: 'typescript',
        exported: false,
        sourceCode: longText,
        dependencies: [],
        dependents: [],
        dependencyCount: 0,
        dependentCount: 0
      };

      const result = generator.generate(chunk, {
        includeSourceCode: true,
        maxLength: 1000
      });

      // Implementation adds "\n... (truncated)" which is 16 chars
      expect(result.length).toBeLessThanOrEqual(1020);
    });

    it('should not truncate short text', () => {
      const shortText = 'function test() { return 42; }';
      const chunk: CodeChunk = {
        coderef: '@Fn/test#func:1',
        type: 'function',
        name: 'func',
        file: '/test.ts',
        line: 1,
        language: 'typescript',
        exported: false,
        sourceCode: shortText,
        dependencies: [],
        dependents: [],
        dependencyCount: 0,
        dependentCount: 0
      };

      const result = generator.generate(chunk, {
        includeSourceCode: true,
        maxLength: 5000
      });

      expect(result).toContain(shortText);
      expect(result).not.toContain('...');
    });
  });
});
