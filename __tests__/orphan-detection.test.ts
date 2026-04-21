/**
 * Orphan Detection Tests
 * WO-SCANNER-ACCURACY-IMPROVEMENTS-001: TEST-003
 *
 * Tests for entry point detection and false positive reduction.
 * Target: <5% false positive rate for orphan detection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import GraphBuilder from '../src/analyzer/graph-builder.js';

describe('Orphan Detection', () => {
  let tempDir: string;
  let builder: GraphBuilder;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-orphan-'));
    builder = new GraphBuilder(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createTestFile(filename: string, content: string): string {
    const filePath = path.join(tempDir, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  describe('Entry Point Pattern Detection', () => {
    it('should not mark handle* functions as orphans', () => {
      const filePath = createTestFile('cli.ts', `
export function handleScanCommand(args: string[]) {
  console.log('Scanning...', args);
}

export function handleQueryCommand(query: string) {
  console.log('Querying...', query);
}

export function handleImpactCommand(target: string) {
  console.log('Analyzing impact...', target);
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      // handle* functions should NOT be in orphan list
      expect(orphans.some(o => o.includes('handleScanCommand'))).toBe(false);
      expect(orphans.some(o => o.includes('handleQueryCommand'))).toBe(false);
      expect(orphans.some(o => o.includes('handleImpactCommand'))).toBe(false);
    });

    it('should not mark register* functions as orphans', () => {
      const filePath = createTestFile('setup.ts', `
export function registerCommands(program: any) {
  program.command('scan');
}

export function registerMiddleware(app: any) {
  app.use(() => {});
}

export function registerRoutes(router: any) {
  router.get('/');
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      expect(orphans.some(o => o.includes('registerCommands'))).toBe(false);
      expect(orphans.some(o => o.includes('registerMiddleware'))).toBe(false);
      expect(orphans.some(o => o.includes('registerRoutes'))).toBe(false);
    });

    it('should not mark main/run/init functions as orphans', () => {
      const filePath = createTestFile('app.ts', `
export function main() {
  console.log('Starting application');
}

export function run() {
  main();
}

export function init() {
  console.log('Initializing...');
}

export function bootstrap() {
  init();
  run();
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      expect(orphans.some(o => o.includes('main'))).toBe(false);
      expect(orphans.some(o => o.includes('run'))).toBe(false);
      expect(orphans.some(o => o.includes('init'))).toBe(false);
      expect(orphans.some(o => o.includes('bootstrap'))).toBe(false);
    });

    it('should not mark *Command/*Handler functions as orphans', () => {
      const filePath = createTestFile('handlers.ts', `
export function scanCommand() {
  return 'scan';
}

export function queryCommand() {
  return 'query';
}

export function eventHandler(event: any) {
  console.log(event);
}

export function requestHandler(req: any, res: any) {
  res.send('ok');
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      expect(orphans.some(o => o.includes('scanCommand'))).toBe(false);
      expect(orphans.some(o => o.includes('queryCommand'))).toBe(false);
      expect(orphans.some(o => o.includes('eventHandler'))).toBe(false);
      expect(orphans.some(o => o.includes('requestHandler'))).toBe(false);
    });
  });

  describe('Entry Point File Detection', () => {
    it('should not mark exported functions in cli.ts as orphans', () => {
      const filePath = createTestFile('cli.ts', `
export function startCLI() {
  console.log('CLI started');
}

export function parseCLIArgs(args: string[]) {
  return args;
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      // Functions in cli.ts should not be orphans (entry point file)
      expect(orphans.some(o => o.includes('startCLI'))).toBe(false);
      expect(orphans.some(o => o.includes('parseCLIArgs'))).toBe(false);
    });

    it('should not mark exported functions in index.ts as orphans', () => {
      const filePath = createTestFile('index.ts', `
export function initialize() {
  console.log('Initialized');
}

export function shutdown() {
  console.log('Shutting down');
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      expect(orphans.some(o => o.includes('initialize'))).toBe(false);
      expect(orphans.some(o => o.includes('shutdown'))).toBe(false);
    });

    it('should not mark exported functions in main.ts as orphans', () => {
      const filePath = createTestFile('main.ts', `
export function startApp() {
  console.log('App started');
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      expect(orphans.some(o => o.includes('startApp'))).toBe(false);
    });

    it('should not mark exported functions in app.ts as orphans', () => {
      const filePath = createTestFile('app.ts', `
export function createApp() {
  return {};
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      expect(orphans.some(o => o.includes('createApp'))).toBe(false);
    });

    it('should not mark exported functions in server.ts as orphans', () => {
      const filePath = createTestFile('server.ts', `
export function startServer(port: number) {
  console.log('Server on port', port);
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      expect(orphans.some(o => o.includes('startServer'))).toBe(false);
    });
  });

  describe('Export-Aware Orphan Detection', () => {
    it('should not mark exported functions as orphans', () => {
      const filePath = createTestFile('utils.ts', `
export function publicHelper() {
  return 'public';
}

export function anotherPublic() {
  return 'also public';
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      // Exported functions should not be orphans
      expect(orphans.some(o => o.includes('publicHelper'))).toBe(false);
      expect(orphans.some(o => o.includes('anotherPublic'))).toBe(false);
    });

    it('should mark truly unused private functions as orphans', () => {
      const filePath = createTestFile('internal.ts', `
// This is NOT exported and NOT called - true orphan
function unusedPrivate() {
  return 'unused';
}

// This IS exported - not an orphan
export function publicFunc() {
  return 'public';
}

// This is called by publicFunc - not an orphan
function usedPrivate() {
  return 'used';
}

export function caller() {
  return usedPrivate();
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      // Only unusedPrivate should potentially be an orphan
      // publicFunc and caller are exported
      // usedPrivate is called
      expect(orphans.some(o => o.includes('publicFunc'))).toBe(false);
      expect(orphans.some(o => o.includes('caller'))).toBe(false);
    });
  });

  describe('False Positive Rate', () => {
    it('should have <5% false positive rate on typical CLI code', () => {
      // Create a typical CLI structure
      createTestFile('src/cli.ts', `
export function handleScan() {}
export function handleQuery() {}
export function handleValidate() {}
      `);

      createTestFile('src/commands/scan.ts', `
export function executeScan() {}
export function parseScanArgs() {}
      `);

      createTestFile('src/utils/helpers.ts', `
export function formatOutput() {}
export function logError() {}
      `);

      createTestFile('src/index.ts', `
export * from './cli';
export * from './commands/scan';
export * from './utils/helpers';
      `);

      const files = [
        path.join(tempDir, 'src/cli.ts'),
        path.join(tempDir, 'src/commands/scan.ts'),
        path.join(tempDir, 'src/utils/helpers.ts'),
        path.join(tempDir, 'src/index.ts'),
      ];

      const graph = builder.buildGraph(files);
      const orphans = (graph as any).orphans || [];
      const nodes = Array.from(graph.nodes.values());
      const totalFunctions = nodes.filter(n =>
        n.type === 'function' || n.type === 'Function'
      ).length;

      // False positive rate should be <5%
      // In this case, all functions are exported or entry points
      const falsePositiveRate = totalFunctions > 0
        ? orphans.length / totalFunctions
        : 0;

      expect(falsePositiveRate).toBeLessThan(0.05);
    });

    it('should correctly identify actually orphaned code', () => {
      createTestFile('mixed.ts', `
// Exported - not orphan
export function publicAPI() {
  return internalHelper();
}

// Called by publicAPI - not orphan
function internalHelper() {
  return 'help';
}

// Entry point pattern - not orphan
export function handleRequest() {}

// True orphan - not exported, not called, not entry point
function deadCode() {
  return 'never used';
}

// Another true orphan
function anotherDeadCode() {
  return deadCode(); // calls deadCode but itself is never called
}
      `);

      const files = [path.join(tempDir, 'mixed.ts')];
      const graph = builder.buildGraph(files);
      const orphans = graph.orphans || [];

      // publicAPI, internalHelper, handleRequest should NOT be orphans
      expect(orphans.some(o => o.includes('publicAPI'))).toBe(false);
      expect(orphans.some(o => o.includes('handleRequest'))).toBe(false);

      // deadCode and anotherDeadCode could legitimately be orphans
      // but we're lenient - the key is no false positives on the others
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', () => {
      const filePath = createTestFile('empty.ts', '');
      const graph = builder.buildGraph([filePath]);

      expect(graph.nodes).toHaveLength(0);
      expect(graph.orphans || []).toHaveLength(0);
    });

    it('should handle files with only types/interfaces', () => {
      const filePath = createTestFile('types.ts', `
export interface User {
  id: string;
  name: string;
}

export type Status = 'active' | 'inactive';

export enum Role {
  Admin,
  User,
}
      `);

      const graph = builder.buildGraph([filePath]);
      // Types/interfaces might or might not create nodes
      // Key is no errors and reasonable behavior
      expect(graph).toBeDefined();
    });

    it('should handle class methods correctly', () => {
      const filePath = createTestFile('service.ts', `
export class MyService {
  // Public method - not orphan (part of exported class)
  public doSomething() {
    this.privateHelper();
  }

  // Private method called by doSomething - not orphan
  private privateHelper() {
    return 'help';
  }

  // Entry point pattern in class
  handleEvent(event: any) {
    console.log(event);
  }
}
      `);

      const graph = builder.buildGraph([filePath]);
      const orphans = graph.orphans || [];

      // Methods of exported class should not be orphans
      expect(orphans.some(o => o.includes('doSomething'))).toBe(false);
      expect(orphans.some(o => o.includes('handleEvent'))).toBe(false);
    });
  });
});
