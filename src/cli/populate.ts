#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-populate
 */

/**
 * WO-UNIFIED-CODEREF-PIPELINE-001: Populate CLI Command
 * Generates all .coderef/ output files using unified pipeline
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import type { PipelineState } from '../pipeline/types.js';
import { validatePipelineState } from '../pipeline/output-validator.js';
import { loadLayerEnum } from '../pipeline/element-taxonomy.js';
import { IndexGenerator } from '../pipeline/generators/index-generator.js';
import { GraphGenerator } from '../pipeline/generators/graph-generator.js';
import { ComplexityGenerator } from '../pipeline/generators/complexity-generator.js';
import { PatternGenerator } from '../pipeline/generators/pattern-generator.js';
import { CoverageGenerator } from '../pipeline/generators/coverage-generator.js';
import { DriftGenerator } from '../pipeline/generators/drift-generator.js';
import { ValidationGenerator } from '../pipeline/generators/validation-generator.js';
import { DiagramGenerator } from '../pipeline/generators/diagram-generator.js';
import { ExportGenerator } from '../pipeline/generators/export-generator.js';
import { ContextGenerator } from '../pipeline/generators/context-generator.js';
import { RegistryGenerator } from '../pipeline/generators/registry-generator.js';
import {
  detectProjectLanguages,
  formatSupportedLanguages,
  validateCliLanguages,
} from './detect-languages.js';
import { HeaderGenerator } from '../semantic/header-generator.js';
import { buildSemanticElementsFromState } from '../pipeline/semantic-elements.js';
import { minimatch } from 'minimatch';
import { decodeScipIndex, type ScipIndex } from '../integration/scip/scip-schema.js';

export interface CliArgs {
  projectDir: string;
  languages?: string[];
  output?: string;
  verbose: boolean;
  json: boolean;
  skip?: string[];
  parallel: boolean;
  help: boolean;
  mode: 'full' | 'minimal' | 'context';
  select?: string[];
  semanticRegistry: boolean;
  sourceHeaders: boolean;
  overwriteHeaders: boolean;
  /**
   * STUB-QDXGBA: scope the header refresh to ONLY files with a stale header
   * (headerStatus==='stale', i.e. @exports disagrees with the AST). Implies
   * --overwrite-headers. Without this, --overwrite-headers rewrites EVERY file's
   * header block, which can churn dozens of unrelated files (@used_by refreshes +
   * CRLF re-normalization) when only a handful are actually stale — the P7
   * blast-radius trap. --stale-only regenerates just the drifted files.
   */
  staleOnly: boolean;
  strictHeaders: boolean;
  /**
   * When true, fail (exit 1) if header coverage is below `coverageFloor`.
   * This is the scan-time prevention layer of
   * WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001 (P3): a header-less
   * codebase can no longer produce a "green" populate run. Off by default
   * (non-breaking); opt in via --enforce-headers.
   */
  enforceHeaders: boolean;
  /** Coverage floor (0-100) for --enforce-headers. Default 100. */
  coverageFloor: number;
  /**
   * Graph-safe incremental populate (P5, ADJ-03). When a changed-file list is
   * supplied, re-scan ONLY those files and resolve against the persisted full
   * fact set (falls back to a full build if none exists). Absolute or
   * project-relative paths, comma-separated. The watcher passes its debounced
   * snapshot here. Deleted files go in `deletedFiles`.
   */
  changedFiles?: string[];
  deletedFiles?: string[];
  /**
   * Path-scope allowlist for --source-headers (WO-ADD-A-PATH-SCOPE-ALLOWLIST-
   * DENYLIST-TO-POPULATE-001, STUB-4JDQXX). Comma-separated globs matched against
   * the PROJECT-RELATIVE file path (e.g. `scripts/**`). When set, --source-headers
   * writes a header ONLY into files matching at least one include glob. Unset =
   * no allowlist = every discovered file is eligible (today's behavior). Scopes
   * the header WRITE loop only — graph/index/registry output is unchanged.
   */
  include?: string[];
  /**
   * Path-scope denylist for --source-headers (companion to `include`). Comma-
   * separated globs matched against the project-relative file path. A file
   * matching any exclude glob is skipped. Composes with `include` and
   * `--stale-only` as AND: a file is written iff it matches include (if set)
   * AND is not excluded AND (if --stale-only) is stale.
   */
  exclude?: string[];
  /**
   * Opt-in SCIP live resolution overlay (WO-DECOMPOSE-CODEREF-MCP-SERVER-
   * MONOLITH-001 Phase 2, STUB-BQQJSY). Path to a .scip index emitted by an
   * external indexer (e.g. `npx @sourcegraph/scip-typescript index`, local, no
   * cloud). When set, populate DECODES the .scip here (upstream of the
   * resolver, keeping it file-IO-free per AC-09) and threads the decoded index
   * into the pipeline; a post-Phase-5 overlay flips co-located unresolved/
   * ambiguous edges to resolved with SCIP provenance (evidence.kind:'scip',
   * confidence tier 'heuristic') — ONLY when the reference's symbol maps via
   * its SCIP definition occurrence to exactly one graph node, whose real id is
   * stamped as targetId (GI-3/GI-2 hold by construction; unmappable references
   * flip nothing). Already-resolved edges are NEVER touched and
   * no edges are invented — no-regress by construction. Absolute or
   * project-relative. Unset (the default) = no overlay = unchanged behavior. A
   * missing/unreadable/undecodable file degrades to a stderr warning + no
   * overlay (never a crash).
   */
  scip?: string;
}

