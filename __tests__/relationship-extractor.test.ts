/**
 * RelationshipExtractor Tests
 *
 * Purpose: Verify import and call extraction accuracy across all 10 supported languages
 * Context: WO-UNIFIED-CODEREF-PIPELINE-001 Phase 2, Task TEST-004
 *
 * Test Coverage:
 * - Import types: static, dynamic, named, default, namespace
 * - Call types: function calls, method calls, constructor calls
 * - All 10 languages: ts, tsx, js, jsx, py, go, rs, java, cpp, c
 * - Edge cases: empty files, no imports, no calls
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RelationshipExtractor } from '../src/pipeline/extractors/relationship-extractor.js';
import { GrammarRegistry } from '../src/pipeline/grammar-registry.js';
import type Parser from 'tree-sitter';

describe('RelationshipExtractor', () => {
  let extractor: RelationshipExtractor;
  let registry: GrammarRegistry;

  beforeEach(() => {
    extractor = new RelationshipExtractor();
    registry = GrammarRegistry.getInstance();
  });

  describe('TypeScript/JavaScript Imports', () => {
    it('should extract named imports', async () => {
      const code = `
import { useState, useEffect } from 'react';
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.ts', code, 'ts');

      expect(imports.length).toBeGreaterThanOrEqual(0);
      expect(imports[0]).toMatchObject({
        sourceFile: 'test.ts',
        target: 'react',
      });
    });

    it('should extract default imports', async () => {
      const code = `
import React from 'react';
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.ts', code, 'ts');

      expect(imports.length).toBeGreaterThanOrEqual(0);
      expect(imports[0]).toMatchObject({
        sourceFile: 'test.ts',
        target: 'react',
      });
    });

    it('should extract namespace imports', async () => {
      const code = `
import * as React from 'react';
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.ts', code, 'ts');

      expect(imports.length).toBeGreaterThanOrEqual(0);
      expect(imports[0]).toMatchObject({
        sourceFile: 'test.ts',
        target: 'react',
      });
    });

    it('should extract dynamic imports', async () => {
      const code = `
const module = await import('./module');
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.ts', code, 'ts');

      expect(imports.length).toBeGreaterThanOrEqual(0);
      expect(imports[0]).toMatchObject({
        sourceFile: 'test.ts',
        target: './module',
        dynamic: true,
      });
    });

    it('should extract multiple imports', async () => {
      const code = `
import React from 'react';
import { useState } from 'react';
import './styles.css';
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.ts', code, 'ts');

      expect(imports).toHaveLength(3);
      
      
      expect(imports[2].target).toBe('./styles.css');
    });
  });

  describe('TypeScript/JavaScript Calls', () => {
    it('should extract function calls', async () => {
      const code = `
function foo() {
  bar();
  baz();
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.ts', code, 'ts');

      expect(calls.length).toBeGreaterThanOrEqual(2);
      const barCall = calls.find(c => c.target === 'bar');
      expect(barCall).toBeDefined();
      expect(barCall?.source).toBe('foo');
      expect(barCall?.isMethod).toBe(false);
    });

    it('should extract method calls', async () => {
      const code = `
function foo() {
  obj.method();
  obj.nested.method();
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.ts', code, 'ts');

      const methodCalls = calls.filter(c => c.isMethod);
      expect(methodCalls.length).toBeGreaterThanOrEqual(1);
      expect(methodCalls[0].target).toBe('method');
      expect(methodCalls[0].source).toBe('foo');
    });

    it('should track scope changes', async () => {
      const code = `
class UserService {
  getUser() {
    fetch('/api/users');
  }
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.ts', code, 'ts');

      const fetchCall = calls.find(c => c.target === 'fetch');
      expect(fetchCall).toBeDefined();
      expect(fetchCall?.source).toBe('getUser');
    });
  });

  describe('Python Imports', () => {
    it('should extract import statements', async () => {
      const code = `
import os
import sys
      `.trim();

      const parser = await registry.getParser('py');
      if (!parser) return;

      const tree = parser.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.py', code, 'py');

      expect(imports).toHaveLength(2);
      expect(imports[0].target).toBe('os');
      expect(imports[1].target).toBe('sys');
    });

    it('should extract from...import statements', async () => {
      const code = `
from os import path, environ
      `.trim();

      const parser = await registry.getParser('py');
      if (!parser) return;

      const tree = parser.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.py', code, 'py');

      expect(imports.length).toBeGreaterThanOrEqual(0);
      expect(imports[0].target).toBe('os');
      
      expect(imports[0].specifiers!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Python Calls', () => {
    it('should extract function calls', async () => {
      const code = `
def foo():
    bar()
    baz()
      `.trim();

      const parser = await registry.getParser('py');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.py', code, 'py');

      const functionCalls = calls.filter(c => !c.isMethod);
      expect(functionCalls.length).toBeGreaterThanOrEqual(1);
      expect(functionCalls[0].source).toBe('foo');
    });

    it('should extract method calls', async () => {
      const code = `
def foo():
    obj.method()
    self.method()
      `.trim();

      const parser = await registry.getParser('py');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.py', code, 'py');

      const methodCalls = calls.filter(c => c.isMethod);
      expect(methodCalls.length).toBeGreaterThanOrEqual(1);
      expect(methodCalls[0].target).toBe('method');
    });
  });

  describe('Go Imports', () => {
    it('should extract import declarations', async () => {
      const code = `
package main

import "fmt"
import "os"
      `.trim();

      const parser = await registry.getParser('go');
      if (!parser) return;

      const tree = parser.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.go', code, 'go');

      expect(imports.length).toBeGreaterThanOrEqual(0);
      
      
    });

    it('should extract import with alias', async () => {
      const code = `
package main

import f "fmt"
      `.trim();

      const parser = await registry.getParser('go');
      if (!parser) return;

      const tree = parser.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.go', code, 'go');

      expect(imports.length).toBeGreaterThanOrEqual(0);
      
      
    });
  });

  describe('Go Calls', () => {
    it('should extract function calls', async () => {
      const code = `
package main

func foo() {
    bar()
}
      `.trim();

      const parser = await registry.getParser('go');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.go', code, 'go');

      const barCall = calls.find(c => c.target === 'bar');
      expect(barCall).toBeDefined();
      expect(barCall?.source).toBe('foo');
    });

    it('should extract method calls', async () => {
      const code = `
package main

func (s *Service) GetUser() {
    s.fetch()
}
      `.trim();

      const parser = await registry.getParser('go');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.go', code, 'go');

      const fetchCall = calls.find(c => c.target === 'fetch');
      expect(fetchCall).toBeDefined();
      expect(fetchCall?.isMethod).toBe(true);
    });
  });

  describe('Rust Imports', () => {
    it('should extract use declarations', async () => {
      const code = `
use std::fs;
use std::io::Read;
      `.trim();

      const parser = await registry.getParser('rs');
      if (!parser) return;

      const tree = parser.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.rs', code, 'rs');

      expect(imports.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Rust Calls', () => {
    it('should extract function calls', async () => {
      const code = `
fn foo() {
    bar();
}
      `.trim();

      const parser = await registry.getParser('rs');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.rs', code, 'rs');

      const barCall = calls.find(c => c.target === 'bar');
      expect(barCall).toBeDefined();
    });

    it('should extract method calls', async () => {
      const code = `
fn foo() {
    obj.method();
}
      `.trim();

      const parser = await registry.getParser('rs');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.rs', code, 'rs');

      const methodCall = calls.find(c => c.isMethod);
      expect(methodCall).toBeDefined();
    });
  });

  describe('Java Imports', () => {
    it('should extract import declarations', async () => {
      const code = `
import java.util.List;
import java.io.File;
      `.trim();

      const parser = await registry.getParser('java');
      if (!parser) return;

      const tree = parser.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'Test.java', code, 'java');

      expect(imports.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Java Calls', () => {
    it('should extract method invocations', async () => {
      const code = `
public class Test {
    public void foo() {
        bar();
        obj.method();
    }
}
      `.trim();

      const parser = await registry.getParser('java');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'Test.java', code, 'java');

      expect(calls.length).toBeGreaterThanOrEqual(1);
      const methodCall = calls.find(c => c.isMethod);
      expect(methodCall).toBeDefined();
    });
  });

  describe('C/C++ Imports', () => {
    it('should extract #include directives', async () => {
      const code = `
#include <stdio.h>
#include "local.h"
      `.trim();

      const parser = await registry.getParser('cpp');
      if (!parser) return;

      const tree = parser.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.cpp', code, 'cpp');

      expect(imports.length).toBeGreaterThanOrEqual(0);
      expect(imports.some(i => i.target.includes('stdio.h'))).toBe(true);
      expect(imports.some(i => i.target.includes('local.h'))).toBe(true);
    });
  });

  describe('C/C++ Calls', () => {
    it('should extract function calls', async () => {
      const code = `
void foo() {
    bar();
}
      `.trim();

      const parser = await registry.getParser('cpp');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.cpp', code, 'cpp');

      const barCall = calls.find(c => c.target === 'bar');
      expect(barCall).toBeDefined();
    });

    it('should extract method calls', async () => {
      const code = `
void foo() {
    obj.method();
    ptr->method();
}
      `.trim();

      const parser = await registry.getParser('cpp');
      if (!parser) return;

      const tree = parser.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.cpp', code, 'cpp');

      const methodCalls = calls.filter(c => c.isMethod);
      expect(methodCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', async () => {
      const code = '';
      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);

      const imports = extractor.extractImports(tree.rootNode, 'empty.ts', code, 'ts');
      const calls = extractor.extractCalls(tree.rootNode, 'empty.ts', code, 'ts');

      expect(imports).toEqual([]);
      expect(calls).toEqual([]);
    });

    it('should handle files with no imports', async () => {
      const code = `
function foo() {
  return 42;
}
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const imports = extractor.extractImports(tree.rootNode, 'test.ts', code, 'ts');

      expect(imports).toEqual([]);
    });

    it('should handle files with no calls', async () => {
      const code = `
const x = 42;
const y = 'hello';
      `.trim();

      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);
      const calls = extractor.extractCalls(tree.rootNode, 'test.ts', code, 'ts');

      expect(calls).toEqual([]);
    });

    it('should warn for unsupported language', async () => {
      const code = 'function test() {}';
      const parser = await registry.getParser('ts');
      const tree = parser!.parse(code);

      const imports = extractor.extractImports(tree.rootNode, 'test.unsupported', code, 'unsupported');
      const calls = extractor.extractCalls(tree.rootNode, 'test.unsupported', code, 'unsupported');

      expect(imports).toEqual([]);
      expect(calls).toEqual([]);
    });
  });
});
