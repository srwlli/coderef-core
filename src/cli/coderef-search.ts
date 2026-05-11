#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { SearchEngine, SearchIndexEntry } from '../search/search-engine.js';

function printHelp(): void {
  console.log(`
coderef-search — full-text search over a pre-built search index

Usage:
  coderef-search --project=<path> --query=<text> [options]

Required:
  --project=<path>   Path to the project root
  --query=<text>     Search query text

Options:
  --tags=<t1,t2>     Filter by tags (comma-separated)
  --sort=<s>         Sort order: relevance | lastUpdated | wordCount  (default: relevance)
  --min-score=<N>    Minimum relevance score (default: 0)
  --limit=<N>        Max results to return (default: 20)
  --help             Print this help

Prerequisites:
  The search index must be pre-built at <project>/.coderef/search-index.json.
  Run 'coderef-populate' or 'coderef-pipeline' to generate the index first.
`.trim());
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      project:    { type: 'string' },
      query:      { type: 'string' },
      tags:       { type: 'string' },
      sort:        { type: 'string' },
      'min-score': { type: 'string' },
      limit:       { type: 'string' },
      help:       { type: 'boolean', default: false },
    },
    strict: false,
  });

  if (values.help) { printHelp(); process.exit(0); }

  const project = values.project;
  const query   = values.query;

  if (!project || typeof project !== 'string') { console.error('Error: --project is required'); printHelp(); process.exit(1); }
  if (!query || typeof query !== 'string')     { console.error('Error: --query is required');   printHelp(); process.exit(1); }

  const indexPath = join(resolve(project), '.coderef', 'search-index.json');

  let rawEntries: SearchIndexEntry[];
  try {
    const raw = await readFile(indexPath, 'utf-8');
    rawEntries = JSON.parse(raw) as SearchIndexEntry[];
  } catch {
    console.error(
      `Error: search index not found at ${indexPath}\n` +
      `Run 'coderef-populate' or 'coderef-pipeline' to build the index first.`
    );
    process.exit(1);
  }

  const engine = new SearchEngine();
  for (const entry of rawEntries) {
    engine.indexDocument(entry);
  }

  const sortBy   = ((values.sort as string | undefined) ?? 'relevance') as 'relevance' | 'lastUpdated' | 'wordCount';
  const minScore = parseFloat((values['min-score'] as string | undefined) ?? '0') || 0;
  const limit    = parseInt((values.limit as string | undefined) ?? '20', 10) || 20;
  const tags     = values.tags ? (values.tags as string).split(',').map((t: string) => t.trim()) : undefined;

  const results = engine.search(query, {
    sortBy,
    minScore,
    maxResults: limit,
    tags,
    includeSections: true,
    includeMetadata: true,
  });

  if (results.length === 0) {
    console.log('No results found.');
    process.exit(0);
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err: unknown) => {
  console.error('coderef-search error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
