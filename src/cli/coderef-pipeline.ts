#!/usr/bin/env node
/**
 * coderef-pipeline - Unified CodeRef orchestration CLI.
 *
 * Chains the four standard legs in order against a target project:
 *   1. scan            - element discovery (coderef-scan)
 *   2. populate        - generate all .coderef/ artifacts (populate-coderef)
 *   3. foundation-docs - render docs/foundation/*.md via scripts/doc-gen/
 *   4. rag-index       - build the RAG vector index (Ollama-only in this path)
 *
 * Design:
 *   - Each leg runs as a child process so leg-local argv + env stay isolated.
 *   - The RAG leg runs with CODEREF_RAG_LOCAL_ONLY=1 and CODEREF_LLM_PROVIDER=ollama
 *     unconditionally. Direct rag-index invocations remain multi-provider;
 *     only this orchestrator enforces local-only RAG.
 *   - --project-dir propagates to populate, foundation-docs generators, and
 *     rag-index. scan takes project_path positionally.
 *   - Per-leg timing + failure short-circuit. --dry-run prints the plan
 *     without executing.
 *   - --only=<legs> and --skip=<legs> allow subset runs (comma-separated leg
 *     names: scan, populate, docs, rag).
 *
 * Workorder: WO-UNIFIED-CODEREF-PIPELINE-001 (STUB-A).
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface CliArgs {
  projectDir: string;
  projectDirExplicit: boolean;
  dryRun: boolean;
  only?: Set<string>;
  skip?: Set<string>;
  verbose: boolean;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ragReset: boolean;
}

const LEG_NAMES = ['scan', 'populate', 'docs', 'rag'] as const;
type Leg = (typeof LEG_NAMES)[number];

function printHelp(): void {
  console.log(`coderef-pipeline - unified CodeRef orchestration

USAGE:
  coderef-pipeline --project-dir <path> [OPTIONS]
  coderef-pipeline <path> [OPTIONS]

OPTIONS:
  --project-dir <path>       Target project root (required).
                             Can also be supplied as the first positional arg.
                             Example: coderef-pipeline --project-dir /path/to/project
  --only <legs>              Comma-separated subset of legs to run.
                             Valid: scan, populate, docs, rag
  --skip <legs>              Comma-separated legs to skip.
  --dry-run                  Print the plan; do not execute.
  --ollama-base-url <url>    Ollama endpoint (default: http://localhost:11434
                             or env CODEREF_LLM_BASE_URL).
  --ollama-model <name>      Ollama embedding model (default:
                             nomic-embed-text or env CODEREF_LLM_MODEL).
  --rag-reset                Reset the RAG vector store before indexing
                             (use when changing embedding dimensions).
  -v, --verbose              Forward verbose flag to sub-commands.
  -h, --help                 Show this help.

LEG ORDER:
  1. scan            - coderef-scan <project-dir>
  2. populate        - populate-coderef <project-dir>
  3. docs            - node scripts/doc-gen/generate-*.js --project-dir <path>
  4. rag             - rag-index --project-dir <path>  (local-only Ollama)

RAG LOCAL-ONLY CONSTRAINT:
  The orchestrator sets CODEREF_RAG_LOCAL_ONLY=1 and CODEREF_LLM_PROVIDER=ollama
  for the rag leg unconditionally. Cloud RAG is not reachable through this
  surface; invoke rag-index directly if you need OpenAI/Anthropic.
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectDir: process.cwd(),
    projectDirExplicit: false,
    dryRun: false,
    verbose: false,
    ollamaBaseUrl: process.env.CODEREF_LLM_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.CODEREF_LLM_MODEL || 'nomic-embed-text',
    ragReset: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
      case '--project-dir':
        args.projectDir = path.resolve(argv[++i]);
        args.projectDirExplicit = true;
        break;
      case '--only':
        args.only = new Set(argv[++i].split(',').map(s => s.trim()));
        break;
      case '--skip':
        args.skip = new Set(argv[++i].split(',').map(s => s.trim()));
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--ollama-base-url':
        args.ollamaBaseUrl = argv[++i];
        break;
      case '--ollama-model':
        args.ollamaModel = argv[++i];
        break;
      case '--rag-reset':
        args.ragReset = true;
        break;
      case '-v':
      case '--verbose':
        args.verbose = true;
        break;
      default:
        if (a.startsWith('--project-dir=')) {
          args.projectDir = path.resolve(a.slice('--project-dir='.length));
          args.projectDirExplicit = true;
        } else if (a.startsWith('--only=')) {
          args.only = new Set(a.slice('--only='.length).split(',').map(s => s.trim()));
        } else if (a.startsWith('--skip=')) {
          args.skip = new Set(a.slice('--skip='.length).split(',').map(s => s.trim()));
        } else if (!a.startsWith('-') && !args.projectDirExplicit) {
          // Positional path alias: first non-flag arg is treated as --project-dir
          args.projectDir = path.resolve(a);
          args.projectDirExplicit = true;
        } else {
          console.error(`Unknown argument: ${a}`);
          printHelp();
          process.exit(2);
        }
    }
  }

  if (!args.projectDirExplicit) {
    console.error('Error: --project-dir <path> is required.');
    console.error('Example: coderef-pipeline --project-dir /path/to/project');
    console.error('         coderef-pipeline /path/to/project');
    console.error('Run with --help for full usage.');
    process.exit(1);
  }

  return args;
}

function resolveLegs(args: CliArgs): Leg[] {
  let legs: Leg[] = [...LEG_NAMES];
  if (args.only) legs = legs.filter(l => args.only!.has(l));
  if (args.skip) legs = legs.filter(l => !args.skip!.has(l));
  return legs;
}

interface LegResult {
  leg: Leg;
  status: 'ok' | 'fail' | 'skip' | 'dry-run';
  durationMs: number;
  exitCode?: number;
  stderrTail?: string;
}

/**
 * Resolve the path to a coderef-core dist CLI bin. The orchestrator lives
 * inside this repo's dist/ after build; siblings are in the same dir.
 */
