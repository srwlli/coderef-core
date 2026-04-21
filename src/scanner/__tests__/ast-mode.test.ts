/**
 * AST Mode Tests - Phase 1: AST Integration
 *
 * Tests the hybrid AST + regex scanner implementation
 * Verifies detection of interfaces, types, decorators, and properties
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanCurrentElements, clearScanCache } from '../scanner.js';

describe('AST Mode Integration', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-ast-test-'));
    testFilePath = path.join(tempDir, 'test.ts');
    clearScanCache();
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should detect TypeScript interfaces with AST mode', async () => {
    const testCode = `
export interface UserData {
  id: number;
  name: string;
}

interface PrivateConfig {
  secret: string;
}
`;

    fs.writeFileSync(testFilePath, testCode);

    const elements = await scanCurrentElements(tempDir, ['ts'], {
      useAST: true,
      recursive: false
    });

    const interfaces = elements.filter(e => e.type === 'interface');
    expect(interfaces.length).toBeGreaterThanOrEqual(1);

    const userDataInterface = interfaces.find(e => e.name === 'UserData');
    expect(userDataInterface).toBeDefined();
    expect(userDataInterface?.exported).toBe(true);
    expect(userDataInterface?.file).toContain('test.ts');
  });

  it('should detect type aliases with AST mode', async () => {
    const testCode = `
export type APIResponse<T> = {
  data: T;
  status: number;
};

type InternalError = {
  code: string;
  message: string;
};
`;

    fs.writeFileSync(testFilePath, testCode);

    const elements = await scanCurrentElements(tempDir, ['ts'], {
      useAST: true,
      recursive: false
    });

    const types = elements.filter(e => e.type === 'type');
    expect(types.length).toBeGreaterThanOrEqual(1);

    const apiResponseType = types.find(e => e.name === 'APIResponse');
    expect(apiResponseType).toBeDefined();
    expect(apiResponseType?.exported).toBe(true);
  });

  it('should detect decorators with AST mode', async () => {
    const testCode = `
function Component(config: any) {
  return function(target: any) {};
}

@Component({ selector: 'app-root' })
export class AppComponent {
  @Input() data: any;
}
`;

    fs.writeFileSync(testFilePath, testCode);

    const elements = await scanCurrentElements(tempDir, ['ts'], {
      useAST: true,
      recursive: false
    });

    const decorators = elements.filter(e => e.type === 'decorator');
    expect(decorators.length).toBeGreaterThanOrEqual(1);

    const componentDecorator = decorators.find(e => e.name === 'Component');
    expect(componentDecorator).toBeDefined();
  });

  it('should detect class properties with AST mode', async () => {
    const testCode = `
export class User {
  private id: number;
  public name: string;
  protected email: string;

  constructor() {
    this.id = 1;
    this.name = 'test';
    this.email = 'test@example.com';
  }
}
`;

    fs.writeFileSync(testFilePath, testCode);

    const elements = await scanCurrentElements(tempDir, ['ts'], {
      useAST: true,
      recursive: false
    });

    const properties = elements.filter(e => e.type === 'property');
    expect(properties.length).toBeGreaterThanOrEqual(2);

    const names = properties.map(p => p.name);
    expect(names).toContain('id');
    expect(names).toContain('name');
  });

  it('should fall back to regex when AST parsing fails', async () => {
    const testCode = `
// Intentionally malformed code to trigger AST failure
export function validFunction() {
  return "this is valid";
}

export class { // Missing class name
  method() {}
}
`;

    fs.writeFileSync(testFilePath, testCode);

    const elements = await scanCurrentElements(tempDir, ['ts'], {
      useAST: true,
      fallbackToRegex: true,
      recursive: false
    });

    // Should still detect the valid function via fallback
    const functions = elements.filter(e => e.type === 'function');
    expect(functions.length).toBeGreaterThanOrEqual(1);

    const validFunc = functions.find(e => e.name === 'validFunction');
    expect(validFunc).toBeDefined();
  });

  it('should skip file when AST fails and fallback disabled', async () => {
    const testCode = `
export class { // Malformed - missing name
  method() {}
}
`;

    fs.writeFileSync(testFilePath, testCode);

    const elements = await scanCurrentElements(tempDir, ['ts'], {
      useAST: true,
      fallbackToRegex: false,
      recursive: false
    });

    // Should have no elements since AST failed and no fallback
    expect(elements.length).toBe(0);
  });

  it('should work without AST mode (backward compatibility)', async () => {
    const testCode = `
export function myFunction() {
  return 42;
}

export class MyClass {
  method() {}
}
`;

    fs.writeFileSync(testFilePath, testCode);

    const elements = await scanCurrentElements(tempDir, ['ts'], {
      useAST: false,
      recursive: false
    });

    // Should detect function and class with regex patterns
    expect(elements.length).toBeGreaterThanOrEqual(2);

    const func = elements.find(e => e.name === 'myFunction');
    const cls = elements.find(e => e.name === 'MyClass');

    expect(func).toBeDefined();
    expect(cls).toBeDefined();
  });

  it('should combine AST and regex results when fallback enabled', async () => {
    const testCode = `
export interface DataModel {
  id: string;
}

export function processData() {
  return null;
}
`;

    fs.writeFileSync(testFilePath, testCode);

    const elements = await scanCurrentElements(tempDir, ['ts'], {
      useAST: true,
      fallbackToRegex: true,
      recursive: false
    });

    // Should have both interface (AST) and function (regex or AST)
    const interfaces = elements.filter(e => e.type === 'interface');
    const functions = elements.filter(e => e.type === 'function');

    expect(interfaces.length).toBeGreaterThanOrEqual(1);
    expect(functions.length).toBeGreaterThanOrEqual(1);
  });
});
