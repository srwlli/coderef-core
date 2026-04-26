#!/usr/bin/env node
/**
 * generate-meta-json.js - emit .coderef/foundation-docs-meta.json
 *
 * WO-FOUNDATION-DOCS-META-WRITER-001.
 *
 * Final META step of /generate-foundation-docs. Reads coderef/foundation-docs/*.md
 * mtimes + sizes + sha256 hashes, assembles per-doc + aggregate metadata, writes
 * atomically (temp + rename) to .coderef/foundation-docs-meta.json. Per Q5
 * DOC-AGE-EXPOSURE deliverable: stores absolute UTC last_regenerated_at; LLOYD
 * computes doc_age_seconds on every pre-prompt assembly.
 *
 * Trigger provenance (env vars, all optional):
 *   CODEREF_META_TRIGGER_KIND   workorder_phase_6 | chokidar | manual | pipeline | unknown
 *                                (default: 'manual' when unset)
 *   CODEREF_META_WORKORDER_ID   originating workorder id (e.g., WO-FOO-001)
 *   CODEREF_META_SESSION_ID     daily-agent-session id for telemetry attribution
 *
 * Self-validates the output against scripts/doc-gen/foundation-docs-meta.schema.json
 * before writing; aborts non-zero on schema violation (caller treats as a hard fail
 * in the close-out gate).
 *
 * Exit codes:
 *   0  success
 *   1  no foundation-docs found (nothing to summarize)
 *   2  schema validation failed
 *   3  IO error (write/rename)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCRIPT_VERSION = '1.0.0';

const VALID_TRIGGER_KINDS = new Set([
  'workorder_phase_6', 'chokidar', 'manual', 'pipeline', 'unknown',
]);

// ---- args ------------------------------------------------------------------

function parseArgs(argv) {
  const args = { projectDir: process.cwd(), help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    let key = a, inline;
    if (a.startsWith('--') && a.includes('=')) {
      const idx = a.indexOf('=');
      key = a.slice(0, idx);
      inline = a.slice(idx + 1);
    }
    const next = () => inline ?? argv[++i];
    switch (key) {
      case '-h': case '--help':        args.help = true; break;
      case '-p': case '--project-dir': args.projectDir = path.resolve(next()); break;
    }
  }
  return args;
}

function printHelp() {
  console.log(`generate-meta-json.js - emit .coderef/foundation-docs-meta.json

USAGE:
  node scripts/doc-gen/generate-meta-json.js [--project-dir <path>]

OPTIONS:
  -p, --project-dir <path>   Project root (default: cwd)
  -h, --help                 Show this help

ENV VARS (all optional):
  CODEREF_META_TRIGGER_KIND  workorder_phase_6 | chokidar | manual | pipeline | unknown
                             (default: manual)
  CODEREF_META_WORKORDER_ID  Originating workorder id (e.g., WO-FOO-001)
  CODEREF_META_SESSION_ID    Daily-agent-session id

OUTPUT:
  {project-dir}/.coderef/foundation-docs-meta.json (atomic temp+rename)

SCHEMA:
  {project-dir}/scripts/doc-gen/foundation-docs-meta.schema.json (Draft 2020-12)
  Self-validates before write; non-zero exit on validation failure.
`);
}

// ---- helpers ---------------------------------------------------------------

function isoNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function isoFromMtime(mtimeMs) {
  return new Date(mtimeMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function sha256File(filePath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return 'sha256:' + h.digest('hex');
}

function writeJsonAtomic(targetPath, payload) {
  const tmp = targetPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', { encoding: 'utf-8' });
  fs.renameSync(tmp, targetPath);
}

function loadProjectId(projectDir) {
  // Try package.json (canonical for Node projects)
  try {
    const pkgPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) return String(pkg.name);
    }
  } catch { /* fall through */ }
  // Fall back to basename
  return path.basename(path.resolve(projectDir));
}

