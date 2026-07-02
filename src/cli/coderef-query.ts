#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-coderef-query
 */

import { parseArgs } from 'node:util';
import AnalyzerService from '../analyzer/analyzer-service.js';
import { QueryExecutor, QueryType, QueryResult } from '../query/query-executor.js';

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
  --patterns=<globs> Comma-separated file globs to analyze (default: "src/**/*.ts,packages/**/*.ts")
  --help             Print this help

Query types:
  what-calls         What calls the target element?
  what-calls-me      What does the target element call?
  what-imports       What does the target element import? (outbound)
  what-imports-me    What imports the target element? (inbound)
  what-depends-on    What files depend on the target element? (inbound dependents)
  what-depends-on-me What does the target element depend on? (outbound dependencies)
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
      patterns: { type: 'string' },
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

  // Build the dependency graph before querying — every query type throws
  // "No graph available" otherwise. Default globs cover src/ and packages/
  // layouts; AnalyzerService's own default only matches packages/.
  const patterns = typeof values.patterns === 'string' && values.patterns.length > 0
    ? values.patterns.split(',').map(p => p.trim()).filter(Boolean)
    : ['src/**/*.ts', 'packages/**/*.ts'];
  const analysis = await analyzer.analyze(patterns);

  // Graph node ids are exact strings ("file:" + a mix of absolute and
  // relative backslash-separated paths), and the same file can be keyed under
  // more than one spelling. Resolve a friendly --target/--source path to every
  // matching node id so queries don't silently return empty.
  const resolveNodeIds = (raw: string): string[] => {
    const nodes = analysis.graph.nodes;
    const found = new Set<string>();
    if (nodes.has(raw)) found.add(raw);
    // A file's outbound edges hang off its source-node spelling while its
    // inbound (import-target) edges hang off the raw module-specifier
    // spelling (usually ".js" for a ".ts" source, relative vs absolute), so
    // collect EVERY spelling — never stop at the first hit.
    const backslashed = raw.replace(/\//g, '\\');
    const suffixes = [backslashed];
    if (backslashed.endsWith('.ts')) suffixes.push(backslashed.slice(0, -3) + '.js');
    else if (backslashed.endsWith('.js')) suffixes.push(backslashed.slice(0, -3) + '.ts');
    for (const id of nodes.keys()) {
      if (!id.startsWith('file:')) continue;
      const normalized = id.replace(/\//g, '\\');
      if (suffixes.some(s => normalized.endsWith(s))) {
        found.add(id);
      }
    }
    return found.size > 0 ? Array.from(found) : [raw];
  };

  const targetIds = resolveNodeIds(values.target as string);
  const sourceIds = values.source ? resolveNodeIds(values.source as string) : [undefined];
  const isPathQuery = type === 'shortest-path' || type === 'all-paths';

  // Execute against every resolved spelling pair. Relationship queries union
  // their results; path queries keep the best (shortest non-empty) path,
  // since a path only exists between one specific spelling pair.
  let merged: QueryResult | undefined;
  for (const sourceId of sourceIds) {
    for (const targetId of targetIds) {
      const result = await executor.execute({
        type,
        target:   targetId,
        source:   sourceId,
        maxDepth: depth,
        format,
      });

      if (result.error) {
        console.error('Query error:', result.error);
        process.exit(1);
      }

      if (!merged) {
        merged = result;
      } else if (isPathQuery) {
        if (result.count > 0 && (merged.count === 0 || result.count < merged.count)) {
          merged = result;
        }
      } else {
        const seen = new Set(merged.results.map(n => n.id));
        for (const node of result.results) {
          if (!seen.has(node.id)) {
            merged.results.push(node);
            seen.add(node.id);
          }
        }
        merged.count = merged.results.length;
      }
    }
  }

  console.log(JSON.stringify(merged, null, 2));
}

main().catch((err: unknown) => {
  console.error('coderef-query error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
