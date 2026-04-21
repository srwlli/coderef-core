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
import { AnalyzerService } from '../analyzer/analyzer-service.js';
import { detectProjectLanguages, validateCliLanguages } from './detect-languages.js';

// Dynamic imports for optional RAG dependencies
let OpenAIProvider: any;
let AnthropicProvider: any;
let SQLiteVectorStore: any;
let IndexingOrchestrator: any;

async function loadRAGDependencies() {
  const llmModule = await import('../integration/llm/openai-provider.js');
  OpenAIProvider = llmModule.OpenAIProvider;
  
  const anthropicModule = await import('../integration/llm/anthropic-provider.js');
  AnthropicProvider = anthropicModule.AnthropicProvider;
  
  const vectorModule = await import('../integration/vector/sqlite-store.js');
  SQLiteVectorStore = vectorModule.SQLiteVectorStore;
  
  const ragModule = await import('../integration/rag/indexing-orchestrator.js');
  IndexingOrchestrator = ragModule.IndexingOrchestrator;
}

interface CliArgs {
  projectDir: string;
  provider: 'openai' | 'anthropic';
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
  const args: CliArgs = {
    projectDir: process.cwd(),
    provider: 'openai',
    store: 'sqlite',
    reset: false,
    verbose: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--help':
      case '-h':
        args.help = true;
        break;

      case '--project-dir':
      case '-p':
        args.projectDir = argv[++i];
        break;

      case '--provider':
        const provider = argv[++i];
        if (['openai', 'anthropic'].includes(provider)) {
          args.provider = provider as 'openai' | 'anthropic';
        } else {
          console.warn(`[rag-index] Unknown provider: ${provider}. Using openai.`);
        }
        break;

      case '--store':
        const store = argv[++i];
        if (['sqlite', 'pinecone', 'chroma'].includes(store)) {
          args.store = store as 'sqlite' | 'pinecone' | 'chroma';
        } else {
          console.warn(`[rag-index] Unknown store: ${store}. Using sqlite.`);
        }
        break;

      case '--reset':
        args.reset = true;
        break;

      case '--lang':
      case '-l':
        args.languages = argv[++i].split(',');
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
  --provider <provider>        LLM provider: openai, anthropic (default: openai)
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

EXAMPLES:
  # Index current directory
  rag-index

  # Index specific project with OpenAI
  rag-index --project-dir ./my-project --provider openai

  # Reset and re-index
  rag-index --project-dir ./my-project --reset

  # Index only TypeScript files
  rag-index --project-dir ./my-project --lang ts,tsx

OUTPUT:
  Creates .coderef/rag-index.json with indexing metadata
  Vector embeddings stored in configured vector store
`);
}

/**
 * Create LLM provider based on configuration
 */
function createLLMProvider(provider: string): any {
  const apiKey = provider === 'openai'
    ? process.env.OPENAI_API_KEY
    : process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      `${provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} environment variable is required`
    );
  }

  if (provider === 'openai') {
    return new OpenAIProvider({
      apiKey,
      model: process.env.CODEREF_OPENAI_MODEL || 'gpt-4-turbo-preview',
    });
  } else {
    return new AnthropicProvider({
      apiKey,
      model: process.env.CODEREF_ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
    });
  }
}

/**
 * Create vector store based on configuration
 */
async function createVectorStore(
  store: string,
  projectDir: string
): Promise<any> {
  const storagePath = process.env.CODEREF_SQLITE_PATH
    || path.join(projectDir, '.coderef', 'rag-vectors.sqlite');

  return new SQLiteVectorStore({
    storagePath,
    dimension: 1536,
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

    // Validate project directory
    try {
      await fs.access(args.projectDir);
    } catch {
      console.error(`Error: Project directory not found: ${args.projectDir}`);
      process.exit(2);
    }

    // Load optional RAG dependencies
    try {
      await loadRAGDependencies();
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
    const vectorStore = await createVectorStore(args.store, args.projectDir);

    // Reset index if requested
    if (args.reset) {
      if (!args.json) {
        console.log('🗑️  Clearing existing index...');
      }
      await vectorStore.clear();
    }

    // Initialize analyzer
    const analyzerService = new AnalyzerService(args.projectDir);

    // Create orchestrator
    const orchestrator = new IndexingOrchestrator(
      analyzerService,
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

    // Run indexing
    const startTime = Date.now();
    const result = await orchestrator.indexCodebase({
      sourceDir: args.projectDir,
      languages,
      onProgress,
      useAnalyzer: true,
    });

    const totalTime = Date.now() - startTime;

    if (onProgress) {
      process.stdout.write('\n\n');
    }

    // Save index metadata
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
      console.log(`  Vectors: ${process.env.CODEREF_SQLITE_PATH || path.join(coderefDir, 'rag-vectors.sqlite')}`);
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

    process.exit(result.chunksFailed > 0 ? 1 : 0);

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
