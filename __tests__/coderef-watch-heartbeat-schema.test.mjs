/**
 * Schema-validation test for coderef-watch heartbeat.
 *
 * WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001 phase 3 task HB-T3.
 *
 * Runs `coderef-watch --once --no-pipeline` against a temp workspace, reads
 * the resulting .coderef/last-scan.json, validates against the JSON Schema at
 * src/cli/coderef-watch-heartbeat.schema.json. Also verifies atomic-write
 * resilience: any reader who races a partial write should never see invalid
 * JSON (rename is atomic on same-volume).
 *
 * Run: node __tests__/coderef-watch-heartbeat-schema.test.mjs
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coderef-watch-hb-'));
fs.writeFileSync(path.join(tmpRoot, 'seed.ts'), 'export const x = 1;\n');

const watchBin = path.resolve('dist/src/cli/coderef-watch.js');
const schemaPath = path.resolve('src/cli/coderef-watch-heartbeat.schema.json');
if (!fs.existsSync(watchBin)) {
  console.error(`FAIL: expected ${watchBin}`);
  process.exit(1);
}
if (!fs.existsSync(schemaPath)) {
  console.error(`FAIL: expected ${schemaPath}`);
  process.exit(1);
}

// Run --once --no-pipeline
const result = spawnSync(process.execPath, [
  watchBin,
  '--project-dir', tmpRoot,
  '--once',
  '--no-pipeline',
  '--json',
], { encoding: 'utf-8', timeout: 10_000 });

if (result.status !== 0) {
  console.error(`FAIL: --once exit=${result.status}`);
  console.error('stdout:', result.stdout);
  console.error('stderr:', result.stderr);
  process.exit(1);
}

const hbPath = path.join(tmpRoot, '.coderef', 'last-scan.json');
if (!fs.existsSync(hbPath)) {
  console.error(`FAIL: heartbeat missing at ${hbPath}`);
  process.exit(1);
}

let hb;
try {
  hb = JSON.parse(fs.readFileSync(hbPath, 'utf-8'));
} catch (e) {
  console.error(`FAIL: heartbeat is not valid JSON: ${e.message}`);
  process.exit(1);
}

// Spot-validate against the published schema. Uses a hand-rolled minimal
// validator (no extra dep) that checks the schema's required fields, types,
// and enum constraints. Sufficient for v1; richer JSON Schema validation
// would import a library.
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

const failures = [];

for (const req of schema.required) {
  if (!(req in hb)) failures.push(`missing required field: ${req}`);
}

const matchSingle = (val, t) => {
  if (t === 'null') return val === null;
  if (t === 'integer') return Number.isInteger(val);
  if (t === 'array') return Array.isArray(val);
  if (t === 'object') return val !== null && typeof val === 'object' && !Array.isArray(val);
  return typeof val === t;
};
const checkType = (val, expected, name) => {
  if (Array.isArray(expected)) {
    const ok = expected.some((t) => matchSingle(val, t));
    if (!ok) failures.push(`${name}: expected ${expected.join('|')}, got ${val === null ? 'null' : typeof val}`);
    return;
  }
  if (expected === 'integer') {
    if (!Number.isInteger(val)) failures.push(`${name}: expected integer, got ${typeof val}`);
    return;
  }
  if (expected === 'array') {
    if (!Array.isArray(val)) failures.push(`${name}: expected array, got ${typeof val}`);
    return;
  }
  if (expected === 'object') {
    if (val === null || typeof val !== 'object' || Array.isArray(val)) failures.push(`${name}: expected object`);
    return;
  }
  if (typeof val !== expected) failures.push(`${name}: expected ${expected}, got ${typeof val}`);
};

for (const [key, def] of Object.entries(schema.properties)) {
  if (!(key in hb)) continue;
  if (def.type) checkType(hb[key], def.type, key);
  if (def.enum && !def.enum.includes(hb[key])) failures.push(`${key}: value ${JSON.stringify(hb[key])} not in enum ${JSON.stringify(def.enum)}`);
  if (def.const !== undefined && hb[key] !== def.const) failures.push(`${key}: value ${JSON.stringify(hb[key])} != const ${JSON.stringify(def.const)}`);
}

// Spot checks for trigger sub-object
if (hb.trigger) {
  if (hb.trigger.kind !== 'once') failures.push(`trigger.kind: expected 'once', got ${JSON.stringify(hb.trigger.kind)}`);
  if (typeof hb.trigger.cwd !== 'string') failures.push(`trigger.cwd: expected string`);
}

// Atomic-write smoke: assert no .tmp file remains in the .coderef/ dir.
const stale = fs.readdirSync(path.join(tmpRoot, '.coderef')).filter((n) => n.endsWith('.tmp'));
if (stale.length > 0) {
  failures.push(`stale .tmp file(s) left in .coderef/: ${stale.join(', ')}`);
}

// Cleanup
try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

if (failures.length === 0) {
  console.log('PASS: heartbeat validates against schema v1; atomic write left no .tmp residue');
  process.exit(0);
} else {
  console.error('FAIL:');
  for (const f of failures) console.error('  -', f);
  console.error('---heartbeat---');
  console.error(JSON.stringify(hb, null, 2));
  process.exit(1);
}
