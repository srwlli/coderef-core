/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-emit
 * @exports MAP_DATA_PLACEHOLDER, GenerateMapResult, GenerateMapOptions, viewerAssetDir, embedJson, emitViewer, generateMap
 * @used_by src/cli/coderef-map.ts, src/cli/coderef-mcp-server.ts
 */

/**
 * Map emission — the single write path shared by the coderef-map CLI and the
 * MCP `map` tool (WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 P3/P5, CLI/MCP-parity
 * precedent: both surfaces byte-share one extracted core, never two write
 * paths). Writes ONLY under the caller-provided out dir (default
 * <projectRoot>/.coderef/map/).
 *
 * Analysis code never constructs HTML: emitViewer copies the prebuilt
 * assets/map-viewer/ bundle and substitutes one data placeholder token.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MapData, projectMapData, ProjectMapDataOptions } from './project-map-data.js';
import { extractGitHistory, ExtractGitHistoryOptions } from './git-history.js';

export const MAP_DATA_PLACEHOLDER = '/*__CODEREF_MAP_DATA__*/null';

/**
 * Locate the bundled viewer asset dir. Works from dist (installed package /
 * built clone: dist/src/map -> repo root is ../../..) and from source
 * execution under the test runner (src/map -> repo root is ../..).
 */
export function viewerAssetDir(): string {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'assets', 'map-viewer'),
    path.resolve(__dirname, '..', '..', 'assets', 'map-viewer'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'graph.html'))) return dir;
  }
  throw new Error(
    `Bundled viewer assets not found (looked in: ${candidates.join(', ')}). ` +
    'The coderef package install is incomplete.',
  );
}

/** Escape JSON for safe embedding inside a <script> block. */
export function embedJson(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Copy the viewer bundle into outDir and inline the data into graph.html. */
export function emitViewer(outDir: string, dataJson: string): void {
  const assetDir = viewerAssetDir();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data.json'), dataJson, 'utf-8');
  fs.copyFileSync(path.join(assetDir, 'viewer.js'), path.join(outDir, 'viewer.js'));
  fs.copyFileSync(path.join(assetDir, 'viewer.css'), path.join(outDir, 'viewer.css'));
  const html = fs.readFileSync(path.join(assetDir, 'graph.html'), 'utf-8');
  if (!html.includes(MAP_DATA_PLACEHOLDER)) {
    throw new Error('Bundled graph.html is missing the data placeholder token.');
  }
  fs.writeFileSync(
    path.join(outDir, 'graph.html'),
    html.replace(MAP_DATA_PLACEHOLDER, embedJson(dataJson)),
    'utf-8',
  );
}

export interface GenerateMapResult {
  data: MapData;
  outDir: string;
  dataPath: string;
  htmlPath: string;
  /**
   * Git extraction outcome (present only when git was requested). reason is set
   * when the history could not be extracted (non-git repo, git absent, empty).
   */
  gitReason?: string;
}

/**
 * Options for generateMap: the pure projection options plus the OPT-IN git
 * switch. `git: true` is where the ONE impure step is invoked — generateMap (not
 * the pure projectMapData) runs extractGitHistory and forwards the plain record.
 */
export interface GenerateMapOptions extends ProjectMapDataOptions {
  /** Extract + attach the git-behavioral block (default false — opt-in). */
  git?: boolean;
  /** Extraction window bounds forwarded to git-history.ts. */
  gitExtractOptions?: ExtractGitHistoryOptions;
}

/**
 * Project + emit in one step. Throws MapProjectionError when
 * <projectRoot>/.coderef/graph.json is absent — the CALLER owns the
 * scan-if-absent decision (CLI runs scan+populate; MCP relies on the server's
 * bounded ensureArtifacts).
 *
 * IMPURITY BOUNDARY: when options.git is set, generateMap runs the impure
 * extractGitHistory here and passes the resulting plain GitHistory into the pure
 * projectMapData via options.gitHistory. projectMapData never shells to git.
 */
export function generateMap(
  projectRoot: string,
  outDir?: string,
  options?: GenerateMapOptions,
): GenerateMapResult {
  let gitReason: string | undefined;
  let projectionOptions: ProjectMapDataOptions | undefined = options;
  if (options?.git) {
    const extraction = extractGitHistory(projectRoot, options.gitExtractOptions);
    gitReason = extraction.reason;
    projectionOptions = { ...options, git: true, gitHistory: extraction.history };
  }
  const data = projectMapData(projectRoot, projectionOptions);
  const out = outDir || path.join(projectRoot, '.coderef', 'map');
  emitViewer(out, JSON.stringify(data));
  return {
    data,
    outDir: out,
    dataPath: path.join(out, 'data.json'),
    htmlPath: path.join(out, 'graph.html'),
    ...(gitReason ? { gitReason } : {}),
  };
}
