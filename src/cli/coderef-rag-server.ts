#!/usr/bin/env node
/**
 * coderef-rag-server - Always-on HTTP RAG server for cross-runtime callers.
 *
 * WO-RAG-HTTP-SERVER-V1-001.
 *
 * Wraps CODEREF-CORE vector RAG (SemanticSearchService + OllamaProvider +
 * SQLiteVectorStore) behind a localhost-only JSON HTTP API on port 52849
 * (configurable via --port / CODEREF_RAG_HTTP_PORT). Lets Python LLOYD,
 * Node ASSISTANT, and future surfaces query CORE RAG without package import
 * or per-request subprocess spawn.
 *
 * Endpoints (v1 contract — see docs/rag-http-api.md):
 *   GET  /api/health          - liveness + uptime + version
 *   GET  /api/rag/status      - Ollama reachability + model + dim + store info
 *   POST /api/rag/query       - body {project_dir, query, top_k?, lang?, type?}
 *   POST /api/rag/index       - body {project_dir} - spawn rag-index subprocess
 *
 * Posture: always-on. Graceful shutdown on SIGINT/SIGTERM. Local-only
 * (Ollama). No auth (localhost-only). No streaming (request/response JSON).
 * Server stays up if Ollama is unreachable; query path returns 503 with
 * {degraded:true, reason} instead.
 *
 * Versioned response header: X-Coderef-RAG-API: 1.
 */

import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

// ---- constants -------------------------------------------------------------

const RAG_API_VERSION = 1;
const DEFAULT_PORT = Number(process.env.CODEREF_RAG_HTTP_PORT) || 52849;
const MAX_BODY_BYTES = 1_000_000;            // 1 MB cap (R6)
const QUERY_TIMEOUT_MS = 30_000;              // R4
const OLLAMA_PROBE_TIMEOUT_MS = 2_000;
const OLLAMA_PROBE_CACHE_MS = 5_000;
const SERVER_VERSION = '1.0.0';
const SERVER_STARTED_AT = Date.now();

// ---- module-level deferred imports (lazy, so server boots even without RAG)

let SemanticSearchService: any;
let OllamaProvider: any;
let SQLiteVectorStore: any;

async function loadRagModules(): Promise<void> {
  if (SemanticSearchService) return;
  const ssMod  = await import('../integration/rag/semantic-search.js');
  const ollMod = await import('../integration/llm/ollama-provider.js');
  const sqlMod = await import('../integration/vector/sqlite-store.js');
  SemanticSearchService = ssMod.SemanticSearchService;
  OllamaProvider        = ollMod.OllamaProvider;
  SQLiteVectorStore     = sqlMod.SQLiteVectorStore;
}

// ---- CLI args --------------------------------------------------------------

interface CliArgs { port: number; help: boolean; }

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { port: DEFAULT_PORT, help: false };
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
      case '--help':  args.help = true; break;
      case '--port':
      case '-p':      args.port = Math.max(1, parseInt(next(), 10)); break;
      default: /* unknown flag - ignore (no positionals) */ break;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`coderef-rag-server - always-on HTTP RAG server (v${SERVER_VERSION})

USAGE:
  coderef-rag-server [--port <n>]

OPTIONS:
  -p, --port <n>     TCP port to listen on (default: ${DEFAULT_PORT}; env: CODEREF_RAG_HTTP_PORT).
  -h, --help         Show this help.

ENDPOINTS (see docs/rag-http-api.md for full contract):
  GET  /readyz              - readiness probe (returns 200 OK)
  GET  /api/health          - liveness + uptime
  GET  /api/rag/status      - Ollama reachability + model + dim + store info
  POST /api/rag/query       - body {project_dir, query, top_k?, lang?, type?}
  POST /api/rag/index       - body {project_dir} - spawn rag-index subprocess

ENVIRONMENT:
  CODEREF_RAG_HTTP_PORT     Override default port.
  CODEREF_LLM_BASE_URL      Ollama endpoint (default: http://localhost:11434).
  CODEREF_LLM_MODEL         Ollama embedding model (default: nomic-embed-text).
  CODEREF_SQLITE_PATH       Override per-project vector store path.

POSTURE:
  Localhost-only. No auth, no TLS, no streaming. Server stays up if Ollama is
  unreachable; query path returns 503 {degraded:true, reason}. See
  docs/DEPLOY-CODEREF-RAG-SERVER.md for systemd / launchd / Windows Service /
  pm2 / manual-start patterns.
`);
}

