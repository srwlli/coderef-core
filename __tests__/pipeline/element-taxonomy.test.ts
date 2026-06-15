/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability pipeline-element-taxonomy-test
 */

import * as fs from 'fs';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { isKebabCase, isValidLayer, loadLayerEnum, resolveLayersPath } from '../../src/pipeline/element-taxonomy.js';

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

  describe('resolveLayersPath cwd-independence (STUB-W8S124)', () => {
    const originalCwd = process.cwd();
    const originalLayersEnv = process.env.CODEREF_LAYERS_PATH;
    const originalAssistantRootEnv = process.env.CODEREF_ASSISTANT_ROOT;

    afterEach(() => {
      process.chdir(originalCwd);
      if (originalLayersEnv === undefined) {
        delete process.env.CODEREF_LAYERS_PATH;
      } else {
        process.env.CODEREF_LAYERS_PATH = originalLayersEnv;
      }
      if (originalAssistantRootEnv === undefined) {
        delete process.env.CODEREF_ASSISTANT_ROOT;
      } else {
        process.env.CODEREF_ASSISTANT_ROOT = originalAssistantRootEnv;
      }
    });

    it('honors CODEREF_LAYERS_PATH override', () => {
      process.env.CODEREF_LAYERS_PATH = standardsLayersPath;
      expect(resolveLayersPath()).toBe(standardsLayersPath);
    });

    it('honors CODEREF_ASSISTANT_ROOT override', () => {
      delete process.env.CODEREF_LAYERS_PATH;
      process.env.CODEREF_ASSISTANT_ROOT = path.resolve(process.cwd(), '..', 'ASSISTANT');
      expect(resolveLayersPath()).toBe(standardsLayersPath);
    });

    it('resolves an existing layers.json from a nested subdirectory (no env)', () => {
      delete process.env.CODEREF_LAYERS_PATH;
      delete process.env.CODEREF_ASSISTANT_ROOT;

      // Simulate running populate-coderef from deep inside the repo. The old
      // cwd/.. fallback produced <nested>/../ASSISTANT/... (ENOENT); the
      // install-dir anchor must still locate the real layers.json.
      const nested = path.resolve(originalCwd, '__tests__', 'pipeline');
      process.chdir(nested);

      const resolved = resolveLayersPath();
      expect(fs.existsSync(resolved)).toBe(true);
      expect(loadLayerEnum(resolved)).toHaveLength(13);
    });
  });
});

