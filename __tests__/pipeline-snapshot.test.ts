import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineOrchestrator } from '../src/pipeline/orchestrator.js';
import { CoverageGenerator } from '../src/pipeline/generators/coverage-generator.js';
import { DiagramGenerator } from '../src/pipeline/generators/diagram-generator.js';
import { ExportGenerator } from '../src/pipeline/generators/export-generator.js';
import { GraphGenerator } from '../src/pipeline/generators/graph-generator.js';
import { IndexGenerator } from '../src/pipeline/generators/index-generator.js';
import { PatternGenerator } from '../src/pipeline/generators/pattern-generator.js';
import { ValidationGenerator } from '../src/pipeline/generators/validation-generator.js';
import { ContextGenerator } from '../src/pipeline/generators/context-generator.js';
import { ComplexityGenerator } from '../src/pipeline/generators/complexity-generator.js';
import { DriftGenerator } from '../src/pipeline/generators/drift-generator.js';
import { cleanupEnvironment, createMockEnvironment, readJson } from './generators/helpers.js';

describe('pipeline snapshot compatibility', () => {
  const created: string[] = [];

  afterEach(async () => {
    await Promise.all(created.splice(0).map(dir => cleanupEnvironment(dir)));
  });

  it('runs the orchestrator and all Phase 3 generators on a fixture project', async () => {
    const env = await createMockEnvironment();
    created.push(env.projectDir);

    const orchestrator = new PipelineOrchestrator();
    const state = await orchestrator.run(env.projectDir, {
      languages: ['ts'],
      verbose: false,
    });

    const generators = [
      new IndexGenerator(),
      new GraphGenerator(),
      new ComplexityGenerator(),
      new PatternGenerator(),
      new CoverageGenerator(),
      new DriftGenerator(),
      new ValidationGenerator(),
      new DiagramGenerator(),
      new ExportGenerator(),
      new ContextGenerator(),
    ];

    for (const generator of generators) {
      await generator.generate(state, env.outputDir);
    }

    const indexOutput = await readJson<any>(path.join(env.outputDir, 'index.json'));
    const graphOutput = await readJson<any>(path.join(env.outputDir, 'graph.json'));
    const contextOutput = await readJson<any>(path.join(env.outputDir, 'context.json'));
    const coverageOutput = await readJson<any>(path.join(env.outputDir, 'reports', 'coverage.json'));

    const indexElements = Array.isArray(indexOutput) ? indexOutput : indexOutput.elements;
    expect(indexElements.length).toBeGreaterThanOrEqual(2);
    expect(graphOutput.nodes.length).toBeGreaterThanOrEqual(2);
    expect(contextOutput.stats.totalElements).toBeGreaterThanOrEqual(2);
    expect(coverageOutput.summary.totalFiles).toBeGreaterThanOrEqual(2);
  });
});