function computeTrigger() {
  let kind = process.env.CODEREF_META_TRIGGER_KIND || 'manual';
  if (!VALID_TRIGGER_KINDS.has(kind)) kind = 'unknown';
  const out = { kind };
  if (process.env.CODEREF_META_WORKORDER_ID) out.workorder_id = process.env.CODEREF_META_WORKORDER_ID;
  else                                        out.workorder_id = null;
  if (process.env.CODEREF_META_SESSION_ID)    out.session_id   = process.env.CODEREF_META_SESSION_ID;
  else                                        out.session_id   = null;
  return out;
}

// ---- generator-source-artifact lookup -------------------------------------

const GENERATOR_TABLE = {
  'INDEX.md':         { generator: 'generate-index-md.js',         source_artifacts: ['.coderef/index.json'],                        kind: 'auto',     human_authored: false },
  'EXPORTS.md':       { generator: 'generate-exports-md.js',       source_artifacts: ['.coderef/index.json'],                        kind: 'auto',     human_authored: false },
  'HOTSPOTS.md':      { generator: 'generate-hotspots-md.js',      source_artifacts: ['.coderef/context.json'],                      kind: 'auto',     human_authored: false },
  'RELATIONSHIPS.md': { generator: 'generate-relationships-md.js', source_artifacts: ['.coderef/graph.json'],                        kind: 'auto',     human_authored: false },
  'API.md':           { generator: 'enhance-existing-docs.js',     source_artifacts: ['.coderef/index.json'],                        kind: 'enhanced', human_authored: true  },
  'ARCHITECTURE.md':  { generator: 'enhance-existing-docs.js',     source_artifacts: ['.coderef/graph.json', '.coderef/context.json'], kind: 'enhanced', human_authored: true  },
  'COMPONENTS.md':    { generator: 'enhance-existing-docs.js',     source_artifacts: ['.coderef/index.json'],                        kind: 'enhanced', human_authored: true  },
  'SCHEMA.md':        { generator: 'enhance-existing-docs.js',     source_artifacts: ['.coderef/index.json'],                        kind: 'enhanced', human_authored: true  },
};

// ---- minimal schema validator (no extra deps) ----------------------------

function loadSchema(projectDir) {
  const local = path.join(projectDir, 'scripts', 'doc-gen', 'foundation-docs-meta.schema.json');
  if (fs.existsSync(local)) return JSON.parse(fs.readFileSync(local, 'utf-8'));
  // Fallback: schema bundled next to this script
  const bundled = path.join(__dirname, 'foundation-docs-meta.schema.json');
  if (fs.existsSync(bundled)) return JSON.parse(fs.readFileSync(bundled, 'utf-8'));
  return null;
}

function validateAgainstSchema(payload, schema) {
  // Hand-rolled minimal validator: required-fields, types, enum, const, pattern.
  // Sufficient for v1 self-check; deeper validation deferred to LLOYD-side full
  // JSON Schema validator if needed.
  const errors = [];

  function checkObj(obj, schema, pathPrefix) {
    if (!schema || typeof schema !== 'object') return;
    if (schema.required) {
      for (const r of schema.required) {
        if (!(r in obj)) errors.push(`${pathPrefix}: missing required '${r}'`);
      }
    }
    if (schema.properties) {
      for (const [k, def] of Object.entries(schema.properties)) {
        if (!(k in obj)) continue;
        const v = obj[k];
        const p = pathPrefix ? `${pathPrefix}.${k}` : k;
        checkValue(v, def, p);
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const k of Object.keys(obj)) {
        if (!allowed.has(k) && !(schema.additionalProperties && schema.additionalProperties.type === 'object')) {
          errors.push(`${pathPrefix}: unexpected '${k}'`);
        }
      }
    }
  }

  function checkValue(v, def, p) {
    if (def.const !== undefined && v !== def.const) errors.push(`${p}: expected const ${JSON.stringify(def.const)}, got ${JSON.stringify(v)}`);
    if (def.enum && !def.enum.includes(v)) errors.push(`${p}: ${JSON.stringify(v)} not in enum ${JSON.stringify(def.enum)}`);
    if (def.type === 'integer' && !Number.isInteger(v)) errors.push(`${p}: expected integer, got ${typeof v}`);
    if (def.type === 'string' && typeof v !== 'string')  errors.push(`${p}: expected string, got ${typeof v}`);
    if (def.type === 'object' && (v === null || typeof v !== 'object' || Array.isArray(v))) errors.push(`${p}: expected object`);
    if (def.type === 'array'  && !Array.isArray(v)) errors.push(`${p}: expected array, got ${typeof v}`);
    if (def.pattern && typeof v === 'string' && !new RegExp(def.pattern).test(v)) errors.push(`${p}: value '${v}' violates pattern '${def.pattern}'`);
    if (def.type === 'object' && def.required) checkObj(v, def, p);
    if (def.type === 'object' && def.additionalProperties && def.additionalProperties.type === 'object') {
      // map-of-object (e.g., docs)
      for (const [mk, mv] of Object.entries(v || {})) {
        checkObj(mv, def.additionalProperties, `${p}["${mk}"]`);
      }
    }
  }

  // Walk top-level allOf-style: schema may have allOf or root properties
  const root = schema.allOf ? Object.assign({}, ...schema.allOf.filter(s => s.properties)) : schema;
  checkObj(payload, root, '');
  return errors;
}