// ---- shared helpers --------------------------------------------------------

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function jsonHead(headers: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Coderef-RAG-API': String(RAG_API_VERSION),
    ...headers,
  };
}

function send(res: http.ServerResponse, code: number, body: unknown): void {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(code, jsonHead());
  res.end(data + '\n');
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c) => {
      total += c.length;
      if (total > MAX_BODY_BYTES) {
        req.destroy();
        reject(Object.assign(new Error('body_too_large'), { http: 413 }));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const buf = Buffer.concat(chunks).toString('utf-8');
      if (!buf.trim()) { resolve({}); return; }
      try { resolve(JSON.parse(buf)); }
      catch (e: any) { reject(Object.assign(new Error('invalid_json: ' + e.message), { http: 400 })); }
    });
    req.on('error', reject);
  });
}

// ---- Ollama health probe (cached) ----------------------------------------

interface ProbeResult {
  reachable: boolean;
  reason?: string;
  detail?: string;
  cached_at: string;
  base_url: string;
  model: string;
}

let probeCache: { at: number; result: ProbeResult } | null = null;

async function probeOllama(force = false): Promise<ProbeResult> {
  const baseUrl = process.env.CODEREF_LLM_BASE_URL || 'http://localhost:11434';
  const model   = process.env.CODEREF_LLM_MODEL   || 'nomic-embed-text';

  if (!force && probeCache && Date.now() - probeCache.at < OLLAMA_PROBE_CACHE_MS) {
    return probeCache.result;
  }

  const url = baseUrl.replace(/\/+$/, '') + '/api/tags';
  const ac  = new AbortController();
  const timer = setTimeout(() => ac.abort(), OLLAMA_PROBE_TIMEOUT_MS);
  let result: ProbeResult;
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (r.ok) {
      result = { reachable: true, cached_at: isoNow(), base_url: baseUrl, model };
    } else {
      result = {
        reachable: false,
        reason: 'ollama_http_error',
        detail: `${r.status} ${r.statusText}`,
        cached_at: isoNow(),
        base_url: baseUrl,
        model,
      };
    }
  } catch (e: any) {
    const reason = e.name === 'AbortError' ? 'ollama_timeout' : 'ollama_unreachable';
    result = { reachable: false, reason, detail: String(e.message || e), cached_at: isoNow(), base_url: baseUrl, model };
  } finally {
    clearTimeout(timer);
  }
  probeCache = { at: Date.now(), result };
  return result;
}

// ---- in-memory mutex per project_dir for /api/rag/index (R5) -------------

const indexInFlight = new Set<string>();

// ---- handlers --------------------------------------------------------------

async function handleHealth(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  send(res, 200, {
    status: 'healthy',
    version: SERVER_VERSION,
    api_version: RAG_API_VERSION,
    uptime_s: Math.floor((Date.now() - SERVER_STARTED_AT) / 1000),
    pid: process.pid,
    started_at: new Date(SERVER_STARTED_AT).toISOString(),
  });
}

async function handleReadyz(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('OK');
}

async function handleStatus(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const probe = await probeOllama();
  // Best-effort: report dim from default model registry (768 for nomic-embed-text)
  const knownDims: Record<string, number> = { 'nomic-embed-text': 768 };
  const dim = knownDims[probe.model] ?? null;
  send(res, 200, {
    api_version: RAG_API_VERSION,
    server_version: SERVER_VERSION,
    ollama: {
      reachable: probe.reachable,
      base_url: probe.base_url,
      model: probe.model,
      embedding_dim: dim,
      reason: probe.reachable ? undefined : probe.reason,
      detail: probe.reachable ? undefined : probe.detail,
      cached_at: probe.cached_at,
    },
    sqlite_store: {
      env_override: process.env.CODEREF_SQLITE_PATH || null,
      default_path_pattern: '<project_dir>/.coderef/coderef-vectors.json',
    },
    indexing_in_flight: Array.from(indexInFlight),
  });
}

