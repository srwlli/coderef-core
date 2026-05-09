/**
 * @semantic
 * exports: [LayerEnum, HeaderStatus, DEFAULT_HEADER_STATUS, resolveLayersPath, loadLayerEnum, isValidLayer, isKebabCase]
 * used_by: [src/adapter/graph-to-elements.ts, src/cli/populate.ts, src/pipeline/extractors/element-extractor.ts, src/pipeline/extractors/relationship-extractor.ts, src/pipeline/header-fact.ts, src/pipeline/orchestrator.ts, src/pipeline/output-validator.ts, src/pipeline/semantic-elements.ts, src/pipeline/semantic-header-parser.ts, src/pipeline/types.ts, src/plugins/plugin-scanner.ts, src/scanner/scanner.ts, src/scanner/tree-sitter-scanner.ts, src/semantic/projections.ts, src/types/types.ts, __tests__/pipeline/element-taxonomy.test.ts, __tests__/pipeline/header-layer-runtime-validation.test.ts, __tests__/pipeline/output-validation-determinism.test.ts, __tests__/pipeline/output-validation-semantic-headers.test.ts]
 */

import * as fs from 'fs';
import * as path from 'path';

export type LayerEnum = string;
export type HeaderStatus = 'defined' | 'stale' | 'missing' | 'partial';

export const HEADER_STATUSES: readonly HeaderStatus[] = ['defined', 'stale', 'missing', 'partial'];
export const DEFAULT_HEADER_STATUS: HeaderStatus = 'missing';

interface LayersFile {
  layers?: Array<{ id?: unknown }>;
}

let cachedLayers: readonly LayerEnum[] | undefined;

export function resolveLayersPath(): string {
  if (process.env.CODEREF_LAYERS_PATH) {
    return process.env.CODEREF_LAYERS_PATH;
  }

  return path.resolve(
    process.cwd(),
    '..',
    'ASSISTANT',
    'STANDARDS',
    'layers.json',
  );
}

export function loadLayerEnum(layersPath = resolveLayersPath()): readonly LayerEnum[] {
  if (cachedLayers && layersPath === resolveLayersPath()) {
    return cachedLayers;
  }

  const parsed = JSON.parse(fs.readFileSync(layersPath, 'utf-8')) as LayersFile;
  const layers = (parsed.layers || [])
    .map(layer => layer.id)
    .filter((id): id is string => typeof id === 'string');

  if (layers.length === 0) {
    throw new Error(`No layers found in ${layersPath}`);
  }

  if (layersPath === resolveLayersPath()) {
    cachedLayers = layers;
  }

  return layers;
}

export function isValidLayer(value: unknown, layersPath?: string): value is LayerEnum {
  return typeof value === 'string' && loadLayerEnum(layersPath).includes(value);
}

export function isKebabCase(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
}

