#!/usr/bin/env node
import { parseArgs } from 'node:util';
import AnalyzerService from '../analyzer/analyzer-service.js';
import { QueryExecutor, QueryType } from '../query/query-executor.js';

const QUERY_TYPES: QueryType[] = [
  'what-calls', 'what-calls-me',
  'what-imports', 'what-imports-me',
  'what-depends-on', 'what-depends-on-me',
  'shortest-path', 'all-paths',
];

function printHelp(): void {
  console.log(`
coderef-query — execute a relationship query on a project

Usage:
  coderef-query --project=<path> --type=<type> --target=<element> [options]

Required:
  --project=<path>   Path to the project root
  --type=<type>      Query type (see below)
  --target=<element> Target element to query (e.g., "src/scanner.ts")

Options:
  --source=<element> Source element for path queries (required for: shortest-path, all-paths)
  --depth=<N>        Max traversal depth (default: 5)
  --format=<fmt>     Result format: raw | summary | full  (default: summary)
  --help             Print this help

Query types:
  what-calls         What calls the target element?
  what-calls-me      What does the target element call?
  what-imports       What does the target element import?
  what-imports-me    What imports the target element?
  what-depends-on    What does the target element depend on?
  what-depends-on-me What depends on the target element?
  shortest-path      Shortest dependency path between --source and --target
  all-paths          All dependency paths between --source and --target

Note: The first run performs a full project analysis scan (may take several seconds).
`.trim());
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      project: { type: 'string' },
      type:    { type: 'string' },
      target:  { type: 'string' },
      source:  { type: 'string' },
      depth:   { type: 'string' },
      format:  { type: 'string' },
      help:    { type: 'boolean', default: false },
    },
    strict: false,
  });

  if (values.help) { printHelp(); process.exit(0); }

  const project = values.project;
  const type    = values.type as QueryType | undefined;

  if (!project) { console.error('Error: --project is required'); printHelp(); process.exit(1); }
  if (typeof project !== 'string') { console.error('Error: --project must be a string'); process.exit(1); }
  if (!type || !QUERY_TYPES.includes(type)) {
    console.error(`Error: --type must be one of: ${QUERY_TYPES.join(', ')}`);
    process.exit(1);
  }
  if (!values.target) { console.error('Error: --target is required'); process.exit(1); }

  if ((type === 'shortest-path' || type === 'all-paths') && !values.source) {
    console.error(`Error: --source is required for --type=${type}`);
    process.exit(1);
  }

  const format = ((values.format as string | undefined) ?? 'summary') as 'raw' | 'summary' | 'full';
  const depth  = parseInt((values.depth as string | undefined) ?? '5', 10) || 5;

  const analyzer = new AnalyzerService(project as string);
  const executor = new QueryExecutor(analyzer);

  const result = await executor.execute({
    type,
    target:   values.target as string,
    source:   values.source as string | undefined ?? undefined,
    maxDepth: depth,
    format,
  });

  if (result.error) {
    console.error('Query error:', result.error);
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err: unknown) => {
  console.error('coderef-query error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
