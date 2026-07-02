#!/usr/bin/env node
/**
 * @coderef-semantic: 1.0.0
 * @layer cli
 * @capability cli-coderef-analyze
 */

import { parseArgs } from 'node:util';
import { ConfigAnalyzer } from '../analyzer/config-analyzer.js';
import { ContractDetector } from '../analyzer/contract-detector.js';
import { DatabaseDetector } from '../analyzer/database-detector.js';
import { DependencyAnalyzer } from '../analyzer/dependency-analyzer.js';
import { DesignPatternDetector } from '../analyzer/design-pattern-detector.js';
import { DocsAnalyzer } from '../analyzer/docs-analyzer.js';
import { analyzeMiddlewareAndDI } from '../analyzer/middleware-detector.js';
import { ComplexityScorer } from '../context/complexity-scorer.js';
import {
  CanonicalGraphError,
  CanonicalGraphQuery,
  loadCanonicalGraph,
} from '../query/canonical-graph.js';
import type { ElementData } from '../types/types.js';
import { DEFAULT_HEADER_STATUS } from '../pipeline/element-taxonomy.js';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const TYPES = [
  'config', 'contract', 'db', 'dependency', 'pattern', 'docs',
  'middleware', 'graph', 'complexity', 'impact', 'multi-hop', 'breaking-changes',
] as const;
type AnalyzeType = typeof TYPES[number];

