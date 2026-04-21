/**
 * TreeSitterScanner Tests
 * WO-TREE-SITTER-SCANNER-001
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TreeSitterScanner, GrammarLoader } from '../src/scanner/tree-sitter-scanner.js';

describe('TreeSitterScanner', () => {
  let tempDir: string;
  let scanner: TreeSitterScanner;

  beforeAll(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-sitter-test-'));
    scanner = new TreeSitterScanner();
  });

  afterAll(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    GrammarLoader.clearCache();
  });

  describe('TypeScript/JavaScript Parser', () => {
    it('should extract function declarations', async () => {
      const testFile = path.join(tempDir, 'test-function.ts');
      fs.writeFileSync(testFile, `
export function calculateTotal(items: string[], tax: number): number {
  return items.length * tax;
}
      `.trim());

      const elements = await scanner.scanFile(testFile);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'calculateTotal',
        exported: true,
        parameters: [
          { name: 'items', type: 'string[]' },
          { name: 'tax', type: 'number' }
        ],
        returnType: 'number'
      });
    });

    it('should detect async functions', async () => {
      const testFile = path.join(tempDir, 'test-async.ts');
      fs.writeFileSync(testFile, `
export async function fetchData(): Promise<string> {
  return 'data';
}
      `.trim());

      const elements = await scanner.scanFile(testFile);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'fetchData',
        async: true,
        returnType: 'Promise<string>'
      });
    });

    it('should extract class declarations and methods', async () => {
      const testFile = path.join(tempDir, 'test-class.ts');
      fs.writeFileSync(testFile, `
export class UserService {
  async getUser(id: number): Promise<User> {
    return fetch(\`/api/users/\${id}\`);
  }
}
      `.trim());

      const elements = await scanner.scanFile(testFile);

      expect(elements.length).toBeGreaterThanOrEqual(1);

      // Find class
      const classElement = elements.find(e => e.type === 'class');
      expect(classElement).toBeDefined();
      expect(classElement?.name).toBe('UserService');
      expect(classElement?.exported).toBe(true);

      // Find method
      const methodElement = elements.find(e => e.type === 'method');
      expect(methodElement).toBeDefined();
      expect(methodElement?.name).toBe('getUser');
      expect(methodElement?.parentScope).toBe('UserService');
      expect(methodElement?.async).toBe(true);
    });

    it('should detect React components (PascalCase functions)', async () => {
      const testFile = path.join(tempDir, 'test-component.tsx');
      fs.writeFileSync(testFile, `
export function Button() {
  return <button>Click me</button>;
}
      `.trim());

      const elements = await scanner.scanFile(testFile);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'component',
        name: 'Button',
        exported: true
      });
    });

    it('should detect React hooks (use* functions)', async () => {
      const testFile = path.join(tempDir, 'test-hook.ts');
      fs.writeFileSync(testFile, `
export function useAuth(): AuthState {
  const [user, setUser] = useState(null);
  return { user, setUser };
}
      `.trim());

      const elements = await scanner.scanFile(testFile);

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'hook',
        name: 'useAuth',
        returnType: 'AuthState'
      });
    });

    it('should extract JSDoc comments', async () => {
      const testFile = path.join(tempDir, 'test-jsdoc.ts');
      fs.writeFileSync(testFile, `
/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 */
function add(a: number, b: number): number {
  return a + b;
}
      `.trim());

      const elements = await scanner.scanFile(testFile);

      expect(elements).toHaveLength(1);
      expect(elements[0].docstring).toContain('Calculates the sum of two numbers');
    });

    it('should estimate complexity', async () => {
      const testFile = path.join(tempDir, 'test-complexity.ts');
      fs.writeFileSync(testFile, `
function complexFunction(x: number): string {
  if (x > 10) {
    return 'high';
  } else if (x > 5) {
    return 'medium';
  } else {
    return 'low';
  }
}
      `.trim());

      const elements = await scanner.scanFile(testFile);

      expect(elements).toHaveLength(1);
      expect(elements[0].complexity).toBeDefined();
      expect(elements[0].complexity?.cyclomatic).toBeGreaterThan(1);
    });
  });

  describe('Grammar Loader', () => {
    it('should lazy-load TypeScript grammar', async () => {
      const grammar = await GrammarLoader.loadGrammar('ts');
      expect(grammar).toBeDefined();
    });

    it('should cache loaded grammars', async () => {
      const grammar1 = await GrammarLoader.loadGrammar('js');
      const grammar2 = await GrammarLoader.loadGrammar('js');
      expect(grammar1).toBe(grammar2); // Same reference = cached
    });

    it('should return null for unsupported languages', async () => {
      const grammar = await GrammarLoader.loadGrammar('unsupported');
      expect(grammar).toBeNull();
    });

    it('should check if language is supported', () => {
      expect(GrammarLoader.isSupported('ts')).toBe(true);
      expect(GrammarLoader.isSupported('py')).toBe(true);
      expect(GrammarLoader.isSupported('unsupported')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported language', async () => {
      const testFile = path.join(tempDir, 'test.unsupported');
      fs.writeFileSync(testFile, 'some content');

      await expect(scanner.scanFile(testFile)).rejects.toThrow('Unsupported language');
    });

    it('should throw error for non-existent file', async () => {
      const testFile = path.join(tempDir, 'nonexistent.ts');

      await expect(scanner.scanFile(testFile)).rejects.toThrow();
    });
  });
});
