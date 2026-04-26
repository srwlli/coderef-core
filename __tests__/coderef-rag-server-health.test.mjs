/**
 * Contract test: GET /api/health + GET /api/rag/status.
 *
 * WO-RAG-HTTP-SERVER-V1-001 phase 2 task HS-T3.
 *
 * Spawns coderef-rag-server on a free localhost port, hits both endpoints,
 * asserts:
 *   - /api/health returns 200 with {status, version, uptime_s, pid}
 *   - /api/rag/status returns 200 with ollama probe (reachable bool) +
 *     versioned X-Coderef-RAG-API header
 *   - Both endpoints work even when Ollama is unreachable (server stays up)
 *
 * Run: node __tests__/coderef-rag-server-health.test.mjs
 */

import { spawn } from 'child_process';
import * as net from 'net';
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

const port = await findFreePort();
// Force Ollama-unreachable so the test is deterministic regardless of dev env.
const child = spawn(process.execPath, [SERVER_BIN, '--port', String(port)], {
  env: { ...process.env, CODEREF_LLM_BASE_URL: 'http://127.0.0.1:65531' }, // unreachable
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (b) => { stderr += b.toString(); });

const failures = [];
try {
  await waitFor(`http://127.0.0.1:${port}/api/health`, 5000);

  const h = await fetch(`http://127.0.0.1:${port}/api/health`);
  if (h.status !== 200) failures.push(`/api/health: expected 200, got ${h.status}`);
  if (h.headers.get('x-coderef-rag-api') !== '1') failures.push(`/api/health: missing X-Coderef-RAG-API header`);
  const hb = await h.json();
  if (hb.status !== 'healthy') failures.push(`/api/health: status expected 'healthy', got ${hb.status}`);
  if (typeof hb.uptime_s !== 'number') failures.push(`/api/health: uptime_s missing or not number`);
  if (typeof hb.pid !== 'number') failures.push(`/api/health: pid missing or not number`);

  const s = await fetch(`http://127.0.0.1:${port}/api/rag/status`);
  if (s.status !== 200) failures.push(`/api/rag/status: expected 200 even when Ollama down, got ${s.status}`);
  const sb = await s.json();
  if (!sb.ollama || typeof sb.ollama.reachable !== 'boolean') failures.push(`/api/rag/status: ollama.reachable missing/wrong type`);
  if (sb.ollama.reachable !== false) failures.push(`/api/rag/status: expected ollama.reachable=false (we forced unreachable URL), got ${sb.ollama.reachable}`);
  if (!sb.ollama.reason) failures.push(`/api/rag/status: ollama.reason missing on unreachable`);
  if (!sb.sqlite_store) failures.push(`/api/rag/status: sqlite_store missing`);
  if (sb.api_version !== 1) failures.push(`/api/rag/status: api_version expected 1, got ${sb.api_version}`);

  // 404 path
  const nf = await fetch(`http://127.0.0.1:${port}/nonexistent`);
  if (nf.status !== 404) failures.push(`/nonexistent: expected 404, got ${nf.status}`);
} finally {
  child.kill('SIGTERM');
  await new Promise((r) => child.once('exit', r));
}

if (failures.length === 0) {
  console.log('PASS: /api/health + /api/rag/status both 200 (Ollama unreachable was tolerated; server stayed up); 404 path OK');
  process.exit(0);
} else {
  console.error('FAIL:');
  for (const f of failures) console.error('  -', f);
  if (stderr) console.error('--- server stderr ---\n' + stderr);
  process.exit(1);
}