interface GeneratorRunner {
  name: string;
  instance: {
    generate(state: PipelineState, outputDir: string): Promise<void>;
  };
}

/**
 * Compact result of a populate run (WO-...-CLI-MCP-PARITY-001 P6). Returned by
 * runPopulate() so the MCP `reindex` tool can report what happened WITHOUT
 * re-parsing stdout or spawning the CLI. Side effects (the .coderef/ writes)
 * are unchanged — this is purely additive telemetry alongside them.
 */
export interface PopulateSummary {
  /** true when every generator ran without failure. */
  success: boolean;
  /** Absolute `.coderef/` (or --output) directory the artifacts were written to. */
  outputPath: string;
  /** Languages the pipeline actually scanned. */
  languagesUsed: string[];
  /** Elements extracted (from state.metadata). */
  elements: number;
  /** Source files scanned. */
  files: number;
  /** Total graph edges emitted (resolved + non-resolved). */
  edges: number;
  /** Wall-clock duration of the run, ms. */
  durationMs: number;
  /** Names of generators that failed (empty on a clean run). */
  failures: string[];
}

/**
 * CliArgs with the SAME defaults parseArgs() applies, for programmatic callers
 * (MCP `reindex`) that never touch argv. The MCP handler overrides only
 * projectDir and (via changedFiles) the incremental toggle; every other field
 * matches a bare `populate-coderef` invocation so the delegated pipeline
 * behaves identically. json:true keeps the pipeline on its stdout-quiet path
 * as a belt-and-suspenders alongside programmatic mode.
 */
export function defaultPopulateArgs(projectDir: string): CliArgs {
  return {
    projectDir,
    verbose: false,
    json: true,
    parallel: false,
    help: false,
    mode: 'full',
    semanticRegistry: true,
    sourceHeaders: false,
    overwriteHeaders: false,
    staleOnly: false,
    strictHeaders: false,
    enforceHeaders: false,
    coverageFloor: 100,
    include: undefined,
    exclude: undefined,
    scip: undefined,
  };
}

interface GeneratorFailure {
  name: string;
  message: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectDir: process.cwd(),
    verbose: false,
    json: false,
    parallel: false,
    help: false,
    mode: 'full',
    semanticRegistry: true,
    sourceHeaders: false,
    overwriteHeaders: false,
    staleOnly: false,
    strictHeaders: false,
    enforceHeaders: false,
    coverageFloor: 100,
    include: undefined,
    exclude: undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // Support --flag=value for the coverage floor.
    let inlineValue: string | undefined;
    if (arg.startsWith('--') && arg.includes('=')) {
      inlineValue = arg.split('=', 2)[1];
    }

