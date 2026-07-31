/**
 * @coderef-semantic: 1.0.0
 * @layer service
 * @capability map-emit
 * @exports MAP_DATA_PLACEHOLDER, VALIDATION_PLACEHOLDER, GenerateMapResult, GenerateMapOptions, viewerAssetDir, readValidationReport, embedJson, emitViewer, generateMap
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
 * assets/map-viewer/ bundle and substitutes the data placeholder tokens —
 * graph.html (the interactive viewer) and dashboard.html (the analytics +
 * engineering-metrics render) are both prebuilt shells, never generated here.
 */

import * as fs from 'fs';
import * as path from 'path';
import { MapData, projectMapData, ProjectMapDataOptions } from './project-map-data.js';
import { extractGitHistory, ExtractGitHistoryOptions } from './git-history.js';
import { extractSubprocessTestContents } from './subprocess-linkage.js';

export const MAP_DATA_PLACEHOLDER = '/*__CODEREF_MAP_DATA__*/null';
export const VALIDATION_PLACEHOLDER = '/*__CODEREF_VALIDATION__*/null';

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

/**
 * Read <projectRoot>/.coderef/validation-report.json for the dashboard band.
 *
 * Returns the raw JSON text, or null when the report is absent OR unparseable.
 * null is substituted verbatim into the validation placeholder, and the
 * dashboard renders that as an explicit "no data" — NEVER as zero and never as
 * a clean bill of health. An unreadable report must not read as a healthy one.
 */
export function readValidationReport(projectRoot: string): string | null {
  const p = path.join(projectRoot, '.coderef', 'validation-report.json');
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    JSON.parse(raw); // parse-check only; malformed => no-data, not a crash
    return raw;
  } catch {
    return null;
  }
}

/** Escape JSON for safe embedding inside a <script> block. */
export function embedJson(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Copy the viewer bundle into outDir and inline the data into graph.html and
 * dashboard.html.
 *
 * The dashboard is emitted ALWAYS (operator ruling 2026-07-31) — there is no
 * opt-in flag: rendering the map renders the dashboard. It costs a second
 * copy of the inlined bundle, which is the same tradeoff graph.html already
 * makes so the file stays double-clickable from file:// with no server and no
 * CORS. `validationJson` is inlined as a second placeholder; null renders as a
 * disclosed no-data band rather than a clean one.
 */
export function emitViewer(outDir: string, dataJson: string, validationJson?: string | null): void {
  const assetDir = viewerAssetDir();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data.json'), dataJson, 'utf-8');
  fs.copyFileSync(path.join(assetDir, 'viewer.js'), path.join(outDir, 'viewer.js'));
  fs.copyFileSync(path.join(assetDir, 'viewer.css'), path.join(outDir, 'viewer.css'));
  fs.copyFileSync(path.join(assetDir, 'dashboard.js'), path.join(outDir, 'dashboard.js'));
  fs.copyFileSync(path.join(assetDir, 'dashboard.css'), path.join(outDir, 'dashboard.css'));

  const html = fs.readFileSync(path.join(assetDir, 'graph.html'), 'utf-8');
  if (!html.includes(MAP_DATA_PLACEHOLDER)) {
    throw new Error('Bundled graph.html is missing the data placeholder token.');
  }
  fs.writeFileSync(
    path.join(outDir, 'graph.html'),
    html.replace(MAP_DATA_PLACEHOLDER, embedJson(dataJson)),
    'utf-8',
  );

  const dash = fs.readFileSync(path.join(assetDir, 'dashboard.html'), 'utf-8');
  if (!dash.includes(MAP_DATA_PLACEHOLDER)) {
    throw new Error('Bundled dashboard.html is missing the data placeholder token.');
  }
  if (!dash.includes(VALIDATION_PLACEHOLDER)) {
    throw new Error('Bundled dashboard.html is missing the validation placeholder token.');
  }
  fs.writeFileSync(
    path.join(outDir, 'dashboard.html'),
    dash
      .replace(MAP_DATA_PLACEHOLDER, embedJson(dataJson))
      .replace(VALIDATION_PLACEHOLDER, validationJson ? embedJson(validationJson) : 'null'),
    'utf-8',
  );
}

export interface GenerateMapResult {
  data: MapData;
  outDir: string;
  dataPath: string;
  htmlPath: string;
  /** Always emitted alongside htmlPath — the dashboard render is not opt-in. */
  dashboardPath: string;
  /**
   * Git extraction outcome (present only when git was requested). reason is set
   * when the history could not be extracted (non-git repo, git absent, empty).
   */
  gitReason?: string;
  /**
   * Subprocess-linkage extraction outcome (present only when the extractor ran
   * and DEGRADED — index.json absent/unreadable). Absent on success.
   */
  subprocessReason?: string;
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
  /**
   * Run the subprocess test-linkage extractor (default true — the ONE impure
   * read of test-file contents, mirrored on the git-history pattern; see
   * src/map/subprocess-linkage.ts). Feeds the pure projection via
   * options.subprocessTestContents; degraded extraction => block absent +
   * subprocessReason. Set false to skip. No-op when metrics === false.
   */
  subprocessLinkage?: boolean;
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
  let subprocessReason: string | undefined;
  let projectionOptions: ProjectMapDataOptions | undefined = options;
  if (options?.git) {
    const extraction = extractGitHistory(projectRoot, options.gitExtractOptions);
    gitReason = extraction.reason;
    projectionOptions = { ...options, git: true, gitHistory: extraction.history };
  }
  if (options?.subprocessLinkage !== false && options?.metrics !== false) {
    const subprocess = extractSubprocessTestContents(projectRoot);
    subprocessReason = subprocess.reason;
    projectionOptions = { ...(projectionOptions ?? {}), subprocessTestContents: subprocess.contents };
  }
  const data = projectMapData(projectRoot, projectionOptions);
  const out = outDir || path.join(projectRoot, '.coderef', 'map');
  emitViewer(out, JSON.stringify(data), readValidationReport(projectRoot));
  return {
    data,
    outDir: out,
    dataPath: path.join(out, 'data.json'),
    htmlPath: path.join(out, 'graph.html'),
    dashboardPath: path.join(out, 'dashboard.html'),
    ...(gitReason ? { gitReason } : {}),
    ...(subprocessReason ? { subprocessReason } : {}),
  };
}
