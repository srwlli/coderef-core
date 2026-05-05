#!/usr/bin/env node
/**
 * RAG Index CLI Command
 * Creates semantic search index for codebase using vector embeddings
 *
 * Usage:
 *   rag-index --project-dir <path>
 *   rag-index --project-dir <path> --provider openai
 *   rag-index --project-dir <path> --store sqlite --reset
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { detectProjectLanguages, validateCliLanguages } from './detect-languages.js';

// Dynamic imports for optional RAG dependencies
let OpenAIProvider: any;
let AnthropicProvider: any;
let OllamaProvider: any;
let SQLiteVectorStore: any;
let PineconeStore: any;
let ChromaStore: any;
let IndexingOrchestrator: any;

async function loadRAGDependencies(providerName: string, storeName: string = 'sqlite') {
  // Only load the provider we need
  if (providerName === 'openai') {
    const llmModule = await import('../integration/llm/openai-provider.js');
    OpenAIProvider = llmModule.OpenAIProvider;
  } else if (providerName === 'anthropic') {
    const anthropicModule = await import('../integration/llm/anthropic-provider.js');
    AnthropicProvider = anthropicModule.AnthropicProvider;
    // Anthropic needs OpenAI for embeddings
    const llmModule = await import('../integration/llm/openai-provider.js');
    OpenAIProvider = llmModule.OpenAIProvider;
  } else if (providerName === 'ollama') {
    const ollamaModule = await import('../integration/llm/ollama-provider.js');
    OllamaProvider = ollamaModule.OllamaProvider;
  }

  // Load vector store based on selection
  if (storeName === 'sqlite') {
    const vectorModule = await import('../integration/vector/sqlite-store.js');
    SQLiteVectorStore = vectorModule.SQLiteVectorStore;
  } else if (storeName === 'pinecone') {
    const pineconeModule = await import('../integration/vector/pinecone-store.js');
    PineconeStore = pineconeModule.PineconeStore;
  } else if (storeName === 'chroma') {
    const chromaModule = await import('../integration/vector/chroma-store.js');
    ChromaStore = chromaModule.ChromaStore;
  }
  // Always load SQLite as fallback
  if (storeName !== 'sqlite') {
    const vectorModule = await import('../integration/vector/sqlite-store.js');
    SQLiteVectorStore = vectorModule.SQLiteVectorStore;
  }

  const ragModule = await import('../integration/rag/indexing-orchestrator.js');
  IndexingOrchestrator = ragModule.IndexingOrchestrator;
}

interface CliArgs {
  projectDir: string;
  provider: string;  // Any provider name (openai, anthropic, ollama, etc.)
  store: 'sqlite' | 'pinecone' | 'chroma';
  reset: boolean;
  languages?: string[];
  verbose: boolean;
  json: boolean;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): CliArgs {
  // Honor CODEREF_LLM_PROVIDER as the default provider when --provider isn't
  // passed. Falls back to 'openai' for back-compat.
  const envProvider = process.env.CODEREF_LLM_PROVIDER?.toLowerCase();
  const args: CliArgs = {
    projectDir: process.cwd(),
    provider: envProvider || 'openai',
    store: 'sqlite',
    reset: false,
    verbose: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // Handle --arg=value format by extracting value
    let value: string | undefined;
    let key = arg;
    if (arg.startsWith('--') && arg.includes('=')) {
      const parts = arg.split('=', 2);
      key = parts[0];
      value = parts[1];
    }

    switch (key) {
      case '--help':
      case '-h':
        args.help = true;
        break;

      case '--project-dir':
      case '-p':
        args.projectDir = value ?? argv[++i];
        break;

      case '--provider':
        args.provider = value ?? argv[++i];
        break;

      case '--store': {
        const store = value ?? argv[++i];
        if (['sqlite', 'pinecone', 'chroma'].includes(store)) {
          args.store = store as 'sqlite' | 'pinecone' | 'chroma';
        } else {
          console.warn(`[rag-index] Unknown store: ${store}. Using sqlite.`);
        }
        break;
      }

      case '--reset':
        args.reset = true;
        break;

      case '--lang':
      case '-l':
        args.languages = (value ?? argv[++i]).split(',');
        break;

      case '--verbose':
      case '-v':
        args.verbose = true;
        break;

      case '--json':
      case '-j':
        args.json = true;
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
rag-index - Create semantic search index for codebase

USAGE:
  rag-index [OPTIONS] [PROJECT_DIR]

OPTIONS:
  -p, --project-dir <path>     Project directory to index (default: current directory)
  --provider <provider>        LLM provider: openai, anthropic, or custom (default: openai)
  --store <store>              Vector store: sqlite, pinecone, chroma (default: sqlite)
  --reset                      Reset existing index before indexing
  -l, --lang <languages>       Comma-separated languages to index
  -v, --verbose                Enable verbose logging
  -j, --json                   Output results as JSON
  -h, --help                   Show this help message

ENVIRONMENT VARIABLES:
  OPENAI_API_KEY              Required for OpenAI provider
  ANTHROPIC_API_KEY           Required for Anthropic provider
  PINECONE_API_KEY            Required for Pinecone store
  CODEREF_SQLITE_PATH         Optional: Custom SQLite storage path

  Generic LLM Configuration (for custom/local providers):
  CODEREF_LLM_PROVIDER        Provider name: openai, anthropic, ollama, etc.
  CODEREF_LLM_BASE_URL        Base URL for provider API (e.g., http://localhost:11434 for Ollama)
  CODEREF_LLM_API_KEY         API key (can be 'ollama' or any non-empty string for local)
  CODEREF_LLM_MODEL           Model name (e.g., nomic-embed-text, llama3.2)

EXAMPLES:
  # Index current directory
  rag-index

  # Index specific project with OpenAI
  rag-index --project-dir ./my-project --provider openai

  # Index with local Ollama (when implemented)
  export CODEREF_LLM_PROVIDER=ollama
  export CODEREF_LLM_BASE_URL=http://localhost:11434
  export CODEREF_LLM_MODEL=nomic-embed-text
  export CODEREF_LLM_API_KEY=ollama
  rag-index --project-dir ./my-project --provider ollama

  # Reset and re-index
  rag-index --project-dir ./my-project --reset

  # Index only TypeScript files
  rag-index --project-dir ./my-project --lang ts,tsx

OUTPUT:
  Creates .coderef/rag-index.json with indexing metadata
  Vector embeddings stored in configured vector store
  Dimensions determined from MODEL_REGISTRY (1536 for OpenAI, 768/384 for Ollama)
`);
}

/**
 * Create LLM provider based on configuration
 * Supports: openai, anthropic, and any future provider
 */
