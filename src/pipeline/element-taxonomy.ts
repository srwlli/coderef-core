/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability element-taxonomy-layer-enum
 * @exports LayerEnum, HeaderStatus, HEADER_STATUSES, DEFAULT_HEADER_STATUS, resolveLayersPath, loadLayerEnum, isValidLayer, isKebabCase
 * @used_by src/adapter/graph-to-elements.ts, src/cli/populate.ts, src/pipeline/extractors/element-extractor.ts, src/pipeline/extractors/relationship-extractor.ts, src/pipeline/header-fact.ts, src/pipeline/orchestrator.ts, src/pipeline/output-validator.ts, src/pipeline/semantic-elements.ts, src/pipeline/semantic-header-parser.ts, src/pipeline/types.ts, src/plugins/plugin-scanner.ts, src/scanner/scanner.ts, src/scanner/tree-sitter-scanner.ts, src/semantic/projections.ts, src/types/types.ts, __tests__/pipeline/element-taxonomy.test.ts, __tests__/pipeline/header-layer-runtime-validation.test.ts, __tests__/pipeline/output-validation-determinism.test.ts, __tests__/pipeline/output-validation-semantic-headers.test.ts
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

const LAYERS_SUFFIX = path.join('ASSISTANT', 'STANDARDS', 'layers.json');

/**
 * Walk upward from `startDir`, returning the first ancestor that contains a
 * sibling `ASSISTANT/STANDARDS/layers.json`. Returns undefined if none exists
 * before reaching the filesystem root.
 */
function findLayersFromAncestors(startDir: string): string | undefined {
  let dir = path.resolve(startDir);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, LAYERS_SUFFIX);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined; // reached filesystem root
    }
    dir = parent;
  }
}

/**
 * Resolve the canonical layers.json path independently of process.cwd().
 *
 * Historically this returned `path.resolve(process.cwd(), '..', 'ASSISTANT',
 * 'STANDARDS', 'layers.json')`, which only worked when the CLI was launched
 * from the coderef-core repo root. Running populate-coderef from a nested
 * subdirectory (e.g. `services/primary-sources-api/`) made `cwd/..` point at
 * the wrong directory, so the file was never found and populate aborted with
 * ENOENT before writing any index (STUB-W8S124).
 *
 * Resolution order (first hit wins):
 *   1. CODEREF_LAYERS_PATH env  — explicit file path override.
 *   2. CODEREF_ASSISTANT_ROOT env — points at the ASSISTANT root.
 *   3. Install-dir anchor — walk up from this module's own location to find a
 *      sibling ASSISTANT/STANDARDS/layers.json. Fully cwd-independent.
 *   4. cwd anchor — walk up from process.cwd() (preserves the original
 *      monorepo-sibling behavior, but robust to arbitrary nesting depth).
 *
 * If nothing exists on disk, the install-relative path is returned as a stable
 * fallback so the eventual ENOENT names a sensible location.
 */
export function resolveLayersPath(): string {
  if (process.env.CODEREF_LAYERS_PATH) {
    return process.env.CODEREF_LAYERS_PATH;
  }

  if (process.env.CODEREF_ASSISTANT_ROOT) {
    return path.resolve(
      process.env.CODEREF_ASSISTANT_ROOT,
      'STANDARDS',
      'layers.json',
    );
  }

  // __dirname is the install location of this module (e.g.
  // <repo>/dist/src/pipeline). Walk up to find the ASSISTANT sibling. This is
  // independent of where the CLI was invoked from.
  const fromInstall = findLayersFromAncestors(__dirname);
  if (fromInstall) {
    return fromInstall;
  }

  // Fall back to walking up from the working directory, which covers cases
  // where the module lives outside the monorepo (e.g. a global npm install)
  // but the layers file is reachable above cwd.
  const fromCwd = findLayersFromAncestors(process.cwd());
  if (fromCwd) {
    return fromCwd;
  }

  // Nothing on disk. Return a deterministic install-relative path so the
  // downstream ENOENT points at a meaningful location rather than a
  // cwd-derived one that shifts per invocation.
  return path.resolve(__dirname, '..', '..', '..', '..', LAYERS_SUFFIX);
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