    switch (arg.includes('=') ? arg.split('=', 2)[0] : arg) {
      case '--help':
      case '-h':
        args.help = true;
        break;

      case '--lang':
      case '-l':
        args.languages = argv[++i].split(',');
        break;

      case '--output':
      case '-o':
        args.output = argv[++i];
        break;

      case '--verbose':
      case '-v':
        args.verbose = true;
        break;

      case '--json':
      case '-j':
        args.json = true;
        break;

      case '--skip':
      case '-s':
        args.skip = argv[++i].split(',');
        break;

      case '--parallel':
      case '-p':
        args.parallel = true;
        break;

      case '--mode':
      case '-m':
        const mode = argv[++i] as any;
        if (['full', 'minimal', 'context'].includes(mode)) {
          args.mode = mode;
        } else {
          console.warn(`[populate-coderef] Invalid mode: ${mode}. Defaulting to 'full'.`);
        }
        break;

      case '--select':
        args.select = argv[++i].split(',');
        break;

      case '--changed-files':
        // Graph-safe incremental (P5): re-scan only these files, resolve against
        // the persisted full fact set. Empty entries dropped.
        args.changedFiles = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
        break;

      case '--deleted-files':
        args.deletedFiles = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
        break;

      case '--include':
        // Path-scope allowlist for --source-headers (STUB-4JDQXX). Comma-split
        // globs matched against the project-relative file path. Pure filter — it
        // does NOT imply --source-headers (unlike --stale-only); scoping without
        // --source-headers is a no-op, matching the --changed-files precedent.
        args.include = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
        break;

      case '--exclude':
        // Path-scope denylist for --source-headers (companion to --include).
        args.exclude = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
        break;

      case '--scip':
        // Opt-in SCIP live resolution overlay (STUB-BQQJSY). Path to a .scip
        // index; decoded upstream in runPopulate and threaded into the pipeline.
        args.scip = (inlineValue ?? argv[++i])?.trim() || undefined;
        break;

      case '--semantic':
      case '--semantic-registry':
        args.semanticRegistry = true;
        break;

      case '--no-semantic-registry':
        args.semanticRegistry = false;
        break;

      case '--source-headers':
        args.sourceHeaders = true;
        break;

      case '--overwrite-headers':
        args.sourceHeaders = true;
        args.overwriteHeaders = true;
        break;

      case '--stale-only':
        // STUB-QDXGBA: refresh ONLY stale-header files. Implies the overwrite
        // path (you can only fix a stale header by rewriting it) which itself
        // implies --source-headers.
        args.sourceHeaders = true;
        args.overwriteHeaders = true;
        args.staleOnly = true;
        break;

      case '--strict-headers':
        args.strictHeaders = true;
        break;

      case '--enforce-headers':
        args.enforceHeaders = true;
        break;

      case '--coverage-floor': {
        const raw = inlineValue ?? argv[++i];
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0 && n <= 100) {
          args.coverageFloor = n;
        } else {
          console.error(
            `[populate-coderef] Invalid --coverage-floor: ${raw}. Expected 0-100.`,
          );
          process.exit(1);
        }
        break;
      }

      default:
        if (!arg.startsWith('-')) {
          args.projectDir = arg;
        }
    }
  }

  return args;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
populate-coderef - Generate all .coderef/ output files

USAGE:
  populate-coderef [OPTIONS] [PROJECT_DIR]

