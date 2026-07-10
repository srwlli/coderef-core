#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-coderef-watch
 */

/**
 * coderef-watch - Workspace file-watcher daemon for foundation-docs freshness.
 *
 * WO-CHOKIDAR-DOC-FRESHNESS-DAEMON-001.
 *
 * Watches the project workspace via chokidar, debounces file-change events,
 * and on flush invokes the unified coderef-pipeline (scan -> populate -> docs,
 * skipping the RAG leg by default). On every flush attempt, writes a heartbeat
 * to .coderef/last-scan.json atomically (temp + rename) so LLOYD can read
 * doc_age_seconds = now - last_scan_at on every pre-prompt assembly.
 *
 * Per-debounce events are appended to .coderef/watch-events.jsonl for local
 * audit. When the daemon runs inside an active CodeRef daily-agent-session,
 * events also forward to LOGS/SESSIONS/{sid}/{domain}/events.jsonl via
 * scripts/log-session-event.mjs (best-effort, non-blocking).
 *
 * Operational expectation (LLOYD constraint #1): this daemon runs in the
 * CONSUMER WORKSPACE, NOT in the LLOYD process. Each consumer machine runs one
 * coderef-watch per active workspace. See docs/DEPLOY-CODEREF-WATCH.md for
 * per-OS service-unit instructions.
 */

import chokidar from 'chokidar';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const HEARTBEAT_SCHEMA_VERSION = 1;

const DEFAULT_DEBOUNCE_MS = 30_000;
const DEFAULT_LANGUAGES = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c'];

// chokidar default ignore patterns - kept conservative; users can add more via --exclude.
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.coderef/**',         // never recurse into our own output
  '**/coderef/foundation-docs/**', // generated; would loop
  '**/__pycache__/**',
  '**/.next/**',
  '**/.venv/**',
  '**/venv/**',
];

interface CliArgs {
  projectDir: string;
  debounceMs: number;
  languages: string[];
  exclude: string[];
  skipRag: boolean;
  once: boolean;
  noPipeline: boolean;
  json: boolean;
  verbose: boolean;
  help: boolean;
  /**
   * Graph-safe incremental populate (P5, ADJ-03). When set, a flush passes its
   * debounced changed-file snapshot to `populate --changed-files` instead of a
   * full pipeline — re-scanning only changed files and resolving against the
   * persisted full fact set (byte-identical to a full rebuild).
   *
   * STUB-6TKGW7: now the DEFAULT (was opt-in / default OFF). Safe to default
   * because incremental is (a) byte-identical to a full rebuild by construction
   * and proven by the RISK-02 parity gate, (b) fail-closed — it falls back to a
   * full run() on the first flush when no fact set exists yet, and (c) as of
   * STUB-9DN53Q artifact-complete — it now refreshes docs/RAG too, not just
   * graph/index. `--full` opts back into the always-full pipeline; `--incremental`
   * is retained as an explicit no-op for back-compat with existing invocations.
   */
  incremental: boolean;
}

