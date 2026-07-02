#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-rag-search
 */

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

// Provider/store construction lives in the shared factory
// (src/integration/llm/provider-factory.ts, P1-10) — MODEL_REGISTRY is the
// single source; defaults are Ollama local-only. Only the search service
// remains a lazy optional dependency here.
import { createLLMProvider, createVectorStore } from '../integration/llm/provider-factory.js';
import { parseFlags, failUsage } from './shared/cli-args.js';

let SemanticSearchService: any;

async function loadRAGDependencies() {
  const searchModule = await import('../integration/rag/semantic-search.js');
  SemanticSearchService = searchModule.SemanticSearchService;
}

interface CliArgs {
  projectDir: string;
  query: string;
  provider: string;
  store: 'json' | 'sqlite' | 'pinecone' | 'chroma';
  topK: number;
  minScore?: number;
  lang?: string;
  type?: string;
  file?: string;
  exported?: boolean;
  // Phase 7 task 1.10 — semantic facet filters (DR-PHASE-7-D).
  layer?: string;
  capability?: string;
  // --constraint key:value generalized filter (DR-PHASE-7-D followup).
  constraint?: string;
  maxTokens?: number;
  json: boolean;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(argv: string[]): CliArgs {
  // WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 3 (P2-18): parsing moved
  // onto the shared helper — every value flag now accepts BOTH --flag=value
  // and --flag value (previously --top-k=5 silently swallowed the next
  // token), numeric flags are NaN-checked, and unknown flags error out.
  const parsed = parseFlags(argv, {
    help: { kind: 'boolean', aliases: ['-h'] },
    'project-dir': { kind: 'string', aliases: ['-p'] },
    provider: { kind: 'string' },
    store: { kind: 'string' },
    'top-k': { kind: 'int', aliases: ['-k'] },
    'min-score': { kind: 'float' },
    lang: { kind: 'string', aliases: ['-l'] },
    type: { kind: 'string', aliases: ['-t'] },
    file: { kind: 'string', aliases: ['-f'] },
    exported: { kind: 'boolean' },
    // Phase 7 task 1.10 — semantic facet filters (DR-PHASE-7-D).
    layer: { kind: 'string' },
    capability: { kind: 'string' },
    // --constraint key:value — generalized filter shorthand.
    // Recognized keys: type, file, lang, layer, capability, exported.
    constraint: { kind: 'string' },
    'max-tokens': { kind: 'int' },
    json: { kind: 'boolean', aliases: ['-j'] },
  });

  const v = parsed.values;
  if (!v.get('help') && parsed.errors.length > 0) {
    failUsage('rag-search', parsed.errors);
  }

  // Honor CODEREF_LLM_PROVIDER env when --provider is omitted. Without it,
  // default is key-aware: openai only when a cloud key is actually present,
  // otherwise ollama (local-first; must match rag-index so search embeds
  // queries with the same model the index was built with —
  // WO-CODEREF-CORE-MCP-SERVER-AND-INTELLIGENCE-FIXES-001 P2-T1).
  const envProvider = process.env.CODEREF_LLM_PROVIDER?.toLowerCase();

  const storeRaw = (v.get('store') as string | undefined) ?? 'json';
  const store = (['json', 'sqlite', 'pinecone', 'chroma'].includes(storeRaw)
    ? storeRaw
    : 'json') as CliArgs['store'];

  return {
    projectDir: (v.get('project-dir') as string | undefined) ?? process.cwd(),
    query: parsed.positionals[0] ?? '',
    provider: (v.get('provider') as string | undefined)
      ?? envProvider
      ?? (process.env.OPENAI_API_KEY ? 'openai' : 'ollama'),
    store,
    topK: (v.get('top-k') as number | undefined) ?? 10,
    minScore: v.get('min-score') as number | undefined,
    lang: v.get('lang') as string | undefined,
    type: v.get('type') as string | undefined,
    file: v.get('file') as string | undefined,
    exported: (v.get('exported') as boolean | undefined) || undefined,
    layer: v.get('layer') as string | undefined,
    capability: v.get('capability') as string | undefined,
    constraint: v.get('constraint') as string | undefined,
    maxTokens: v.get('max-tokens') as number | undefined,
    json: (v.get('json') as boolean | undefined) ?? false,
    help: (v.get('help') as boolean | undefined) ?? false,
  };
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
  --provider <provider>        LLM provider: openai, anthropic, ollama (default: openai if OPENAI_API_KEY set, else ollama)
  --store <store>              Vector store: json, pinecone, chroma (default: json; 'sqlite' is a deprecated alias for json)
  -k, --top-k <number>         Number of results to return (default: 10)
  --min-score <number>         Minimum relevance score 0-1 (default: none)
  -l, --lang <language>        Filter by programming language
  -t, --type <type>            Filter by element type: function, class, method, etc.
  -f, --file <pattern>         Filter by file path pattern
  --exported                   Only show exported elements
  --layer <value>              Filter by semantic layer (e.g. service, ui_component, cli)
  --capability <value>         Filter by semantic capability slug (kebab-case)
  --constraint <key:value>     Generalized filter shorthand. Keys: type, file, lang, layer, capability, exported
  --max-tokens <number>        Truncate output to approximately this many tokens (chars/4 estimate)
  -j, --json                   Output results as JSON
  -h, --help                   Show this help message

ENVIRONMENT VARIABLES:
  OPENAI_API_KEY              Required for OpenAI provider
  ANTHROPIC_API_KEY           Required for Anthropic provider
  CODEREF_SQLITE_PATH         Optional: custom path for the local JSON vector store

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
 * Estimate token count for a string using the chars/4 heuristic.
 * Returns approximate token count; not exact but sufficient for context budgeting.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
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

    // RAG local-only enforcement (mirrors rag-index.ts).
    const localOnlyRaw = process.env.CODEREF_RAG_LOCAL_ONLY;
    const localOnly = localOnlyRaw && localOnlyRaw.toLowerCase() !== '0' &&
      localOnlyRaw.toLowerCase() !== 'false' && localOnlyRaw.toLowerCase() !== 'no';
    if (localOnly && (args.provider === 'openai' || args.provider === 'anthropic')) {
      console.error(
        `Error: RAG local-only mode is enabled (CODEREF_RAG_LOCAL_ONLY=${localOnlyRaw}) ` +
        `but provider '${args.provider}' is a cloud provider. ` +
        `Set CODEREF_LLM_PROVIDER=ollama (or pass --provider ollama).`
      );
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
      await loadRAGDependencies();
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

    // Initialize components (shared factory — MODEL_REGISTRY-sourced)
    const llmProvider = await createLLMProvider(args.provider);
    const vectorStore = await createVectorStore(args.store, args.projectDir, llmProvider, { warnTag: 'rag-search' });
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
    // Phase 7 task 1.10 — thread --layer / --capability through
    // SearchOptions.filters (the existing Partial<CodeChunkMetadata>
    // pass-through). Both fields gained on CodeChunkMetadata in task
    // 1.2; vector-store metadata-filter pass-through is automatic.
    if (args.layer !== undefined || args.capability !== undefined) {
      const facets: Record<string, unknown> = {};
      if (args.layer !== undefined) facets.layer = args.layer;
      if (args.capability !== undefined) facets.capability = args.capability;
      searchOptions.filters = facets;
    }

    // --constraint key:value — apply after explicit flags so explicit flags win.
    if (args.constraint !== undefined) {
      const sep = args.constraint.indexOf(':');
      if (sep === -1) {
        console.error(`Error: --constraint must be in key:value format (got "${args.constraint}")`);
        process.exit(2);
      }
      const cKey = args.constraint.slice(0, sep);
      const cVal = args.constraint.slice(sep + 1);
      const knownKeys = ['type', 'file', 'lang', 'layer', 'capability', 'exported'];
      if (!knownKeys.includes(cKey)) {
        console.error(`Error: unrecognized --constraint key "${cKey}". Recognized: ${knownKeys.join(', ')}`);
        process.exit(2);
      }
      switch (cKey) {
        case 'type': if (!args.type) searchOptions.type = cVal; break;
        case 'file': if (!args.file) searchOptions.file = cVal; break;
        case 'lang': if (!args.lang) searchOptions.language = cVal; break;
        case 'layer':
          if (!args.layer) { searchOptions.filters = { ...(searchOptions.filters ?? {}), layer: cVal }; }
          break;
        case 'capability':
          if (!args.capability) { searchOptions.filters = { ...(searchOptions.filters ?? {}), capability: cVal }; }
          break;
        case 'exported':
          if (args.exported === undefined) searchOptions.exported = cVal !== 'false' && cVal !== '0';
          break;
      }
    }

    // Execute search
    const startTime = Date.now();
    const response = await searchService.search(args.query, searchOptions);
    const searchTime = Date.now() - startTime;

    // Output results
    if (args.json) {
      let jsonResults = response.results;
      let jsonTruncated = false;
      if (args.maxTokens !== undefined) {
        let tokensUsed = 0;
        const kept: any[] = [];
        for (const result of response.results) {
          const cost = estimateTokens(JSON.stringify(result));
          if (tokensUsed + cost > args.maxTokens) { jsonTruncated = true; break; }
          tokensUsed += cost;
          kept.push(result);
        }
        jsonResults = kept;
      }
      console.log(JSON.stringify({
        query: args.query,
        results: jsonResults,
        totalResults: response.totalResults,
        searchTimeMs: searchTime,
        truncated: jsonTruncated,
        filters: {
          language: args.lang,
          type: args.type,
          file: args.file,
          exported: args.exported,
          layer: args.layer,
          capability: args.capability,
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
        let tokensUsed = 0;
        let truncatedAt = -1;
        for (let i = 0; i < response.results.length; i++) {
          const formatted = formatResult(response.results[i], i);
          if (args.maxTokens !== undefined) {
            const cost = estimateTokens(formatted);
            if (tokensUsed + cost > args.maxTokens) {
              truncatedAt = i;
              break;
            }
            tokensUsed += cost;
          }
          console.log(formatted);
          console.log();
        }

        if (truncatedAt !== -1) {
          console.log(`[--max-tokens] Output truncated at result ${truncatedAt + 1} (~${tokensUsed} tokens used of ${args.maxTokens} budget)`);
          console.log();
        } else if (response.totalResults > args.topK) {
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