function createLLMProvider(provider: string): any {
  // Known providers with specific env var requirements
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    return new OpenAIProvider({
      apiKey,
      model: process.env.CODEREF_OPENAI_MODEL || 'gpt-4-turbo-preview',
    });
  }

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    return new AnthropicProvider({
      apiKey,
      model: process.env.CODEREF_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    });
  }

  if (provider === 'ollama') {
    // Ollama uses generic env vars (no API key required)
    const baseUrl = process.env.CODEREF_LLM_BASE_URL ||
                    'http://localhost:11434';
    const apiKey = process.env.CODEREF_LLM_API_KEY || 'ollama';
    const model = process.env.CODEREF_LLM_MODEL || 'qwen2.5:7b-instruct';

    return new OllamaProvider({
      apiKey,
      baseUrl,
      model,
    });
  }

  // Unknown provider
  throw new Error(
    `Provider '${provider}' not supported. Supported: openai, anthropic, ollama.`
  );
}

/**
 * Create vector store based on configuration and provider dimensions
 */
async function createVectorStore(
  store: string,
  projectDir: string,
  llmProvider: any
): Promise<any> {
  // Get dimensions from provider (dimension is defined in MODEL_REGISTRY)
  const dimension = llmProvider?.getEmbeddingDimensions?.() ??
    (() => { throw new Error(`Provider does not support embeddings or getEmbeddingDimensions() not implemented`); })();

  switch (store) {
    case 'pinecone': {
      const apiKey = process.env.PINECONE_API_KEY;
      if (!apiKey) {
        console.warn('[rag-index] PINECONE_API_KEY not set, falling back to SQLite');
        break;
      }
      const indexName = process.env.PINECONE_INDEX_NAME || 'coderef-index';
      return new PineconeStore({
        apiKey,
        indexName,
        dimension,
      });
    }

    case 'chroma': {
      const host = process.env.CHROMA_URL || 'http://localhost:8000';
      return new ChromaStore({
        host,
        indexName: 'coderef-collection',
        dimension,
      });
    }

    case 'sqlite':
    default: {
      // Storage is a JSON file (the "sqlite" name is legacy/misleading).
      // Use a .json extension so SQLiteVectorStore treats it as the literal
      // file path and doesn't double-join `.coderef/coderef-vectors.json`.
      const storagePath = process.env.CODEREF_SQLITE_PATH
        || path.join(projectDir, '.coderef', 'coderef-vectors.json');
      return new SQLiteVectorStore({
        storagePath,
        dimension,
      });
    }
  }

  // Fallback to SQLite for unknown stores or missing config.
  // See note above about the .json extension and SQLiteVectorStore.
  const storagePath = process.env.CODEREF_SQLITE_PATH
    || path.join(projectDir, '.coderef', 'coderef-vectors.json');
  return new SQLiteVectorStore({
    storagePath,
    dimension,
  });
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printHelp();
      process.exit(0);
    }

    // RAG local-only enforcement. When CODEREF_RAG_LOCAL_ONLY is set
    // (truthy), reject cloud providers regardless of how they were
    // selected. This mirrors RAGConfigLoader.getLLMProvider() but covers
    // the rag-index CLI's parallel provider-resolution path.
    const localOnlyRaw = process.env.CODEREF_RAG_LOCAL_ONLY;
    const localOnly = localOnlyRaw && localOnlyRaw.toLowerCase() !== '0' &&
      localOnlyRaw.toLowerCase() !== 'false' && localOnlyRaw.toLowerCase() !== 'no';
    if (localOnly && (args.provider === 'openai' || args.provider === 'anthropic')) {
      console.error(
        `Error: RAG local-only mode is enabled (CODEREF_RAG_LOCAL_ONLY=${localOnlyRaw}) ` +
        `but provider '${args.provider}' is a cloud provider. ` +
        `Set CODEREF_LLM_PROVIDER=ollama (or pass --provider ollama) and ` +
        `configure CODEREF_LLM_BASE_URL.`
      );
      process.exit(2);
    }

    // Validate project directory
    try {
      await fs.access(args.projectDir);
    } catch {
      console.error(`Error: Project directory not found: ${args.projectDir}`);
      process.exit(2);
    }

    // Load optional RAG dependencies
    try {
      await loadRAGDependencies(args.provider, args.store);
    } catch (error) {
      console.error('Error: Failed to load RAG dependencies.');
      console.error('Make sure the optional dependencies are installed:');
      console.error('  npm install openai tiktoken');
      console.error('  or');
      console.error('  pnpm add openai tiktoken');
      process.exit(1);
    }

    // Ensure .coderef directory exists
    const coderefDir = path.join(args.projectDir, '.coderef');
    await fs.mkdir(coderefDir, { recursive: true });

    // Detect languages
    const explicitLanguages = validateCliLanguages(args.languages);
    const languages = explicitLanguages ?? await detectProjectLanguages(args.projectDir);

    if (languages.length === 0) {
      throw new Error('No supported source files detected in project.');
    }

    if (!args.json) {
      console.log('🔍 Creating RAG index...\n');
      console.log(`Project: ${args.projectDir}`);
      console.log(`Provider: ${args.provider}`);
      console.log(`Store: ${args.store}`);
      console.log(`Languages: ${languages.join(', ')}`);
      if (args.reset) {
        console.log('Mode: Reset (existing index will be cleared)');
      }
      console.log();
    }

    // Initialize components
    const llmProvider = createLLMProvider(args.provider);
    const vectorStore = await createVectorStore(args.store, args.projectDir, llmProvider);

    // If --reset was requested, clear on-disk state BEFORE initialize().
    // Initialize() reads the stored vector data and would fail with a
    // dimension-mismatch error when switching embedding models (e.g.
    // OpenAI 1536 -> Ollama 768) — exactly the scenario --reset is for.
    if (args.reset) {
      if (!args.json) {
        console.log('🗑️  Clearing existing index (vector store + incremental state)...');
      }
      // Vector store: best-effort delete via filesystem (vectorStore.clear()
      // requires initialize()). The legacy-dir cleanup in
      // SQLiteVectorStore.initialize() handles the directory case too.
      const { unlink, rm, stat } = await import('fs/promises');
      const vectorJsonPath = process.env.CODEREF_SQLITE_PATH
        || path.join(args.projectDir, '.coderef', 'coderef-vectors.json');
      try {
        const st = await stat(vectorJsonPath);
        if (st.isDirectory()) {
          await rm(vectorJsonPath, { recursive: true, force: true });
        } else {
          await unlink(vectorJsonPath);
        }
      } catch {
        // missing is fine
      }
      // Incremental state file (top-level, hyphen).
      try {
        await unlink(path.join(args.projectDir, '.coderef-rag-index.json'));
      } catch {
        // missing is fine
      }
    }

    // Initialize vector store (now safe — any incompatible state was cleared above)
    await vectorStore.initialize();

    // Create orchestrator
    const orchestrator = new IndexingOrchestrator(
      llmProvider,
      vectorStore,
      args.projectDir
    );

    // Progress callback
    const onProgress = args.json
      ? undefined
      : (progress: { stage: string; stageProgress: number; overallProgress: number }) => {
          const stageEmoji: Record<string, string> = {
            analyzing: '🔍',
            converting: '🔄',
            embedding: '🧠',
            storing: '💾',
            complete: '✅',
          };
          const emoji = stageEmoji[progress.stage] || '⏳';
          const bar = '█'.repeat(Math.round(progress.overallProgress / 5)) +
                      '░'.repeat(20 - Math.round(progress.overallProgress / 5));
          process.stdout.write(`\r${emoji} [${bar}] ${progress.overallProgress.toFixed(1)}% ${progress.stage}`);
        };

    // Phase 7 task 1.5 — validation gate (DR-PHASE-7-A). Read
    // .coderef/validation-report.json and inject result into
    // indexing-orchestrator. Missing report = refuse.
    //
    // populate-coderef writes only the 11-field ValidationReport (the
    // report sub-object), and exits BEFORE writing it on ok=false. So
    // the on-disk format is the report shape, and the existence of
    // the file on disk implies validation passed. We treat the file's
    // presence + parseable shape as ok=true; absence/parse-failure as
    // refuse-with-error.
    const validationReportPath = path.join(coderefDir, 'validation-report.json');
    let validation: { ok: boolean; reportPath?: string };
    try {
      const raw = await fs.readFile(validationReportPath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Accept either: (a) full ValidationResult with explicit ok flag
      // (programmatic test fixtures), or (b) the 11-field report-only
      // shape that populate-coderef writes after validation succeeded.
      const ok =
        typeof parsed.ok === 'boolean'
          ? parsed.ok
          : typeof parsed.valid_edge_count === 'number'
            ? true
            : Array.isArray(parsed.errors)
              ? parsed.errors.length === 0
              : false;
      validation = { ok, reportPath: validationReportPath };
    } catch (err: any) {
      console.error(
        `\n❌ Phase 6 validation gate refused: cannot read ${validationReportPath}.`,
      );
      console.error(
        '   Run `populate-coderef` first to produce a valid validation report,',
      );
      console.error('   then retry rag-index. Underlying error:', err?.message ?? err);
      process.exit(1);
    }
    if (validation.ok === false) {
      console.error(
        `\n❌ Phase 6 validation reports ok=false at ${validationReportPath}.`,
      );
      console.error(
        '   Indexing refused. Resolve graph-integrity errors before re-running.',
      );
      process.exit(1);
    }

    // Run indexing
    const startTime = Date.now();
    const result = await orchestrator.indexCodebase({
      sourceDir: args.projectDir,
      languages,
      onProgress,
      useAnalyzer: true,
      validation,
    });

    const totalTime = Date.now() - startTime;

    if (onProgress) {
      process.stdout.write('\n\n');
    }

    // Save index metadata. Phase 7 (task 1.9): persist the new
    // status field + per-entry *Details arrays + validation gate
    // outcome to disk so downstream consumers can introspect the run
    // without re-invoking the orchestrator.
    const indexMetadata = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      projectDir: args.projectDir,
      languages,
      provider: args.provider,
      store: args.store,
      stats: result.stats,
      chunksIndexed: result.chunksIndexed,
      chunksSkipped: result.chunksSkipped,
      chunksFailed: result.chunksFailed,
      filesProcessed: result.filesProcessed,
      processingTimeMs: totalTime,
      status: result.status,
      chunksSkippedDetails: result.chunksSkippedDetails,
      chunksFailedDetails: result.chunksFailedDetails,
      validationGateRefused: result.validationGateRefused ?? false,
      validationReportPath: result.validationReportPath,
    };

    const indexPath = path.join(coderefDir, 'rag-index.json');
    await fs.writeFile(indexPath, JSON.stringify(indexMetadata, null, 2));

    // Output results
    if (args.json) {
      console.log(JSON.stringify({
        success: result.chunksFailed === 0,
        ...indexMetadata,
        errors: result.errors,
      }, null, 2));
    } else {
      console.log('✅ Indexing complete!\n');
      console.log('📊 Statistics:');
      console.log(`  Files processed: ${result.filesProcessed}`);
      console.log(`  Chunks indexed: ${result.chunksIndexed}`);
      if (result.chunksSkipped > 0) {
        console.log(`  Chunks skipped: ${result.chunksSkipped}`);
      }
      if (result.chunksFailed > 0) {
        console.log(`  Chunks failed: ${result.chunksFailed}`);
      }
      console.log(`  Processing time: ${(totalTime / 1000).toFixed(2)}s`);
      console.log();
      console.log('📁 Output:');
      console.log(`  Metadata: ${indexPath}`);
      console.log(`  Vectors: ${process.env.CODEREF_SQLITE_PATH || path.join(coderefDir, 'coderef-vectors.json')}`);
      console.log();

      if (result.errors.length > 0) {
        console.log('⚠️  Errors encountered:');
        result.errors.slice(0, 5).forEach((err: {stage: string; message: string}, i: number) => {
          console.log(`  ${i + 1}. [${err.stage}] ${err.message}`);
        });
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more`);
        }
        console.log();
      }

      console.log('💡 Next steps:');
      console.log(`  Search the index: rag-search --project-dir ${args.projectDir} "your query"`);
      console.log(`  Check status: rag-status --project-dir ${args.projectDir}`);
      console.log();
    }

    // Phase 7 task 1.9 — exit-code propagation per IndexingResult.status
    // (DR-PHASE-7-C / AC-08). Replaces the pre-Phase-7 chunksIndexed-as-
    // success heuristic.
    if (result.status === 'partial' && !args.json) {
      const skipsByReason: Record<string, number> = {};
      for (const entry of result.chunksSkippedDetails) {
        skipsByReason[entry.reason] = (skipsByReason[entry.reason] || 0) + 1;
      }
      const failsByReason: Record<string, number> = {};
      for (const entry of result.chunksFailedDetails) {
        failsByReason[entry.reason] = (failsByReason[entry.reason] || 0) + 1;
      }
      const skipSummary = Object.entries(skipsByReason)
        .map(([reason, count]) => `    ${reason}: ${count}`)
        .join('\n');
      const failSummary = Object.entries(failsByReason)
        .map(([reason, count]) => `    ${reason}: ${count}`)
        .join('\n');
      console.error('\n⚠️  Partial success — some chunks were skipped or failed:');
      if (skipSummary) console.error(`  Skipped (${result.chunksSkipped}):\n${skipSummary}`);
      if (failSummary) console.error(`  Failed (${result.chunksFailed}):\n${failSummary}`);
    }
    if (result.status === 'failed') {
      const cause = result.validationGateRefused
        ? `Phase 6 validation gate refused (${result.validationReportPath ?? 'no report path'})`
        : 'No chunks were produced — indexing is unusable. Check --lang and source corpus.';
      console.error(`\n❌ Indexing failed: ${cause}`);
      process.exit(1);
    }
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Indexing failed:\n');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

// Run CLI
main();
