#!/usr/bin/env node
/**
 * RAG Search CLI Command
 * Semantic code search using natural language queries
 *
 * Usage:
 *   rag-search --project-dir <path> "how does authentication work?"
 *   rag-search --project-dir <path> "find user service" --top-k 5
 *   rag-search --project-dir <path> "database queries" --lang ts --type function
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Dynamic imports for optional RAG dependencies
let OpenAIProvider: any;
let AnthropicProvider: any;
let OllamaProvider: any;
let SQLiteVectorStore: any;
let SemanticSearchService: any;

async function loadRAGDependencies(providerName: string) {
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

  const vectorModule = await import('../integration/vector/sqlite-store.js');
  SQLiteVectorStore = vectorModule.SQLiteVectorStore;

  const searchModule = await import('../integration/rag/semantic-search.js');
  SemanticSearchService = searchModule.SemanticSearchService;
}

interface CliArgs {
  projectDir: string;
  query: string;
  provider: string;
  store: 'sqlite' | 'pinecone' | 'chroma';
  topK: number;
  minScore?: number;
  lang?: string;
  type?: string;
  file?: string;
  exported?: boolean;
  json: boolean;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectDir: process.cwd(),
    query: '',
    provider: 'openai',
    store: 'sqlite',
    topK: 10,
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
        }
        break;
      }

      case '--top-k':
      case '-k':
        args.topK = parseInt(argv[++i], 10);
        break;

      case '--min-score':
        args.minScore = parseFloat(argv[++i]);
        break;

      case '--lang':
      case '-l':
        args.lang = argv[++i];
        break;

      case '--type':
      case '-t':
        args.type = argv[++i];
        break;

      case '--file':
      case '-f':
        args.file = argv[++i];
        break;

      case '--exported':
        args.exported = true;
        break;

      case '--json':
      case '-j':
        args.json = true;
        break;

      default:
        if (!arg.startsWith('-') && !args.query) {
          args.query = arg;
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
rag-search - Semantic code search using natural language

USAGE:
  rag-search [OPTIONS] <query>

OPTIONS:
  -p, --project-dir <path>     Project directory to search (default: current directory)
  --provider <provider>        LLM provider: openai, anthropic, ollama (default: openai)
  --store <store>              Vector store: sqlite, pinecone, chroma (default: sqlite)
  -k, --top-k <number>         Number of results to return (default: 10)
  --min-score <number>         Minimum relevance score 0-1 (default: none)
  -l, --lang <language>        Filter by programming language
  -t, --type <type>            Filter by element type: function, class, method, etc.
  -f, --file <pattern>         Filter by file path pattern
  --exported                   Only show exported elements
  -j, --json                   Output results as JSON
  -h, --help                   Show this help message

ENVIRONMENT VARIABLES:
  OPENAI_API_KEY              Required for OpenAI provider
  ANTHROPIC_API_KEY           Required for Anthropic provider
  CODEREF_SQLITE_PATH         Optional: Custom SQLite storage path

EXAMPLES:
  # Search for authentication code
  rag-search "how does authentication work?"

  # Search with filters
  rag-search "user service" --lang ts --type function --top-k 5

  # Find database-related code
  rag-search "database queries" --lang ts,tsx --exported

  # JSON output for scripts
  rag-search --json "error handling" --top-k 20

OUTPUT:
  Results ranked by relevance score (0-1, higher is better)
  Each result includes:
    - CodeRef tag for precise navigation
    - Relevance score
    - File path and line number
    - Element type and name
`);
}

/**
 * Create LLM provider based on configuration
 */
