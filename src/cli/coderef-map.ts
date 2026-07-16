#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-coderef-map
 */

/**
 * coderef-map — one command from any repo to an interactive dependency map.
 *
 * WO-GRAPHIFY-ALIGNMENT-PROJECTIONS-001 Phase 3. Operator rulings (2026-07-16):
 * BOTH delivery modes ship in v1 — static graph.html (default, double-click
 * from file:) and --serve (local HTTP server, for big repos); the map serves
 * agents and users alike (same data.json backs the MCP `map` tool).
 *
 * Flow:
 *   1. scan-if-absent: when <path>/.coderef/graph.json is missing (or
 *      --force-scan), run the sibling scan + populate bins — the same legs
 *      coderef-pipeline chains; no scanner logic is forked here.
 *   2. project graph.json + index.json to file-level map data
 *      (src/map/project-map-data.ts) and write .coderef/map/data.json.
 *   3. emit the bundled viewer (assets/map-viewer/): copy viewer.js +
 *      viewer.css, substitute the data placeholder in graph.html. This
 *      command only writes data and copies assets — analysis code never
 *      constructs HTML.
 *   4. open the browser (static) or serve .coderef/map/ over localhost
 *      (--serve), unless --no-open.
 */

import { spawnSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { projectMapData, MapProjectionError } from '../map/project-map-data.js';

interface CliArgs {
  projectDir: string;
  serve: boolean;
  port: number;
  open: boolean;
  forceScan: boolean;
  outDir?: string;
}

function printHelp(): void {
  console.log(`coderef-map - interactive dependency map of any repository

USAGE:
  coderef-map <path> [OPTIONS]
  coderef-map --project-dir <path> [OPTIONS]

OPTIONS:
  --project-dir <path>  Target project root (or first positional arg;
                        default: current directory).
  --serve               Serve the map over a local HTTP server instead of
                        relying on the static file. Recommended for big repos.
  --port <N>            Port for --serve (default: 8123; 0 = auto-assign).
  --no-open             Do not open the browser.
  --force-scan          Re-run scan + populate even if .coderef/ exists.
  --out <dir>           Output directory (default: <path>/.coderef/map).
  -h, --help            Show this help.

OUTPUT:
  <out>/data.json    file-level map data (also consumed by the MCP 'map' tool)
  <out>/graph.html   static viewer with the data inlined (double-clickable)
  <out>/viewer.js|css  viewer runtime assets

SCAN-IF-ABSENT:
  When <path>/.coderef/graph.json is missing, coderef-map runs the scan and
  populate legs first (same bins coderef-pipeline chains). Repos without
  semantic headers degrade gracefully: the map renders from the dependency
  graph alone.`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectDir: process.cwd(),
    serve: false,
    port: 8123,
    open: true,
    forceScan: false,
  };
  let positionalSeen = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
      case '--project-dir':
        args.projectDir = path.resolve(argv[++i]);
        positionalSeen = true;
        break;
      case '--serve':
        args.serve = true;
        break;
      case '--port':
        args.port = parseInt(argv[++i], 10);
        break;
      case '--no-open':
        args.open = false;
        break;
      case '--force-scan':
        args.forceScan = true;
        break;
      case '--out':
        args.outDir = path.resolve(argv[++i]);
        break;
      default:
        if (a.startsWith('--project-dir=')) {
          args.projectDir = path.resolve(a.slice('--project-dir='.length));
          positionalSeen = true;
        } else if (a.startsWith('--port=')) {
          args.port = parseInt(a.slice('--port='.length), 10);
        } else if (a.startsWith('--out=')) {
          args.outDir = path.resolve(a.slice('--out='.length));
        } else if (!a.startsWith('-') && !positionalSeen) {
          args.projectDir = path.resolve(a);
          positionalSeen = true;
        } else {
          console.error(`Unknown argument: ${a}`);
          printHelp();
          process.exit(2);
        }
    }
  }
  if (Number.isNaN(args.port) || args.port < 0 || args.port > 65535) {
    console.error('Invalid --port value.');
    process.exit(2);
  }
  return args;
}

/** Sibling dist bin (same convention as coderef-pipeline's coderefBin). */
function coderefBin(name: string): string {
  return path.resolve(__dirname, `${name}.js`);
}