// ---- main ------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); process.exit(0); }

  const projectDir = args.projectDir;
  const fdocsDir = path.join(projectDir, 'coderef', 'foundation-docs');

  if (!fs.existsSync(fdocsDir)) {
    console.error(`[generate-meta-json] no coderef/foundation-docs/ at ${fdocsDir}`);
    process.exit(1);
  }

  const docFiles = fs.readdirSync(fdocsDir)
    .filter(n => n.endsWith('.md'))
    .sort();
  if (docFiles.length === 0) {
    console.error(`[generate-meta-json] no .md files in ${fdocsDir}`);
    process.exit(1);
  }

  const docs = {};
  let minMs = Infinity, maxMs = -Infinity;
  for (const name of docFiles) {
    const fullPath = path.join(fdocsDir, name);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;
    const meta = GENERATOR_TABLE[name] || {
      generator: 'unknown', source_artifacts: [], kind: 'auto', human_authored: false,
    };
    docs[name] = {
      last_regenerated_at: isoFromMtime(stat.mtimeMs),
      generator: meta.generator,
      source_artifacts: meta.source_artifacts,
      byte_size: stat.size,
      content_hash: sha256File(fullPath),
      kind: meta.kind,
      human_authored: meta.human_authored,
    };
    if (stat.mtimeMs < minMs) minMs = stat.mtimeMs;
    if (stat.mtimeMs > maxMs) maxMs = stat.mtimeMs;
  }

  const payload = {
    schema_version: 1,
    project_id: loadProjectId(projectDir),
    generated_by: `generate-meta-json.js@${SCRIPT_VERSION}`,
    generated_at: isoNow(),
    minimum_last_regenerated_at: isoFromMtime(minMs),
    maximum_last_regenerated_at: isoFromMtime(maxMs),
    docs,
    trigger: computeTrigger(),
  };

  // Self-validate
  const schema = loadSchema(projectDir);
  if (schema) {
    const errors = validateAgainstSchema(payload, schema);
    if (errors.length > 0) {
      console.error('[generate-meta-json] schema validation failed:');
      for (const e of errors) console.error('  -', e);
      process.exit(2);
    }
  } else {
    console.warn('[generate-meta-json] schema file missing; skipping self-validation');
  }

  // Atomic write
  const coderefDir = path.join(projectDir, '.coderef');
  fs.mkdirSync(coderefDir, { recursive: true });
  const target = path.join(coderefDir, 'foundation-docs-meta.json');
  try {
    writeJsonAtomic(target, payload);
  } catch (e) {
    console.error('[generate-meta-json] write failed:', e.message);
    process.exit(3);
  }

  console.log(`[generate-meta-json] wrote ${target} (${docFiles.length} docs, trigger.kind=${payload.trigger.kind})`);
}

main();
