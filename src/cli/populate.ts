#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-populate
 * @exports main, parseArgs, printHelp, run, runGenerator
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

interface CliArgs {
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
  llmEnrich: boolean;
  strictHeaders: boolean;
}

interface GeneratorRunner {
  name: string;
  instance: {
    generate(state: PipelineState, outputDir: string): Promise<void>;
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
    llmEnrich: false,
    strictHeaders: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
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

      case '--llm-enrich':
        args.llmEnrich = true;
        break;

      case '--strict-headers':
        args.strictHeaders = true;
        break;

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
  --overwrite-headers          Re-write headers even if file already has them (refreshes stale headers)
  --llm-enrich                 Reserved for opt-in projection enrichment; never runs by default
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
 * Run pipeline and generate all outputs
 */
async function run(args: CliArgs): Promise<void> {
  const startTime = Date.now();

  try {
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

    // Run pipeline
    const orchestrator = new PipelineOrchestrator();
    const state = await orchestrator.run(args.projectDir, {
      languages,
      verbose: args.verbose && !args.json,
      outputDir,
      mode: args.mode,
      select: args.select,
    });

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
      process.exit(1);
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
      process.exit(1);
    }
    for (const warn of validation.warnings) {
      console.error(
        `[validation warning ${warn.check}] ${warn.offendingFile ?? '<unknown>'} ${JSON.stringify(warn.details)}`,
      );
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

      for (const [file, elements] of elementsByFile) {
        const headers = headerGenerator.generateHeadersFromElements(elements);
        if (headers.length === 0) continue;
        await headerGenerator.insertHeaders(path.join(args.projectDir, file), headers);
      }
    }

    const totalTime = Date.now() - startTime;

    if (args.json) {
       console.log(JSON.stringify({ success: failures.length === 0, languagesUsed: languages, stats: state.metadata, timing: { total: totalTime, generators: generatorTimings }, failures }, null, 2));
    } else {
      console.log(`\n✓ Complete - Scan finished in ${totalTime}ms (Mode: ${args.mode})`);
      if (args.verbose) {
         console.log(`  Output: ${outputDir}`);
      }
    }

    process.exit(failures.length > 0 ? 1 : 0);
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

main();
