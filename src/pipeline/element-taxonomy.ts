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