function coderefBin(name: string): string {
  return path.resolve(__dirname, `${name}.js`);
}

/**
 * Locate scripts/doc-gen/ relative to the coderef-core install (next to
 * dist/). Works both from a clone and from an installed npm package.
 */
function docGenDir(): string {
  // dist/src/cli/ -> ../../../scripts/doc-gen
  return path.resolve(__dirname, '..', '..', '..', 'scripts', 'doc-gen');
}

function runNode(script: string, args: string[], opts: { env?: NodeJS.ProcessEnv; cwd?: string; verbose?: boolean }): { code: number; stderr: string } {
  const fullArgs = [script, ...args];
  const res = spawnSync(process.execPath, fullArgs, {
    stdio: opts.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...opts.env },
    cwd: opts.cwd,
  });
  const stderr = res.stderr ? res.stderr.toString() : '';
  return { code: res.status ?? 1, stderr };
}

async function runLeg(leg: Leg, args: CliArgs): Promise<LegResult> {
  const started = Date.now();
  if (args.dryRun) {
    return { leg, status: 'dry-run', durationMs: 0 };
  }

  try {
    if (leg === 'scan') {
      const bin = coderefBin('scan');
      const extra = args.verbose ? ['-v'] : [];
      const r = runNode(bin, [args.projectDir, ...extra], { verbose: args.verbose });
      return {
        leg,
        status: r.code === 0 ? 'ok' : 'fail',
        durationMs: Date.now() - started,
        exitCode: r.code,
        stderrTail: r.stderr.split('\n').slice(-20).join('\n'),
      };
    }

    if (leg === 'populate') {
      const bin = coderefBin('populate');
      const extra = args.verbose ? ['--verbose'] : [];
      const r = runNode(bin, [args.projectDir, ...extra], { verbose: args.verbose });
      return {
        leg,
        status: r.code === 0 ? 'ok' : 'fail',
        durationMs: Date.now() - started,
        exitCode: r.code,
        stderrTail: r.stderr.split('\n').slice(-20).join('\n'),
      };
    }

    if (leg === 'docs') {
      const dgDir = docGenDir();
      if (!fs.existsSync(dgDir)) {
        return {
          leg,
          status: 'skip',
          durationMs: Date.now() - started,
          stderrTail: `scripts/doc-gen/ not found at ${dgDir}`,
        };
      }
      const scripts = [
        'generate-index-md.js',
        'generate-exports-md.js',
        'generate-hotspots-md.js',
        'generate-relationships-md.js',
      ];
      for (const s of scripts) {
        const r = runNode(path.join(dgDir, s), [`--project-dir=${args.projectDir}`], { verbose: args.verbose });
        if (r.code !== 0) {
          return {
            leg,
            status: 'fail',
            durationMs: Date.now() - started,
            exitCode: r.code,
            stderrTail: `${s} failed: ${r.stderr.split('\n').slice(-20).join('\n')}`,
          };
        }
      }
      return { leg, status: 'ok', durationMs: Date.now() - started, exitCode: 0 };
    }

    if (leg === 'rag') {
      const bin = coderefBin('rag-index');
      const env: NodeJS.ProcessEnv = {
        CODEREF_RAG_LOCAL_ONLY: '1',
        CODEREF_LLM_PROVIDER: 'ollama',
        CODEREF_LLM_BASE_URL: args.ollamaBaseUrl,
        CODEREF_LLM_MODEL: args.ollamaModel,
      };
      const ragArgs = ['--project-dir', args.projectDir];
      if (args.ragReset) ragArgs.push('--reset');
      const r = runNode(bin, ragArgs, { env, verbose: args.verbose });
      return {
        leg,
        status: r.code === 0 ? 'ok' : 'fail',
        durationMs: Date.now() - started,
        exitCode: r.code,
        stderrTail: r.stderr.split('\n').slice(-20).join('\n'),
      };
    }

    return { leg, status: 'skip', durationMs: Date.now() - started };
  } catch (e) {
    return {
      leg,
      status: 'fail',
      durationMs: Date.now() - started,
      stderrTail: e instanceof Error ? e.message : String(e),
    };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const legs = resolveLegs(args);

  if (legs.length === 0) {
    console.error('No legs selected. Use --only or drop --skip to run at least one.');
    process.exit(2);
  }

  console.log('coderef-pipeline');
  console.log(`  project-dir: ${args.projectDir}`);
  console.log(`  legs: ${legs.join(' -> ')}`);
  console.log(`  dry-run: ${args.dryRun}`);
  if (legs.includes('rag')) {
    console.log(`  ollama:   ${args.ollamaBaseUrl} (model: ${args.ollamaModel}; LOCAL-ONLY)`);
  }
  console.log('');

  const results: LegResult[] = [];
  let failed: LegResult | null = null;

  for (const leg of legs) {
    process.stdout.write(`[${leg}] ... `);
    const r = await runLeg(leg, args);
    results.push(r);
    const tag = r.status === 'ok' ? 'OK' : r.status.toUpperCase();
    console.log(`${tag} (${r.durationMs}ms)${r.exitCode !== undefined ? ` [exit=${r.exitCode}]` : ''}`);
    if (r.status === 'fail') {
      failed = r;
      if (r.stderrTail) console.error(r.stderrTail);
      break;
    }
  }

  console.log('');
  console.log('Summary:');
  for (const r of results) {
    console.log(`  ${r.leg.padEnd(10)} ${r.status.padEnd(8)} ${r.durationMs}ms`);
  }

  if (failed) {
    console.error(`\nFailed at leg: ${failed.leg}`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