OPTIONS:
  -l, --lang <languages>       Comma-separated languages (default: auto-detect from repo)
  -o, --output <path>          Output directory override (default: .coderef)
  -v, --verbose                Enable verbose logging
  -m, --mode <mode>            Scanning mode: full, minimal, context (default: full)
  --select <generators>        Run only specific generators (overrides mode)
  -s, --skip <generators>      Skip specific generators
  -j, --json                   Output progress as JSON
  -p, --parallel               Enable parallel generator execution
  --semantic-registry          Generate semantic-registry.json projection (default: on)
  --no-semantic-registry       Skip semantic-registry.json projection
  --source-headers             Write optional CodeRef-Semantics headers into source files (default: off)
  --overwrite-headers          Re-write EVERY file's header even if present (refreshes headers; may churn many files)
  --stale-only                 Refresh ONLY stale-header files (@exports drifted from AST); implies --overwrite-headers.
                               Avoids the full-repo rewrite/CRLF churn of a blanket --overwrite-headers pass.
  --include <globs>            Scope --source-headers writes to files matching these comma-separated globs
                               (allowlist, e.g. scripts/**,src/api/**). Matched against project-relative paths.
                               Filters the header WRITE only — graph/index/registry output is unchanged.
  --exclude <globs>            Skip --source-headers writes for files matching these comma-separated globs
                               (denylist). Composes with --include and --stale-only as AND.
  --scip <path>                Opt-in SCIP live resolution overlay. Path to a .scip index (e.g. from
                               \`npx @sourcegraph/scip-typescript index\`, local, no cloud). Flips co-located
                               unresolved/ambiguous call edges to resolved with SCIP provenance (heuristic
                               tier) when the symbol's definition maps to exactly one graph node (its real
                               id becomes targetId; unmappable references are left untouched). Never touches
                               resolved edges, never invents edges (no-regress). Unset
                               = no overlay. A missing/undecodable file warns and continues without it.
  -h, --help                   Show this help message

MODES:
  full       - All generators (standard behavior)
  minimal    - Core only (index, graph, registry)
  context    - RAG context only (index, registry, context, complexity [slim])

GENERATORS:
  index        - index.json (element inventory)
  graph        - graph.json (dependency graph)
  registry     - registry/entities.json (UUID deduplication)
  complexity   - reports/complexity/ (metrics)
  patterns     - reports/patterns.json (code patterns)
  coverage     - reports/coverage.json (test coverage)
  drift        - reports/drift.json (staleness detection)
  validation   - reports/validation.json (CodeRef2 validation)
  diagrams     - diagrams/*.mmd, *.dot (visual graphs)
  exports      - exports/graph.json, graph.jsonld
  context      - context.json, context.md (project overview)

EXAMPLES:
  # Scan current directory (minimal mode)
  populate-coderef --mode minimal

  # Run only graph and registry
  populate-coderef --select graph,registry

  # Write headers into owned files only (path-scope allowlist)
  populate-coderef --source-headers --include scripts/**,ORCHESTRATOR/**,ENGINES/**

  # Lift resolution with a SCIP index (opt-in overlay)
  npx @sourcegraph/scip-typescript index --output .coderef/scip/index.scip
  populate-coderef --scip .coderef/scip/index.scip
`);
}

async function runGenerator(
  generator: GeneratorRunner,
  state: PipelineState,
  outputDir: string,
  generatorTimings: Record<string, number>,
  failures: GeneratorFailure[],
  verbose: boolean,
  json: boolean
): Promise<void> {
  const genStart = Date.now();

  try {
    if (verbose && !json) {
      console.log(`[populate-coderef] Running generator: ${generator.name}`);
    }

    await generator.instance.generate(state, outputDir);
    generatorTimings[generator.name] = Date.now() - genStart;
  } catch (error) {
    generatorTimings[generator.name] = Date.now() - genStart;

    const message = error instanceof Error ? error.message : String(error);
    failures.push({ name: generator.name, message });

    if (!json) {
      console.error(`[populate-coderef] Generator failed: ${generator.name} - ${message}`);
    }
  }
}

/**
 * Run pipeline and generate all outputs.
 *
 * WO-...-CLI-MCP-PARITY-001 P6: the pipeline body was EXTRACTED out of the
 * former non-exported `run()` into this exported function so the MCP `reindex`
 * tool can drive the SAME code path (which already writes ONLY under
 * `<projectDir>/.coderef/`) and get back a compact PopulateSummary — never a
 * new write path or an arbitrary output dir.
 *
 * `opts.programmatic` (default false = CLI behavior) toggles the two seams that
 * a long-lived MCP server cannot tolerate:
 *  - process.exit(...) becomes `throw` (a killed server is not an option).
 *  - the trailing stdout summary line is suppressed (stdout belongs to the MCP
 *    transport). All other diagnostics already go to stderr.
 * CLI behavior is byte-for-byte unchanged: run() calls this with programmatic
 * false and still owns the final process.exit.
 */
export async function runPopulate(
  args: CliArgs,
  opts: { programmatic?: boolean } = {},
): Promise<PopulateSummary> {
  const programmatic = opts.programmatic ?? false;
  const startTime = Date.now();

  // In programmatic mode a fatal condition throws (caught by the MCP handler)
  // instead of exiting the process; in CLI mode it exits as before.
  const halt = (code: number, message?: string): never => {
    if (programmatic) {
      throw new Error(message ?? `populate halted with code ${code}`);
    }
    process.exit(code);
  };

  {
    // Ensure project directory exists
    await fs.access(args.projectDir);

    const outputDir = args.output || path.join(args.projectDir, '.coderef');
    const explicitLanguages = validateCliLanguages(args.languages);
    const languages = explicitLanguages ?? await detectProjectLanguages(args.projectDir);
    const languagesWereAutoDetected = explicitLanguages === undefined;

    if (languages.length === 0) {
      throw new Error(
        `No supported source files were detected in ${args.projectDir}.`
      );
    }

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // SCIP live overlay (opt-in --scip, STUB-BQQJSY). Decode the .scip HERE —
    // upstream of the pipeline — so the resolver stays file-IO-free (AC-09). The
    // decoded index is threaded into pipelineOpts.scipIndex; the orchestrator's
    // post-Phase-5 overlay flips co-located unresolved/ambiguous edges. Failure
    // (missing / unreadable / undecodable) degrades to a stderr warning + no
    // overlay — never a crash, matching the read-only delta's ABSENCE=NO-DATA.
    let scipIndex: ScipIndex | undefined;
    if (args.scip) {
      const scipPath = path.isAbsolute(args.scip)
        ? args.scip
        : path.resolve(args.projectDir, args.scip);
      try {
        const bytes = await fs.readFile(scipPath);
        scipIndex = decodeScipIndex(bytes);
        if (!args.json) {
          console.error(
            `[populate-coderef] SCIP overlay enabled: ${scipIndex.documents.length} ` +
              `document(s) from ${scipPath}`,
          );
        }
      } catch (e) {
        console.error(
          `[populate-coderef] --scip: could not read/decode ${scipPath} ` +
            `(${e instanceof Error ? e.message : String(e)}); continuing WITHOUT the overlay.`,
        );
        scipIndex = undefined;
      }
    }

    // Run pipeline. Graph-safe incremental (P5, ADJ-03) when --changed-files is
    // supplied: re-scan only those files and resolve against the persisted full
    // fact set (falls back to a full build if none exists). Otherwise a normal
    // full build (which also (re)persists the fact set for the next delta).
    const orchestrator = new PipelineOrchestrator();
    const pipelineOpts = {
      languages,
      verbose: args.verbose && !args.json,
      outputDir,
      mode: args.mode,
      select: args.select,
      scipIndex,
    };
    const toAbs = (p: string): string => (path.isAbsolute(p) ? p : path.resolve(args.projectDir, p));
    const state =
      args.changedFiles && args.changedFiles.length > 0
        ? await orchestrator.runIncremental(
            args.projectDir,
            args.changedFiles.map(toAbs),
            pipelineOpts,
            (args.deletedFiles ?? []).map(toAbs),
          )
        : await orchestrator.run(args.projectDir, pipelineOpts);

    // Phase 6 chokepoint (R-PHASE-6-A). Single validation surface preceding
    // every write. On ok=false: log errors, skip generators, exit 1. On
    // ok=true with warnings: log warnings to stderr, continue. The validator
    // is pure (no fs, no process.exit, no console).
    //
    // Safeguard (ORCHESTRATOR design call 3): fail BEFORE the validator if
    // loadLayerEnum() throws — passing layerEnum:[] would fail every
    // defined-status file's SH-1 check spuriously. Halt early with a clear
    // stderr message instead.
    let layerEnum: readonly string[];
    try {
      layerEnum = loadLayerEnum();
    } catch (e) {
      console.error(
        `[populate-coderef] Failed to load layer enum from STANDARDS/layers.json: ${e instanceof Error ? e.message : String(e)}`,
      );
      halt(1, 'Failed to load layer enum from STANDARDS/layers.json');
    }
    const validation = validatePipelineState(state, state.graph, {
      strictHeaders: args.strictHeaders,
      layerEnum,
    });
    if (!validation.ok) {
      for (const err of validation.errors) {
        const offender = err.offendingId ?? err.offendingFile ?? '<unknown>';
        console.error(
          `[validation error ${err.kind} ${err.check}] ${offender} ${JSON.stringify(err.details)}`,
        );
      }
      halt(1, `pipeline validation failed with ${validation.errors.length} error(s)`);
    }
    for (const warn of validation.warnings) {
      console.error(
        `[validation warning ${warn.check}] ${warn.offendingFile ?? '<unknown>'} ${JSON.stringify(warn.details)}`,
      );
    }

    // Header-coverage summary (WO-RAG-HEADER-COVERAGE-ENFORCE-AND-SURFACE-001
    // P2, option C). The coverage number already lives in
    // validation.report.header_coverage_pct (Phase 1) but was previously
    // only written to validation-report.json on disk, so silent coverage
    // degradation was invisible to anyone running populate-coderef. Print it
    // — plus a one-line breakdown of the header-less files that the RAG
    // indexer will later EXCLUDE — so the degradation is observable at scan
    // time, not just on a manual audit.
    {
      const r = validation.report;
      const total =
        r.header_defined_count +
        r.header_missing_count +
        r.header_stale_count +
        r.header_partial_count;
      // Diagnostics go to stderr — stdout must stay machine-parseable for
      // --json consumers (populate-cli.test.ts JSON.parse regression,
      // WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 P1-T3).
      console.error(
        `[header coverage] ${r.header_coverage_pct}% ` +
          `(defined ${r.header_defined_count} / total ${total})`,
      );
      if (r.header_missing_count + r.header_stale_count + r.header_partial_count > 0) {
        console.error(
          `[header coverage] header-less files (excluded from RAG index): ` +
            `missing ${r.header_missing_count}, stale ${r.header_stale_count}, ` +
            `partial ${r.header_partial_count}`,
        );
      }

      // Stamp-on-write prevention gate (P3, option A). When --enforce-headers
      // is set, coverage below the floor is a HARD failure — a header-less
      // codebase can no longer produce a green populate run, so new files
      // added without a header are caught at scan time rather than silently
      // dropped from the RAG index later. Off by default (non-breaking);
      // floor defaults to 100 when enabled.
      if (args.enforceHeaders && r.header_coverage_pct < args.coverageFloor) {
        console.error(
          `[populate-coderef] --enforce-headers: header coverage ` +
            `${r.header_coverage_pct}% is below the required floor of ` +
            `${args.coverageFloor}%. ${r.header_missing_count} missing, ` +
            `${r.header_stale_count} stale, ${r.header_partial_count} partial. ` +
            `Run \`populate-coderef ${args.projectDir} --source-headers\` to ` +
            `stamp @coderef-semantic headers, then retry.`,
        );
        halt(1, `header coverage ${r.header_coverage_pct}% below floor ${args.coverageFloor}%`);
      }
    }

    // Initialize all generators
    const generators: GeneratorRunner[] = [
      { name: 'index', instance: new IndexGenerator() },
      { name: 'graph', instance: new GraphGenerator() },
      { name: 'registry', instance: new RegistryGenerator() },
      { name: 'complexity', instance: new ComplexityGenerator() },
      { name: 'patterns', instance: new PatternGenerator() },
      { name: 'coverage', instance: new CoverageGenerator() },
      { name: 'drift', instance: new DriftGenerator() },
      { name: 'validation', instance: new ValidationGenerator() },
      { name: 'diagrams', instance: new DiagramGenerator() },
      { name: 'exports', instance: new ExportGenerator() },
      { name: 'context', instance: new ContextGenerator() },
    ];

    // Determine which generators to run
    let activeGeneratorNames: string[] = [];

    if (args.select) {
      activeGeneratorNames = args.select;
    } else {
      switch (args.mode) {
        case 'minimal':
          activeGeneratorNames = ['index', 'graph', 'registry'];
          break;
        case 'context':
          activeGeneratorNames = ['index', 'registry', 'context', 'complexity'];
          break;
        case 'full':
        default:
          activeGeneratorNames = generators.map(g => g.name);
          break;
      }
    }

    // Filter by active names and excluded skips
    const activeGenerators = generators.filter(
      gen => activeGeneratorNames.includes(gen.name) && !args.skip?.includes(gen.name)
    );

    // Run generators
    const generatorTimings: Record<string, number> = {};
    const failures: GeneratorFailure[] = [];

    if (args.parallel) {
      await Promise.all(
        activeGenerators.map(gen => runGenerator(gen, state, outputDir, generatorTimings, failures, args.verbose, args.json))
      );
    } else {
      for (const gen of activeGenerators) {
        await runGenerator(gen, state, outputDir, generatorTimings, failures, args.verbose, args.json);
      }
    }

    // Phase 6 (DR-PHASE-6-C): write validation-report.json and patch
    // index.json with the validation pointer. Only on ok=true (we exited
    // earlier when ok=false). Failure to write the report is logged but
    // does not change exit code — the graph artifacts already shipped.
    try {
      const reportPath = path.join(outputDir, 'validation-report.json');
      await fs.writeFile(reportPath, JSON.stringify(validation.report, null, 2), 'utf-8');
      const indexPath = path.join(outputDir, 'index.json');
      try {
        const indexRaw = await fs.readFile(indexPath, 'utf-8');
        const indexParsed = JSON.parse(indexRaw);
        if (Array.isArray(indexParsed)) {
          await fs.writeFile(
            path.join(outputDir, 'index.validation.json'),
            JSON.stringify(
              { report_path: './validation-report.json', status: 'pass' },
              null,
              2,
            ),
            'utf-8',
          );
        } else if (typeof indexParsed === 'object' && indexParsed !== null) {
          (indexParsed as Record<string, unknown>).validation = {
            report_path: './validation-report.json',
            status: 'pass',
          };
          await fs.writeFile(indexPath, JSON.stringify(indexParsed, null, 2), 'utf-8');
        }
      } catch {
        // index.json may not exist if IndexGenerator was skipped — fine.
      }
    } catch (e) {
      console.error(
        `[populate-coderef] Failed to write validation-report.json: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    if (!args.semanticRegistry) {
      await fs.rm(path.join(outputDir, 'semantic-registry.json'), { force: true });
    }

    if (args.sourceHeaders) {
      const headerGenerator = new HeaderGenerator({
        preserveExisting: !args.overwriteHeaders,
      });
      const semanticElements = buildSemanticElementsFromState(state);
      const elementsByFile = new Map<string, typeof semanticElements>();

      for (const element of semanticElements) {
        const existing = elementsByFile.get(element.file) || [];
        existing.push(element);
        elementsByFile.set(element.file, existing);
      }

      // Path-scope globs (STUB-4JDQXX / WO-ADD-A-PATH-SCOPE-ALLOWLIST-...). Matched
      // against the project-relative `file` key. Empty/undefined = no filter.
      const includeGlobs = args.include ?? [];
      const excludeGlobs = args.exclude ?? [];

      let staleRefreshed = 0;
      let staleSkipped = 0;
      let pathScopedSkipped = 0;
      for (const [file, elements] of elementsByFile) {
        // Path-scope allowlist/denylist filter. `element.file` is project-relative;
        // normalize to forward slashes so `scripts/**`-style globs match regardless
        // of the OS path separator. Composes with --stale-only as AND (D3): a file
        // is written iff it matches include (if set) AND is not excluded AND (if
        // --stale-only) is stale. Filters the WRITE loop only — graph/index/registry
        // output is untouched (D1).
        const relForGlob = file.split(path.sep).join('/');
        if (includeGlobs.length > 0 && !includeGlobs.some(g => minimatch(relForGlob, g))) {
          pathScopedSkipped++;
          continue;
        }
        if (excludeGlobs.length > 0 && excludeGlobs.some(g => minimatch(relForGlob, g))) {
          pathScopedSkipped++;
          continue;
        }
        // STUB-QDXGBA: --stale-only regenerates only files whose header is stale
        // (any element with headerStatus==='stale' — @exports drifted from AST),
        // avoiding the full-repo rewrite/CRLF churn of a blanket --overwrite pass.
        if (args.staleOnly && !elements.some(e => e.headerStatus === 'stale')) {
          staleSkipped++;
          continue;
        }
        const headers = headerGenerator.generateHeadersFromElements(elements);
        if (headers.length === 0) continue;
        await headerGenerator.insertHeaders(path.join(args.projectDir, file), headers);
        staleRefreshed++;
      }
      if (args.staleOnly && !args.json) {
        console.log(
          `[source-headers] --stale-only: refreshed ${staleRefreshed} stale-header file(s), ` +
            `skipped ${staleSkipped} up-to-date file(s).`,
        );
      }
      if ((includeGlobs.length > 0 || excludeGlobs.length > 0) && !args.json) {
        console.log(
          `[source-headers] path-scope: wrote ${staleRefreshed} in-scope file(s), ` +
            `skipped ${pathScopedSkipped} out-of-scope file(s).`,
        );
      }
    }

    const totalTime = Date.now() - startTime;

    // Compact summary for programmatic callers (MCP `reindex`). edges pulls the
    // full count off the emitted graph; elements/files come from the pipeline's
    // own metadata tally — the same numbers --json surfaces.
    const summary: PopulateSummary = {
      success: failures.length === 0,
      outputPath: outputDir,
      languagesUsed: languages,
      elements: state.metadata.elementsExtracted,
      files: state.metadata.filesScanned,
      edges: state.graph?.edges?.length ?? 0,
      durationMs: totalTime,
      failures: failures.map(f => f.name),
    };

    // stdout belongs to the MCP transport in programmatic mode — suppress the
    // CLI summary line there (diagnostics already went to stderr).
    if (!programmatic) {
      if (args.json) {
        console.log(JSON.stringify({ success: failures.length === 0, languagesUsed: languages, stats: state.metadata, timing: { total: totalTime, generators: generatorTimings }, failures }, null, 2));
      } else {
        console.log(`\n✓ Complete - Scan finished in ${totalTime}ms (Mode: ${args.mode})`);
        if (args.verbose) {
          console.log(`  Output: ${outputDir}`);
        }
      }
    }

    return summary;
  }
}

/**
 * CLI wrapper: run the pipeline and translate its outcome into a process exit
 * code. All the pipeline logic (and the .coderef/ writes) lives in runPopulate;
 * this keeps the former `run()` contract — including the exit-code + top-level
 * error handling — byte-for-byte identical for the bin entry point.
 */
async function run(args: CliArgs): Promise<void> {
  try {
    const summary = await runPopulate(args);
    process.exit(summary.failures.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(`\n✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  await run(args);
}

// Run CLI only when executed as a bin — never on import. runPopulate +
// defaultPopulateArgs are imported by the MCP server; importing this module
// must not launch the CLI (which would parse argv + process.exit).
if (require.main === module) {
  main();
}
