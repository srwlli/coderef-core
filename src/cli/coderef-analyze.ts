#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { ConfigAnalyzer } from '../analyzer/config-analyzer.js';
import { ContractDetector } from '../analyzer/contract-detector.js';
import { DatabaseDetector } from '../analyzer/database-detector.js';
import { DependencyAnalyzer } from '../analyzer/dependency-analyzer.js';
import { DesignPatternDetector } from '../analyzer/design-pattern-detector.js';
import { DocsAnalyzer } from '../analyzer/docs-analyzer.js';
import { analyzeMiddlewareAndDI } from '../analyzer/middleware-detector.js';
import AnalyzerService from '../analyzer/analyzer-service.js';
import { convertGraphToElements } from '../adapter/graph-to-elements.js';
import { ComplexityScorer } from '../context/complexity-scorer.js';
import { ImpactSimulator } from '../context/impact-simulator.js';
import { MultiHopTraversal } from '../context/multi-hop-traversal.js';
import { BreakingChangeDetector } from '../context/breaking-change-detector.js';
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
  graph              Build and print the full dependency graph
  complexity         Score element complexity (requires project scan)
  impact             Simulate blast radius for a changed element (requires --element)
  multi-hop          Traverse multi-hop relationships (requires --element)
  breaking-changes   Detect breaking API changes (requires --from; --to optional)
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
      const service  = new AnalyzerService(project);
      const result   = await service.analyze();
      const elements = convertGraphToElements(result.graph);
      const tsFiles  = await collectTsFiles(join(project, 'src'));
      const fileMap  = new Map<string, string>();
      for (const f of tsFiles) {
        try { fileMap.set(f, await readFile(f, 'utf-8')); } catch { /* skip unreadable */ }
      }
      emit(analyzeMiddlewareAndDI(elements, fileMap));
      break;
    }
    case 'graph': {
      const service = new AnalyzerService(project);
      const result  = await service.analyze();
      emit(result.graph);
      break;
    }
    case 'complexity': {
      const service  = new AnalyzerService(project);
      const result   = await service.analyze();
      const elements = convertGraphToElements(result.graph);
      const scorer   = new ComplexityScorer();
      emit(scorer.scoreElements(elements));
      break;
    }
    case 'impact': {
      if (!values.element) { console.error('Error: --element is required for --type=impact'); process.exit(1); }
      const service   = new AnalyzerService(project);
      const result    = await service.analyze();
      const simulator = new ImpactSimulator(result.graph);
      emit(simulator.calculateBlastRadius(values.element as string, depth));
      break;
    }
    case 'multi-hop': {
      if (!values.element) { console.error('Error: --element is required for --type=multi-hop'); process.exit(1); }
      const service   = new AnalyzerService(project);
      const result    = await service.analyze();
      const traversal = new MultiHopTraversal(result.graph, depth);
      emit({
        usedBy:    traversal.usedBy(values.element as string),
        calls:     traversal.calls(values.element as string),
        dependsOn: traversal.dependsOn(values.element as string),
      });
      break;
    }
    case 'breaking-changes': {
      if (!values.from) {
        console.error('Error: --from is required for --type=breaking-changes');
        process.exit(1);
      }
      const service   = new AnalyzerService(project);
      const result    = await service.analyze();
      const simulator = new ImpactSimulator(result.graph);
      const detector  = new BreakingChangeDetector(service, simulator);
      emit(await detector.detectChanges(
        values.from as string,
        values.to as string | undefined,
        !values.to
      ));
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
