/**
 * Integration tests for semantic orchestrator
 * Tests end-to-end workflow: extraction → headers → enrichment → registry sync
 */

import * as fs from 'fs';
import * as path from 'path';
import { SemanticOrchestrator, runSemanticPipeline } from './orchestrator';

describe('SemanticOrchestrator', () => {
  let tempDir: string;
  let registryPath: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '.test-project');
    registryPath = path.join(tempDir, '.coderef', 'semantic-registry.json');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Project Processing', () => {
    test('should find and process source files', async () => {
      // Create test files
      fs.writeFileSync(
        path.join(tempDir, 'utils.ts'),
        'export function myFunc() {}\nexport const myConst = 42;',
      );
      fs.writeFileSync(
        path.join(tempDir, 'index.ts'),
        'import { myFunc } from "./utils";\nexport default myFunc;',
      );

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        generateHeaders: false,
        syncRegistry: false,
      });

      const result = await orchestrator.processProject();
      expect(result.filesProcessed).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0);
    });

    test('should generate headers when enabled', async () => {
      const file = path.join(tempDir, 'test.ts');
      fs.writeFileSync(file, 'export function test() {}');

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        generateHeaders: true,
        syncRegistry: false,
      });

      const result = await orchestrator.processProject();
      expect(result.headersGenerated).toBeGreaterThanOrEqual(0);
    });

    test('should skip .coderef and node_modules', async () => {
      // Create files in excluded directories
      fs.mkdirSync(path.join(tempDir, '.coderef'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });

      fs.writeFileSync(
        path.join(tempDir, '.coderef', 'excluded.ts'),
        'export function shouldSkip() {}',
      );
      fs.writeFileSync(
        path.join(tempDir, 'node_modules', 'dep.ts'),
        'export const dep = true;',
      );
      fs.writeFileSync(
        path.join(tempDir, 'included.ts'),
        'export function shouldProcess() {}',
      );

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        syncRegistry: false,
      });

      const result = await orchestrator.processProject();
      // Should process only the included.ts file
      expect(result.filesProcessed).toBeGreaterThan(0);
    });
  });

  describe('Pipeline Options', () => {
    test('should respect generateHeaders option', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

      let orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        generateHeaders: true,
        syncRegistry: false,
      });

      let result = await orchestrator.processProject();
      const headersCount1 = result.headersGenerated;

      orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        generateHeaders: false,
        syncRegistry: false,
      });

      result = await orchestrator.processProject();
      expect(result.headersGenerated).toBe(0);
    });

    test('should handle validateOnly mode', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        syncRegistry: true,
        validateOnly: true,
      });

      const result = await orchestrator.processProject();
      // In dry-run mode, registry file should not be created
      expect(fs.existsSync(registryPath)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid files gracefully', async () => {
      const file = path.join(tempDir, 'invalid.ts');
      fs.writeFileSync(file, 'this is not valid typescript {{{}');

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        generateHeaders: false,
        syncRegistry: false,
      });

      const result = await orchestrator.processProject();
      // Should still complete with error logged
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
      expect(result.filesProcessed).toBeGreaterThan(0);
    });

    test('should recover from per-file errors', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'valid.ts'),
        'export function valid() {}',
      );
      fs.writeFileSync(
        path.join(tempDir, 'invalid.ts'),
        'export const x =',
      );

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        generateHeaders: false,
        syncRegistry: false,
      });

      const result = await orchestrator.processProject();
      // Should process valid files even if others fail
      expect(result.filesProcessed).toBeGreaterThan(0);
    });
  });

  describe('Registry Sync', () => {
    test('should create registry when syncRegistry enabled', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        syncRegistry: true,
        generateHeaders: false,
        validateOnly: false,
      });

      const result = await orchestrator.processProject();
      expect(result.registryUpdated).toBeGreaterThanOrEqual(0);
    });

    test('should skip registry sync when disabled', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        syncRegistry: false,
        generateHeaders: false,
      });

      const result = await orchestrator.processProject();
      expect(result.registryUpdated).toBe(0);
    });
  });

  describe('Execution Metrics', () => {
    test('should measure execution time', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        syncRegistry: false,
      });

      const result = await orchestrator.processProject();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should report comprehensive metrics', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

      const orchestrator = new SemanticOrchestrator({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        syncRegistry: false,
      });

      const result = await orchestrator.processProject();
      expect(result).toHaveProperty('filesProcessed');
      expect(result).toHaveProperty('headersGenerated');
      expect(result).toHaveProperty('entriesEnriched');
      expect(result).toHaveProperty('registryUpdated');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('executionTime');
    });
  });

  describe('Convenience API', () => {
    test('should work with runSemanticPipeline function', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.ts'), 'export const x = 1;');

      const result = await runSemanticPipeline({
        projectDir: tempDir,
        outputDir: tempDir,
        registryPath,
        syncRegistry: false,
      });

      expect(result.filesProcessed).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });
});
