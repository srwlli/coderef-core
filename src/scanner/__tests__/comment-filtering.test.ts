/**
 * P1.2: Context-aware comment filtering tests
 * Tests for improved isLineCommented() function
 */

import { describe, it, expect } from 'vitest';
import { isLineCommented } from '../scanner.js';

describe('Context-Aware Comment Filtering', () => {
  describe('Single-line comments', () => {
    it('should detect // comments', () => {
      expect(isLineCommented('// This is a comment')).toBe(true);
      expect(isLineCommented('  // Indented comment')).toBe(true);
    });

    it('should not treat URLs as comments', () => {
      const line = 'const url = "https://example.com";';
      expect(isLineCommented(line)).toBe(false);
    });
  });

  describe('Multi-line comments', () => {
    it('should detect /* */ block comments', () => {
      const lines = [
        'const a = 1;',
        '/* This is a',
        ' * multi-line comment',
        ' */',
        'const b = 2;'
      ];

      expect(isLineCommented(lines[0], 0, lines)).toBe(false); // Code line
      expect(isLineCommented(lines[1], 1, lines)).toBe(true);  // /*
      expect(isLineCommented(lines[2], 2, lines)).toBe(true);  // *
      expect(isLineCommented(lines[3], 3, lines)).toBe(true);  // */
      expect(isLineCommented(lines[4], 4, lines)).toBe(false); // Code after comment
    });

    it('should detect JSDoc comments', () => {
      const lines = [
        '/**',
        ' * JSDoc comment',
        ' * @param x - The parameter',
        ' */',
        'function foo(x) {}'
      ];

      expect(isLineCommented(lines[0], 0, lines)).toBe(true);  // /**
      expect(isLineCommented(lines[1], 1, lines)).toBe(true);  // *
      expect(isLineCommented(lines[2], 2, lines)).toBe(true);  // * @param
      expect(isLineCommented(lines[3], 3, lines)).toBe(true);  // */
      expect(isLineCommented(lines[4], 4, lines)).toBe(false); // function
    });

    it('should handle inline /* */ comments', () => {
      const line = 'const x = /* inline comment */ 42;';
      expect(isLineCommented(line)).toBe(false); // Has code, not entirely commented
    });
  });

  describe('Template strings', () => {
    it('should not filter template strings as comments', () => {
      expect(isLineCommented('const str = `Hello ${name}`;')).toBe(false);
      expect(isLineCommented('`// This is inside a template string`')).toBe(false);
      expect(isLineCommented('`/* Not a comment */`')).toBe(false);
    });

    it('should handle multi-line template strings', () => {
      const lines = [
        'const template = `',
        '  // This looks like a comment but is in template',
        '  ${value}',
        '`;'
      ];

      expect(isLineCommented(lines[0], 0, lines)).toBe(false);
      expect(isLineCommented(lines[1], 1, lines)).toBe(false); // Inside template
      expect(isLineCommented(lines[2], 2, lines)).toBe(false);
      expect(isLineCommented(lines[3], 3, lines)).toBe(false);
    });
  });

  describe('Regex literals', () => {
    it('should not filter regex literals as comments', () => {
      expect(isLineCommented('const pattern = /\\/\\*.*\\*\\//;')).toBe(false);
      expect(isLineCommented('const re = /test/g;')).toBe(false);
      expect(isLineCommented('return /\\/\\//.test(str);')).toBe(false);
    });

    it('should handle regex with comment-like content', () => {
      const lines = [
        'const commentRegex = /\\/\\/.*$/;',
        'const blockComment = /\\/\\*[\\s\\S]*?\\*\\//;'
      ];

      expect(isLineCommented(lines[0], 0, lines)).toBe(false);
      expect(isLineCommented(lines[1], 1, lines)).toBe(false);
    });

    it('should distinguish regex from division', () => {
      expect(isLineCommented('const result = a / b;')).toBe(false);
      expect(isLineCommented('x / y / z')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should treat empty lines as not comments', () => {
      expect(isLineCommented('')).toBe(false);
      expect(isLineCommented('   ')).toBe(false);
    });

    it('should handle mixed content correctly', () => {
      const lines = [
        'const url = "https://example.com"; // URL with comment',
        'const regex = /test/; // Regex with comment',
        'const template = `${x}`; // Template with comment'
      ];

      // These lines have actual code, so they should not be entirely filtered
      // But the // part would be filtered in actual line-by-line processing
      expect(isLineCommented(lines[0], 0, lines)).toBe(false);
      expect(isLineCommented(lines[1], 1, lines)).toBe(false);
      expect(isLineCommented(lines[2], 2, lines)).toBe(false);
    });
  });

  describe('Real-world code examples', () => {
    it('should correctly identify comments in typical TypeScript code', () => {
      const lines = [
        '// Module imports',
        'import { foo } from "./foo";',
        '',
        '/**',
        ' * Main function',
        ' * @returns void',
        ' */',
        'function main() {',
        '  const pattern = /\\/\\*.*\\*\\//; // Match comments',
        '  const msg = `Hello ${world}`; // Template string',
        '  // Process data',
        '  return process(pattern, msg);',
        '}'
      ];

      expect(isLineCommented(lines[0], 0, lines)).toBe(true);   // //
      expect(isLineCommented(lines[1], 1, lines)).toBe(false);  // import
      expect(isLineCommented(lines[2], 2, lines)).toBe(false);  // empty
      expect(isLineCommented(lines[3], 3, lines)).toBe(true);   // /**
      expect(isLineCommented(lines[4], 4, lines)).toBe(true);   // *
      expect(isLineCommented(lines[5], 5, lines)).toBe(true);   // * @returns
      expect(isLineCommented(lines[6], 6, lines)).toBe(true);   // */
      expect(isLineCommented(lines[7], 7, lines)).toBe(false);  // function
      expect(isLineCommented(lines[8], 8, lines)).toBe(false);  // regex + comment
      expect(isLineCommented(lines[9], 9, lines)).toBe(false);  // template + comment
      expect(isLineCommented(lines[10], 10, lines)).toBe(true); // // (standalone)
      expect(isLineCommented(lines[11], 11, lines)).toBe(false);// return
      expect(isLineCommented(lines[12], 12, lines)).toBe(false);// }
    });
  });
});
