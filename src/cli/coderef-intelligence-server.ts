#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @capability: intelligence-data-api
 * @layer: cli
 * @exports: main
 *
 * coderef-intelligence-server - Read-only HTTP API over .coderef/ artifacts.
 *
 * WO-CODEREF-INTELLIGENCE-DATA-API-001.
 *
 * Exposes index.json, graph.json, and complexity data in normalized formats
 * for the dashboard Intelligence tab. Runs on :52850 (CODEREF_INTELLIGENCE_HTTP_PORT).
 *
 * Endpoints:
 *   GET /api/health                   - liveness + uptime
 *   GET /readyz                       - readiness probe
 *   GET /api/intelligence/summary     - type distribution, header coverage, complexity histogram
 *   GET /api/intelligence/elements    - paginated element list (?offset=0&limit=100&type=&headerStatus=)
 *   GET /api/intelligence/edges       - edge list from graph.json
 *   GET /api/intelligence/hotspots    - top 20 nodes by in-degree
 *   GET /api/intelligence/coverage-gaps - high-complexity elements with missing/stale headers
 *
 * All responses include CORS headers (Access-Control-Allow-Origin: *).
 * Read-only — does not modify any .coderef/ artifacts.
 */

import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';

// ---- constants ---------------------------------------------------------------

const INTELLIGENCE_API_VERSION = 1;
const SERVER_VERSION = '1.0.0';
const DEFAULT_PORT = Number(process.env.CODEREF_INTELLIGENCE_HTTP_PORT) || 52850;
const SERVER_STARTED_AT = Date.now();

// ---- data cache types --------------------------------------------------------

interface IndexElement {
  type: string;
  name: string;
  file: string;
  line: number;
  exported: boolean;
  async?: boolean;
  headerStatus?: string;
  uuid?: string;
  codeRefId?: string;
  headerFact?: Record<string, unknown>;
  [key: string]: unknown;
}

interface IndexData {
  schemaVersion: string;
  generatedAt: string;
  totalElements: number;
  elementsByType: Record<string, number>;
  elements: IndexElement[];
}

interface GraphNode {
  id: string;
  type: string;
  name: string;
  file: string;
  elementType?: string;
  uuid?: string;
  metadata?: Record<string, unknown>;
}

interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  type?: string;
  relationship?: string;
}

interface GraphData {
  version?: string;
  exportedAt?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  statistics?: Record<string, unknown>;
}

interface ComplexityEntry {
  element: string;
  file: string;
  type: string;
  complexity: number;
  loc: number;
  parameters?: number;
}

interface ComplexityData {
  totalElements: number;
  averageComplexity: number;
  averageLOC: number;
  highComplexityCount: number;
  elements: ComplexityEntry[];
}

// ---- in-memory cache ---------------------------------------------------------

interface Cache {
  index: IndexData | null;
  graph: GraphData | null;
  complexity: ComplexityData | null;
  loadedAt: number;
  projectDir: string;
}

const cache: Cache = {
  index: null,
  graph: null,
  complexity: null,
  loadedAt: 0,
  projectDir: '',
};

function loadArtifacts(projectDir: string): void {
  cache.projectDir = projectDir;
  const indexPath = path.join(projectDir, '.coderef', 'index.json');
  const graphPath = path.join(projectDir, '.coderef', 'graph.json');
  const complexityPath = path.join(projectDir, '.coderef', 'reports', 'complexity', 'summary.json');

  try {
    cache.index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as IndexData;
  } catch (e) {
    console.warn('[intelligence-server] index.json not found or invalid:', String(e));
    cache.index = { schemaVersion: 'unknown', generatedAt: '', totalElements: 0, elementsByType: {}, elements: [] };
  }

  try {
    cache.graph = JSON.parse(fs.readFileSync(graphPath, 'utf8')) as GraphData;
  } catch (e) {
    console.warn('[intelligence-server] graph.json not found or invalid:', String(e));
    cache.graph = { nodes: [], edges: [] };
  }

  try {
    cache.complexity = JSON.parse(fs.readFileSync(complexityPath, 'utf8')) as ComplexityData;
  } catch (e) {
    console.warn('[intelligence-server] complexity/summary.json not found or invalid:', String(e));
    cache.complexity = { totalElements: 0, averageComplexity: 0, averageLOC: 0, highComplexityCount: 0, elements: [] };
  }

  cache.loadedAt = Date.now();
  const elCount = cache.index.elements.length;
  const nodeCount = cache.graph.nodes.length;
  const edgeCount = cache.graph.edges.length;
  console.log(`[intelligence-server] Loaded: ${elCount} elements, ${nodeCount} nodes, ${edgeCount} edges`);
}

// ---- CLI args ----------------------------------------------------------------

