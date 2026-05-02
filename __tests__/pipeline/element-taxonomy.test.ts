import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { isKebabCase, isValidLayer, loadLayerEnum } from '../../src/pipeline/element-taxonomy.js';

const standardsLayersPath = path.resolve(
  process.cwd(),
  '..',
  'ASSISTANT',
  'STANDARDS',
  'layers.json',
);

const semanticSkillPath = path.resolve(
  process.cwd(),
  '..',
  'ASSISTANT',
  'SKILLS',
  'ANALYSIS',
  'analyze-coderef-semantics',
  'SKILL.md',
);

function loadBnfLayers(): string[] {
  const content = fs.readFileSync(semanticSkillPath, 'utf-8');
  const match = content.match(/layer_value\s+::=\s+([\s\S]*?)\ncapability_field/);
  if (!match) {
    throw new Error('Could not find layer_value BNF in analyze-coderef-semantics skill');
  }

  return Array.from(match[1].matchAll(/"([^"]+)"/g), item => item[1]);
}

describe('element taxonomy', () => {
  it('loads the canonical layer enum from STANDARDS/layers.json', () => {
    const layers = loadLayerEnum(standardsLayersPath);

    expect(layers).toHaveLength(13);
    expect(layers).toEqual([
      'ui_component',
      'service',
      'utility',
      'data_access',
      'api',
      'integration',
      'domain',
      'validation',
      'parser',
      'formatter',
      'cli',
      'configuration',
      'test_support',
    ]);
  });

  it('validates canonical layers and rejects unknown values', () => {
    for (const layer of loadLayerEnum(standardsLayersPath)) {
      expect(isValidLayer(layer, standardsLayersPath)).toBe(true);
    }

    expect(isValidLayer('unknown_layer', standardsLayersPath)).toBe(false);
  });

  it('validates kebab-case capability and constraint names', () => {
    expect(isKebabCase('pipeline-orchestration')).toBe(true);
    expect(isKebabCase('pipelineOrchestration')).toBe(false);
    expect(isKebabCase('Pipeline-Orchestration')).toBe(false);
    expect(isKebabCase('')).toBe(false);
  });

  it('matches the canonical header grammar BNF layer enum', () => {
    expect(new Set(loadLayerEnum(standardsLayersPath))).toEqual(new Set(loadBnfLayers()));
  });
});