interface QueryBody {
  project_dir?: string;
  query?: string;
  top_k?: number;
  lang?: string;
  type?: string;
  file?: string;
  exported?: boolean;
}

async function handleQuery(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let body: QueryBody;
  try { body = await readBody(req) as QueryBody; }
  catch (e: any) {
    send(res, e.http || 400, { error: e.message || 'bad_request' });
    return;
  }
  if (!body.project_dir || !body.query) {
    send(res, 400, { error: 'project_dir and query are required' });
    return;
  }
  if (!fs.existsSync(body.project_dir)) {
    send(res, 404, { error: 'project_dir not found', project_dir: body.project_dir });
    return;
  }

  // Degraded-path: Ollama unreachable -> 503 envelope, server stays up
  const probe = await probeOllama();
  if (!probe.reachable) {
    res.writeHead(503, jsonHead());
    res.end(JSON.stringify({
      degraded: true,
      reason: probe.reason || 'ollama_unreachable',
      detail: probe.detail,
      cached_at: probe.cached_at,
      ollama_base_url: probe.base_url,
    }, null, 2) + '\n');
    return;
  }

  await loadRagModules();

  const llmProvider = new OllamaProvider({
    apiKey: process.env.CODEREF_LLM_API_KEY || 'ollama',
    baseUrl: probe.base_url,
    model: probe.model,
  });
  const dimension = typeof llmProvider.getEmbeddingDimensions === 'function'
    ? llmProvider.getEmbeddingDimensions()
    : 768;
  const storagePath = process.env.CODEREF_SQLITE_PATH
    || path.join(body.project_dir, '.coderef', 'coderef-vectors.json');
  const vectorStore = new SQLiteVectorStore({ storagePath, dimension });
  await vectorStore.initialize();

  const search = new SemanticSearchService(llmProvider, vectorStore);
  const opts: any = {
    topK: typeof body.top_k === 'number' ? body.top_k : 10,
    ...(body.lang     ? { language: body.lang } : {}),
    ...(body.type     ? { type: body.type }     : {}),
    ...(body.file     ? { file: body.file }     : {}),
    ...(body.exported !== undefined ? { exported: body.exported } : {}),
  };

  const start = Date.now();
  let response;
  try {
    // Per-request timeout (R4)
    response = await Promise.race([
      search.search(body.query, opts),
      new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('query_timeout'), { http: 504 })), QUERY_TIMEOUT_MS)),
    ]) as any;
  } catch (e: any) {
    send(res, e.http || 500, { error: e.message || 'query_failed' });
    return;
  }
  const elapsed = Date.now() - start;

  send(res, 200, {
    api_version: RAG_API_VERSION,
    query: body.query,
    project_dir: body.project_dir,
    results: response.results || [],
    total_results: response.totalResults ?? (response.results?.length ?? 0),
    elapsed_ms: elapsed,
    model: probe.model,
  });
}

interface IndexBody { project_dir?: string; reset?: boolean; }

