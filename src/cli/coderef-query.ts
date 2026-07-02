#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-coderef-query
 */

/**
 * coderef-query — relationship queries over the canonical `.coderef/graph.json`.
 *
 * WO-REPO-REVIEW-2026-07-REMEDIATION-001 Phase 2 (P1-7, DR-PHASE-5-C):
 * reimplemented on the canonical pipeline artifact. The previous engine built
 * a private in-memory graph (legacy analyzer stack, now deleted) with
 * inverted direction semantics; this version reads what populate emitted and
 * keeps every direction pinned by src/query/__tests__/canonical-graph.test.ts.
 *
 * Direction contract (operator-anchored 2026-07-02): the '-me' suffix means
 * the target is the OBJECT — "what-calls-me" answers "who calls the target"
 * (inbound). Bare forms answer for the target as SUBJECT — "what-calls"
 * answers "what does the target call" (outbound). ASSISTANT's doc-discovery
 * helper relies on what-depends-on-me returning inbound dependents.
 */

import { parseArgs } from 'node:util';
import {
  CanonicalGraphError,
  CanonicalGraphQuery,
  loadCanonicalGraph,
} from '../query/canonical-graph.js';

const QUERY_TYPES = [
  'what-calls', 'what-calls-me',
  'what-imports', 'what-imports-me',
  'what-depends-on', 'what-depends-on-me',
  'shortest-path', 'all-paths',
] as const;
type QueryType = typeof QUERY_TYPES[number];

function printHelp(): void {
  console.log(`
coderef-query — execute a relationship query over .coderef/graph.json

Usage:
  coderef-query --project=<path> --type=<type> --target=<element> [options]

Required:
  --project=<path>   Path to the project root (must contain .coderef/graph.json)
  --type=<type>      Query type (see below)
  --target=<element> Target element: a codeRefId, an element name, or a file path

Options:
  --source=<element> Source element for path queries (required for: shortest-path, all-paths)
  --depth=<N>        Max traversal depth (default: 5)
  --format=<fmt>     Result format: raw | summary | full  (default: summary)
  --patterns=<globs> DEPRECATED — ignored. Queries read the populate-emitted
                     graph; there is no in-memory analysis pass anymore.
  --help             Print this help

Query types ('-me' = the target is the object; bare = the target is the subject):
  what-calls-me      Who calls the target?                      (inbound call edges)
  what-calls         What does the target call?                 (outbound call edges)
  what-imports-me    Who imports the target?                    (inbound import edges)
  what-imports       What does the target import?               (outbound import edges)
  what-depends-on-me Who depends on the target, transitively?   (inbound call+import)
  what-depends-on    What does the target depend on, transitively? (outbound call+import)
  shortest-path      Shortest directed path from --source to --target
  all-paths          All directed paths from --source to --target (bounded by --depth)

The graph is produced by the populate pipeline. If .coderef/graph.json is
missing or stale, re-run populate first.
`.trim());
}

interface RelationshipResult {
  type: QueryType;
  target: string;
  resolved: string[];
  count: number;
  results: Array<Record<string, unknown>>;
}

function runRelationshipQuery(
  engine: CanonicalGraphQuery,
  type: QueryType,
  target: string,
  depth: number,
): RelationshipResult {
  const resolution = engine.resolve(target);
  if (resolution.nodes.length === 0) {
    console.error(
      `Query error: no graph node matches --target "${target}". ` +
      `Try a codeRefId, an exact element name, or a project-relative file path.`,
    );
    process.exit(1);
  }

  let nodes;
  switch (type) {
    case 'what-calls-me':      nodes = engine.callersOf(resolution); break;
    case 'what-calls':         nodes = engine.calleesOf(resolution); break;
    case 'what-imports-me':    nodes = engine.importersOf(resolution); break;
    case 'what-imports':       nodes = engine.importsOf(resolution); break;
    case 'what-depends-on-me': nodes = engine.dependentsOf(resolution, depth); break;
    case 'what-depends-on':    nodes = engine.dependenciesOf(resolution, depth); break;
    default:
      throw new Error(`Not a relationship query: ${type}`);
  }

  return {
    type,
    target,
    resolved: resolution.nodes.slice(0, 10).map(n => n.id),
    count: nodes.length,
    results: nodes as unknown as Array<Record<string, unknown>>,
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      project:  { type: 'string' },
      type:     { type: 'string' },
      target:   { type: 'string' },
      source:   { type: 'string' },
      depth:    { type: 'string' },
      format:   { type: 'string' },
      patterns: { type: 'string' },
      help:     { type: 'boolean', default: false },
    },
    strict: false,
  });

  if (values.help) { printHelp(); process.exit(0); }

  const project = values.project;
  const type    = values.type as QueryType | undefined;

  if (!project || typeof project !== 'string') {
    console.error('Error: --project is required');
    printHelp();
    process.exit(1);
  }
  if (!type || !(QUERY_TYPES as readonly string[]).includes(type)) {
    console.error(`Error: --type must be one of: ${QUERY_TYPES.join(', ')}`);
    process.exit(1);
  }
  if (!values.target) { console.error('Error: --target is required'); process.exit(1); }

  const isPathQuery = type === 'shortest-path' || type === 'all-paths';
  if (isPathQuery && !values.source) {
    console.error(`Error: --source is required for --type=${type}`);
    process.exit(1);
  }
  if (typeof values.patterns === 'string' && values.patterns.length > 0) {
    console.error('Warning: --patterns is deprecated and ignored (queries read .coderef/graph.json).');
  }

  const format = ((values.format as string | undefined) ?? 'summary') as 'raw' | 'summary' | 'full';
  const depth  = parseInt((values.depth as string | undefined) ?? '5', 10) || 5;

  let engine: CanonicalGraphQuery;
  try {
    engine = loadCanonicalGraph(project);
  } catch (err) {
    if (err instanceof CanonicalGraphError) {
      console.error(`Query error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  if (isPathQuery) {
    const sourceRes = engine.resolve(values.source as string);
    const targetRes = engine.resolve(values.target as string);
    if (sourceRes.nodes.length === 0) {
      console.error(`Query error: no graph node matches --source "${values.source}".`);
      process.exit(1);
    }
    if (targetRes.nodes.length === 0) {
      console.error(`Query error: no graph node matches --target "${values.target}".`);
      process.exit(1);
    }
    if (type === 'shortest-path') {
      const result = engine.shortestPath(sourceRes, targetRes, depth * 2);
      console.log(JSON.stringify({
        type,
        source: values.source,
        target: values.target,
        found: result.found,
        length: result.length,
        path: result.path,
        count: result.found ? 1 : 0,
      }, null, 2));
    } else {
      const results = engine.allPaths(sourceRes, targetRes, depth);
      console.log(JSON.stringify({
        type,
        source: values.source,
        target: values.target,
        count: results.length,
        paths: results.map(r => ({ length: r.length, path: r.path })),
      }, null, 2));
    }
    return;
  }

  const result = runRelationshipQuery(engine, type, values.target as string, depth);
  if (format === 'summary') {
    // summary keeps the payload slim: drop the resolution echo
    const { resolved: _resolved, ...slim } = result;
    console.log(JSON.stringify(slim, null, 2));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err: unknown) => {
  console.error('coderef-query error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
