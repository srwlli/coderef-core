/**
 * Synthetic test for coderef-watch debounce semantics.
 *
 * WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001 phase 2 task DEB-T4.
 *
 * Spawns coderef-watch in a temp workspace with short debounce + --no-pipeline,
 * makes a burst of edits, waits past the debounce window, verifies that
 * exactly ONE flush heartbeat was emitted (not N for N edits).
 *
 * Run: node __tests__/coderef-watch-debounce.test.mjs
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const DEBOUNCE_MS = 400;          // tight window for tests
const SETTLE_MS = 1500;           // wait this long after burst before checking
const BURST_FILES = 5;            // emit N burst edits
const BURST_INTERVAL_MS = 30;     // intra-burst spacing
const READY_WAIT_MS = 500;        // wait for chokidar 'ready' before bursting

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-watch-test-'));

// Create a couple of seed files so chokidar has something to watch.
fs.writeFileSync(path.join(tmpRoot, 'seed.ts'), 'export const x = 1;\n');

const watchBin = path.resolve('dist/src/cli/coderef-watch.js');
if (!fs.existsSync(watchBin)) {
  console.error(`FAIL: expected ${watchBin} to exist (run npm run build:cli first)`);
  process.exit(1);
}

const daemon = spawn(process.execPath, [
  watchBin,
  '--project-dir', tmpRoot,
  '--debounce-ms', String(DEBOUNCE_MS),
  '--no-pipeline',
  '--json',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const stdoutLines = [];
daemon.stdout.on('data', (buf) => {
  for (const ln of buf.toString().split('\n')) if (ln.trim()) stdoutLines.push(ln);
});
daemon.stderr.on('data', (buf) => {
  process.stderr.write(`[daemon-stderr] ${buf}`);
});

// Allow chokidar to come up before we touch files.
await new Promise((res) => setTimeout(res, READY_WAIT_MS));

// Burst writes
for (let i = 0; i < BURST_FILES; i++) {
  fs.writeFileSync(path.join(tmpRoot, `burst-${i}.ts`), `export const v${i} = ${i};\n`);
  await new Promise((res) => setTimeout(res, BURST_INTERVAL_MS));
}

// Wait past debounce + chokidar awaitWriteFinish + scan margin
await new Promise((res) => setTimeout(res, SETTLE_MS));

// Stop daemon
daemon.kill('SIGTERM');
await new Promise((res) => daemon.once('exit', res));

// Inspect heartbeat + events.jsonl
const hbPath = path.join(tmpRoot, '.coderef', 'last-scan.json');
const evPath = path.join(tmpRoot, '.coderef', 'watch-events.jsonl');

let pass = true;
const failures = [];

if (!fs.existsSync(hbPath)) {
  pass = false; failures.push(`heartbeat file missing: ${hbPath}`);
}
if (!fs.existsSync(evPath)) {
  pass = false; failures.push(`events file missing: ${evPath}`);
}

let evLines = [];
if (fs.existsSync(evPath)) {
  evLines = fs.readFileSync(evPath, 'utf-8').split('\n').filter((l) => l.trim());
}

// Burst of N edits inside one debounce window MUST collapse to exactly 1 flush event.
if (evLines.length !== 1) {
  pass = false;
  failures.push(`expected 1 flush event for ${BURST_FILES} burst edits, got ${evLines.length}`);
}

if (evLines.length >= 1) {
  const hb = JSON.parse(evLines[evLines.length - 1]);
  if (hb.schema_version !== 1) {
    pass = false; failures.push(`expected schema_version=1, got ${hb.schema_version}`);
  }
  if (hb.status !== 'skipped') {
    pass = false; failures.push(`expected status=skipped (--no-pipeline), got ${hb.status}`);
  }
  if (hb.exit_reason !== 'no_pipeline_flag') {
    pass = false; failures.push(`expected exit_reason=no_pipeline_flag, got ${hb.exit_reason}`);
  }
  if (!Array.isArray(hb.paths_changed) || hb.paths_changed.length === 0) {
    pass = false; failures.push(`expected paths_changed non-empty, got ${JSON.stringify(hb.paths_changed)}`);
  }
  if (hb.paths_changed && hb.paths_changed.length < BURST_FILES) {
    // chokidar may collapse some events but should report at least most of them
    pass = false; failures.push(`expected paths_changed >= ${BURST_FILES}, got ${hb.paths_changed.length} (${JSON.stringify(hb.paths_changed)})`);
  }
}

// Cleanup
try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

if (pass) {
  console.log(`PASS: ${BURST_FILES} burst edits collapsed to 1 flush; heartbeat schema_version=1; paths_changed populated`);
  process.exit(0);
} else {
  console.error('FAIL:');
  for (const f of failures) console.error('  -', f);
  console.error('---DAEMON STDOUT---');
  for (const l of stdoutLines) console.error(l);
  console.error('---events.jsonl---');
  for (const l of evLines) console.error(l);
  process.exit(1);
}
