import * as fs from 'fs/promises';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.join(__dirname, '..', '..');

describe('Phase 5 legacy graph builders (AC-07)', () => {
  it('src/analyzer/graph-builder.ts has @legacy and @deprecated tags in module JSDoc', async () => {
    const file = path.join(REPO_ROOT, 'src', 'analyzer', 'graph-builder.ts');
    const content = await fs.readFile(file, 'utf-8');
    expect(content).toMatch(/@legacy/);
    expect(content).toMatch(/@deprecated/);
    // Pointer at canonical replacement.
    expect(content).toMatch(/src\/pipeline\/graph-builder\.ts/);
  });

  it('src/plugins/plugin-graph.ts has @legacy and @deprecated tags', async () => {
    const file = path.join(REPO_ROOT, 'src', 'plugins', 'plugin-graph.ts');
    const content = await fs.readFile(file, 'utf-8');
    expect(content).toMatch(/@legacy/);
    expect(content).toMatch(/@deprecated/);
  });

  it('src/pipeline/ does NOT import from legacy graph-builder or plugin-graph', async () => {
    // grep equivalent: read every src/pipeline/**/*.ts and assert
    // none contain "from '../analyzer/graph-builder.js'" or
    // "from '../plugins/plugin-graph.js'" patterns.
    const pipelineDir = path.join(REPO_ROOT, 'src', 'pipeline');
    const files: string[] = [];
    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else if (e.name.endsWith('.ts')) files.push(full);
      }
    }
    await walk(pipelineDir);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      // Allow imports of GraphNode/GraphEdge TYPES (legacy types
      // re-exported via graph-exporter.ts). Forbid runtime imports
      // from graph-builder.ts AS A MODULE (not the canonical Phase 5
      // src/pipeline/graph-builder.ts — that's the same name in a
      // different directory).
      const legacyAnalyzerImport = /from\s+['"][^'"]*\/analyzer\/graph-builder(\.js)?['"]/.exec(content);
      if (legacyAnalyzerImport) {
        // Fail with the offending file + match.
        throw new Error(`${file} imports from legacy analyzer/graph-builder: ${legacyAnalyzerImport[0]}`);
      }
      const legacyPluginImport = /from\s+['"][^'"]*\/plugins\/plugin-graph(\.js)?['"]/.exec(content);
      if (legacyPluginImport) {
        throw new Error(`${file} imports from legacy plugins/plugin-graph: ${legacyPluginImport[0]}`);
      }
    }
    // Reaching here means no canonical pipeline file imports legacy.
    expect(files.length).toBeGreaterThan(0);
  });
});
