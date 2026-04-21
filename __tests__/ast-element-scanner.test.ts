/**
 * AST Element Scanner Tests
 * WO-AST-ELEMENT-SCANNER-001
 *
 * Tests for the AST-based element scanner that solves
 * the 77% false positive rate in the regex scanner.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ASTElementScanner, scanFileWithAST, scanFilesWithAST } from '../src/analyzer/ast-element-scanner.js';

describe('ASTElementScanner', () => {
  let scanner: ASTElementScanner;

  beforeEach(() => {
    scanner = new ASTElementScanner();
  });

  describe('Function Detection', () => {
    it('should detect named function declarations', () => {
      const code = `
        function myFunction() {
          return 42;
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'myFunction',
      });
    });

    it('should detect async functions', () => {
      const code = `
        async function fetchData() {
          return await fetch('/api');
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'fetchData',
      });
    });

    it('should detect exported functions', () => {
      const code = `
        export function publicFunction() {
          return true;
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'publicFunction',
        exported: true,
      });
    });
  });

  describe('Arrow Function Detection', () => {
    it('should detect arrow functions assigned to const', () => {
      const code = `
        const arrowFn = () => {
          return 'hello';
        };
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'arrowFn',
      });
    });

    it('should detect async arrow functions', () => {
      const code = `
        const asyncArrow = async () => {
          return await Promise.resolve(1);
        };
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'asyncArrow',
      });
    });

    it('should detect exported arrow functions', () => {
      const code = `
        export const exportedArrow = () => 'exported';
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'exportedArrow',
        exported: true,
      });
    });
  });

  describe('Class Detection', () => {
    it('should detect class declarations', () => {
      const code = `
        class MyClass {
          constructor() {}
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const classElement = elements.find(e => e.type === 'class');
      expect(classElement).toBeDefined();
      expect(classElement?.name).toBe('MyClass');
    });

    it('should detect exported classes', () => {
      const code = `
        export class ExportedClass {
          getValue() { return 1; }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const classElement = elements.find(e => e.type === 'class');
      expect(classElement).toBeDefined();
      expect(classElement?.exported).toBe(true);
    });

    it('should detect class methods', () => {
      const code = `
        class MyClass {
          myMethod() {
            return 'method';
          }
          async asyncMethod() {
            return await Promise.resolve(1);
          }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const methods = elements.filter(e => e.type === 'method');
      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe('MyClass.myMethod');
      expect(methods[1].name).toBe('MyClass.asyncMethod');
    });

    it('should detect constructor', () => {
      const code = `
        class MyClass {
          constructor(value: number) {
            this.value = value;
          }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const constructor = elements.find(e => e.name === 'MyClass.constructor');
      expect(constructor).toBeDefined();
      expect(constructor?.type).toBe('method');
    });
  });

  describe('React Hook Detection', () => {
    it('should detect React hooks', () => {
      const code = `
        function useCustomHook() {
          const [state, setState] = useState(0);
          return state;
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'hook',
        name: 'useCustomHook',
      });
    });

    it('should detect arrow function hooks', () => {
      const code = `
        export const useArrowHook = () => {
          return useMemo(() => 'value', []);
        };
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'hook',
        name: 'useArrowHook',
        exported: true,
      });
    });
  });

  describe('Constant Detection', () => {
    it('should detect ALL_CAPS constants', () => {
      const code = `
        const MAX_VALUE = 100;
        const API_ENDPOINT = '/api';
        export const PUBLIC_KEY = 'abc123';
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(3);
      elements.forEach(e => expect(e.type).toBe('constant'));
    });
  });

  describe('Export Detection', () => {
    it('should detect named exports', () => {
      const code = `
        function internal() {}
        export function external() {}
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements[0].exported).toBeFalsy();
      expect(elements[1].exported).toBe(true);
    });

    it('should detect re-exports via export {}', () => {
      const code = `
        function myFunc() {}
        export { myFunc };
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0].exported).toBe(true);
    });

    it('should detect default exports', () => {
      const code = `
        function defaultFn() {}
        export default defaultFn;
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
      expect(elements[0].exported).toBe(true);
    });
  });

  describe('False Positive Prevention (Critical Tests)', () => {
    // These tests validate the core fix for the 77% false positive rate

    it('should NOT detect "if" as a method', () => {
      const code = `
        function process() {
          if (condition) {
            doSomething();
          }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const ifElement = elements.find(e => e.name === 'if' || e.name.endsWith('.if'));
      expect(ifElement).toBeUndefined();
    });

    it('should NOT detect "for" as a method', () => {
      const code = `
        function iterate() {
          for (let i = 0; i < 10; i++) {
            console.log(i);
          }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const forElement = elements.find(e => e.name === 'for' || e.name.endsWith('.for'));
      expect(forElement).toBeUndefined();
    });

    it('should NOT detect "while" as a method', () => {
      const code = `
        function loop() {
          while (running) {
            tick();
          }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const whileElement = elements.find(e => e.name === 'while' || e.name.endsWith('.while'));
      expect(whileElement).toBeUndefined();
    });

    it('should NOT detect "catch" as a method', () => {
      const code = `
        async function fetchData() {
          try {
            await api.call();
          } catch (error) {
            console.error(error);
          }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const catchElement = elements.find(e => e.name === 'catch' || e.name.endsWith('.catch'));
      expect(catchElement).toBeUndefined();
    });

    it('should NOT detect "switch" as a method', () => {
      const code = `
        function handleAction(action) {
          switch (action.type) {
            case 'ADD':
              return add();
            case 'REMOVE':
              return remove();
          }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const switchElement = elements.find(e => e.name === 'switch' || e.name.endsWith('.switch'));
      expect(switchElement).toBeUndefined();
    });

    it('should NOT detect "do" as a method', () => {
      const code = `
        function doWhileLoop() {
          do {
            process();
          } while (condition);
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');
      const doElement = elements.find(e => e.name === 'do' || e.name.endsWith('.do'));
      expect(doElement).toBeUndefined();
    });

    it('should correctly count elements without false positives', () => {
      const code = `
        // This code has multiple control flow keywords that should NOT be detected
        class DataProcessor {
          process(items: any[]) {
            for (let i = 0; i < items.length; i++) {
              if (items[i].valid) {
                try {
                  this.handle(items[i]);
                } catch (e) {
                  console.error(e);
                }
              }
            }
          }

          handle(item: any) {
            switch (item.type) {
              case 'A':
                while (item.data) {
                  item.data = item.data.next;
                }
                break;
            }
          }
        }
      `;
      const elements = scanner.parseElements(code, 'test.ts');

      // Should only find: class, process method, handle method
      expect(elements).toHaveLength(3);
      expect(elements.map(e => e.name).sort()).toEqual([
        'DataProcessor',
        'DataProcessor.handle',
        'DataProcessor.process',
      ]);
    });
  });

  describe('File Type Support', () => {
    it('should handle .ts files', () => {
      const code = `function test(): string { return 'ts'; }`;
      const elements = scanner.parseElements(code, 'test.ts');
      expect(elements).toHaveLength(1);
    });

    it('should handle .tsx files', () => {
      const code = `
        function Button({ label }: Props) {
          return <button>{label}</button>;
        }
      `;
      const elements = scanner.parseElements(code, 'test.tsx');
      expect(elements).toHaveLength(1);
    });

    it('should handle .js files', () => {
      const code = `function test() { return 'js'; }`;
      const elements = scanner.parseElements(code, 'test.js');
      expect(elements).toHaveLength(1);
    });

    it('should handle .jsx files', () => {
      const code = `
        function Card({ children }) {
          return <div className="card">{children}</div>;
        }
      `;
      const elements = scanner.parseElements(code, 'test.jsx');
      expect(elements).toHaveLength(1);
    });
  });

  describe('Caching', () => {
    it('should cache scan results', () => {
      // Note: This requires a real file to test properly
      // For now, test the cache API
      const scanner = new ASTElementScanner();
      const stats = scanner.getCacheStats();
      expect(stats.entries).toBe(0);
      expect(stats.files).toEqual([]);
    });

    it('should clear cache', () => {
      const scanner = new ASTElementScanner();
      scanner.clearCache();
      const stats = scanner.getCacheStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('Convenience Functions', () => {
    it('should provide scanFileWithAST function', () => {
      expect(typeof scanFileWithAST).toBe('function');
    });

    it('should provide scanFilesWithAST function', () => {
      expect(typeof scanFilesWithAST).toBe('function');
    });
  });
});