async function handleIndex(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let body: IndexBody;
  try { body = await readBody(req) as IndexBody; }
  catch (e: any) { send(res, e.http || 400, { error: e.message || 'bad_request' }); return; }
  if (!body.project_dir) { send(res, 400, { error: 'project_dir is required' }); return; }
  if (!fs.existsSync(body.project_dir)) {
    send(res, 404, { error: 'project_dir not found', project_dir: body.project_dir });
    return;
  }

  const probe = await probeOllama();
  if (!probe.reachable) {
    res.writeHead(503, jsonHead());
    res.end(JSON.stringify({
      degraded: true,
      reason: probe.reason || 'ollama_unreachable',
      detail: probe.detail,
      cached_at: probe.cached_at,
      ollama_base_url: probe.base_url,
    }, null, 2) + '\n');
    return;
  }

  if (indexInFlight.has(body.project_dir)) {
    send(res, 409, { error: 'index_in_progress', project_dir: body.project_dir });
    return;
  }
  indexInFlight.add(body.project_dir);

  // Spawn rag-index CLI as subprocess. Reuses the canonical incremental indexer
  // and --rag-reset semantics. Local-only: pin CODEREF_LLM_PROVIDER=ollama and
  // CODEREF_RAG_LOCAL_ONLY=1 in the child env.
  const distPath = path.resolve(__dirname, '..', '..', 'src', 'cli', 'rag-index.js');
  const fallback = path.join(
    'C:\\Users\\willh\\Desktop\\CODEREF\\CODEREF-CORE',
    'dist', 'src', 'cli', 'rag-index.js',
  );
  const ragIndexBin = fs.existsSync(distPath) ? distPath : fallback;

  const args = ['--project-dir', body.project_dir, '--provider', 'ollama', '--store', 'sqlite'];
  if (body.reset) args.push('--reset');

  const start = Date.now();
  const child = spawn(process.execPath, [ragIndexBin, ...args], {
    env: { ...process.env, CODEREF_LLM_PROVIDER: 'ollama', CODEREF_RAG_LOCAL_ONLY: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (b) => { stdout += b.toString(); });
  child.stderr.on('data', (b) => { stderr += b.toString(); });

  child.on('close', (code) => {
    const elapsed = Date.now() - start;
    indexInFlight.delete(body.project_dir!);
    if (code === 0) {
      send(res, 200, {
        api_version: RAG_API_VERSION,
        status: 'ok',
        project_dir: body.project_dir,
        exit_code: 0,
        duration_ms: elapsed,
        stdout_tail: stdout.split('\n').slice(-20).join('\n'),
      });
    } else {
      send(res, 500, {
        api_version: RAG_API_VERSION,
        status: 'fail',
        project_dir: body.project_dir,
        exit_code: code,
        duration_ms: elapsed,
        stderr_tail: stderr.split('\n').slice(-20).join('\n'),
      });
    }
  });
  child.on('error', (err) => {
    indexInFlight.delete(body.project_dir!);
    send(res, 500, { error: 'spawn_failed', detail: String(err.message || err) });
  });
}

// ---- router ----------------------------------------------------------------

async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', 'http://localhost');
  const method = (req.method || 'GET').toUpperCase();

  try {
    if (method === 'GET' && url.pathname === '/readyz')          return await handleReadyz(req, res);
    if (method === 'GET' && url.pathname === '/api/health')      return await handleHealth(req, res);
    if (method === 'GET' && url.pathname === '/api/rag/status')  return await handleStatus(req, res);
    if (method === 'POST' && url.pathname === '/api/rag/query')  return await handleQuery(req, res);
    if (method === 'POST' && url.pathname === '/api/rag/index')  return await handleIndex(req, res);
    send(res, 404, { error: 'not_found', method, path: url.pathname });
  } catch (e: any) {
    send(res, 500, { error: 'internal_error', detail: String(e.message || e) });
  }
}

// ---- main ------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }

  const server = http.createServer((req, res) => { void route(req, res); });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[coderef-rag-server] port ${args.port} already in use; exit`);
      process.exit(2);
    }
    console.error('[coderef-rag-server] server error:', err);
    process.exit(1);
  });

  server.listen(args.port, '127.0.0.1', () => {
    console.log(`[coderef-rag-server] listening on http://127.0.0.1:${args.port}`);
    console.log(`[coderef-rag-server] api: GET /api/health | GET /api/rag/status | POST /api/rag/query | POST /api/rag/index`);
  });

  let shuttingDown = false;
  const shutdown = (sig: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[coderef-rag-server] received ${sig}; closing`);
    server.close(() => {
      console.log('[coderef-rag-server] closed');
      process.exit(0);
    });
    // Hard-fail safety: 5s grace
    setTimeout(() => process.exit(0), 5_000).unref();
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[coderef-rag-server] fatal:', err);
  process.exit(1);
});