/**
 * Locate the bundled viewer asset dir. Works from dist (installed package /
 * built clone: dist/src/cli -> repo root is ../../..) and from source
 * execution under the test runner (src/cli -> repo root is ../..).
 */
function viewerAssetDir(): string {
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

function runLeg(name: string, binArgs: string[]): void {
  const bin = coderefBin(name);
  if (!fs.existsSync(bin)) {
    console.error(`[coderef-map] cannot run ${name}: ${bin} not found (build the CLI first).`);
    process.exit(1);
  }
  console.log(`[coderef-map] running ${name}...`);
  const r = spawnSync(process.execPath, [bin, ...binArgs], { stdio: 'inherit' });
  if ((r.status ?? 1) !== 0) {
    console.error(`[coderef-map] ${name} failed (exit=${r.status}).`);
    process.exit(1);
  }
}

/** Escape JSON for safe embedding inside a <script> block. */
function embedJson(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const PLACEHOLDER = '/*__CODEREF_MAP_DATA__*/null';

function emitViewer(outDir: string, dataJson: string): void {
  const assetDir = viewerAssetDir();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data.json'), dataJson, 'utf-8');
  fs.copyFileSync(path.join(assetDir, 'viewer.js'), path.join(outDir, 'viewer.js'));
  fs.copyFileSync(path.join(assetDir, 'viewer.css'), path.join(outDir, 'viewer.css'));
  const html = fs.readFileSync(path.join(assetDir, 'graph.html'), 'utf-8');
  if (!html.includes(PLACEHOLDER)) {
    throw new Error('Bundled graph.html is missing the data placeholder token.');
  }
  fs.writeFileSync(
    path.join(outDir, 'graph.html'),
    html.replace(PLACEHOLDER, embedJson(dataJson)),
    'utf-8',
  );
}

function openInBrowser(target: string): void {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', target], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [target], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [target], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (err: any) {
    console.error(`[coderef-map] could not open browser (${err.message}); open manually: ${target}`);
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveMap(outDir: string, port: number, open: boolean): void {
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    let rel = urlPath === '/' ? 'graph.html' : urlPath.replace(/^\/+/, '');
    const file = path.resolve(outDir, rel);
    // path-traversal guard: stay inside outDir
    if (!file.startsWith(path.resolve(outDir) + path.sep) && file !== path.resolve(outDir)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(file, (err, buf) => {
      if (err) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  server.listen(port, '127.0.0.1', () => {
    const addr = server.address();
    const actualPort = typeof addr === 'object' && addr ? addr.port : port;
    const url = `http://localhost:${actualPort}/graph.html`;
    console.log(`[coderef-map] serving ${url}`);
    console.log('[coderef-map] press Ctrl+C to stop.');
    if (open) openInBrowser(url);
  });
  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = args.projectDir;
  if (!fs.existsSync(projectDir)) {
    console.error(`[coderef-map] project path not found: ${projectDir}`);
    process.exit(2);
  }

  const graphPath = path.join(projectDir, '.coderef', 'graph.json');
  if (args.forceScan || !fs.existsSync(graphPath)) {
    console.log(
      args.forceScan
        ? '[coderef-map] --force-scan: regenerating .coderef artifacts...'
        : '[coderef-map] .coderef/graph.json absent — scanning first (one-time)...',
    );
    runLeg('scan', [projectDir]);
    runLeg('populate', [projectDir]);
  }

  let data;
  try {
    data = projectMapData(projectDir);
  } catch (err: any) {
    if (err instanceof MapProjectionError) {
      console.error(`[coderef-map] ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const outDir = args.outDir || path.join(projectDir, '.coderef', 'map');
  const dataJson = JSON.stringify(data);
  emitViewer(outDir, dataJson);

  console.log(`[coderef-map] ${data.meta.repoName}: ${data.nodes.length} files, ${data.edges.length} edges, ` +
    `${data.overlays.hotspots.length} hotspots, ${data.overlays.cycles.length} cycles`);
  for (const w of data.meta.warnings) console.log(`[coderef-map] note: ${w}`);
  console.log(`[coderef-map] map written to ${outDir}`);

  if (args.serve) {
    serveMap(outDir, args.port, args.open);
    return; // keep process alive for the server
  }

  const htmlPath = path.join(outDir, 'graph.html');
  console.log(`[coderef-map] open ${htmlPath}`);
  if (args.open) openInBrowser(htmlPath);
}

main();