interface CliArgs { port: number; projectDir: string; help: boolean; }

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { port: DEFAULT_PORT, projectDir: process.cwd(), help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    let key = a;
    let inline: string | undefined;
    if (a.startsWith('--') && a.includes('=')) {
      const idx = a.indexOf('=');
      key = a.slice(0, idx);
      inline = a.slice(idx + 1);
    }
    const next = (): string => inline ?? argv[++i];
    switch (key) {
      case '-h':
      case '--help':       args.help = true; break;
      case '--port':
      case '-p':           args.port = Math.max(1, parseInt(next(), 10)); break;
      case '--project-dir':
      case '--dir':        args.projectDir = next(); break;
      default: break;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`coderef-intelligence-server - read-only intelligence data API (v${SERVER_VERSION})

USAGE:
  coderef-intelligence-server [--port <n>] [--dir <path>]

OPTIONS:
  -p, --port <n>     TCP port (default: ${DEFAULT_PORT}; env: CODEREF_INTELLIGENCE_HTTP_PORT).
  --dir <path>       Project directory containing .coderef/ (default: cwd).
  -h, --help         Show this help.

ENDPOINTS:
  GET /api/health                   - liveness + uptime
  GET /readyz                       - readiness probe
  GET /api/intelligence/summary     - type distribution, header coverage %, complexity histogram
  GET /api/intelligence/elements    - paginated elements (?offset=0&limit=100&type=&headerStatus=)
  GET /api/intelligence/edges       - full edge list from graph.json
  GET /api/intelligence/hotspots    - top 20 by in-degree (call graph)
  GET /api/intelligence/coverage-gaps - high-complexity elements missing headers, sorted by complexity

ENVIRONMENT:
  CODEREF_INTELLIGENCE_HTTP_PORT    Override default port.
`);
}

// ---- shared helpers ----------------------------------------------------------

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function send(res: http.ServerResponse, code: number, body: unknown): void {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Coderef-Intelligence-API': String(INTELLIGENCE_API_VERSION),
    ...corsHeaders(),
  });
  res.end(data + '\n');
}

function parseQueryParams(rawUrl: string): Record<string, string> {
  const parsed = url.parse(rawUrl, true);
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed.query)) {
    if (typeof v === 'string') params[k] = v;
    else if (Array.isArray(v) && v.length > 0) params[k] = v[0] ?? '';
  }
  return params;
}

// ---- handlers ----------------------------------------------------------------

function handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): void {
  send(res, 200, {
    status: 'healthy',
    version: SERVER_VERSION,
    api_version: INTELLIGENCE_API_VERSION,
    uptime_s: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
    pid: process.pid,
    started_at: new Date(SERVER_STARTED_AT).toISOString(),
    cache: {
      loaded_at: cache.loadedAt > 0 ? new Date(cache.loadedAt).toISOString() : null,
      elements: cache.index?.elements.length ?? 0,
      nodes: cache.graph?.nodes.length ?? 0,
      edges: cache.graph?.edges.length ?? 0,
    },
  });
}

function handleReadyz(_req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders() });
  res.end('OK');
}

function handleSummary(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const elements = cache.index?.elements ?? [];
  const total = elements.length;

  // Type distribution (elementType distribution)
  const typeDistribution: Record<string, number> = {};
  elements.forEach(e => {
    const t = e.type || 'unknown';
    typeDistribution[t] = (typeDistribution[t] || 0) + 1;
  });

  // Header coverage (defined = has semantic header)
  const headerStatusDist: Record<string, number> = {};
  elements.forEach(e => {
    const s = e.headerStatus || 'missing';
    headerStatusDist[s] = (headerStatusDist[s] || 0) + 1;
  });
  const definedCount = headerStatusDist['defined'] || 0;
  const coveragePct = total > 0 ? Math.round((definedCount / total) * 1000) / 10 : 0;

  // Complexity histogram (from complexity/summary.json)
  const complexElements = cache.complexity?.elements ?? [];
  const complexityHistogram = { '0-10': 0, '11-20': 0, '21-30': 0, '31+': 0 };
  complexElements.forEach(e => {
    if (e.complexity <= 10) complexityHistogram['0-10']++;
    else if (e.complexity <= 20) complexityHistogram['11-20']++;
    else if (e.complexity <= 30) complexityHistogram['21-30']++;
    else complexityHistogram['31+']++;
  });

  send(res, 200, {
    total_elements: total,
    type_distribution: typeDistribution,
    header_coverage: {
      pct: coveragePct,
      defined: definedCount,
      total,
      by_status: headerStatusDist,
    },
    complexity_histogram: complexityHistogram,
    complexity_summary: {
      total_analyzed: cache.complexity?.totalElements ?? 0,
      average: cache.complexity?.averageComplexity ?? 0,
      high_count: cache.complexity?.highComplexityCount ?? 0,
    },
    cache_generated_at: cache.index?.generatedAt ?? null,
    served_at: isoNow(),
  });
}