function printHelp(): void {
  console.log(`
coderef-analyze — run a single analysis pass on a project

Usage:
  coderef-analyze --project=<path> --type=<type> [options]

Required:
  --project=<path>   Path to the project root
  --type=<type>      Analysis type (see below)

Options:
  --output=<fmt>     Output format: json | text  (default: text)
  --element=<id>     Target element ID (required for: impact, multi-hop)
  --depth=<N>        Max traversal depth (default: 5; used by: impact, multi-hop)
  --from=<ref>       Git ref baseline (required for: breaking-changes)
  --to=<ref>         Git ref head     (optional for: breaking-changes; defaults to worktree)
  --help             Print this help

Analysis types:
  config             Detect project configuration (tsconfig, package.json, Docker, env)
  contract           Detect API contracts (OpenAPI, GraphQL, Protobuf, JSON Schema)
  db                 Detect database patterns (ORM, raw queries, migrations)
  dependency         Analyze npm dependency health (outdated, missing, unused)
  pattern            Detect design patterns (Singleton, Observer, Factory, etc.)
  docs               Analyze documentation coverage and quality
  middleware         Detect middleware chains and DI containers
  graph              Print canonical dependency-graph statistics
  complexity         Score element complexity
  impact             Blast radius for a changed element (requires --element)
  multi-hop          Traverse multi-hop relationships (requires --element)
  breaking-changes   NOT IMPLEMENTED — exits with an error. The git-diff /
                     signature extractors are placeholder stubs; this type is
                     gated until they are implemented so it cannot emit
                     confident-looking empty reports.

Note: graph, complexity, impact, multi-hop, and middleware read the canonical
.coderef/graph.json produced by the populate pipeline (DR-PHASE-5-C). Run
populate first if the artifact is missing or stale.
`.trim());
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true, recursive: true as any });
  for (const entry of entries) {
    if (entry.isFile() && (extname(entry.name) === '.ts' || extname(entry.name) === '.tsx')) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

/**
 * Load the canonical graph for --project, exiting with the run-populate hint
 * when .coderef/graph.json is absent (the graph-backed types no longer build
 * an in-memory graph — DR-PHASE-5-C retirement, Phase 2).
 */
function loadEngineOrExit(project: string): CanonicalGraphQuery {
  try {
    return loadCanonicalGraph(project);
  } catch (err) {
    if (err instanceof CanonicalGraphError) {
      console.error(`coderef-analyze error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

/**
 * Project the canonical graph's element nodes into ElementData[] (the shape
 * ComplexityScorer and analyzeMiddlewareAndDI consume), with calls[] rebuilt
 * from resolved call edges.
 */
function canonicalElements(engine: CanonicalGraphQuery): ElementData[] {
  const callsBySource = new Map<string, string[]>();
  const nodeName = new Map<string, string | undefined>();
  for (const node of engine.graph.nodes) nodeName.set(node.id, node.name);
  for (const edge of engine.graph.edges) {
    if (edge.resolutionStatus !== 'resolved' || edge.relationship !== 'call') continue;
    if (!edge.sourceId || !edge.targetId) continue;
    const targetName = nodeName.get(edge.targetId);
    if (!targetName) continue;
    const list = callsBySource.get(edge.sourceId);
    if (list) {
      if (!list.includes(targetName)) list.push(targetName);
    } else {
      callsBySource.set(edge.sourceId, [targetName]);
    }
  }

  const elements: ElementData[] = [];
  for (const node of engine.graph.nodes) {
    if (node.id.startsWith('@File/') || !node.file) continue;
    const element: ElementData = {
      type: (node.type as ElementData['type']) || 'function',
      name: node.name ?? node.id,
      file: node.file,
      line: node.line ?? 1,
      headerStatus: (node.metadata?.headerStatus as ElementData['headerStatus']) ?? DEFAULT_HEADER_STATUS,
    };
    const calls = callsBySource.get(node.id);
    if (calls && calls.length > 0) element.calls = calls;
    elements.push(element);
  }
  return elements;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      project: { type: 'string' },
      type:    { type: 'string' },
      output:  { type: 'string' },
      element: { type: 'string' },
      depth:   { type: 'string' },
      from:    { type: 'string' },
      to:      { type: 'string' },
      help:    { type: 'boolean', default: false },
    },
    strict: false,
  });

  if (values.help) { printHelp(); process.exit(0); }

  const project = values.project as string | undefined;
  const type = values.type as AnalyzeType | undefined;

  if (!project) { console.error('Error: --project is required'); printHelp(); process.exit(1); }
  if (!type || !(TYPES as readonly string[]).includes(type)) {
    console.error(`Error: --type must be one of: ${TYPES.join(', ')}`);
    process.exit(1);
  }

  const fmt   = (values.output as string | undefined) ?? 'text';
  const depth = parseInt((values.depth as string | undefined) ?? '5', 10) || 5;

  function emit(result: unknown): void {
    if (fmt === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }
  }

  switch (type) {
    case 'config': {
      const analyzer = new ConfigAnalyzer(project);
      emit(analyzer.analyze());
      break;
    }
    case 'contract': {
      const detector = new ContractDetector(project);
      emit(detector.detect());
      break;
    }
    case 'db': {
      const detector = new DatabaseDetector(project);
      emit(detector.detect());
      break;
    }
    case 'dependency': {
      const analyzer = new DependencyAnalyzer(project);
      emit(await analyzer.analyze());
      break;
    }
    case 'pattern': {
      const detector = new DesignPatternDetector(project);
      emit(detector.analyze());
      break;
    }
    case 'docs': {
      const analyzer = new DocsAnalyzer(project);
      emit(await analyzer.analyze());
      break;
    }
    case 'middleware': {
      const engine   = loadEngineOrExit(project);
      const elements = canonicalElements(engine);
      const tsFiles  = await collectTsFiles(join(project, 'src'));
      const fileMap  = new Map<string, string>();
      for (const f of tsFiles) {
        try { fileMap.set(f, await readFile(f, 'utf-8')); } catch { /* skip unreadable */ }
      }
      emit(analyzeMiddlewareAndDI(elements, fileMap));
      break;
    }
    case 'graph': {
      const engine = loadEngineOrExit(project);
      emit({
        source: '.coderef/graph.json',
        version: engine.graph.version,
        statistics: engine.statistics(),
      });
      break;
    }
    case 'complexity': {
      const engine   = loadEngineOrExit(project);
      const elements = canonicalElements(engine);
      const scorer   = new ComplexityScorer();
      emit(scorer.scoreElements(elements));
      break;
    }
    case 'impact': {
      if (!values.element) { console.error('Error: --element is required for --type=impact'); process.exit(1); }
      const engine     = loadEngineOrExit(project);
      const resolution = engine.resolve(values.element as string);
      if (resolution.nodes.length === 0) {
        console.error(`Error: no graph node matches --element "${values.element}"`);
        process.exit(1);
      }
      const blastRadius = engine.dependentsOf(resolution, depth);
      emit({
        element: values.element,
        resolved: resolution.nodes.slice(0, 10).map(n => n.id),
        depth,
        count: blastRadius.length,
        blastRadius,
      });
      break;
    }
    case 'multi-hop': {
      if (!values.element) { console.error('Error: --element is required for --type=multi-hop'); process.exit(1); }
      const engine     = loadEngineOrExit(project);
      const resolution = engine.resolve(values.element as string);
      if (resolution.nodes.length === 0) {
        console.error(`Error: no graph node matches --element "${values.element}"`);
        process.exit(1);
      }
      emit({
        element: values.element,
        depth,
        usedBy:    engine.dependentsOf(resolution, depth),
        calls:     engine.calleesOf(resolution),
        dependsOn: engine.dependenciesOf(resolution, depth),
      });
      break;
    }
    case 'breaking-changes': {
      // Gated until the diff/signature extractors are real (they are
      // placeholder stubs returning empty — see diff-analyzer.ts). Running
      // them would emit a confident-looking report that found nothing.
      console.error(
        'Error: --type=breaking-changes is NOT IMPLEMENTED.\n' +
        'The underlying git-diff and signature extractors (getChangedElements, ' +
        'extractSignaturesFromRef/FromWorktree) are placeholder stubs that return ' +
        'empty results, so any report would be a false negative. ' +
        'This type is disabled until they are implemented.'
      );
      process.exit(1);
      break;
    }
    default: {
      const _exhaustive: never = type;
      console.error(`Unhandled type: ${_exhaustive}`);
      process.exit(1);
    }
  }
}

main().catch((err: unknown) => {
  console.error('coderef-analyze error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
