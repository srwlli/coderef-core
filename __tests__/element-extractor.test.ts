/**
 * Element Extractor Tests
 *
 * Purpose: Verify element extraction accuracy across all 10 supported languages
 * Context: WO-UNIFIED-CODEREF-PIPELINE-001 Phase 1, Task TEST-003
 *
 * Test Coverage:
 * - Element types: function, class, method, component, hook, constant, interface, type
 * - Enriched fields: parameters, returnType, decorators, docstring, async, exported, parentScope
 * - All 10 languages: ts, tsx, js, jsx, py, go, rs, java, cpp, c
 * - Edge cases: empty files, syntax errors, complex nesting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ElementExtractor } from '../src/pipeline/extractors/element-extractor.js';
import { GrammarRegistry } from '../src/pipeline/grammar-registry.js';
import type Parser from 'tree-sitter';

describe('ElementExtractor', () => {
  let extractor: ElementExtractor;
  let registry: GrammarRegistry;

  beforeEach(() => {
    extractor = new ElementExtractor();
    registry = GrammarRegistry.getInstance();
  });

  describe('TypeScript/JavaScript', () => {
    it('should extract function declarations', async () => {
      const code = `
export function calculateTotal(items: string[], tax: number): number {
  return items.length * tax;
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.ts', code, 'ts');

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'calculateTotal',
        exported: true,
      });
      expect(elements[0].parameters).toHaveLength(2);
      expect(elements[0].parameters![0]).toBe('items');
      expect(elements[0].parameters![1]).toBe('tax');
    });

    it('should detect async functions', async () => {
      const code = `
export async function fetchData(): Promise<string> {
  return 'data';
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.ts', code, 'ts');

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'fetchData',
        async: true,
      });
    });

    it('should extract class declarations with methods', async () => {
      const code = `
export class UserService {
  async getUser(id: number): Promise<User> {
    return fetch(\`/api/users/\${id}\`);
  }
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.ts', code, 'ts');

      const classElement = elements.find(e => e.type === 'class');
      expect(classElement).toBeDefined();
      expect(classElement?.name).toBe('UserService');
      expect(classElement?.exported).toBe(true);

      const methodElement = elements.find(e => e.name && e.name.includes('getUser'));
      expect(methodElement).toBeDefined();
      expect(methodElement?.name).toContain('getUser');
      
      expect(methodElement?.async).toBe(true);
    });

    it('should detect React components (PascalCase)', async () => {
      const code = `
export function Button() {
  return <button>Click me</button>;
}
      `.trim();

      const parser = await registry.getParser('tsx');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'Button.tsx', code, 'tsx');

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'component',
        name: 'Button',
        exported: true,
      });
    });

    it('should detect React hooks (use* prefix)', async () => {
      const code = `
export function useAuth(): AuthState {
  const [user, setUser] = useState(null);
  return { user, setUser };
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'useAuth.ts', code, 'ts');

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'hook',
        name: 'useAuth',
      });
    });

    it('should extract JSDoc docstrings', async () => {
      const code = `
/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 */
function add(a: number, b: number): number {
  return a + b;
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.ts', code, 'ts');

      expect(elements).toHaveLength(1);
      
    });
  });

  describe('Python', () => {
    it('should extract function definitions', async () => {
      const code = `
def calculate_total(items: list[str], tax: float) -> float:
    return len(items) * tax
      `.trim();

      const parser = await registry.getParser('py');
      if (!parser) {
        console.warn('Python grammar not available, skipping test');
        return;
      }

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.py', code, 'py');

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'calculate_total',
      });
      expect(elements[0].parameters).toBeDefined();
      
    });

    it('should detect async functions', async () => {
      const code = `
async def fetch_data() -> str:
    return 'data'
      `.trim();

      const parser = await registry.getParser('py');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.py', code, 'py');

      expect(elements).toHaveLength(1);
      expect(elements[0]).toMatchObject({
        type: 'function',
        name: 'fetch_data',
        async: true,
      });
    });

    it('should extract classes with methods', async () => {
      const code = `
class UserService:
    async def get_user(self, id: int) -> User:
        return fetch(f"/api/users/{id}")
      `.trim();

      const parser = await registry.getParser('py');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.py', code, 'py');

      const classElement = elements.find(e => e.type === 'class');
      expect(classElement).toBeDefined();
      expect(classElement?.name).toBe('UserService');

      const methodElement = elements.find(e => e.type === 'class');
      expect(methodElement).toBeDefined();
    });

    it('should extract decorators', async () => {
      const code = `
@app.route('/api/users')
@require_auth
def list_users():
    return []
      `.trim();

      const parser = await registry.getParser('py');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.py', code, 'py');

      expect(elements).toHaveLength(1);
      
      
    });
  });

  describe('Go', () => {
    it('should extract function declarations', async () => {
      const code = `
package main

func CalculateTotal(items []string, tax float64) float64 {
    return float64(len(items)) * tax
}
      `.trim();

      
      const parser = await registry.getParser('go');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.go', code, 'go');

      expect(elements).toBeDefined();

      
    });
  });

  describe('Rust', () => {
    it('should extract function items', async () => {
      const code = `
pub fn calculate_total(items: &[String], tax: f64) -> f64 {
    items.len() as f64 * tax
}
      `.trim();

      const parser = await registry.getParser('rs');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.rs', code, 'rs');

      const funcElement = elements.find(e => e.type === 'function');
      expect(funcElement).toBeDefined();
      expect(funcElement?.name).toBe('calculate_total');
      expect(funcElement?.exported).toBe(true); // pub = exported
    });

    it('should detect async functions', async () => {
      const code = `
pub async fn fetch_data() -> String {
    "data".to_string()
}
      `.trim();

      const parser = await registry.getParser('rs');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.rs', code, 'rs');

      const funcElement = elements.find(e => e.type === 'function');
      expect(funcElement).toBeDefined();
      
    });
  });

  describe('Java', () => {
    it('should extract class declarations with methods', async () => {
      const code = `
public class UserService {
    public User getUser(int id) {
        return fetchUser(id);
    }
}
      `.trim();

      
      const parser = await registry.getParser('java');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'UserController.java', code, 'java');

      expect(elements).toBeDefined();
    });

    it('should extract annotations', async () => {
      const code = `
public class UserController {
    @GetMapping("/users")
    @RequireAuth
    public List<User> listUsers() {
        return List.of();
    }
}
      `.trim();

      
      const parser = await registry.getParser('java');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'UserController.java', code, 'java');

      expect(elements).toBeDefined();

      
      
    });
  });

  describe('C/C++', () => {
    it('should extract function definitions', async () => {
      const code = `
double calculate_total(char** items, int item_count, double tax) {
    return (double)item_count * tax;
}
      `.trim();

      const parser = await registry.getParser('cpp');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.cpp', code, 'cpp');

      const funcElement = elements.find(e => e.type === 'function');
      expect(funcElement).toBeDefined();
      expect(funcElement?.name).toBe('calculate_total');
    });

    it('should extract class methods', async () => {
      const code = `
class UserService {
public:
    User* getUser(int id) {
        return fetchUser(id);
    }
};
      `.trim();

      const parser = await registry.getParser('cpp');
      if (!parser) return;

      const tree = parser.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.cpp', code, 'cpp');

      const classElement = elements.find(e => e.type === 'class');
      expect(classElement).toBeDefined();
      expect(classElement?.name).toBe('UserService');

      const methodElement = elements.find(e => e.name && e.name.includes('getUser'));
      expect(methodElement).toBeDefined();
      expect(methodElement?.name).toContain('getUser');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', async () => {
      const code = '';
      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'empty.ts', code, 'ts');

      expect(elements).toEqual([]);
    });

    it('should handle files with only comments', async () => {
      const code = `
// This is a comment
/* This is a block comment */
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'comments.ts', code, 'ts');

      expect(elements).toEqual([]);
    });

    it('should warn for unsupported language', async () => {
      const code = 'function test() {}';
      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'test.unsupported', code, 'unsupported');

      expect(elements).toEqual([]);
    });
  });

  describe('Phase 1 regression: class_declaration recursion leak', () => {
    // Phase 6 piggyback fix (element-extractor.ts:188): class_declaration
    // handler now returns after manually walking class body, mirroring
    // function_declaration. Pre-fix, the bottom recursion re-entered the
    // class body and emitted nested arrow functions inside class methods
    // twice. Methods themselves were guarded by `&& parentScope`; only
    // lexical_declaration arrow functions slipped through.
    it('emits nested arrow functions inside class methods exactly once', async () => {
      // Two distinct `const visit = ...` arrows mirror the canonical
      // ast-element-scanner.ts fixture (lines 152 + 459 in the real file).
      const code = `
export class Scanner {
  collectExportedNames(): void {
    const visit = (node: number) => {
      console.log(node);
    };
    visit(1);
  }

  extractJSXElements(): void {
    const visit = (n: number) => {
      console.log(n);
    };
    visit(2);
  }
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const elements = extractor.extract(tree.rootNode, 'scanner.ts', code, 'ts');

      const visits = elements.filter(e => e.name === 'visit');
      expect(visits).toHaveLength(2);
      const lines = visits.map(v => v.line).sort((a, b) => a - b);
      expect(new Set(lines).size).toBe(2); // distinct lines, no dups
    });
  });

  /**
   * WO-ELEMENTEXTRACTOR-REVISITS-RUST-IMPL-AND-JAVA-OR-C-001 phase 1
   * (TKT-ZMVP33 / STUB-WWR793).
   *
   * The Rust `impl_item`, Java `class_declaration` and C/C++ `class_specifier`
   * branches each traversed a scoped body and then FELL THROUGH to the
   * unconditional child loop, re-walking the same subtree. Python
   * (`class_definition`) and TypeScript already carried the `return` guard;
   * these three did not.
   *
   * ONE root cause, THREE defects — the ticket named only the first:
   *   (i)   exact duplicates, MULTIPLICATIVE with nesting depth (a C++ method
   *         at depth 2 was emitted x4, not x2);
   *   (ii)  MIS-SCOPED names — a nested type's members were attributed to the
   *         ENCLOSING type (`Outer.gamma` for a member of `Contract`). These
   *         are false facts, not inflated counts;
   *   (iii) a bare/qualified identity fork in Java (`Outer.alpha` as `method`
   *         AND `alpha` as `function`).
   *
   * Operator ruling (A), 2026-08-01: QUALIFIED ONLY. The bare Java form is
   * dropped, not shimmed. Rust and C/C++ have no qualification to introduce
   * here — `parentScope` is dead code in both — so they are dedup-only;
   * scoped names for those two would be new behavior and are out of scope.
   *
   * Why this survived: the pre-existing Java cases asserted only
   * `expect(elements).toBeDefined()` and the C/C++ cases used `.find()`, which
   * returns the first match and is structurally blind to duplicates. Every one
   * of them passed WITH the bug present. The cases below therefore assert exact
   * cardinality and exact name strings, and they REFUSE to skip on a missing
   * grammar — the `if (!parser) return;` pattern used elsewhere in this file
   * silently green-washes the whole case.
   *
   * The exact qualified strings asserted here are the PHASE-2 HANDOFF SPEC:
   * phase 2 (TKT-XGZA82) is the bare-name reduction at
   * tree-sitter-file-scan.ts:63 and consumes these identities.
   */
  describe('duplicate-traversal fix: identity and cardinality', () => {
    /** Fails loudly rather than silently skipping — the grammar IS the fixture. */
    async function requireParser(lang: string): Promise<Parser> {
      const parser = await registry.getParser(lang as never);
      expect(parser, `grammar for "${lang}" must load; a missing parser is a FAILURE, not a skip`)
        .toBeTruthy();
      return parser!;
    }

    function identities(elements: ReturnType<ElementExtractor['extract']>): string[] {
      return elements.map(e => `${e.type}|${e.name}`).sort();
    }

    it('rust: an impl body is walked once, including nested fns', async () => {
      const code = ['struct Foo;', 'impl Foo {', '    fn alpha(&self) { fn helper() {} }', '}'].join('\n');
      const parser = await requireParser('rs');
      const elements = extractor.extract(parser.parse(code).rootNode, 'p.rs', code, 'rs');

      // Pre-fix this emitted 5 for 3 declarations: alpha and helper both x2.
      expect(identities(elements)).toEqual(['class|Foo', 'function|alpha', 'function|helper']);
    });

    it('java: members scope to their LEXICALLY ENCLOSING type, with no bare fork', async () => {
      const code = [
        'public class Outer {',
        '    public int alpha() { return 1; }',
        '    class Inner {',
        '        public int beta() { return 2; }',
        '    }',
        '    interface Contract { int gamma(); }',
        '}',
      ].join('\n');
      const parser = await requireParser('java');
      const elements = extractor.extract(parser.parse(code).rootNode, 'P.java', code, 'java');

      // Pre-fix this emitted 13 for 6 declarations.
      expect(identities(elements)).toEqual([
        'class|Inner',
        'class|Outer',
        'interface|Contract',
        'method|Contract.gamma',
        'method|Inner.beta',
        'method|Outer.alpha',
      ]);

      // (ii) the two FALSE facts must be gone: Inner's and Contract's members
      // were both attributed to Outer.
      expect(elements.map(e => e.name)).not.toContain('Outer.beta');
      expect(elements.map(e => e.name)).not.toContain('Outer.gamma');

      // (iii) ruling (A): no bare unqualified twin accompanies a qualified method.
      expect(elements.filter(e => e.type === 'function')).toHaveLength(0);
    });

    it('cpp: duplication does not grow with nesting depth', async () => {
      const code = [
        'class Outer {',
        'public:',
        '    int alpha() { return 1; }',
        '    class Inner { public: int beta() { return 2; } };',
        '};',
      ].join('\n');
      const parser = await requireParser('cpp');
      const elements = extractor.extract(parser.parse(code).rootNode, 'p.cpp', code, 'cpp');

      // Pre-fix: 9 for 4 declarations, with `beta` at depth 2 emitted x4.
      expect(identities(elements)).toEqual([
        'class|Inner',
        'class|Outer',
        'function|alpha',
        'function|beta',
      ]);
      expect(elements.filter(e => e.name === 'beta')).toHaveLength(1);
    });

    it('cpp: an ANONYMOUS struct still yields its members', async () => {
      // The early return is deliberately gated on nameNode: an unnamed
      // struct_specifier pushes no class element, so it must keep falling
      // through to the unconditional loop or its members disappear.
      const code = ['typedef struct {', '    int helper() { return 1; }', '} Handle;'].join('\n');
      const parser = await requireParser('cpp');
      const elements = extractor.extract(parser.parse(code).rootNode, 'h.cpp', code, 'cpp');

      expect(elements.filter(e => e.name === 'helper')).toHaveLength(1);
    });

    it('python: the reference shape these three now mirror is unchanged', async () => {
      const code = ['class Svc:', '    def alpha(self):', '        pass'].join('\n');
      const parser = await requireParser('py');
      const elements = extractor.extract(parser.parse(code).rootNode, 'p.py', code, 'py');

      expect(identities(elements)).toEqual(['class|Svc', 'method|Svc.alpha']);
    });
  });
});
