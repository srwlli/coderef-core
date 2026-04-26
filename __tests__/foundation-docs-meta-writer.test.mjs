/**
 * Contract test: scripts/doc-gen/generate-meta-json.js
 *
 * WO-FOUNDATION-DOCS-META-WRITER-001 phase 4 task TS-T1.
 *
 * Builds a fixture project with 8 minimal foundation-docs, runs the writer
 * with trigger env vars, validates output against the schema, asserts:
 *   - schema_version === 1
 *   - all 8 docs present, each with sha256 content_hash + ISO 8601 mtime
 *   - minimum_last_regenerated_at <= maximum_last_regenerated_at
 *   - trigger.kind plumbed through from env
 *   - trigger.workorder_id, trigger.session_id plumbed through
 *   - no .tmp residue
 *   - LLOYD-style read pattern: doc_age_seconds < 60 right after write
 *
 * Run: node __tests__/foundation-docs-meta-writer.test.mjs
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = process.cwd();
const WRITER_BIN = path.resolve(REPO_ROOT, 'scripts/doc-gen/generate-meta-json.js');
const SCHEMA_PATH = path.resolve(REPO_ROOT, 'scripts/doc-gen/foundation-docs-meta.schema.json');
if (!fs.existsSync(WRITER_BIN)) {
  console.error(`FAIL: ${WRITER_BIN} missing`);
  process.exit(1);
}
if (!fs.existsSync(SCHEMA_PATH)) {
  console.error(`FAIL: ${SCHEMA_PATH} missing`);
  process.exit(1);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fdm-writer-test-'));
const fdocsDir = path.join(tmpRoot, 'coderef', 'foundation-docs');
fs.mkdirSync(fdocsDir, { recursive: true });

// 8 minimal fixture docs
const DOC_NAMES = [
  'INDEX.md', 'EXPORTS.md', 'HOTSPOTS.md', 'RELATIONSHIPS.md',
  'API.md', 'ARCHITECTURE.md', 'COMPONENTS.md', 'SCHEMA.md',
];
for (const name of DOC_NAMES) {
  fs.writeFileSync(path.join(fdocsDir, name), `# ${name}\n\nfixture content for ${name}\n`);
}

// Symlink the schema script so loadSchema() finds it under fixture project
fs.mkdirSync(path.join(tmpRoot, 'scripts', 'doc-gen'), { recursive: true });
fs.copyFileSync(SCHEMA_PATH, path.join(tmpRoot, 'scripts', 'doc-gen', 'foundation-docs-meta.schema.json'));

// Minimal package.json so loadProjectId picks it up
fs.writeFileSync(path.join(tmpRoot, 'package.json'), JSON.stringify({ name: 'fdm-test-fixture', version: '0.0.0' }, null, 2));

const failures = [];

function postRunChecks(envOverrides = {}) {
  const result = spawnSync(process.execPath, [WRITER_BIN, '--project-dir', tmpRoot], {
    encoding: 'utf-8',
    env: { ...process.env, ...envOverrides },
    timeout: 15_000,
  });
  if (result.status !== 0) {
    failures.push(`writer exit: expected 0, got ${result.status}; stderr: ${result.stderr}`);
    return null;
  }
  const metaPath = path.join(tmpRoot, '.coderef', 'foundation-docs-meta.json');
  if (!fs.existsSync(metaPath)) { failures.push(`meta file missing at ${metaPath}`); return null; }
  let meta;
  try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); }
  catch (e) { failures.push(`meta JSON parse: ${e.message}`); return null; }
  return { meta, metaPath };
}

// ---- Run 1: default (manual trigger) -------------------------------------

const r1 = postRunChecks();
if (r1) {
  const { meta } = r1;
  if (meta.schema_version !== 1) failures.push(`r1 schema_version: expected 1, got ${meta.schema_version}`);
  if (meta.project_id !== 'fdm-test-fixture') failures.push(`r1 project_id: expected fdm-test-fixture, got ${meta.project_id}`);
  if (Object.keys(meta.docs).length !== DOC_NAMES.length) failures.push(`r1 docs count: expected ${DOC_NAMES.length}, got ${Object.keys(meta.docs).length}`);

  for (const name of DOC_NAMES) {
    const d = meta.docs[name];
    if (!d) { failures.push(`r1 docs[${name}]: missing`); continue; }
    if (typeof d.last_regenerated_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(d.last_regenerated_at)) {
      failures.push(`r1 docs[${name}].last_regenerated_at: bad format (${d.last_regenerated_at})`);
    }
    if (!/^sha256:[0-9a-f]{64}$/.test(d.content_hash)) failures.push(`r1 docs[${name}].content_hash: bad format (${d.content_hash})`);
    if (typeof d.byte_size !== 'number' || d.byte_size <= 0) failures.push(`r1 docs[${name}].byte_size: expected positive int (${d.byte_size})`);
    if (!['auto', 'enhanced'].includes(d.kind)) failures.push(`r1 docs[${name}].kind: expected auto|enhanced (${d.kind})`);
  }

  // Aggregate min/max sanity
  const minMs = Date.parse(meta.minimum_last_regenerated_at);
  const maxMs = Date.parse(meta.maximum_last_regenerated_at);
  if (!(minMs <= maxMs)) failures.push(`r1 minimum_last_regenerated_at > maximum_last_regenerated_at`);

  // Default trigger
  if (meta.trigger.kind !== 'manual') failures.push(`r1 trigger.kind: expected 'manual', got ${meta.trigger.kind}`);
  if (meta.trigger.workorder_id !== null) failures.push(`r1 trigger.workorder_id: expected null, got ${JSON.stringify(meta.trigger.workorder_id)}`);

  // No .tmp residue
  const tmpFiles = fs.readdirSync(path.join(tmpRoot, '.coderef')).filter(n => n.endsWith('.tmp'));
  if (tmpFiles.length > 0) failures.push(`r1 stale .tmp files: ${tmpFiles.join(', ')}`);

  // LLOYD-style read pattern: doc_age_seconds < 60 (we just wrote it)
  const now = Date.now();
  const newestMs = Math.max(...Object.values(meta.docs).map(d => Date.parse(d.last_regenerated_at)));
  const ageS = (now - newestMs) / 1000;
  if (ageS >= 60) failures.push(`r1 LLOYD-style read: newest doc age ${ageS.toFixed(1)}s >= 60s (expected just-written)`);
}

// ---- Run 2: env-driven trigger -------------------------------------------

const r2 = postRunChecks({
  CODEREF_META_TRIGGER_KIND: 'workorder_phase_6',
  CODEREF_META_WORKORDER_ID: 'WO-FIXTURE-999',
  CODEREF_META_SESSION_ID: 'daily-agent-session-2026-04-26',
});
if (r2) {
  const { meta } = r2;
  if (meta.trigger.kind !== 'workorder_phase_6') failures.push(`r2 trigger.kind: expected workorder_phase_6, got ${meta.trigger.kind}`);
  if (meta.trigger.workorder_id !== 'WO-FIXTURE-999') failures.push(`r2 trigger.workorder_id: expected WO-FIXTURE-999, got ${meta.trigger.workorder_id}`);
  if (meta.trigger.session_id !== 'daily-agent-session-2026-04-26') failures.push(`r2 trigger.session_id: expected daily-agent-session-2026-04-26, got ${meta.trigger.session_id}`);
}

// ---- Run 3: invalid trigger.kind defaults to 'unknown' -------------------

const r3 = postRunChecks({ CODEREF_META_TRIGGER_KIND: 'bogus_value_not_in_enum' });
if (r3) {
  const { meta } = r3;
  if (meta.trigger.kind !== 'unknown') failures.push(`r3 trigger.kind: expected 'unknown' (invalid env value coerced), got ${meta.trigger.kind}`);
}

// Cleanup
try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch {}

if (failures.length === 0) {
  console.log('PASS: 3 runs OK; schema_version=1; 8 docs with sha256 + ISO mtime; trigger plumbed (manual default, env override, invalid coerced to unknown); LLOYD-style read confirms fresh write');
  process.exit(0);
} else {
  console.error('FAIL:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