function printHelp(): void {
  console.log(`coderef-watch - workspace file-watcher daemon for foundation-docs freshness

USAGE:
  coderef-watch --project-dir <path> [OPTIONS]

OPTIONS:
  --project-dir <path>     Workspace root to watch (default: process.cwd()).
  --debounce-ms <n>        Debounce window in milliseconds (default: 30000).
  --languages <csv>        File extensions to watch (default: ts,tsx,js,jsx,py,go,rs,java,cpp,c).
  --exclude <csv>          Additional glob patterns to exclude (appended to defaults).
  --include-rag            Also run the RAG leg on each flush (default: skipped).
  --once                   Run the pipeline once against the current workspace and exit.
  --no-pipeline            Log change events only; do NOT spawn the pipeline.
                           Useful for debugging chokidar setup.
  --incremental            Graph-safe incremental populate (DEFAULT): pass the
                           debounced changed-file snapshot to populate
                           --changed-files (re-scan only changed files, resolve
                           against the persisted full fact set), then refresh the
                           docs (and RAG, unless --skip-rag) legs — both
                           self-incremental, so ALL artifacts stay fresh, not just
                           graph/index. Now on by default; this flag is a no-op
                           kept for back-compat. First flush (no fact set yet)
                           falls back to a full build.
  --full, --no-incremental Opt out of incremental: run the always-full pipeline
                           (scan,populate,docs[,rag]) on every flush.
  --json                   Heartbeat-only structured output to stdout (one JSON line per flush).
  -v, --verbose            Verbose logging (forwarded to coderef-pipeline).
  -h, --help               Show this help.

HEARTBEAT:
  Atomic write to {project-dir}/.coderef/last-scan.json on every flush attempt.
  Schema (v1): { schema_version, last_scan_at, paths_changed, status,
                 exit_reason, exit_code, duration_ms, pid, alive_at }

EVENTS:
  Local: appended to {project-dir}/.coderef/watch-events.jsonl.
  Session (best-effort): forwarded to LOGS/SESSIONS/{sid}/{domain}/events.jsonl
  via scripts/log-session-event.mjs when CODEREF_SESSION_ID is set.

OPERATIONAL CONSTRAINT:
  This daemon runs in the CONSUMER WORKSPACE, NOT in the LLOYD process.
  See docs/DEPLOY-CODEREF-WATCH.md for systemd / launchd / Windows Service /
  pm2 / manual-start patterns.
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectDir: process.cwd(),
    debounceMs: DEFAULT_DEBOUNCE_MS,
    languages: DEFAULT_LANGUAGES.slice(),
    exclude: [],
    skipRag: true,
    once: false,
    noPipeline: false,
    json: false,
    verbose: false,
    help: false,
    incremental: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    let key = a;
    let inlineValue: string | undefined;
    if (a.startsWith('--') && a.includes('=')) {
      const idx = a.indexOf('=');
      key = a.slice(0, idx);
      inlineValue = a.slice(idx + 1);
    }
    const next = (): string => inlineValue ?? argv[++i];

    switch (key) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '--project-dir':
      case '-p':
        args.projectDir = path.resolve(next());
        break;
      case '--debounce-ms':
        args.debounceMs = Math.max(0, parseInt(next(), 10));
        break;
      case '--languages':
      case '-l':
        args.languages = next().split(',').map((s) => s.trim()).filter(Boolean);
        break;
      case '--exclude':
        args.exclude = next().split(',').map((s) => s.trim()).filter(Boolean);
        break;
      case '--include-rag':
        args.skipRag = false;
        break;
      case '--once':
        args.once = true;
        break;
      case '--no-pipeline':
        args.noPipeline = true;
        break;
      case '--incremental':
        // STUB-6TKGW7: incremental is now the default; --incremental is retained
        // as an explicit no-op for back-compat with existing invocations.
        args.incremental = true;
        break;
      case '--full':
      case '--no-incremental':
        // Opt back into the always-full pipeline (STUB-6TKGW7 opt-out).
        args.incremental = false;
        break;
      case '--json':
      case '-j':
        args.json = true;
        break;
      case '-v':
      case '--verbose':
        args.verbose = true;
        break;
      default:
        // Ignore positional/unknown args — projectDir is set via flag.
        break;
    }
  }

  return args;
}

interface FlushResult {
  status: 'pass' | 'fail' | 'skipped';
  exit_code: number | null;
  exit_reason: string;
  duration_ms: number;
  paths_changed: string[];
}

interface Heartbeat {
  schema_version: number;
  last_scan_at: string;
  paths_changed: string[];
  status: 'pass' | 'fail' | 'skipped';
  exit_reason: string;
  exit_code: number | null;
  duration_ms: number;
  pid: number;
  alive_at: string;
  trigger: { kind: 'debounce' | 'once'; cwd: string };
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function ensureCoderefDir(projectDir: string): string {
  const dir = path.join(projectDir, '.coderef');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Atomic-ish JSON write: write to .tmp sibling then rename. POSIX rename is
 * atomic on the same filesystem; Node's fs.renameSync is atomic on Windows
 * for same-volume targets.
 */
function writeJsonAtomic(targetPath: string, payload: unknown): void {
  const tmp = targetPath + '.tmp';
  const data = JSON.stringify(payload, null, 2);
  fs.writeFileSync(tmp, data, { encoding: 'utf-8' });
  fs.renameSync(tmp, targetPath);
}

function appendJsonl(targetPath: string, payload: unknown): void {
  const line = JSON.stringify(payload) + '\n';
  fs.appendFileSync(targetPath, line, { encoding: 'utf-8' });
}

/**
 * Best-effort session-event forwarding. Spawns scripts/log-session-event.mjs
 * if CODEREF_SESSION_ID is set in the environment AND the script exists in
 * the ASSISTANT repo. Failure is silent — never blocks the daemon.
 */
function forwardSessionEvent(args: {
  sessionId: string;
  domain: string;
  type: string;
  source: string;
  summary: string;
  payload: Record<string, unknown>;
}): void {
  // Env override, else cwd-relative (resolves when the daemon runs from a
  // repo that ships scripts/log-session-event.mjs). Missing script = skip.
  const assistantScript = process.env.CODEREF_LOG_SESSION_EVENT_SCRIPT
    || path.join(process.cwd(), 'scripts', 'log-session-event.mjs');
  if (!fs.existsSync(assistantScript)) return;
  try {
    spawnSync('node', [
      assistantScript,
      `--session-id=${args.sessionId}`,
      `--domain=${args.domain}`,
      `--type=${args.type}`,
      `--source=${args.source}`,
      `--summary=${args.summary}`,
      `--payload=${JSON.stringify(args.payload)}`,
    ], { stdio: 'ignore', timeout: 10_000 });
  } catch {
    // best-effort
  }
}

function runPipeline(opts: {
  projectDir: string;
  skipRag: boolean;
  verbose: boolean;
}): FlushResult {
  const start = Date.now();
  const legs = opts.skipRag ? 'scan,populate,docs' : 'scan,populate,docs,rag';
  const result = spawnPipelineLegs(opts.projectDir, legs, opts.verbose);

  const duration = Date.now() - start;
  if (result.error) {
    return {
      status: 'fail',
      exit_code: null,
      exit_reason: `spawn_error: ${String(result.error.message)}`,
      duration_ms: duration,
      paths_changed: [],
    };
  }
  const code = typeof result.status === 'number' ? result.status : null;
  return {
    status: code === 0 ? 'pass' : 'fail',
    exit_code: code,
    exit_reason: code === 0 ? 'pipeline_ok' : `pipeline_exit_${code}`,
    duration_ms: duration,
    paths_changed: [],
  };
}

/**
 * Run one subset of the pipeline legs (`coderef-pipeline --only <legs>`) with the
 * same bin-then-dist-fallback spawn logic runPipeline uses. Returns the spawn
 * result so callers can inspect status/error. Shared by runPipeline (full flush)
 * and runIncrementalPopulate's docs/rag refresh leg (STUB-9DN53Q).
 */
function spawnPipelineLegs(projectDir: string, legs: string, verbose: boolean) {
  const buildArgs = (bin: string): string[] => {
    const a = [bin, '--project-dir', projectDir, '--only', legs];
    if (verbose) a.push('--verbose');
    return a;
  };
  let result = spawnSync('npx', buildArgs('coderef-pipeline'), {
    cwd: projectDir,
    encoding: 'utf-8',
    timeout: 600_000,
    shell: process.platform === 'win32',
  });
  if (result.error || (result.status !== 0 && result.status !== null)) {
    const distPath = path.join(__dirname, 'coderef-pipeline.js');
    if (fs.existsSync(distPath)) {
      result = spawnSync('node', buildArgs(distPath), {
        cwd: projectDir,
        encoding: 'utf-8',
        timeout: 600_000,
      });
    }
  }
  return result;
}

/**
 * Graph-safe incremental flush (P5, ADJ-03). Route the debounced changed-file
 * snapshot to `populate --changed-files` (existing files) / `--deleted-files`
 * (paths that no longer exist), which re-scans only those files and resolves
 * against the persisted full fact set. On the first flush (no fact set yet) the
 * orchestrator transparently falls back to a full build.
 *
 * STUB-9DN53Q: after the incremental populate succeeds, refresh the docs (and,
 * unless skipRag, the RAG) legs so a purely-incremental watch does not leave
 * docs/RAG stale. Both legs are already incremental by construction: docs
 * regenerate from the just-updated graph/index, and the RAG leg's
 * indexing-orchestrator drives an IncrementalIndexer that hash-filters chunks —
 * only changed files re-embed, stale vectors (deleted files / old chunks of
 * modified files) are pruned — so this is NOT a full-corpus rebuild. The
 * docs/rag legs run via coderef-pipeline (--only docs[,rag]); a docs/rag failure
 * is surfaced in exit_reason but does NOT mask a successful graph/index
 * populate (the artifacts an agent queries are already fresh).
 */
function runIncrementalPopulate(opts: {
  projectDir: string;
  snapshot: string[];
  skipRag: boolean;
  verbose: boolean;
}): FlushResult {
  const start = Date.now();
  const changed = opts.snapshot.filter(p => fs.existsSync(p));
  const deleted = opts.snapshot.filter(p => !fs.existsSync(p));

  const buildArgs = (bin: string): string[] => {
    const a = [bin, '--project-dir', opts.projectDir];
    if (changed.length > 0) a.push('--changed-files', changed.join(','));
    if (deleted.length > 0) a.push('--deleted-files', deleted.join(','));
    if (opts.verbose) a.push('--verbose');
    return a;
  };

  // Prefer the bin (npx populate-coderef), fall back to the sibling dist path.
  let result = spawnSync('npx', buildArgs('populate-coderef'), {
    cwd: opts.projectDir,
    encoding: 'utf-8',
    timeout: 600_000,
    shell: process.platform === 'win32',
  });
  if (result.error || (result.status !== 0 && result.status !== null)) {
    const distPath = path.join(__dirname, 'populate.js');
    if (fs.existsSync(distPath)) {
      result = spawnSync('node', buildArgs(distPath), {
        cwd: opts.projectDir,
        encoding: 'utf-8',
        timeout: 600_000,
      });
    }
  }

  if (result.error) {
    return {
      status: 'fail',
      exit_code: null,
      exit_reason: `spawn_error: ${String(result.error.message)}`,
      duration_ms: Date.now() - start,
      paths_changed: [],
    };
  }
  const code = typeof result.status === 'number' ? result.status : null;
  if (code !== 0) {
    return {
      status: 'fail',
      exit_code: code,
      exit_reason: `incremental_exit_${code}`,
      duration_ms: Date.now() - start,
      paths_changed: [],
    };
  }

  // Populate (graph/index) succeeded. STUB-9DN53Q: refresh docs (+ rag unless
  // skipped) so the incremental watch keeps ALL artifacts fresh, not just the
  // graph/index. Both legs self-incrementalize (see the doc comment). A docs/rag
  // failure is reported but does not fail the flush — the graph/index an agent
  // queries is already up to date; docs/rag staleness is the lesser fault.
  const legs = opts.skipRag ? 'docs' : 'docs,rag';
  const docsRag = spawnPipelineLegs(opts.projectDir, legs, opts.verbose);
  const docsRagCode =
    typeof docsRag.status === 'number' ? docsRag.status : null;
  const docsRagOk = !docsRag.error && docsRagCode === 0;

  return {
    status: 'pass',
    exit_code: code,
    exit_reason: docsRagOk
      ? `incremental_ok(+${legs})`
      : `incremental_ok(graph/index); ${legs}_stale(${docsRag.error ? `spawn_error: ${String(docsRag.error.message)}` : `exit_${docsRagCode}`})`,
    duration_ms: Date.now() - start,
    paths_changed: [],
  };
}

function writeHeartbeat(opts: {
  projectDir: string;
  result: FlushResult;
  paths: string[];
  triggerKind: 'debounce' | 'once';
  json: boolean;
}): Heartbeat {
  const dir = ensureCoderefDir(opts.projectDir);
  const target = path.join(dir, 'last-scan.json');
  const heartbeat: Heartbeat = {
    schema_version: HEARTBEAT_SCHEMA_VERSION,
    last_scan_at: nowIso(),
    paths_changed: opts.paths,
    status: opts.result.status,
    exit_reason: opts.result.exit_reason,
    exit_code: opts.result.exit_code,
    duration_ms: opts.result.duration_ms,
    pid: process.pid,
    alive_at: nowIso(),
    trigger: { kind: opts.triggerKind, cwd: opts.projectDir },
  };
  writeJsonAtomic(target, heartbeat);

  const eventsPath = path.join(dir, 'watch-events.jsonl');
  appendJsonl(eventsPath, heartbeat);

  if (opts.json) {
    process.stdout.write(JSON.stringify(heartbeat) + '\n');
  } else {
    const ageNote = opts.result.status === 'pass'
      ? `[coderef-watch] flush ok in ${opts.result.duration_ms}ms (${opts.paths.length} paths)`
      : `[coderef-watch] flush ${opts.result.status} (${opts.result.exit_reason}) after ${opts.result.duration_ms}ms`;
    console.log(ageNote);
  }
  return heartbeat;
}

async function runOnce(args: CliArgs): Promise<number> {
  const result = args.noPipeline
    ? { status: 'skipped' as const, exit_code: 0, exit_reason: 'no_pipeline_flag', duration_ms: 0, paths_changed: [] }
    : runPipeline({ projectDir: args.projectDir, skipRag: args.skipRag, verbose: args.verbose });
  const hb = writeHeartbeat({
    projectDir: args.projectDir,
    result,
    paths: [],
    triggerKind: 'once',
    json: args.json,
  });
  forwardSessionEvent({
    sessionId: process.env.CODEREF_SESSION_ID || 'unknown-session',
    domain: process.env.CODEREF_AGENT_DOMAIN || 'CODEREF-CORE',
    type: 'coderef_watch_flush',
    source: 'coderef-watch',
    summary: `coderef-watch --once: ${hb.status}`,
    payload: { ...hb, project_dir: args.projectDir },
  });
  // skipped (--no-pipeline) is intentional, not a failure.
  return hb.status === 'fail' ? 1 : 0;
}

async function runDaemon(args: CliArgs): Promise<number> {
  if (!args.json) {
    console.log(`[coderef-watch] starting daemon (project-dir=${args.projectDir}, debounce-ms=${args.debounceMs})`);
  }
  ensureCoderefDir(args.projectDir);

  const exclude = [...DEFAULT_EXCLUDE, ...args.exclude];
  const patterns = args.languages.map((lang) => `**/*.${lang}`);

  const watcher = chokidar.watch(patterns, {
    cwd: args.projectDir,
    ignored: exclude,
    persistent: true,
    ignoreInitial: true,           // don't fire on startup; debounce only on real edits
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  const pendingChanges = new Set<string>();
  let timer: NodeJS.Timeout | null = null;
  let inFlight = false;

  const scheduleFlush = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, args.debounceMs);
  };

  const flush = async (): Promise<void> => {
    if (inFlight) {
      // Re-arm and let the in-flight flush complete; subsequent edits will batch.
      scheduleFlush();
      return;
    }
    inFlight = true;
    const snapshot = Array.from(pendingChanges).sort();
    pendingChanges.clear();
    try {
      const result = args.noPipeline
        ? { status: 'skipped' as const, exit_code: 0, exit_reason: 'no_pipeline_flag', duration_ms: 0, paths_changed: snapshot }
        : args.incremental
          ? runIncrementalPopulate({ projectDir: args.projectDir, snapshot, skipRag: args.skipRag, verbose: args.verbose })
          : runPipeline({ projectDir: args.projectDir, skipRag: args.skipRag, verbose: args.verbose });
      const hb = writeHeartbeat({
        projectDir: args.projectDir,
        result: { ...result, paths_changed: snapshot },
        paths: snapshot,
        triggerKind: 'debounce',
        json: args.json,
      });
      forwardSessionEvent({
        sessionId: process.env.CODEREF_SESSION_ID || 'unknown-session',
        domain: process.env.CODEREF_AGENT_DOMAIN || 'CODEREF-CORE',
        type: 'coderef_watch_flush',
        source: 'coderef-watch',
        summary: `coderef-watch flush: ${hb.status} (${snapshot.length} paths)`,
        payload: { ...hb, project_dir: args.projectDir },
      });
    } finally {
      inFlight = false;
    }
  };

  watcher
    .on('ready', () => {
      if (!args.json) console.log('[coderef-watch] ready');
    })
    .on('add', (p) => { pendingChanges.add(p); scheduleFlush(); })
    .on('change', (p) => { pendingChanges.add(p); scheduleFlush(); })
    .on('unlink', (p) => { pendingChanges.add(p); scheduleFlush(); })
    .on('error', (err) => {
      console.error('[coderef-watch] watcher error:', err);
    });

  // Graceful shutdown
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (!args.json) console.log(`[coderef-watch] received ${signal}, shutting down`);
    if (timer) clearTimeout(timer);
    try { await watcher.close(); } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

  // Block forever (until SIGINT/SIGTERM).
  return new Promise<number>(() => { /* never resolves */ });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  try {
    fs.accessSync(args.projectDir);
  } catch {
    console.error(`[coderef-watch] project-dir not found: ${args.projectDir}`);
    process.exit(2);
  }

  const exit = args.once ? await runOnce(args) : await runDaemon(args);
  process.exit(exit);
}

main().catch((err) => {
  console.error('[coderef-watch] fatal:', err);
  process.exit(1);
});
