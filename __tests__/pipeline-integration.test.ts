/**
 * Pipeline Integration Tests
 *
 * Purpose: Verify end-to-end pipeline functionality with real file processing
 * Context: WO-UNIFIED-CODEREF-PIPELINE-001 Phase 2, Task TEST-006
 *
 * Test Coverage:
 * - File discovery: Find source files matching language filters
 * - Single-pass parsing: Parse files once with tree-sitter
 * - Element extraction: Extract functions, classes, components
 * - Relationship extraction: Extract imports and calls
 * - Graph building: Build dependency graph from relationships
 * - PipelineState: Verify complete state with all metadata
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PipelineOrchestrator } from '../src/pipeline/orchestrator.js';
import type { PipelineState } from '../src/pipeline/types.js';

describe('PipelineOrchestrator Integration', () => {
  let tempDir: string;
  let orchestrator: PipelineOrchestrator;

  beforeAll(async () => {
    // Create temporary test directory
    tempDir = path.join(process.cwd(), '__tests__', 'fixtures', 'integration-test');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(path.join(tempDir, '.venv', 'lib'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'node_modules', 'left-pad'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '__pycache__'), { recursive: true });

    // Create TypeScript test files
    await fs.writeFile(
      path.join(tempDir, 'index.ts'),
      `
import { getUserData } from './user';
import { formatDate } from './utils';

export function processUser(id: number): void {
  const data = getUserData(id);
  const formatted = formatDate(data.createdAt);
  console.log(formatted);
}
      `.trim()
    );

    await fs.writeFile(
      path.join(tempDir, 'user.ts'),
      `
export interface User {
  id: number;
  name: string;
  createdAt: Date;
}

export function getUserData(id: number): User {
  return {
    id,
    name: 'Test User',
    createdAt: new Date(),
  };
}
      `.trim()
    );

    await fs.writeFile(
      path.join(tempDir, 'utils.ts'),
      `
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}
      `.trim()
    );

    // Create Python test file
    await fs.writeFile(
      path.join(tempDir, 'example.py'),
      `
import os
from typing import List

def process_files(paths: List[str]) -> None:
    for path in paths:
        print(path)
      `.trim()
    );

    await fs.writeFile(
      path.join(tempDir, '.venv', 'lib', 'requests.py'),
      `
def get(url):
    return url
      `.trim()
    );

    await fs.writeFile(
      path.join(tempDir, 'node_modules', 'left-pad', 'index.ts'),
      `
export function vendoredPad(value: string): string {
  return value;
}
      `.trim()
    );

    await fs.writeFile(
      path.join(tempDir, '__pycache__', 'example.pyc'),
      'compiled'
    );

    orchestrator = new PipelineOrchestrator();
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Complete Pipeline Execution', () => {
    let state: PipelineState;

    beforeAll(async () => {
      // Run full pipeline on test fixture
      state = await orchestrator.run(tempDir, {
        languages: ['ts', 'py'],
        verbose: false,
      });
    });

    it('should discover all source files', () => {
      expect(state.files).toBeDefined();
      expect(state.files.size).toBeGreaterThanOrEqual(2);

      const tsFiles = state.files.get('ts');
      const pyFiles = state.files.get('py');

      expect(tsFiles).toBeDefined();
      expect(tsFiles!.length).toBe(3); // index.ts, user.ts, utils.ts

      expect(pyFiles).toBeDefined();
      expect(pyFiles!.length).toBe(1); // example.py only; venv is excluded
    });

    it('should extract all code elements', () => {
      expect(state.elements).toBeDefined();
      expect(state.elements.length).toBeGreaterThanOrEqual(5);

      // TypeScript functions
      const processUser = state.elements.find(e => e.name === 'processUser');
      expect(processUser).toBeDefined();
      expect(processUser?.type).toBe('function');
      expect(processUser?.exported).toBe(true);

      const getUserData = state.elements.find(e => e.name === 'getUserData');
      expect(getUserData).toBeDefined();
      expect(getUserData?.type).toBe('function');

      const formatDate = state.elements.find(e => e.name === 'formatDate');
      expect(formatDate).toBeDefined();

      // TypeScript interface
      const userInterface = state.elements.find(e => e.name === 'User' && e.type === 'interface');
      expect(userInterface).toBeDefined();

      // Python function
      const processFiles = state.elements.find(e => e.name === 'process_files');
      expect(processFiles).toBeDefined();
      expect(processFiles?.type).toBe('function');
    });

    it('should extract import relationships', () => {
      // Phase 5 schema migration: edge type 'imports' → 'import';
      // edge.source is now a canonical codeRefId or file-grain id
      // (e.g. @File/src/index.ts); edge.target is a codeRefId for
      // resolved imports OR absent for non-resolved. Match by
      // evidence.originSpecifier instead of legacy edge.target.
      const indexImports = state.graph.edges.filter(e => {
        if (e.relationship !== 'import' && e.type !== 'imports') return false;
        const sourceFile = (e.evidence as Record<string, unknown> | undefined)?.sourceFile
          ?? (e.sourceLocation as { file?: string } | undefined)?.file
          ?? e.source;
        return typeof sourceFile === 'string' && sourceFile.includes('index.ts');
      });

      expect(indexImports.length).toBeGreaterThanOrEqual(2);

      const findBySpec = (spec: string) => indexImports.find(e => {
        const ev = e.evidence as Record<string, unknown> | undefined;
        return ev?.originSpecifier === spec;
      });

      // getUserData import
      expect(findBySpec('./user')).toBeDefined();
      // formatDate import
      expect(findBySpec('./utils')).toBeDefined();
    });

    it('should extract call relationships', () => {
      // Phase 5: edge type 'calls' → 'call'; edge source / target are
      // canonical codeRefIds; calleeName lives in evidence.calleeName.
      const calls = state.graph.edges.filter(
        e => e.relationship === 'call' || e.type === 'calls',
      );

      expect(calls.length).toBeGreaterThanOrEqual(2);

      const findCallByCallee = (callee: string) => calls.find(c => {
        const ev = c.evidence as Record<string, unknown> | undefined;
        return ev?.calleeName === callee;
      });

      expect(findCallByCallee('getUserData')).toBeDefined();
      expect(findCallByCallee('formatDate')).toBeDefined();
    });

    it('should build dependency graph', () => {
      expect(state.graph).toBeDefined();
      expect(state.graph.nodes).toBeDefined();
      expect(state.graph.edges).toBeDefined();

      // Phase 5: graph.nodes includes element-grain nodes PLUS
      // file-grain pseudo-nodes (one per file with elements/imports
      // — needed as source endpoints for module-level imports).
      // Element-grain nodes equal state.elements; file-grain nodes
      // are the difference.
      const elementNodes = state.graph.nodes.filter(n => n.type !== 'file');
      expect(elementNodes.length).toBe(state.elements.length);

      // Each node should have required fields.
      for (const node of state.graph.nodes) {
        expect(node.id).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.name).toBeDefined();
        expect(node.file).toBeDefined();
        expect(node.line).toBeGreaterThan(0);
      }

      // Edges should include imports + calls (Phase 5: 'import' / 'call').
      expect(state.graph.edges.length).toBeGreaterThan(0);

      const importEdges = state.graph.edges.filter(e => e.relationship === 'import' || e.type === 'imports');
      const callEdges = state.graph.edges.filter(e => e.relationship === 'call' || e.type === 'calls');

      expect(importEdges.length).toBeGreaterThanOrEqual(2); // At least 2 imports in index.ts
      expect(callEdges.length).toBeGreaterThanOrEqual(2); // At least 2 calls in index.ts
    });

    it('should store source content', () => {
      expect(state.sources).toBeDefined();
      expect(state.sources.size).toBe(4); // 3 TS files + 1 PY file

      const indexContent = state.sources.get(path.join(tempDir, 'index.ts'));
      expect(indexContent).toBeDefined();
      expect(indexContent).toContain('processUser');
      expect(indexContent).toContain('import');
    });

    it('should populate metadata', () => {
      expect(state.metadata).toBeDefined();
      expect(state.metadata.startTime).toBeGreaterThan(0);
      expect(state.metadata.endTime).toBeGreaterThan(0);
      expect(state.metadata.endTime).toBeGreaterThanOrEqual(state.metadata.startTime);
      expect(state.metadata.filesScanned).toBe(4);
      expect(state.metadata.elementsExtracted).toBe(state.elements.length);
      expect(state.metadata.relationshipsExtracted).toBeGreaterThan(0);
    });

    it('should respect language filters', async () => {
      // Run pipeline with only TypeScript
      const tsOnlyState = await orchestrator.run(tempDir, {
        languages: ['ts'],
        verbose: false,
      });

      const tsFiles = tsOnlyState.files.get('ts');
      const pyFiles = tsOnlyState.files.get('py');

      expect(tsFiles).toBeDefined();
      expect(tsFiles!.length).toBe(3);
      expect(pyFiles ?? []).toHaveLength(0); // Python filtered out
    });

    it('should exclude vendor and generated directories by default', () => {
      const allDiscoveredFiles = Array.from(state.files.values()).flat();

      expect(allDiscoveredFiles.some(file => file.includes('.venv'))).toBe(false);
      expect(allDiscoveredFiles.some(file => file.includes('node_modules'))).toBe(false);
      expect(allDiscoveredFiles.some(file => file.includes('__pycache__'))).toBe(false);

      const elementNames = state.elements.map(element => element.name);
      expect(elementNames).not.toContain('get');
      expect(elementNames).not.toContain('vendoredPad');
    });

    it('should respect .coderefignore patterns', async () => {
      const ignoredDir = path.join(tempDir, 'generated');
      const ignoredFile = path.join(ignoredDir, 'generated.ts');
      const ignoreFile = path.join(tempDir, '.coderefignore');

      await fs.mkdir(ignoredDir, { recursive: true });
      await fs.writeFile(
        ignoredFile,
        `
export function generatedOnly(): string {
  return 'ignored';
}
        `.trim()
      );
      await fs.writeFile(ignoreFile, 'generated/\n');

      try {
        const ignoredState = await orchestrator.run(tempDir, {
          languages: ['ts'],
          verbose: false,
        });

        const discoveredTsFiles = ignoredState.files.get('ts') ?? [];
        expect(discoveredTsFiles.some(file => file.includes('generated'))).toBe(false);
        expect(ignoredState.elements.some(element => element.name === 'generatedOnly')).toBe(false);
      } finally {
        await fs.rm(ignoreFile, { force: true });
        await fs.rm(ignoredDir, { recursive: true, force: true });
      }
    });

    it('should handle empty directories gracefully', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const emptyState = await orchestrator.run(emptyDir, {
        languages: ['ts', 'py'],
        verbose: false,
      });

      expect(emptyState.files.size).toBeGreaterThanOrEqual(0);
      expect(emptyState.elements).toEqual([]);
      expect(emptyState.graph.nodes).toEqual([]);
      expect(emptyState.graph.edges).toEqual([]);

      await fs.rm(emptyDir, { recursive: true, force: true });
    });
  });

  describe('Performance and Memory', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();

      await orchestrator.run(tempDir, {
        languages: ['ts', 'py'],
        verbose: false,
      });

      const duration = Date.now() - startTime;

      // Should complete in under 5 seconds for small project
      expect(duration).toBeLessThan(5000);
    });

    it('should cache grammars across runs', async () => {
      // First run
      const state1 = await orchestrator.run(tempDir, {
        languages: ['ts'],
        verbose: false,
      });

      // Second run (grammars should be cached)
      const startTime = Date.now();
      const state2 = await orchestrator.run(tempDir, {
        languages: ['ts'],
        verbose: false,
      });
      const duration = Date.now() - startTime;

      // Second run should be faster (grammars cached)
      expect(duration).toBeLessThan(1000);

      // Results should be identical
      expect(state2.elements.length).toBe(state1.elements.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project path', async () => {
      const invalidPath = path.join(tempDir, 'nonexistent');

      const state = await orchestrator.run(invalidPath, {
        languages: ['ts'],
        verbose: false,
      });

      // Should return empty state without crashing
      expect(state.elements).toEqual([]);
      expect(state.files.size).toBeGreaterThanOrEqual(0);
    });

    it('should skip files with syntax errors', async () => {
      // Create file with syntax error
      const errorFile = path.join(tempDir, 'syntax-error.ts');
      await fs.writeFile(errorFile, 'function broken( { this is invalid syntax');

      const state = await orchestrator.run(tempDir, {
        languages: ['ts'],
        verbose: false,
      });

      // Should process other files successfully despite one error
      expect(state.elements.length).toBeGreaterThan(0);

      // Clean up
      await fs.rm(errorFile, { force: true });
    });
  });
});
