/**
 * generateDiagrams Test Suite
 *
 * WO-DECOMPOSE-CODEREF-MCP-SERVER-MONOLITH-001 Phase 4 (test-linkage burn-down,
 * cluster B): public-API diagram writer (src/index.ts named export), previously
 * zero test edges.
 *
 * Tests:
 * - all four diagram files written under .coderef/diagrams/
 * - Mermaid/DOT preambles and node labels derived from the element fixture
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateDiagrams } from '../generateDiagrams.js';
import type { ElementData } from '../../types/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, rm, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('generateDiagrams() - diagram files', () => {
  let testProjectDir: string;

  beforeEach(async () => {
    testProjectDir = join(__dirname, `.test-project-${randomUUID()}`);
    await mkdir(testProjectDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testProjectDir, { recursive: true, force: true });
  });

  it('writes all four diagram formats with expected structure', async () => {
    const elements: ElementData[] = [
      { type: 'function', name: 'alpha', file: 'src/a.ts', line: 1, calls: ['beta'] },
      { type: 'function', name: 'beta', file: 'src/b.ts', line: 1 },
    ];

    await generateDiagrams(testProjectDir, elements);

    const diagramsDir = join(testProjectDir, '.coderef', 'diagrams');
    const dependenciesMmd = await readFile(join(diagramsDir, 'dependencies.mmd'), 'utf-8');
    const dependenciesDot = await readFile(join(diagramsDir, 'dependencies.dot'), 'utf-8');
    const callsMmd = await readFile(join(diagramsDir, 'calls.mmd'), 'utf-8');
    const importsMmd = await readFile(join(diagramsDir, 'imports.mmd'), 'utf-8');

    // Mermaid file-dependency diagram: one node per file, basename labels.
    expect(dependenciesMmd.startsWith('graph TD')).toBe(true);
    expect(dependenciesMmd).toContain('"a.ts"');
    expect(dependenciesMmd).toContain('"b.ts"');

    // Graphviz DOT variant of the same file graph.
    expect(dependenciesDot.startsWith('digraph Dependencies')).toBe(true);
    expect(dependenciesDot).toContain('label="a.ts"');
    expect(dependenciesDot).toContain('label="b.ts"');

    // Call diagram nodes come from elements that record calls.
    expect(callsMmd.startsWith('graph TD')).toBe(true);
    expect(callsMmd).toContain('"alpha"');

    // Import diagram uses the LR orientation.
    expect(importsMmd.startsWith('graph LR')).toBe(true);
  });
});