function createLLMProvider(provider: string): any {
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
 * Format search result for display
 */
function formatResult(result: any, index: number): string {
  const lines: string[] = [];
  
  lines.push(`${index + 1}. ${result.metadata?.name || 'Unknown'} ${'─'.repeat(50)}`);
  lines.push(`   📍 ${result.metadata?.file || 'Unknown'}:${result.metadata?.line || '?'}`);
  lines.push(`   🏷️  ${result.coderef}`);
  lines.push(`   📊 Score: ${(result.score * 100).toFixed(1)}%`);
  
  if (result.metadata?.type) {
    lines.push(`   📝 Type: ${result.metadata.type}`);
  }
  if (result.metadata?.language) {
    lines.push(`   🔤 Language: ${result.metadata.language}`);
  }
  if (result.metadata?.exported !== undefined) {
    lines.push(`   🔓 Exported: ${result.metadata.exported ? 'Yes' : 'No'}`);
  }
  if (result.metadata?.documentation) {
    const doc = result.metadata.documentation.split('\n')[0].slice(0, 80);
    lines.push(`   📄 ${doc}${result.metadata.documentation.length > 80 ? '...' : ''}`);
  }
  
  return lines.join('\n');
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help || !args.query) {
      if (!args.query && !args.help) {
        console.error('Error: Query is required\n');
      }
      printHelp();
      process.exit(args.help ? 0 : 2);
    }

    // Validate project directory
    try {
      await fs.access(args.projectDir);
    } catch {
      console.error(`Error: Project directory not found: ${args.projectDir}`);
      process.exit(2);
    }

    // Check for index
    const coderefDir = path.join(args.projectDir, '.coderef');
    const indexPath = path.join(coderefDir, 'rag-index.json');
    
    try {
      await fs.access(indexPath);
    } catch {
      console.error(`Error: No RAG index found at ${indexPath}`);
      console.error('Run "rag-index" first to create the index.');
      process.exit(2);
    }

    // Load optional RAG dependencies
    try {
      await loadRAGDependencies(args.provider);
    } catch (error) {
      console.error('Error: Failed to load RAG dependencies.');
      console.error('Make sure the optional dependencies are installed:');
      console.error('  npm install openai tiktoken');
      console.error('  or');
      console.error('  pnpm add openai tiktoken');
      process.exit(1);
    }

    if (!args.json) {
      console.log(`🔍 Searching: "${args.query}"\n`);
    }

    // Initialize components
    const llmProvider = createLLMProvider(args.provider);
    const vectorStore = await createVectorStore(args.store, args.projectDir);
    await vectorStore.initialize();
    const searchService = new SemanticSearchService(llmProvider, vectorStore);

    // Build search options
    const searchOptions: any = {
      topK: args.topK,
    };

    if (args.minScore !== undefined) {
      searchOptions.minScore = args.minScore;
    }
    if (args.lang) {
      searchOptions.language = args.lang;
    }
    if (args.type) {
      searchOptions.type = args.type;
    }
    if (args.file) {
      searchOptions.file = args.file;
    }
    if (args.exported !== undefined) {
      searchOptions.exported = args.exported;
    }

    // Execute search
    const startTime = Date.now();
    const response = await searchService.search(args.query, searchOptions);
    const searchTime = Date.now() - startTime;

    // Output results
    if (args.json) {
      console.log(JSON.stringify({
        query: args.query,
        results: response.results,
        totalResults: response.totalResults,
        searchTimeMs: searchTime,
        filters: {
          language: args.lang,
          type: args.type,
          file: args.file,
          exported: args.exported,
        },
      }, null, 2));
    } else {
      console.log(`✅ Found ${response.totalResults} results in ${searchTime}ms\n`);

      if (response.results.length === 0) {
        console.log('No results found. Try:');
        console.log('  - Using different keywords');
        console.log('  - Removing filters');
        console.log('  - Re-indexing with rag-index');
        console.log();
      } else {
        response.results.forEach((result: any, i: number) => {
          console.log(formatResult(result, i));
          console.log();
        });

        if (response.totalResults > args.topK) {
          console.log(`... and ${response.totalResults - args.topK} more results`);
          console.log(`Use --top-k ${response.totalResults} to see all results`);
          console.log();
        }
      }

      console.log('💡 Tips:');
      console.log('  - Use --json for programmatic output');
      console.log('  - Filter with --lang, --type, --file');
      console.log(`  - Check index: rag-status --project-dir ${args.projectDir}`);
      console.log();
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Search failed:\n');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

// Run CLI
main();