function handleElements(req: http.IncomingMessage, res: http.ServerResponse): void {
  const params = parseQueryParams(req.url ?? '');
  const offset = Math.max(0, parseInt(params.offset ?? '0', 10));
  const limit = Math.min(500, Math.max(1, parseInt(params.limit ?? '100', 10)));
  const filterType = params.type ?? params.elementType ?? '';
  const filterHeaderStatus = params.headerStatus ?? '';
  const filterFile = params.file ?? '';

  let elements = cache.index?.elements ?? [];

  if (filterType) elements = elements.filter(e => e.type === filterType);
  if (filterHeaderStatus) elements = elements.filter(e => (e.headerStatus || 'missing') === filterHeaderStatus);
  if (filterFile) elements = elements.filter(e => e.file?.includes(filterFile));

  const total = elements.length;
  const page = elements.slice(offset, offset + limit);

  send(res, 200, {
    total,
    offset,
    limit,
    items: page.map(e => ({
      id: e.codeRefId,
      uuid: e.uuid,
      name: e.name,
      type: e.type,
      file: e.file,
      line: e.line,
      exported: e.exported,
      headerStatus: e.headerStatus ?? 'missing',
    })),
  });
}

function handleEdges(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const edges = cache.graph?.edges ?? [];
  send(res, 200, {
    total: edges.length,
    edges: edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.type ?? e.relationship ?? 'unknown',
    })),
  });
}

function handleHotspots(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const edges = cache.graph?.edges ?? [];
  const nodes = cache.graph?.nodes ?? [];

  // Compute in-degree: count edges where target === node id
  const inDegree: Record<string, number> = {};
  edges.forEach(e => {
    if (e.target) {
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    }
  });

  // Map nodes with in-degree
  const nodeMap: Record<string, GraphNode> = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  // Sort by in-degree desc, top 20
  const sorted = Object.entries(inDegree)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const items = sorted.map(([nodeId, deg]) => {
    const n = nodeMap[nodeId];
    return {
      id: nodeId,
      name: n?.name ?? nodeId,
      file: n?.file ?? '',
      type: n?.type ?? 'unknown',
      in_degree: deg,
    };
  });

  send(res, 200, {
    total: items.length,
    items,
  });
}

function handleCoverageGaps(_req: http.IncomingMessage, res: http.ServerResponse): void {
  // Elements missing or stale headers, sorted by complexity desc
  const elements = cache.index?.elements ?? [];
  const complexMap: Record<string, number> = {};
  (cache.complexity?.elements ?? []).forEach(e => {
    const key = `${e.file}#${e.element}`;
    complexMap[key] = e.complexity;
  });

  const gaps = elements
    .filter(e => e.headerStatus !== 'defined')
    .map(e => {
      const key = `${e.file}#${e.name}`;
      return {
        id: e.codeRefId,
        name: e.name,
        file: e.file,
        type: e.type,
        headerStatus: e.headerStatus ?? 'missing',
        complexity: complexMap[key] ?? 0,
      };
    })
    .sort((a, b) => b.complexity - a.complexity);

  send(res, 200, {
    total: gaps.length,
    items: gaps,
  });
}

// ---- router ------------------------------------------------------------------

async function router(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const method = req.method?.toUpperCase() ?? 'GET';
  const parsed = url.parse(req.url ?? '/', true);
  const pathname = parsed.pathname ?? '/';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (method !== 'GET') {
    send(res, 405, { error: 'method_not_allowed' });
    return;
  }

  switch (pathname) {
    case '/api/health':                      return handleHealth(req, res);
    case '/readyz':                          return handleReadyz(req, res);
    case '/api/intelligence/summary':        return handleSummary(req, res);
    case '/api/intelligence/elements':       return handleElements(req, res);
    case '/api/intelligence/edges':          return handleEdges(req, res);
    case '/api/intelligence/hotspots':       return handleHotspots(req, res);
    case '/api/intelligence/coverage-gaps':  return handleCoverageGaps(req, res);
    default:
      send(res, 404, { error: 'not_found', path: pathname });
  }
}

// ---- main --------------------------------------------------------------------

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const projectDir = path.resolve(args.projectDir);
  console.log(`[intelligence-server] Loading .coderef/ artifacts from: ${projectDir}`);
  loadArtifacts(projectDir);

  const server = http.createServer(async (req, res) => {
    try {
      await router(req, res);
    } catch (e: any) {
      console.error('[intelligence-server] Unhandled error:', e);
      if (!res.headersSent) {
        send(res, 500, { error: 'internal_server_error', detail: String(e?.message ?? e) });
      }
    }
  });

  server.listen(args.port, '127.0.0.1', () => {
    console.log(`[intelligence-server] v${SERVER_VERSION} listening on http://127.0.0.1:${args.port}`);
    console.log(`[intelligence-server] Endpoints: /api/health /readyz /api/intelligence/{summary,elements,edges,hotspots,coverage-gaps}`);
  });

  process.on('SIGINT', () => {
    console.log('\n[intelligence-server] Shutting down...');
    server.close(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

main().catch(e => {
  console.error('[intelligence-server] Fatal:', e);
  process.exit(1);
});
