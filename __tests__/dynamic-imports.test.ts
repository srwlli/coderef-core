/**
 * Dynamic Import Detection Tests
 * WO-SCANNER-ACCURACY-IMPROVEMENTS-001: TEST-001
 *
 * Tests for:
 * - await import() patterns
 * - import().then() patterns
 * - Destructured dynamic imports
 * - Namespace dynamic imports
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import DynamicImportDetector from '../src/analyzer/dynamic-import-detector.js';

describe('DynamicImportDetector', () => {
  let detector: DynamicImportDetector;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-test-'));
    detector = new DynamicImportDetector(tempDir);
  });

  afterEach(() => {
    // Clean up temp files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createTestFile(filename: string, content: string): string {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  describe('await import() detection', () => {
    it('should detect basic await import', () => {
      const filePath = createTestFile('test.ts', `
async function loadModule() {
  const module = await import('./myModule');
  module.doSomething();
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      expect(imports[0].importType).toBe('await');
      expect(imports[0].modulePath).toBe('./myModule');
      expect(imports[0].namespaceVariable).toBe('module');
      expect(imports[0].containingFunction).toBe('loadModule');
    });

    it('should detect destructured await import', () => {
      const filePath = createTestFile('test.ts', `
async function loadUtils() {
  const { helper, formatter } = await import('./utils');
  helper();
  formatter();
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      expect(imports[0].importType).toBe('await');
      expect(imports[0].modulePath).toBe('./utils');
      expect(imports[0].importedSymbols).toContain('helper');
      expect(imports[0].importedSymbols).toContain('formatter');
    });

    it('should detect await import in arrow function', () => {
      const filePath = createTestFile('test.ts', `
const loadConfig = async () => {
  const { config } = await import('./config');
  return config;
};
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      expect(imports[0].importType).toBe('await');
      expect(imports[0].containingFunction).toBe('loadConfig');
      expect(imports[0].importedSymbols).toContain('config');
    });
  });

  describe('import().then() detection', () => {
    it('should detect promise-based dynamic import', () => {
      const filePath = createTestFile('test.ts', `
function loadLazy() {
  import('./lazyModule').then(module => {
    module.init();
  });
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      expect(imports[0].importType).toBe('promise');
      expect(imports[0].modulePath).toBe('./lazyModule');
    });

    it('should detect destructured import in .then() callback', () => {
      const filePath = createTestFile('test.ts', `
function loadFeature() {
  import('./feature').then(({ init, destroy }) => {
    init();
  });
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      expect(imports[0].importedSymbols).toContain('init');
      expect(imports[0].importedSymbols).toContain('destroy');
    });
  });

  describe('conditional dynamic imports', () => {
    it('should detect import inside if statement', () => {
      const filePath = createTestFile('test.ts', `
async function maybeLoad(condition: boolean) {
  if (condition) {
    const mod = await import('./optional');
    mod.run();
  }
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      // Note: await import inside conditional is still detected as 'await' type
      // because the await check happens first in getImportType()
      expect(imports[0].importType).toBe('await');
      expect(imports[0].modulePath).toBe('./optional');
      expect(imports[0].containingFunction).toBe('maybeLoad');
    });

    it('should detect pure conditional import without await', () => {
      const filePath = createTestFile('test.ts', `
function maybeLoad(condition: boolean) {
  if (condition) {
    import('./optional').then(mod => mod.run());
  }
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      // Promise-based import inside conditional should be detected
      expect(imports[0].importType).toBe('promise');
      expect(imports[0].modulePath).toBe('./optional');
    });
  });

  describe('class method dynamic imports', () => {
    it('should detect import in class method with class context', () => {
      const filePath = createTestFile('test.ts', `
class PluginLoader {
  async loadPlugin(name: string) {
    const plugin = await import(\`./plugins/\${name}\`);
    return plugin;
  }
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      expect(imports[0].containingClass).toBe('PluginLoader');
      expect(imports[0].containingFunction).toBe('loadPlugin');
      // Template literal should mark as dynamic path
      expect(imports[0].modulePath).toContain('./plugins/');
    });
  });

  describe('multiple dynamic imports', () => {
    it('should detect multiple imports in same file', () => {
      const filePath = createTestFile('test.ts', `
async function loadAll() {
  const { a } = await import('./moduleA');
  const { b } = await import('./moduleB');
  const { c } = await import('./moduleC');
  return { a, b, c };
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(3);
      expect(imports.map(i => i.modulePath)).toContain('./moduleA');
      expect(imports.map(i => i.modulePath)).toContain('./moduleB');
      expect(imports.map(i => i.modulePath)).toContain('./moduleC');
    });
  });

  describe('edge cases', () => {
    it('should handle dynamic path expression', () => {
      const filePath = createTestFile('test.ts', `
async function loadDynamic(path: string) {
  const mod = await import(path);
  return mod;
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      expect(imports[0].modulePath).toBe('<dynamic>');
    });

    it('should handle JSX file', () => {
      const filePath = createTestFile('test.tsx', `
import React from 'react';

const LazyComponent = React.lazy(() => import('./MyComponent'));

export function App() {
  return <LazyComponent />;
}
      `);

      const imports = detector.detectDynamicImports(filePath);

      expect(imports).toHaveLength(1);
      expect(imports[0].modulePath).toBe('./MyComponent');
    });

    it('should cache results', () => {
      const filePath = createTestFile('test.ts', `
async function load() {
  return await import('./cached');
}
      `);

      // First call
      const imports1 = detector.detectDynamicImports(filePath);
      // Second call should use cache
      const imports2 = detector.detectDynamicImports(filePath);

      expect(imports1).toBe(imports2); // Same reference = from cache
    });

    it('should handle empty file', () => {
      const filePath = createTestFile('empty.ts', '');
      const imports = detector.detectDynamicImports(filePath);
      expect(imports).toHaveLength(0);
    });

    it('should handle file with no dynamic imports', () => {
      const filePath = createTestFile('static.ts', `
import { foo } from './foo';
import * as bar from './bar';

export function baz() {
  return foo() + bar.qux();
}
      `);

      const imports = detector.detectDynamicImports(filePath);
      expect(imports).toHaveLength(0);
    });
  });

  describe('buildDynamicCallEdges', () => {
    it('should create call edges from dynamic imports', () => {
      const filePath = createTestFile('caller.ts', `
async function runCommand() {
  const { handleScan, handleQuery } = await import('./commands');
  handleScan();
  handleQuery();
}
      `);

      const edges = detector.buildDynamicCallEdges([filePath]);

      expect(edges).toHaveLength(2);
      expect(edges[0].targetFunction).toBe('handleScan');
      expect(edges[1].targetFunction).toBe('handleQuery');
      expect(edges[0].edgeType).toBe('dynamic-call');
    });

    it('should create wildcard edge for namespace import', () => {
      const filePath = createTestFile('namespace.ts', `
async function loadAll() {
  const utils = await import('./utils');
  utils.format();
  utils.parse();
}
      `);

      const edges = detector.buildDynamicCallEdges([filePath]);

      expect(edges).toHaveLength(1);
      expect(edges[0].targetFunction).toBe('*');
    });
  });
});
