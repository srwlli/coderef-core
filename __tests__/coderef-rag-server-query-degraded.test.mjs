/**
 * Contract test: POST /api/rag/query + POST /api/rag/index degraded-path.
 *
 * WO-RAG-HTTP-SERVER-V1-001 phase 3 task QI-T3 + phase 4 task DEG-T3.
 *
 * Spawns coderef-rag-server with Ollama pinned to an unreachable URL and
 * asserts:
 *   POST /api/rag/query  body {project_dir, query} -> 503 with
 *     {degraded:true, reason:'ollama_unreachable'|'ollama_timeout', detail,
 *      cached_at, ollama_base_url}
 *   POST /api/rag/index  body {project_dir} -> 503 same envelope
 *   POST /api/rag/query  body without project_dir -> 400 (input validation)
 *   POST /api/rag/query  body with non-existent project_dir -> 404
 *   /api/health stays 200 throughout (server doesn't crash on degraded query)
 *
 * Run: node __tests__/coderef-rag-server-query-degraded.test.mjs
 */

import { spawn } from 'child_process';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const REPO_ROOT = process.cwd();
const SERVER_BIN = path.resolve(REPO_ROOT, 'dist/src/cli/coderef-rag-server.js');
if (!fs.existsSync(SERVER_BIN)) {
  console.error(`FAIL: ${SERVER_BIN} missing -- run npm run build:cli first`);
  process.exit(1);
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

async function waitFor(url, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`waitFor timeout: ${url}`);
}

async function postJson(url, body) {
  return await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const port = await findFreePort();
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-rag-query-test-'));
fs.mkdirSync(path.join(tmpRoot, '.coderef'), { recursive: true });
// Seed an empty vector store so SQLiteVectorStore.initialize() has something to read
fs.writeFileSync(
  path.join(tmpRoot, '.coderef', 'coderef-vectors.json'),
  JSON.stringify({ vectors: [], schema_version: 1, dimension: 768 }, null, 2),
);

const child = spawn(process.execPath, [SERVER_BIN, '--port', String(port)], {
  env: { ...process.env, CODEREF_LLM_BASE_URL: 'http://127.0.0.1:65531' }, // unreachable
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (b) => { stderr += b.toString(); });

const failures = [];
try {
  await waitFor(`http://127.0.0.1:${port}/api/health`, 5000);

  // 1. degraded query
  const q = await postJson(`http://127.0.0.1:${port}/api/rag/query`, {
    project_dir: tmpRoot,
    query: 'test',
    top_k: 5,
  });
  if (q.status !== 503) failures.push(`/api/rag/query degraded: expected 503, got ${q.status}`);
  const qb = await q.json();
  if (qb.degraded !== true) failures.push(`/api/rag/query degraded: expected degraded:true, got ${JSON.stringify(qb.degraded)}`);
  if (!['ollama_unreachable', 'ollama_timeout', 'ollama_http_error'].includes(qb.reason)) {
    failures.push(`/api/rag/query degraded: expected reason in [ollama_unreachable|ollama_timeout|ollama_http_error], got ${qb.reason}`);
  }
  if (!qb.cached_at) failures.push(`/api/rag/query degraded: cached_at missing`);
  if (!qb.ollama_base_url) failures.push(`/api/rag/query degraded: ollama_base_url missing`);

  // 2. degraded index
  const i = await postJson(`http://127.0.0.1:${port}/api/rag/index`, { project_dir: tmpRoot });
  if (i.status !== 503) failures.push(`/api/rag/index degraded: expected 503, got ${i.status}`);
  const ib = await i.json();
  if (ib.degraded !== true) failures.push(`/api/rag/index degraded: expected degraded:true`);

  // 3. input validation: missing project_dir
  const v1 = await postJson(`http://127.0.0.1:${port}/api/rag/query`, { query: 'no dir' });
  if (v1.status !== 400) failures.push(`missing project_dir: expected 400, got ${v1.status}`);

  // 4. input validation: missing query
  const v2 = await postJson(`http://127.0.0.1:${port}/api/rag/query`, { project_dir: tmpRoot });
  if (v2.status !== 400) failures.push(`missing query: expected 400, got ${v2.status}`);

  // 5. non-existent project_dir
  const v3 = await postJson(`http://127.0.0.1:${port}/api/rag/query`, {
    project_dir: '/nonexistent/path/xyz',
    query: 'test',
  });
  if (v3.status !== 404) failures.push(`bad project_dir: expected 404, got ${v3.status}`);

  // 6. health still works after degraded queries (no crash)
  const h = await fetch(`http://127.0.0.1:${port}/api/health`);
  if (h.status !== 200) failures.push(`/api/health after degraded queries: expected 200 (server alive), got ${h.status}`);

  // 7. invalid JSON body
  const bj = await fetch(`http://127.0.0.1:${port}/api/rag/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not valid json',
  });
  if (bj.status !== 400) failures.push(`invalid JSON body: expected 400, got ${bj.status}`);
} finally {
  child.kill('SIGTERM');
  await new Promise((r) => child.once('exit', r));
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
}

if (failures.length === 0) {
  console.log('PASS: degraded query/index both 503 with degraded:true envelope; input validation (400/404); server stayed alive throughout');
  process.exit(0);
} else {
  console.error('FAIL:');
  for (const f of failures) console.error('  -', f);
  if (stderr) console.error('--- server stderr ---\n' + stderr);
  process.exit(1);
}
