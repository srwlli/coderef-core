/**
 * @coderef-semantic: 1.0.0
 * @layer test_support
 * @capability coderef-map-cli-tests
 */

import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync, spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI_BIN = path.join(REPO_ROOT, 'dist', 'src', 'cli', 'coderef-map.js');

// The CLI e2e requires a built dist tree + this repo's .coderef artifacts.
// Both exist in the working clone; on a fresh unbuilt checkout these skip
// (same pattern as the real-repo smoke in project-map-data.test.ts).
const runnable =
  fs.existsSync(CLI_BIN) && fs.existsSync(path.join(REPO_ROOT, '.coderef', 'graph.json'));

function httpGet(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, res => {
        let body = '';
        res.on('data', c => (body += c));
        res.on('end', () => resolve({ status: res.statusCode || 0, body }));
      })
      .on('error', reject);
  });
}

describe('coderef-map CLI e2e', () => {
  let outDir: string;

  afterAll(() => {
    if (outDir) fs.rmSync(outDir, { recursive: true, force: true });
  });

  it.skipIf(!runnable)('static mode emits data.json + inlined graph.html + viewer assets', () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-out-'));
    const r = spawnSync(
      process.execPath,
      [CLI_BIN, REPO_ROOT, '--no-open', `--out=${outDir}`],
      { encoding: 'utf-8' },
    );
    expect(r.status, r.stderr).toBe(0);
    for (const f of ['data.json', 'graph.html', 'viewer.js', 'viewer.css']) {
      expect(fs.existsSync(path.join(outDir, f)), `missing ${f}`).toBe(true);
    }
    const html = fs.readFileSync(path.join(outDir, 'graph.html'), 'utf-8');
    expect(html).not.toContain('/*__CODEREF_MAP_DATA__*/null'); // placeholder replaced
    expect(html).toContain('"schemaVersion"');                  // data inlined
    const data = JSON.parse(fs.readFileSync(path.join(outDir, 'data.json'), 'utf-8'));
    expect(data.nodes.length).toBeGreaterThan(0);
    expect(data.edges.length).toBeGreaterThan(0);
  });

  it.skipIf(!runnable)('--serve serves graph.html and data.json over localhost', async () => {
    const serveOut = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-map-serve-'));
    let child: ChildProcess | null = null;
    try {
      child = spawn(
        process.execPath,
        [CLI_BIN, REPO_ROOT, '--serve', '--port=0', '--no-open', `--out=${serveOut}`],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const url = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('server did not report URL')), 30000);
        let buf = '';
        child!.stdout!.on('data', chunk => {
          buf += chunk.toString();
          const m = buf.match(/serving (http:\/\/localhost:\d+\/graph\.html)/);
          if (m) {
            clearTimeout(timer);
            resolve(m[1]);
          }
        });
        child!.on('exit', code => {
          clearTimeout(timer);
          reject(new Error(`server exited early (${code})`));
        });
      });
      const page = await httpGet(url);
      expect(page.status).toBe(200);
      expect(page.body).toContain('graph-canvas');
      const data = await httpGet(url.replace('/graph.html', '/data.json'));
      expect(data.status).toBe(200);
      expect(JSON.parse(data.body).meta.schemaVersion).toBe('1.5.0');
      // path traversal guarded
      const evil = await httpGet(url.replace('/graph.html', '/../package.json'));
      expect(evil.status).not.toBe(200);
    } finally {
      if (child) child.kill();
      fs.rmSync(serveOut, { recursive: true, force: true });
    }
  }, 45000);
});
