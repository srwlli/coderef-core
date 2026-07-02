/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-graph-edge-id-uniqueness-test
 */

/**
 * WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3: edge ids must be UNIQUE in
 * the emitted graph. computeEdgeId hashes the semantic tuple, but before the
 * buildEdges dedupe the emission passes could push the same tuple more than
 * once — the live self-scan artifact carried 948 duplicate-id entries. The
 * fixture below intentionally provokes duplicate emission pressure: the same
 * symbol is imported and re-imported and the same callee is called from a
 * file whose imports appear in BOTH the AST facts and a semantic header
 * (@imports), the AST/header pair being the known double-emission source.
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ExportedGraph } from '../../src/export/graph-exporter.js';
import { PipelineOrchestrator } from '../../src/pipeline/orchestrator.js';

const createdProjects: string[] = [];

async function createProject(files: Record<string, string>): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'coderef-edge-id-uniq-'));
  createdProjects.push(projectDir);

  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const filePath = path.join(projectDir, relativePath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    }),
  );

  return projectDir;
}

async function runGraph(projectDir: string): Promise<ExportedGraph> {
  const state = await new PipelineOrchestrator().run(projectDir, {
    outputDir: path.join(projectDir, '.coderef'),
    languages: ['ts'],
    mode: 'minimal',
  });

  return state.graph;
}

afterEach(async () => {
  await Promise.all(
    createdProjects.splice(0).map(dir =>
      fs.rm(dir, { recursive: true, force: true }),
    ),
  );
});

describe('graph edge id uniqueness', () => {
  it('emits every edge id at most once', async () => {
    const projectDir = await createProject({
      'src/target.ts': [
        'export function omega(): number {',
        '  return 1;',
        '}',
        'export const OMEGA_LIMIT = 10;',
        '',
      ].join('\n'),
      'src/caller.ts': [
        '/**',
        ' * @coderef-semantic: 1.0.0',
        ' * @layer service',
        ' * @capability edge-id-uniqueness-fixture',
        ' * @exports alpha',
        " * @imports target:omega, target:OMEGA_LIMIT",
        ' */',
        "import { omega, OMEGA_LIMIT } from './target.js';",
        '',
        'export function alpha(): number {',
        '  const first = omega();',
        '  const second = omega();',
        '  return first + second + OMEGA_LIMIT;',
        '}',
        '',
      ].join('\n'),
    });

    const graph = await runGraph(projectDir);

    expect(graph.edges.length).toBeGreaterThan(0);
    const ids = graph.edges.map(edge => edge.id);
    const unique = new Set(ids);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates, `duplicate edge ids: ${[...new Set(duplicates)].join(', ')}`).toHaveLength(0);
    expect(unique.size).toBe(ids.length);
  });
});
